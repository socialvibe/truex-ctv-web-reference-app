/**
 * Represents a single ad within an ad break.
 * Supports multiple ad types: trueX (interactive), IDVx (identity-verified), and standard video ads.
 */
export class Ad {
    constructor(adJson) {
        this.id = adJson.id;
        this.sequence = adJson.sequence;
        this.adSystem = adJson.adSystem; // 'trueX', 'IDVx', or 'GDFP'
        this.title = adJson.title;
        this.duration = parseFloat(adJson.duration);

        // Description field: Contains VAST config URL for trueX ads
        // Mirrors IMA's ad.getDescription()
        this.description = adJson.description;

        // AdParameters field: Contains JSON config for IDVx ads
        // Mirrors IMA's ad.getTraffickingParametersString()
        this.adParameters = adJson.adParameters;

        // Fallback video ad
        this.mediaFile = adJson.mediaFile;

        this.started = false;
        this.completed = false;
    }

    isTrueX() {
        return this.adSystem === 'trueX';
    }

    isIDVx() {
        return this.adSystem === 'IDVx';
    }

    isStandardVideo() {
        return !this.isTrueX() && !this.isIDVx();
    }

    isInteractive() {
        return this.isTrueX() || this.isIDVx();
    }
}
