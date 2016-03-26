var notifications = require("sdk/notifications");
var base64 = require("sdk/base64");
var xhr = require("sdk/net/xhr");

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
  try {
    properties = JSON.parse(properties);
  }
  catch(err) {
    console.error(json);
    console.error(object["properties"]);
    console.exception(err);
    return null;
  }
  object["properties"] = properties;
  return object;
}

function fetchSingle(databaseHost, databaseUser, databasePassword, id, callback) {
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  request.addEventListener("load", function() {
    callback(jsonToObject(JSON.parse(request.response)));
  });
  request.open("GET", databaseHost + "/index.php/apps/passwords/api/0.1/passwords/" + id);
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.send();
}

function fetchAll(databaseHost, databaseUser, databasePassword, callback) {
  if (databaseHost == null || databaseUser == null || databasePassword == null) {
    callback(null);
    return;
  }
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  request.addEventListener("load", function () {
    if (request.status === 200){
      var loginList = JSON.parse(request.response);
      if (loginList.length > 0 && loginList[0]["properties"] == null) {
        notifications.notify({
          title: "Incompatible app version",
          text: "Your ownCloud is running an outdated version of the Passwords app."
        });
        callback(null);
        return;
      }
      var tempLoginList = [];
      for (var i=0; i<loginList.length; i++) {
        if (loginList[i]["deleted"] === "0") {
          tempLoginList.push(jsonToObject(loginList[i]));
        }
      }
      loginList = tempLoginList;
      callback(loginList);
    }
    else {
      notifications.notify({
        title: "Failed to get passwords",
        text: "Could not get passwords from the server :/"
      });
      console.error(request.status, request.response);
      callback(null);
    }
  });
  request.open("GET", databaseHost + "/index.php/apps/passwords/api/0.1/passwords");
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.send();
}

function create(databaseHost, databaseUser, databasePassword, loginname, pass, website, address, notes, callback=null) {
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  var data = {
    website,
    pass,
    loginname,
    address,
    notes
  };
  if (callback !== null) {
    request.addEventListener("load", callback);
  }
  request.open("POST", databaseHost + "/index.php/apps/passwords/api/0.1/passwords");
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.send(JSON.stringify(data));
}

function update(databaseHost, databaseUser, databasePassword, id, loginname, pass, website, address, notes, datechanged, deleted, callback=null) {
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);
  var request = new xhr.XMLHttpRequest({"mozAnon": true});
  var data = {
    website,
    pass,
    loginname,
    address,
    notes,
    datechanged,
    deleted
  };
  if (callback !== null) {
    request.addEventListener("load", callback);
  }
  request.open("PUT", databaseHost + "/index.php/apps/passwords/api/0.1/passwords/" + id);
  request.setRequestHeader("Authorization", "Basic " + encodedLogin);
  request.setRequestHeader("Content-Type", "application/json");
  request.send(JSON.stringify(data));
}

exports.fetchSingle = fetchSingle;
exports.fetchAll = fetchAll;
exports.create = create;
exports.update = update;
exports.jsonToObject = jsonToObject;

