"use strict";

var util_module = require('util');
var fs_module = require('fs');
var handlebars = require('handlebars');
var Renderer = require('../lib/renderer');

/**
 * Renders a view as html via the Mu2 module
 */
var HandlebarsRenderer = module.exports = function HandlebarsRenderer () {
	Renderer.call(this);
};

util_module.inherits(HandlebarsRenderer, Renderer);

/**
 * Cache the compiled views in a "path => function" mapping
 * 
 * @type {Object}
 */
var compiled_views = {};

/**
 * Requests the provided template to be rendered
 * 
 * @param  {string} template
 */
HandlebarsRenderer.prototype.render = function (template) {
	var _self = this;

	if (typeof compiled_views[template] === "undefined" || compiled_views[template] === null) {
		var stream = fs_module.createReadStream(template + '.html');

		var buffer = '';
		stream.on('readable', function () {
			buffer += stream.read();
		});

		stream.on('end', function () {
			compiled_views[template] = handlebars.compile(buffer);
			_self.executeTemplate(template);
		});

		stream.on('error', function (err) {
			_self._error(err, template);
		});
	} else {
		process.nextTick(function () {
			_self.executeTemplate(template);
		});
	}
};

/**
 * 
 * @param  {[type]} template [description]
 * @return {[type]}          [description]
 */
HandlebarsRenderer.prototype.executeTemplate = function (template) {
	try {
		this.response.write(compiled_views[template](this.data));
	} catch (error) {
		this._error(error, template);
	}
	this._end();
	this.response.end();
};
