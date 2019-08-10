# fda-node

This sample demonstrates usage of forge design automation in node.js, for this sample I'm using [unofficial sdk](https://github.com/petrbroz/forge-server-utils) created by my colleague [Petr Broz](https://github.com/petrbroz)

Here, we will write a node js app, that update parameters of blockreference in  input drawing file and gives out result drawing.


On Windows
```
git clone https://github.com/MadhukarMoogala/fda-node.git
cd fda-node
npm install
set FORGE_CLIENT_ID=<your client id>
set FORGE_CLIENT_SECRET=<your client secret>
set FORGE_BUCKET=<oss bucket name>
node start.js
node run.js
```
## Usage

### Providing Forge credentials

The CLI tools require Forge app credentials to be provided as env. variables.

> If you don't have a Forge app yet, check out this tutorial: https://forge.autodesk.com/en/docs/oauth/v2/tutorials/create-app/.


The `start.js` script:

- creates (or updates) an app bundle for Autodesk AutoCAD engine,
  using a pre-packaged AutoCAD plugin UpdateParameter.bundle.zip
- creates (or updates) an alias pointing to the latest version of the app bundle
- creates (or updates) an activity with the Inventor plugin that
  takes an Drawing file as its input, and generates an Drawing file
  on its output.
- creates (or updates) an alias pointing to the latest version of the activity

The `run.js` script:

- uploads an example Drawing  included with this sample
- creates signed URLs for the input Inventor file and the output thumbnail
- creates a work item for the activity defined during the setup
- waits for the work item to complete
- gives outs the download drawing file.
- copy and paste the download url in your browser to download.




