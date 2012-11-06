"use strict";

var Bifocals = require('../bifocals').Bifocals;

module.exports.middleware = function (options) {
	var app = options.app;

	return function (req, res, next) {
		var root = new Bifocals(res);
		root.dir = app.get('views') + '/';
		// todo: pull this from the request's accept headers
		root.content_type = 'text/html';

		res.child = function (key, template) {
			return root.child(key, template);
		};

		res.render = function (name, opts, fn) {
			if (typeof opts === "object") {
				Object.keys(opts).forEach(function (value, key) {
					root.set(key, value);
				});
			}

			if (typeof fn === "function") {
				root.error(function (err) {
					fn(err);
				});

				root.end(function() {
					fn(null);
				});
			}

			root.render(name);
		};

		next();
	};
};