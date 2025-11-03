import { Ad } from './ad';

/**
 * Describes a single ad break containing multiple ads (an ad pod).
 * When the content video reaches the timeOffset, we pause it and play the ads separately.
 */
export class AdBreak {
    constructor(vmapJson) {
        this.id = vmapJson.breakId;

        // Time in the main content video when this ad break should trigger
        this.timeOffset = parseTimeLabel(vmapJson.timeOffset);

        // Parse all ads in the break
        this.ads = (vmapJson.ads || []).map(adJson => new Ad(adJson));

        this.started = false;
        this.completed = false;

        // Current ad being played in the sequence
        this.currentAdIndex = 0;
    }

    getCurrentAd() {
        if (this.currentAdIndex < this.ads.length) {
            return this.ads[this.currentAdIndex];
        }
        return null;
    }

    getNextAd() {
        this.currentAdIndex++;
        return this.getCurrentAd();
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
