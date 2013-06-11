/*
* bifocals.js
* Copyright(c) 2012 Aaron Hedges <aaron@dashron.com>
* MIT Licensed
*/
"use strict";

var _renderers = {};

/**
 * Registers a renderer object to a content type
 * 
 * @param {string} content_type The content type (or mime type) of the request
 * @param {Renderer} renderer     The renderer object that will handle view data
 */
exports.addRenderer = function addRenderer(content_type, renderer) {
	_renderers[content_type] = renderer;
};

/**
 * Returns a renderer for a content type
 * 
 * @param  {string} content_type The content type (or mime type) of the request
 * @return {Renderer}              The renderer associated with the content type
 * @throws {Error} If a renderer has not been added to the content_type
 */
exports.getRenderer = function getRenderer(content_type) {
	if (_renderers[content_type]) {
		return _renderers[content_type];
	} else {
		throw new Error('Unsupported content type :' + content_type);
	}
};

/**
 * Express middleware.
 * 
 * var bifocals_module = require('bifocals');
 * 
 * app.use(bifocals_module.__express({
 *	app : app
 * }));
 *
 * 
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
module.exports.__express = function (options) {
	// lazy load, to help modularize some parts the library.
	var middleware = require('./lib/express_extensions').middleware;
	module.exports.__express = middleware;
	return middleware(options);
};

/**
 * [Bifocals description]
 * @type {[type]}
 */
module.exports.Bifocals = require('./lib/bifocals');

/**
 * [Renderer description]
 * @type {[type]}
 */
module.exports.Renderer = require('./lib/renderer');

/**
 * [render_states description]
 * @type {[type]}
 */
var render_states = exports.RENDER_STATES = {
	RENDER_NOT_CALLED : 0,
	RENDER_REQUESTED : 1,
	RENDER_STARTED : 2,
	RENDER_COMPLETE : 3,
	RENDER_FAILED : 4,
	RENDER_CANCELED : 5
};