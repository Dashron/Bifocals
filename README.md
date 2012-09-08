# Bifocals
==========

A View library with support for asynchronous sub-views (aka partials), and interchangable rendering systems.

## Basic Use:
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


Create the parent:
    var template = new Bifocals("templates/index.html");
    template.response = response;

Create the child:
    var child = template.child("header", "templates/header.html");
    child.set('title, "Hello World");
    child.render();

Write the view to the response
    template.render();

And you are done!
----

## Function Reference

More comming. For the moment, the code itself is fairly well documented

----

## Writing your own Renderers

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
	var stream = fs_module.createReadStream(template);
	stream.on('data', function (data) {
		_self.response.write(data);
	});

	stream.on('error', function (err) {
		_self._error(err);
	});

	stream.on('end', function () {
		_self.response.end();
	});
}
----
## Coding Standards:
================
If a object property is prefixed with an underscore (_) IGNORE IT. Changing it is not supported, and has not been considered in the development of the library.

If it is not prefixed with an underscore (_) and is not a function, you can change it however you see fit. Just read the documentation and understand the side effects of changing the variable.