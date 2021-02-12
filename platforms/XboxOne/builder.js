const utils = require('../../tasks/utils');
const path = require("path");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

function build(env, serverUrl) {
    if (!env) env = 'dev';
    if (!serverUrl) serverUrl = utils.appUrl;

    const version = utils.ensureVersion(pkg.version, 4);

    const appName = `${pkg.name}_xboxone_${env}_${version}`;
    console.log(`building ${appName}`);

    if (process.platform != "win32") {
        utils.fatalError("XboxOne builds can only be done on a Windows 10 machine.");
    }

    const windowsAppName = 'RefApp';
    const configDir = path.resolve('platforms/XboxOne', windowsAppName);
    const configPath = path.resolve(configDir, windowsAppName + ".csproj");

    
    // Update the version for XboxOne
    const packageManifest = path.resolve(configDir, "Package.appxmanifest");
    utils.replacePatterns(packageManifest, [
        {
            match: /Version=".*/,
            replacement: 'Version="' + version + '" />'
        },
    ]);

    const propertiesDir = path.resolve(configDir, "Properties");

    const assemblyInfo = path.resolve(propertiesDir, "AssemblyInfo.cs");
    utils.replacePatterns(assemblyInfo, [
        {
            match: /\[assembly: AssemblyVersion.*/,
            replacement: '[assembly: AssemblyVersion("' + version + '")]'
        },
        {
            match: /\[assembly: AssemblyFileVersion.*/,
            replacement: '[assembly: AssemblyFileVersion("' + version + '")]'
        },
    ]);

    const msBuildArgs = [configPath,
        "/p:Platform=x64",
        "/p:PlatformTarget=x64",
        "/p:AppxBundlePlatforms=x64",
        "/p:Configuration=Release",
        "/p:AppxBundle=Always",
        "/p:DebugType=pdbonly",
        "/p:DebugSymbols=false"];

    const installersDir = path.resolve(__dirname, '../../installers');
    utils.mkDir(installersDir);

    // Path to MSBuild may change developer to developer
    const msBuildExe = path.resolve('C:/Program Files (x86)/Microsoft Visual Studio/2019/Professional/MSBuild/Current/Bin', 'MSBuild.exe');
    
    utils.spawn(msBuildExe, msBuildArgs);
    
    const appPackagesDir = path.resolve(configDir, "AppPackages");
    const bundleInstallersPath = path.resolve(installersDir, appName + ".zip");
    const bundleDirPath = path.resolve(appPackagesDir, `${windowsAppName}_${version}_Test`);
    const bundlePath = path.resolve(bundleDirPath, `${windowsAppName}_${version}_x64.msixbundle`);
    const installersFilePath = path.resolve(installersDir, `${appName}.msixbundle`);

    utils.copyFile(bundlePath, installersFilePath);

    // When building for submission, you will need everything in the folder not just the msixbundle
    // utils.zipDir(appPackagesDir, bundleDistPath);
}