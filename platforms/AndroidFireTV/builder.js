const utils = require('../../tasks/utils');
const path = require("path");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

function build(serverUrl) {
    if (!serverUrl) serverUrl = utils.appUrl;

    const installer = `${pkg.name}_firetv_${pkg.version}.apk`;
    console.log(`building ${installer} for ${serverUrl}`);

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
    utils.copyFile(buildApk, path.resolve(installersDir, installer));
    console.log(`created ${installer}`);
}

function getAppDir() {
    return path.resolve(__dirname, "RefApp");
}
