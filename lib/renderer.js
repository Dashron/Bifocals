"use strict";

/**
 * Base object to handle rendering view data
 */
var Renderer = module.exports = function Renderer() {
	this.response = {};
	this.data = {};
};

Renderer.prototype.response = null;
Renderer.prototype.data = null;

Renderer.prototype._error = function renderer_defaultError(err) {
	// In case the error is called before the error handler is applied, we mess with the function so we still get output
	this.error = function (fn) {
		process.nextTick(function () {
			fn(err);
		});
		return this;
	};
};
Renderer.prototype._end = function renderer_defaultEnd() {
	this.end = function (fn) {
		process.nextTick(fn);
		return this;
	};
};

/**
 * Assigns a function to be called any time an error occurs in the renderer
 * 
 * @param  {Function} fn takes a single parameter, the error
 * @return {Renderer} this, used for chaining
 */
Renderer.prototype.error = function renderer_error(fn) {
	this._error = fn;
	return this;
};

/**
 * Assigns a function to be called when the rendering ends
 * 
 * @return {Renderer} this, used for chaining
 */
Renderer.prototype.end = function renderer_end(fn) {
	this._end = fn;
	return this;
};