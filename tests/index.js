"use strict";
var vows = require('vows');
var assert = require('assert');
var path_module = require('path');
var util_module = require('util');

var bifocals_module = require('../bifocals');
var View = bifocals_module.Bifocals;
var Renderer = bifocals_module.Renderer;

vows.describe('View Component').addBatch({
	'An html view': {
		topic: function () {
			var view = new View({
				buffer : '',
				write : function (chunk) {
					this.buffer += chunk;
				},
				end : function () {
					_topic.callback(null, {view: view, buffer: this.buffer});
				}
			});

			var _topic = this;
			view.content_type = 'text/html';
			view.dir = path_module.normalize(__dirname + '/../testing_resources/');
			view.error(function (error) {
				throw error;
			});

			view.render('view_example.html');
		},
		'renders correctly': function (view) {
			assert.equal(view.buffer, "view_example.html {}");
		},
		'is complete' : function (view) {
			assert.equal(view.view.render_state, bifocals_module.RENDER_STATES.RENDER_COMPLETE);
		},
	},
	'An html view with data' : {
		topic: function () {
			var _topic = this;
			var view = new View({
				buffer : '',
				write : function (chunk) {
					this.buffer += chunk;
				},
				end : function () {
					_topic.callback(null, {view: view, buffer: this.buffer});
				}
			});

			view.content_type = 'text/html';
			view.dir = __dirname.replace('/components', '/testing_resources') + '/';
			view.error(function (error) {
				throw error;
			});
			view.set('status', 'single view');
			view.render('view_example.html');
		},
		'renders correctly' : function (view) {
			assert.equal(view.buffer, "view_example.html {single view,}");
		},
		'is complete' : function (view) {
			assert.equal(view.view.render_state, bifocals_module.RENDER_STATES.RENDER_COMPLETE);
		},
	},
	'An html view with children rendered first' : {
		topic: function () {
			var _topic = this;
			var view = new View({
				buffer : '',
				write : function (chunk) {
					this.buffer += chunk;
				},
				end : function () {
					_topic.callback(null, {view: view, buffer: this.buffer});
				}
			});

			view.content_type = 'text/html';
			view.dir = __dirname.replace('/components', '/testing_resources') + '/';
			view.error(function (error) {
				throw error;
			});
			var child = view.child('status');
			child.set('status', 'child');
			child.render('view_example.html');
			view.render('view_example.html');
		},
		'renders correctly' : function (view) {
			assert.equal(view.buffer, "view_example.html {view_example.html {child,},}");
		},
		'is complete' : function (view) {
			assert.equal(view.view.render_state, bifocals_module.RENDER_STATES.RENDER_COMPLETE);
		},
	},
	'An html view with children rendered last' : {
		topic: function () {
			var view = new View({
				buffer : '',
				write : function (chunk) {
					this.buffer += chunk;
				},
				end : function () {
					_topic.callback(null, {view: view, buffer: this.buffer});
				}
			});

			var _topic = this;
			view.content_type = 'text/html';
			view.dir = __dirname.replace('/components', '/testing_resources') + '/';
			view.error(function (error) {
				throw error;
			});
			var child = view.child('status');
			
			view.render('view_example.html');
			child.set('status', 'child');
			child.render('view_example.html');
		},
		'renders correctly' : function (view) {
			assert.equal(view.buffer, "view_example.html {view_example.html {child,},}");
		},
		'is complete' : function (view) {
			assert.equal(view.view.render_state, bifocals_module.RENDER_STATES.RENDER_COMPLETE);
		},
	}
}).export(module); // Export the Suite


var TestRenderer = function() {
	Renderer.call(this);
};
util_module.inherits(TestRenderer, Renderer);

/**
 * Requests the provided template to be rendered
 * 
 * @param  {string} template
 */
TestRenderer.prototype.render = function (template) {
	var _self = this;
	var data = '';

	Object.keys(this.data).forEach(function (value) {
		data = data + _self.data[value] + ',';
	});
	template = template.split('/');
	template = template[template.length - 1];
	this.response.write(template + ' {' + data + '}');
	this._end();
	this.response.end();
};

bifocals_module.addRenderer('text/html', TestRenderer);