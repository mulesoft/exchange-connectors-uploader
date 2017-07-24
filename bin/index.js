#! /usr/bin/env node

const Bluebird = require('bluebird');
const fs = require('fs');
const inquirer = require('inquirer');
const _ = require('lodash');
const path = require('path');
const request = require('request-promise');
const superagentBase = require('superagent');
const superagent = require('superagent-promise')(superagentBase, Bluebird);

const config = require('../config/default');

const MULESOFT_ORG_ID = '68ef9520-24e9-4cf2-b2f5-620025690913';

let accessToken;
let organizationId;
let groupId;
let assetId;
let version;
let pomFilePath;
let studioPluginFilePath;

obtainCredentials()
  .then(function (answer) {
    return login(answer.name, answer.password);
  })
  .then(getUserInfo)
  .then((userInfo) => obtainOrganizationId(userInfo.user.contributorOfOrganizations))
  .then((organization) => {
    organizationId = organization.id;
    if (organizationId === MULESOFT_ORG_ID) {
      return enterAssetG();
    }
    return getGroupIds()
      .then((groupIds) => groupIds[0].groupId);
  })
  .then((theGroupId) => {
    groupId = theGroupId;
    return enterAssetAV();
  })
  .then((assetVersion) => {
    assetId = assetVersion.assetId;
    version = assetVersion.version;
    return selectPomFile();
  })
  .then((selectedPomFilePath) => {
    pomFilePath = selectedPomFilePath;
    return selectStudioPluginFile();
  })
  .then((selectedStudioPluginFilePath) => {
    studioPluginFilePath = selectedStudioPluginFilePath;
    return uploadFiles();
  })
  .catch(errorHandler)
;

function obtainCredentials() {
  return inquirer.prompt([
    {
      type:    'input',
      name:    'name',
      message: 'Username: '
    },
    {
      type:    'password',
      name:    'password',
      message: 'Password: '
    }
  ]);
}


function login(username, password) {
  return superagent
    .post(`${config.csSiteApi.baseUri}/login`)
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json')
    .send({
      username,
      password
    })
    .then((res) => {
      accessToken = res.body.access_token;
      return accessToken;
    })
  ;
}

function getUserInfo() {
  return superagent
    .get(`${config.csSiteApi.baseUri}/api/me`)
    .set('Authorization', `Bearer ${accessToken}`)
    .then(function (response) {
      return response.body;
    })
  ;
}

function obtainOrganizationId(organizations) {
  const organizationOptions = _.map(organizations, (org) => ({ name: org.name, value: org.id }));
  if (organizationOptions.length > 9) {
    organizationOptions.push(new inquirer.Separator());
  }
  return inquirer.prompt({
    type:    'list',
    name:    'id',
    message: 'Select organization',
    choices: organizationOptions
  }).then((answer) => _.find(organizations, answer));
}

function getGroupIds() {
  return superagent
    .get(`${config.exchangeApi.baseUri}/api/v1/organizations/${organizationId}/groups`)
    .set('Authorization', `Bearer ${accessToken}`)
    .then(function (response) {
      return response.body;
    })
  ;
}

function enterAssetG() {
  return inquirer.prompt([{
    type:    'input',
    message: 'Enter group id',
    name:    'groupId'
  }]).then((answer) => answer.groupId);
}

function enterAssetAV() {
  return inquirer.prompt([{
    type:    'input',
    message: 'Enter asset id',
    name:    'assetId'
  }, {
    type:    'input',
    message: 'Enter asset version',
    name:    'version'
  }]).then((answer) => answer);
}

function selectPomFile() {
  return listFiles()
    .then((files) =>
      inquirer.prompt({
        type:    'list',
        name:    'answer',
        message: 'Select POM file',
        choices: files.filter(getFileFilter('.pom'))
      })
    )
    .then((answer) => answer.answer)
  ;
}

function selectStudioPluginFile() {
  return listFiles()
    .then((files) =>
      inquirer.prompt({
        type:    'list',
        name:    'answer',
        message: 'Select Studio Plugin file',
        choices: files.filter(getFileFilter('studio-plugin.zip'))
      })
    )
    .then((answer) => answer.answer)
  ;
}

function getFileFilter(filter) {
  return function extension(element) {
    const extName = path.basename(element);
    return extName.includes(filter);
  };
}

function listFiles() {
  return new Bluebird((resolve, reject) => {
    fs.readdir('.', (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

function uploadFiles() {
  const baseUri = `${config.exchangeMavenApi.baseUri}/api/v1/organizations/${organizationId}/maven/${groupId}/${assetId}/${version}/` +
    `${assetId}-${version}`;

  const pomFileRequest = {
    url:     `${baseUri}.pom`,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  };

  const studioPluginFileRequest = {
    url:     `${baseUri}-studio-plugin.zip`,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  };

  const pomFileStream = fs.createReadStream(`${process.cwd()}/${pomFilePath}`);
  const studioPluginFileStream = fs.createReadStream(`${process.cwd()}/${studioPluginFilePath}`);

  return pomFileStream.pipe(request.put(pomFileRequest))
    .then(() => studioPluginFileStream.pipe(request.put(studioPluginFileRequest)))
  ;
}

function errorHandler(err) {
  if (err.status === 401) {
    console.log('Invalid credentials');
  } else if (err.status === 403) {
    console.log('Insufficient permissions');
  } else if (err.statusCode === 409) {
    console.log('Conflict error, the asset version already exists');
  } else {
    console.log(JSON.stringify(err));
  }
}
