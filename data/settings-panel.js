var inputHost = document.getElementById("host");
var inputUser = document.getElementById("user");
var inputPassword = document.getElementById("password");
var inputTimer = document.getElementById("timer");
var inputSave = document.getElementById("save");
var inputCancel = document.getElementById("cancel");
var inputRemember = document.getElementById("remember");
var inputIncludeName = document.getElementById("includeName");
var inputIgnoreProtocol = document.getElementById("ignoreProtocol");
var inputIgnoreSubdomain = document.getElementById("ignoreSubdomain");
var inputIgnorePath = document.getElementById("ignorePath");
var warningRemember = document.getElementById("rememberWarning");
var warningHost = document.getElementById("hostWarning");

function saveSettings() {
  var settings = {
    "databaseHost": inputHost.value,
    "databaseUser": inputUser.value,
    "databasePassword": inputPassword.value,
    "refreshTimer": inputTimer.value,
    "rememberLogin": inputRemember.checked,
    "includeName": inputIncludeName.checked,
    "ignoreProtocol": inputIgnoreProtocol.checked,
    "ignoreSubdomain": inputIgnoreSubdomain.checked,
    "ignorePath": inputIgnorePath.checked
  };
  self.port.emit("saveSettings", settings);
}

function cancelSettings() {
  self.port.emit("cancelSettings");
}

function resizeInit() {
  self.port.emit("resize", -1, -1);
}

function resize() {
  self.port.emit("resize", document.documentElement.scrollWidth + 10, document.documentElement.scrollHeight + 10);
}

function rememberToggled() {
  if (inputRemember.checked) {
    warningRemember.style.display = "table-row";
  }
  else {
    warningRemember.style.display = "none";
  }
  resizeInit();
}

function hostChanged() {
  var scheme = inputHost.value.substr(0, 5);
  if (scheme !== "https") {
    warningHost.style.display = "table-row";
  }
  else {
    warningHost.style.display = "none";
  }
  resizeInit();
}

function show(settings) {
  inputHost.value = settings["databaseHost"];
  inputUser.value = settings["databaseUser"];
  inputPassword.value = settings["databasePassword"];
  inputTimer.value = settings["refreshTimer"];
  if (settings["databasePassword"] === "") {
    inputRemember.checked = false;
    warningRemember.style.display = "none";
  }
  else {
    inputRemember.checked = true;
    warningRemember.style.display = "table-row";
  }
  inputIncludeName.checked = settings["includeName"];
  inputIgnoreProtocol.checked = settings["ignoreProtocol"];
  inputIgnoreSubdomain.checked = settings["ignoreSubdomain"];
  inputIgnorePath.checked = settings["ignorePath"];
  hostChanged();
}

self.port.on("show", show);
self.port.on("resize", resize);
inputSave.addEventListener("click", saveSettings);
inputCancel.addEventListener("click", cancelSettings);
inputRemember.addEventListener("change", rememberToggled);
inputHost.addEventListener("change", hostChanged);

