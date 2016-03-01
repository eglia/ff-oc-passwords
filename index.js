var self = require("sdk/self");
var ui = require("sdk/ui");
var base64 = require("sdk/base64");
var tabs = require("sdk/tabs");
var url = require("sdk/url");
var notifications = require("sdk/notifications");
var simplePrefs = require("sdk/simple-prefs");
var passwords = require("sdk/passwords");
var panel = require("sdk/panel");
var timers = require("sdk/timers");

var mainButton = ui.ToggleButton({
  id: "owncloudPasswordButton",
  label: "ownCloud Passwords",
  icon: "./app_black.png",
  onChange: handleMainButtonClick
});

var mainPanel = panel.Panel({
  contentURL: self.data.url("main-panel.html"),
  contentScriptFile: self.data.url("main-panel.js"),
  onHide: handleHide
});

var settingsPanel = panel.Panel({
  contentURL: self.data.url("settings-panel.html"),
  contentScriptFile: self.data.url("settings-panel.js"),
  onHide: handleHide
});

settingsPanel.port.on("saveSettings", saveSettingsPanel);
settingsPanel.port.on("cancelSettings", cancelSettingsPanel);

function saveSettingsPanel(host, user, password, timer) {
  settingsPanel.hide();
  simplePrefs.prefs["databaseHost"] = host;
  simplePrefs.prefs["refreshTimer"] = parseInt(timer);
  passwords.search({
    realm: "ownCloud",
    onComplete: function onComplete(credentials) {
      credentials.forEach(passwords.remove);
      passwords.store({
        realm: "ownCloud",
        username: user,
        password: password
      });
      refreshLogins();
      timers.clearInterval(refreshInterval);
      refreshInterval = timers.setInterval(refreshLogins, simplePrefs.prefs["refreshTimer"]*1000);
    }
  });
}

function cancelSettingsPanel() {
  settingsPanel.hide();
}

function handleHide() {
  mainButton.state("window", {checked: false});
}

function handleMainButtonClick(state) {
  if (state.checked == true) {
    passwords.search({
      url: self.uri,
      onComplete: processMainButtonClick
    });
  }
  else {
    mainPanel.hide();
    settingsPanel.hide()
  }
}

function processMainButtonClick(credentials) {
  if (credentials.length == 0) {
    settingsPanel.show({position: mainButton});
  }
  else {
    mainPanel.show({position: mainButton});
  }
}

function processCredentials(credentials) {
  if (credentials.length > 0) {
    var databaseHost = simplePrefs.prefs["databaseHost"];
    var databaseUser = credentials[0].username;
    var databasePassword = credentials[0].password;
    fetchLoginList(databaseHost, databaseUser, databasePassword);
  }
}

var loginList = null;

function fetchLoginList(databaseHost, databaseUser, databasePassword) {
  if (databaseHost == null || databaseUser == null || databasePassword == null) {
    return;
  }
  var encodedData = base64.encode(databaseUser + ":" + databasePassword);
  var Request = require("sdk/request").Request;
  var passwordRequest = Request({
    url: databaseHost + "/index.php/apps/passwords/api/0.1/passwords",
    headers: {"Authorization": "Basic " + encodedData},
    onComplete: function (response) {
      if (response.status == 200){
        loginList = response.json;
        processLoginList();
        mainPanel.port.emit("refreshFinished");
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

var userList = [];
var passwordList = [];

function processLoginList() {
  try {
    var host = getHostFromURL(tabs.activeTab.url);
  }
  catch(err) {
    host = tabs.activeTab.url;
  }
  userList = [];
  passwordList = [];
  var hits = 0
  for (var i=0; i<loginList.length; i++) {
    try {
      if (host == getHostFromURL(JSON.parse("{" + loginList[i]["properties"] + "}")["address"])) {
        userList.push(JSON.parse("{" + loginList[i]["properties"] + "}")["loginname"]);
        passwordList.push(loginList[i]["pass"]);
        hits = hits + 1;
      }
    }
    catch(err){}
  }
  mainPanel.port.emit("updateLogins", userList, loginList.length);
  if (hits > 0) {
    mainButton.badge = hits;
  }
  else {
    mainButton.badge = undefined;
  }
}

function getHostFromURL(URL) {
  try {
    return url.URL(URL).host.replace(/^www\./,"")
  }
  catch(err) {
    return URL
  }
}

tabs.on("ready", pageLoaded);

var lastHost = "";
function pageLoaded(tab) {
  var newHost = getHostFromURL(tab.url);
  if (lastHost != newHost) {
    processLoginList();
    lastHost = newHost;
  }
}

mainPanel.port.on("loginClicked", mainPanelLoginClicked);

function mainPanelLoginClicked(id) {
  var worker = tabs.activeTab.attach({
    contentScriptFile: self.data.url("fill-password.js")
  });
  worker.port.emit("fillPassword", userList[id], passwordList[id]);
}

mainPanel.port.on("settingsClicked", mainPanelSettingsClicked);

function mainPanelSettingsClicked() {
  mainPanel.hide();
  mainButton.state("window", {checked: true})
  settingsPanel.show({position: mainButton});
}

mainPanel.port.on("refreshClicked", mainPanelRefreshClicked);

function mainPanelRefreshClicked() {
  refreshLogins();
}

mainPanel.port.on("resize", mainPanelResize);

function mainPanelResize(width, height) {
  mainPanel.resize(width, height);
}

mainPanel.on("show", function() {
  mainPanel.port.emit("show");
});

settingsPanel.port.on("resize", settingsPanelResize);

function settingsPanelResize(width, height) {
  settingsPanel.resize(width, height);
}

settingsPanel.on("show", function() {
  passwords.search({
    url: self.uri,
    onComplete: settingsPanelRefresh
  });
});

function settingsPanelRefresh(credentials) {
  var databaseHost = simplePrefs.prefs["databaseHost"];
  var refreshTimer = simplePrefs.prefs["refreshTimer"];
  var databaseUser = ""
  var databasePassword = ""
  if (credentials.length > 0) {
    databaseUser = credentials[0].username;
    databasePassword = credentials[0].password;
  }
  settingsPanel.port.emit("show", databaseHost, databaseUser, databasePassword, refreshTimer);
}

var refreshInterval = timers.setInterval(refreshLogins, simplePrefs.prefs["refreshTimer"]*1000);

function refreshLogins() {
  passwords.search({
    url: self.uri,
    onComplete: processCredentials
  });
}

refreshLogins();
