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

        this.adIndicator = document.querySelector('.ad-indicator');

        this.playButton = this.controlBarDiv.querySelector('.play-button');
        this.playButton.innerHTML = playSvg;

        this.pauseButton = this.controlBarDiv.querySelector('.pause-button');
        this.pauseButton.innerHTML = pauseSvg;

        this.progressBar = this.controlBarDiv.querySelector('.timeline-progress');
        this.seekBar = this.controlBarDiv.querySelector('.timeline-seek');

        this.timeLabel = this.controlBarDiv.querySelector('.current-time');
        this.durationLabel = this.controlBarDiv.querySelector('.duration');

        this.currVideoTime = 0;
        this.rawVideoDuration = 0;
        this.seekTarget = undefined;

        this.adPlaylist = [];

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

    startVideo(videoStream) {
        const video = this.video;

        if (video.src != videoStream.url) {
            video.src = videoStream.url;
        }
        this.setAdPlaylist(videoStream.vmap);

        const initialVideoTime = this.currVideoTime || 0;
        console.log(`starting video: ${videoStream.title} 
  src: ${videoStream.url}
  at: ${timeLabel(initialVideoTime)}`);

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
        this.stepVideo(true);
    }

    stepBackward() {
        this.stepVideo(false);
    }

    stepVideo(forward) {
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
        this.seekTo(stepFrom + seekStep);
    }

    seekTo(newTarget, showControlBar) {
        if (showControlBar === undefined) showControlBar = true; // default to showing the control bar

        const currTime = this.currVideoTime;
        if (currTime == newTarget) return; // already at the target
        if (this.isPlayingAdAt(currTime)) return; // don't allow seeking during ad playback

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

    onVideoTimeUpdate() {
        const newTime = Math.floor(this.video.currentTime);
        if (newTime == this.currVideoTime) return;

        this.seekTarget = undefined;

        const adBlock = this.getAdBlockAt(newTime);
        if (adBlock) {
            if (adBlock.completed) {
                // Skip over already completed ads.
                this.seekTo(adBlock.endTime, this.isVisible);
                return;

            } else if (Math.abs(adBlock.endTime - newTime) <= 2) {
                // The user has viewed the whole ad.
                adBlock.completed = true;
            }
        }

        this.currVideoTime = newTime;
        this.refresh();
    }

    setAdPlaylist(vmap) {
        this.adPlaylist = vmap.map(adBlock => {
            const startTime = parseTimeLabel(adBlock.timeOffset);
            const duration = parseFloat(adBlock.videoAdDuration);
            return {
                id: adBlock.breakId,
                startTime: startTime,
                duration: duration,
                endTime: startTime + duration,
                vastUrl: adBlock.vastUrl,
                completed: false
            }
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

    getPlayingVideoTimeAt(rawVideoTime) {
        let result = rawVideoTime;
        for(var index in this.adPlaylist) {
            const adBlock = this.adPlaylist[index];
            if (rawVideoTime < adBlock.startTime) break; // future ads don't affect things
            if (adBlock.startTime <= rawVideoTime && rawVideoTime < adBlock.endTime) {
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
            this.adIndicator.classList.add('show');
        } else {
            this.adIndicator.classList.remove('show');
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
    if (hours >= 1) return pad(hours) + ':' + result;
    return result;
}

function pad(value) {
    value = Math.floor(value || 0);
    return (value < 10) ? '0' + value : value.toString();
}
