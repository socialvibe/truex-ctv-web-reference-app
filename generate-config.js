"use strict";

const fs = require('fs');
const pkg = require('./package.json');

module.exports = function(env) {
    let configPath = './src/config.js';
    console.log(`generating ${env} build: ${configPath}`);

    let config = {
        name: pkg.name,
        version: pkg.version,
        buildDate: new Date().toISOString().replace('T', ' ').replace(/\..+$/, '')
    };

    let content = `
// This file is auto generated from package.json
const c = ${JSON.stringify(config, null, 2)};

export const config = c;
export default config;\n`;
    fs.writeFileSync(configPath, content);

    return config;
};

