import { TXMPlatform } from 'truex-shared/focus_manager/txm_platform';
import { TruexAdRenderer } from '@truex/ctv-ad-renderer';
import adEvents from 'truex-shared/events/txm_ad_events';

// Exercises the True[X] Ad Renderer for interactive ads.
export class InteractiveAd {
    constructor(adBlock, videoController) {
        const self = this;

        let adFreePod = false;
        let adOverlay;
        let tar;

        self.start = () => {
            adBlock.started = true;

            videoController.showLoadingSpinner(true);

            try {
                videoController.pause();

                const options = {
                    supportsUserCancelStream: true,
                };

                tar = new TruexAdRenderer(adBlock.vastUrl, options);
                tar.subscribe(handleAdEvent);

                return tar.init()
                    .then(vastConfig => {
                        tar.start(vastConfig);
                    })
                    .then(newAdOverlay => {
                        adOverlay = newAdOverlay;
                    })
                    .catch(handleAdError);
            } catch (err) {
                handleAdError(err);
            }
        };

        function handleAdEvent(event) {
            if (event.type == adEvents.adError) {
                handleAdError(event.errorMessage);
                return;
            }

            switch (event.type) {
                case adEvents.adStarted:
                    // Choice card loaded and displayed.
                    videoController.showLoadingSpinner(false);
                    break;

                case adEvents.optIn:
                    // User started the engagement experience
                    break;

                case adEvents.optOut:
                    // User cancelled out of the choice card, either explicitly, or implicitly via a timeout.
                    break;

                case adEvents.adFreePod:
                    adFreePod = true; // the user did sufficient interaction for an ad credit
                    break;

                case adEvents.userCancel:
                    // User backed out of the ad, now showing the choice card again.
                    break;

                case adEvents.userCancelStream:
                    // User backed out of the choice card, which means backing out of the entire video.
                    closeAdOverlay();
                    videoController.closeVideoAction();
                    break;

                case adEvents.noAdsAvailable:
                case adEvents.adCompleted:
                    // Ad is not available, or has completed. Depending on the adFreePod flag, either the main
                    // video or the ad fallback videos are resumed.
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
            videoController.showLoadingSpinner(false);
            if (adOverlay) {
                if (adOverlay.parentNode) adOverlay.parentNode.removeChild(adOverlay);
                adOverlay = null;
            }
        }

        function resumePlayback() {
            if (adFreePod) {
                // The user has the ad credit, skip over the ad video.
                adBlock.completed = true;
                videoController.skipAd(adBlock);
            }
            videoController.play();
        }
    }
}