"use strict";

var http_module = require('http');
var bifocals_module = require('../bifocals');

var View = bifocals_module.Bifocals;

var config = {
	template_dir : "./templates/",
	hostname : "localhost",
	port : "8125"
};

http_module.createServer(function (request, response) {
	// Create a view object based on global config, and the response object.
	// Ideally this would be abstracted away by whatever system you use the views.
	var view = new View();
	view.dir = config.template_dir;
	view.response = response;

	// If an error happens, throw the right status code!
	// Because this is an example, I do not render an error template. (if the error template fails, it can get stuck in a loop)
	view.error(function (error) {
		console.log(error);
		view.statusError(error);
	});

	if (request.url === "/") {
		// Define the content type. This sets http headers so that the client can render the content properly
		view.content_type = "text/html";

		// Set some data to the view
		view.set('name', 'Aaron Hedges');
		view.set('date', new Date());

		// Create a child view that will render sub1
		var first_child = view.child('first_child');
		first_child.render('sub1.html');

		// Create a child view that will render sub2. 
		// The child definition overrides the final render call, so that you don't have to know whether the template is a parent or child element
		var second_child = view.child('second_child', 'sub2.html');
		second_child.render('sub1.html');

		// Create a child view which will render some time in the future 
		var third_child = view.child('third_child');
		process.nextTick(function () {
			third_child.render('sub3.html');
		});
		
		view.render('index.html');
	} else if (request.url === "/static/") {
		// Render a static file (this could also be css or js if the renderer supported that)
		view.content_type = "text/plain";
		view.render('flat_file.txt');
	} else {
		// Render a 404 page
		view.statusNotFound('404.html');
	}

}).listen(config.port, config.hostname, function () {
	console.log('listening for ' + config.hostname + ':' + config.port);
});

bifocals_module.addRenderer('text/plain', require('../renderers/file_renderer'));
bifocals_module.addRenderer('text/html', require('../renderers/handlebars_renderer'));
// mustache renderer