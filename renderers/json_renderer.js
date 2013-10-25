"use strict";

/**
* json_renderer.js
* Copyright(c) 2012 Aaron Hedges <aaron@dashron.com>
* MIT Licensed
 */

var http_module = require('http');
var util_module = require('util');
var Renderer = require('bifocals').Renderer;

/**
 * Renders a view as html via the Mu2 module
 */
var JsonRenderer = module.exports = function JsonRenderer () {
	Renderer.call(this);
};

util_module.inherits(JsonRenderer, Renderer);

/**
 * Requests the provided json to be output
 * 
 * @param  {string} template
 */
JsonRenderer.prototype.render = function (template) {
	var _self = this;

	if (this.response instanceof http_module.ServerResponse) {
		this.response.setHeader('Content-Type', 'application/json');
		this.response.status_code = 200;
	}

	try {
		var fn = this.template(template + '.js');
		var object = fn(this.data);
		if (this.response instanceof http_module.ServerResponse) {
			object = JSON.stringify(object);
		}
		
		this.response.write(object);
	} catch (error) {
		this._error(error, template);
	}
	this._end();
	this.response.end();
};

JsonRenderer.prototype.template = function (template) {
	if (template[0] !== '/') {
		template = this.dir + template;
	}
				
	return require(template + '.js');
};
