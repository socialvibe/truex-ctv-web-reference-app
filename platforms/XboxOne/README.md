# RefApp on Xbox One (via UWP)

## Developer Program (ID@Xbox)
### Site
https://www.xbox.com/en-US/developers/id

### Account
Awaiting approval.

## Developer Program (Creators Program)
### Site 
https://www.xbox.com/en-US/developers/creators-program

### Account
One can create a personal account

## Interact with the App
### Open a new url
1. Get the IP address of the Xbox One
1. Launch the RefApp App on XboxOne
1. From terminal, type `echo "http://EXAMPLE.COM" | nc -w 1 XBOX.ONE.IP.ADDRESS 8085`
1. RefApp Xbox One should reload with the new address

## Running this project
### On UWP simulator
1. Install Visual Studio
1. Clone and open this project
1. Just click the Run button
* Note, UWP simulator simulator a Windows Eviornment, the UWP Apps works differently on Xbox One (navigation, margin, font, etc...)

### On Dev Xbox One
1. Install Visual Studio
1. Turn Xbox One into Dev mode and connect to the Lan (Wifi does not seem to work?)
1. Add a Xbox Account and login (UWP app needed to be signed in to run)
1. Clone and open this project
1. In Visual Studio, right click the project under the "Solution Explorer" pannel on the right
1. Click Properties, then go to the "Debug" tab on the left
1. Select "Remote Machine" under Target device
1. Type the IP address into the "Remote machine" box, or use the "Find..." button to find the dev Xbox One
1. Change Platform to x64
1. Click F5 or the Green run button

* For people in Seattle, we have the shared Windows machine set up, you can just use that

### Slide Loading the app
1. Turn Xbox One into Dev mode
1. Add a Xbox Account and login (UWP app needed to be signed in to run)
1. Turn on Remote Access by going to Remote Access Settings, and ensure the "[√] Enable Xbox Device Portal" is checked
![Screenshot_2020-02-26_16-01-07](https://user-images.githubusercontent.com/36866533/75399968-a4c4b800-58b2-11ea-90cb-aab98eec98ea.png)
1. Set a username and password under Authentication
![Screenshot_2020-02-26_16-13-23](https://user-images.githubusercontent.com/36866533/75400076-fec57d80-58b2-11ea-947d-37e9d6cc5b46.png)
1. From your PC, goes to the address mention in your xbox. Note: it is `https://` not `http://`
1. You will need to trust the cert and click "continue to the site (unsafe)"
1. In this website, click the [Add] button under Home > My games & apps
![Screenshot_2020-02-26_16-01-07](https://user-images.githubusercontent.com/36866533/75400554-76e07300-58b4-11ea-8221-d2fb793eabf1.png)
1. Choose the `.msixbundle` file under your project folder
1. Click next, and next
1. One should be able to see the app on their Xbox

## Build
### Packaging the app via VS
1. Follow this guild
https://docs.microsoft.com/en-us/windows/msix/package/packaging-uwp-apps#generate-an-app-package
* The self signed cert's username/password is truex/_the office wifi password_

### Packaging the app via build script
1. Ensure VS and MSBuild is installed and the XboxOne builder points to the developers MSBuild
2. Run build script `npm run build-xboxone`

## Tools
### IDE
Visual Studio (Windows)
https://visualstudio.microsoft.com/
* Sadly no Mac version, or Visual Studio Code would not work here.
* One will need to enable Developer Mode on your Windows PC, under: Settings > Update & Security > For developers > Use developer features > Developer mode.

### Xbox One (Dev Mode)
Just download the "Dev Mode Activation" tool from the Xbox One Store, and following the instructions.
https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/devkit-activation

### Web Inspector
Windows only, via the Microsoft Edge DevTools Preview app
https://docs.microsoft.com/en-us/windows/communitytoolkit/controls/wpf-winforms/webview#how-do-i-debug-webviewcontrol

## Code and References
### Xbox best practices (navigation, zoom, etc...)
https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/tailoring-for-xbox

### TVHelpers (DirectionalNavigation/MediaPlayer/...)
https://github.com/Microsoft/TVHelpers

https://github.com/Microsoft/TVHelpers/wiki

### Code Sample
https://github.com/microsoft/Windows-universal-samples/tree/master/Samples/XamlWebView

https://docs.microsoft.com/en-us/windows/uwp/xbox-apps/samples

https://github.com/Microsoft/xbox-live-samples

### Web View
https://docs.microsoft.com/en-us/windows/uwp/design/controls-and-patterns/web-view

### Designing for TV
https://docs.microsoft.com/en-us/windows/uwp/design/devices/designing-for-tv
