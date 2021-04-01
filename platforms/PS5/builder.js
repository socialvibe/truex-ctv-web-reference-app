const utils = require('../../tasks/utils');
const path = require("path");
const propertiesReader = require("properties-reader");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

const prospero_pub_cmd = "C:/Program Files (x86)/SCE/Prospero/Tools/Publishing Tools/bin/prospero-pub-cmd.exe";

function build(env, serverUrl) {
	// Default to a QA build using skyline.truex.com
    if (!env) env = 'qa';
    if (!serverUrl) serverUrl = utils.appUrl;

    const installerName = `${pkg.name}_ps5_${env}_${pkg.version}.pkg`;
    console.log(`building ${installerName} for ${serverUrl}`);

    if (process.platform != "win32") {
        utils.fatalError("PS5 builds can only be done on a Windows 10 machine.");
    }

    const launcherDir = path.resolve(__dirname, "launcher-app");

    const paramJson = path.resolve(launcherDir, "sce_sys/param.json");
    utils.replacePatterns(paramJson, [
        {
            // Update the app name
            match: /"titleName": "[^"]+"/,
            replacement: '"titleName": "' + pkg.name + '"'
        },
        {
            // Update the url to the hosted web server
            match: /"webAppUri": "[^"]+"/,
            replacement: '"webAppUri": "' + serverUrl + '"'
        }
    ]);

    utils.spawn(prospero_pub_cmd, "img_create package.gp5 package.pkg", launcherDir);

	// Uncomment to get a full report of any packaging problems:
    //utils.spawn(prospero_pub_cmd, "img_verify --passcode 7TS1PCMyWTqJXOkv93nHkf8IkNJ2Z7fP package.pkg", launcherDir);

	const srcPkgPath = path.resolve(launcherDir, 'package.pkg');
    const installersDir = path.resolve(__dirname, '../../installers');
    const installerFilePath = path.resolve(installersDir, installerName);
    utils.mkDir(installersDir);
    utils.copyFile(srcPkgPath, installerFilePath);
    utils.rmFile(srcPkgPath);
    console.log(`created ${installerFilePath}`);
}
