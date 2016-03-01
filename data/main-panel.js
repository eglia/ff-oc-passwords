var buttonSettings = document.getElementById("buttonSettings");
var buttonRefresh = document.getElementById("buttonRefresh");
var divLogins = document.getElementById("divLogins");
var textTotalLogins = document.getElementById("textTotalLogins");

buttonSettings.addEventListener("click", buttonSettingsClick);

function buttonSettingsClick() {
  self.port.emit("settingsClicked");
}

buttonRefresh.addEventListener("click", buttonRefreshClick);

function buttonRefreshClick() {
  self.port.emit("refreshClicked");
  buttonRefresh.childNodes[0].nodeValue = "Working...";
  buttonRefresh.disabled = true;
}

self.port.on("refreshFinished", refreshFinished);

function refreshFinished() {
  buttonRefresh.childNodes[0].nodeValue = "Refresh";
  buttonRefresh.disabled = false;
}

self.port.on("updateLogins", updateLogins);

function updateLogins(logins, numTotalLogins) {
  while (divLogins.firstChild) {
    divLogins.removeChild(divLogins.firstChild);
  }
  for (var i=0; i<logins.length; i++) {
    var btn = document.createElement("button");
    var t = document.createTextNode(logins[i]);
    btn.id = i;
    btn.style.border = "1px solid";
    btn.appendChild(t);
    divLogins.appendChild(btn);
    var createClickHandler = 
      function(clickedLogin) {
        return function() { 
          //console.log("id:" + clickedLogin.id);
          self.port.emit("loginClicked", clickedLogin.id);
      };
    };
    btn.onclick = createClickHandler(btn);
  }
  if (logins.length == 0) {
    var t = document.createTextNode("No logins found for this site");
    divLogins.appendChild(t);
  }
  textTotalLogins.removeChild(textTotalLogins.firstChild);
  var t = document.createTextNode(numTotalLogins + " logins in database");
  textTotalLogins.appendChild(t);
  self.port.emit("resize", document.documentElement.clientWidth, document.documentElement.clientHeight);
}

self.port.on("show", show);

function show() {
  self.port.emit("resize", document.documentElement.clientWidth, document.documentElement.clientHeight);
}
