const utils = require('../../tasks/utils');
const path = require("path");

module.exports = {
    "build-hosted": serverUrl => build(serverUrl, true),
    "build-local": serverUrl => build(serverUrl, false),
    install: install
};

const projectDir = path.resolve(__dirname, "../..");

const pkg = utils.readJSON(path.resolve(projectDir, "package.json"));

function build(serverUrl, useHostedApp = true) {
    if (!serverUrl) serverUrl = utils.appUrl;

    const installerName = getInstallerName();
    console.log(`building ${installerName} for ${serverUrl}`);

    var buildDir;
    if (useHostedApp) {
        // The installer will point to a hosted web app.
        buildDir = path.resolve(__dirname, 'build');
        utils.rmDir(buildDir);
        utils.mkDir(buildDir);
    } else {
        // The installer will have the web app included within it.
        buildDir = path.resolve(projectDir, 'dist');
        utils.ensureDir(buildDir); // ensure build is present.
    }

    // The allowed Tizen app name is a bit restrictive.
    const appName = pkg.name.replace(/[_-]/g, '');

    const appDir = path.resolve(__dirname, "LauncherApp");
    utils.copyFileToDir(path.resolve(appDir, "config.xml"), buildDir);
    utils.copyFileToDir(path.resolve(appDir, "icon.png"), buildDir);

    utils.replacePatterns(path.resolve(buildDir, "config.xml"), [
        {
            match: /(<tizen:application id="[^.]+\.)[^"]+"/,
            replacement: '$1' + appName + '"'
        },
        {
            match: /<name>.*<\/name>/,
            replacement: '<name>' + appName + '</name>'
        },
        {
            match: /(<widget.*) version="[^"]+"/,
            replacement: '$1 version="' + pkg.version + '"'
        }
    ]);

    if (useHostedApp) {
        // Put in the page that loads the web app in an iframe.
        utils.copyFileToDir(path.resolve(appDir, "index.html"), buildDir);

        utils.replacePatterns(path.resolve(buildDir, "index.html"), [
            {
                match: /<title>.*<\/title>/,
                replacement: '<title>' + pkg.name + '</title>'
            },
            {
                match: /<iframe.*><\/iframe>/,
                replacement: `<iframe src="${serverUrl}"></iframe>`
            }
        ]);
    }

    // To build with a test page:
    // utils.copyFile(
    //     path.resolve(__dirname, "reported-issues/test-multiple-audio-tracks.html"),
    //     path.resolve(buildDir, "index.html")
    // );

    // Build the app installer via the tizen CLI.
    // Establish the security profile to allow side loading.
    const tizenCmd = getTizenCmd();
    const profilesPath = process.env.HOME + "/tizen-studio-data/profile/profiles.xml";
    // Ensure we can sign with the security profile.
    utils.spawn(tizenCmd, "cli-config profiles.path=" + profilesPath);
    utils.spawn(tizenCmd, "security-profiles add -n devprofile -a author.p12 -p password", __dirname);

    utils.mkDir(getInstallerDir());
    const installerFile = getInstallerFile();
    utils.spawn(tizenCmd, "package -t wgt -s devprofile -- " + buildDir);
    const buildResult = path.resolve(buildDir, appName + '.wgt');
    utils.copyFile(buildResult, installerFile);
    console.log('created ' + installerFile);
}

function install(toIP) {
    if (!toIP) toIP = '192.168.1.85'; // correct to match your TV's actual IP
    const sdb = process.env.HOME + "/tizen-studio/tools/sdb";
    utils.spawn(sdb, ['connect', toIP]);
    const devices = utils.exec(sdb, 'devices') || "";
    if (devices) {
        console.log(devices);
    }
    const deviceLine = devices.split('\n').find(line => line.startsWith(toIP));
    const deviceTarget = deviceLine && deviceLine.split(/\s+/)[2];
    if (!deviceTarget) utils.fatalError('no target found for ' + toIP);
    const tizenCmd = getTizenCmd();
    utils.spawn(tizenCmd, `install -t ${deviceTarget} -n ${getInstallerFile()}`);
}

function getTizenCmd() {
    return process.env.HOME + "/tizen-studio/tools/ide/bin/tizen";
}

function getInstallerName() {
    return `${pkg.name}_tizen_${pkg.version}.wgt`;
}

function getInstallerDir() {
    return path.resolve(projectDir, 'installers');
}

function getInstallerFile() {
    return path.resolve(getInstallerDir(), getInstallerName());
}
