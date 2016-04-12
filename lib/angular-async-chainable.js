angular.module('angular-async-chainable', [])
.service('$async', function() {
	if (!window.asyncChainable) return console.error('asyncChainable not loaded!');
	return window.asyncChainable;
});
