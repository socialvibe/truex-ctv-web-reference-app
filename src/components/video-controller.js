import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';

import './video-controller.scss';
import playSvg from '../assets/play-button.svg';
import pauseSvg from '../assets/pause-button.svg';

export class VideoController {
    constructor(videoSelector, controlBarSelector, platform) {
        this.video = document.querySelector(videoSelector);
        this.controlBarDiv = document.querySelector(controlBarSelector);
        this.isVisible = false;
        this.videoStarted = false;

        this.playButton = this.controlBarDiv.querySelector('.play-button');
        this.playButton.innerHTML = playSvg;

        this.pauseButton = this.controlBarDiv.querySelector('.pause-button');
        this.pauseButton.innerHTML = pauseSvg;

        this.progressBar = this.controlBarDiv.querySelector('.timeline-progress');
        this.seekBar = this.controlBarDiv.querySelector('.timeline-seek');

        this.timeLabel = this.controlBarDiv.querySelector('.current-time');
        this.durationLabel = this.controlBarDiv.querySelector('.duration');

        this.currVideoTime = 0;
        this.videoDuration = 0;
        this.seekTarget = undefined;

        this.platform = platform || new TXMPlatform();

        this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
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

    startVideo(src) {
        const video = this.video;

        if (video.src != src) {
            video.src = src;
        }

        const initialVideoTime = this.currVideoTime || 0;
        console.log('starting playback at ' + initialVideoTime);

        this.videoStarted = true;
        this.show(this.videoStarted);

        video.currentTime = initialVideoTime;
        video.play();

        if (this.platform.isPS4) {
            // Using a timeupdate listener seems to hang playback on the PS4.
            this._videoTimeupdateInterval = setInterval(this.onVideoTimeUpdate, 1000);
        } else {
            video.addEventListener("timeupdate", this.onVideoTimeUpdate);
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
                clearInterval(videoTimeupdateInterval);
                this._videoTimeupdateInterval = null;
            }
        } else {
            video.removeEventListener('timeupdate', this.onVideoTimeUpdate);
        }

        // Note: We need to actually clear the video source to allow video reuse on the PS4.
        // Otherwise the video hangs when it is shown again.
        try {
            video.src = "";
        } catch (err) {
            console.warn('could not clear video src');
        }

        this.videoStarted = false;
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
        this.show();
    }

    stepForward() {
        this.stepVideoBy(20);
    }

    stepBackward() {
        this.stepVideoBy(-20);
    }

    stepVideoBy(seconds) {
        const video = this.video;
        const stepFrom = this.seekTarget >= 0 ? this.seekTarget : this.currVideoTime;
        const maxTarget = this.videoDuration || video.duration || 0;
        if (maxTarget <= 0) return;
        this.seekTarget = Math.max(0, Math.min(stepFrom + seconds, maxTarget));
        video.currentTime = this.seekTarget;
        this.show();
    }

    onVideoTimeUpdate() {
        this.seekTarget = undefined;
        const newTime = Math.floor(this.video.currentTime);
        if (newTime == this.currVideoTime) return;
        this.currVideoTime = newTime;
        if (this.isVisible) {
            this.refresh();
        }
    }

    refresh() {
        const video = this.video;

        if (video.paused) {
            // Next play input action will resume playback
            this.playButton.classList.add('show');
            this.pauseButton.classList.remove('show');
        } else {
            // Next play input action will pause playback
            this.playButton.classList.remove('show');
            this.pauseButton.classList.add('show');
        }

        const duration = this.videoDuration || video.duration || 0;
        if (this.videoDuration != duration) {
            this.videoDuration = duration;
            this.durationLabel.innerText = timeLabel(this.videoDuration);
        }

        const currTime = this.currVideoTime;
        this.progressBar.style.width = percentage(currTime);

        const seekTarget = this.seekTarget;
        let timeToDisplay = currTime;
        if (seekTarget >= 0) {
            timeToDisplay = seekTarget;
            this.seekBar.classList.add('show');

            const seekTargetDiff = Math.abs(currTime - seekTarget);
            this.seekBar.style.width = percentage(seekTargetDiff);
            if (currTime <= seekTarget) {
                this.seekBar.style.left = percentage(currTime);
            } else {
                this.seekBar.style.left = percentage(currTime - seekTargetDiff);
            }

        } else {
            this.seekBar.classList.remove('show');
        }

        this.timeLabel.innerText = timeLabel(timeToDisplay);
        this.timeLabel.style.left = percentage(timeToDisplay);

        function percentage(time) {
            const result = duration ? (time / duration) * 100 : 0;
            return `${result}%`;
        }

        function pad(value) {
            value = Math.floor(value || 0);
            return (value < 10) ? '0' + value : value.toString();
        }

        function timeLabel(time) {
            const seconds = time % 60;
            time /= 60;
            const minutes = time % 60;
            time /= 60;
            const hours = time;

            const result = pad(minutes) + ':' + pad(seconds);
            if (hours >= 1) return pad(hours) + ':' + result;
            return result;
        }
    }
}