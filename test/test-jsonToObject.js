var api = require("../lib/api.js");

exports["testParse"] = function(assert) {
  var input = {'attr': "value", "properties":
    "\'prop1\': \'propval1\', " +
    "\'prop2\": \"prop\'\"\n\t\\val2\""
  };
  var output = {"attr": "value", "properties": {
      "prop1": "propval1",
      "prop2": "prop\'\"\n\t\\val2"
    }
  };
  assert.ok(JSON.stringify(api.jsonToObject(input)) == JSON.stringify(output), "testParse");
}

require("sdk/test").run(exports);
