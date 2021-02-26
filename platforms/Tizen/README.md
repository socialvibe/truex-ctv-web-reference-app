# Samsung Tizen Deployment

## Running this project
1. Clone this repo
1. If hosting the web app in a non `truex.com` domain, you need to whitelist it with a new `<access>` entry in config.xml.
1. Install the IDE (See IDE Installation).
1. Build the project via either
   * `npm run build-tizen`
      * Creates a .wgt installer that refers to the hosted web app, by default 
        at `https://ctv.truex.com/web/ref-app/master/index.html`
   * `npm run build-tizen-local`
      * Creates a .wgt installer that has the skyline app embedded inside of it.
      * The means the tizen API is available to at least the choice card.
   * NOTE: Only the local build will allow access to all the remote key events, and the TIFA (see below).
     e.g. play/pause/FF/REW, 2 to skip ads, 4 to show the in-app console log.
     This is because the tizen API is needed to successfully register access to extra keystrokes beyond the
     standard ones of Enter / Return / Up / Down / Left / Right, and the tizen API is only available to web
     code that is included in the launcher itself.
1. Set up TV (See Turning on Dev Mode on Tizen TV)
1. Install via `npm run tizen-install`. Either pass in your TV's IP, or edit the default IP in [build.js](./builder.js) as appropriate. E.g.
   * `npm run install-tizen 192.168.1.85` 
1. On the TV's home menu bar, select the "Apps" button. The Skyline app should appear, select it to run.

## Tizen Identifier For Advertising (TIFA)
This reference app shows how to access the TIFA and pass it along to the true[X] interactive ad.
Search for 'platform.isTizen' in the [interactive-ad.js](../../src/components/interactive-ad.js) file to see how that is accessed.

Note also this script entry in [index.html](../../src/index.html) to access the Tizen webapi:
```html
  <!-- webapi for Tizen: -->
  <script src="$WEBAPIS/webapis/webapis.js"></script>
```

Note that querying the TIFA will only be permitted if one's web application has the `adinfo` privilege in their app's config.xml, e.g.
```
    <tizen:privilege name="http://developer.samsung.com/privilege/adinfo"/>
```

Refer to the TIFA documentation for details:
* [Tizen ID for Advertising](https://developer.samsung.com/smarttv/develop/guides/unique-identifiers-for-smarttv/tizen-id-for-advertising.html)
* [Adinfo API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/adinfo-api.html)
   
## To Debug:
1. Open the LauncherApp in Tizen Studio. Choose "Debug As", use the remote launch manager to ensure the connection to your TV.
1. Eventually a debug inspector window will open.
1. Most likely it will fail, with this error in the console:
    ```
    Uncaught TypeError: document.registerElement is not a function
    ```
    * This is due to the use of the latest version of Chrome not supporting the function.
    * To work around this, note the inspector address in the debug window, e.g.
    ```
    http://127.0.0.1:52960/devtools/inspector.html?ws=…/devtools/page/(2A2483283C3908B879D1E9A64A8D03C8)"
    ```
    * Open instead `chrome://inspect/#devices`, use `Configure`, add a local host entry with the same port as the link above, e.g. `localhost:52960`.
    * The Skyline remote target should now be present to inspect using the regular Chrome debugger via the Inspect link.  

## Tools
### IDE Installation
1. Refer to the [installation guide](https://docs.tizen.org/application/tizen-studio/setup/install-sdk). For this project it is enough to only install and use the [command line interface (CLI)](https://docs.tizen.org/application/tizen-studio/setup/install-sdk/#using-the-cli-installer). However, if you need to debug the full Tizen studio is required.

### Turning on Dev Mode on Tizen TV
1. Navigate the Samsung App Store. The device is already in dev mode if the title reads "APPS (DEVELOPER MODE)", else
1. With TV remote, click 12345
1. Toggle on the developer mode, and enter your workstation's IP address
1. Reboot TV

See: https://developer.samsung.com/tv/develop/getting-started/using-sdk/tv-device

## Code and References
### Tizen TV Dev Home Page
https://developer.tizen.org/tizen/tv

### Samsung TV Dev Home Page
https://developer.samsung.com/tv/develop/

### Code Sample
https://developer.tizen.org/development/sample/web
https://developer.samsung.com/tv/develop/samples/general
