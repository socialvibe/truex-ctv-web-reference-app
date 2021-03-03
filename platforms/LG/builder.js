const utils = require('../../tasks/utils');
const path = require("path");

module.exports = {
    build: build,
    install: install
};

const projectDir = path.resolve(__dirname, "../..");

const pkg = utils.readJSON(path.resolve(projectDir, "package.json"));

function build(serverUrl) {
    if (!serverUrl) serverUrl = utils.appUrl;

    const installerName = getInstallerName();
    console.log(`building ${installerName} for ${serverUrl}`);

    const launcherDir = path.resolve(__dirname, 'LauncherApp');

    utils.replacePatterns(path.resolve(launcherDir, "appinfo.json"), [
        {
            match: /"title": "[^"]+"/,
            replacement: '"title": "' + pkg.name + '"'
        },
        {
            match: /"version": "[^"]+"/,
            replacement: '"version": "' + pkg.version + '"'
        }
    ]);

    utils.replacePatterns(path.resolve(launcherDir, "index.html"), [{
        match: /var appUrl = [^;]+;/,
        replacement: `var appUrl = "${serverUrl}";`
    }]);

    // To build with a test page:
    // utils.copyFile(
    //     path.resolve(__dirname, "reported-issues/test-multiple-audio-tracks.html"),
    //     path.resolve(buildDir, "index.html")
    // );

    utils.mkDir(getInstallerDir());
    const installerFile = getInstallerFile();
    utils.spawn('ares-package', ['-o', launcherDir,  '-n', launcherDir]);
    const buildResult = path.resolve(launcherDir, `com.truex.ref-app_${pkg.version}_all.ipk`);
    utils.copyFile(buildResult, installerFile);
    console.log('created ' + installerFile);
}

function install(toIP) {
    if (!toIP) toIP = '192.168.1.89'; // correct to match your TV's actual IP
    const devices = utils.exec('ares-setup-device', '-l') || "";
    if (devices) {
        console.log(devices);
    }
    const deviceLine = devices.split('\n').find(line => line.indexOf(toIP) >= 0);
    const deviceName = deviceLine && deviceLine.split(/\s+/)[0];
    if (!deviceName) utils.fatalError('no tv found for ' + toIP);

    utils.spawn('ares-install', `-d ${deviceName} ${getInstallerFile()}`);
}

function getInstallerName() {
    return `${pkg.name}_lg-webos_${pkg.version}.ipk`;
}

function getInstallerDir() {
    return path.resolve(projectDir, 'installers');
}

function getInstallerFile() {
    return path.resolve(getInstallerDir(), getInstallerName());
}
