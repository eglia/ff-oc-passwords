var self = require("sdk/self");
var buttons = require("sdk/ui/button/action");
var base64 = require("sdk/base64");
var tabs = require("sdk/tabs");
var url = require("sdk/url");
var notifications = require("sdk/notifications");
var simplePrefs = require("sdk/simple-prefs");
var passwords = require("sdk/passwords");
var panel = require("sdk/panel");

var button = buttons.ActionButton({
  id: "mozilla-link",
  label: "Visit Mozilla",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  },
  onClick: handleClick
});

var owncloudCredentialsPrompt = panel.Panel({
  contentURL: self.data.url("owncloud-credentials-prompt.html"),
  contentScriptFile: self.data.url("owncloud-credentials-prompt.js")
});

owncloudCredentialsPrompt.port.on("saveOwncloudCredentials", saveOwncloudCredentials);
owncloudCredentialsPrompt.port.on("cancelOwncloudCredentials", cancelOwncloudCredentials);
owncloudCredentialsPrompt.port.on("resizeOwncloudCredentials", resizeOwncloudCredentials);

function saveOwncloudCredentials(user, password) {
  owncloudCredentialsPrompt.hide();
  passwords.store({
    realm: "ownCloud",
    username: user,
    password: password
  });
}

function cancelOwncloudCredentials() {
  owncloudCredentialsPrompt.hide();
}

function resizeOwncloudCredentials(width, height) {
  owncloudCredentialsPrompt.resize(width, height);
}

function handleClick(state) {
  passwords.search({
    url: self.uri,
    onComplete: processOwncloudCredentials});
}

function processOwncloudCredentials(credentials) {
  if (credentials.length == 0) {
    owncloudCredentialsPrompt.show();
  }
  else {
    fetchPasswordList(simplePrefs.prefs["databaseHost"], credentials[0].username, credentials[0].password);
  }
}

function fetchPasswordList(databaseHost, databaseUser, databasePassword) {
  var encodedData = base64.encode(databaseUser + ":" + databasePassword);
  var Request = require("sdk/request").Request;
  var passwordRequest = Request({
    url: databaseHost + "/index.php/apps/passwords/api/0.1/passwords",
    headers: {"Authorization": "Basic " + encodedData},
    onComplete: function (response) {
      if (response.status == 200){
        processPasswordList(response.json);
      }
      else {
        notifications.notify({
          title: "Failed to get passwords",
          text: "Could not get passwords from the server :/"
        });
      }
    }
  });
  passwordRequest.get();
}

function processPasswordList(list) {
  try {
    var host = url.URL(tabs.activeTab.url).host.replace(/^www\./,"");
  }
  catch(err) {
    host = tabs.activeTab.url;
  }
  var user = "";
  var password = "";
  var hit = false;
  for (var i=0; i<list.length; i++) {
    try {
      if (host == url.URL((JSON.parse("{" + list[i]["properties"] + "}")["address"])).host.replace(/^www\./,"")) {
        user = JSON.parse("{" + list[i]["properties"] + "}")["loginname"]
        password = list[i]["pass"]
        hit = true;
      }
    }
    catch(err){}
  }
  if (hit == true) {
    var worker = tabs.activeTab.attach({
      contentScriptFile: self.data.url("fill-password.js")
    });
    worker.port.emit("fillPassword", user, password);
  }
  else {
    notifications.notify({
      title: "No logins found",
      text: "Could not find any logins for current page :/"
    });
  }
}
