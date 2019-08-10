// save and retrieve environment variables in dotenv

/**
 * Typical .env file:
FORGE_CLIENT_ID=forgeclientid
FORGE_CLIENT_SECRET=forgeclientsecret
FORGE_BUCKET=fpdtestbuckets
 */
require('dotenv').config();
const fs = require('fs');
const request = require('request');
const FormData = require('form-data');

const { DesignAutomationClient } = require('forge-server-utils');
const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET ,FORGE_BUCKET} = process.env;
const client = new DesignAutomationClient({ client_id: FORGE_CLIENT_ID, client_secret: FORGE_CLIENT_SECRET });

//valid bundle names : [a-z][A-Z][_]
const APPBUNDLE_NAME = "fdaupdateParams";
const APPBUNDLE_ALIAS = "dev";
const APPBUNDLE_ENGINE = "Autodesk.AutoCAD+23";
const APPBUNDLE_FILE = './bundles/updateDWGParam.zip';
const APPBUNDLE_DESCRIPTIION = "update Block Params";
const ACTIVITY_NAME = "ActivityUpdateParameters";
const ACTIVITY_DESCRIPTION = "Forge Design Automation For AutoCAD";
const ACTIVITY_ALIAS ="dev";

async function listAll() {
    try {
        let bundles = await client.listAppBundles();
        console.table(bundles);
        let engines = await client.listEngines();
        console.table(engines);
        let activities = await client.listActivities();
        console.table(activities);
    } catch (error) {
        console.error(error);
    }
}


//delete AppBundle:
async function deleteBundle() {
    try {
        let b = await client.deleteAppBundle(APPBUNDLE_NAME);
        console.log(b);
    } catch (error) {
        console.error(error);
    }
}

//Create App Bundle:

async function createBundle() {
    try {
        let bundleDetail = await client.createAppBundle(APPBUNDLE_NAME, APPBUNDLE_ENGINE, APPBUNDLE_DESCRIPTIION);
        console.log(bundleDetail);
        if (bundleDetail) {
            let bundleAlias = await client.createAppBundleAlias(APPBUNDLE_NAME, APPBUNDLE_ALIAS, 1);
            console.log(bundleAlias);
            request.post({
                url: bundleDetail.uploadParameters.endpointURL,
                formclientta: bundleDetail.uploadParameters.formclientta,
                formclientta: {
                    file: fs.createReadStream(APPBUNDLE_FILE)
                }
            }, function (err, response, body) {
                console.log(body);
            });

        }

    } catch (error) {

    }
}
/*createBundle();
deleteBundle();
listAll();*/

function uploadAppBundleFile(appBundle, appBundleFilename) {
    const uploadParameters = appBundle.uploadParameters.formData;
    const form = new FormData();
    form.append('key', uploadParameters['key']);
    form.append('policy', uploadParameters['policy']);
    form.append('content-type', uploadParameters['content-type']);
    form.append('success_action_status', uploadParameters['success_action_status']);
    form.append('success_action_redirect', uploadParameters['success_action_redirect']);
    form.append('x-amz-signature', uploadParameters['x-amz-signature']);
    form.append('x-amz-credential', uploadParameters['x-amz-credential']);
    form.append('x-amz-algorithm', uploadParameters['x-amz-algorithm']);
    form.append('x-amz-date', uploadParameters['x-amz-date']);
    form.append('x-amz-server-side-encryption', uploadParameters['x-amz-server-side-encryption']);
    form.append('x-amz-security-token', uploadParameters['x-amz-security-token']);
    form.append('file', fs.createReadStream(appBundleFilename));
    return new Promise(function(resolve, reject) {
        form.submit(appBundle.uploadParameters.endpointURL, function(err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

async function setup() {
    // Create or update an appbundle
    const allAppBundles = await client.listAppBundles();
    const matchingAppBundles = allAppBundles.filter(item => item.indexOf(APPBUNDLE_NAME) !== -1);
    let appBundle;
    try {
        if (matchingAppBundles.length === 0) {
            appBundle = await client.createAppBundle(APPBUNDLE_NAME, APPBUNDLE_ENGINE, APPBUNDLE_DESCRIPTIION);
        } else {
            appBundle = await client.updateAppBundle(APPBUNDLE_NAME, APPBUNDLE_ENGINE, APPBUNDLE_DESCRIPTIION);
        }
    } catch (err) {
        console.error('Could not create or update appbundle', err);
        process.exit(1);
    }
    console.log('AppBundle', appBundle);

    // Upload appbundle zip file
    try {
        await uploadAppBundleFile(appBundle, APPBUNDLE_FILE);
    } catch (err) {
        console.error('Could not upload appbundle file', err);
        process.exit(1);
    }

    // Create or update an appbundle alias
    const allAppBundleAliases = await client.listAppBundleAliases(APPBUNDLE_NAME);
    const matchingAppBundleAliases = allAppBundleAliases.filter(item => item.id === APPBUNDLE_ALIAS);
    let appBundleAlias;
    try {
        if (matchingAppBundleAliases.length === 0) {
            appBundleAlias = await client.createAppBundleAlias(APPBUNDLE_NAME, APPBUNDLE_ALIAS, appBundle.version);
        } else {
            appBundleAlias = await client.updateAppBundleAlias(APPBUNDLE_NAME, APPBUNDLE_ALIAS, appBundle.version);
        }
    } catch (err) {
        console.error('Could not create or update appbundle alias', err);
        process.exit(1);
    }
    console.log('AppBundle alias', appBundleAlias);

    // Create or update an activity
    const allActivities = await client.listActivities();
    const matchingActivities = allActivities.filter(item => item.indexOf('.' + ACTIVITY_NAME + '+') !== -1);
    const activityInputs = [
        { name: 'inputFile', description: 'Host Drawing', zip: false, ondemand: false, verb: 'get', localName: '$(inputFile)' },
        { name: 'inputJson', description: 'input json', zip: false, ondemand: false, verb: 'get', localName: 'params.json' }
        
    ];
    const activityOutputs = [
        { name: 'outputFile', description: 'output file', zip: false, ondemand: false, verb: 'put', localName: 'outputFile.dwg', required: true }
    ];
    let activity;
    try {
        if (matchingActivities.length === 0) {
            activity = await client.createActivity(ACTIVITY_NAME, ACTIVITY_DESCRIPTION, APPBUNDLE_NAME, APPBUNDLE_ALIAS, APPBUNDLE_ENGINE, activityInputs, activityOutputs,"UpdateParam\n");
        } else {
            activity = await client.updateActivity(ACTIVITY_NAME, ACTIVITY_DESCRIPTION, APPBUNDLE_NAME, APPBUNDLE_ALIAS, APPBUNDLE_ENGINE, activityInputs, activityOutputs,"UpdateParam\n");
        }
    } catch (err) {
        console.error('Could not create or update activity', err);
        process.exit(1);
    }
    console.log('Activity', activity);

    // Create or update an activity alias
    const allActivityAliases = await client.listActivityAliases(ACTIVITY_NAME);
    const matchingActivityAliases = allActivityAliases.filter(item => item.id === ACTIVITY_ALIAS);
    let activityAlias;
    try {
        if (matchingActivityAliases.length === 0) {
            activityAlias = await client.createActivityAlias(ACTIVITY_NAME, ACTIVITY_ALIAS, activity.version);
        } else {
            activityAlias = await client.updateActivityAlias(ACTIVITY_NAME, ACTIVITY_ALIAS, activity.version);
        }
    } catch (err) {
        console.error('Could not create or update activity alias', err);
        process.exit(1);
    }
    console.log('Activity alias', activityAlias);
}

setup();



