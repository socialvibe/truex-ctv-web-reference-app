import uuid from 'uuid';
import { TruexAdRenderer } from '@truex/ad-renderer';

// Use a random UUID for the "opt out of tracking" advertising id that is stable for all ads in an app session.
const optOutAdvertisingId = uuid.v4();

/**
 * Exercises the TruexAdRenderer for interactive ads (TrueX and IDVx).
 *
 * Infillion Ad Types in SSAI:
 * - TrueX: Interactive choice card with ad credit
 * - IDVx: Interactive ad without choice card
 *
 * In SSAI, these ads are represented as placeholder videos stitched into the stream.
 * When encountered, we pause the main video and show the interactive overlay.
 */
export class InteractiveAd {
    constructor(adBreak, videoController) {
        let adFreePod = false;
        let adOverlay;
        let tar;

        const platform = videoController.platform;

        this.start = async () => {
            adBreak.started = true;

            const ad = adBreak.getCurrentAd();
            if (!ad) {
                console.error('No ad found in ad break:', adBreak.id);
                return;
            }

            ad.started = true;

            videoController.showLoadingSpinner(true);

            const nativeAdvertisingId = await getNativePlatformAdvertisingId();

            try {
                videoController.pause();

                const options = {
                    userAdvertisingId: nativeAdvertisingId, // i.e. override from native side query if present
                    fallbackAdvertisingId: optOutAdvertisingId, // random fallback to use if no user ad id is available
                    supportsUserCancelStream: true // i.e. user backing out of an ad will cancel the entire video
                };

                // Extract VAST config URL from Description field (if present)
                let vastConfigUrl = ad.description ? ad.description.trim() : null;
                if (vastConfigUrl && !vastConfigUrl.startsWith('http')) {
                    vastConfigUrl = 'https://' + vastConfigUrl;
                }

                // Substitute macros in the VAST config URL (for demo purposes)
                // In production, these would be substituted by the VAST server
                if (vastConfigUrl && videoController.videoStream) {
                    const streamId = videoController.videoStream.id || 'demo-stream-' + Date.now();
                    const userId = 'demo-user-' + Date.now();
                    vastConfigUrl = vastConfigUrl.replace('#{stream-id}', streamId);
                    vastConfigUrl = vastConfigUrl.replace('#{user-id}', userId);
                }

                // Get JSON config from AdParameters field (if present)
                let vastConfigJson = null;
                if (ad.adParameters) {
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
                    handleAdError('No VAST config available');
                    return;
                }

                // Pass JSON if available, otherwise URL
                const vastConfigUrlOrJson = vastConfigJson || vastConfigUrl;

                tar = new TruexAdRenderer(vastConfigUrlOrJson, options);
                tar.subscribe(handleAdEvent);

                return tar.init()
                    .then(vastConfig => {
                        return tar.start(vastConfig);
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
            const adEvents = tar.adEvents;
            switch (event.type) {
                case adEvents.adError:
                    handleAdError(event.errorMessage);
                    break;

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

        async function getNativePlatformAdvertisingId() {
            if (window.webApp && window.hostApp) {
                return new Promise(function(resolve, reject) {
                    window.webApp.onAdvertisingIdReady = function(advertisingId) {
                        // consume the callback
                        window.webApp.onAdvertisingIdReady = null;
                        resolve(advertisingId);
                    }

                    window.hostApp.getAdvertisingId && window.hostApp.getAdvertisingId();
                });
            }

            var advertisingId = undefined;

            if (platform.isTizen) {
                const webapis = window.webapis;
                const adinfo = webapis && webapis.adinfo;
                if (adinfo) {
                    try {
                        if (adinfo.isLATEnabled()) {
                            console.log('tizen ad id ignored due to Limited Ad Tracking');
                        } else {
                            advertisingId = adinfo.getTIFA();
                            console.log('tizen ad id: ' + advertisingId);
                        }
                    } catch (err) {
                        console.warn('tizen ad id error: ' + platform.describeError(err));
                    }
                } else {
                    console.warn('tizen ad id: webapis not present');
                }
            }

            return Promise.resolve(advertisingId);
        }

        function handleAdError(errOrMsg) {
            console.error('ad error: ' + errOrMsg);
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
            // Mark the individual ad as completed so getCurrentAd() can find the next one
            const ad = adBreak.getCurrentAd();
            if (ad) {
                ad.completed = true;
            }

            if (adFreePod) {
                // The user has earned ad credit, skip the entire ad break
                adBreak.completed = true;
                videoController.skipAdBreak(adBreak);
            } else {
                // User didn't earn credit, resume at fallback ads
                videoController.resumeAdBreak(adBreak);
            }
        }
    }
}
