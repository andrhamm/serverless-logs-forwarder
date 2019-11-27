/* eslint-disable global-require */
// export { default as AWSXRay } from 'aws-xray-sdk';
// exports.AWSXRay.captureHTTPsGlobal(require('http'));
// exports.AWSXRay.captureHTTPsGlobal(require('https'));

import AWS from 'aws-sdk';
// const AWS = exports.AWSXRay.captureAWS(require('aws-sdk'));

export const cloudformation = new AWS.CloudFormation({ apiVersion: '2010-05-15', region: 'us-east-1' });
export const cloudWatchLogs = new AWS.CloudWatchLogs({ apiVersion: '2014-03-28' });
export const kms = new AWS.KMS({ apiVersion: '2014-11-01' });
export const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
// export const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
export const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
// export const http = exports.AWSXRay.captureHTTPs(require('http'));
// export const https = exports.AWSXRay.captureHTTPs(require('https'));
