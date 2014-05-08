/*
* bifocals.js
* Copyright(c) 2012 Aaron Hedges <aaron@dashron.com>
* MIT Licensed
*/
"use strict";

var util_module = require('util');
var root_module = require('../index');

/**
 * Renders templates with many output options, and unlimited asynchronous sub views
 * 
 * USAGE:
 * //Templates:
 * templates/index.html
 * <html>
 *  <head></head>
 *  <body>
 *   {{{header}}}
 *  </body>
 * </html>
 * 
 * templates/header.html
 * <header>
 * {{title}}
 * </header>
 * 
 * 
 * //Create the parent:
 * var view = new Bifocals(response);
 * 
 * //Create the child:
 * var child = template.child("header", "templates/header.html");
 * child.set('title, "Hello World");
 * 
 * //Write the view to the response
 * view.render();
 * 
 * //And you are done! You don't have to tell the child views to render, that is all handled for you.
 * 
 * @author Aaron Hedges <aaron@dashron.com>
 */
var Bifocals = module.exports = function Bifocals(response) {
	this._child_views = {};
	this._data = {};
	this._defaultTemplates = {};

	this.render_state = root_module.RENDER_STATES.RENDER_NOT_CALLED;
	this.parent = null;
	this.root = this;
	this._response = response;
	this._response.status_code = 200;
};

Bifocals.prototype._data = null;
Bifocals.prototype._child_views = null;
Bifocals.prototype._response = null;
Bifocals.prototype._end = function bifocals_defaultEnd(end) {};

/**
 * Error handler, any time an error occurs it will be provided to this function. Can be overridden via Bifocals.error(fn);
 * 
 * @param  {Error} error
 */
Bifocals.prototype._error = function bifocals_defaultError(error) {
	console.log(error);
	throw new Error('No error handler has been assigned to this view. Are one of your status calls erroring (404, 500, etc?). Maybe you have not set an error handler for your root template');
};

/**
 * The content type (or mime type) of the response. This is used to locate the proper renderer, and sent via headers to the client
 * Changing this will change the object used to render the final output
 * 
 * @type {String}
 */
Bifocals.prototype.content_type = null;

/**
 * The template that the view should render when complete. This is provided to the renderer along with the dir.
 * Changing this will override any previously assigned templates, and will be counted as an override for any template provided to a render call.
 * 
 * @type {String}
 */
Bifocals.prototype.template = null;

/**
 * The default directory that this view should use to locate templates
 * Changing this changes which directory templates will be loaded from when the view is done rendering
 * 
 * @type {String}
 */
Bifocals.prototype.dir = '';

/**
 * The Bifocal view that created this view as a child.
 * Changing this will alter what happens when a child element finishes rendering. On success, a child element attempts to render it's parent element.
 * 
 * @type {Bifocal}
 */
Bifocals.prototype.parent = null;

/**
 * The root Bifocal view in the chain of parent child views (aka the original view)
 * Changing this will alter what view this child will send status codes and headers too.
 * 
 * @type {Bifocal}
 */
Bifocals.prototype.root = null;

/**
 * The current state of the bifocal object, can be one of the following.
 * module.RENDER_NOT_CALLED, module.RENDER_REQUESTED, module.RENDER_STARTED,
 * module.RENDER_COMPLETE, module.RENDER_FAILED, module.RENDER_CANCELED
 * @type {Number}
 */
Bifocals.prototype.render_state = null;

/**
 * Default template to use when rendering errors
 * 
 * @type {String}
 */
Bifocals.prototype._defaultTemplates = null;

/**
 * returns whether the view has finished rendering or not
 * 
 * @returns {Boolean}
 */
Bifocals.prototype.isRendered = function bifocals_isRendered() {
	return this.render_state === root_module.RENDER_STATES.RENDER_COMPLETE;
};

/**
 * Assigns a default template to be used by certain statuses
 * @param {number} key      The status code that the template should be used for
 * @param {string} template The absolute path to the template file
 */
Bifocals.prototype.setDefaultTemplate = function bifocals_setDefaultTemplate (status, template) {
	this._defaultTemplates[status] = template;
};

/**
 * Sets data to be rendered to the view
 * 
 * @param {String} key
 * @param {mixed} value
 * @return {Bifocals} this, used for chaining
 */
Bifocals.prototype.set = function bifocals_set(key, value) {
	this._data[key] = value;
	return this;
};

/**
 * Retrieves all of the data so that it can be rendered by a parent
 * 
 * @param {String} key
 * @return {Mixed|Object}
 */
Bifocals.prototype.get = function bifocals_get(key) {
	if(typeof key === "string") {
		return this._data[key];
	}
	return this._data;
};

/**
 * If the view is ready to be rendered, this will be true, otherwise false
 * 
 * @returns {Boolean}
 */
Bifocals.prototype.canRender = function bifocals_canRender() {
	var key = null;

	/**
	 * This protects from items rendering in random async order
	 * example 1:
	 * parent creates child, loads data from database, then renders.
	 * child immediately renders
	 * - in this example, the child is complete first, and checks if the parent can render.
	 *    Render has not been requested, so it fails. Once the parent calls render() everything works fine
	 * 
	 * example 2:
	 * Parent creates child, then immediately renders
	 * child loads data from database then renders.
	 * - in this example, the parent is complete first, so it marks render as requested but notices child views exist
	 *    Because of this, it waits. Once the child view renders it notices that the parent is ready and immediately calls parent.render()
	 */  
	if (this.render_state !== root_module.RENDER_STATES.RENDER_REQUESTED) {
		return false;
	}

	for(key in this._child_views) { 
		if(!this._child_views[key].isRendered()) {
			return false;
		}
	}
	return true;
};

/**
 * Renders the current view, writing the the response, if and only if all child views have been completed
 * 
 * @param {String} template Renders the provided template unless one was set previously.
 * @param {Boolean} force Kills all child elements and forces the template to be rendered immediately. default: false
 */
Bifocals.prototype.render = function bifocals_render(template, force) {
	var _self = this;
	if (!force) {
		// If rendering has been canceled before we try to render, do nothing
		if (_self.render_state === root_module.RENDER_STATES.RENDER_CANCELED) {
			return;
		}

		_self.render_state = root_module.RENDER_STATES.RENDER_REQUESTED;

		if (_self.canRender()) {
			_self.render_state = root_module.RENDER_STATES.RENDER_STARTED;
			// We want to prefer the pre-set template over the render(template)
			if (_self.template) {
				template = _self.template;
			}

			var renderer = root_module.getRenderer(_self.content_type);

			// todo: Try to move away from super. How do you identify a constructor?
			if (renderer.super_ === root_module.Renderer) {
				if (template[0] !== '/') {
					template = this.dir + template;
				}
				
				this.buildRenderer(renderer).render(template);
			} else {
				// express js compatible format
				renderer(_self.dir + template, _self._data, function (err, output) {
					if (err) {
						_self.render_state = root_module.RENDER_STATES.RENDER_FAILED;
						return _self._error(err);
					} else {
						_self.render_state = root_module.RENDER_STATES.RENDER_COMPLETE;
						// todo: I think this should go away
						if (_self._response.setHeader) {
							_self._response.setHeader('Content-Type', _self.content_type);
						}
						_self._response.write(output);
						_self._response.end();
						_self._end();
					}
				});
			}
		} else {
			// If a template has not yet been assigned to this view, and we can not immediately render it
			// we need to set the provided template, so it is rendered in the future
			if (!this.template) {
				this.template = template;
			}
		}
	} else {
		this.cancelRender();
		this.render_state = root_module.RENDER_STATES.RENDER_REQUESTED;
		this.template = template;
		this.render(template, false);
	}
};

/**
 * Stops a render from occurring, and attempts to stop all child elements too.
 */
Bifocals.prototype.cancelRender = function bifocals_cancelRender() {
	var key = null;
	this.render_state = root_module.RENDER_STATES.RENDER_CANCELED;

	for (key in this._child_views) {
		this._child_views[key].cancelRender();
	}
	this._child_views = {};
};

/**
 * Builds a Renderer with all necessary data pulled from the view
 * 
 * @return {Renderer}
 */
Bifocals.prototype.buildRenderer = function bifocals_buildRenderer(RendererConstructor) {
	var _self = this;

	var renderer = new RendererConstructor();
	renderer.data = this._data;
	renderer.response = this._response;
	renderer.error(function (error, template) {
		_self.render_state = root_module.RENDER_STATES.RENDER_FAILED;

		// If the template is the default 500 template, don't get stuck in an infinite loop. Log the issue and stop trying to error.
		if (template === _self._defaultTemplates[500]) {
			console.log(error);
			_self.cancelRender();
			_self._response.end();
		} else {
			_self._error(error);
		}
	}).end(function () {
		_self.render_state = root_module.RENDER_STATES.RENDER_COMPLETE;
		_self._end();
	});
	return renderer;
};


/**
 * Sets an error handler which will be called any time an error occurs in this view
 * 
 * @param  {Function} fn takes a single parameter, the error
 * @return {Bifocals} this, used for chaining
 */
Bifocals.prototype.error = function bifocals_error(fn) {
	this._error = fn;
	return this;
};

/**
 * Sets an end handler which will be called when the view is done rendering
 * 
 * @param  {Function} fn takes no parameters
 * @return {[type]}      this, used for chaining
 */
Bifocals.prototype.end = function bifocals_end(fn) {
	this._end = fn;
	return this;
};

/**
 * Create a child view relative to this view
 * 
 * @param {String} key required, the key the parent will render the data in
 * @param {String} template required, the template file to be rendered
 * @returns {Bifocals}
 */
Bifocals.prototype.child = function bifocals_child(key, template) {
	// Makes a fake response that writes to the parent instead of to an actual response object
	var new_view = new Bifocals({
		buffer: '',
		write: function (chunk) {
			if (typeof chunk === "object") {
				// Objects don't replace the data, they override it. We might want to build an array here in the future.
				// This allows for a heirarchy of non-string views, like json
				this.buffer = chunk;
			} else {
				this.buffer += chunk; 
			}
		},
		end: function () { 
			// flag the child view as rendered
			new_view.render_state = root_module.RENDER_STATES.RENDER_COMPLETE;

			// set the child data into the parent view, and then render the parent if possible
			new_view.parent.set(key, this.buffer); 

			if(new_view.parent.canRender()) {
				// Break up render flow by processing any parent renders on the next tick
				process.nextTick(function () {
					new_view.parent.render();
				});
			}
		}
	});

	new_view.content_type = this.content_type;
	new_view.parent = this;
	new_view.root = this.root;
	new_view.dir = this.dir;
	new_view.error(this._error);
	
	if (template) {
		new_view.template = template;
	}

	this._child_views[key] = new_view;

	return this._child_views[key];
};

/**
 * Set the response status code in the response tied to the parent most view
 * 
 * @param {int} code
 * @return {Bifocals} this, used for chaining
 */
Bifocals.prototype.setStatusCode = function bifocals_setStatusCode(code) {
	this.root._response.statusCode = code;
	return this;
};

/**
 * Set a collection of headers in the response tied to the parent most view
 * 
 * @param {Object} headers 
 * @return {Bifocals} this, used for chaining
 */
Bifocals.prototype.setHeaders = function bifocals_setHeaders(headers) {
	var key = null;
	for(key in headers) {
		this.root._response.setHeader(key, headers[key]);
	}
	return this;
};

/**
 * Return a 404: Not found code, and overwrite the existing template with the one provided
 * 
 * @param  {string} template information passed to the root rendererer to be immediately rendered
 */
Bifocals.prototype.statusNotFound = function bifocals_statusNotFound(template) {
	var status = 404;
	this.setStatusCode(status);

	if (typeof template === "string") {
		this.root.render(template, true);
	} else if (typeof this.root._defaultTemplates[status] === "string") {
		this.root.render(this.root._defaultTemplates[status], true);
	} else {
		this.root.cancelRender();
		this.root._response.end();
	}
};

/**
 * Return a 500: Error code, and overwrite the existing template with the one provided
 * 
 * @param {Error} error the error object you wish to provide to the view
 * @param  {String} template information passed to the root renderer to be immediately rendered
 */
Bifocals.prototype.statusError = function bifocals_statusError(error, template) {
	var status = 500;

	this.setStatusCode(status);
	this.root.set('error', error);

	if (typeof template === "string") {
		this.root.render(template, true);
	} else if (typeof this.root._defaultTemplates[status] === "string") {
		this.root.render(this.root._defaultTemplates[status], true);
	} else {
		this.root.cancelRender();
		this.root._response.end();
	}
};

/**
 * Return a 201: Created code, and redirect the user to the provided url
 * 
 * This should be used any time you create a resource per request of a user.
 * 
 * for example, if I call
 * 
 * PUT /users
 * name=aaron&email=aaron@dashron.com
 * 
 * which successfully creates user 1, aaron
 * the view at /users should end as view.created('/users/1');
 * 
 * @param  {string} redirect_url
 */
Bifocals.prototype.statusCreated = function bifocals_statusCreated(redirect_url) {
	this.setStatusCode(201);
	this.setHeaders({
		Location : redirect_url
	});
	this.root.cancelRender();
	this.root._response.end();
};

/**
 * Return a 302: Found code, 
 * 
 * @todo  add support for other 300's within this function
 * @todo describe how this would be properly used
 * @param  {string} redirect_url
 */
Bifocals.prototype.statusRedirect = function bifocals_statusRedirect(redirect_url) {
	this.setStatusCode(302);
	this.setHeaders({
		Location : redirect_url
	});
	this.root.cancelRender();
	this.root._response.end();
};

/**
 * Returns a 304: Not found code,
 * 
 * This tells the browser to use a previously cached version of this page.
 * @todo : as a parameter take some headers to control this? date, etag, expires, cache control
 */
Bifocals.prototype.statusNotModified = function bifocals_statusNotModified() {
	this.setStatusCode(304);
	this.root.cancelRender();
	// date
	// etag
	// expires
	// cache  control
	this.root._response.end();
};

/**
 * Returns a 405: Unsupported Method code,
 * 
 * This is used to state that the method (GET, POST, PUT, PATCH, DELETE, HEAD) is not supported for the
 * requested uri. You must provide a list of acceptable methods
 * 
 * @param  {Array} supported_methods 
 */
Bifocals.prototype.statusUnsupportedMethod = function bifocals_statusUnsupportedMethod(supported_methods) {
	this.setStatusCode(405);
	this.setHeaders({
		Allow : supported_methods.join(',')
	});
	this.root.cancelRender();
	this.root._response.end();
};

/**
 * [bifocals_statusUnauthorized description]
 * @param  {[type]} template [description]
 * @return {[type]}          [description]
 */
Bifocals.prototype.statusUnauthorized = function bifocals_statusUnauthorized(template) {
	var status = 401;
	this.setStatusCode(status);

	if (typeof template === "string") {
		this.root.render(template, true);
	} else if (typeof this.root._defaultTemplates[status] === "string") {
		this.root.render(this.root._defaultTemplates[status], true);
	} else {
		this.root.cancelRender();
		this.root._response.end();
	}
};