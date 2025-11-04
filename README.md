# Overview

For an initial introduction on how to integrate the true[X] SDK into a web application, please refer to the [Getting Started](./GETTING_STARTED.md) guide.

This project contains sample source code that demonstrates example integrations of Infillion's CTV Web ad renderer. It provides two complete reference implementations:

* **SSAI Example** (`index.html`) - Server-Side Ad Insertion where ads are stitched into the video stream. Demonstrates TrueX ad integration.
* **CSAI Example** (`index-csai.html`) - Client-Side Ad Insertion where ads play separately from the main video. Demonstrates both TrueX and IDVx ad integration.

**Infillion interactive ads** include:
* **TrueX ads** - Interactive choice card experiences that allow users to skip an entire ad break by engaging with branded content
* **IDVx ads** - Interactive ads that start automatically and play inline with other ads in the break

For a more detailed integration guide, please refer to the [CTV Web Integration documentation](https://github.com/socialvibe/truex-ctv-web-integration) on github.com.

# Implementation Details

This project provides two distinct reference implementations demonstrating different ad insertion approaches:

## SSAI Implementation (Server-Side Ad Insertion)

The SSAI example (`index.html`, `main-ssai.js`) demonstrates integration where ads are stitched into the video stream by the server. The implementation is in `src/components/ssai/`.

In SSAI, ad playlist configuration is maintained in `data/video-streams-ssai.json` as part of the `vmap` key. Key fields in the data file:
* `timeOffset`: the content video time where the ad break occurs (e.g., "00:08:05" for 8 minutes 5 seconds in)
* `videoAdDuration`: the length of the ad fallback video stitched into the main video
* `vastUrl`: the VAST config URL used to query Infillion interactive ad configurations

The SSAI `VideoController` (from `components/ssai/video-controller.js`) calculates `startTime` and `endTime` for each ad break based on the `timeOffset` and all prior ad durations, since ads are stitched into the timeline. It must adjust video times to account for this stitching, calculating "playing video time" by subtracting ad durations from the raw video position.

## CSAI Implementation (Client-Side Ad Insertion)

The CSAI example (`index-csai.html`, `main-csai.js`) demonstrates integration where ads are managed separately from the main video stream. The implementation is in `src/components/csai/`.

In CSAI, ad playlist configuration is maintained in `data/video-streams-csai.json`. Key CSAI-specific fields:
* `timeOffset`: the content video time when the ad break should trigger (e.g., "00:00:10" for 10 seconds in)
* `description`: for TrueX ads, contains the VAST config URL
* `adParameters`: for IDVx ads, contains JSON configuration
* `mediaFile`: URL for standard video ad fallback

In CSAI, the main video pauses when an ad break's `timeOffset` is reached, ads play separately, and the main video resumes from the exact pause point. No time adjustments are needed since ads aren't stitched into the timeline.

## Infillion Interactive Ads

The CSAI implementation demonstrates both types of Infillion interactive ads:

### TrueX Ads
TrueX ads present an **interactive choice card** where users can **opt-in** to engage with branded content. The user makes an active choice to interact with the ad. If the user completes the interaction, they earn an **ad credit that skips the entire ad break**, and the main video resumes immediately. If the user opts out or ignores the choice card, standard fallback ads play instead.

**Key characteristics:**
- **Opt-in via choice card** - User must actively choose to engage
- **Skips entire ad break** - Successful engagement bypasses all remaining ads in the pod
- **Configuration**: Uses the `description` field containing a VAST config URL (e.g., `get.truex.com/...`)

### IDVx Ads
IDVx ads are **interactive ads** that start **automatically without requiring opt-in**. Unlike TrueX ads which require users to opt-in via a choice card, IDVx ads begin playing automatically. While no opt-in is required to start, users can interact with the ad content throughout its duration. IDVx ads **play inline with other ads** in the ad break. After an IDVx ad completes, the next ad in the sequence plays.

**Key characteristics:**
- **Automatic start** - No opt-in required, begins playing automatically
- **Interactive throughout** - Users can interact with ad content for its duration
- **Plays inline** - Completes and continues to next ad in the pod
- **Configuration**: Uses the `adParameters` field containing JSON configuration

## Common Flow

Both implementations follow a similar pattern for TrueX ad integration:

1. Video stream objects are given to the `startVideo` method of the `VideoController` instance
2. The `setAdPlaylist` method creates an array of `AdBreak` instances from the vmap configuration
3. When an ad break is triggered, an `InteractiveAd` instance (from `interactive-ad.js`) is created
4. The interactive ad creates a `TruexAdRenderer` instance to overlay the choice card and engagement experience
5. The `handleAdEvent` method tracks ad state changes and whether the viewer earned an ad credit

The key difference between SSAI and CSAI is that SSAI requires time offset calculations since ads are stitched into the timeline, while CSAI simply pauses/resumes the main video at the ad break `timeOffset`.

**Note**: The CSAI implementation also demonstrates IDVx ad integration using the `adParameters` field, showing how multiple ad types can be sequenced in a single ad pod.

# Build/Develop/Deploy

To begin development, run the standard `npm install` to download the project's dependencies.

To deploy in general, one makes a deployable version in the `./dist` folder via `npm run build` and then hosts those contents somewhere appropriate. One then ensures the various platform installer configurations refer to that URL.

The hosted copy of this reference app is currently available at:
* SSAI: [https://ctv.truex.com/web/ref-app/master/index.html](https://ctv.truex.com/web/ref-app/master/index.html)

This can be viewed directly in Chrome to review and debug the reference app generically.

To run a local build, run the `npm start` command to run a local webpack instance. You can then access:
* SSAI demo: `http://localhost:8080` or `http://0.0.0.0:8080`
* CSAI demo: `http://localhost:8080/index-csai.html` or `http://0.0.0.0:8080/index-csai.html`

For platform deployments using your local build, you will need to refer to your PC's IP address as the launcher url, e.g. `http://192.168.1.72:8080`, using instead your real IP on the local Wifi network, of course.

## Platform Deployments

The instructions for deploy to specific device platforms are available in the platform specific READMEs under the `./platforms` directory:
* [Fire TV / Android TV](platforms/AndroidFireTV/README.md)
* [Vizio](./platforms/Vizio/README.md)
* [LG](./platforms/LG/README.md)
* [Tizen](./platforms/Tizen/README.md)
* [PS4](./platforms/PS4/README.md)
* [PS5](./platforms/PS5/README.md)
* [XboxOne](./platforms/XboxOne/README.md)

## History.back blocking

If you choose to field and process history.back() actions, custom `popstate` event handling will be required to allow your app to cooperate with true[X]'s own back action blocking needed to control a user's prematurely exiting from an ad.

In particular, on the Fire TV, the back action key event cannot be reliably overridden, and one must process `history.back()` actions instead via the `popstate` event handler.

The key problem comes about since the popstate event cannot be blocked, so app developers must instead follow a practice whereby they only field back actions that are applicable only to their own application code. Please refer to this code in `main-ssai.js` or `main-csai.js` for such an approach, noting in particular the `onBackAction`, `pushBackActionBlock` and `pushBackActionStub` methods. In particular, note how the host app recognizes its own history state changes vs true[X]'s.
```
window.addEventListener("popstate", onBackAction);

function onBackAction(event) {
    // Since the true[X] ad renderer also needs to field this event, we need to ignore when the user
    // backs out of the ad overlay.
    //
    // We do this by only recognizing a back action to this app's specific state.
    const state = event && event.state;
    const isForThisApp = state && state.app == config.name && state.isBlock;
    if (!isForThisApp) return; // let the back action proceed, most likely from ad overlay processing.

    pushBackActionStub(); // ensure the next back action for this app is blocked.

    returnToParentPage();
}
```

# Usage

Both the SSAI (`http://localhost:8080`) and CSAI (`http://localhost:8080/index-csai.html`) examples support the following controls:

* Select "4", Menu on the remote, or click left stick on the controller to show the in-app console/debug log. Back action dismisses it again.
* To aid in QA/Review, select "2" on the remote, or click the right stick on the controller to skip the current ad break.
