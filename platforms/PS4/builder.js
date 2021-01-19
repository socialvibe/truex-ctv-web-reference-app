const utils = require('../../tasks/utils');
const path = require("path");
const propertiesReader = require("properties-reader");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

const ps4_pkg_gen_location = "C:/PS4/pkg_generator_ps4";

function build(serverUrl) {
    if (!serverUrl) serverUrl = utils.appUrl;

    const destPkgName = `${pkg.name}_ps4_${pkg.version}.pkg`;
    console.log(`building ${destPkgName} for ${serverUrl}`);

    if (process.platform != "win32") {
        utils.fatalError("PS4 builds can only be done on a Windows 10 machine.");
    }

    const launcherDir = path.resolve(__dirname, "launcher-app");

    const webMafSettings = path.resolve(launcherDir, "webmaf_settings.ini");
    utils.replacePatterns(webMafSettings, [
        {
            // Update the url to the hosted web server
            match: /ServiceStartUri=.*/,
            replacement: "ServiceStartUri=" + serverUrl
        },
    ]);

    const appConfig = path.resolve(launcherDir, "app.config");

    const properties = propertiesReader(appConfig);
    const serviceContentId = properties.getRaw("SERVICE_CONTENT_ID");
    const servicePackageVersion = properties.getRaw("SERVICE_PKG_VERSION");
    const srcPkgPath = path.resolve(serviceContentId, servicePackageVersion, serviceContentId + ".pkg");

    utils.spawn(path.resolve(ps4_pkg_gen_location, "create_pkg.bat"), [appConfig]);
    const installersDir = path.resolve(__dirname, '../../installers');
    const destPkgPath = path.resolve(installersDir, destPkgName);
    utils.mkDir(installersDir);
    utils.copyFile(srcPkgPath, destPkgPath);
    console.log(`created ${destPkgPath}`);
}
