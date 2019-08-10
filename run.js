#!/bin/env node
require('dotenv').config();
const fs = require('fs');
const { DataManagementClient, DesignAutomationClient,DataRetentionPolicy } = require('forge-server-utils');


const ACTIVITY_NAME = "ActivityUpdateParameters";
const ACTIVITY_DESCRIPTION = "Forge Design Automation For AutoCAD";
const ACTIVITY_ALIAS ="dev";

const INPUT_FILE_PATH = './drawing/AutoCADSample.dwg';
const INPUT_OBJECT_KEY = 'input.dwg';
const OUTPUT_OBJECT_KEY= 'output.dwg';

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET,FORGE_BUCKET } = process.env;
const dm = new DataManagementClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });
const da = new DesignAutomationClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });



function sleep(ms) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() { resolve(); }, ms);
    });
}

async function run() {
    // Create bucket if it doesn't exist
    const allBuckets = await dm.listBuckets();
    console.log(allBuckets);
     const matchingBuckets = allBuckets.filter(item => item.bucketKey === BUCKET);
    if (matchingBuckets.length === 0) {
        try {
            await dm.createBucket(FORGE_BUCKET, DataRetentionPolicy.Persistent);
        } catch(err) {
            console.error('Could not create bucket', err.stack);
            process.exit(1);
        }
    }

    // Upload Drawing file and create a placeholder for the output result drawing file
    const inputObjectBuff = fs.readFileSync(INPUT_FILE_PATH);
    try {
        await dm.uploadObject(BUCKET, INPUT_OBJECT_KEY, 'application/octet-stream', inputObjectBuff);
    } catch(err) {
        console.error('Could not upload input file', err);
        process.exit(1);
    }

    // Generate signed URLs for all input and output files
    let inputFileSignedUrl;
    let outputSignedUrl;
    try {
        inputFileSignedUrl = await dm.createSignedUrl(BUCKET, INPUT_OBJECT_KEY, 'read');
        outputSignedUrl = await dm.createSignedUrl(BUCKET, OUTPUT_OBJECT_KEY, 'readwrite');
    } catch(err) {
        console.error('Could not generate signed URLs', err);
        process.exit(1);
    }

    // Create work item and poll the results
    const activityId = FORGE_CLIENT_ID + '.' + ACTIVITY_NAME + '+' + ACTIVITY_ALIAS;
    const workitemInputs = [
        { name: 'inputFile', url: inputFileSignedUrl.signedUrl },
        { name: 'inputJson', url: "data:application/json,{\"Width\":\"40\",\"Height\":\"80\"}" }
    ];
    const workitemOutputs = [
        { name: 'outputFile', url: outputSignedUrl.signedUrl }
    ];
    let workitem;
    try {
        workitem = await da.createWorkItem(activityId, workitemInputs, workitemOutputs);
        console.log('Workitem', workitem);
        while (workitem.status === 'inprogress' || workitem.status === 'pending') {
            await sleep(5000);
            workitem = await da.workItemDetails(workitem.id);
            console.log(workitem.status);
        }
    } catch(err) {
        console.error('Could not run work item', err);
        process.exit(1);
    }

    console.log('Results', workitem);
    console.log('Result Drawing Url:', outputSignedUrl.signedUrl); 
}

run();
