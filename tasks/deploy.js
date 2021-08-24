#!/usr/bin/env node

require('truex-shared/src/deploy/promisify').polyfill();

const s3 = require('truex-shared/src/deploy/s3-upload');
const uploadDist = require('truex-shared/src/deploy/upload-dist');
const awsCloudFrontInvalidate = require("invalidate-cloudfront-edge-cache");

const deploy = () => {
    const bucket = "ctv.truex.com";
    const branch = process.env.TRAVIS_BRANCH;
    const prefix = 'web/ref-app/' + branch;

    const PR = process.env.TRAVIS_PULL_REQUEST;
    const isPR = PR != "false";
    const cloudFrontDistId = process.env.TRUEX_CLOUDFRONT_DISTRIBUTION_ID;

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
            console.log("invalidating cloudfront cache");
            const pathsToInvalidate = [`/${prefix}/index.html`];
            return awsCloudFrontInvalidate(cloudFrontDistId, pathsToInvalidate);
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