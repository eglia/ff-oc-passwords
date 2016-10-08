var notifications = require("sdk/notifications");
var base64 = require("sdk/base64");
var xhr = require("sdk/net/xhr");
var version = null;

function escapeJSON(text) {
  var returnText = text;
  returnText = returnText.replace(/\\/g, "\\\\");
  returnText = returnText.replace(/\n/g, "\\n");
  returnText = returnText.replace(/\r/g, "\\r");
  returnText = returnText.replace(/\t/g, "\\t");
  returnText = returnText.replace(/\f/g, "\\f");
  returnText = returnText.replace(/\" *: *\"/g, "\u0000");
  returnText = returnText.replace(/\' *: *\'/g, "\u0000");
  returnText = returnText.replace(/\" *, *\"/g, "\u0001");
  returnText = returnText.replace(/\' *, *\'/g, "\u0001");
  returnText = returnText.slice(2, -2);
  returnText = returnText.replace(/\"/g, "\\\"");
  returnText = returnText.replace(/\u0000/g, "\" : \"");
  returnText = returnText.replace(/\u0001/g, "\" , \"");
  returnText = "{\"" + returnText + "\"}";
  return returnText;
}

function jsonToObject(json) {
  var object = json;
  var properties = "{" + object["properties"] + "}";
  properties = escapeJSON(properties);
  if (object["properties"] != false) {
    try {
      properties = JSON.parse(properties);
    }
    catch(err) {
      console.error(json);
      console.error(object["properties"]);
      console.exception(err);
      return null;
    }
    for (var key in properties) {
      if ({}.hasOwnProperty.call(properties, key)) {
        object[key] = properties[key];
      }
    }
  } else {
    console.error("Missing properties for " + object["id"] + ": " + object["website"]);
    message = "Some entries in your passwords database seem to be corrupted. Could not get all details for entry:\n";
    message += object["id"] + ": " + object["website"];
    notifications.notify({
      title: "Corrupted database",
      text: message
    });
  }
  delete object["properties"];
  return object;
}

function checkVersion(database, callback, data) {
  var encodedLogin = base64.encode(database["databaseUser"] + ":" + database["databasePassword"]);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  request.addEventListener("load", function() {
    processVersion(request.response, callback, data);
  });
  request.addEventListener("error", function() {
    processVersion(request.response, callback, data);
  });
  request.addEventListener("timeout", function() {
    processVersion(request.response, callback, data);
  });
  request.open("GET", database["databaseHost"] + "/index.php/apps/passwords/api/0.1/version");
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.timeout = 30000;
  request.send();
}

function processVersion(response, callback, data) {
  try {
    version = JSON.parse(response).split(".");
    if (version.length === 1) {
      version[1] = 0;
    }
  }
  catch (err) {
    version = [0, 0];
  }
  callback(data);
}

function compareVersion(version1, version2) {
  if (version1 === null || version2 === null) {
    return false;
  }
  else if (version1[0] < version2[0]) {
    return false;
  }
  else if (version1[0] === version2[0] && version1[1] < version2[1]) {
    return false;
  } else {
    return true;
  }
}

function fetchSingle(database, id, callback) {
  if (!compareVersion(version, [17, 3])) {
    notifications.notify({
      title: "Incompatible app version",
      text: "This feature requires an ownCloud app version >= 17.3"
    });
    return;
  }
  var encodedLogin = base64.encode(database["databaseUser"] + ":" + database["databasePassword"]);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  request.addEventListener("load", function() {
    callback(jsonToObject(JSON.parse(request.response)));
  });
  request.addEventListener("error", function() {
    notifications.notify({
      title: "Failed to get passwords",
      text: "The request could not be sent!"
    });
  });
  request.addEventListener("timeout", function() {
    notifications.notify({
      title: "Failed to get passwords",
      text: "Connection to server timed out!"
    });
  });
  request.open("GET", database["databaseHost"] + "/index.php/apps/passwords/api/0.1/passwords/" + id);
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.timeout = 30000;
  request.send();
}

function fetchAll(database, callback) {
  if (database["databaseHost"] == null || database["databaseUser"] == null || database["databasePassword"] == null) {
    callback(null);
    return;
  }
  checkVersion(database, fetchAllCallback, {database, callback});
}

function fetchAllCallback(data) {
  var encodedLogin = base64.encode(data["database"]["databaseUser"] + ":" + data["database"]["databasePassword"]);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  request.addEventListener("load", function () {
    if (request.status === 200){
      var loginList = JSON.parse(request.response);
      if (loginList.length > 0 && loginList[0]["properties"] == null) {
        notifications.notify({
          title: "Incompatible app version",
          text: "Your ownCloud is running an outdated version of the Passwords app."
        });
        data["callback"](null);
        return;
      }
      var tempLoginList = [];
      for (var i=0; i<loginList.length; i++) {
        if (loginList[i]["deleted"] === "0" || loginList[i]["deleted"] === false) {
          tempLoginList.push(jsonToObject(loginList[i]));
        }
      }
      loginList = tempLoginList;
      data["callback"](loginList);
    }
    else {
      notifications.notify({
        title: "Failed to get passwords",
        text: "The server refused to answer!"
      });
      console.error(request.status, request.response);
      data["callback"](null);
    }
  });
  request.addEventListener("error", function() {
    notifications.notify({
      title: "Failed to get passwords",
      text: "The request could not be sent!"
    });
    data["callback"](null);
  });
  request.addEventListener("timeout", function() {
    notifications.notify({
      title: "Failed to get passwords",
      text: "Connection to server timed out!"
    });
    data["callback"](null);
  });
  request.open("GET", data["database"]["databaseHost"] + "/index.php/apps/passwords/api/0.1/passwords");
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.timeout = 30000;
  request.send();
}

function create(database, data, callback=null) {
  if (!compareVersion(version, [17, 3])) {
    notifications.notify({
      title: "Incompatible app version",
      text: "This feature requires an ownCloud app version >= 17.3"
    });
    return;
  }
  var encodedLogin = base64.encode(database["databaseUser"] + ":" + database["databasePassword"]);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  if (callback !== null) {
    request.addEventListener("load", callback);
  }
  request.open("POST", database["databaseHost"] + "/index.php/apps/passwords/api/0.1/passwords");
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.timeout = 30000;
  request.send(JSON.stringify(data));
}

function update(database, id, data, callback=null) {
  if (!compareVersion(version, [17, 3])) {
    notifications.notify({
      title: "Incompatible app version",
      text: "This feature requires an ownCloud app version >= 17.3"
    });
    return;
  }
  var encodedLogin = base64.encode(database["databaseUser"] + ":" + database["databasePassword"]);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  if (callback !== null) {
    request.addEventListener("load", callback);
  }
  request.open("PUT", database["databaseHost"] + "/index.php/apps/passwords/api/0.1/passwords/" + id);
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.timeout = 30000;
  request.send(JSON.stringify(data));
}

exports.fetchSingle = fetchSingle;
exports.fetchAll = fetchAll;
exports.create = create;
exports.update = update;
exports.jsonToObject = jsonToObject;

