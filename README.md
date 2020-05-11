# Overview

This project contains sample source code that demonstrates how to integrate true[X]'s CTV Web ad renderer. This further exemplifies the needed logic to manage true[X] opt-in flows (choice cards) as 
fully stitched into the video stream. 

For a more detailed integration guide, please refer to the []CTV Web Integration documentation](https://github.com/socialvibe/truex-ctv-web-integration) on github.com.

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

TODO, refer to platform folders for device specific deployment

# Usage

* Select "4", Menu on the remote, or click left stick the controller to show the in app console/debug log. Back action dismisses it again.
* To aid in QA/Review, select "2" on the remote, or click the right stick on the controller to skip to the end of a playing ad fallback video.