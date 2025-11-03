/**
 * Describes a single ad break that maps to 1 or more fallback ad videos in the main video
 * (ads are assumed to be sitched in), that furthermore describes a true[X] interactive ad to show
 * over top of the main video when the ad break is encountered during playback.
 */
export class AdBreak {
    constructor(vmapJson) {
        this.id = vmapJson.breakId;
        this.displayTimeOffset = parseTimeLabel(vmapJson.timeOffset);
        this.duration = parseFloat(vmapJson.videoAdDuration);
        this.vastUrl = vmapJson.vastUrl;
        this.started = false;
        this.completed = false;

        // video timestamps are filled in when the ad playlist is set in the video controller.
        this.startTime = 0;
        this.endTime = 0;
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
