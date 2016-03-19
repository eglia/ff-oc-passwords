var textTitle = document.getElementById("title");
var textUser = document.getElementById("user");
var buttonSave = document.getElementById("save");
var buttonCancel = document.getElementById("cancel");

buttonSave.addEventListener("click", saveLogin);

function saveLogin() {
  self.port.emit("saveLogin");
}

buttonCancel.addEventListener("click", cancelLogin);

function cancelLogin() {
  self.port.emit("cancelLogin");
}

self.port.on("show", show);
function show(title, user) {
  textTitle.innerHTML = title;
  textUser.innerHTML = user;
  self.port.emit("resize", window.innerWidth, document.documentElement.clientHeight);
}
