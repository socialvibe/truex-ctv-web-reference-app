#!/usr/bin/env node

require('promisify').polyfill();

const logger = require('logger');
const s3 = require('s3-upload');
const uploadDist = require('promise-to-upload-dist');
const awsCloudFrontInvalidate = require("invalidate-cloudfront-edge-cache");

const deploy = () => {
    const log = logger.create('deploy');

    const bucket = "ctv.truex.com";
    const branch = process.env.TRAVIS_BRANCH;
    const prefix = 'web/ref-app-google-IMA/' + branch;

    const PR = process.env.TRAVIS_PULL_REQUEST;
    const isPR = PR != "false";
    const cloudFrontDistId = process.env.TRUEX_CLOUDFRONT_DISTRIBUTION_ID;

    if (isPR) {
        // We only want to deploy on the final merges.
        log(`PR deploy skipped for ${bucket}/${prefix}`);
        process.exit(0);
    }

    log(`deploying to ${bucket}/${prefix}`);
    return s3.cleanFolder(bucket, prefix)
        .then(() => {
            return uploadDist(bucket, prefix);
        })
        .then(() => {
            log("invalidating cloudfront cache");
            const pathsToInvalidate = [`/${prefix}/index.html`];
            return awsCloudFrontInvalidate(cloudFrontDistId, pathsToInvalidate);
        })
        .then(() => {
            log("deploy complete");
        })
        .catch((err) => {
            console.error(`deploy error: ${err}`);
            process.exit(1);
        });
};

deploy();