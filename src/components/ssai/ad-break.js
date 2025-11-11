/**
 * Describes a single ad break that maps to 1 or more fallback ad videos in the main video
 * (ads are assumed to be stitched in), that furthermore describes interactive ads to show
 * over top of the main video when the ad break is encountered during playback.
 *
 * In SSAI (Server-Side Ad Insertion), ads are pre-stitched into the video stream by the server.
 * This class tracks the timing and metadata for each ad break within the stitched stream.
 */
export class AdBreak {
    constructor(vmapJson) {
        this.id = vmapJson.breakId;
        this.displayTimeOffset = parseTimeLabel(vmapJson.timeOffset);
        this.duration = parseFloat(vmapJson.videoAdDuration);

        // Store the ads array - may contain TrueX, IDVx, or standard ads
        this.ads = vmapJson.ads || [];

        this.started = false;
        this.completed = false;

        // video timestamps are filled in when the ad playlist is set in the video controller.
        this.startTime = 0;
        this.endTime = 0;

        // Tracks the cumulative end time of the currently playing ad (interactive or not).
        // When resuming playback (if user doesn't earn credit), seek to this position
        // to skip past the interactive ads and play fallback ads.
        // Initialized in setAdPlaylist after startTime is set.
        this.lastAdEndTime = 0;
    }

    /**
     * Get the current ad to play (first unplayed ad in the sequence)
     */
    getCurrentAd() {
        return this.ads.find(ad => !ad.completed) || null;
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
