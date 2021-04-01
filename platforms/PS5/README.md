# PS5 Deployment

https://p.siedev.net

### PS5 Builds
Follow these steps to build the TruexRefApp PS5 Launcher:

0. Setup the environment to create the installer:
    - ensure the latest PS5 SDK is installed using the [Playstation SDK manager](https://p.siedev.net/sdk-manager/download/)
        - The build command location needs to match the [builder.js script's](./builder.js) `prospero_pub_cmd` definition, which
          is currently defined as:
        ```javascript
          const prospero_pub_cmd = "C:/Program Files (x86)/SCE/Prospero/Tools/Publishing Tools/bin/prospero-pub-cmd.exe";    
        ```
1. Make a build as via: `npm run build-PS5`
    - This will make a qa .pkg installer to the `installers` folder that runs the app from `https://ctv.truex.com/web/ref-app/master/index.html`
        - e.g. `TruexRefApp_ps5_qa_1.0.2.pkg`
    - To customize which url to use, e.g. to point to your own laptop for development, you can do things like:
        - `npm run build-ps5 -- dev http://192.168.0.110:8080`
        - which will create a installer called: `TruexRefApp_ps5_qa_1.0.2.pkg`
2. For testing on the PS5, one needs to install the .pkg file on the PS5.
    - copy the .pkg file to the root directory of a USB drive
    - take the USB drive and insert to your PlayStation
    - Select `Game > Install Package Files` from main screen and follow the instructions
    - You can also use the Target Manager application the comes with the SDK.
      Please refer to the relevant media kit documentation in particular the
      Media_SDK_Web_Launcher_Package_Creation-Overview_e.pdf document.
    
3. To debug the TruexRefApp running on the PS5, 
    - Run the Web Inspector
      - On your host PC, run the Web Inspector application. It can be installed from the SDK Manager. The
location of the Web Inspector is SCE/Prospero/Tools/WebInspector/MiniBrowser.exe.
    - Connect the Inspector
      - In the address bar of the Web Inspector change the IP address to the DEV LAN IP address of your DevKit, change the port to 866, and press Enter.
	  - e.g. inspector://<your target IP address>:866
	  - There should snow be a target in the Inspectable targets list.
