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

pageMod.PageMod({
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

function strength_func(Password) {
  var charInStr;
  var strength_calc;
  var passwordLength;
  var hasLowerCase;
  var hasUpperCase;
  var hasNumber;
  var hasSpecialChar1;
  var hasSpecialChar2;
  var hasSpecialChar3;
  var hasSpecialChar4;
  var charInt;

  passwordLength = Password.length;

  strength_calc = 0;

  // check length
  switch(true) {
    case passwordLength >= 8:
      //strength_calc = 1;
      break;
    case passwordLength <= 4:
      // password smaller than 5 chars is always bad
      return 0;
      break;
  }

  // loop ONCE through password
  for (var i = 1; i < passwordLength + 1; i++) {
    
    charInStr = Password.slice(i, i + 1);
    charInt = charInStr.charCodeAt(0);

    switch(true) {
      case charInt >= 97 && charInt <= 122:
        if (!hasLowerCase) {
          strength_calc = strength_calc + 1;
          hasLowerCase = true;
        }
        break;
      case charInt >= 65 && charInt <= 90:
        if (!hasUpperCase) {
          strength_calc = strength_calc + 1;
          hasUpperCase = true;
        }
        break;
      case charInt >= 48 && charInt <= 57:
        if (!hasNumber) {
          strength_calc = strength_calc + 1;
          hasNumber = true;
        }
        break;
      case charInt >= 33 && charInt <= 47:
        if (!hasSpecialChar1) {
          strength_calc = strength_calc + 1;
          hasSpecialChar1 = true;
        }
        break;
      case charInt >= 58 && charInt <= 64:
        if (!hasSpecialChar2) {
          strength_calc = strength_calc + 1;
          hasSpecialChar2 = true;
        }
        break;
      case charInt >= 91 && charInt <= 96:
        if (!hasSpecialChar3) {
          strength_calc = strength_calc + 1;
          hasSpecialChar3 = true;
        }
        break;
      case charInt >= 123 && charInt <= 255:
        if (!hasSpecialChar4) {
          strength_calc = strength_calc + 1;
          hasSpecialChar4 = true;
        }
        break;
    }

  }
  
  strength_calc = strength_calc + (Math.floor(passwordLength / 8) * ((hasLowerCase ? 1 : 0) + (hasUpperCase ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecialChar1 ? 1 : 0) + (hasSpecialChar2 ? 1 : 0) + (hasSpecialChar3 ? 1 : 0) + (hasSpecialChar4 ? 1 : 0)));
  
  var power = 6;
  strength_calc = strength_calc + Math.round(Math.pow(passwordLength, power) / Math.pow(10, power + 1));

  return strength_calc;
}

function strHasLower(str) {
  return str.toUpperCase() != str;
}
function strHasUpper(str) {
  return str.toLowerCase() != str;
}
function strHasNumber(str) {
  var regex = /\d/g;
  return regex.test(str);
}
function strHasSpecial(str) {

  var number;

  for (var i = 0; i < str.length; i++) {
  
    number = 0;
    number = str.substring(i, i + 1).charCodeAt(0);

    switch(true) {
      case number === 33:
      case number >= 35 && number <= 36:
      case number === 38:
      case number >= 40 && number <= 41:
      case number === 43:
      case number >= 45 && number <= 47:
      case number >= 58 && number <= 60:
      case number >= 62 && number <= 64:
      case number === 95:
        return true;
        break;
    }

  }

  // no special chars
  return false;
}

function passwordMined(url, user, password) {
  if (loginList == null) {
    return
  }
  var host = getHostFromURL(url);
  var userList = [];
  var passwordList = [];
  var idList = [];
  var hits = 0;
  var title = "";
  for (var i=0; i<loginList.length; i++) {
    var entryProperties = "{" + loginList[i]["properties"] + "}";
    entryProperties = escapeJSON(entryProperties);
    entryProperties = JSON.parse(entryProperties);
    var entryAddress = getHostFromURL(entryProperties["address"])
    var entryWebsite = getHostFromURL(loginList[i]["website"])
    if (host == entryAddress || host == entryWebsite) {
      userList.push(entryProperties["loginname"]);
      passwordList.push(loginList[i]["pass"]);
      idList.push(loginList[i]["id"]);
      hits = hits + 1;
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
  var d = new Date();
  // date as YYYY-MM-DD
  var changedDate = d.getFullYear()
    + "-" + ('0' + (d.getMonth() + 1)).slice(-2)
    + "-" + ('0' + d.getDate()).slice(-2);

  var data = {
    "pass": minedPassword,
    "properties": 
      "\"strength\": \"" + strength_func(minedPassword) + "\", " +
      "\"length\": \"" + minedPassword.length + "\", " +
      "\"lower\": \"" + ~~strHasLower(minedPassword) + "\", " +
      "\"upper\": \"" + ~~strHasUpper(minedPassword) + "\", " +
      "\"number\": \"" + ~~strHasNumber(minedPassword) + "\", " +
      "\"special\": \"" + ~~strHasSpecial(minedPassword) + "\", " +
      "\"datechanged\": \"" + changedDate + "\"",
    "deleted": "0"
  };
  var encodedLogin = base64.encode(databaseUser + ":" + databasePassword);
  var apiRequest = new xhr.XMLHttpRequest({"mozAnon": true});
  apiRequest.addEventListener("load", fetchLoginList);
  if (minedMatchingID == -1) {
    data["website"] = getHostFromURL(minedURL);
    data["properties"] = data["properties"] + ", " +
      "\"notes\": \"\", " +
      "\"category\": \"0\", " +
      "\"loginname\": \"" + minedUser + "\", " +
      "\"address\": \"" + minedURL + "\"";
    apiRequest.open("POST", databaseHost + "/index.php/apps/passwords/api/0.1/passwords");
  }
  else {
    apiRequest.open("PATCH", databaseHost + "/index.php/apps/passwords/api/0.1/passwords/" + minedMatchingID);
  }
  apiRequest.setRequestHeader("Authorization", "Basic " + encodedLogin);
  apiRequest.setRequestHeader("Content-Type", "application/json");
  apiRequest.send(JSON.stringify(data));
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
        console.error(response.status, response.json);
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
  returnText = returnText.replace(/\r/g, "\\r");
  returnText = returnText.replace(/\t/g, "\\t");
  returnText = returnText.replace(/\f/g, "\\f");
  returnText = returnText.replace(/\'/g, "\"");
  returnText = returnText.replace(/'/g, "\"");
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

function processLoginList() {
  if (loginList == null || tabs.activeTab == null) {
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
