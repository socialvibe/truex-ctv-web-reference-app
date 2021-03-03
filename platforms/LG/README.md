# LG WebOS Deployment  

## Running this project
1. Clone this repo
1. To test on the TV, the .ipk file needs to be installed the first time.
   - ensure the WebOS SDK is installed from [WebOS SDK](http://webostv.developer.lge.com/sdk/download/download-sdk/)
   - ensure your `PATH` env var includes the path to the SDK CLI bin
   - e.g. on the Mac it would typically be: `/opt/webOS_TV_SDK/CLI/bin`
1. Build the project via either `npm run build-lg`
   * Creates an .wgt installer that refers to the hosted web app at `https://ctv.truex.com/web/ref-app/master/index.html`
1. Set up TV (See Developer Mode)
   - follow the instructions at [LG WebOS App Testing](http://webostv.developer.lge.com/develop/app-test/) to install set developer mode and securely install the app
   - basically, you install and run the "developer mode" app, sign in with your LG developer account, enable dev mode
   - use the ares-setup-device, ares-novacom to define a secure link to the TV
   - use the ares-install commands to load the app .ipk onto the TV
   - e.g. `ares-install -d my-lg-tv installers/TruexRefApp_lg-webos_1.1.1.ipk`
1. Install via `npm run install-lg`. Either pass in your TV's IP, or edit the default IP in [build.js](./builder.js) as appropriate. E.g.
   * `npm run install-lg 192.168.1.85`
1. You should see the Truex ref app on the app menu bar.

## To Debug:
TODO

## Developer Program
### Site
http://webostv.developer.lge.com/login

### Account 
Username: connected@truex.com
Password: [under Shared-Ad Labs folder] 
* Note: only one device (simultaneously) an account can be used to turn on the dev mode. The older devices get logout.

### Seller Site
https://seller.lgappstv.com/seller/secure/loginout/login.lge

## Developer Mode
http://webostv.developer.lge.com/develop/app-test/
1. Create an account for your device, one account per device
1. install the Developer App from the LG TV store (on TV)
1. Sign-in to the TV Developer App with the Developer Account (not seller account)
1. Click turn on and wait for the restart

## Tools
### IDE Installation
http://webostv.developer.lge.com/sdk/installation/

## Code and References
### Build Your First App for webOS TV
http://webostv.developer.lge.com/develop/building-your-first-web-app-webos-tv/

### Basic HTML App
http://webostv.developer.lge.com/develop/code-samples/basic-html-app/

### Hosted Web App
http://webostv.developer.lge.com/develop/app-developer-guide/hosted-web-app/

## Running this project
1. Install the IDE
1. Then follow "App Testing" to enable developer mode and add your device
http://webostv.developer.lge.com/develop/app-test/ 
1. Finally follow this to launch run app on TV
http://webostv.developer.lge.com/sdk/tools/ide/launching-your-app/#launchWebapp
