var self = require("sdk/self");
var system = require("sdk/system")
var base64 = require("sdk/base64");
var tabs = require("sdk/tabs");
var url = require("sdk/url");
var notifications = require("sdk/notifications");
var simplePrefs = require("sdk/simple-prefs");
var passwords = require("sdk/passwords");
var timers = require("sdk/timers");
var pageMod = require("sdk/page-mod");
var request = require("sdk/request");
var xhr = require("sdk/net/xhr");

var databaseHost = null;
var databaseUser = null;
var databasePassword = null;
var loginList = null;
var userList = [];
var passwordList = [];
var mobile = system.platform == "android";
var refreshInterval = timers.setInterval(fetchLoginList, simplePrefs.prefs["refreshTimer"]*1000);
var minedURL = null;
var minedUser = null;
var minedPassword = null;
var minedMatchingID = null;
var passwordMiner = null;

exports.onUnload = cleanup;

passwordMiner = pageMod.PageMod({
  include: "*",
  contentScriptFile: "./mine-password.js",
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    worker.port.on("passwordMined", passwordMined);
  }
});

tabs.on("ready", processLoginList);
tabs.on("activate", processLoginList);
tabs.on("deactivate", processLoginList);
tabs.on("open", processLoginList);

passwords.search({
  url: self.uri,
  onComplete: processCredentials
});

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

  var addPanel = panel.Panel({
    contentURL: self.data.url("add-panel.html"),
    contentScriptFile: self.data.url("add-panel.js"),
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
  addPanel.port.on("resize", addPanelResize);
  addPanel.port.on("saveLogin", saveLogin);
  addPanel.port.on("cancelLogin", cancelLogin);
}

if (mobile) {
  var Services = require("resource://gre/modules/Services.jsm").Services;
  var NativeWindow = Services.wm.getMostRecentWindow("navigator:browser").NativeWindow;
  
  var settingsPanelWorker = undefined;
  var parentMenu = NativeWindow.menu.add({
    name: "Passwords"
  });
  
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
  
  var settingsMenu = NativeWindow.menu.add({
    name: "Settings",
    parent: parentMenu,
    callback: menuTapHandler
  });
  var refreshMenu = NativeWindow.menu.add({
    name: "Refresh",
    parent: parentMenu,
    callback: fetchLoginList
  });
  var fillMenuElements = [];
  
  function fillMenuTapped(elem) {
    mainPanelLoginClicked(elem);
  }

  function populateFillMenu() {
    for (var i=0; i<fillMenuElements.length; i++) {
      NativeWindow.menu.remove(fillMenuElements[i]);
    }
    fillMenuElements = [];
    for (var i=0; i<userList.length; i++) {
      fillMenuElements[i] = NativeWindow.menu.add({
        name: userList[i],
        parent: parentMenu,
        callback: function() {
           var tmp = i;
           return function() {
             fillMenuTapped(tmp);
           }
        }()
      });
    }
  }
}

function cleanup(reason) {
  if (!mobile) {
    mainButton.destroy();
    mainPanel.destroy();
    settingsPanel.destroy();
    addPanel.destroy();
  }
  else {
    for (var i=0; i<fillMenuElements.length; i++) {
      NativeWindow.menu.remove(fillMenuElements[i]);
    }
    NativeWindow.menu.remove(refreshMenu);
    NativeWindow.menu.remove(settingsMenu);
    NativeWindow.menu.remove(parentMenu);
  }
  timers.clearInterval(refreshInterval);
  passwordMiner.destroy();
}

function passwordMined(url, user, password) {
  if (loginList == null) {
    return
  }
  var host = getHostFromURL(url);
  var userList = [];
  var passwordList = [];
  var idList = [];
  var title = "";
  for (var i=0; i<loginList.length; i++) {
    var entryAddress = getHostFromURL(loginList[i]["properties"]["address"])
    var entryWebsite = getHostFromURL(loginList[i]["website"])
    if (host == entryAddress || host == entryWebsite) {
      userList.push(loginList[i]["properties"]["loginname"]);
      passwordList.push(loginList[i]["pass"]);
      idList.push(loginList[i]["id"]);
    }
  }
  minedMatchingID = -1;
  title = "Detected new login:";
  for (var i=0; i<userList.length; i++) {
    if (userList[i] == user) {
      if (passwordList[i] != password) {
        minedMatchingID = idList[i];
        title = "Detected changed password for user:";
      }
      else {
        return;
      }
    }
  }
  minedURL = url;
  minedUser = user;
  minedPassword = password;
  if (!mobile) {
    mainButton.state("window", {checked: true});
    addPanel.show({position: mainButton});
    addPanel.port.emit("show", title, user);
  }
  else {
    var buttons = [{
        "label": "Save",
        "callback": saveLogin,
        "positive": true
      },{
        "label": "Cancel",
        "callback": cancelLogin,
        "positive": false
      }];
    NativeWindow.doorhanger.show(title + " " + user + "<br>Save to database?", "saveDialog", buttons, tabs.activeTab.id);
  }
}

function saveLogin() {
  if (!mobile) {
    addPanel.hide();
  }
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);
  if (minedMatchingID == -1) {
    var apiRequest = new xhr.XMLHttpRequest({"mozAnon": true});
    var data = {
      "website": getHostFromURL(minedURL),
      "pass": minedPassword,
      "loginname": minedUser,
      "address": minedURL,
      "notes": ""
    };
    apiRequest.addEventListener("load", fetchLoginList);
    apiRequest.open("POST", databaseHost + "/index.php/apps/passwords/api/0.1/passwords");
    apiRequest.setRequestHeader("Authorization", "Basic " + encodedLogin);
    apiRequest.setRequestHeader("Content-Type", "application/json");
    apiRequest.send(JSON.stringify(data));
  }
  else {
    var apiRequest = new xhr.XMLHttpRequest({"mozAnon": true});
    apiRequest.addEventListener("load", function() {
      replaceLogin(JSON.parse(apiRequest.response));
    });
    apiRequest.open("GET", databaseHost + "/index.php/apps/passwords/api/0.1/passwords/" + minedMatchingID);
    apiRequest.setRequestHeader("Authorization", "Basic " + encodedLogin);
    apiRequest.setRequestHeader("Content-Type", "application/json");
    apiRequest.send();
  }
}

function replaceLogin(response) {
  var data = JSONtoObject(response);
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);

  var apiRequest = new xhr.XMLHttpRequest({"mozAnon": true});
  var oldData = {
    "website": data["website"],
    "pass": data["pass"],
    "loginname": data["properties"]["loginname"],
    "address": data["properties"]["address"],
    "notes": data["properties"]["notes"],
    "datechanged": data["properties"]["datechanged"],
    "deleted": "1"
  };
  apiRequest.open("PUT", databaseHost + "/index.php/apps/passwords/api/0.1/passwords/" + minedMatchingID);
  apiRequest.setRequestHeader("Authorization", "Basic " + encodedLogin);
  apiRequest.setRequestHeader("Content-Type", "application/json");
  apiRequest.send(JSON.stringify(oldData));

  var apiRequest2 = new xhr.XMLHttpRequest({"mozAnon": true});
  var newData = {
    "website": data["website"],
    "pass": minedPassword,
    "loginname": data["properties"]["loginname"],
    "address": data["properties"]["address"],
    "notes": data["properties"]["notes"]
  };
  apiRequest2.addEventListener("load", fetchLoginList);
  apiRequest2.open("POST", databaseHost + "/index.php/apps/passwords/api/0.1/passwords");
  apiRequest2.setRequestHeader("Authorization", "Basic " + encodedLogin);
  apiRequest2.setRequestHeader("Content-Type", "application/json");
  apiRequest2.send(JSON.stringify(newData));
}

function cancelLogin() {
  if (!mobile) {
    addPanel.hide();
  }
}

function saveSettingsPanel(host, user, password, timer, remember) {
  if (!mobile) {
    settingsPanel.hide();
  }
  else {
    tabs.activeTab.close();
  }
  if (host.slice(-1) == "/") {
    host = host.slice(0, -1);
  }
  simplePrefs.prefs["databaseHost"] = host;
  simplePrefs.prefs["refreshTimer"] = parseInt(timer);
  passwords.search({
    realm: "ownCloud",
    onComplete: function onComplete(credentials) {
      credentials.forEach(passwords.remove);
      if (remember) {
        passwords.store({
          realm: "ownCloud",
          username: user,
          password: password
        });
      }
      databaseHost = host;
      databaseUser = user;
      databasePassword = password;
      fetchLoginList();
      timers.clearInterval(refreshInterval);
      refreshInterval = timers.setInterval(fetchLoginList, simplePrefs.prefs["refreshTimer"]*1000);
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
    if (databaseUser == null || databasePassword == null) {
      settingsPanel.show({position: mainButton});
    } else {
      mainPanel.show({position: mainButton});
    }
  }
  else {
    mainPanel.hide();
    settingsPanel.hide()
  }
}

function processCredentials(credentials) {
  databaseHost = simplePrefs.prefs["databaseHost"];
  if (credentials.length > 0) {
    databaseUser = credentials[0].username;
    databasePassword = credentials[0].password;
    fetchLoginList();
  }
}

function fetchLoginList() {
  if (databaseHost == null || databaseUser == null || databasePassword == null) {
    return;
  }
  var encodedData = base64.encode(databaseUser + ":" + databasePassword);
  var passwordRequest = request.Request({
    url: databaseHost + "/index.php/apps/passwords/api/0.1/passwords",
    headers: {"Authorization": "Basic " + encodedData},
    anonymous: true,
    onComplete: function (response) {
      if (response.status == 200){
        loginList = response.json;
        var tempLoginList = [];
        for (var i=0; i<loginList.length; i++) {
          if (loginList[i]["deleted"] == "0") {
            tempLoginList.push(JSONtoObject(loginList[i]));
          }
        }
        loginList = tempLoginList;
        processLoginList();
      }
      else {
        notifications.notify({
          title: "Failed to get passwords",
          text: "Could not get passwords from the server :/"
        });
        console.error(response.status, response.json);
        
      }
      if (!mobile) {
        mainPanel.port.emit("refreshFinished");
      }
    }
  });
  passwordRequest.get();
}

function escapeJSON(text) {
  var returnText = text;
  returnText = returnText.replace(/\n/g, "\\n");
  returnText = returnText.replace(/\r/g, "\\r");
  returnText = returnText.replace(/\t/g, "\\t");
  returnText = returnText.replace(/\f/g, "\\f");
  returnText = returnText.replace(/\'/g, "\"");
  returnText = returnText.replace(/\" *: *\"/g, "\0");
  returnText = returnText.replace(/\" *, *\"/g, "\1");
  returnText = returnText.slice(2, -2)
  returnText = returnText.replace(/\"/g, "\\\"")
  returnText = returnText.replace(/\0/g, "\" : \"");
  returnText = returnText.replace(/\1/g, "\" , \"");
  returnText = "{\"" + returnText + "\"}";
  return returnText;
}

function JSONtoObject(json) {
  var object = json;
  var properties = "{" + object["properties"] + "}";
  properties = escapeJSON(properties);
  try {
    properties = JSON.parse(properties);
  }
  catch(err) {
    console.error(json);
    console.error(properties);
    console.exception(err);
  }
  object["properties"] = properties;
  return object;
}

function processLoginList() {
  if (loginList == null || tabs.activeTab == null) {
    return
  }
  var host = getHostFromURL(tabs.activeTab.url);
  userList = [];
  passwordList = [];
  var hits = 0
  for (var i=0; i<loginList.length; i++) {
    var entryAddress = getHostFromURL(loginList[i]["properties"]["address"])
    var entryWebsite = getHostFromURL(loginList[i]["website"])
    if (host == entryAddress || host == entryWebsite) {
      userList.push(loginList[i]["properties"]["loginname"]);
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
  fetchLoginList();
}

function mainPanelResize(width, height) {
  mainPanel.resize(width, height);
}

function settingsPanelResize(width, height) {
  settingsPanel.resize(width, height);
}

function addPanelResize(width, height) {
  addPanel.resize(width, height);
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
