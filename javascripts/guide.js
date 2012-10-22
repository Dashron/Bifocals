(function () {
	var states = ["RENDER_NOT_CALLED", "RENDER_REQUESTED",
					"RENDER_STARTED", "RENDER_COMPLETE",
					"RENDER_FAILED", "RENDER_CANCELLED"];
	var colors = {
		RENDER_NOT_CALLED : '#32CD32', // green
		RENDER_REQUESTED : '#FCE883', // yellow-ish, ugh
		RENDER_STARTED : '#87CEFA', // purple
		RENDER_COMPLETE : '#00BFFF', // blue
		RENDER_FAILED : '#B22222', // red
		RENDER_CANCELLED : '#FFA500' // orange
	};

	$('#interactive').on('click', '.view', function (event) {
		$this = $(this);
		var state = $this.data('state');
		var parent = null;
		var children = null;

		switch (state) {
			case "RENDER_NOT_CALLED" :
				change_state($this, "RENDER_REQUESTED");
				break;

			case "RENDER_REQUESTED" :
				if (can_render($this)) {
					alert('The view can render, it should start immediately');
				} else {
					alert('The view can not yet render, there is an issue with its child elements');
				}
				break;

			case "RENDER_STARTED" :
				alert('The view is now rendering');
				break;

			case "RENDER_COMPLETE" :
				parent = $this.data('parent');

				// if the parent can render now because this child has finished, render it immediately
				if (parent) {
					if (can_render($('#view_' + parent))) {
						alert("The parent element is now able to render");
					} else {
						alert("The parent element can not yet render. Check it's chilren");
					}
				}

				break;

			case "RENDER_FAILED" :
				alert('resetting view');
				change_state($this, "RENDER_NOT_CALLED");
				break;

			case "RENDER_CANCELLED" :
				alert('resetting view');
				change_state($this, "RENDER_NOT_CALLED");
				break;
		}
	});

	function locate_children (ids) {
		var children = [];
		ids.forEach(function (id) {
			children.push($('#view_' + id));
		});

		return children;
	}

	function can_render (view) {
		if (view.data('state') !== "RENDER_REQUESTED") {
			return false;
		}
		var child_ids = view.data('children');

		if (typeof child_ids != "undefined") {
			if (typeof child_ids === "string") {
				child_ids = child_ids.split(',');
			} else {
				child_ids = [child_ids];
			}

			var children = locate_children(child_ids);

			for(var i = 0; i < children.length; i++) {
				if (children[i].data('state') != "RENDER_COMPLETE") {
					return false;
				}
			}
		}

		return true;
	}

	function cancel_render (element) {
		element.data('state', "RENDER_CANCELLED");

		children = locate_children(element.data('children') ? element.data('children').split(',') : []);

		if (children.length) {
			children.forEach(function (child) {
				cancel_render(child);
			});
		}
	}

	function change_state (element, state) {
		var parent = null;
		var children = null;

		switch (state) {
			case "RENDER_REQUESTED" :
				if (element.data('state') === "RENDER_NOT_CALLED") {
					element.data('state', state);
					element.css('background-color', colors[state]);

					// if you can render this view, start the rendering immediately
					if (can_render(element)) {
						change_state(element, "RENDER_STARTED");
					}
				} else {
					alert('Invalid state transfer: from ' + element.data('state') + ' to RENDER_REQUESTED');
				}

				break;

			case "RENDER_STARTED" :
				if (!can_render(element)) {
					alert('View:' + element.attr('id') + ' can not yet render');
				} else {
					if (element.data('state') === "RENDER_REQUESTED") {
						element.data('state', state);
						element.css('background-color', colors[state]);

						// Rendering can take awhile, let it process
						// TODO: randomize this
						setTimeout(function () {
							change_state(element, "RENDER_COMPLETE");
						}, 3000);
					} else {
						alert('Invalid state transfer: from ' + element.data('state') + ' to RENDER_STARTED');
					}
				}

				break;

			case "RENDER_COMPLETE" :
				if (element.data('state') === "RENDER_STARTED") {
					element.data('state', state);
					element.css('background-color', colors[state]);

					// if the parent can render now because this child has finished, render it immediately
					parent = $('#view_' + element.data('parent'));
					if (parent && can_render(parent)) {
						setTimeout(function () {
							change_state(parent, "RENDER_STARTED");
						});
					}
				} else {
					alert('Invalid state transfer: from ' + element.data('state') + ' to RENDER_STARTED');
				}

				break;

			case "RENDER_FAILED" :
				element.data('state', state);
				element.css('background-color', colors[state]);
				alert('Render failed!');
				break;

			case "RENDER_CANCELLED" :
				element.data('state', state);
				element.css('background-color', colors[state]);
				var chilren = locate_children(element);
				children.forEach(function (child) {
					change_state(child, "RENDER_CANCELLED");
				});
				
				break;
		}
	}
}());