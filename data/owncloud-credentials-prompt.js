var inputUser = document.getElementById("user");
var inputPassword = document.getElementById("password");
var inputSave = document.getElementById("save");
var inputCancel = document.getElementById("cancel");

inputSave.addEventListener("click", saveOwncloudCredentials);

function saveOwncloudCredentials() {
  self.port.emit("saveOwncloudCredentials", inputUser.value, inputPassword.value);
}

inputCancel.addEventListener("click", cancelOwncloudCredentials);

function cancelOwncloudCredentials() {
  self.port.emit("cancelOwncloudCredentials");
}

self.port.emit("resizeOwncloudCredentials", document.documentElement.clientWidth, document.documentElement.clientHeight);
