var buttonSettings = document.getElementById("buttonSettings");
var buttonRefresh = document.getElementById("buttonRefresh");
var divLogins = document.getElementById("divLogins");
var textTotalLogins = document.getElementById("textTotalLogins");
var lastClickedCopyButton = null;

function buttonSettingsClick() {
  self.port.emit("settingsClicked");
}

function buttonRefreshClick() {
  self.port.emit("refreshClicked");
}

function refreshStarted() {
  buttonRefresh.childNodes[0].nodeValue = "Working...";
  buttonRefresh.disabled = true;
}

function refreshFinished() {
  buttonRefresh.childNodes[0].nodeValue = "Refresh";
  buttonRefresh.disabled = false;
}

function createClickHandler(event, element) {
  return function() {
    if (event === "copyClicked") {
      if (lastClickedCopyButton != null) {
        lastClickedCopyButton.childNodes[0].nodeValue = "Copy";
      }
      lastClickedCopyButton = element;
    }
    self.port.emit(event, element.name);
  };
}

function updateLogins(logins, numTotalLogins) {
  while (divLogins.firstChild) {
    divLogins.removeChild(divLogins.firstChild);
  }
  if (logins.length === 0) {
    var noLoginsText = document.createTextNode("No logins found for this site");
    divLogins.appendChild(noLoginsText);
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
      fillButton.id = "fill" + i;
      fillButton.name = i;
      fillButton.style.border = "1px solid";
      fillButton.onclick = createClickHandler("loginClicked", fillButton);
      col1.appendChild(fillButton);
      row.appendChild(col1);
      var copyButton = document.createElement("button");
      var copyButtonText = document.createTextNode("Copy");
      copyButton.appendChild(copyButtonText);
      copyButton.id = "copy" + i;
      copyButton.name = i;
      copyButton.style.border = "1px solid";
      copyButton.onclick = createClickHandler("copyClicked", copyButton);
      col2.appendChild(copyButton);
      row.appendChild(col2);
      table.appendChild(row);
    }
    divLogins.appendChild(table);
  }
  textTotalLogins.removeChild(textTotalLogins.firstChild);
  var t = document.createTextNode(numTotalLogins + " logins in database");
  textTotalLogins.appendChild(t);
  self.port.emit("resize", document.documentElement.clientWidth, document.documentElement.clientHeight);
}

function show() {
  self.port.emit("resize", document.documentElement.clientWidth, document.documentElement.clientHeight);
}

function clipBoardCountdown(count) {
  if (count > 0) {
    lastClickedCopyButton.childNodes[0].nodeValue = count;
  }
  else {
    lastClickedCopyButton.childNodes[0].nodeValue = "Copy";
  }
}

buttonSettings.addEventListener("click", buttonSettingsClick);
buttonRefresh.addEventListener("click", buttonRefreshClick);
self.port.on("refreshStarted", refreshStarted);
self.port.on("refreshFinished", refreshFinished);
self.port.on("updateLogins", updateLogins);
self.port.on("clipBoardCountdown", clipBoardCountdown);
self.port.on("show", show);

