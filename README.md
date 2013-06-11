# Bifocals
==========

A node.js View library with support for asynchronous sub-views (aka partials) and interchangeable rendering systems.

See http://bifocalsjs.com for more documentation.

----

### News:

# Version 1.2.0 - Major Refactor

There have been no api changes, but Bifocals as of 1.2.0 requires Node 0.10.0 or higher. I have switched to using the new streams.
Additionally I have moved code around, and cleaned up some methods.

# Version 1.1.0 - Express Support

I have added an express middleware component, look at example/express-server.js

NOTE: There has been an API change. You no longer manually assign the response to the view. The response is passed via the constructor

### Installation:

`npm install bifocals`

    var bifocals_module = require('bifocals');
    var Bifocals = bifocals_module.Bifocals;

### Basic Use:
templates/index.html

    <html>
        <head></head>
        <body>
            {{{header}}}
        </body>
    </html>

templates/header.html

    <header>
        {{title}}
    </header>


server.js

	// Each content type needs to be registered to a Renderer.
	// This tells bifocals to render all text/html views via handlebars.
	bifocals_module.addRenderer('text/html', require('./renderers/handlebars_renderer'));

    http_module.createServer(function (request, response) {
    	// Create the parent:
        var view = new Bifocals(response);

        // Assign a content type.
        view.content_type = 'text/html';

        // Create the child:
        var child = view.child("header");
        child.set('title', "Hello World");
        child.render("templates/header.html");

        // Write the view to the response
    	view.render("templates/index.html");
    });

That's it! When the client requests this page, the following html will be displayed:

    <html>
        <head></head>
        <body>
            <header>
                Hello World
            </header>
        </body>
    </html>

### Why do I need this library?

The previous example does not show the true benefits of the library. These benefits are apparent when performing asynchronous actions. Consider this more complex example:

    http_module.createServer(function (request, response) {
    	// Create the parent:
        var view = new Bifocals(response);

        // Assign a content type.
        view.content_type = 'text/html';

        // Create multiple children:
        var users_child = view.child("content");
        var blog_child = view.child("blog");

        // Retrieve some rows from the database, and call back to me later
        // I will explain in more detail with the next database call
        database.query('select * from posts', function (err, rows) {
			if (err) {
        		view.statusError();
        	} else {
        		if (rows.length) {
        			blog_child.set('posts', rows);
        			blog_child.render('templates/blog/many.html');
        		} else {
        			blog_child.render('templates/blog/empty.html');
        		}
        	});
        });

        // Retrieve some more rows from the database, and call back to me later.
        // Because both of the child views are handled in the callback, we have no idea which view will be rendered first. The view attached to the fastest query will be the first view to render.
        // The library handles this all for you, the order does not matter.
        database.query('select * from user', function (err, rows) {
        	if (err) {
        		// If an error occurred, notify the user and end the rendering immediately. This will not wait for the other database query to finish, so you can shave some time off of notifying the user.
        		view.statusError();
        	} else {
        		if (rows.length) {
        			user_child.set('users', rows);
        			user_child.render('templates/user/many.html');
        		} else {
        			user_child.render('templates/user/empty.html');
        		}
        	});
        });


		// Write the view to the response
		// At this point, neither of the children will have rendered.
		// The view is flagged as "ready", and whenever the final child has rendered this view will render.
    	view.render("templates/index.html");
    });

### Important Notes
* You must register a Renderer to any content type you wish to use.
* The order that you render parent or child views is unimportant.
* You must create all children before you tell the parent to render, otherwise the output template could be incomplete.

### Thanks to...
* @chanian for cleaning up my typos, and for sparking ideas about the future of this project
* @jasonmoo for helping identify confusing sections in the documentation
