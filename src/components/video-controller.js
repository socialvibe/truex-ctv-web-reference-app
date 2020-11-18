import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';

import './video-controller.scss';
import playSvg from '../assets/play-button.svg';
import pauseSvg from '../assets/pause-button.svg';

import { AdBreak}        from "./ad-break";
import { InteractiveAd } from "./interactive-ad";

export class VideoController {
    constructor(videoOwner, controlBarSelector, platform) {
        this.debug = false; // set to true to enable more verbose video time logging.

        this.videoOwner = document.querySelector(videoOwner);
        if (!this.videoOwner) {
            throw new Error('video owner not found: ' + videoOwner);
        }
        this.video = null;
        this.videoStream = null;

        this.controlBarDiv = document.querySelector(controlBarSelector);
        this.isControlBarVisible = false;

        this.adIndicator = document.querySelector('.ad-indicator');

        this.playButton = this.controlBarDiv.querySelector('.play-button');
        this.playButton.innerHTML = playSvg;

        this.pauseButton = this.controlBarDiv.querySelector('.pause-button');
        this.pauseButton.innerHTML = pauseSvg;

        this.progressBar = this.controlBarDiv.querySelector('.timeline-progress');
        this.seekBar = this.controlBarDiv.querySelector('.timeline-seek');
        this.adMarkersDiv = this.controlBarDiv.querySelector('.ad-markers');

        this.timeLabel = this.controlBarDiv.querySelector('.current-time');
        this.durationLabel = this.controlBarDiv.querySelector('.duration');

        this.videoStarted = false;
        this.initialVideoTime = 0;
        this.currVideoTime = -1;
        this.seekTarget = undefined;

        this.adPlaylist = [];

        this.platform = platform || new TXMPlatform();

        this.loadingSpinner = null;

        this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
        this.onVideoStarted = this.onVideoStarted.bind(this);

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

    showLoadingSpinner(visible) {
        const spinner = this.loadingSpinner;
        if (!spinner) return;
        if (visible) spinner.show();
        else spinner.hide();
    }

    // Create the video element "later" to work around some hangs and crashes, e.g. on the PS4
    startVideoLater(videoStream, showControlBar) {
        this.stopOldVideo(videoStream);
        setTimeout(() => this.startVideo(videoStream, showControlBar), 1);
    }

    startVideo(videoStream, showControlBar) {
        this.stopOldVideo(videoStream);

        const isFirstStart = !!videoStream;
        if (videoStream) {
            this.videoStream = videoStream;
        } else {
            videoStream = this.videoStream;
        }
        if (!videoStream) return;

        if (isFirstStart) {
            this.setAdPlaylist(videoStream.vmap);
        }

        const firstAdBlock = this.adPlaylist[0];
        if (firstAdBlock && firstAdBlock.startTime <= 0) {
            // If we have a preroll, show it immediately, since otherwise it takes a while for the video to load
            const started = this.startAd(firstAdBlock);
            if (started) return;
        }

        this.showLoadingSpinner(true);

        // Put the video underneath any control overlays.
        const video = document.createElement('video');
        this.video = video;
        this.videoOwner.insertBefore(this.video, this.videoOwner.firstChild);

        video.src = videoStream.url;
        video.addEventListener('playing', this.onVideoStarted);
        video.addEventListener("timeupdate", this.onVideoTimeUpdate);

        const initialVideoTime = Math.max(0, this.initialVideoTime || 0);
        this.initialVideoTime = initialVideoTime;
        console.log(`starting video: ${videoStream.title} 
    src: ${videoStream.url}
    at time: ${this.timeDebugDisplay(initialVideoTime)}`);

        this.videoStarted = false; // set to true on the first playing event
        this.currVideoTime = initialVideoTime; // will be updated as video progresses
        video.currentTime = initialVideoTime;
        this.play();

        if (showControlBar) {
            const forceTimer = true;
            this.showControlBar(forceTimer);
        } else {
            this.hideControlBar();
        }
    }

    stopOldVideo(newVideoStream) {
        if (this.video && newVideoStream) {
            if (this.videoStream === newVideoStream) {
                return; // already playing.
            } else {
                // Stop the existing video. (Creating a new video instance is more reliable across
                // platforms than just changing the video.src)
                this.stopVideo();
            }
        }
    }

    stopVideo() {
        this.hideControlBar();

        this.showLoadingSpinner(false);

        const video = this.video;
        if (!video) return;

        this.pause();

        video.removeEventListener('timeupdate', this.onVideoTimeUpdate);
        video.removeEventListener('playing', this.onVideoStarted);

        video.src = ''; // ensure actual video is unloaded (needed for PS4).

        video.parentNode.removeChild(video); // remove from the DOM

        this.video = null;
        this.seekTarget = undefined;
    }

    stopControlBarTimer() {
        if (this.controlBarTimer) {
            clearTimeout(this.controlBarTimer);
            this.controlBarTimer = undefined;
        }
    }

    togglePlayPause() {
        if (!this.video) {
            const showControlBar = true;
            this.startVideoLater(null, showControlBar);
            return;
        }
        if (this.isPaused()) {
            this.play();
        } else {
            this.pause();
        }

        this.showControlBar();
    }

    isPaused() {
        return !this.video || this.video.paused;
    }

    play() {
        if (!this.video) return;
        if (this.debug) console.log(`play from: ${this.timeDebugDisplay(this.currVideoTime)}`);
        // Work around PS4 hangs by starting playback in a separate thread.
        setTimeout( () => {
            if (!this.video) return; // video has been closed
            this.video.play();
        }, 10);
    }

    pause() {
        if (!this.video) return;
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
        if (!this.video) return; // user stepping should only happen on an active video

        const currTime = this.currVideoTime;

        if (this.hasAdBreakAt(currTime)) {
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
                    // Play the ad instead of stepping over it.
                    this.startAd(adBreak);
                    return;
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
                    // Play the ad instead of stepping over it.
                    this.startAd(adBreak);
                    return;
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

        // We only have a max target if the video duration is known.
        const duration = video && video.duration;
        const maxTarget = duration > 0 ? duration : newTarget;

        // Don't allow seeking back to the preroll.
        const firstAdBlock = this.adPlaylist[0];
        const minTarget = firstAdBlock && firstAdBlock.startTime <= 0 ? firstAdBlock.duration : 0;

        this.seekTarget = Math.max(minTarget, Math.min(newTarget, maxTarget));
        console.log(`seek to: ${this.timeDebugDisplay(this.seekTarget)}`);

        if (video) {
            video.currentTime = this.seekTarget;

        } else {
            // No video present yet, just record the desired current time for when it resumes.
            this.initialVideoTime = newTarget;
        }

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

            console.log(`ad break skipped: ${adBreak.id} to: ${this.timeDebugDisplay(adBreak.endTime)}`);

            // skip a little past the end to avoid a flash of the final ad frame
            this.seekTo(adBreak.endTime+1, this.isControlBarVisible);
        }
    }

    startAd(adBreak) {
        if (adBreak.started || adBreak.completed) return false;
        adBreak.started = true;
        console.log(`ad started: ${adBreak.id} at: ${this.timeDebugDisplay(adBreak.startTime)}`);

        // Start an interactive ad.
        this.hideControlBar();

        this.stopVideo(); // avoid multiple videos, e.g. for platforms like the PS4

        // ensure main video is logically at the ad start for when it resumes
        this.initialVideoTime = adBreak.startTime;

        const ad = new InteractiveAd(adBreak, this);
        setTimeout(() => ad.start(), 1); // show the ad "later" to work around hangs/crashes on the PS4

        return true; // ad started
    }

    onVideoStarted() {
        if (!this.video) return;
        if (this.videoStarted) return;
        this.videoStarted = true;

        if (!this.platform.supportsInitialVideoSeek && this.initialVideoTime > 0) {
            // The initial seek is not supported, e.g. on the PS4. Do it now.
            this.currVideoTime = 0;
            this.seekTo(this.initialVideoTime);
        } else {
            this.showLoadingSpinner(false);
            this.refresh();
        }
    }

    onVideoTimeUpdate() {
        if (!this.video) return;

        const newTime = Math.floor(this.video.currentTime);
        const currTime = this.currVideoTime;
        if (newTime == currTime) return;
        this.currVideoTime = newTime;

        this.showLoadingSpinner(false);

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

        this.seekTarget = undefined;
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

    hasAdBreakAt(rawVideoTime) {
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
        const duration = this.video && this.video.duration || 0;
        return this.getPlayingVideoTimeAt(duration);
    }

    timeDebugDisplay(rawVideoTime) {
        const displayTime = this.getPlayingVideoTimeAt(rawVideoTime, true);
        return `${timeLabel(displayTime)} (raw: ${timeLabel(rawVideoTime)})`;
    }

    refresh() {
        const currTime = this.currVideoTime;

        const isAtAd = this.hasAdBreakAt(currTime);
        if (isAtAd) {
            this.adIndicator.classList.add('show');
        } else {
            this.adIndicator.classList.remove('show');
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

        if (isAtAd) {
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
