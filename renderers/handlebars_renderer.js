var http_module = require('http');
var util_module = require('util');
var fs_module = require('fs');
var handlebars = require('handlebars');
var Renderer = require('../bifocals').Renderer;

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

	if (this.response instanceof http_module.ServerResponse) {
		this.response.setHeader('Content-Type', 'text/html');
		this.response.status_code = 200;
	}

	if (typeof compiled_views[template] == "undefined" || compiled_views[template] == null) {
		var stream = fs_module.createReadStream(template);

		var buffer = '';
		stream.on('data', function (chunk) {
			buffer += chunk;
		});

		stream.on('end', function () {
			compiled_views[template] = handlebars.compile(buffer);
			_self.executeTemplate(template);
		});

		stream.on('error', function (err) {
			_self._error(err);
		});
	} else {
		this.executeTemplate(template);
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
		this._error(error);
	}
	this._end();
	this.response.end();
};