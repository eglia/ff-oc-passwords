var textTitle = document.getElementById("title");
var textUser = document.getElementById("user");
var buttonSave = document.getElementById("save");
var buttonCancel = document.getElementById("cancel");

function resizeInit() {
  self.port.emit("resize", -1, -1);
}

function resize() {
  self.port.emit("resize", document.documentElement.scrollWidth + 10, document.documentElement.scrollHeight + 10);
}

function saveLogin() {
  self.port.emit("saveLogin");
}

function cancelLogin() {
  self.port.emit("cancelLogin");
}

function show(title, user) {
  textTitle.textContent = title;
  textUser.textContent = user;
  resizeInit();
}

self.port.on("show", show);
self.port.on("resize", resize);
buttonSave.addEventListener("click", saveLogin);
buttonCancel.addEventListener("click", cancelLogin);

