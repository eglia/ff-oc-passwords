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
  self.port.emit("saveSettings", inputHost.value, inputUser.value, inputPassword.value, inputTimer.value, inputRemember.checked,
                 inputIncludeName.checked, inputIgnoreProtocol.checked, inputIgnoreSubdomain.checked, inputIgnorePath.checked);
}

function cancelSettings() {
  self.port.emit("cancelSettings");
}

function rememberToggled() {
  if (inputRemember.checked) {
    warningRemember.style.display = "table-row";
  }
  else {
    warningRemember.style.display = "none";
  }
  self.port.emit("resize", window.innerWidth, document.documentElement.clientHeight);
}

function hostChanged() {
  var scheme = inputHost.value.substr(0, 5);
  if (scheme != "https") {
    warningHost.style.display = "table-row";
  }
  else {
    warningHost.style.display = "none";
  }
  self.port.emit("resize", window.innerWidth, document.documentElement.clientHeight);
}

function show(host, user, password, timer, includeName, ignoreProtocol, ignoreSubdomain, ignorePath) {
  inputHost.value = host;
  inputUser.value = user;
  inputPassword.value = password;
  inputTimer.value = timer;
  if (password === "") {
    inputRemember.checked = false;
    warningRemember.style.display = "none";
  }
  else {
    inputRemember.checked = true;
    warningRemember.style.display = "table-row";
  }
  inputIncludeName.checked = includeName;
  inputIgnoreProtocol.checked = ignoreProtocol;
  inputIgnoreSubdomain.checked = ignoreSubdomain;
  inputIgnorePath.checked = ignorePath;
  hostChanged();
}

self.port.on("show", show);
inputSave.addEventListener("click", saveSettings);
inputCancel.addEventListener("click", cancelSettings);
inputRemember.addEventListener("change", rememberToggled);
inputHost.addEventListener("change", hostChanged);

