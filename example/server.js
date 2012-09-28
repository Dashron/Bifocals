"use strict";

var http_module = require('http');
var bifocals_module = require('../bifocals');

var View = bifocals_module.Bifocals;

var config = {
	template_dir : __dirname + "/templates/",
	hostname : "localhost",
	port : "8125"
};

http_module.createServer(function (request, response) {
	// Create the view
	var view = new View();
	// Assign a default directory
	view.dir = config.template_dir;
	// Assign the ServerResponse object to the root view
	view.response = response;

	// If an error happens, throw the right status code!
	// Because this is an example, I do not render an error template. 
	// Be careful when you are first building your app, if you provide a template to statusError, and that template fails, you will be stuck in an infinite loop.
	view.error(function (error) {
		console.log('There was an error rendering your template. Take a look below and see what it says. First make sure the file path is correct');
		console.log(error);
		view.statusError(error);
	});

	if (request.url === "/") {
		// Define the content type. This sets http headers so that the client can render the content properly
		view.content_type = "text/html";

		// Set some data to the view
		view.set('name', 'Aaron Hedges');
		view.set('date', new Date());

		// Create a child view. It's contents will be assigned to the parent element with the key "first_child". Make sure this is called before the root's render function is called, otherwise the view won't know it needs to wait for a child.
		var first_child = view.child('first_child');
		// Tell the child to start rendering, and use the template "sub1.html", located within the parent view's default directory
		first_child.render('sub1.html');

		// Create a child view that will render sub2. It's contents will be assigned to the parent element with the key "second_child". It will use sub2.html as it's template unless one is manually assigned later in the code via the template property.
		var second_child = view.child('second_child', 'sub2.html');
		// "sub2.html" will override the render methods "sub1.html", This allows you to reuse code between different templates
		second_child.render('sub1.html');

		// Create a child view which will render some time in the future 
		var third_child = view.child('third_child');
		process.nextTick(function () {
			// We have made it to some time in the future, render "sub3.html". By this point, the parent has already tried to render, but failed because the third child is not complete. Now that we call render, the parent can wrap up it's duties.
			third_child.render('sub3.html');
		});
		
		// Render the parent view. First and second child may or may not be done, but we definitely know that third child has not even started. This will tell the parent that it's ready, and wait for all the children to be complete.
		view.render('index.html');
	} else if (request.url === "/static/") {
		// Render a static file (this could also be css or js if the renderer supported that)
		view.content_type = "text/plain";
		view.render('flat_file.txt');
	} else {
		// Render a 404 page
		view.content_type = "text/plain";
		view.statusNotFound('404.html');
	}

}).listen(config.port, config.hostname, function () {
	console.log('listening for ' + config.hostname + ':' + config.port);
});

bifocals_module.addRenderer('text/plain', require('../renderers/file_renderer'));
bifocals_module.addRenderer('text/html', require('../renderers/handlebars_renderer'));
// mustache renderer