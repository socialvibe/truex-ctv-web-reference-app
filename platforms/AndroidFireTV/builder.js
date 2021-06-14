const utils = require('../../tasks/utils');
const path = require("path");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

const ANDROID_TV = 'androidtv';
const FIRE_TV = 'firetv';

function build(platform, serverUrl) {
    if (!platform) platform = ANDROID_TV;
    if (!serverUrl) serverUrl = utils.appUrl;

    const installerName = `${pkg.name}_${platform}_${pkg.version}.apk`;
    console.log(`building ${installerName} for ${serverUrl}`);

    const appDir = getAppDir();

    const stringsFile = path.resolve(appDir, "app/src/main/res/values/strings.xml");
    utils.replacePatterns(stringsFile, [
        {
            // Update the url to the hosted web server
            match: /(<string name="app_url">).*</,
            replacement: "$1" + serverUrl + "<"
        },
    ]);

    const buildApk = path.resolve(appDir, "app/build/outputs/apk/debug/app-debug.apk");

    const gradlew = process.platform == "win32" ? ".\\gradlew.bat" : "./gradlew";
    utils.spawn(gradlew, ['clean', 'build'], getAppDir());

    const installersDir = path.resolve(__dirname, '../../installers');
    utils.mkDir(installersDir);

    const installerFilePath = path.resolve(installersDir, installerName);
    utils.copyFile(buildApk, installerFilePath);
    console.log(`created ${installerFilePath}`);
}

function getAppDir() {
    return path.resolve(__dirname, "RefApp");
}
