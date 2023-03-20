# Getting Started

This document describes the initial steps needed to make use of the `TruexAdRenderer` in an HTML5 web application intended for Smart TVs and game consoles, i.e. for the so-called "10 foot" experience.

The true[X] ad renderer is available as an `npm` module. For the typical web app based around a `package.json` project file, one adds the true[X] dependency as follows:
```sh
npm add @truex/ctv-ad-renderer
```
this will add an entry in the `"dependencies"` section in the `package.json` file, something like:
```json
    "dependencies": {
        "@truex/ctv-ad-renderer": "1.0.0",
```
One then builds and runs their web app like usual, e.g. invoking `npm start` for webpack-based projects.

One typically develops web apps in a local browser like Chrome, e.g. referring to the locally running app via something like `http://localhost:8080`. Running on a particular device platform is a matter of installing or sideloading a launcher app that refers to the hosted web app, whether that is an officially hosted site or one's local dev machine like `http://192.168.1.72:8080`.

To actually integrate the true[X] ad renderer, one has to create and invoke it during your app's video playback when the time of an ad break is reached. The pattern will look something like:
```javascript
import { TruexAdRenderer } from '@truex/ctv-ad-renderer';

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

Here is a [reference application example](https://github.com/socialvibe/truex-ctv-web-reference-app) that uses the `TruexAdRenderer`, demonstrating its use from a main video, as well as including several platform launcher projects that demonstrate how to sideload the reference application to various devices.

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
