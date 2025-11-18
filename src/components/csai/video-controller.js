import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';

import '../video-controller.scss';
import playSvg from '../../assets/play-button.svg';
import pauseSvg from '../../assets/pause-button.svg';

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
        this.adVideo = null; // for playing standard video ads
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
        if (firstAdBlock && firstAdBlock.timeOffset <= 0) {
            // If we have a preroll, show it immediately, since otherwise it takes a while for the video to load
            const started = this.startAd(firstAdBlock);
            if (started) return;
        }

        this.showLoadingSpinner(true);

        // Put the video underneath any control overlays.
        const video = document.createElement('video');
        this.video = video;
        this.videoOwner.insertBefore(this.video, this.videoOwner.firstChild);

        video.poster = 'noposter'; // work around grey play icon on Android TV.

        video.src = videoStream.url;
        video.addEventListener('playing', this.onVideoStarted);
        video.addEventListener("timeupdate", this.onVideoTimeUpdate);

        const initialVideoTime = Math.max(0, this.initialVideoTime || 0);
        this.initialVideoTime = initialVideoTime;
        console.log(`starting video: ${videoStream.title} src: ${videoStream.url} at time: ${this.timeDebugDisplay(initialVideoTime)}`);

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

        // Clean up main video
        const video = this.video;
        if (video) {
            this.pause();

            video.removeEventListener('timeupdate', this.onVideoTimeUpdate);
            video.removeEventListener('playing', this.onVideoStarted);

            video.src = ''; // ensure actual video is unloaded (needed for PS4).

            video.parentNode.removeChild(video); // remove from the DOM

            this.video = null;
        }

        // Clean up any ad video
        if (this.adVideo) {
            this.adVideo.src = '';
            if (this.adVideo.parentNode) {
                this.adVideo.parentNode.removeChild(this.adVideo);
            }
            this.adVideo = null;
        }

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

        // If we hit an ad break timeOffset during the seek, it will trigger via onVideoTimeUpdate
        this.seekTo(newTarget);
    }

    seekTo(newTarget, showControlBar) {
        if (showControlBar === undefined) showControlBar = true; // default to showing the control bar

        const currTime = this.currVideoTime;
        if (currTime == newTarget) return; // already at the target

        const video = this.video;

        // Clamp seek target between 0 and video duration
        const duration = video && video.duration;
        this.seekTarget = Math.max(0, Math.min(newTarget, duration > 0 ? duration : newTarget));
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

    skipAdBreak(adBreak) {
        if (!adBreak) {
            adBreak = this.getAdBreakAt(this.currVideoTime);
        }
        if (adBreak) {
            adBreak.completed = true;

            console.log(`ad break skipped: ${adBreak.id} (user earned ad credit)`);

            // Resume the main video from where it paused
            this.startVideoLater();
        }
    }

    playNextAdInBreak(adBreak) {
        const nextAd = adBreak.getNextAd();

        if (nextAd) {
            console.log(`playing next ad in break: ${nextAd.id} (${nextAd.adSystem})`);
            this.playAd(nextAd, adBreak);
        } else {
            // No more ads in this break, resume main video
            console.log(`ad break completed: ${adBreak.id}`);
            adBreak.completed = true;
            this.startVideoLater();
        }
    }

    playAd(ad, adBreak) {
        if (ad.isInteractive()) {
            // Play interactive ad (trueX or IDVx)
            this.playInteractiveAd(ad, adBreak);
        } else {
            // Play standard video ad
            this.playStandardVideoAd(ad, adBreak);
        }
    }

    playInteractiveAd(ad, adBreak) {
        console.log(`starting interactive ad: ${ad.id} (${ad.adSystem})`);

        // Extract VAST config following the IMA integration pattern:
        // - TrueX: Uses Description field containing VAST config URL
        // - IDVx: Uses AdParameters field containing JSON config

        // Get VAST config URL from Description field (trueX)
        let vastConfigUrl = ad.description ? ad.description.trim() : null;
        if (vastConfigUrl && !vastConfigUrl.startsWith('http')) {
            vastConfigUrl = 'https://' + vastConfigUrl;
        }

        // Substitute macros for demo purposes
        // In production, these would be substituted by the VAST server
        if (vastConfigUrl && this.videoStream) {
            const streamId = this.videoStream.id || 'demo-stream-' + Date.now();
            const userId = 'demo-user-' + Date.now();
            vastConfigUrl = vastConfigUrl.replace('#{stream-id}', streamId);
            vastConfigUrl = vastConfigUrl.replace('#{user-id}', userId);
        }

        // Get JSON config from AdParameters field (IDVx)
        let vastConfigJson = null;
        if (ad.adParameters) {
            // adParameters can be either an object or a JSON string
            if (typeof ad.adParameters === 'string') {
                try {
                    vastConfigJson = JSON.parse(ad.adParameters.trim());
                } catch (err) {
                    console.error('Failed to parse adParameters JSON:', err);
                }
            } else {
                vastConfigJson = ad.adParameters;
            }
        }

        if (!vastConfigUrl && !vastConfigJson) {
            console.error('No VAST config found for interactive ad:', ad.id);
            // Skip to next ad
            this.playNextAdInBreak(adBreak);
            return;
        }

        this.hideControlBar();
        this.stopVideo();

        // TrueX flow uses vast config URL, IDVx flow uses vastConfigJson
        // Pass JSON if available (IDVx), otherwise URL (TrueX)
        const interactiveAd = new InteractiveAd(vastConfigJson || vastConfigUrl, ad, adBreak, this);
        setTimeout(() => interactiveAd.start(), 1);
    }

    playStandardVideoAd(ad, adBreak) {
        console.log(`starting standard video ad: ${ad.id} (${ad.adSystem})`);

        ad.started = true;
        this.showLoadingSpinner(true);

        const video = document.createElement('video');
        this.adVideo = video;
        this.videoOwner.insertBefore(video, this.videoOwner.firstChild);

        video.src = ad.mediaFile;

        video.addEventListener('ended', () => {
            console.log(`standard video ad completed: ${ad.id}`);
            ad.completed = true;

            // Clean up ad video
            if (this.adVideo) {
                this.adVideo.parentNode.removeChild(this.adVideo);
                this.adVideo = null;
            }

            // Play next ad in sequence
            this.playNextAdInBreak(adBreak);
        });

        video.addEventListener('error', (err) => {
            console.error(`standard video ad error: ${ad.id}`, err);
            ad.completed = true;

            // Clean up ad video
            if (this.adVideo) {
                this.adVideo.parentNode.removeChild(this.adVideo);
                this.adVideo = null;
            }

            // Play next ad in sequence
            this.playNextAdInBreak(adBreak);
        });

        video.addEventListener('playing', () => {
            this.showLoadingSpinner(false);
        });

        video.play();
    }

    startAd(adBreak) {
        if (adBreak.started || adBreak.completed) return false;
        adBreak.started = true;
        console.log(`ad break started: ${adBreak.id} at: ${this.timeDebugDisplay(adBreak.timeOffset)}`);

        // Reset the ad break to start from the first ad
        adBreak.currentAdIndex = 0;

        const firstAd = adBreak.getCurrentAd();
        if (firstAd) {
            this.playAd(firstAd, adBreak);
            return true;
        }

        // No ads in this break, continue with main video
        console.log(`ad break has no ads: ${adBreak.id}`);
        adBreak.completed = true;
        return false;
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

        // Check if we've hit an ad break timeOffset
        const adBreak = this.getAdBreakAt(newTime);
        if (adBreak && !adBreak.started) {
            // Pause main video and start ad break
            this.startAd(adBreak);
            return;
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
    }

    hasAdBreakAt(rawVideoTime) {
        const adBreak = this.getAdBreakAt(rawVideoTime);
        return !!adBreak;
    }

    getAdBreakAt(rawVideoTime) {
        if (rawVideoTime === undefined) rawVideoTime = this.currVideoTime;
        for(var index in this.adPlaylist) {
            const adBreak = this.adPlaylist[index];
            // Trigger ad break when we're within 1 second of the timeOffset
            if (Math.abs(adBreak.timeOffset - rawVideoTime) <= 1 && !adBreak.completed) {
                return adBreak;
            }
        }
        return undefined;
    }

    // No time adjustments needed - ads play separately from main video
    getPlayingVideoTimeAt(rawVideoTime) {
        return rawVideoTime;
    }

    getPlayingVideoDurationAt(rawVideoTime) {
        const duration = this.video && this.video.duration || 0;
        return duration;
    }

    timeDebugDisplay(rawVideoTime) {
        return timeLabel(rawVideoTime);
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
                    // Ad markers show where ad breaks will trigger in the content video
                    marker.style.left = percentage(adBreak.timeOffset);
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
