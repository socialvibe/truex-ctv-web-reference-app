# Getting Started

This document describes the initial steps needed to make use of the `TruexAdRenderer` in an HTML5 web application intended for Smart TVs and game consoles, i.e. for the so-called "10 foot" experience.

## What are Infillion Interactive Ads?

Infillion interactive ads provide engaging advertising experiences on Connected TV platforms. There are two types:

### TrueX Ads
TrueX ads present users with an **interactive choice card** where they can **opt-in** to engage with branded content. The user makes an active choice whether to interact with the ad. When users complete the interaction, they earn an **ad credit that skips the entire ad break**, allowing them to return immediately to their content. This creates a win-win: viewers get ad-free content, and advertisers get highly engaged audiences.

**Key features:**
- **Opt-in via choice card** - Users actively choose to engage
- **Skips entire ad break** - Successful engagement bypasses all remaining ads

### IDVx Ads
IDVx ads are **interactive ads** that start **automatically without requiring opt-in**. Unlike TrueX ads which require users to opt-in via a choice card, IDVx ads begin playing automatically. While no opt-in is required to start, users can interact with the ad content throughout its duration. IDVx ads **play inline with other ads** in the break sequence. After an IDVx ad completes, the next ad in the pod plays.

**Key features:**
- **Automatic start** - No opt-in required, begins playing automatically
- **Interactive throughout** - Users can interact with ad content for its duration
- **Plays inline** - Completes and continues to next ad in sequence

## Integration

The true[X] ad renderer is available as an `npm` module. For the typical web app based around a `package.json` project file, one adds the true[X] dependency as follows:
```sh
npm add @truex/ad-renderer
```
this will add an entry in the `"dependencies"` section in the `package.json` file, something like:
```json
    "dependencies": {
        "@truex/ad-renderer": "1.12.5",
```
One then builds and runs their web app like usual, e.g. invoking `npm start` for webpack-based projects.

One typically develops web apps in a local browser like Chrome, e.g. referring to the locally running app via something like `http://localhost:8080`. Running on a particular device platform is a matter of installing or sideloading a launcher app that refers to the hosted web app, whether that is an officially hosted site or one's local dev machine like `http://192.168.1.72:8080`.

To actually integrate the true[X] ad renderer, one has to create and invoke it during your app's video playback when the time of an ad break is reached. The pattern will look something like:
```javascript
import { TruexAdRenderer } from '@truex/ad-renderer';

...

videoController.pause();

tar = new TruexAdRenderer(vastConfigUrl, {supportsUserCancelStream: true});
tar.subscribe(handleAdEvent);

return tar.init()
  .then(vastConfig => {
    return tar.start(vastConfig);
  })
  .then(newAdOverlay => {
    adOverlay = newAdOverlay;
  })
  .catch(handleAdError);

...

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

function handleAdError(errOrMsg) {
  console.error('ad error: ' + errOrMsg);
  if (tar) {
    // Ensure the ad is no longer blocking back or key events, etc.
    tar.stop();
  }
  closeAdOverlay();
  resumePlayback();
}
``` 

# Next Steps

## Integration Example

This [reference application](https://github.com/socialvibe/truex-ctv-web-reference-app) provides complete working examples of the `TruexAdRenderer` integration. It includes:

* **SSAI Example** - Demonstrates TrueX ad integration with Server-Side Ad Insertion where ads are stitched into the video stream
* **CSAI Example** - Demonstrates both TrueX and IDVx ad integration with Client-Side Ad Insertion where ads play separately from the main video

The examples show how to integrate Infillion interactive ads, handle ad events, manage ad credits, and fallback to standard video ads when needed. The repository also includes platform launcher projects demonstrating how to sideload the reference application to various devices.

## Supported Platforms

The following are the current target platforms for the `TruexAdRenderer`:
* Comcast X1 / Flex
* Fire TV / Android TV
* Vizio Smartcast
* LG WebOS
* Samsung Tizen
* PS4
* XboxOne
* Nintendo Switch
