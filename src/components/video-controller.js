import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';

import './video-controller.scss';
import playSvg from '../assets/play-button.svg';
import pauseSvg from '../assets/pause-button.svg';

import { AdBreak}        from "./ad-break";
import { InteractiveAd } from "./interactive-ad";

export class VideoController {
    constructor(videoSelector, controlBarSelector, platform) {
        this.debug = false; // set to true to enable more verbose video time logging.

        this.video = document.querySelector(videoSelector);
        this.controlBarDiv = document.querySelector(controlBarSelector);
        this.isControlBarVisible = false;
        this.videoStarted = false;
        this.videoLoaded = false;

        this.adIndicators = document.querySelector('.ad-indicator');

        this.playButton = this.controlBarDiv.querySelector('.play-button');
        this.playButton.innerHTML = playSvg;

        this.pauseButton = this.controlBarDiv.querySelector('.pause-button');
        this.pauseButton.innerHTML = pauseSvg;

        this.progressBar = this.controlBarDiv.querySelector('.timeline-progress');
        this.seekBar = this.controlBarDiv.querySelector('.timeline-seek');
        this.adMarkersDiv = this.controlBarDiv.querySelector('.ad-markers');

        this.timeLabel = this.controlBarDiv.querySelector('.current-time');
        this.durationLabel = this.controlBarDiv.querySelector('.duration');

        this.initialVideoTime = 0;
        this.currVideoTime = -1;
        this.rawVideoDuration = 0;
        this.seekTarget = undefined;

        this.adPlaylist = [];

        this.platform = platform || new TXMPlatform();

        this.loadingSpinner = null;

        this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
        this.onVideoPlaying = this.onVideoPlaying.bind(this);

        this.closeVideoAction = function() {}; // override as needed
    }

    showControlBar(forceTimer) {
        this.controlBarDiv.classList.add('show');
        this.isControlBarVisible = true;
        this.refresh();

        this.stopControlBarTimer();
        if (forceTimer || !this.isPaused()) {
            this.controlBarTimer = setTimeout(() => this.hideControlBar(), 8 * 1000);
        }
    }

    hideControlBar() {
        this.controlBarDiv.classList.remove('show');
        this.isControlBarVisible = false;
        this.stopControlBarTimer();
    }

    showVideo(visible) {
        this.video.style.visibility = visible ? 'visible' : 'hidden';

        // If we are showing the video, we are loaded enough.
        if (visible) this.showLoadingSpinner(false);
    }

    showLoadingSpinner(visible) {
        const spinner = this.loadingSpinner;
        if (!spinner) return;
        if (visible) spinner.show();
        else spinner.hide();
    }

    startVideo(videoStream) {
        this.videoStarted = true;

        this.showLoadingSpinner(true);

        this.setAdPlaylist(videoStream.vmap);

        const video = this.video;

        const initialVideoTime = Math.max(0, this.currVideoTime || video.currentTime || 0);
        this.initialVideoTime = initialVideoTime;
        console.log(`starting video: ${videoStream.title} 
    src: ${videoStream.url}
    at time: ${this.timeDebugDisplay(initialVideoTime)}`);

        video.src = videoStream.url;
        video.addEventListener('playing', this.onVideoPlaying);

        video.currentTime = initialVideoTime;
        this.play();
        this.showControlBar(true);

        if (this.platform.isPS4) {
            // Using a timeupdate listener seems to hang playback on the PS4.
            this._videoTimeupdateInterval = setInterval(this.onVideoTimeUpdate, 500);
        } else {
            video.addEventListener("timeupdate", this.onVideoTimeUpdate);
        }

        const firstAdBlock = this.adPlaylist[0];
        if (firstAdBlock && firstAdBlock.startTime <= 0) {
            // If we have a preroll, show it immediately, since otherwise it takes a while for the video to load
            this.startAd(firstAdBlock);
        }
    }

    stopVideo() {
        this.hideControlBar();

        const video = this.video;

        if (this.videoStarted) {
            this.currVideoTime = video.currentTime;
        }

        this.pause();

        this.showLoadingSpinner(false);

        if (this.platform.isPS4) {
            if (this._videoTimeupdateInterval) {
                clearInterval(this._videoTimeupdateInterval);
                this._videoTimeupdateInterval = null;
            }
        } else {
            video.removeEventListener('timeupdate', this.onVideoTimeUpdate);
        }
        video.removeEventListener('playing', this.onVideoPlaying);

        // Note: We need to actually clear the video source to allow video reuse on the PS4.
        // Otherwise the video hangs when it is shown again.
        try {
            video.src = "";
        } catch (err) {
            console.warn('could not clear video src');
        }

        this.showVideo(false);

        this.videoStarted = false;
        this.videoLoaded = false;
    }

    stopControlBarTimer() {
        if (this.controlBarTimer) {
            clearTimeout(this.controlBarTimer);
            this.controlBarTimer = undefined;
        }
    }

    togglePlayPause() {
        if (this.isPaused()) {
            this.play();
        } else {
            this.pause();
        }

        this.showControlBar();
    }

    isPaused() {
        return this.video.paused;
    }

    play() {
        if (this.debug) console.log(`play from: ${this.timeDebugDisplay(this.currVideoTime)}`);
        this.video.play();
    }

    pause() {
        if (this.debug) console.log(`paused at: ${this.timeDebugDisplay(this.currVideoTime)}`);
        this.video.pause();
    }

    stepForward() {
        this.stepVideo(true);
    }

    stepBackward() {
        this.stepVideo(false);
    }

    stepVideo(forward) {
        const currTime = this.currVideoTime;

        if (this.isPlayingAdAt(currTime)) {
            // Don't allow user seeking during ad playback
            // Just show the control bar so the user can see the timeline.
            this.showControlBar();
            return;
        }

        let seekStep = 10; // default seek step seconds
        const seekChunks = 80; // otherwise, divide up videos in this many chunks for seek steps
        const duration = this.getPlayingVideoDurationAt(currTime);
        if (duration > 0) {
            const dynamicStep = Math.floor(duration / seekChunks);
            seekStep = Math.max(seekStep, dynamicStep);
        }
        if (!forward) seekStep *= -1;
        const stepFrom = this.seekTarget >= 0 ? this.seekTarget : currTime;

        let newTarget = stepFrom + seekStep;

        // Skip over completed ads, but stop on uncompleted ones to force ad playback.
        if (currTime < newTarget) {
            // Seeking forward
            for(var i in this.adPlaylist) {
                const adBreak = this.adPlaylist[i];
                if (newTarget < adBreak.startTime) break; // ignore future ads after the seek target
                if (adBreak.endTime <= currTime) continue; // ignore past ads

                if (adBreak.completed) {
                    // Skip over the completed ad.
                    newTarget += adBreak.duration;
                } else {
                    // Stop on the ad to play it.
                    newTarget = adBreak.startTime;
                    break;
                }
            }
        } else {
            // Seeking backwards
            for(var i = this.adPlaylist.length-1; i >= 0; i--) {
                const adBreak = this.adPlaylist[i];
                if (currTime <= adBreak.startTime) continue; // ignore unplayed future ads
                if (adBreak.endTime < newTarget) break; // ignore ads before the seek target

                if (adBreak.completed) {
                    // Skip over the completed ad.
                    newTarget -= adBreak.duration;
                } else {
                    // Stop on the ad to play it.
                    newTarget = adBreak.startTime;
                    break;
                }
            }
        }

        this.seekTo(newTarget);
    }

    seekTo(newTarget, showControlBar) {
        if (showControlBar === undefined) showControlBar = true; // default to showing the control bar

        const currTime = this.currVideoTime;
        if (currTime == newTarget) return; // already at the target

        const video = this.video;
        const maxTarget = this.rawVideoDuration || video.duration || 0;
        if (maxTarget <= 0) return; // nothing to seek to yet

        // Don't allow seeking back to the preroll.
        const firstAdBlock = this.adPlaylist[0];
        const minTarget = firstAdBlock && firstAdBlock.startTime <= 0 ? firstAdBlock.duration : 0;

        this.seekTarget = Math.max(minTarget, Math.min(newTarget, maxTarget));
        if (this.debug) console.log(`seek to: ${this.timeDebugDisplay(this.seekTarget)}`);

        video.currentTime = this.seekTarget;

        if (showControlBar) {
            this.showControlBar();
        }
    }

    skipAd(adBreak) {
        if (!adBreak) {
            adBreak = this.getAdBreakAt(this.currVideoTime);
        }
        if (adBreak) {
            adBreak.completed = true;

            if (this.debug) {
                console.log(`ad break skipped: ${adBreak.id} to: ${this.timeDebugDisplay(adBreak.endTime)}`);
            }

            // skip a little past the end to avoid a flash of the final ad frame
            this.seekTo(adBreak.endTime+1, this.isControlBarVisible);
        }
    }

    startAd(adBreak) {
        if (adBreak.started || adBreak.completed) return;
        adBreak.started = true;
        console.log(`ad started: ${adBreak.id} at: ${this.timeDebugDisplay(adBreak.startTime)}`);

        // Start an interactive ad.
        this.hideControlBar();

        const ad = new InteractiveAd(adBreak, this);
        ad.start();
    }

    onVideoPlaying() {
        if (!this.platform.supportsInitialVideoSeek && this.initialVideoTime > 0) {
            // The initial seek did not supported, e.g. on the PS4. Do it now.
            // Loading will be considered complete on the first time update that has progress.
            this.seekTo(this.initialVideoTime);
        } else {
            // Video is now ready to be shown.
            this.videoLoaded = true;
            this.showVideo(true);
        }
    }

    onVideoTimeUpdate() {
        const currTime = this.currVideoTime;
        const newTime = Math.floor(this.video.currentTime);
        if (newTime == currTime) return;

        if (!this.videoLoaded) {
            // We have playback progress, we can consider the video as loaded.
            this.videoLoaded = true;
            this.showVideo(true);
        }

        this.seekTarget = undefined;

        const adBreak = this.getAdBreakAt(newTime);
        if (adBreak) {
            if (adBreak.completed) {
                if (Math.abs(adBreak.startTime - newTime) <= 1) {
                    // Skip over already completed ads if we run into their start times.
                    this.skipAd(adBreak);
                    return;
                }
            } else if (!adBreak.started) {
                this.startAd(adBreak);

            } else if (Math.abs(adBreak.endTime - newTime) <= 1) {
                // The user has viewed the whole ad.
                adBreak.completed = true;
            }
        }

        this.currVideoTime = newTime;
        this.refresh();
    }

    setAdPlaylist(vmap) {
        this.refreshAdMarkers = true;
        const childNodes = this.adMarkersDiv.children;
        for (let i = childNodes.length - 1; i >= 0; i--) {
            this.adMarkersDiv.removeChild(childNodes[i]);
        }

        this.adPlaylist = vmap.map(vmapJson => {
            return new AdBreak(vmapJson);
        });

        // Correct ad display times into raw video times for the actual time in the overall video.
        let totalAdsDuration = 0;
        this.adPlaylist.forEach(adBreak => {
            adBreak.startTime = adBreak.displayTimeOffset + totalAdsDuration;
            adBreak.endTime = adBreak.startTime + adBreak.duration;
            totalAdsDuration += adBreak.duration;
        });
    }

    isPlayingAdAt(rawVideoTime) {
        const adBreak = this.getAdBreakAt(rawVideoTime);
        return !!adBreak;
    }

    getAdBreakAt(rawVideoTime) {
        if (rawVideoTime === undefined) rawVideoTime = this.currVideoTime;
        for(var index in this.adPlaylist) {
            const adBreak = this.adPlaylist[index];
            if (adBreak.startTime <= rawVideoTime && rawVideoTime < adBreak.endTime) {
                return adBreak;
            }
        }
        return undefined;
    }

    // We assume ad videos are stitched into the main video.
    getPlayingVideoTimeAt(rawVideoTime, skipAds) {
        let result = rawVideoTime;
        for(var index in this.adPlaylist) {
            const adBreak = this.adPlaylist[index];
            if (rawVideoTime < adBreak.startTime) break; // future ads don't affect things
            if (!skipAds && adBreak.startTime <= rawVideoTime && rawVideoTime < adBreak.endTime) {
                // We are within the ad, show the ad time.
                return rawVideoTime - adBreak.startTime;
            } else if (adBreak.endTime <= rawVideoTime) {
                // Discount the ad duration.
                result -= adBreak.duration;
            }
        }
        return result;
    }

    getPlayingVideoDurationAt(rawVideoTime) {
        const adBreak = this.getAdBreakAt(rawVideoTime);
        if (adBreak) {
            return adBreak.duration;
        }
        const duration = this.rawVideoDuration || this.video.duration || 0;
        if (this.rawVideoDuration <= 0 && duration > 0) {
            // Remember the now known main video duration.
            this.rawVideoDuration = duration;
        }
        return this.getPlayingVideoTimeAt(duration);
    }

    timeDebugDisplay(rawVideoTime) {
        const displayTime = this.getPlayingVideoTimeAt(rawVideoTime, true);
        return `${timeLabel(displayTime)} (raw: ${timeLabel(rawVideoTime)})`;
    }

    refresh() {
        const currTime = this.currVideoTime;

        const isPlayindAd = this.isPlayingAdAt(currTime);
        if (isPlayindAd) {
            this.adIndicators.classList.add('show');
        } else {
            this.adIndicators.classList.remove('show');
        }

        if (!this.isControlBarVisible) {
            // other updates don't matter unless the control bar is visible
            return;
        }

        if (this.isPaused()) {
            // Next play input action will resume playback
            this.playButton.classList.add('show');
            this.pauseButton.classList.remove('show');
        } else {
            // Next play input action will pause playback
            this.playButton.classList.remove('show');
            this.pauseButton.classList.add('show');
        }

        const durationToDisplay = this.getPlayingVideoDurationAt(currTime);

        function percentage(time) {
            const result = durationToDisplay > 0 ? (time / durationToDisplay) * 100 : 0;
            return `${result}%`;
        }

        const seekTarget = this.seekTarget;
        let currTimeToDisplay = this.getPlayingVideoTimeAt(currTime);
        let timeToDisplay = currTimeToDisplay;
        if (seekTarget >= 0) {
            timeToDisplay = this.getPlayingVideoTimeAt(seekTarget);
            const seekTargetDiff = Math.abs(currTimeToDisplay - timeToDisplay);
            this.seekBar.style.width = percentage(seekTargetDiff);
            if (currTimeToDisplay <= timeToDisplay) {
                this.seekBar.style.left = percentage(currTimeToDisplay);
            } else {
                this.seekBar.style.left = percentage(currTimeToDisplay - seekTargetDiff);
            }
            this.seekBar.classList.add('show');

        } else {
            this.seekBar.classList.remove('show');
        }

        this.progressBar.style.width = percentage(timeToDisplay);
        this.durationLabel.innerText = timeLabel(durationToDisplay);

        this.timeLabel.innerText = timeLabel(timeToDisplay);
        this.timeLabel.style.left = percentage(timeToDisplay);

        if (isPlayindAd) {
            this.adMarkersDiv.classList.remove('show');
        } else {
            if (this.refreshAdMarkers && durationToDisplay > 0) {
                this.refreshAdMarkers = false;
                this.adPlaylist.forEach(adBreak => {
                    const marker = document.createElement('div');
                    marker.classList.add('ad-break');
                    const skipAds = true;
                    const adPlaytime = this.getPlayingVideoTimeAt(adBreak.startTime, skipAds);
                    marker.style.left = percentage(adPlaytime);
                    this.adMarkersDiv.appendChild(marker);
                });
            }
            this.adMarkersDiv.classList.add('show');
        }
    }
}

function timeLabel(time) {
    const seconds = time % 60;
    time /= 60;
    const minutes = time % 60;
    time /= 60;
    const hours = time;

    const result = pad(minutes) + ':' + pad(seconds);
    if (hours >= 1) return Math.floor(hours) + ':' + result;
    return result;
}

function pad(value) {
    value = Math.floor(value || 0);
    return (value < 10) ? '0' + value : value.toString();
}
