const utils = require('../../tasks/utils');
const path = require("path");

module.exports = {
    build: build
};

const pkg = utils.readJSON(path.resolve(__dirname, "../../package.json"));

function build(env, serverUrl) {
    if (!env) env = 'dev';
    if (!serverUrl) serverUrl = utils.appUrl;

    const destPkgName = `${pkg.name}_xboxone_${env}_${pkg.version}.pkg`;
    console.log(`building ${destPkgName}`);

    if (process.platform != "win32") {
        utils.fatalError("XboxOne builds can only be done on a Windows 10 machine.");
    }

    const windowsAppName = 'RefApp';
    const configDir = path.resolve('platforms/XboxOne', windowsAppName);
    const configPath = path.resolve(configDir, windowsAppName + ".csproj");
    const msBuildArgs = [configPath,
        "/p:Platform=x64",
        "/p:PlatformTarget=x64",
        "/p:AppxBundlePlatforms=x64",
        "/p:Configuration=Release",
        "/p:AppxBundle=Always",
        "/p:DebugType=pdbonly",
        "/p:DebugSymbols=false"];

    // Path to MSBuild may change developer to developer
    // const msBuildExe = path.resolve('C:/Program Files (x86)/Microsoft Visual Studio/2019/Professional/MSBuild/Current/Bin', 'MSBuild.exe');
    const msBuildExe = path.resolve('D:/Program Files (x86)/Microsoft Visual Studio/2019/Professional/MSBuild/Current/Bin', 'MSBuild.exe');
    
    utils.spawn(msBuildExe, msBuildArgs);
}