# Fire TV / Android TV Deployment

To run the reference app on the Fire TV, there are a few options.

## Amazon Web App Tester

The Amazon Web App Tester can be used readily to exercise an HTML web application on the Fire TV.

To run:
* Install and run the Amazon Web App Tester from the Amazon store on the Fire TV.
* Enter the url of either the [hosted version](https://ctv.truex.com/web/ref-app/master/index.html), or your locally running version (e.g. http://192.168.1.72:8080).

## Native Reference App Launcher

The ref app launcher is a native Android TV application that wraps a web view that displays the reference application HTML/JS code from the [main source tree](../../src). It is located in the [RefApp directory](./RefApp).

To run: 
* Open the project in Android Studio, and build and run it in the usual manner.
* You can choose to run on your attached Fire TV device, or in the emulator.
* Edit the `app_url` entry in `strings.xml` to change which url to load at runtime.
* Note the explicit overrides of `onBackPressed` and `onKeyDown` in `MainAcitvity`, so as to inject the back and menu remote control actions into the web view.

You can also build the app launcher via the command line, e.g.
* `npm run build-firetv` to refer to the standard [hosted version](https://ctv.truex.com/web/ref-app/master/index.html).
* `npm run build-firetv -- http://192.168.1.72:8080` to override the url.
* You will need to be using Java 11 to run the Android SDK gradle commands.

## History.back blocking

To reiterate again, the Fire TV / Android has back actions from the remote control fielded as `history.back() `actions. As such, custom `popstate` event handling will be required to allow your app to cooperate with true[X]'s own back action blocking needed to control a user's prematurely exiting from an ad.

In particular, on the Fire TV, the back action key event cannot be reliably overridden, and one must process `history.back()` actions instead via the `popstate` event handler.

The key problem comes about since the popstate event cannot be blocked, so app developers must instead follow a practice whereby they only field back actions that are applicable only to their own application code. Please refer to this code in `main.js` for an such approach, noting in particular the `onBackAction`, `pushBackActionBlock` and `pushBackActionStub` methods. In particular, note how the host app recognized its own history state changes vs true[X]'s.
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
