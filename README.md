# Overview

For an initial introduction on how to integrate the true[X] SDK into a web application, please refer to the [Getting Started](./GETTING_STARTED.md) guide.

This project contains sample source code that demonstrates an example integration of true[X]'s CTV Web ad renderer. This further exemplifies the needed logic to manage true[X] opt-in flows (choice cards) as 
fully stitched into the video stream. 

For a more detailed integration guide, please refer to the [CTV Web Integration documentation](https://github.com/socialvibe/truex-ctv-web-integration) on github.com.

# Implementation Details

In this project we simulate the integration with a live Ad Server (CSAI use case) or SSAI provider through a mock ad playlist configuration. This is meant to capture the stream's ad pods, including their duration and the reference to the true[X] payloads in each pod. This configuration is maintained in `data/video-streams.json` as part of the `vmap` key. This is a simplified representation of what would otherwise come through a provider-dependent XML or JSON syntax, but should be sufficient to exemplify the flow. The main video stream location itself is maintained in the `url` value.

In this sample application, two ad breaks are defined, `preroll` and `midroll-1`. Key fields are:
* `timeOffset`: the main video time the ad starts at. Note that ads are stiched in to the main video, so the true video time consists of the main video plus all of the ad video durations.
* `videoAdDuration`: the length of the ad fallback video contained in the main video
* `vastUrl`: the VAST config url used to query the true[X] interactive ad description

In order to start playing a video, video stream objects are given to the `startVideo` method of the app's `VideoController` instance (from `video-controller.js`). In the `setAdPlaylist` method, the vmap array is used to create an array of `AdBreak` instances, stored in the video controller's `adPlaylist` field.

When video playback encounters the ad break's start time offset in `onVideoTimeUpdate`, a new `InteractiveAd` instance (from `interactive-ad.js`) is created with the ad break description. Upon calling the interactive ad's `start` method, a `TruexAdRenderer` instance (i.e. `tar`) is created to render and overlay the choice card and ultimately the engagement ad over top of the playback page. If the user skips the interaction, the ad fallback video is played instead, or else the main video is cancelled entirely if the user backs out of the ad completely.

The `tar` integration flow is described in the `start` method, with the key responsibilities for the host application developer being showing the the `handleAdEvent` method, which fields ad events to track the state of ad changes, until the ad is ultimately completed or cancelled, tracking in particular whether the viewer interacted enough with the ad to earn a free pod skip to continue with the main video, or else fallback to playing the ad videos instead.

# Build/Develop/Deploy

To begin development, run the standard `npm install` to bring download a the project dependencies.

To deploy in general, one makes a deployable version in the `./dist` folder via `npm run build` and then hosts those contents somewhere appropriate. On then ensures the various platform installer configurations refer to that url.

The hosted copy of this reference app is currently hosted [here](https://ctv.truex.com/web/ref-app/master/index.html), which can be viewed directly in Chrome to review and debug the reference app generically.

To run a local build, run the `npm start` command to run a local webpack instance. You can use `http://localhost:8080` or `http://0.0.0.0:8080` to review and debug in Chrome.

For platform deployments using your local build, you will need to refer to your PC's IP address as the launcher url, e.g. `http://1912.168.1.72:8080`, using instead your real IP on the local Wifi network, of course. 

## Platform Deployments

The instructions for deploy to specific device platforms are available in the platform specific READMEs under the `./platforms` directory:
* [Fire TV / Android TV](./platforms/FireTV/README.md)
* [Vizio](./platforms/Vizio/README.md)
* [LG](./platforms/LG/README.md)
* [Tizen](./platforms/Tizen/README.md)
* [PS4](./platforms/PS4/README.md)
* [XboxOne](./platforms/XboxOne/README.md)

## History.back blocking

If you choose to field and process history.back() actions, custom `popstate` event handling will be required to allow your app
to cooperate with true[X]'s own back action blocking needed to control a user's prematurely exiting from an ad.

In particular, on the Fire TV, the back action key event cannot be reliably overridden, and one must 
process `history.back()` actions instead via the `popstate` event handler.

The key problem comes about since the popstate event cannot be blocked, so app developers must instead follow a practice 
whereby the only field back actions that are applicable only to their own application code. Please refer to this 
code in `main.js` for an such approach, noting in particular the `onBackAction`, `pushBackActionBlock` 
and `pushBackActionStub` methods.
```
window.addEventListener("popstate", onBackAction);
```

# Usage

* Select "4", Menu on the remote, or click left stick the controller to show the in app console/debug log. Back action dismisses it again.
* To aid in QA/Review, select "2" on the remote, or click the right stick on the controller to skip to the end of a playing ad fallback video.
