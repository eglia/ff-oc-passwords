var self = require("sdk/self");
var system = require("sdk/system");
var tabs = require("sdk/tabs");
var simplePrefs = require("sdk/simple-prefs");
var passwords = require("sdk/passwords");
var timers = require("sdk/timers");
var pageMod = require("sdk/page-mod");

var urlProcessor = require("./lib/url-processor.js");
var api = require("./lib/api.js");

var databaseHost = null;
var databaseUser = null;
var databasePassword = null;
var loginList = null;
var userList = [];
var passwordList = [];
var mobile = system.platform === "android";
var refreshInterval = null;
var minedURL = null;
var minedUser = null;
var minedPassword = null;
var minedMatchingID = null;
var passwordMiner = null;
var clipBoardCountdown = 0;
var clipBoardCountdownTimer = null;

if (!mobile) {
  var ui = require("sdk/ui");
  var panel = require("sdk/panel");
  var clipboard = require("sdk/clipboard");

  var mainButton = new ui.ToggleButton({
    id: "owncloudPasswordButton",
    label: "ownCloud Passwords",
    icon: "./app_black.png"
  });
  var mainPanel = new panel.Panel({
    contentURL: self.data.url("main-panel.html"),
    contentScriptFile: self.data.url("main-panel.js")
  });
  var settingsPanel = new panel.Panel({
    contentURL: self.data.url("settings-panel.html"),
    contentScriptFile: self.data.url("settings-panel.js")
  });
  var addPanel = new panel.Panel({
    contentURL: self.data.url("add-panel.html"),
    contentScriptFile: self.data.url("add-panel.js")
  });
}

if (mobile) {
  var Services = require("resource://gre/modules/Services.jsm").Services;
  var NativeWindow = Services.wm.getMostRecentWindow("navigator:browser").NativeWindow;

  var settingsPanelWorker = null;
  var parentMenu = null;
  var settingsMenu = null;
  var refreshMenu = null;
  var fillMenuElements = []; 
}

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

function populateFillMenu() {
  for (var i=0; i<fillMenuElements.length; i++) {
    NativeWindow.menu.remove(fillMenuElements[i]);
  }
  fillMenuElements = [];
  for (var j=0; j<userList.length; j++) {
    fillMenuElements[j] = NativeWindow.menu.add({
      name: userList[j],
      parent: parentMenu,
      callback: (function() {
         var tmp = j;
         return function() {
           fillMenuTapped(tmp);
         };
      }())
    });
  }
}

function cleanup() {
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
  if (clipBoardCountdownTimer != null) {
    timers.clearTimeout(clipBoardCountdownTimer);
  }
  timers.clearInterval(refreshInterval);
  passwordMiner.destroy();
}

function passwordMined(url, user, password) {
  if (loginList === null) {
    return;
  }
  var host = urlProcessor.processURL(url, simplePrefs.prefs["ignoreProtocol"],
                                     simplePrefs.prefs["ignoreSubdomain"], simplePrefs.prefs["ignorePath"]);
  var userList = [];
  var passwordList = [];
  var idList = [];
  var title = "";
  for (var i=0; i<loginList.length; i++) {
    var entryAddress = urlProcessor.processURL(loginList[i]["properties"]["address"], simplePrefs.prefs["ignoreProtocol"],
                                               simplePrefs.prefs["ignoreSubdomain"], simplePrefs.prefs["ignorePath"]);
    var entryWebsite = urlProcessor.processURL(loginList[i]["website"], simplePrefs.prefs["ignoreProtocol"],
                                               simplePrefs.prefs["ignoreSubdomain"], simplePrefs.prefs["ignorePath"]);
    if (host === entryAddress || simplePrefs.prefs["includeName"] && host === entryWebsite) {
      userList.push(loginList[i]["properties"]["loginname"]);
      passwordList.push(loginList[i]["pass"]);
      idList.push(loginList[i]["id"]);
    }
  }
  minedMatchingID = -1;
  title = "Detected new login:";
  for (var i=0; i<userList.length; i++) {
    if (userList[i] === user) {
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
  if (minedMatchingID === -1) {
    api.create(databaseHost, databaseUser, databasePassword, minedUser, minedPassword,
               urlProcessor.processURL(minedURL, true, true, true), minedURL, "", fetchLoginList);
  }
  else {
    api.fetchSingle(databaseHost, databaseUser, databasePassword, minedMatchingID, replaceLogin);
  }
}

function replaceLogin(data) {
  api.update(databaseHost, databaseUser, databasePassword, minedMatchingID, data["properties"]["loginname"], data["pass"],
             data["website"], data["properties"]["address"], data["properties"]["notes"], data["properties"]["datechanged"],
             "1");
  
  api.create(databaseHost, databaseUser, databasePassword, data["properties"]["loginname"], minedPassword,
             data["website"], data["properties"]["address"], data["properties"]["notes"], fetchLoginList);
}

function cancelLogin() {
  if (!mobile) {
    addPanel.hide();
  }
}

function saveSettingsPanel(host, user, password, timer, remember, includeName, ignoreProtocol, ignoreSubdomain, ignorePath) {
  if (!mobile) {
    settingsPanel.hide();
  }
  else {
    tabs.activeTab.close();
  }
  if (host.slice(-1) === "/") {
    host = host.slice(0, -1);
  }
  simplePrefs.prefs["databaseHost"] = host;
  simplePrefs.prefs["refreshTimer"] = parseInt(timer);
  simplePrefs.prefs["includeName"] = includeName;
  simplePrefs.prefs["ignoreProtocol"] = ignoreProtocol;
  simplePrefs.prefs["ignoreSubdomain"] = ignoreSubdomain;
  simplePrefs.prefs["ignorePath"] = ignorePath;
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
  if (state.checked === true) {
    if (databaseUser === null || databasePassword === null) {
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
  if (!mobile) {
    mainPanel.port.emit("refreshStarted");
  }
  api.fetchAll(databaseHost, databaseUser, databasePassword, fetchLoginListCallback);
}

function processLoginList() {
  if (loginList === null || tabs.activeTab === null) {
    return;
  }
  var host = urlProcessor.processURL(tabs.activeTab.url, simplePrefs.prefs["ignoreProtocol"],
                                     simplePrefs.prefs["ignoreSubdomain"], simplePrefs.prefs["ignorePath"]);
  userList = [];
  passwordList = [];
  var hits = 0
  for (var i=0; i<loginList.length; i++) {
    var entryAddress = urlProcessor.processURL(loginList[i]["properties"]["address"], simplePrefs.prefs["ignoreProtocol"],
                                               simplePrefs.prefs["ignoreSubdomain"], simplePrefs.prefs["ignorePath"]);
    var entryWebsite = urlProcessor.processURL(loginList[i]["website"], simplePrefs.prefs["ignoreProtocol"],
                                               simplePrefs.prefs["ignoreSubdomain"], simplePrefs.prefs["ignorePath"]);
    if (host === entryAddress || simplePrefs.prefs["includeName"] && host === entryWebsite) {
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

function fetchLoginListCallback(value) {
  if (!mobile) {
    mainPanel.port.emit("refreshFinished");
  }
  loginList = value;
  processLoginList();
}

function mainPanelLoginClicked(id) {
  var worker = tabs.activeTab.attach({
    contentScriptFile: self.data.url("fill-password.js")
  });
  worker.port.emit("fillPassword", userList[id], passwordList[id]);
}

function mainPanelCopyClicked(id) {
  if (clipBoardCountdownTimer != null) {
    timers.clearTimeout(clipBoardCountdownTimer);
  }
  clipboard.set(passwordList[id]);
  clipBoardCountdown = 10;
  mainPanel.port.emit("clipBoardCountdown", clipBoardCountdown);
  clipBoardCountdownTimer = timers.setTimeout(clearClipboardCountdown, 1000);
}

function clearClipboardCountdown() {
  clipBoardCountdown -= 1;
  mainPanel.port.emit("clipBoardCountdown", clipBoardCountdown);
  if (clipBoardCountdown === 0) {
    clipboard.set("");
    clipBoardCountdownTimer = null;
  }
  else {
    clipBoardCountdownTimer = timers.setTimeout(clearClipboardCountdown, 1000);
  }
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
  var includeName = simplePrefs.prefs["includeName"];
  var ignoreProtocol = simplePrefs.prefs["ignoreProtocol"];
  var ignoreSubdomain = simplePrefs.prefs["ignoreSubdomain"];
  var ignorePath = simplePrefs.prefs["ignorePath"];
  var databaseUser = ""
  var databasePassword = ""
  if (credentials.length > 0) {
    databaseUser = credentials[0].username;
    databasePassword = credentials[0].password;
  }
  if (!mobile) {
    settingsPanel.port.emit("show", databaseHost, databaseUser, databasePassword, refreshTimer,
                            includeName, ignoreProtocol, ignoreSubdomain, ignorePath);
  }
  else {
    settingsPanelWorker.port.emit("show", databaseHost, databaseUser, databasePassword, refreshTimer,
                                  includeName, ignoreProtocol, ignoreSubdomain, ignorePath);
  }
}

exports.onUnload = cleanup;

passwordMiner = new pageMod.PageMod({
  include: "*",
  contentScriptFile: "./mine-password.js",
  contentScriptWhen: "ready",
  onAttach(worker) {
    worker.port.on("passwordMined", passwordMined);
  }
});

mainButton.on("change", handleMainButtonClick);
mainPanel.on("hide", handleHide);
settingsPanel.on("hide", handleHide);
addPanel.on("hide", handleHide);

tabs.on("ready", processLoginList);
tabs.on("activate", processLoginList);
tabs.on("deactivate", processLoginList);
tabs.on("open", processLoginList);

passwords.search({
  url: self.uri,
  onComplete: processCredentials
});

refreshInterval = timers.setInterval(fetchLoginList, simplePrefs.prefs["refreshTimer"]*1000);

if (mobile) {
  parentMenu = NativeWindow.menu.add({
    name: "Passwords"
  });
  settingsMenu = NativeWindow.menu.add({
    name: "Settings",
    parent: parentMenu,
    callback: menuTapHandler
  });
  refreshMenu = NativeWindow.menu.add({
    name: "Refresh",
    parent: parentMenu,
    callback: fetchLoginList
  });
}

if (!mobile) {
  settingsPanel.port.on("saveSettings", saveSettingsPanel);
  settingsPanel.port.on("cancelSettings", cancelSettingsPanel);
  mainPanel.port.on("loginClicked", mainPanelLoginClicked);
  mainPanel.port.on("copyClicked", mainPanelCopyClicked);
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
