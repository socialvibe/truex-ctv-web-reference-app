import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';
import { TruexAdRenderer } from '@truex/ctv-ad-renderer';
import adEvents from 'truex-shared/events/txm_ad_events';

import './video-controller.scss';
import playSvg from '../assets/play-button.svg';
import pauseSvg from '../assets/pause-button.svg';

export class VideoController {
    constructor(videoSelector, controlBarSelector, platform) {
        this.currentVideoStream = null;
        this.video = document.querySelector(videoSelector);
        this.controlBarDiv = document.querySelector(controlBarSelector);
        this.isVisible = false;
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

        this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
        this.onVideoPlaying = this.onVideoPlaying.bind(this);

        this.debug = false; // set to true to enable more verbose video time logging.

        this.closeVideoAction = function() {}; // override as needed
    }

    show(forceTimer) {
        this.controlBarDiv.classList.add('show');
        this.isVisible = true;
        this.refresh();

        this.stopControlBarTimer();
        if (forceTimer || !this.video.paused) {
            this.controlBarTimer = setTimeout(() => this.hide(), 8 * 1000);
        }
    }

    hide() {
        this.controlBarDiv.classList.remove('show');
        this.isVisible = false;
        this.stopControlBarTimer();
    }

    showVideo(visible) {
        this.video.style.visibility = visible ? 'visible' : 'hidden';

        // TODO: hide the loading spinner if visible.
    }

    startVideo(videoStream) {
        this.videoStarted = true;

        this.setAdPlaylist(videoStream.vmap);

        const video = this.video;

        const initialVideoTime = this.currVideoTime || video.currentTime || 0;
        this.initialVideoTime = initialVideoTime;
        console.log(`starting video: ${videoStream.title} 
  src: ${videoStream.url}
  at time: display: ${timeLabel(this.getPlayingVideoTimeAt(initialVideoTime))} raw: ${timeLabel(initialVideoTime)}`);

        video.src = videoStream.url;
        video.addEventListener('playing', this.onVideoPlaying);

        video.currentTime = initialVideoTime;
        video.play();

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

        } else {
            this.show(true);
        }
    }

    stopVideo() {
        this.hide();

        const video = this.video;

        if (this.videoStarted) {
            this.currVideoTime = video.currentTime;
        }

        video.pause();

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
        const video = this.video;
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }

        if (this.debug) {
            const currTime = this.currVideoTime;
            const displayTime = this.getPlayingVideoTimeAt(currTime, true);
            const status = this.video.paused ? 'paused' : 'resumed';
            console.log(`${status} at: display: ${timeLabel(displayTime)} raw: ${timeLabel(currTime)}`);
        }

        this.show();
    }

    stepForward() {
        this.stepVideo(true);
    }

    stepBackward() {
        this.stepVideo(false);
    }

    stepVideo(forward) {
        const currTime = this.currVideoTime;
        if (this.isPlayingAdAt(currTime)) return; // don't allow user seeking during ad playback

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
                const adBlock = this.adPlaylist[i];
                if (newTarget < adBlock.startTime) break; // ignore future ads after the seek target
                if (adBlock.endTime <= currTime) continue; // ignore past ads

                if (adBlock.completed) {
                    // Skip over the completed ad.
                    newTarget += adBlock.duration;
                } else {
                    // Stop on the ad to play it.
                    newTarget = adBlock.startTime;
                    break;
                }
            }
        } else {
            // Seeking backwards
            for(var i = this.adPlaylist.length-1; i >= 0; i--) {
                const adBlock = this.adPlaylist[i];
                if (currTime <= adBlock.startTime) continue; // ignore unplayed future ads
                if (adBlock.endTime < newTarget) break; // ignore ads before the seek target

                if (adBlock.completed) {
                    // Skip over the completed ad.
                    newTarget -= adBlock.duration;
                } else {
                    // Stop on the ad to play it.
                    newTarget = adBlock.startTime;
                    break;
                }
            }
        }

        if (this.debug) {
            const newTargetDisplay = this.getPlayingVideoTimeAt(newTarget, true);
            console.log(`seek to: display: ${timeLabel(newTargetDisplay)} raw: ${timeLabel(newTarget)}`);
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
        video.currentTime = this.seekTarget;
        if (showControlBar) {
            this.show();
        }
    }

    skipAd() {
        const currTime = this.currVideoTime;
        const adBlock = this.getAdBlockAt(currTime);
        if (adBlock) {
            adBlock.completed = true;
            console.log(`ad skipped: ${adBlock.id}`);
            this.seekTo(adBlock.endTime);
        }
    }

    startAd(adBlock) {
        const self = this;

        if (adBlock.started || adBlock.completed) return;
        adBlock.started = true;
        console.log(`ad started: ${adBlock.id} at:`
            + ` display: ${timeLabel(adBlock.displayTimeOffset)} raw: ${timeLabel(adBlock.startTime)}`);

        // Start an interactive ad.
        this.hide();

        adBlock.isInteracting = true;

        const video = this.video;
        let adFreePod = false;
        let adOverlay;
        let tar;
        try {
            video.pause();

            const options = {
                supportsUserCancelStream: true,
            };

            tar = new TruexAdRenderer(adBlock.vastUrl, options);
            tar.subscribe(handleAdEvent);

            return tar.init()
                .then(tar.start)
                .then(newAdOverlay => {
                    adOverlay = newAdOverlay;
                })
                .catch(handleAdError);
        } catch (err) {
            handleAdError(err);
        }

        function handleAdEvent(event) {
            if (event.type == adEvents.adError) {
                handleAdError(event.errorMessage);
                return;
            }

            switch (event.type) {
                case adEvents.adFreePod:
                    adFreePod = true; // the user did sufficient interaction.
                    break;

                case adEvents.userCancelStream:
                    closeAdOverlay();
                    this.closeVideoAction();
                    break;

                case adEvents.optIn:
                    // user started engagment experience
                    break;

                case adEvents.optOut:
                    // user cancelled out of the choice card, either explicitly,
                    // or implicitly via a timeout.
                    break;

                case adEvents.userCancel:
                    // showing choice card again.
                    break;

                case adEvents.noAdsAvailable:
                case adEvents.adCompleted:
                    closeAdOverlay();
                    resumePlayback();
                    break;
            }

        }

        function handleAdError(errOrMsg) {
            const msg = typeof errOrMsg == 'string' ? errOrMsg : errOrMsg.toString();
            console.error('ad error: ' + msg);
            if (tar) {
                // Ensure the ad is no longer blocking back or key events, etc.
                tar.stop();
            }
            closeAdOverlay();
            resumePlayback();
        }

        function closeAdOverlay() {
            adBlock.isInteracting = false;
            if (adOverlay) {
                if (adOverlay.parentNode) adOverlay.parentNode.removeChild(adOverlay);
                adOverlay = null;
            }
            // document.body.focus();
        }

        function resumePlayback() {
            if (adFreePod) {
                // The user has the ad credit, skip over the ad video.
                self.seekTo(adBlock.endTime);
            }
            video.play();
        }
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

        const adBlock = this.getAdBlockAt(newTime);
        if (adBlock) {
            if (adBlock.completed) {
                if (Math.abs(adBlock.startTime - newTime) <= 1) {
                    // Skip over already completed ads if we run into their start times.
                    this.seekTo(adBlock.endTime, this.isVisible);
                    return;
                }
            } else if (!adBlock.started) {
                this.startAd(adBlock);

            } else if (Math.abs(adBlock.endTime - newTime) <= 1) {
                // The user has viewed the whole ad.
                adBlock.completed = true;
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

        this.adPlaylist = vmap.map(adBlock => {
            return {
                id: adBlock.breakId,
                displayTimeOffset: parseTimeLabel(adBlock.timeOffset),
                duration: parseFloat(adBlock.videoAdDuration),
                vastUrl: adBlock.vastUrl,
                started: false,
                isInteracting: false,
                completed: false
            }
        });

        // Correct ad display times into raw video times for the actual time in the overall video.
        let totalAdsDuration = 0;
        this.adPlaylist.forEach(adBlock => {
            adBlock.startTime = adBlock.displayTimeOffset + totalAdsDuration;
            adBlock.endTime = adBlock.startTime + adBlock.duration;
            totalAdsDuration += adBlock.duration;
        });
    }

    // We assume ad videos are stiched into the main video.
    isPlayingAdAt(rawVideoTime) {
        const adBlock = this.getAdBlockAt(rawVideoTime);
        return !!adBlock;
    }

    getAdBlockAt(rawVideoTime) {
        if (rawVideoTime === undefined) rawVideoTime = this.currVideoTime;
        for(var index in this.adPlaylist) {
            const adBlock = this.adPlaylist[index];
            if (adBlock.startTime <= rawVideoTime && rawVideoTime < adBlock.endTime) {
                return adBlock;
            }
        }
        return undefined;
    }

    getPlayingVideoTimeAt(rawVideoTime, skipAds) {
        let result = rawVideoTime;
        for(var index in this.adPlaylist) {
            const adBlock = this.adPlaylist[index];
            if (rawVideoTime < adBlock.startTime) break; // future ads don't affect things
            if (!skipAds && adBlock.startTime <= rawVideoTime && rawVideoTime < adBlock.endTime) {
                // We are within the ad, show the ad time.
                return rawVideoTime - adBlock.startTime;
            } else if (adBlock.endTime <= rawVideoTime) {
                // Discount the ad duration.
                result -= adBlock.duration;
            }
        }
        return result;
    }

    getPlayingVideoDurationAt(rawVideoTime) {
        const adBlock = this.getAdBlockAt(rawVideoTime);
        if (adBlock) {
            return adBlock.duration;
        }
        const duration = this.rawVideoDuration || this.video.duration || 0;
        if (this.rawVideoDuration <= 0 && duration > 0) {
            // Remember the now known main video duration.
            this.rawVideoDuration = duration;
        }
        return this.getPlayingVideoTimeAt(duration);
    }

    refresh() {
        const video = this.video;

        const currTime = this.currVideoTime;

        const isPlayindAd = this.isPlayingAdAt(currTime);
        if (isPlayindAd) {
            this.adIndicators.classList.add('show');
        } else {
            this.adIndicators.classList.remove('show');
        }

        if (!this.isVisible) {
            // other updates don't matter unless the control bar is visible
            return;
        }

        if (video.paused) {
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
                this.adPlaylist.forEach(adBlock => {
                    const marker = document.createElement('div');
                    marker.classList.add('ad-block');
                    const skipAds = true;
                    const adPlaytime = this.getPlayingVideoTimeAt(adBlock.startTime, skipAds);
                    marker.style.left = percentage(adPlaytime);
                    this.adMarkersDiv.appendChild(marker);
                });
            }
            this.adMarkersDiv.classList.add('show');
        }
    }
}

function parseTimeLabel(label) {
    if (!label) return 0;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    const parts = label.split(':');
    if (parts.length >= 3) {
        hours = parseFloat(parts[0]);
        minutes = parseFloat(parts[1]);
        seconds = parseFloat(parts[2]);
    } else if (parts.length == 2) {
        minutes = parseFloat(parts[0]);
        seconds = parseFloat(parts[1]);
    } else {
        seconds = parseFloat(parts[0]);
    }
    return seconds + minutes*60 + hours*60*60;
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
