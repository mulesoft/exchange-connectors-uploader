# Connector Uploader

Uploads a Mule 3.x connector to Exchange 2.0

## Pre-requisites

This tool allows the upload of Mule 3.x connectors to Exchange 2.0, in those cases where the source code is not available. If the connector source code is available, please consider publishing the connector via Maven (see more information in: https://anypoint.mulesoft.com/apiplatform/anypoint-platform/#/portals/organizations/2559c34c-bbc7-4a5a-b078-bc1154594906/apis/5238933/versions/100008).

In other cases, you must have access to these 3 files for the Mule 3.x connector:
- A pom file
- A jar file
- A studio-plugin.zip file

Download these files and move them to a new directory

## Installing the application

To install this app, just run:

```
$ npm install -g connector-uploader
```

## Running the application

In the directory where you have the mentioned files, run:

```
$ connector-uploader
```

You need to enter the Anypoint Platform credentials for the organization you want to upload the connector to. Then, you will be asked to select a business group and enter the asset coordinates (Asset Id and Version, Group Id is generated for you). Finally, you will need to select the files, one at a time.

That's it, the application will output the location of your newly created connector.
