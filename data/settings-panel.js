var inputHost = document.getElementById("host");
var inputUser = document.getElementById("user");
var inputPassword = document.getElementById("password");
var inputTimer = document.getElementById("timer");
var inputSave = document.getElementById("save");
var inputCancel = document.getElementById("cancel");
var inputRemember = document.getElementById("remember");
var warningRemember = document.getElementById("rememberWarning");
var warningHost = document.getElementById("hostWarning");

inputSave.addEventListener("click", saveSettings);

function saveSettings() {
  self.port.emit("saveSettings", inputHost.value, inputUser.value, inputPassword.value, inputTimer.value, inputRemember.checked);
}

inputCancel.addEventListener("click", cancelSettings);

function cancelSettings() {
  self.port.emit("cancelSettings");
}

inputRemember.addEventListener("change", rememberToggled);

function rememberToggled() {
  if (inputRemember.checked) {
    warningRemember.style.display = "table-row";
  }
  else {
    warningRemember.style.display = "none";
  }
  self.port.emit("resize", window.innerWidth, document.documentElement.clientHeight);
}

inputHost.addEventListener("change", hostChanged);

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

self.port.on("show", show);
function show(host, user, password, timer) {
  inputHost.value = host;
  inputUser.value = user;
  inputPassword.value = password;
  inputTimer.value = timer;
  if (password == "") {
    inputRemember.checked = false;
  }
  else {
    inputRemember.checked = true;
  }
  self.port.emit("resize", window.innerWidth, document.documentElement.clientHeight);
}
