var textTitle = document.getElementById("title");
var textUser = document.getElementById("user");
var buttonSave = document.getElementById("save");
var buttonCancel = document.getElementById("cancel");

function saveLogin() {
  self.port.emit("saveLogin");
}

function cancelLogin() {
  self.port.emit("cancelLogin");
}

function show(title, user) {
  textTitle.textContent = title;
  textUser.textContent = user;
  self.port.emit("resize", window.innerWidth, document.documentElement.clientHeight);
}

self.port.on("show", show);
buttonSave.addEventListener("click", saveLogin);
buttonCancel.addEventListener("click", cancelLogin);

