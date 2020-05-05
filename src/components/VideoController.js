import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';

import playSvg from '../assets/play-button.svg';
import pauseSvg from '../assets/pause-button.svg';

export class VideoController {
    constructor(videoSelector, controlBarSelector, platform) {
        this.video = document.querySelector(videoSelector);
        this.controlBarDiv = document.querySelector(controlBarSelector);

        this.playButton = this.controlBarDiv.querySelector('.play-button');
        this.playButton.innerHTML = playSvg;

        this.pauseButton = this.controlBarDiv.querySelector('.pause-button');
        this.pauseButton.innerHTML = pauseSvg;

        this.progressBar = this.controlBarDiv.querySelector('.timeline-progress');
        this.seekBar = this.controlBarDiv.querySelector('.timeline-seek');

        this.timeLabel = this.controlBarDiv.querySelector('.current-time');
        this.durationLabel = this.controlBarDiv.querySelector('.duration');

        this.lastVideoTime = 0;
        this.seekTarget = undefined;

        this.platform = platform || new TXMPlatform();

        this.onVideoTimeUpdate = this.onVideoTimeUpdate.bind(this);
    }

    show() {
        this.controlBarDiv.classList.add('show');
        this.refresh();
    }

    hide() {
        this.controlBarDiv.classList.remove('show');
    }

    startVideo(src) {
        const video = this.video;

        if (video.src != src) {
            video.src = src;
        }

        const initialVideoTime = this.lastVideoTime || 0;
        console.log('starting playback at ' + initialVideoTime);

        video.currentTime = initialVideoTime;
        video.play();

        if (this.platform.isPS4) {
            // Using a timeupdate listener seems to hang playback on the PS4.
            this._videoTimeupdateInterval = setInterval(this.onVideoTimeUpdate, 1000);
        } else {
            video.addEventListener("timeupdate", this.onVideoTimeUpdate);
        }

        this.show();
    }

    stopVideo() {
        this.hide();

        const video = this.video;

        this.lastVideoTime = video.currentTime;

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
    }

    togglePlayPause() {
        const video = this.video;
        if (video.paused) video.play();
        else video.pause();
    }

    stepForward() {
        this.stepVideoBy(10);
    }

    stepBackward() {
        this.stepVideoBy(-10);
    }

    stepVideoBy(seconds) {
        const video = this.video;
        this.seekTarget = video.currentTime + seconds;
        video.currentTime = this.seekTarget;
        this.refresh();
    }

    onVideoTimeUpdate() {
        this.seekTarget = undefined;
        this.refresh();
    }

    refresh() {
        const video = this.video;

        // Ensure we show what the next play input action will do
        this.playButton.style.opacity = video.paused ? 1 : 0;
        this.pauseButton.style.opacity = video.paused ? 0 : 1;

        const duration = video.duration > 0 ? video.duration : 0;
        const currTime = video.currentTime > 0 ? video.currentTime : 0;

        function percentage(time) {
            const result = duration ? (time / duration) * 100 : 0;
            return `${result}%`;
        }

        this.progressBar.style.width = percentage(currTime);

        const seekTarget = this.seekTarget;
        if (this.seekTarget >= 0) {
            this.seekBar.classList.add('show');
            this.seekBar.style.left = percentage((currTime < seekTarget) ? currTime : seekTarget);
            this.seekBar.style.right = percentage(100 - ((currTime < seekTarget) ? seekTarget : currTime));

        } else {
            this.seekBar.classList.remove('show');
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

        this.timeLabel.innerText = timeLabel(currTime);
        this.timeLabel.style.left = percentage(currTime);

        this.durationLabel.innerText = timeLabel(video.duration);
    }
}