var self = require("sdk/self");
var system = require("sdk/system")
var base64 = require("sdk/base64");
var tabs = require("sdk/tabs");
var url = require("sdk/url");
var notifications = require("sdk/notifications");
var simplePrefs = require("sdk/simple-prefs");
var passwords = require("sdk/passwords");
var timers = require("sdk/timers");

var mobile = false;
if (system.platform == "android") {
  mobile = true;
}

if (!mobile) {
  var ui = require("sdk/ui");
  var panel = require("sdk/panel");

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
  mainPanel.port.on("loginClicked", mainPanelLoginClicked);
  mainPanel.port.on("settingsClicked", mainPanelSettingsClicked);
  mainPanel.port.on("refreshClicked", mainPanelRefreshClicked);
  mainPanel.port.on("resize", mainPanelResize);
  mainPanel.on("show", function() {
    mainPanel.port.emit("show");
  });
  settingsPanel.port.on("resize", settingsPanelResize);
  settingsPanel.on("show", function() {
    passwords.search({
      url: self.uri,
      onComplete: settingsPanelRefresh
    });
  });
}

function saveSettingsPanel(host, user, password, timer) {
  if (!mobile) {
    settingsPanel.hide();
  }
  else {
    tabs.activeTab.close();
  }
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
  if (!mobile) {
    settingsPanel.hide();
  }
  else {
    tabs.activeTab.close();
  }
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
        var tempLoginList = [];
        for (var i=0; i<loginList.length; i++) {
          if (loginList[i]['deleted'] == '0') {
            tempLoginList.push(loginList[i]);
          }
        }
        loginList = tempLoginList;
        processLoginList();
        if (!mobile) {
          mainPanel.port.emit("refreshFinished");
        }
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

function escapeJSON(text) {
  var quoteCounter = 0;
  var quotePosition = [];
  var returnText = text;
  returnText = returnText.replace(/\n/g, "\\n");
  for (var i=0; i<returnText.length; i++) {
    if (returnText[i] == "\"") {
      quoteCounter = quoteCounter + 1;
      quotePosition.push(i);
    }
    else if (returnText[i] == ":" || returnText[i] == ",") {
      if (quoteCounter != 2) {
        quotePosition.splice(-1-quoteCounter, 1);
        quotePosition.splice(-1, 1);
      }
      else {
        quotePosition = quotePosition.slice(0, -2)
      }
      quoteCounter = 0;
    }
  }
  if (quoteCounter != 2) {
    quotePosition.splice(-1-quoteCounter, 1);
    quotePosition.splice(-1, 1);
  }
  else {
    quotePosition = quotePosition.slice(0, -2)
  }
  for (var i=0; i<quotePosition.length; i++) {
    returnText = returnText.substr(0, quotePosition[i]+i) + "\\\"" + returnText.substr(quotePosition[i]+i+1);
  }
  return returnText;
}

var userList = [];
var passwordList = [];

function processLoginList() {
  if (loginList == null) {
    return
  }
  var host = getHostFromURL(tabs.activeTab.url);
  userList = [];
  passwordList = [];
  var hits = 0
  for (var i=0; i<loginList.length; i++) {
    var entryProperties = "{" + loginList[i]["properties"] + "}";
    entryProperties = escapeJSON(entryProperties);
    entryProperties = JSON.parse(entryProperties);
    var entryAddress = getHostFromURL(entryProperties["address"])
    var entryWebsite = getHostFromURL(loginList[i]["website"])
    if (host == entryAddress || host == entryWebsite) {
      userList.push(entryProperties["loginname"]);
      passwordList.push(loginList[i]["pass"]);
      hits = hits + 1;
    }
  }
  if (!mobile) {
    mainPanel.port.emit("updateLogins", userList, loginList.length);
    if (hits > 0) {
      mainButton.badge = hits;
    }
    else {
      mainButton.badge = undefined;
    }
  }
  if (mobile) {
    populateFillMenu();
  }
}

function getHostFromURL(URL) {
  var enhancedURL = URL;
  try {
    var URLobj = url.URL(URL);
  }
  catch(err) {
    try {
      enhancedURL = "http://" + URL;
      var URLobj = url.URL(enhancedURL);
    }
    catch(err2) {
      return URL;
    }
  }
  try {
    var splittedURL = URLobj.host.split('.');
    if (splittedURL.length == 4) {
      var valid = true;
      for (var i=0; i<splittedURL.length; i++) {
        if (isNaN(splittedURL[i]) || splittedURL[i] < 0 || splittedURL[i] > 255) {
          valid = false;
        }
      }
      if (valid) {
        return URLobj.host;
      }
    }
    var TLD = url.getTLD(enhancedURL);
    var baseHost = splittedURL[splittedURL.length - 2];
    if (TLD == null || baseHost == undefined) {
      return URL;
    }
    return baseHost + '.' + TLD;
  }
  catch(err) {
    return URL;
  }
}

tabs.on("ready", pageLoaded);
tabs.on("activate", pageLoaded);

var lastHost = "";
function pageLoaded(tab) {
  var newHost = getHostFromURL(tab.url);
  if (lastHost != newHost) {
    processLoginList();
    lastHost = newHost;
  }
}

function mainPanelLoginClicked(id) {
  var worker = tabs.activeTab.attach({
    contentScriptFile: self.data.url("fill-password.js")
  });
  worker.port.emit("fillPassword", userList[id], passwordList[id]);
}

function mainPanelSettingsClicked() {
  mainPanel.hide();
  mainButton.state("window", {checked: true})
  settingsPanel.show({position: mainButton});
}

function mainPanelRefreshClicked() {
  refreshLogins();
}

function mainPanelResize(width, height) {
  mainPanel.resize(width, height);
}

function settingsPanelResize(width, height) {
  settingsPanel.resize(width, height);
}

function settingsPanelRefresh(credentials) {
  var databaseHost = simplePrefs.prefs["databaseHost"];
  var refreshTimer = simplePrefs.prefs["refreshTimer"];
  var databaseUser = ""
  var databasePassword = ""
  if (credentials.length > 0) {
    databaseUser = credentials[0].username;
    databasePassword = credentials[0].password;
  }
  if (!mobile) {
    settingsPanel.port.emit("show", databaseHost, databaseUser, databasePassword, refreshTimer);
  }
  else {
    settingsPanelWorker.port.emit("show", databaseHost, databaseUser, databasePassword, refreshTimer);
  }
}

var refreshInterval = timers.setInterval(refreshLogins, simplePrefs.prefs["refreshTimer"]*1000);

function refreshLogins() {
  passwords.search({
    url: self.uri,
    onComplete: processCredentials
  });
}

refreshLogins();

if (mobile) {
  var Services = require("resource://gre/modules/Services.jsm").Services;
  var NativeWindow = Services.wm.getMostRecentWindow("navigator:browser").NativeWindow;
  
  var settingsPanelWorker = undefined;
  
  function attachWorker() {
    settingsPanelWorker = tabs.activeTab.attach({
      contentScriptFile: "./settings-panel.js"
    });
    passwords.search({
      url: self.uri,
      onComplete: settingsPanelRefresh
    });
    settingsPanelWorker.port.on("saveSettings", saveSettingsPanel);
    settingsPanelWorker.port.on("cancelSettings", cancelSettingsPanel);
  }
  
  function menuTapHandler() {
    tabs.open({
      url: "./settings-panel.html",
      onReady: attachWorker
    });
  }

  function fillMenuTapped(elem) {
    mainPanelLoginClicked(elem);
  }
  
  var parentMenu = NativeWindow.menu.add({
    name: "Passwords"
  });
  
  var settingsMenu = NativeWindow.menu.add({
    name: "Settings",
    parent: parentMenu,
    callback: menuTapHandler
  });

  var fillMenuElements = [];

  function populateFillMenu() {
    for (var i=0; i<fillMenuElements.length; i++) {
      NativeWindow.menu.remove(fillMenuElements[i]);
    }
    fillMenuElements = [];
    for (var i=0; i<userList.length; i++) {
      fillMenuElements[i] = NativeWindow.menu.add({
        name: userList[i],
        parent: parentMenu,
        // and now for some weird javascript magic (closures):
        callback: function() {
           var tmp = i;
           return function() {
             fillMenuTapped(tmp);
           }
        }()
      });
    }
  }
  
  var refreshMenu = NativeWindow.menu.add({
    name: "Refresh",
    parent: parentMenu,
    callback: refreshLogins
  });
}
