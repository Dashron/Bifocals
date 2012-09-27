# Bifocals
==========

A View library with support for asynchronous sub-views (aka partials), and interchangeable rendering systems.

----

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
        var view = new Bifocals();
        view.response = response;

        // Assign a content type.
        view.content_type = 'text/html';

        // Create the child:
        var child = view.child("header");
        child.set('title, "Hello World");
        child.render("templates/header.html");

		// Write the view to the response
    	view.render("templates/index.html");
    }

And you are done! When the client requests this page, it will receive the following html

    <html>
        <head></head>
        <body>
            <header>
                Hello World
            </header>
        </body>
    </html>

### Why do I need this library?

The previous example does not show the benefits of the library. The benefits come when performing asynchronous actions. It might be easier to explain with a more complex example.

    http_module.createServer(function (request, response) {
    	// Create the parent:
        var view = new Bifocals();
        view.response = response;

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
    }



### Important Notes
* You must register a Renderer to any content type you wish to use.
* The order that you render parent or child views is unimportant.
* You must create all children before you tell the parent to render, otherwise the output template could be incomplete.

----

### Writing your own Renderer

You must extend the renderer class

    var FileRenderer = module.exports = function FileRenderer() {
        Renderer.call(this);
    }

    util_module.inherits(FileRenderer, Renderer);

You must define a render function. It does not need to take any parameters, but you will be provided the proper template if possible. This template will be a string, defining the full path to the target template. If you wish to cache this file it should be handled via your renderer.

Each renderer will be assigned a "response" object. It may or may not be a ServerResponse object, so you can only expect expect two functions, write(mixed) and end().

Write should be called any time data is complete, and ready to be sent to the user. End should be called to signify the end of data.

Additionally each renderer will have an "_error" function. This function will be provided with the view's error handler, it should be called any time an error occurs.


    FileRenderer.prototype.render = function (template) {
	    var _self = this;
	    // Find the template and load it from disk
	    var stream = fs_module.createReadStream(template);

	    stream.on('data', function (data) {
	    	// Write data to the response
    	    _self.response.write(data);
        });

        stream.on('error', function (err) {
        	// Call the renderer's error function
            _self._error(err);
        });

        stream.on('end', function () {
        	// Signal the end of rendering
            _self.response.end();
        });
    }

----

### Function Reference

---- 

#### Module Reference


##### addRenderer(content_type, renderer)
content_type : string

renderer : Renderer

Registers a renderer object to a content type.

Every content type used must have an associated Renderer. Included in the "renderers" folder are two examples, one for serving files directly, and one for rendering templates through Handlebars.


##### getRenderer(content_type)
content_type : string

Returns the appropriate renderer for the provided content_type.

If no renderer has been registered to the content type, an error is thrown.


##### RENDER_STATES

An object containing all of the states a bifocal object can be in.

RENDER_NOT_CALLED
RENDER_REQUESTED
RENDER_STARTED
RENDER_COMPLETE
RENDER_FAILED
RENDER_CANCELED

// todo : provide explicit definitions of each state


##### Bifocals()

Constructor for the bifocal object.
This should only be called for a root view, any child views should be spawned off the root.

Your first task should be to assign the response object.
Your second task should be to assign an error handler.
Be careful with the error handler though, if you request statusError to render a template, and you run into another error, you will end up in an infinite loop.

var view = new Bifocals();
view.response = response;
view.error(function (error) {
	console.log(error);
	view.statusError(error);
});

----

#### Bifocals Reference


##### response
The object that the final rendered output will be written to.

Changing this will change the destination of the final rendered output.
It is not recommended to change this on child views, they use different response objects than normal. Generally only a root view would have an actual ServerResponse stored here

##### content_type
The value to put in the responses content-type header. Also used to determine which renderer should be used.

##### template
A string that is provided along with all view data to the final render step. If this string is set, it will override the template provided to the render function.

When provided to the renderer, it is prefixed with the `dir` property


##### dir
A string which is prefixed onto the "template" before it is send to a renderer.

This allows you to set a standard template directory early on, and keep it out of your render calls.


##### parent
The bifocal object that created this object.

Changing this to a different object will likely break the rendering hierarchy entirely.
// todo what does the parent element have here.


##### root
The original bifocal object, which started the whole series of child elements.

Changing this to a different object will likely break the rendering flow completely.


##### isRendered()
Returns true/false, if the view has completed its rendering process

##### set(key, value)
key : string

value : mixed

Stores a key value pair to be provided to the renderer.

This is useful for template engines.


##### get(key)
key : string

Retrieves a value that was assigned via `set`, based on the values key.

##### canRender() 
Returns true/false, if the view is able to be rendered immediately.

##### render(template, force)
template : string (varies, depending on the Renderer)

force : optional boolean default false

Combines the data and template into a string, and writes it all out to the response.

The first parameter should be a path to your template. If you have set a dir, the template will be appended on to the dir. For the handlebars renderer, this needs to be the absolute path.

If you have already assigned a template to the view (via the template property), the first parameter will be ignored. The template property takes precedence over the the render functions template parameter.

The second parameter is a boolean. If true, all child views will be canceled and the render will happen immediately. This is generally useful for handling errors.

This should be the last function you manually call on a view.
If you want to use child views, they must be created before this render call, but you can keep using them after this render call.

##### cancelRender()
Stops all child views from rendering, and ensures that this view will not be rendered.

##### buildRenderer()
Builds a renderer object from various data located within this view

##### error(fn)
fn : function(error)

Assigns an error handler to this view. Child elements will inherit this error handler. The callback will be provided one parameter, the error.

##### child(key, template)
key : string

template : optional string (varies, depending on the Renderer)

Creates a child view, which this view will depend on.

The first parameter is a key. The final rendered output of the child will be set to the parent view using this key. So for example...
    
    var view = new Bifocals();
    var child = view.child('a');
    child.set('content', 'hello');
    
    // template.html is simply {{{content}}}
    child.render('template.html');
    
    view.get('a') === 'hello';

The second parameter is a template. If you provide a template here, it will be considered the same as `child.template = template`. This means it will override the template provided to the `render` function call.

##### setStatusCode(code)
code : number 

This should only be called on the parent. This sets the status code in the response headers

##### setHeaders(headers)
headers : object

Sets a collection of headers, where each key:value pair is a Header:value pair

##### statusNotFound(template)
template : optional string (varies, depending on the Renderer)

End rendering immediately with a 404: Not found status code, and renders the template if provided

##### statusError(error, template)
error : optional error

template : optional template (varies, depending on the Renderer)

End rendering immediately with a 500: Error code, and renders the template if provided
Additionally the error is assigned to the view with the key "error" 

##### statusCreated(redirect_url)
redirect_url : string (url)

End rendering immediately with a 201: Created code. The redirect_url is provided via the Location header, and should point to the newly created resource

##### statusRedirect(redirect_url)
redirect_url : string (url)

End rendering immediately with a 302: Found code. The redirect_url is provided via the Location header, which the client should automatically follow.
todo: support other 300's


##### statusNotModified()

End rendering immediately with a 304: Not Modified code. This should be in response to a request with cache headers, and the client should respond by displaying the previously cached response.
//todo : as a parameter take some headers to control this? date, etag, expires, cache control

##### statusUnsupportedMethod(supported_methods)
supported_methods : array

Ends rendering immediately with a 405: Unsupported Method code. This should be in response to a failed request, if the request would be successful when made with an alternative http method.


----

#### Renderer Reference

##### exports.Renderer = function()

Constructor for the base Renderer


##### response

Automatically set when Bifocals builds a renderer. This will be an object with write(data) and end() functions.

##### data

Automatically set when Bifocals builds a renderer. This will be an object of key value pairs.

##### error(fn)
fn : function(error)

returns : this

Assigns a function that will be called any time an error occurs in the renderer. The assigned function should be called via the renderer's _error property.

##### end(fn)
returns : this

Assigns a function that will be called when the renderer is complete. The assigned function should be called via the _end property.

----

### Coding Standards:
If a object property is prefixed with an underscore (_) IGNORE IT. Changing it is not supported, and has not been considered in the development of the library.

If it is not prefixed with an underscore (_) and is not a function, you can change it however you see fit. Just read the documentation and understand the side effects of changing the variable.

### Future Features:

"Fill"

- This will be a function on the Bifocals object.
- It will take one parameter, which will be another function.
- The Bifocals object will keep track of the function passed via parameter, and wait to call it until the user has requested the view to be rendered.
- The function passed via parameter should return an object. The object will be assigned as a series of key value pairs to the bifocal object via set.
- This will make it easier to render templates from within a template, allowing all design decisions to be handled via the views.
- This will also be more useful in error cases, or custom status codes because the function will be ignored entirely
