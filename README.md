angular-async-chainable
=======================
Pre-built async-chainable NPM repo suitable for use within regular JavaScript or AngularJS on the frontend.


See the main [async-chainable](https://github.com/hash-bang/async-chainable) documentation for how to use the module. This is just the frontend version.


Plain JavaScript usage
----------------------
1. Install the component via Bower:

	bower install angular-async-chainable

2. Include the following files in your HTML header:

	<script src="/bower_components/angular-async-chainable/async-chainable.js"></script>


You can now use in your regular JavaScript code via the gloabl `asyncChainable()` function:


	asyncChainable()
		.then(function(next) {
			console.log('Hello');
			next();
		})
		.then(function(next) {
			console.log('World');
			next();
		})
		.end();


Use within AngularJS
--------------------
1. Install the component via Bower:

	bower install angular-async-chainable

2. Include the following files in your HTML header:

	<script src="/bower_components/angular-async-chainable/async-chainable.js"></script>
	<script src="/bower_components/angular-async-chainable/angular-async-chainable.js"></script>

3. Setup the component in your Angular app:

	angular.module('app', ['angular-async-chainable']);

4. Require the `$async` service in any controller / component to use:

	app.controller('myController', $async) {
		asyncChainable()
			.then(function(next) {
				console.log('Hello');
				next();
			})
			.then(function(next) {
				console.log('World');
				next();
			})
			.end();
	});
