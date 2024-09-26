#!/usr/bin/env node

require('truex-shared/src/deploy/promisify').polyfill();

const s3 = require('truex-shared/src/deploy/s3-upload');
const uploadDist = require('truex-shared/src/deploy/upload-dist');
const { purgeFastlyService }  = require("truex-shared/src/deploy/purge-fastly-service");

const deploy = () => {
    const bucket = "ctv.truex.com";
    const branch = process.env.TRAVIS_BRANCH;
    const prefix = 'web/ref-app/' + branch;

    const PR = process.env.TRAVIS_PULL_REQUEST;
    const isPR = PR != "false";

    if (isPR) {
        // We only want to deploy on the final merges.
        console.log(`PR deploy skipped for ${bucket}/${prefix}`);
        process.exit(0);
    }

    console.log(`deploying to ${bucket}/${prefix}`);
    return s3.cleanFolder(bucket, prefix)
        .then(() => {
            return uploadDist(bucket, prefix);
        })
        .then(() => {
            // Purge the entire Fastly CDN service for robustness, it is ok performance-wise.
            // Fastly otherwise makes it difficult to purge related urls, e.g. .../someFile.js vs .../someFile.js?cb=460
            return purgeFastlyService(bucket, process.env.FASTLY_API_TOKEN);
        })
        .then(() => {
            console.log("deploy complete");
        })
        .catch((err) => {
            console.error(`deploy error: ${err}`);
            process.exit(1);
        });
};

deploy();
