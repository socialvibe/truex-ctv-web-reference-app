"use strict";

const fs = require('fs');
const path = require("path");
const child_process = require('child_process');
const AdmZip = require('adm-zip');

/**
 * Presents helpful build time utility functions.
 */
module.exports = {
    appUrl: "https://ctv.truex.com/web/ref-app/master/index.html",

    fatalError: fatalError,

    getEnv: getEnv,

    ensureVersion: ensureVersion,

    isFile: isFile,
    ensureFile: ensureFile,

    isDir: isDir,
    ensureDir: ensureDir,

    readJSON: readJSON,
    writeJSON: writeJSON,

    readFile: readFile,
    writeFile: writeFile,
    generateFile: generateFile,

    copyFile: copyFile,
    copyFileToDir: copyFileToDir,
    copyDir: copyDir,
    
    zipFile: zipFile,
    zipDir: zipDir,

    mkDir: mkDir,

    rm: rm,
    rmFile: rmFile,
    rmDir: rmDir,

    replacePatterns: replacePatterns,

    spawn: spawn,
};

function ensureVersion(version, versionDigits) {
    var totalDigits = version.split(".");
    var newVersion = [];

    for(var i = 0; i < versionDigits; i++) {
        var number = '0';
        if (totalDigits[i]) {
            number = totalDigits[i];
        }

        newVersion.push(number);
    }

    return newVersion.join(".");
}

function fatalError(msg) {
    if (msg && msg.message) msg = msg.message; // Tolerate error objects as well.
    console.error("build error: " + msg);
    process.exit(1);
}

function getEnv(envName) {
    var value = process.env[envName];
    if (!value) fatalError("environment var not found: " + envName);
    return value;
}

function isFile(path) {
    return fs.existsSync(path) && fs.lstatSync(path).isFile();
}

function ensureFile(path) {
    if (isFile(path)) return path;
    fatalError("file not found:", path);
}

function isDir(path) {
    return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}

function ensureDir(dir) {
    if (isDir(dir)) return dir;
    fatalError("directory not found: " + dir);
}

function readFile(path) {
    ensureFile(path);
    return fs.readFileSync(path, "utf8");
}

function readJSON(path) {
    return JSON.parse(readFile(path));
}

function writeJSON(path, data) {
    writeFile(path, JSON.stringify(data, null, 2));
}

function generateFile(path, content) {
    console.info("generating", path);
    writeFile(path, content);
}

function writeFile(path, content) {
    fs.writeFileSync(path, content);
}

function copyFile(srcPath, dstPath) {
    if (isFile(srcPath)) fs.copyFileSync(srcPath, dstPath);
}

function copyFileToDir(srcPath, dstDir) {
    var lastSlash = srcPath.lastIndexOf("/");
    var srcFileName = lastSlash >= 0 ? srcPath.substring(lastSlash + 1, srcPath.length) : srcPath;
    copyFile(srcPath, dstDir + "/" + srcFileName);
}

function copyDir(srcPath, dstPath) {
    if (isDir(srcPath)) fs.copySync(srcPath, dstPath);
}

function zipDir(srcPath, dstPath) {
    if (isDir(srcPath)) {
        var zip = new AdmZip();
        zip.addLocalFolder(srcPath);
        zip.writeZip(dstPath);
    } else {
        fatalError("directory not found: " + srcPath);
    }
}

function zipFile(srcPath, dstPath) {
    if (isFile(srcPath)) {
        var zip = new AdmZip();
        zip.addLocalFile(srcPath);
        zip.writeZip(dstPath);
    } else {
        fatalError("file not found: " + srcPath);
    }
}

/**
 * Creates the specified directory.
 *
 * @param path directory to create
 * @param options.recursive if true creates any intermedia parent directories
 * @param options.mode defaults to 0x077, not applicable to Windows
 */
function mkDir(path, options) {
    if (!isDir(path)) {
        fs.mkdirSync(path, options);
    }
}

function rm(path) {
    if (isFile(path)) rmFile(path);
    else if (isDir(path)) rmDir(path);
}

function rmFile(path) {
    if (isFile(path)) fs.unlinkSync(path);
}

function rmDir(path) {
    if (isDir(path)) fs.rmdirSync(path);
}

function replacePatterns(path, patterns) {
    console.info("updating", path);
    var content = readFile(path);
    patterns.forEach(function(p) {content = content.replace(p.match, p.replacement)});
    writeFile(path, content);
}

function spawn(cmd, args, cwd, suppressCmdLog) {
    if (typeof args == "string") args = [args];
    if (!args) args = [];
    if (!suppressCmdLog) console.info(`spawning: ${cmd} ${args.join(' ') || ""}`);
    var options = {stdio: "inherit", stderr: "inherit"};
    if (cwd) options.cwd = cwd;
    var result = child_process.spawnSync(cmd, args, options);
    if (result.error) fatalError(result.error);
    if (result.status) fatalError("command failed: " + cmd);
}
