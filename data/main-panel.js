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
  if (logins.length == 0) {
    var t = document.createTextNode("No logins found for this site");
    divLogins.appendChild(t);
  } else {
    var table = document.createElement("table");
    for (var i=0; i<logins.length; i++) {
      var row = document.createElement("tr");
      var col0 = document.createElement("td");
      var col1 = document.createElement("td");
      var col2 = document.createElement("td");
      var col0Text = document.createTextNode(logins[i]);
      col0.appendChild(col0Text);
      row.appendChild(col0);
      var fillButton = document.createElement("button");
      var fillButtonText = document.createTextNode("Fill");
      fillButton.appendChild(fillButtonText);
      fillButton.name = i;
      fillButton.style.border = "1px solid";
      var createClickHandler =
        function(clickedLogin) {
          return function() {
            self.port.emit("loginClicked", clickedLogin.name);
          };
        };
      fillButton.onclick = createClickHandler(fillButton);
      col1.appendChild(fillButton);
      row.appendChild(col1);
      var copyButton = document.createElement("button");
      var copyButtonText = document.createTextNode("Copy");
      copyButton.appendChild(copyButtonText);
      copyButton.name = i;
      copyButton.style.border = "1px solid";
      var createClickHandler =
        function(clickedLogin) {
          return function() {
            self.port.emit("copyClicked", clickedLogin.name);
          };
        };
      copyButton.onclick = createClickHandler(copyButton);
      col2.appendChild(copyButton);
      row.appendChild(col2);
      table.appendChild(row);
    }
    divLogins.appendChild(table)
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
