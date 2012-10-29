"use strict";

var fs_module = require('fs');
var util_module = require('util');
var Renderer = require('../bifocals').Renderer;

// flat file renderer
var FileRenderer = module.exports = function FileRenderer() {
	Renderer.call(this);
};

util_module.inherits(FileRenderer, Renderer);

FileRenderer.prototype.render = function (template) {
	var _self = this;

	var stream = fs_module.createReadStream(template);
	stream.on('data', function (data) {
		_self.response.write(data);
	});

	stream.on('error', function (err) {
		_self._error(err);
	});

	stream.on('end', function () {
		_self.response.end();
	});
};
