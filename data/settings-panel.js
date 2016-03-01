var inputHost = document.getElementById("host");
var inputUser = document.getElementById("user");
var inputPassword = document.getElementById("password");
var inputTimer = document.getElementById("timer");
var inputSave = document.getElementById("save");
var inputCancel = document.getElementById("cancel");

inputSave.addEventListener("click", saveSettings);

function saveSettings() {
  self.port.emit("saveSettings", inputHost.value, inputUser.value, inputPassword.value, inputTimer.value);
}

inputCancel.addEventListener("click", cancelSettings);

function cancelSettings() {
  self.port.emit("cancelSettings");
}

self.port.on("show", show);

function show(host, user, password, timer) {
  inputHost.value = host;
  inputUser.value = user;
  inputPassword.value = password;
  inputTimer.value = timer;
  self.port.emit("resize", document.documentElement.clientWidth, document.documentElement.clientHeight);
}
