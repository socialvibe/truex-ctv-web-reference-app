const utils = require('../../tasks/utils');
const path = require("path");
const propertiesReader = require("properties-reader");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

function build(serverUrl) {
    if (!serverUrl) serverUrl = utils.appUrl;

    const distInstaller = `${pkg.name}_firetv_${pkg.version}.apk`;
    console.log(`building ${distInstaller}
  for ${serverUrl}`);

    const appDir = path.resolve(__dirname, "RefApp");

    const stringsFile = path.resolve(appDir, "app/src/main/res/values/strings.xml");
    utils.replacePatterns(stringsFile, [
        {
            // Update the url to the hosted web server
            match: /(<string name="app_url">).*</,
            replacement: "$1" + serverUrl + "<"
        },
    ]);

    const buildApk = path.resolve(appDir, "app/build/outputs/apk/debug/app-debug.apk");

    const gradlew = process.platform == "win32" ? "gradlew.bat" : "gradlew";
    utils.spawn(path.resolve(appDir, gradlew), ['build']);
    const distDir = path.resolve(__dirname, '../../dist');
    utils.mkDir(distDir);
    utils.copyFile(buildApk, path.resolve(distDir, distInstaller));
    console.log(`created ${distInstaller}`);
}
