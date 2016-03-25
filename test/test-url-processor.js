var urlProcessor = require("../lib/url-processor.js");

exports["testKeepAll"] = function(assert) {
  assert.ok(urlProcessor.processURL("https://sub.example.co.uk/path/subpath/", false, false, false) ===
                                    "https://sub.example.co.uk/path/subpath", "testKeepAll");
}

exports["testStripProtocol"] = function(assert) {
  assert.ok(urlProcessor.processURL("https://sub.example.co.uk/path/subpath/", true, false, false) ===
                                    "sub.example.co.uk/path/subpath", "testStripProtocol");
}

exports["testStripSubdomain"] = function(assert) {
  assert.ok(urlProcessor.processURL("https://sub.example.co.uk/path/subpath/", false, true, false) ===
                                    "https://example.co.uk/path/subpath", "testStripSubdomain");
}

exports["testStripPath"] = function(assert) {
  assert.ok(urlProcessor.processURL("https://sub.example.co.uk/path/subpath/", false, false, true) ===
                                    "https://sub.example.co.uk", "testStripPath");
}

exports["testStripAll"] = function(assert) {
  assert.ok(urlProcessor.processURL("https://sub.example.co.uk/path/subpath/", true, true, true) ===
                                    "example.co.uk", "testStripAll");
}

require("sdk/test").run(exports);
