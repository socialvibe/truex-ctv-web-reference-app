# PS4 Deployment

Follow these steps to build the CTV reference application PS4 Launcher:

0. Setup the environment to create the installer:
    - ensure the latest PS4 SDK is installed using the [Playstation SDK manager](https://ps4.siedev.net/sdk-manager/download/)
    - ensure the WebMAF SDK is installed from [WebMAF SDK](https://video.scedev.net/projects/webmaf)
        - The install location needs to match the [builder.js script's](./builder.js) `ps4_pkg_gen_location` definition, which
          is currently defined as:
        ```javascript
          const ps4_pkg_gen_location = "C:/PS4/pkg_generator_ps4";    
        ```
1. Make a build as via: `npm run build-ps4`
    - This will make a qa .pkg installer to the `dist` folder that runs the app from `https://ctv.truex.com/web/ref-app/master/index.html`
        - e.g. `ctv_ref_app_ps4_1.0.2.pkg`
    - To customize which url to use, e.g. to point to your own laptop for development, you can do things like:
        - `npm run build-ps4 -- http://192.168.1.72:8080`
        - which will create a installer that points to the locally hosted url instead
    - copy the .pkg file to the root directory of a USB drive
    - take the USB drive and insert to your PlayStation
    - Select `Game > Install Package Files` from main screen and follow the instructions
    
2. To debug the the app running on the PS4, go to `http://<IP of device>:1900` in Chrome.
    - e.g. `http://192.168.1.82:1900`
