(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.asyncChainable = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('angular-async-chainable', [])
.service('$async', function() {
	if (!window.asyncChainable) return console.error('asyncChainable not loaded!');
	return window.asyncChainable;
});

},{}],2:[function(require,module,exports){
var async = require('async');

/**
* Examines an argument stack and returns all passed arguments as a CSV
* e.g.
*	function test () { getOverload(arguments) };
*	test('hello', 'world') // 'string,string'
*	test(function() {}, 1) // 'function,number'
*	test('hello', 123, {foo: 'bar'}, ['baz'], [{quz: 'quzValue'}, {quuz: 'quuzValue'}]) // 'string,number,object,array,collection'
*
* @param object args The special JavaScript 'arguments' object
* @return string CSV of all passed arguments
*/
function getOverload(args) {
	var i = 0;
	var out = [];
	while(1) {
		var argType = typeof args[i];
		if (argType == 'undefined') break;
		if (argType == 'object' && Object.prototype.toString.call(args[i]) == '[object Array]') { // Special case for arrays being classed as objects
			argType = 'array';
			if (args[i].length && args[i].every(function(item) {
				return (typeof item == 'object' && Object.prototype.toString.call(item) == '[object Object]');
			}))
				argType = 'collection';
		}
		out.push(argType);
		i++;
	}
	return out.toString();
};

// Utility functions {{{
/**
* Return true if a variable is an array
* @param mixed thing The varable to examine
* @return bool True if the item is a classic JS array and not an object
*/
function isArray(thing) {
	return (
		typeof thing == 'object' &&
		Object.prototype.toString.call(thing) == '[object Array]'
	);
}


/**
* Return true if a variable is an object
* @param mixed thing The varable to examine
* @return bool True if the item is a classic JS array and not an object
*/
function isObject(thing) {
	return (
		typeof thing == 'object' &&
		Object.prototype.toString.call(thing) != '[object Array]'
	);
}
// }}}

// Plugin functionality - via `use()`
var _plugins = {};
function use(module) {
	module.call(this);
	return this;
};
// }}}

/**
* Queue up a function(s) to execute in series
* @param array,object,function The function(s) to execute
* @return object This chainable object
*/
function series() {
	var calledAs = getOverload(arguments);
	switch(calledAs) {
		case '':
			// Pass
			break;
		case 'function': // Form: series(func)
			this._struct.push({ type: 'seriesArray', payload: [arguments[0]] });
			break;
		case  'string,function': // Form: series(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			this._struct.push({ type: 'seriesObject', payload: payload});
			break;
		case 'array': // Form: series(Array <funcs>)
			this._struct.push({ type: 'seriesArray', payload: arguments[0] });
			break;
		case 'object': // Form: series(Object <funcs>)
			this._struct.push({ type: 'seriesObject', payload: arguments[0] });
			break;
		case 'collection': // Form: series(Collection <funcs>)
			this._struct.push({ type: 'seriesCollection', payload: arguments[0] });
			break;

		// Async library compatibility {{{
		case 'array,function':
			this._struct.push({ type: 'seriesArray', payload: arguments[0] });
			this.end(arguments[1]);
			break;
		case 'object,function':
			this._struct.push({ type: 'seriesObject', payload: arguments[0] });
			this.end(arguments[1]);
			break;
		// }}}
		default:
			throw new Error('Unknown call style for .series(): ' + calledAs);
	}

	return this;
};


/**
* Queue up a function(s) to execute in parallel
* @param array,object,function The function(s) to execute
* @return object This chainable object
*/
function parallel() {
	var calledAs = getOverload(arguments)
	switch (calledAs) {
		case '':
			// Pass
			break;
		case 'function': // Form: parallel(func)
			this._struct.push({ type: 'parallelArray', payload: [arguments[0]] });
			break;
		case 'string,function': // Form: parallel(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			this._struct.push({ type: 'parallelArray', payload: payload });
			break;
		case 'array': // Form: parallel(Array <funcs>)
			this._struct.push({ type: 'parallelArray', payload: arguments[0] });
			break;
		case 'object': // Form: parallel(Object <funcs>)
			this._struct.push({ type: 'parallelObject', payload: arguments[0] });
			break;
		case 'collection': // Form: parallel(Collection <funcs>)
			this._struct.push({ type: 'parallelCollection', payload: arguments[0] });
			break;

		// Async library compatibility {{{
		case 'array,function':
			this._struct.push({ type: 'parallelArray', payload: arguments[0] });
			this.end(arguments[1]);
			break;
		case 'object,function':
			this._struct.push({ type: 'parallelObject', payload: arguments[0] });
			this.end(arguments[1]);
			break;
		// }}}
		default:
			throw new Error('Unknown call style for .parallel(): ' + calledAs);
	}

	return this;
};


/**
* Run an array/object/collection though a function
* This is similar to the async native .each() function but chainable
*/
function forEach() {
	var calledAs = getOverload(arguments)
	switch (calledAs) {
		case '':
			// Pass
			break;
		case 'collection,function': // Form: forEach(Collection func)
		case 'array,function': // Form: forEach(Array, func)
			this._struct.push({ type: 'forEachArray', payload: arguments[0], callback: arguments[1] });
			break;
		case 'object,function': // Form: forEach(Object, func)
			this._struct.push({ type: 'forEachObject', payload: arguments[0], callback: arguments[1] });
			break;
		case 'string,function': // Form: forEach(String <set lookup>, func)
			this._struct.push({ type: 'forEachLateBound', payload: arguments[0], callback: arguments[1] });
			break;
		default:
			throw new Error('Unknown call style for .forEach(): ' + calledAs);
	}

	return this;
}


// Defer functionality - Here be dragons! {{{
/**
* Collection of items that have been deferred
* @type collection {payload: function, id: null|String, prereq: [dep1, dep2...]}
* @access private
*/
function deferAdd(id, task, parentChain) {
	var self = this;
	parentChain.waitingOn = (parentChain.waitingOn || 0) + 1;

	if (! parentChain.waitingOnIds)
		parentChain.waitingOnIds = [];
	parentChain.waitingOnIds.push(id);

	self._deferred.push({
		id: id || null,
		prereq: parentChain.prereq || [],
		payload: function(next) {
			self._context._id = id;
			task.call(self._options.context, function(err, value) {
				if (id)
					self._context[id] = value;
				self._deferredRunning--;
				if (--parentChain.waitingOn == 0) {
					parentChain.completed = true;
					if (self._struct.length && self._struct[self._structPointer].type == 'await')
						self._execute(err);
				}
				self._execute(err);
			});
		}
	});
};


function _deferCheck() {
	var self = this;
	if (self._options.limit && self._deferredRunning >= self._options.limit) return; // Already over limit
	self._deferred = self._deferred.filter(function(item) {
		if (self._options.limit && self._deferredRunning >= self._options.limit) {
			return true; // Already over limit - all subseqent items should be left in place
		}
		if (
			item.prereq.length == 0 || // No pre-reqs - can execute now
			item.prereq.every(function(dep) { // All pre-reqs are satisfied
				return self._context.hasOwnProperty(dep);
			})
		) { 
			self._deferredRunning++;
			setTimeout(item.payload);
			return false;
		} else { // Can't do anything with self right now
			return true;
		}
	});
};
// }}}


/**
* Queue up a function(s) to execute as deferred - i.e. dont stop to wait for it
* @param array,object,function The function(s) to execute as a defer
* @return object This chainable object
*/
function defer() {
	var calledAs = getOverload(arguments);
	switch (calledAs) {
		case '':
			// Pass
			break;
		case 'function': // Form: defer(func)
			this._struct.push({ type: 'deferArray', payload: [arguments[0]] });
			break;
		case 'string,function': // Form: defer(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			this._struct.push({ type: 'deferObject', payload: payload });
			break;
		case 'array': // Form: defer(Array <funcs>)
			this._struct.push({ type: 'deferArray', payload: arguments[0] });
			break;
		case 'object': // Form: defer(Object <funcs>)
			this._struct.push({ type: 'deferObject', payload: arguments[0] });
			break;
		case 'collection': // Form defer(Collection <funcs>)
			this._struct.push({ type: 'deferCollection', payload: arguments[0] });
			break;
		case 'array,function': // Form: defer(Array <prereqs>, func)
			this._struct.push({ type: 'deferArray', prereq: arguments[0], payload: [arguments[1]] });
			break;
		case 'string,string,function': // Form: defer(String <prereq>, String <name>, func)
			var payload = {};
			payload[arguments[1]] = arguments[2];
			this._struct.push({ type: 'deferObject', prereq: [arguments[0]], payload: payload });
			break;
		case 'array,string,function': //Form: defer(Array <prereqs>, String <id>, func)
			var payload = {};
			payload[arguments[1]] = arguments[2];
			this._struct.push({ type: 'deferObject', prereq: arguments[0], payload: payload });
			break;
		default:
			throw new Error('Unknown call style for .defer():' + calledAs);
	}

	return this;
};


/**
* Queue up an await point
* This stops the execution queue until its satisfied that dependencies have been resolved
* @param array,... The dependencies to check resolution of. If omitted all are checked
* @return object This chainable object
*/
function await() {
	var payload = [];

	// Slurp all args into payload {{{
	var args = arguments;
	getOverload(arguments).split(',').forEach(function(type, offset) {
		switch (type) {
			case '': // Blank arguments - do nothing
				// Pass
				break;
			case 'string':
				payload.push(args[offset]);
				break;
			case 'array':
				payload.concat(args[offset]);
				break;
			default:
				throw new Error('Unknown argument type passed to .await(): ' + type);
		}
	});
	// }}}

	this._struct.push({ type: 'await', payload: payload });

	return this;
};


/**
* Queue up a limit setter
* @param int|null|false Either the number of defer processes that are allowed to execute simultaniously or falsy values to disable
* @return object This chainable object
*/
function setLimit(setLimit) {
	this._struct.push({ type: 'limit', payload: setLimit });
	return this;
};


/**
* Queue up a context setter
* @param object newContext The new context to pass to all subsequent functions via `this`
* @return object This chainable object
*/
function setContext(newContext) {
	this._struct.push({ type: 'context', payload: newContext });
	return this;
};


/**
* Queue up a varable setter (i.e. set a hash of variables in context)
* @param string The named key to set
* @param mixed The value to set
* @return object This chainable object
*/
function set() {
	var calledAs = getOverload(arguments);
	switch(calledAs) {
		case '':
			// Pass
			break;
		case 'string,string': // Form: set(String <key>, String <value>)
		case 'string,number': // Form: set(String <key>, Number <value>)
		case 'string,boolean': // Form: set(String <key>, Boolean <value>)
		case 'string,array': // Form: set(String <key>, Array <value>)
		case 'string,collection': // Form: set(String <key>, Collection <value>)
		case 'string,object': // Form: set(String <key>, Object <value>)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			this._struct.push({ type: 'set', payload: payload });
			break;
		case 'object': // Form: set(Object)
			this._struct.push({ type: 'set', payload: arguments[0] });
			break;
		case 'function': // Form: set(func) -> series(func)
			this._struct.push({ type: 'seriesArray', payload: [arguments[0]] });
			break;
		case  'string,function': // Form: set(String, func) -> series(String <id>, func)
			var payload = {};
			payload[arguments[0]] = arguments[1];
			this._struct.push({ type: 'seriesObject', payload: payload});
			break;
		case 'string': // Set to undefined
			this._setRaw(arguments[0], undefined);
			break;
		default:
			throw new Error('Unknown call style for .set():' + calledAs);
	}

	return this;
};


/**
* Set a context items value
* Not to be confused with `set()` which is the chainable external visible version of this
* Unlike `set()` this function sets an item of _context immediately
* @access private
* @see _setRaw()
*/
function _set() {
	var calledAs = getOverload(arguments);
	switch(calledAs) {
		case '':
			// Pass
			break;
		case 'string,string': // Form: set(String <key>, String <value>)
		case 'string,number': // Form: set(String <key>, Number <value>)
		case 'string,boolean': // Form: set(String <key>, Boolean <value>)
		case 'string,array': // Form: set(String <key>, Array <value>)
		case 'string,collection': // Form: set(String <key>, Collection <value>)
		case 'string,object': // Form: set(String <key>, Object <value>)
			this._setRaw(arguments[0], arguments[1]);
			break;
		case 'object': // Form: set(Object)
			for (var key in arguments[0])
				this._setRaw(key, arguments[0][key]);
			break;
		case  'string,function': // Form: set(String, func) -> series(String <id>, func)
			this._setRaw(arguments[0], arguments[1].call(this));
			break;
		case 'function': // Form: _set(func) // Expect func to return something which is then processed to _set
			this._set(arguments[1].call(this));
			break;
		case 'string': // Set to undefined
			this._setRaw(arguments[0], undefined);
			break;
		default:
			throw new Error('Unknown call style for .set():' + calledAs);
	}

	return this;
}


/**
* Actual raw value setter
* This function is the internal version of _set which takes exactly two values, the key and the value to set
* Override this function if some alternative _context platform is required
* @param string key The key within _context to set the value of
* @param mixed value The value within _context[key] to set the value of
* @access private
*/
function _setRaw(key, value) {
	this._context[key] = value;
	return this;
}


/**
* Internal function executed at the end of the chain
* This can occur either in sequence (i.e. no errors) or a jump to this position (i.e. an error happened somewhere)
* @access private
*/
function _finalize(err) {
	// Sanity checks {{{
	if (this._struct.length == 0) return; // Finalize called on dead object - probably a defer() fired without an await()
	if (this._struct[this._struct.length - 1].type != 'end') {
		throw new Error('While trying to find an end point in the async-chainable structure the last item in the this._struct does not have type==end!');
		return;
	}
	// }}}
	this._struct[this._struct.length-1].payload.call(this._options.context, err);
	if (this._options.autoReset)
		this.reset();
};


/**
* Internal function to execute the next pending queue item
* This is usually called after the completion of every async.series() / async.parallel() / asyncChainable._run call
* @access private
*/
function _execute(err) {
	var self = this;
	if (err) return this._finalize(err); // An error has been raised - stop exec and call finalize now
	do {
		var redo = false;
		if (self._structPointer >= self._struct.length) return this._finalize(err); // Nothing more to execute in struct
		self._deferCheck(); // Kick off any pending deferred items
		var currentExec = self._struct[self._structPointer];
		// Sanity checks {{{
		if (!currentExec.type) {
			throw new Error('No type is specified for async-chainable structure at offset ' + self._structPointer);
			return self;
		}
		// }}}
		self._structPointer++;

		// Skip step when function supports skipping if the argument is empty {{{
		if (
			[
				'parallelArray', 'parallelObject', 'parallelCollection',
				'forEachArray', 'forEachObject',
				'seriesArray', 'seriesObject', 'seriesCollection',
				'deferArray', 'deferObject', 'deferCollection',
				'set'
			].indexOf(currentExec.type) > -1 &&
			(
				!currentExec.payload || // Not set OR
				(isArray(currentExec.payload) && !currentExec.payload.length) || // An empty array
				(isObject(currentExec.payload) && !Object.keys(currentExec.payload).length) // An empty object
			)
		) {
			currentExec.completed = true;
			redo = true;
			continue;
		}
		// }}}

		switch (currentExec.type) {
			case 'parallelArray':
				self._run(currentExec.payload.map(function(task) {
					return function(next) {
						task.call(self._options.context, next);
					};
				}), self._options.limit, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'parallelObject':
				var tasks = [];
				Object.keys(currentExec.payload).forEach(function(key) {
					tasks.push(function(next) {
						currentExec.payload[key].call(self._options.context, function(err, value) {
							self._set(key, value); // Allocate returned value to context
							next(err);
						})
					});
				});
				self._run(tasks, self._options.limit, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'parallelCollection':
				var tasks = [];
				currentExec.payload.forEach(function(task) {
					Object.keys(task).forEach(function(key) {
						tasks.push(function(next, err) {
							if (typeof task[key] != 'function') throw new Error('Collection item for parallel exec is not a function', currentExec.payload);
							task[key].call(self._options.context, function(err, value) {
								self._set(key, value); // Allocate returned value to context
								next(err);
							})
						});
					});
				});
				self._run(tasks, self._options.limit, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'forEachArray':
				self._run(currentExec.payload.map(function(item, iter) {
					self._context._item = item;
					self._context._key = iter;
					return function(next) {
						currentExec.callback.call(self._options.context, next, item, iter);
					};
				}), self._options.limit, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'forEachObject':
				var tasks = [];
				Object.keys(currentExec.payload).forEach(function(key) {
					tasks.push(function(next) {
						self._context._item = currentExec.payload[key];
						self._context._key = key;
						currentExec.callback.call(self._options.context, function(err, value) {
							self._set(key, value); // Allocate returned value to context
							next(err);
						}, currentExec.payload[key], key);
					});
				});
				self._run(tasks, self._options.limit, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'forEachLateBound':
				if (
					(!currentExec.payload || !currentExec.payload.length) || // Payload is blank
					(!self._context[currentExec.payload]) // Payload doesnt exist within context
				) { // Goto next chain
					currentExec.completed = true;
					redo = true;
					break;
				}

				// Replace own exec array with actual type of payload now we know what it is {{{
				var overloadType = getOverload([self._context[currentExec.payload]]);
				switch (overloadType) {
					case 'collection':
					case 'array':
						currentExec.type = 'forEachArray';
						break;
					case 'object':
						currentExec.type = 'forEachObject';
						break;
					default:
						throw new Error('Cannot perform forEach over unknown object type: ' + overloadType);
				}
				currentExec.payload = self._context[currentExec.payload];
				self._structPointer--; // Force re-eval of this chain item now its been replace with its real (late-bound) type
				redo = true;
				// }}}
				break;
			case 'seriesArray':
				self._run(currentExec.payload.map(function(task) {
					return function(next) {
						task.call(self._options.context, next);
					};
				}), 1, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'seriesObject':
				var tasks = [];
				Object.keys(currentExec.payload).forEach(function(key) {
					tasks.push(function(next) {
						currentExec.payload[key].call(self._options.context, function(err, value) {
							self._set(key, value); // Allocate returned value to context
							next(err);
						})
					});
				});
				self._run(tasks, 1, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'seriesCollection':
				var tasks = [];
				currentExec.payload.forEach(function(task) {
					Object.keys(task).forEach(function(key) {
						tasks.push(function(next, err) {
							if (typeof task[key] != 'function') throw new Error('Collection item for series exec is not a function', currentExec.payload);
							task[key].call(self._options.context, function(err, value) {
								self._set(key, value); // Allocate returned value to context
								next(err);
							})
						});
					});
				});
				self._run(tasks, 1, function(err) {
					currentExec.completed = true;
					self._execute(err);
				});
				break;
			case 'deferArray':
				currentExec.payload.forEach(function(task) {
					self._deferAdd(null, task, currentExec);
				});

				redo = true;
				break;
			case 'deferObject':
				Object.keys(currentExec.payload).forEach(function(key) {
					self._deferAdd(key, currentExec.payload[key], currentExec);
				});

				redo = true;
				break;
			case 'deferCollection':
				currentExec.payload.forEach(function(task) {
					Object.keys(task).forEach(function(key) {
						self._deferAdd(key, task[key], currentExec);
					});
				});
				redo = true;
				break;
			case 'await': // Await can operate in two modes, either payload=[] (examine all) else (examine specific keys)
				if (!currentExec.payload.length) { // Check all tasks are complete
					if (self._struct.slice(0, self._structPointer - 1).every(function(stage) { // Examine all items UP TO self one and check they are complete
						return stage.completed;
					})) { // All tasks up to self point are marked as completed
						currentExec.completed = true;
						redo = true;
					} else {
						self._structPointer--; // At least one task is outstanding - rewind to self stage so we repeat on next resolution
					}
				} else { // Check certain tasks are complete by key
					if (currentExec.payload.every(function(dep) { // Examine all named dependencies
						return !! self._context[dep];
					})) { // All are present
						currentExec.completed = true;
						redo = true;
					} else {
						self._structPointer--; // At least one dependency is outstanding - rewind to self stage so we repeat on next resolution
					}
				}
				break;
			case 'limit': // Set the options.limit variable
				self._options.limit = currentExec.payload;
				currentExec.completed = true;
				redo = true; // Move on to next action
				break;
			case 'context': // Change the self._options.context object
				self._options.context = currentExec.payload ? currentExec.payload : self._context; // Set context (if null use internal context)
				currentExec.completed = true;
				redo = true; // Move on to next action
				break;
			case 'set': // Set a hash of variables within context
				Object.keys(currentExec.payload).forEach(function(key) {
					self._set(key, currentExec.payload[key]);
				});
				currentExec.completed = true;
				redo = true; // Move on to next action
				break;
			case 'end': // self should ALWAYS be the last item in the structure and indicates the final function call
				this._finalize();
				break;
			default:
				if (this._plugins[currentExec.type]) { // Is there a plugin that should manage this?
					this._plugins[currentExec.type].call(this, currentExec);
				} else {
					throw new Error('Unknown async-chainable exec type: ' + currentExec.type);
				}
				return;
		}
	} while (redo);
};


/**
* Internal function to run an array of functions (usually in parallel)
* Series execution can be obtained by setting limit = 1
* @param array tasks The array of tasks to execute
* @param int limit The limiter of tasks (if limit==1 tasks are run in series, if limit>1 tasks are run in limited parallel, else tasks are run in parallel)
* @param function callback(err) The callback to fire on finish
*/
function _run(tasks, limit, callback) {
	if (limit == 1) {
		async.series(tasks, callback);
	} else if (limit > 0) {
		async.parallelLimit(tasks, limit, callback);
	} else {
		async.parallel(tasks, callback);
	}
}


/**
* Reset all state variables and return the object into a pristine condition
* @return object This chainable object
*/
function reset() {
	this._struct = [];
	this._structPointer = 0;

	var reAttachContext = (this._options.context == this._context); // Reattach the context pointer after reset?
	this._context = {
		_struct: this._struct,
		_structPointer: this._structPointer,
		_options: this._options,
		_deferredRunning: this._deferredRunning,
	};

	if (reAttachContext) this._options.context = this._context;
};

/**
* Queue up an optional single function for execution on completion
* This function also starts the queue executing
* @return object This chainable object
*/
function end() { 
	var calledAs = getOverload(arguments);
	switch (calledAs) {
		case '': // No functions passed - do nothing
			this._struct.push({ type: 'end', payload: function() {} }); // .end() called with no args - make a noop()
			break;
		case 'function': // Form: end(func) -> redirect as if called with series(func)
			this._struct.push({ type: 'end', payload: arguments[0] });
			break;
		default:
			throw new Error('Unknown call style for .end(): ' + calledAs);
	}

	this._execute();
	return this;
};

var objectInstance = function() {
	// Variables {{{
	this._struct = [];
	this._structPointer = 0;
	this._context = {};

	this._options = {
		autoReset: true, // Run asyncChainable.reset() after finalize. Disable this if you want to see a post-mortem on what did run
		limit: 10, // Number of defer functions that are allowed to execute at once
		context: this._context, // The context item passed to the functions (can be changed with .context())
	};
	// }}}

	// Async-Chainable functions {{{
	// Private {{{
	this._execute = _execute;
	this._run = _run;
	this._deferCheck = _deferCheck;
	this._deferAdd = deferAdd;
	this._deferred = [];
	this._deferredRunning = 0;
	this._finalize = _finalize;
	this._getOverload = getOverload; // So this function is accessible by plugins
	this._plugins = _plugins;
	// }}}

	this.await = await;
	this.context = setContext;
	this.defer = defer;
	this.end = end;
	this.forEach = forEach;
	this.limit = setLimit;
	this.parallel = parallel;
	this.reset = reset;
	this.series = series;
	this.set = set;
	this._set = _set;
	this._setRaw = _setRaw;
	this.then = series;
	this.new = function() { return new objectInstance };
	this.use = use;
	// }}}

	// Async compat functionality - so this module becomes a drop-in replacement {{{
	// Collections
	this.each = async.each;
	this.eachSeries = async.eachSeries;
	this.eachLimit = async.eachLimit;
	this.map = async.map;
	this.mapSeries = async.mapSeries;
	this.mapLimit = async.mapLimit;
	this.filter = async.filter;
	this.filterSeries = async.filterSeries;
	this.reject = async.reject;
	this.rejectSeries = async.rejectSeries;
	this.reduce = async.reduce;
	this.reduceRight = async.reduceRight;
	this.detect = async.detect;
	this.detectSeries = async.detectSeries;
	this.sortBy = async.sortBy;
	this.some = async.some;
	this.every = async.every;
	this.concat = async.concat;
	this.concatSeries = async.concatSeries;

	// Control Flow
	// See main .series() and .parallel() code for async compatibility
	this.parallelLimit = async.parallelLimit;
	this.whilst = async.whilst;
	this.doWhilst = async.doWhilst;
	this.until = async.until;
	this.doUntil = async.doUntil;
	this.forever = async.forever;
	this.waterfall = async.waterfall;
	this.compose = async.compose;
	this.seq = async.seq;
	this.applyEach = async.applyEach;
	this.applyEachSeries = async.applyEachSeries;
	this.queue = async.queue;
	this.priorityQueue = async.priorityQueue;
	this.cargo = async.cargo;
	this.auto = async.auto;
	this.retry = async.retry;
	this.iterator = async.iterator;
	this.apply = async.apply;
	this.nextTick = async.nextTick;
	this.times = async.times;
	this.timesSeries = async.timesSeries;
	this.Utils = async.Utils;

	// Utils
	this.memoize = async.memoize;
	this.unmemoize = async.unmemoize;
	this.log = async.log;
	this.dir = async.dir;
	this.noConflict = async.noConflict;
	// }}}

	this.reset();
	return this;
}

// Return the output object
module.exports = function asyncChainable() {
	return new objectInstance;
};

},{"async":3}],3:[function(require,module,exports){
(function (process,global){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    function noop() {}
    function identity(v) {
        return v;
    }
    function toBool(v) {
        return !!v;
    }
    function notId(v) {
        return !v;
    }

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        return function() {
            if (fn === null) throw new Error("Callback was already called.");
            fn.apply(this, arguments);
            fn = null;
        };
    }

    function _once(fn) {
        return function() {
            if (fn === null) return;
            fn.apply(this, arguments);
            fn = null;
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    // Ported from underscore.js isObject
    var _isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    function _indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    // From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
    function _restParam(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
            }
            // Currently unused but handle cases outside of the switch statement:
            // var args = Array(startIndex + 1);
            // for (index = 0; index < startIndex; index++) {
            //     args[index] = arguments[index];
            // }
            // args[startIndex] = rest;
            // return func.apply(this, args);
        };
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

    var _delay = _setImmediate ? function(fn) {
        // not a direct alias for IE10 compatibility
        _setImmediate(fn);
    } : function(fn) {
        setTimeout(fn, 0);
    };

    if (typeof process === 'object' && typeof process.nextTick === 'function') {
        async.nextTick = process.nextTick;
    } else {
        async.nextTick = _delay;
    }
    async.setImmediate = _setImmediate ? _delay : async.nextTick;


    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];

        var iter = _keyIterator(object);
        var key, completed = 0;

        while ((key = iter()) != null) {
            completed += 1;
            iterator(object[key], key, only_once(done));
        }

        if (completed === 0) callback(null);

        function done(err) {
            completed--;
            if (err) {
                callback(err);
            }
            // Check key is null in case iterator isn't exhausted
            // and done resolved synchronously.
            else if (key === null && completed <= 0) {
                callback(null);
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.setImmediate(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(fn) {
        return function (obj, limit, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        arr = arr || [];
        var results = _isArrayLike(arr) ? [] : {};
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = doParallelLimit(_asyncMap);

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, identity).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    async.transform = function (arr, memo, iterator, callback) {
        if (arguments.length === 3) {
            callback = iterator;
            iterator = memo;
            memo = _isArray(arr) ? [] : {};
        }

        async.eachOf(arr, function(v, k, cb) {
            iterator(memo, v, k, cb);
        }, function(err) {
            callback(err, memo);
        });
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (v) {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectLimit =
    async.filterLimit = doParallelLimit(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectLimit = doParallelLimit(_reject);
    async.rejectSeries = doSeries(_reject);

    function _createTester(eachfn, check, getResult) {
        return function(arr, limit, iterator, cb) {
            function done() {
                if (cb) cb(getResult(false, void 0));
            }
            function iteratee(x, _, callback) {
                if (!cb) return callback();
                iterator(x, function (v) {
                    if (cb && check(v)) {
                        cb(getResult(true, x));
                        cb = iterator = false;
                    }
                    callback();
                });
            }
            if (arguments.length > 3) {
                eachfn(arr, limit, iteratee, done);
            } else {
                cb = iterator;
                iterator = limit;
                eachfn(arr, iteratee, done);
            }
        };
    }

    async.any =
    async.some = _createTester(async.eachOf, toBool, identity);

    async.someLimit = _createTester(async.eachOfLimit, toBool, identity);

    async.all =
    async.every = _createTester(async.eachOf, notId, notId);

    async.everyLimit = _createTester(async.eachOfLimit, notId, notId);

    function _findGetResult(v, x) {
        return x;
    }
    async.detect = _createTester(async.eachOf, identity, _findGetResult);
    async.detectSeries = _createTester(async.eachOfSeries, identity, _findGetResult);
    async.detectLimit = _createTester(async.eachOfLimit, identity, _findGetResult);

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, concurrency, callback) {
        if (typeof arguments[1] === 'function') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = remainingTasks;
        }

        var results = {};
        var runningTasks = 0;

        var hasError = false;

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            var idx = _indexOf(listeners, fn);
            if (idx >= 0) listeners.splice(idx, 1);
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            if (hasError) return;
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = _restParam(function(err, args) {
                runningTasks--;
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _forEachOf(results, function(val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[k] = args;
                    hasError = true;

                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            });
            var requires = task.slice(0, task.length - 1);
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has nonexistent dependency in ' + requires.join(', '));
                }
                if (_isArray(dep) && _indexOf(dep, k) >= 0) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return runningTasks < concurrency && _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                runningTasks++;
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    runningTasks++;
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
            times: DEFAULT_TIMES,
            interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
            if(typeof t === 'number'){
                acc.times = parseInt(t, 10) || DEFAULT_TIMES;
            } else if(typeof t === 'object'){
                acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
                acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
            } else {
                throw new Error('Unsupported argument type for \'times\': ' + typeof t);
            }
        }

        var length = arguments.length;
        if (length < 1 || length > 3) {
            throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
        } else if (length <= 2 && typeof times === 'function') {
            callback = task;
            task = times;
        }
        if (typeof times !== 'function') {
            parseTimes(opts, times);
        }
        opts.callback = callback;
        opts.task = task;

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
                return function(seriesCallback){
                    setTimeout(function(){
                        seriesCallback(null);
                    }, interval);
                };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                    attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return _restParam(function (err, args) {
                if (err) {
                    callback.apply(null, [err].concat(args));
                }
                else {
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            });
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(_restParam(function (err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            }));
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function(tasks, callback) {
        _parallel(async.eachOfSeries, tasks, callback);
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = _restParam(function (fn, args) {
        return _restParam(function (callArgs) {
            return fn.apply(
                null, args.concat(callArgs)
            );
        });
    });

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            var next = _restParam(function(err, args) {
                if (err) {
                    callback(err);
                } else if (test.apply(this, args)) {
                    iterator(next);
                } else {
                    callback.apply(null, [null].concat(args));
                }
            });
            iterator(next);
        } else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        var calls = 0;
        return async.whilst(function() {
            return ++calls <= 1 || test.apply(this, arguments);
        }, iterator, callback);
    };

    async.until = function (test, iterator, callback) {
        return async.whilst(function() {
            return !test.apply(this, arguments);
        }, iterator, callback);
    };

    async.doUntil = function (iterator, test, callback) {
        return async.doWhilst(iterator, function() {
            return !test.apply(this, arguments);
        }, callback);
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;

        var next = _restParam(function(err, args) {
            if (err) {
                callback(err);
            } else {
                args.push(check);
                test.apply(this, args);
            }
        });

        var check = function(err, truth) {
            if (err) {
                callback(err);
            } else if (truth) {
                iterator(next);
            } else {
                callback(null);
            }
        };

        test(check);
    };

    async.doDuring = function (iterator, test, callback) {
        var calls = 0;
        async.during(function(next) {
            if (calls++ < 1) {
                next(null, true);
            } else {
                test.apply(this, arguments);
            }
        }, iterator, callback);
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;

                var removed = false;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    _arrayEach(workersList, function (worker, index) {
                        if (worker === task && !removed) {
                            workersList.splice(index, 1);
                            removed = true;
                        }
                    });

                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var workersList = [];
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                while(!q.paused && workers < q.concurrency && q.tasks.length){

                    var tasks = q.payload ?
                        q.tasks.splice(0, q.payload) :
                        q.tasks.splice(0, q.tasks.length);

                    var data = _map(tasks, function (task) {
                        return task.data;
                    });

                    if (q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    workersList.push(tasks[0]);
                    var cb = only_once(_next(q, tasks));
                    worker(data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            workersList: function () {
                return workersList;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return _restParam(function (fn, args) {
            fn.apply(null, args.concat([_restParam(function (err, args) {
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            })]));
        });
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        var has = Object.prototype.hasOwnProperty;
        hasher = hasher || identity;
        var memoized = _restParam(function memoized(args) {
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (has.call(memo, key)) {   
                async.setImmediate(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (has.call(queues, key)) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([_restParam(function (args) {
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                })]));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return _restParam(function (args) {
            var that = this;

            var callback = args[args.length - 1];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([_restParam(function (err, nextargs) {
                    cb(err, nextargs);
                })]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        });
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn) {
        return _restParam(function(fns, args) {
            var go = _restParam(function(args) {
                var that = this;
                var callback = args.pop();
                return eachfn(fns, function (fn, _, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        });
    }

    async.applyEach = _applyEach(async.eachOf);
    async.applyEachSeries = _applyEach(async.eachOfSeries);


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return _restParam(function (args) {
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        });
    }

    async.ensureAsync = ensureAsync;

    async.constant = _restParam(function(values) {
        var args = [null].concat(values);
        return function (callback) {
            return callback.apply(this, args);
        };
    });

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return _restParam(function (args) {
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (_isObject(result) && typeof result.then === "function") {
                result.then(function(value) {
                    callback(null, value);
                })["catch"](function(err) {
                    callback(err.message ? err : new Error(err));
                });
            } else {
                callback(null, result);
            }
        });
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":4}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[2,1])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYW5ndWxhci1hc3luYy1jaGFpbmFibGUuanMiLCJub2RlX21vZHVsZXMvYXN5bmMtY2hhaW5hYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2FzeW5jL2xpYi9hc3luYy5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbDRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyLWFzeW5jLWNoYWluYWJsZScsIFtdKVxuLnNlcnZpY2UoJyRhc3luYycsIGZ1bmN0aW9uKCkge1xuXHRpZiAoIXdpbmRvdy5hc3luY0NoYWluYWJsZSkgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ2FzeW5jQ2hhaW5hYmxlIG5vdCBsb2FkZWQhJyk7XG5cdHJldHVybiB3aW5kb3cuYXN5bmNDaGFpbmFibGU7XG59KTtcbiIsInZhciBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyk7XG5cbi8qKlxuKiBFeGFtaW5lcyBhbiBhcmd1bWVudCBzdGFjayBhbmQgcmV0dXJucyBhbGwgcGFzc2VkIGFyZ3VtZW50cyBhcyBhIENTVlxuKiBlLmcuXG4qXHRmdW5jdGlvbiB0ZXN0ICgpIHsgZ2V0T3ZlcmxvYWQoYXJndW1lbnRzKSB9O1xuKlx0dGVzdCgnaGVsbG8nLCAnd29ybGQnKSAvLyAnc3RyaW5nLHN0cmluZydcbipcdHRlc3QoZnVuY3Rpb24oKSB7fSwgMSkgLy8gJ2Z1bmN0aW9uLG51bWJlcidcbipcdHRlc3QoJ2hlbGxvJywgMTIzLCB7Zm9vOiAnYmFyJ30sIFsnYmF6J10sIFt7cXV6OiAncXV6VmFsdWUnfSwge3F1dXo6ICdxdXV6VmFsdWUnfV0pIC8vICdzdHJpbmcsbnVtYmVyLG9iamVjdCxhcnJheSxjb2xsZWN0aW9uJ1xuKlxuKiBAcGFyYW0gb2JqZWN0IGFyZ3MgVGhlIHNwZWNpYWwgSmF2YVNjcmlwdCAnYXJndW1lbnRzJyBvYmplY3RcbiogQHJldHVybiBzdHJpbmcgQ1NWIG9mIGFsbCBwYXNzZWQgYXJndW1lbnRzXG4qL1xuZnVuY3Rpb24gZ2V0T3ZlcmxvYWQoYXJncykge1xuXHR2YXIgaSA9IDA7XG5cdHZhciBvdXQgPSBbXTtcblx0d2hpbGUoMSkge1xuXHRcdHZhciBhcmdUeXBlID0gdHlwZW9mIGFyZ3NbaV07XG5cdFx0aWYgKGFyZ1R5cGUgPT0gJ3VuZGVmaW5lZCcpIGJyZWFrO1xuXHRcdGlmIChhcmdUeXBlID09ICdvYmplY3QnICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmdzW2ldKSA9PSAnW29iamVjdCBBcnJheV0nKSB7IC8vIFNwZWNpYWwgY2FzZSBmb3IgYXJyYXlzIGJlaW5nIGNsYXNzZWQgYXMgb2JqZWN0c1xuXHRcdFx0YXJnVHlwZSA9ICdhcnJheSc7XG5cdFx0XHRpZiAoYXJnc1tpXS5sZW5ndGggJiYgYXJnc1tpXS5ldmVyeShmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdHJldHVybiAodHlwZW9mIGl0ZW0gPT0gJ29iamVjdCcgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGl0ZW0pID09ICdbb2JqZWN0IE9iamVjdF0nKTtcblx0XHRcdH0pKVxuXHRcdFx0XHRhcmdUeXBlID0gJ2NvbGxlY3Rpb24nO1xuXHRcdH1cblx0XHRvdXQucHVzaChhcmdUeXBlKTtcblx0XHRpKys7XG5cdH1cblx0cmV0dXJuIG91dC50b1N0cmluZygpO1xufTtcblxuLy8gVXRpbGl0eSBmdW5jdGlvbnMge3t7XG4vKipcbiogUmV0dXJuIHRydWUgaWYgYSB2YXJpYWJsZSBpcyBhbiBhcnJheVxuKiBAcGFyYW0gbWl4ZWQgdGhpbmcgVGhlIHZhcmFibGUgdG8gZXhhbWluZVxuKiBAcmV0dXJuIGJvb2wgVHJ1ZSBpZiB0aGUgaXRlbSBpcyBhIGNsYXNzaWMgSlMgYXJyYXkgYW5kIG5vdCBhbiBvYmplY3RcbiovXG5mdW5jdGlvbiBpc0FycmF5KHRoaW5nKSB7XG5cdHJldHVybiAoXG5cdFx0dHlwZW9mIHRoaW5nID09ICdvYmplY3QnICYmXG5cdFx0T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaW5nKSA9PSAnW29iamVjdCBBcnJheV0nXG5cdCk7XG59XG5cblxuLyoqXG4qIFJldHVybiB0cnVlIGlmIGEgdmFyaWFibGUgaXMgYW4gb2JqZWN0XG4qIEBwYXJhbSBtaXhlZCB0aGluZyBUaGUgdmFyYWJsZSB0byBleGFtaW5lXG4qIEByZXR1cm4gYm9vbCBUcnVlIGlmIHRoZSBpdGVtIGlzIGEgY2xhc3NpYyBKUyBhcnJheSBhbmQgbm90IGFuIG9iamVjdFxuKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHRoaW5nKSB7XG5cdHJldHVybiAoXG5cdFx0dHlwZW9mIHRoaW5nID09ICdvYmplY3QnICYmXG5cdFx0T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaW5nKSAhPSAnW29iamVjdCBBcnJheV0nXG5cdCk7XG59XG4vLyB9fX1cblxuLy8gUGx1Z2luIGZ1bmN0aW9uYWxpdHkgLSB2aWEgYHVzZSgpYFxudmFyIF9wbHVnaW5zID0ge307XG5mdW5jdGlvbiB1c2UobW9kdWxlKSB7XG5cdG1vZHVsZS5jYWxsKHRoaXMpO1xuXHRyZXR1cm4gdGhpcztcbn07XG4vLyB9fX1cblxuLyoqXG4qIFF1ZXVlIHVwIGEgZnVuY3Rpb24ocykgdG8gZXhlY3V0ZSBpbiBzZXJpZXNcbiogQHBhcmFtIGFycmF5LG9iamVjdCxmdW5jdGlvbiBUaGUgZnVuY3Rpb24ocykgdG8gZXhlY3V0ZVxuKiBAcmV0dXJuIG9iamVjdCBUaGlzIGNoYWluYWJsZSBvYmplY3RcbiovXG5mdW5jdGlvbiBzZXJpZXMoKSB7XG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cyk7XG5cdHN3aXRjaChjYWxsZWRBcykge1xuXHRcdGNhc2UgJyc6XG5cdFx0XHQvLyBQYXNzXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdmdW5jdGlvbic6IC8vIEZvcm06IHNlcmllcyhmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzQXJyYXknLCBwYXlsb2FkOiBbYXJndW1lbnRzWzBdXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgICdzdHJpbmcsZnVuY3Rpb24nOiAvLyBGb3JtOiBzZXJpZXMoU3RyaW5nIDxpZD4sIGZ1bmMpXG5cdFx0XHR2YXIgcGF5bG9hZCA9IHt9O1xuXHRcdFx0cGF5bG9hZFthcmd1bWVudHNbMF1dID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzT2JqZWN0JywgcGF5bG9hZDogcGF5bG9hZH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnYXJyYXknOiAvLyBGb3JtOiBzZXJpZXMoQXJyYXkgPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3Nlcmllc0FycmF5JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb2JqZWN0JzogLy8gRm9ybTogc2VyaWVzKE9iamVjdCA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzT2JqZWN0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnY29sbGVjdGlvbic6IC8vIEZvcm06IHNlcmllcyhDb2xsZWN0aW9uIDxmdW5jcz4pXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNDb2xsZWN0aW9uJywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cblx0XHQvLyBBc3luYyBsaWJyYXJ5IGNvbXBhdGliaWxpdHkge3t7XG5cdFx0Y2FzZSAnYXJyYXksZnVuY3Rpb24nOlxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzQXJyYXknLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHR0aGlzLmVuZChhcmd1bWVudHNbMV0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb2JqZWN0LGZ1bmN0aW9uJzpcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3Nlcmllc09iamVjdCcsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdHRoaXMuZW5kKGFyZ3VtZW50c1sxXSk7XG5cdFx0XHRicmVhaztcblx0XHQvLyB9fX1cblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNhbGwgc3R5bGUgZm9yIC5zZXJpZXMoKTogJyArIGNhbGxlZEFzKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogUXVldWUgdXAgYSBmdW5jdGlvbihzKSB0byBleGVjdXRlIGluIHBhcmFsbGVsXG4qIEBwYXJhbSBhcnJheSxvYmplY3QsZnVuY3Rpb24gVGhlIGZ1bmN0aW9uKHMpIHRvIGV4ZWN1dGVcbiogQHJldHVybiBvYmplY3QgVGhpcyBjaGFpbmFibGUgb2JqZWN0XG4qL1xuZnVuY3Rpb24gcGFyYWxsZWwoKSB7XG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cylcblx0c3dpdGNoIChjYWxsZWRBcykge1xuXHRcdGNhc2UgJyc6XG5cdFx0XHQvLyBQYXNzXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdmdW5jdGlvbic6IC8vIEZvcm06IHBhcmFsbGVsKGZ1bmMpXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdwYXJhbGxlbEFycmF5JywgcGF5bG9hZDogW2FyZ3VtZW50c1swXV0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdzdHJpbmcsZnVuY3Rpb24nOiAvLyBGb3JtOiBwYXJhbGxlbChTdHJpbmcgPGlkPiwgZnVuYylcblx0XHRcdHZhciBwYXlsb2FkID0ge307XG5cdFx0XHRwYXlsb2FkW2FyZ3VtZW50c1swXV0gPSBhcmd1bWVudHNbMV07XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdwYXJhbGxlbEFycmF5JywgcGF5bG9hZDogcGF5bG9hZCB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2FycmF5JzogLy8gRm9ybTogcGFyYWxsZWwoQXJyYXkgPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsQXJyYXknLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdvYmplY3QnOiAvLyBGb3JtOiBwYXJhbGxlbChPYmplY3QgPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsT2JqZWN0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnY29sbGVjdGlvbic6IC8vIEZvcm06IHBhcmFsbGVsKENvbGxlY3Rpb24gPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsQ29sbGVjdGlvbicsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Ly8gQXN5bmMgbGlicmFyeSBjb21wYXRpYmlsaXR5IHt7e1xuXHRcdGNhc2UgJ2FycmF5LGZ1bmN0aW9uJzpcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsQXJyYXknLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHR0aGlzLmVuZChhcmd1bWVudHNbMV0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb2JqZWN0LGZ1bmN0aW9uJzpcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsT2JqZWN0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0dGhpcy5lbmQoYXJndW1lbnRzWzFdKTtcblx0XHRcdGJyZWFrO1xuXHRcdC8vIH19fVxuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLnBhcmFsbGVsKCk6ICcgKyBjYWxsZWRBcyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIFJ1biBhbiBhcnJheS9vYmplY3QvY29sbGVjdGlvbiB0aG91Z2ggYSBmdW5jdGlvblxuKiBUaGlzIGlzIHNpbWlsYXIgdG8gdGhlIGFzeW5jIG5hdGl2ZSAuZWFjaCgpIGZ1bmN0aW9uIGJ1dCBjaGFpbmFibGVcbiovXG5mdW5jdGlvbiBmb3JFYWNoKCkge1xuXHR2YXIgY2FsbGVkQXMgPSBnZXRPdmVybG9hZChhcmd1bWVudHMpXG5cdHN3aXRjaCAoY2FsbGVkQXMpIHtcblx0XHRjYXNlICcnOlxuXHRcdFx0Ly8gUGFzc1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnY29sbGVjdGlvbixmdW5jdGlvbic6IC8vIEZvcm06IGZvckVhY2goQ29sbGVjdGlvbiBmdW5jKVxuXHRcdGNhc2UgJ2FycmF5LGZ1bmN0aW9uJzogLy8gRm9ybTogZm9yRWFjaChBcnJheSwgZnVuYylcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2ZvckVhY2hBcnJheScsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSwgY2FsbGJhY2s6IGFyZ3VtZW50c1sxXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ29iamVjdCxmdW5jdGlvbic6IC8vIEZvcm06IGZvckVhY2goT2JqZWN0LCBmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZm9yRWFjaE9iamVjdCcsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSwgY2FsbGJhY2s6IGFyZ3VtZW50c1sxXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ3N0cmluZyxmdW5jdGlvbic6IC8vIEZvcm06IGZvckVhY2goU3RyaW5nIDxzZXQgbG9va3VwPiwgZnVuYylcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2ZvckVhY2hMYXRlQm91bmQnLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0sIGNhbGxiYWNrOiBhcmd1bWVudHNbMV0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNhbGwgc3R5bGUgZm9yIC5mb3JFYWNoKCk6ICcgKyBjYWxsZWRBcyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG4vLyBEZWZlciBmdW5jdGlvbmFsaXR5IC0gSGVyZSBiZSBkcmFnb25zISB7e3tcbi8qKlxuKiBDb2xsZWN0aW9uIG9mIGl0ZW1zIHRoYXQgaGF2ZSBiZWVuIGRlZmVycmVkXG4qIEB0eXBlIGNvbGxlY3Rpb24ge3BheWxvYWQ6IGZ1bmN0aW9uLCBpZDogbnVsbHxTdHJpbmcsIHByZXJlcTogW2RlcDEsIGRlcDIuLi5dfVxuKiBAYWNjZXNzIHByaXZhdGVcbiovXG5mdW5jdGlvbiBkZWZlckFkZChpZCwgdGFzaywgcGFyZW50Q2hhaW4pIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRwYXJlbnRDaGFpbi53YWl0aW5nT24gPSAocGFyZW50Q2hhaW4ud2FpdGluZ09uIHx8IDApICsgMTtcblxuXHRpZiAoISBwYXJlbnRDaGFpbi53YWl0aW5nT25JZHMpXG5cdFx0cGFyZW50Q2hhaW4ud2FpdGluZ09uSWRzID0gW107XG5cdHBhcmVudENoYWluLndhaXRpbmdPbklkcy5wdXNoKGlkKTtcblxuXHRzZWxmLl9kZWZlcnJlZC5wdXNoKHtcblx0XHRpZDogaWQgfHwgbnVsbCxcblx0XHRwcmVyZXE6IHBhcmVudENoYWluLnByZXJlcSB8fCBbXSxcblx0XHRwYXlsb2FkOiBmdW5jdGlvbihuZXh0KSB7XG5cdFx0XHRzZWxmLl9jb250ZXh0Ll9pZCA9IGlkO1xuXHRcdFx0dGFzay5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuXHRcdFx0XHRpZiAoaWQpXG5cdFx0XHRcdFx0c2VsZi5fY29udGV4dFtpZF0gPSB2YWx1ZTtcblx0XHRcdFx0c2VsZi5fZGVmZXJyZWRSdW5uaW5nLS07XG5cdFx0XHRcdGlmICgtLXBhcmVudENoYWluLndhaXRpbmdPbiA9PSAwKSB7XG5cdFx0XHRcdFx0cGFyZW50Q2hhaW4uY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRpZiAoc2VsZi5fc3RydWN0Lmxlbmd0aCAmJiBzZWxmLl9zdHJ1Y3Rbc2VsZi5fc3RydWN0UG9pbnRlcl0udHlwZSA9PSAnYXdhaXQnKVxuXHRcdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNlbGYuX2V4ZWN1dGUoZXJyKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSk7XG59O1xuXG5cbmZ1bmN0aW9uIF9kZWZlckNoZWNrKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmIChzZWxmLl9vcHRpb25zLmxpbWl0ICYmIHNlbGYuX2RlZmVycmVkUnVubmluZyA+PSBzZWxmLl9vcHRpb25zLmxpbWl0KSByZXR1cm47IC8vIEFscmVhZHkgb3ZlciBsaW1pdFxuXHRzZWxmLl9kZWZlcnJlZCA9IHNlbGYuX2RlZmVycmVkLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG5cdFx0aWYgKHNlbGYuX29wdGlvbnMubGltaXQgJiYgc2VsZi5fZGVmZXJyZWRSdW5uaW5nID49IHNlbGYuX29wdGlvbnMubGltaXQpIHtcblx0XHRcdHJldHVybiB0cnVlOyAvLyBBbHJlYWR5IG92ZXIgbGltaXQgLSBhbGwgc3Vic2VxZW50IGl0ZW1zIHNob3VsZCBiZSBsZWZ0IGluIHBsYWNlXG5cdFx0fVxuXHRcdGlmIChcblx0XHRcdGl0ZW0ucHJlcmVxLmxlbmd0aCA9PSAwIHx8IC8vIE5vIHByZS1yZXFzIC0gY2FuIGV4ZWN1dGUgbm93XG5cdFx0XHRpdGVtLnByZXJlcS5ldmVyeShmdW5jdGlvbihkZXApIHsgLy8gQWxsIHByZS1yZXFzIGFyZSBzYXRpc2ZpZWRcblx0XHRcdFx0cmV0dXJuIHNlbGYuX2NvbnRleHQuaGFzT3duUHJvcGVydHkoZGVwKTtcblx0XHRcdH0pXG5cdFx0KSB7IFxuXHRcdFx0c2VsZi5fZGVmZXJyZWRSdW5uaW5nKys7XG5cdFx0XHRzZXRUaW1lb3V0KGl0ZW0ucGF5bG9hZCk7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fSBlbHNlIHsgLy8gQ2FuJ3QgZG8gYW55dGhpbmcgd2l0aCBzZWxmIHJpZ2h0IG5vd1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9KTtcbn07XG4vLyB9fX1cblxuXG4vKipcbiogUXVldWUgdXAgYSBmdW5jdGlvbihzKSB0byBleGVjdXRlIGFzIGRlZmVycmVkIC0gaS5lLiBkb250IHN0b3AgdG8gd2FpdCBmb3IgaXRcbiogQHBhcmFtIGFycmF5LG9iamVjdCxmdW5jdGlvbiBUaGUgZnVuY3Rpb24ocykgdG8gZXhlY3V0ZSBhcyBhIGRlZmVyXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIGRlZmVyKCkge1xuXHR2YXIgY2FsbGVkQXMgPSBnZXRPdmVybG9hZChhcmd1bWVudHMpO1xuXHRzd2l0Y2ggKGNhbGxlZEFzKSB7XG5cdFx0Y2FzZSAnJzpcblx0XHRcdC8vIFBhc3Ncblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2Z1bmN0aW9uJzogLy8gRm9ybTogZGVmZXIoZnVuYylcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2RlZmVyQXJyYXknLCBwYXlsb2FkOiBbYXJndW1lbnRzWzBdXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ3N0cmluZyxmdW5jdGlvbic6IC8vIEZvcm06IGRlZmVyKFN0cmluZyA8aWQ+LCBmdW5jKVxuXHRcdFx0dmFyIHBheWxvYWQgPSB7fTtcblx0XHRcdHBheWxvYWRbYXJndW1lbnRzWzBdXSA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2RlZmVyT2JqZWN0JywgcGF5bG9hZDogcGF5bG9hZCB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2FycmF5JzogLy8gRm9ybTogZGVmZXIoQXJyYXkgPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2RlZmVyQXJyYXknLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdvYmplY3QnOiAvLyBGb3JtOiBkZWZlcihPYmplY3QgPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2RlZmVyT2JqZWN0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnY29sbGVjdGlvbic6IC8vIEZvcm0gZGVmZXIoQ29sbGVjdGlvbiA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZGVmZXJDb2xsZWN0aW9uJywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnYXJyYXksZnVuY3Rpb24nOiAvLyBGb3JtOiBkZWZlcihBcnJheSA8cHJlcmVxcz4sIGZ1bmMpXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdkZWZlckFycmF5JywgcHJlcmVxOiBhcmd1bWVudHNbMF0sIHBheWxvYWQ6IFthcmd1bWVudHNbMV1dIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3RyaW5nLHN0cmluZyxmdW5jdGlvbic6IC8vIEZvcm06IGRlZmVyKFN0cmluZyA8cHJlcmVxPiwgU3RyaW5nIDxuYW1lPiwgZnVuYylcblx0XHRcdHZhciBwYXlsb2FkID0ge307XG5cdFx0XHRwYXlsb2FkW2FyZ3VtZW50c1sxXV0gPSBhcmd1bWVudHNbMl07XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdkZWZlck9iamVjdCcsIHByZXJlcTogW2FyZ3VtZW50c1swXV0sIHBheWxvYWQ6IHBheWxvYWQgfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdhcnJheSxzdHJpbmcsZnVuY3Rpb24nOiAvL0Zvcm06IGRlZmVyKEFycmF5IDxwcmVyZXFzPiwgU3RyaW5nIDxpZD4sIGZ1bmMpXG5cdFx0XHR2YXIgcGF5bG9hZCA9IHt9O1xuXHRcdFx0cGF5bG9hZFthcmd1bWVudHNbMV1dID0gYXJndW1lbnRzWzJdO1xuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZGVmZXJPYmplY3QnLCBwcmVyZXE6IGFyZ3VtZW50c1swXSwgcGF5bG9hZDogcGF5bG9hZCB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLmRlZmVyKCk6JyArIGNhbGxlZEFzKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogUXVldWUgdXAgYW4gYXdhaXQgcG9pbnRcbiogVGhpcyBzdG9wcyB0aGUgZXhlY3V0aW9uIHF1ZXVlIHVudGlsIGl0cyBzYXRpc2ZpZWQgdGhhdCBkZXBlbmRlbmNpZXMgaGF2ZSBiZWVuIHJlc29sdmVkXG4qIEBwYXJhbSBhcnJheSwuLi4gVGhlIGRlcGVuZGVuY2llcyB0byBjaGVjayByZXNvbHV0aW9uIG9mLiBJZiBvbWl0dGVkIGFsbCBhcmUgY2hlY2tlZFxuKiBAcmV0dXJuIG9iamVjdCBUaGlzIGNoYWluYWJsZSBvYmplY3RcbiovXG5mdW5jdGlvbiBhd2FpdCgpIHtcblx0dmFyIHBheWxvYWQgPSBbXTtcblxuXHQvLyBTbHVycCBhbGwgYXJncyBpbnRvIHBheWxvYWQge3t7XG5cdHZhciBhcmdzID0gYXJndW1lbnRzO1xuXHRnZXRPdmVybG9hZChhcmd1bWVudHMpLnNwbGl0KCcsJykuZm9yRWFjaChmdW5jdGlvbih0eXBlLCBvZmZzZXQpIHtcblx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdGNhc2UgJyc6IC8vIEJsYW5rIGFyZ3VtZW50cyAtIGRvIG5vdGhpbmdcblx0XHRcdFx0Ly8gUGFzc1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3N0cmluZyc6XG5cdFx0XHRcdHBheWxvYWQucHVzaChhcmdzW29mZnNldF0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2FycmF5Jzpcblx0XHRcdFx0cGF5bG9hZC5jb25jYXQoYXJnc1tvZmZzZXRdKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gYXJndW1lbnQgdHlwZSBwYXNzZWQgdG8gLmF3YWl0KCk6ICcgKyB0eXBlKTtcblx0XHR9XG5cdH0pO1xuXHQvLyB9fX1cblxuXHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdhd2FpdCcsIHBheWxvYWQ6IHBheWxvYWQgfSk7XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuKiBRdWV1ZSB1cCBhIGxpbWl0IHNldHRlclxuKiBAcGFyYW0gaW50fG51bGx8ZmFsc2UgRWl0aGVyIHRoZSBudW1iZXIgb2YgZGVmZXIgcHJvY2Vzc2VzIHRoYXQgYXJlIGFsbG93ZWQgdG8gZXhlY3V0ZSBzaW11bHRhbmlvdXNseSBvciBmYWxzeSB2YWx1ZXMgdG8gZGlzYWJsZVxuKiBAcmV0dXJuIG9iamVjdCBUaGlzIGNoYWluYWJsZSBvYmplY3RcbiovXG5mdW5jdGlvbiBzZXRMaW1pdChzZXRMaW1pdCkge1xuXHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdsaW1pdCcsIHBheWxvYWQ6IHNldExpbWl0IH0pO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIFF1ZXVlIHVwIGEgY29udGV4dCBzZXR0ZXJcbiogQHBhcmFtIG9iamVjdCBuZXdDb250ZXh0IFRoZSBuZXcgY29udGV4dCB0byBwYXNzIHRvIGFsbCBzdWJzZXF1ZW50IGZ1bmN0aW9ucyB2aWEgYHRoaXNgXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIHNldENvbnRleHQobmV3Q29udGV4dCkge1xuXHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdjb250ZXh0JywgcGF5bG9hZDogbmV3Q29udGV4dCB9KTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuKiBRdWV1ZSB1cCBhIHZhcmFibGUgc2V0dGVyIChpLmUuIHNldCBhIGhhc2ggb2YgdmFyaWFibGVzIGluIGNvbnRleHQpXG4qIEBwYXJhbSBzdHJpbmcgVGhlIG5hbWVkIGtleSB0byBzZXRcbiogQHBhcmFtIG1peGVkIFRoZSB2YWx1ZSB0byBzZXRcbiogQHJldHVybiBvYmplY3QgVGhpcyBjaGFpbmFibGUgb2JqZWN0XG4qL1xuZnVuY3Rpb24gc2V0KCkge1xuXHR2YXIgY2FsbGVkQXMgPSBnZXRPdmVybG9hZChhcmd1bWVudHMpO1xuXHRzd2l0Y2goY2FsbGVkQXMpIHtcblx0XHRjYXNlICcnOlxuXHRcdFx0Ly8gUGFzc1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3RyaW5nLHN0cmluZyc6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIFN0cmluZyA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxudW1iZXInOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBOdW1iZXIgPHZhbHVlPilcblx0XHRjYXNlICdzdHJpbmcsYm9vbGVhbic6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIEJvb2xlYW4gPHZhbHVlPilcblx0XHRjYXNlICdzdHJpbmcsYXJyYXknOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBBcnJheSA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxjb2xsZWN0aW9uJzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgQ29sbGVjdGlvbiA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxvYmplY3QnOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBPYmplY3QgPHZhbHVlPilcblx0XHRcdHZhciBwYXlsb2FkID0ge307XG5cdFx0XHRwYXlsb2FkW2FyZ3VtZW50c1swXV0gPSBhcmd1bWVudHNbMV07XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXQnLCBwYXlsb2FkOiBwYXlsb2FkIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb2JqZWN0JzogLy8gRm9ybTogc2V0KE9iamVjdClcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3NldCcsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2Z1bmN0aW9uJzogLy8gRm9ybTogc2V0KGZ1bmMpIC0+IHNlcmllcyhmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzQXJyYXknLCBwYXlsb2FkOiBbYXJndW1lbnRzWzBdXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgICdzdHJpbmcsZnVuY3Rpb24nOiAvLyBGb3JtOiBzZXQoU3RyaW5nLCBmdW5jKSAtPiBzZXJpZXMoU3RyaW5nIDxpZD4sIGZ1bmMpXG5cdFx0XHR2YXIgcGF5bG9hZCA9IHt9O1xuXHRcdFx0cGF5bG9hZFthcmd1bWVudHNbMF1dID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzT2JqZWN0JywgcGF5bG9hZDogcGF5bG9hZH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3RyaW5nJzogLy8gU2V0IHRvIHVuZGVmaW5lZFxuXHRcdFx0dGhpcy5fc2V0UmF3KGFyZ3VtZW50c1swXSwgdW5kZWZpbmVkKTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLnNldCgpOicgKyBjYWxsZWRBcyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIFNldCBhIGNvbnRleHQgaXRlbXMgdmFsdWVcbiogTm90IHRvIGJlIGNvbmZ1c2VkIHdpdGggYHNldCgpYCB3aGljaCBpcyB0aGUgY2hhaW5hYmxlIGV4dGVybmFsIHZpc2libGUgdmVyc2lvbiBvZiB0aGlzXG4qIFVubGlrZSBgc2V0KClgIHRoaXMgZnVuY3Rpb24gc2V0cyBhbiBpdGVtIG9mIF9jb250ZXh0IGltbWVkaWF0ZWx5XG4qIEBhY2Nlc3MgcHJpdmF0ZVxuKiBAc2VlIF9zZXRSYXcoKVxuKi9cbmZ1bmN0aW9uIF9zZXQoKSB7XG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cyk7XG5cdHN3aXRjaChjYWxsZWRBcykge1xuXHRcdGNhc2UgJyc6XG5cdFx0XHQvLyBQYXNzXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdzdHJpbmcsc3RyaW5nJzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgU3RyaW5nIDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLG51bWJlcic6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIE51bWJlciA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxib29sZWFuJzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgQm9vbGVhbiA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxhcnJheSc6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIEFycmF5IDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLGNvbGxlY3Rpb24nOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBDb2xsZWN0aW9uIDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLG9iamVjdCc6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIE9iamVjdCA8dmFsdWU+KVxuXHRcdFx0dGhpcy5fc2V0UmF3KGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ29iamVjdCc6IC8vIEZvcm06IHNldChPYmplY3QpXG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzWzBdKVxuXHRcdFx0XHR0aGlzLl9zZXRSYXcoa2V5LCBhcmd1bWVudHNbMF1ba2V5XSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICAnc3RyaW5nLGZ1bmN0aW9uJzogLy8gRm9ybTogc2V0KFN0cmluZywgZnVuYykgLT4gc2VyaWVzKFN0cmluZyA8aWQ+LCBmdW5jKVxuXHRcdFx0dGhpcy5fc2V0UmF3KGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdLmNhbGwodGhpcykpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnZnVuY3Rpb24nOiAvLyBGb3JtOiBfc2V0KGZ1bmMpIC8vIEV4cGVjdCBmdW5jIHRvIHJldHVybiBzb21ldGhpbmcgd2hpY2ggaXMgdGhlbiBwcm9jZXNzZWQgdG8gX3NldFxuXHRcdFx0dGhpcy5fc2V0KGFyZ3VtZW50c1sxXS5jYWxsKHRoaXMpKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ3N0cmluZyc6IC8vIFNldCB0byB1bmRlZmluZWRcblx0XHRcdHRoaXMuX3NldFJhdyhhcmd1bWVudHNbMF0sIHVuZGVmaW5lZCk7XG5cdFx0XHRicmVhaztcblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNhbGwgc3R5bGUgZm9yIC5zZXQoKTonICsgY2FsbGVkQXMpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4qIEFjdHVhbCByYXcgdmFsdWUgc2V0dGVyXG4qIFRoaXMgZnVuY3Rpb24gaXMgdGhlIGludGVybmFsIHZlcnNpb24gb2YgX3NldCB3aGljaCB0YWtlcyBleGFjdGx5IHR3byB2YWx1ZXMsIHRoZSBrZXkgYW5kIHRoZSB2YWx1ZSB0byBzZXRcbiogT3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiBpZiBzb21lIGFsdGVybmF0aXZlIF9jb250ZXh0IHBsYXRmb3JtIGlzIHJlcXVpcmVkXG4qIEBwYXJhbSBzdHJpbmcga2V5IFRoZSBrZXkgd2l0aGluIF9jb250ZXh0IHRvIHNldCB0aGUgdmFsdWUgb2ZcbiogQHBhcmFtIG1peGVkIHZhbHVlIFRoZSB2YWx1ZSB3aXRoaW4gX2NvbnRleHRba2V5XSB0byBzZXQgdGhlIHZhbHVlIG9mXG4qIEBhY2Nlc3MgcHJpdmF0ZVxuKi9cbmZ1bmN0aW9uIF9zZXRSYXcoa2V5LCB2YWx1ZSkge1xuXHR0aGlzLl9jb250ZXh0W2tleV0gPSB2YWx1ZTtcblx0cmV0dXJuIHRoaXM7XG59XG5cblxuLyoqXG4qIEludGVybmFsIGZ1bmN0aW9uIGV4ZWN1dGVkIGF0IHRoZSBlbmQgb2YgdGhlIGNoYWluXG4qIFRoaXMgY2FuIG9jY3VyIGVpdGhlciBpbiBzZXF1ZW5jZSAoaS5lLiBubyBlcnJvcnMpIG9yIGEganVtcCB0byB0aGlzIHBvc2l0aW9uIChpLmUuIGFuIGVycm9yIGhhcHBlbmVkIHNvbWV3aGVyZSlcbiogQGFjY2VzcyBwcml2YXRlXG4qL1xuZnVuY3Rpb24gX2ZpbmFsaXplKGVycikge1xuXHQvLyBTYW5pdHkgY2hlY2tzIHt7e1xuXHRpZiAodGhpcy5fc3RydWN0Lmxlbmd0aCA9PSAwKSByZXR1cm47IC8vIEZpbmFsaXplIGNhbGxlZCBvbiBkZWFkIG9iamVjdCAtIHByb2JhYmx5IGEgZGVmZXIoKSBmaXJlZCB3aXRob3V0IGFuIGF3YWl0KClcblx0aWYgKHRoaXMuX3N0cnVjdFt0aGlzLl9zdHJ1Y3QubGVuZ3RoIC0gMV0udHlwZSAhPSAnZW5kJykge1xuXHRcdHRocm93IG5ldyBFcnJvcignV2hpbGUgdHJ5aW5nIHRvIGZpbmQgYW4gZW5kIHBvaW50IGluIHRoZSBhc3luYy1jaGFpbmFibGUgc3RydWN0dXJlIHRoZSBsYXN0IGl0ZW0gaW4gdGhlIHRoaXMuX3N0cnVjdCBkb2VzIG5vdCBoYXZlIHR5cGU9PWVuZCEnKTtcblx0XHRyZXR1cm47XG5cdH1cblx0Ly8gfX19XG5cdHRoaXMuX3N0cnVjdFt0aGlzLl9zdHJ1Y3QubGVuZ3RoLTFdLnBheWxvYWQuY2FsbCh0aGlzLl9vcHRpb25zLmNvbnRleHQsIGVycik7XG5cdGlmICh0aGlzLl9vcHRpb25zLmF1dG9SZXNldClcblx0XHR0aGlzLnJlc2V0KCk7XG59O1xuXG5cbi8qKlxuKiBJbnRlcm5hbCBmdW5jdGlvbiB0byBleGVjdXRlIHRoZSBuZXh0IHBlbmRpbmcgcXVldWUgaXRlbVxuKiBUaGlzIGlzIHVzdWFsbHkgY2FsbGVkIGFmdGVyIHRoZSBjb21wbGV0aW9uIG9mIGV2ZXJ5IGFzeW5jLnNlcmllcygpIC8gYXN5bmMucGFyYWxsZWwoKSAvIGFzeW5jQ2hhaW5hYmxlLl9ydW4gY2FsbFxuKiBAYWNjZXNzIHByaXZhdGVcbiovXG5mdW5jdGlvbiBfZXhlY3V0ZShlcnIpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXHRpZiAoZXJyKSByZXR1cm4gdGhpcy5fZmluYWxpemUoZXJyKTsgLy8gQW4gZXJyb3IgaGFzIGJlZW4gcmFpc2VkIC0gc3RvcCBleGVjIGFuZCBjYWxsIGZpbmFsaXplIG5vd1xuXHRkbyB7XG5cdFx0dmFyIHJlZG8gPSBmYWxzZTtcblx0XHRpZiAoc2VsZi5fc3RydWN0UG9pbnRlciA+PSBzZWxmLl9zdHJ1Y3QubGVuZ3RoKSByZXR1cm4gdGhpcy5fZmluYWxpemUoZXJyKTsgLy8gTm90aGluZyBtb3JlIHRvIGV4ZWN1dGUgaW4gc3RydWN0XG5cdFx0c2VsZi5fZGVmZXJDaGVjaygpOyAvLyBLaWNrIG9mZiBhbnkgcGVuZGluZyBkZWZlcnJlZCBpdGVtc1xuXHRcdHZhciBjdXJyZW50RXhlYyA9IHNlbGYuX3N0cnVjdFtzZWxmLl9zdHJ1Y3RQb2ludGVyXTtcblx0XHQvLyBTYW5pdHkgY2hlY2tzIHt7e1xuXHRcdGlmICghY3VycmVudEV4ZWMudHlwZSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdObyB0eXBlIGlzIHNwZWNpZmllZCBmb3IgYXN5bmMtY2hhaW5hYmxlIHN0cnVjdHVyZSBhdCBvZmZzZXQgJyArIHNlbGYuX3N0cnVjdFBvaW50ZXIpO1xuXHRcdFx0cmV0dXJuIHNlbGY7XG5cdFx0fVxuXHRcdC8vIH19fVxuXHRcdHNlbGYuX3N0cnVjdFBvaW50ZXIrKztcblxuXHRcdC8vIFNraXAgc3RlcCB3aGVuIGZ1bmN0aW9uIHN1cHBvcnRzIHNraXBwaW5nIGlmIHRoZSBhcmd1bWVudCBpcyBlbXB0eSB7e3tcblx0XHRpZiAoXG5cdFx0XHRbXG5cdFx0XHRcdCdwYXJhbGxlbEFycmF5JywgJ3BhcmFsbGVsT2JqZWN0JywgJ3BhcmFsbGVsQ29sbGVjdGlvbicsXG5cdFx0XHRcdCdmb3JFYWNoQXJyYXknLCAnZm9yRWFjaE9iamVjdCcsXG5cdFx0XHRcdCdzZXJpZXNBcnJheScsICdzZXJpZXNPYmplY3QnLCAnc2VyaWVzQ29sbGVjdGlvbicsXG5cdFx0XHRcdCdkZWZlckFycmF5JywgJ2RlZmVyT2JqZWN0JywgJ2RlZmVyQ29sbGVjdGlvbicsXG5cdFx0XHRcdCdzZXQnXG5cdFx0XHRdLmluZGV4T2YoY3VycmVudEV4ZWMudHlwZSkgPiAtMSAmJlxuXHRcdFx0KFxuXHRcdFx0XHQhY3VycmVudEV4ZWMucGF5bG9hZCB8fCAvLyBOb3Qgc2V0IE9SXG5cdFx0XHRcdChpc0FycmF5KGN1cnJlbnRFeGVjLnBheWxvYWQpICYmICFjdXJyZW50RXhlYy5wYXlsb2FkLmxlbmd0aCkgfHwgLy8gQW4gZW1wdHkgYXJyYXlcblx0XHRcdFx0KGlzT2JqZWN0KGN1cnJlbnRFeGVjLnBheWxvYWQpICYmICFPYmplY3Qua2V5cyhjdXJyZW50RXhlYy5wYXlsb2FkKS5sZW5ndGgpIC8vIEFuIGVtcHR5IG9iamVjdFxuXHRcdFx0KVxuXHRcdCkge1xuXHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdHJlZG8gPSB0cnVlO1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXHRcdC8vIH19fVxuXG5cdFx0c3dpdGNoIChjdXJyZW50RXhlYy50eXBlKSB7XG5cdFx0XHRjYXNlICdwYXJhbGxlbEFycmF5Jzpcblx0XHRcdFx0c2VsZi5fcnVuKGN1cnJlbnRFeGVjLnBheWxvYWQubWFwKGZ1bmN0aW9uKHRhc2spIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24obmV4dCkge1xuXHRcdFx0XHRcdFx0dGFzay5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgbmV4dCk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSksIHNlbGYuX29wdGlvbnMubGltaXQsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdwYXJhbGxlbE9iamVjdCc6XG5cdFx0XHRcdHZhciB0YXNrcyA9IFtdO1xuXHRcdFx0XHRPYmplY3Qua2V5cyhjdXJyZW50RXhlYy5wYXlsb2FkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHRhc2tzLnB1c2goZnVuY3Rpb24obmV4dCkge1xuXHRcdFx0XHRcdFx0Y3VycmVudEV4ZWMucGF5bG9hZFtrZXldLmNhbGwoc2VsZi5fb3B0aW9ucy5jb250ZXh0LCBmdW5jdGlvbihlcnIsIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdHNlbGYuX3NldChrZXksIHZhbHVlKTsgLy8gQWxsb2NhdGUgcmV0dXJuZWQgdmFsdWUgdG8gY29udGV4dFxuXHRcdFx0XHRcdFx0XHRuZXh0KGVycik7XG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5fcnVuKHRhc2tzLCBzZWxmLl9vcHRpb25zLmxpbWl0LCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNlbGYuX2V4ZWN1dGUoZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAncGFyYWxsZWxDb2xsZWN0aW9uJzpcblx0XHRcdFx0dmFyIHRhc2tzID0gW107XG5cdFx0XHRcdGN1cnJlbnRFeGVjLnBheWxvYWQuZm9yRWFjaChmdW5jdGlvbih0YXNrKSB7XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGFzaykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRcdHRhc2tzLnB1c2goZnVuY3Rpb24obmV4dCwgZXJyKSB7XG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdGFza1trZXldICE9ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignQ29sbGVjdGlvbiBpdGVtIGZvciBwYXJhbGxlbCBleGVjIGlzIG5vdCBhIGZ1bmN0aW9uJywgY3VycmVudEV4ZWMucGF5bG9hZCk7XG5cdFx0XHRcdFx0XHRcdHRhc2tba2V5XS5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuX3NldChrZXksIHZhbHVlKTsgLy8gQWxsb2NhdGUgcmV0dXJuZWQgdmFsdWUgdG8gY29udGV4dFxuXHRcdFx0XHRcdFx0XHRcdG5leHQoZXJyKTtcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5fcnVuKHRhc2tzLCBzZWxmLl9vcHRpb25zLmxpbWl0LCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNlbGYuX2V4ZWN1dGUoZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZm9yRWFjaEFycmF5Jzpcblx0XHRcdFx0c2VsZi5fcnVuKGN1cnJlbnRFeGVjLnBheWxvYWQubWFwKGZ1bmN0aW9uKGl0ZW0sIGl0ZXIpIHtcblx0XHRcdFx0XHRzZWxmLl9jb250ZXh0Ll9pdGVtID0gaXRlbTtcblx0XHRcdFx0XHRzZWxmLl9jb250ZXh0Ll9rZXkgPSBpdGVyO1xuXHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbihuZXh0KSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy5jYWxsYmFjay5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgbmV4dCwgaXRlbSwgaXRlcik7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSksIHNlbGYuX29wdGlvbnMubGltaXQsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdmb3JFYWNoT2JqZWN0Jzpcblx0XHRcdFx0dmFyIHRhc2tzID0gW107XG5cdFx0XHRcdE9iamVjdC5rZXlzKGN1cnJlbnRFeGVjLnBheWxvYWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0dGFza3MucHVzaChmdW5jdGlvbihuZXh0KSB7XG5cdFx0XHRcdFx0XHRzZWxmLl9jb250ZXh0Ll9pdGVtID0gY3VycmVudEV4ZWMucGF5bG9hZFtrZXldO1xuXHRcdFx0XHRcdFx0c2VsZi5fY29udGV4dC5fa2V5ID0ga2V5O1xuXHRcdFx0XHRcdFx0Y3VycmVudEV4ZWMuY2FsbGJhY2suY2FsbChzZWxmLl9vcHRpb25zLmNvbnRleHQsIGZ1bmN0aW9uKGVyciwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0c2VsZi5fc2V0KGtleSwgdmFsdWUpOyAvLyBBbGxvY2F0ZSByZXR1cm5lZCB2YWx1ZSB0byBjb250ZXh0XG5cdFx0XHRcdFx0XHRcdG5leHQoZXJyKTtcblx0XHRcdFx0XHRcdH0sIGN1cnJlbnRFeGVjLnBheWxvYWRba2V5XSwga2V5KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYuX3J1bih0YXNrcywgc2VsZi5fb3B0aW9ucy5saW1pdCwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZWxmLl9leGVjdXRlKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2ZvckVhY2hMYXRlQm91bmQnOlxuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0KCFjdXJyZW50RXhlYy5wYXlsb2FkIHx8ICFjdXJyZW50RXhlYy5wYXlsb2FkLmxlbmd0aCkgfHwgLy8gUGF5bG9hZCBpcyBibGFua1xuXHRcdFx0XHRcdCghc2VsZi5fY29udGV4dFtjdXJyZW50RXhlYy5wYXlsb2FkXSkgLy8gUGF5bG9hZCBkb2VzbnQgZXhpc3Qgd2l0aGluIGNvbnRleHRcblx0XHRcdFx0KSB7IC8vIEdvdG8gbmV4dCBjaGFpblxuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0cmVkbyA9IHRydWU7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZXBsYWNlIG93biBleGVjIGFycmF5IHdpdGggYWN0dWFsIHR5cGUgb2YgcGF5bG9hZCBub3cgd2Uga25vdyB3aGF0IGl0IGlzIHt7e1xuXHRcdFx0XHR2YXIgb3ZlcmxvYWRUeXBlID0gZ2V0T3ZlcmxvYWQoW3NlbGYuX2NvbnRleHRbY3VycmVudEV4ZWMucGF5bG9hZF1dKTtcblx0XHRcdFx0c3dpdGNoIChvdmVybG9hZFR5cGUpIHtcblx0XHRcdFx0XHRjYXNlICdjb2xsZWN0aW9uJzpcblx0XHRcdFx0XHRjYXNlICdhcnJheSc6XG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy50eXBlID0gJ2ZvckVhY2hBcnJheSc7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdvYmplY3QnOlxuXHRcdFx0XHRcdFx0Y3VycmVudEV4ZWMudHlwZSA9ICdmb3JFYWNoT2JqZWN0Jztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBwZXJmb3JtIGZvckVhY2ggb3ZlciB1bmtub3duIG9iamVjdCB0eXBlOiAnICsgb3ZlcmxvYWRUeXBlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjdXJyZW50RXhlYy5wYXlsb2FkID0gc2VsZi5fY29udGV4dFtjdXJyZW50RXhlYy5wYXlsb2FkXTtcblx0XHRcdFx0c2VsZi5fc3RydWN0UG9pbnRlci0tOyAvLyBGb3JjZSByZS1ldmFsIG9mIHRoaXMgY2hhaW4gaXRlbSBub3cgaXRzIGJlZW4gcmVwbGFjZSB3aXRoIGl0cyByZWFsIChsYXRlLWJvdW5kKSB0eXBlXG5cdFx0XHRcdHJlZG8gPSB0cnVlO1xuXHRcdFx0XHQvLyB9fX1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzZXJpZXNBcnJheSc6XG5cdFx0XHRcdHNlbGYuX3J1bihjdXJyZW50RXhlYy5wYXlsb2FkLm1hcChmdW5jdGlvbih0YXNrKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKG5leHQpIHtcblx0XHRcdFx0XHRcdHRhc2suY2FsbChzZWxmLl9vcHRpb25zLmNvbnRleHQsIG5leHQpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pLCAxLCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNlbGYuX2V4ZWN1dGUoZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2VyaWVzT2JqZWN0Jzpcblx0XHRcdFx0dmFyIHRhc2tzID0gW107XG5cdFx0XHRcdE9iamVjdC5rZXlzKGN1cnJlbnRFeGVjLnBheWxvYWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0dGFza3MucHVzaChmdW5jdGlvbihuZXh0KSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy5wYXlsb2FkW2tleV0uY2FsbChzZWxmLl9vcHRpb25zLmNvbnRleHQsIGZ1bmN0aW9uKGVyciwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0c2VsZi5fc2V0KGtleSwgdmFsdWUpOyAvLyBBbGxvY2F0ZSByZXR1cm5lZCB2YWx1ZSB0byBjb250ZXh0XG5cdFx0XHRcdFx0XHRcdG5leHQoZXJyKTtcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLl9ydW4odGFza3MsIDEsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzZXJpZXNDb2xsZWN0aW9uJzpcblx0XHRcdFx0dmFyIHRhc2tzID0gW107XG5cdFx0XHRcdGN1cnJlbnRFeGVjLnBheWxvYWQuZm9yRWFjaChmdW5jdGlvbih0YXNrKSB7XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGFzaykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRcdHRhc2tzLnB1c2goZnVuY3Rpb24obmV4dCwgZXJyKSB7XG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdGFza1trZXldICE9ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignQ29sbGVjdGlvbiBpdGVtIGZvciBzZXJpZXMgZXhlYyBpcyBub3QgYSBmdW5jdGlvbicsIGN1cnJlbnRFeGVjLnBheWxvYWQpO1xuXHRcdFx0XHRcdFx0XHR0YXNrW2tleV0uY2FsbChzZWxmLl9vcHRpb25zLmNvbnRleHQsIGZ1bmN0aW9uKGVyciwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0XHRzZWxmLl9zZXQoa2V5LCB2YWx1ZSk7IC8vIEFsbG9jYXRlIHJldHVybmVkIHZhbHVlIHRvIGNvbnRleHRcblx0XHRcdFx0XHRcdFx0XHRuZXh0KGVycik7XG5cdFx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYuX3J1bih0YXNrcywgMSwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZWxmLl9leGVjdXRlKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2RlZmVyQXJyYXknOlxuXHRcdFx0XHRjdXJyZW50RXhlYy5wYXlsb2FkLmZvckVhY2goZnVuY3Rpb24odGFzaykge1xuXHRcdFx0XHRcdHNlbGYuX2RlZmVyQWRkKG51bGwsIHRhc2ssIGN1cnJlbnRFeGVjKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmVkbyA9IHRydWU7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZGVmZXJPYmplY3QnOlxuXHRcdFx0XHRPYmplY3Qua2V5cyhjdXJyZW50RXhlYy5wYXlsb2FkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHNlbGYuX2RlZmVyQWRkKGtleSwgY3VycmVudEV4ZWMucGF5bG9hZFtrZXldLCBjdXJyZW50RXhlYyk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJlZG8gPSB0cnVlO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2RlZmVyQ29sbGVjdGlvbic6XG5cdFx0XHRcdGN1cnJlbnRFeGVjLnBheWxvYWQuZm9yRWFjaChmdW5jdGlvbih0YXNrKSB7XG5cdFx0XHRcdFx0T2JqZWN0LmtleXModGFzaykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRcdHNlbGYuX2RlZmVyQWRkKGtleSwgdGFza1trZXldLCBjdXJyZW50RXhlYyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZWRvID0gdHJ1ZTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdhd2FpdCc6IC8vIEF3YWl0IGNhbiBvcGVyYXRlIGluIHR3byBtb2RlcywgZWl0aGVyIHBheWxvYWQ9W10gKGV4YW1pbmUgYWxsKSBlbHNlIChleGFtaW5lIHNwZWNpZmljIGtleXMpXG5cdFx0XHRcdGlmICghY3VycmVudEV4ZWMucGF5bG9hZC5sZW5ndGgpIHsgLy8gQ2hlY2sgYWxsIHRhc2tzIGFyZSBjb21wbGV0ZVxuXHRcdFx0XHRcdGlmIChzZWxmLl9zdHJ1Y3Quc2xpY2UoMCwgc2VsZi5fc3RydWN0UG9pbnRlciAtIDEpLmV2ZXJ5KGZ1bmN0aW9uKHN0YWdlKSB7IC8vIEV4YW1pbmUgYWxsIGl0ZW1zIFVQIFRPIHNlbGYgb25lIGFuZCBjaGVjayB0aGV5IGFyZSBjb21wbGV0ZVxuXHRcdFx0XHRcdFx0cmV0dXJuIHN0YWdlLmNvbXBsZXRlZDtcblx0XHRcdFx0XHR9KSkgeyAvLyBBbGwgdGFza3MgdXAgdG8gc2VsZiBwb2ludCBhcmUgbWFya2VkIGFzIGNvbXBsZXRlZFxuXHRcdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHJlZG8gPSB0cnVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzZWxmLl9zdHJ1Y3RQb2ludGVyLS07IC8vIEF0IGxlYXN0IG9uZSB0YXNrIGlzIG91dHN0YW5kaW5nIC0gcmV3aW5kIHRvIHNlbGYgc3RhZ2Ugc28gd2UgcmVwZWF0IG9uIG5leHQgcmVzb2x1dGlvblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHsgLy8gQ2hlY2sgY2VydGFpbiB0YXNrcyBhcmUgY29tcGxldGUgYnkga2V5XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRFeGVjLnBheWxvYWQuZXZlcnkoZnVuY3Rpb24oZGVwKSB7IC8vIEV4YW1pbmUgYWxsIG5hbWVkIGRlcGVuZGVuY2llc1xuXHRcdFx0XHRcdFx0cmV0dXJuICEhIHNlbGYuX2NvbnRleHRbZGVwXTtcblx0XHRcdFx0XHR9KSkgeyAvLyBBbGwgYXJlIHByZXNlbnRcblx0XHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRyZWRvID0gdHJ1ZTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2VsZi5fc3RydWN0UG9pbnRlci0tOyAvLyBBdCBsZWFzdCBvbmUgZGVwZW5kZW5jeSBpcyBvdXRzdGFuZGluZyAtIHJld2luZCB0byBzZWxmIHN0YWdlIHNvIHdlIHJlcGVhdCBvbiBuZXh0IHJlc29sdXRpb25cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdsaW1pdCc6IC8vIFNldCB0aGUgb3B0aW9ucy5saW1pdCB2YXJpYWJsZVxuXHRcdFx0XHRzZWxmLl9vcHRpb25zLmxpbWl0ID0gY3VycmVudEV4ZWMucGF5bG9hZDtcblx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0cmVkbyA9IHRydWU7IC8vIE1vdmUgb24gdG8gbmV4dCBhY3Rpb25cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdjb250ZXh0JzogLy8gQ2hhbmdlIHRoZSBzZWxmLl9vcHRpb25zLmNvbnRleHQgb2JqZWN0XG5cdFx0XHRcdHNlbGYuX29wdGlvbnMuY29udGV4dCA9IGN1cnJlbnRFeGVjLnBheWxvYWQgPyBjdXJyZW50RXhlYy5wYXlsb2FkIDogc2VsZi5fY29udGV4dDsgLy8gU2V0IGNvbnRleHQgKGlmIG51bGwgdXNlIGludGVybmFsIGNvbnRleHQpXG5cdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdHJlZG8gPSB0cnVlOyAvLyBNb3ZlIG9uIHRvIG5leHQgYWN0aW9uXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2V0JzogLy8gU2V0IGEgaGFzaCBvZiB2YXJpYWJsZXMgd2l0aGluIGNvbnRleHRcblx0XHRcdFx0T2JqZWN0LmtleXMoY3VycmVudEV4ZWMucGF5bG9hZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRzZWxmLl9zZXQoa2V5LCBjdXJyZW50RXhlYy5wYXlsb2FkW2tleV0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0cmVkbyA9IHRydWU7IC8vIE1vdmUgb24gdG8gbmV4dCBhY3Rpb25cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdlbmQnOiAvLyBzZWxmIHNob3VsZCBBTFdBWVMgYmUgdGhlIGxhc3QgaXRlbSBpbiB0aGUgc3RydWN0dXJlIGFuZCBpbmRpY2F0ZXMgdGhlIGZpbmFsIGZ1bmN0aW9uIGNhbGxcblx0XHRcdFx0dGhpcy5fZmluYWxpemUoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRpZiAodGhpcy5fcGx1Z2luc1tjdXJyZW50RXhlYy50eXBlXSkgeyAvLyBJcyB0aGVyZSBhIHBsdWdpbiB0aGF0IHNob3VsZCBtYW5hZ2UgdGhpcz9cblx0XHRcdFx0XHR0aGlzLl9wbHVnaW5zW2N1cnJlbnRFeGVjLnR5cGVdLmNhbGwodGhpcywgY3VycmVudEV4ZWMpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBhc3luYy1jaGFpbmFibGUgZXhlYyB0eXBlOiAnICsgY3VycmVudEV4ZWMudHlwZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSB3aGlsZSAocmVkbyk7XG59O1xuXG5cbi8qKlxuKiBJbnRlcm5hbCBmdW5jdGlvbiB0byBydW4gYW4gYXJyYXkgb2YgZnVuY3Rpb25zICh1c3VhbGx5IGluIHBhcmFsbGVsKVxuKiBTZXJpZXMgZXhlY3V0aW9uIGNhbiBiZSBvYnRhaW5lZCBieSBzZXR0aW5nIGxpbWl0ID0gMVxuKiBAcGFyYW0gYXJyYXkgdGFza3MgVGhlIGFycmF5IG9mIHRhc2tzIHRvIGV4ZWN1dGVcbiogQHBhcmFtIGludCBsaW1pdCBUaGUgbGltaXRlciBvZiB0YXNrcyAoaWYgbGltaXQ9PTEgdGFza3MgYXJlIHJ1biBpbiBzZXJpZXMsIGlmIGxpbWl0PjEgdGFza3MgYXJlIHJ1biBpbiBsaW1pdGVkIHBhcmFsbGVsLCBlbHNlIHRhc2tzIGFyZSBydW4gaW4gcGFyYWxsZWwpXG4qIEBwYXJhbSBmdW5jdGlvbiBjYWxsYmFjayhlcnIpIFRoZSBjYWxsYmFjayB0byBmaXJlIG9uIGZpbmlzaFxuKi9cbmZ1bmN0aW9uIF9ydW4odGFza3MsIGxpbWl0LCBjYWxsYmFjaykge1xuXHRpZiAobGltaXQgPT0gMSkge1xuXHRcdGFzeW5jLnNlcmllcyh0YXNrcywgY2FsbGJhY2spO1xuXHR9IGVsc2UgaWYgKGxpbWl0ID4gMCkge1xuXHRcdGFzeW5jLnBhcmFsbGVsTGltaXQodGFza3MsIGxpbWl0LCBjYWxsYmFjayk7XG5cdH0gZWxzZSB7XG5cdFx0YXN5bmMucGFyYWxsZWwodGFza3MsIGNhbGxiYWNrKTtcblx0fVxufVxuXG5cbi8qKlxuKiBSZXNldCBhbGwgc3RhdGUgdmFyaWFibGVzIGFuZCByZXR1cm4gdGhlIG9iamVjdCBpbnRvIGEgcHJpc3RpbmUgY29uZGl0aW9uXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIHJlc2V0KCkge1xuXHR0aGlzLl9zdHJ1Y3QgPSBbXTtcblx0dGhpcy5fc3RydWN0UG9pbnRlciA9IDA7XG5cblx0dmFyIHJlQXR0YWNoQ29udGV4dCA9ICh0aGlzLl9vcHRpb25zLmNvbnRleHQgPT0gdGhpcy5fY29udGV4dCk7IC8vIFJlYXR0YWNoIHRoZSBjb250ZXh0IHBvaW50ZXIgYWZ0ZXIgcmVzZXQ/XG5cdHRoaXMuX2NvbnRleHQgPSB7XG5cdFx0X3N0cnVjdDogdGhpcy5fc3RydWN0LFxuXHRcdF9zdHJ1Y3RQb2ludGVyOiB0aGlzLl9zdHJ1Y3RQb2ludGVyLFxuXHRcdF9vcHRpb25zOiB0aGlzLl9vcHRpb25zLFxuXHRcdF9kZWZlcnJlZFJ1bm5pbmc6IHRoaXMuX2RlZmVycmVkUnVubmluZyxcblx0fTtcblxuXHRpZiAocmVBdHRhY2hDb250ZXh0KSB0aGlzLl9vcHRpb25zLmNvbnRleHQgPSB0aGlzLl9jb250ZXh0O1xufTtcblxuLyoqXG4qIFF1ZXVlIHVwIGFuIG9wdGlvbmFsIHNpbmdsZSBmdW5jdGlvbiBmb3IgZXhlY3V0aW9uIG9uIGNvbXBsZXRpb25cbiogVGhpcyBmdW5jdGlvbiBhbHNvIHN0YXJ0cyB0aGUgcXVldWUgZXhlY3V0aW5nXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIGVuZCgpIHsgXG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cyk7XG5cdHN3aXRjaCAoY2FsbGVkQXMpIHtcblx0XHRjYXNlICcnOiAvLyBObyBmdW5jdGlvbnMgcGFzc2VkIC0gZG8gbm90aGluZ1xuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZW5kJywgcGF5bG9hZDogZnVuY3Rpb24oKSB7fSB9KTsgLy8gLmVuZCgpIGNhbGxlZCB3aXRoIG5vIGFyZ3MgLSBtYWtlIGEgbm9vcCgpXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdmdW5jdGlvbic6IC8vIEZvcm06IGVuZChmdW5jKSAtPiByZWRpcmVjdCBhcyBpZiBjYWxsZWQgd2l0aCBzZXJpZXMoZnVuYylcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2VuZCcsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLmVuZCgpOiAnICsgY2FsbGVkQXMpO1xuXHR9XG5cblx0dGhpcy5fZXhlY3V0ZSgpO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cbnZhciBvYmplY3RJbnN0YW5jZSA9IGZ1bmN0aW9uKCkge1xuXHQvLyBWYXJpYWJsZXMge3t7XG5cdHRoaXMuX3N0cnVjdCA9IFtdO1xuXHR0aGlzLl9zdHJ1Y3RQb2ludGVyID0gMDtcblx0dGhpcy5fY29udGV4dCA9IHt9O1xuXG5cdHRoaXMuX29wdGlvbnMgPSB7XG5cdFx0YXV0b1Jlc2V0OiB0cnVlLCAvLyBSdW4gYXN5bmNDaGFpbmFibGUucmVzZXQoKSBhZnRlciBmaW5hbGl6ZS4gRGlzYWJsZSB0aGlzIGlmIHlvdSB3YW50IHRvIHNlZSBhIHBvc3QtbW9ydGVtIG9uIHdoYXQgZGlkIHJ1blxuXHRcdGxpbWl0OiAxMCwgLy8gTnVtYmVyIG9mIGRlZmVyIGZ1bmN0aW9ucyB0aGF0IGFyZSBhbGxvd2VkIHRvIGV4ZWN1dGUgYXQgb25jZVxuXHRcdGNvbnRleHQ6IHRoaXMuX2NvbnRleHQsIC8vIFRoZSBjb250ZXh0IGl0ZW0gcGFzc2VkIHRvIHRoZSBmdW5jdGlvbnMgKGNhbiBiZSBjaGFuZ2VkIHdpdGggLmNvbnRleHQoKSlcblx0fTtcblx0Ly8gfX19XG5cblx0Ly8gQXN5bmMtQ2hhaW5hYmxlIGZ1bmN0aW9ucyB7e3tcblx0Ly8gUHJpdmF0ZSB7e3tcblx0dGhpcy5fZXhlY3V0ZSA9IF9leGVjdXRlO1xuXHR0aGlzLl9ydW4gPSBfcnVuO1xuXHR0aGlzLl9kZWZlckNoZWNrID0gX2RlZmVyQ2hlY2s7XG5cdHRoaXMuX2RlZmVyQWRkID0gZGVmZXJBZGQ7XG5cdHRoaXMuX2RlZmVycmVkID0gW107XG5cdHRoaXMuX2RlZmVycmVkUnVubmluZyA9IDA7XG5cdHRoaXMuX2ZpbmFsaXplID0gX2ZpbmFsaXplO1xuXHR0aGlzLl9nZXRPdmVybG9hZCA9IGdldE92ZXJsb2FkOyAvLyBTbyB0aGlzIGZ1bmN0aW9uIGlzIGFjY2Vzc2libGUgYnkgcGx1Z2luc1xuXHR0aGlzLl9wbHVnaW5zID0gX3BsdWdpbnM7XG5cdC8vIH19fVxuXG5cdHRoaXMuYXdhaXQgPSBhd2FpdDtcblx0dGhpcy5jb250ZXh0ID0gc2V0Q29udGV4dDtcblx0dGhpcy5kZWZlciA9IGRlZmVyO1xuXHR0aGlzLmVuZCA9IGVuZDtcblx0dGhpcy5mb3JFYWNoID0gZm9yRWFjaDtcblx0dGhpcy5saW1pdCA9IHNldExpbWl0O1xuXHR0aGlzLnBhcmFsbGVsID0gcGFyYWxsZWw7XG5cdHRoaXMucmVzZXQgPSByZXNldDtcblx0dGhpcy5zZXJpZXMgPSBzZXJpZXM7XG5cdHRoaXMuc2V0ID0gc2V0O1xuXHR0aGlzLl9zZXQgPSBfc2V0O1xuXHR0aGlzLl9zZXRSYXcgPSBfc2V0UmF3O1xuXHR0aGlzLnRoZW4gPSBzZXJpZXM7XG5cdHRoaXMubmV3ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgb2JqZWN0SW5zdGFuY2UgfTtcblx0dGhpcy51c2UgPSB1c2U7XG5cdC8vIH19fVxuXG5cdC8vIEFzeW5jIGNvbXBhdCBmdW5jdGlvbmFsaXR5IC0gc28gdGhpcyBtb2R1bGUgYmVjb21lcyBhIGRyb3AtaW4gcmVwbGFjZW1lbnQge3t7XG5cdC8vIENvbGxlY3Rpb25zXG5cdHRoaXMuZWFjaCA9IGFzeW5jLmVhY2g7XG5cdHRoaXMuZWFjaFNlcmllcyA9IGFzeW5jLmVhY2hTZXJpZXM7XG5cdHRoaXMuZWFjaExpbWl0ID0gYXN5bmMuZWFjaExpbWl0O1xuXHR0aGlzLm1hcCA9IGFzeW5jLm1hcDtcblx0dGhpcy5tYXBTZXJpZXMgPSBhc3luYy5tYXBTZXJpZXM7XG5cdHRoaXMubWFwTGltaXQgPSBhc3luYy5tYXBMaW1pdDtcblx0dGhpcy5maWx0ZXIgPSBhc3luYy5maWx0ZXI7XG5cdHRoaXMuZmlsdGVyU2VyaWVzID0gYXN5bmMuZmlsdGVyU2VyaWVzO1xuXHR0aGlzLnJlamVjdCA9IGFzeW5jLnJlamVjdDtcblx0dGhpcy5yZWplY3RTZXJpZXMgPSBhc3luYy5yZWplY3RTZXJpZXM7XG5cdHRoaXMucmVkdWNlID0gYXN5bmMucmVkdWNlO1xuXHR0aGlzLnJlZHVjZVJpZ2h0ID0gYXN5bmMucmVkdWNlUmlnaHQ7XG5cdHRoaXMuZGV0ZWN0ID0gYXN5bmMuZGV0ZWN0O1xuXHR0aGlzLmRldGVjdFNlcmllcyA9IGFzeW5jLmRldGVjdFNlcmllcztcblx0dGhpcy5zb3J0QnkgPSBhc3luYy5zb3J0Qnk7XG5cdHRoaXMuc29tZSA9IGFzeW5jLnNvbWU7XG5cdHRoaXMuZXZlcnkgPSBhc3luYy5ldmVyeTtcblx0dGhpcy5jb25jYXQgPSBhc3luYy5jb25jYXQ7XG5cdHRoaXMuY29uY2F0U2VyaWVzID0gYXN5bmMuY29uY2F0U2VyaWVzO1xuXG5cdC8vIENvbnRyb2wgRmxvd1xuXHQvLyBTZWUgbWFpbiAuc2VyaWVzKCkgYW5kIC5wYXJhbGxlbCgpIGNvZGUgZm9yIGFzeW5jIGNvbXBhdGliaWxpdHlcblx0dGhpcy5wYXJhbGxlbExpbWl0ID0gYXN5bmMucGFyYWxsZWxMaW1pdDtcblx0dGhpcy53aGlsc3QgPSBhc3luYy53aGlsc3Q7XG5cdHRoaXMuZG9XaGlsc3QgPSBhc3luYy5kb1doaWxzdDtcblx0dGhpcy51bnRpbCA9IGFzeW5jLnVudGlsO1xuXHR0aGlzLmRvVW50aWwgPSBhc3luYy5kb1VudGlsO1xuXHR0aGlzLmZvcmV2ZXIgPSBhc3luYy5mb3JldmVyO1xuXHR0aGlzLndhdGVyZmFsbCA9IGFzeW5jLndhdGVyZmFsbDtcblx0dGhpcy5jb21wb3NlID0gYXN5bmMuY29tcG9zZTtcblx0dGhpcy5zZXEgPSBhc3luYy5zZXE7XG5cdHRoaXMuYXBwbHlFYWNoID0gYXN5bmMuYXBwbHlFYWNoO1xuXHR0aGlzLmFwcGx5RWFjaFNlcmllcyA9IGFzeW5jLmFwcGx5RWFjaFNlcmllcztcblx0dGhpcy5xdWV1ZSA9IGFzeW5jLnF1ZXVlO1xuXHR0aGlzLnByaW9yaXR5UXVldWUgPSBhc3luYy5wcmlvcml0eVF1ZXVlO1xuXHR0aGlzLmNhcmdvID0gYXN5bmMuY2FyZ287XG5cdHRoaXMuYXV0byA9IGFzeW5jLmF1dG87XG5cdHRoaXMucmV0cnkgPSBhc3luYy5yZXRyeTtcblx0dGhpcy5pdGVyYXRvciA9IGFzeW5jLml0ZXJhdG9yO1xuXHR0aGlzLmFwcGx5ID0gYXN5bmMuYXBwbHk7XG5cdHRoaXMubmV4dFRpY2sgPSBhc3luYy5uZXh0VGljaztcblx0dGhpcy50aW1lcyA9IGFzeW5jLnRpbWVzO1xuXHR0aGlzLnRpbWVzU2VyaWVzID0gYXN5bmMudGltZXNTZXJpZXM7XG5cdHRoaXMuVXRpbHMgPSBhc3luYy5VdGlscztcblxuXHQvLyBVdGlsc1xuXHR0aGlzLm1lbW9pemUgPSBhc3luYy5tZW1vaXplO1xuXHR0aGlzLnVubWVtb2l6ZSA9IGFzeW5jLnVubWVtb2l6ZTtcblx0dGhpcy5sb2cgPSBhc3luYy5sb2c7XG5cdHRoaXMuZGlyID0gYXN5bmMuZGlyO1xuXHR0aGlzLm5vQ29uZmxpY3QgPSBhc3luYy5ub0NvbmZsaWN0O1xuXHQvLyB9fX1cblxuXHR0aGlzLnJlc2V0KCk7XG5cdHJldHVybiB0aGlzO1xufVxuXG4vLyBSZXR1cm4gdGhlIG91dHB1dCBvYmplY3Rcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXN5bmNDaGFpbmFibGUoKSB7XG5cdHJldHVybiBuZXcgb2JqZWN0SW5zdGFuY2U7XG59O1xuIiwiLyohXG4gKiBhc3luY1xuICogaHR0cHM6Ly9naXRodWIuY29tL2Nhb2xhbi9hc3luY1xuICpcbiAqIENvcHlyaWdodCAyMDEwLTIwMTQgQ2FvbGFuIE1jTWFob25cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG4gICAgZnVuY3Rpb24gbm9vcCgpIHt9XG4gICAgZnVuY3Rpb24gaWRlbnRpdHkodikge1xuICAgICAgICByZXR1cm4gdjtcbiAgICB9XG4gICAgZnVuY3Rpb24gdG9Cb29sKHYpIHtcbiAgICAgICAgcmV0dXJuICEhdjtcbiAgICB9XG4gICAgZnVuY3Rpb24gbm90SWQodikge1xuICAgICAgICByZXR1cm4gIXY7XG4gICAgfVxuXG4gICAgLy8gZ2xvYmFsIG9uIHRoZSBzZXJ2ZXIsIHdpbmRvdyBpbiB0aGUgYnJvd3NlclxuICAgIHZhciBwcmV2aW91c19hc3luYztcblxuICAgIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIChgc2VsZmApIGluIHRoZSBicm93c2VyLCBgZ2xvYmFsYFxuICAgIC8vIG9uIHRoZSBzZXJ2ZXIsIG9yIGB0aGlzYCBpbiBzb21lIHZpcnR1YWwgbWFjaGluZXMuIFdlIHVzZSBgc2VsZmBcbiAgICAvLyBpbnN0ZWFkIG9mIGB3aW5kb3dgIGZvciBgV2ViV29ya2VyYCBzdXBwb3J0LlxuICAgIHZhciByb290ID0gdHlwZW9mIHNlbGYgPT09ICdvYmplY3QnICYmIHNlbGYuc2VsZiA9PT0gc2VsZiAmJiBzZWxmIHx8XG4gICAgICAgICAgICB0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwuZ2xvYmFsID09PSBnbG9iYWwgJiYgZ2xvYmFsIHx8XG4gICAgICAgICAgICB0aGlzO1xuXG4gICAgaWYgKHJvb3QgIT0gbnVsbCkge1xuICAgICAgICBwcmV2aW91c19hc3luYyA9IHJvb3QuYXN5bmM7XG4gICAgfVxuXG4gICAgYXN5bmMubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IHByZXZpb3VzX2FzeW5jO1xuICAgICAgICByZXR1cm4gYXN5bmM7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG9ubHlfb25jZShmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoZm4gPT09IG51bGwpIHRocm93IG5ldyBFcnJvcihcIkNhbGxiYWNrIHdhcyBhbHJlYWR5IGNhbGxlZC5cIik7XG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgZm4gPSBudWxsO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9vbmNlKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmbiA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIGZuID0gbnVsbDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLy8vIGNyb3NzLWJyb3dzZXIgY29tcGF0aWJsaXR5IGZ1bmN0aW9ucyAvLy8vXG5cbiAgICB2YXIgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuICAgIHZhciBfaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gX3RvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9O1xuXG4gICAgLy8gUG9ydGVkIGZyb20gdW5kZXJzY29yZS5qcyBpc09iamVjdFxuICAgIHZhciBfaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2Ygb2JqO1xuICAgICAgICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2lzQXJyYXlMaWtlKGFycikge1xuICAgICAgICByZXR1cm4gX2lzQXJyYXkoYXJyKSB8fCAoXG4gICAgICAgICAgICAvLyBoYXMgYSBwb3NpdGl2ZSBpbnRlZ2VyIGxlbmd0aCBwcm9wZXJ0eVxuICAgICAgICAgICAgdHlwZW9mIGFyci5sZW5ndGggPT09IFwibnVtYmVyXCIgJiZcbiAgICAgICAgICAgIGFyci5sZW5ndGggPj0gMCAmJlxuICAgICAgICAgICAgYXJyLmxlbmd0aCAlIDEgPT09IDBcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfYXJyYXlFYWNoKGFyciwgaXRlcmF0b3IpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gLTEsXG4gICAgICAgICAgICBsZW5ndGggPSBhcnIubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbaW5kZXhdLCBpbmRleCwgYXJyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9tYXAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICAgIGxlbmd0aCA9IGFyci5sZW5ndGgsXG4gICAgICAgICAgICByZXN1bHQgPSBBcnJheShsZW5ndGgpO1xuXG4gICAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICByZXN1bHRbaW5kZXhdID0gaXRlcmF0b3IoYXJyW2luZGV4XSwgaW5kZXgsIGFycik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmFuZ2UoY291bnQpIHtcbiAgICAgICAgcmV0dXJuIF9tYXAoQXJyYXkoY291bnQpLCBmdW5jdGlvbiAodiwgaSkgeyByZXR1cm4gaTsgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3JlZHVjZShhcnIsIGl0ZXJhdG9yLCBtZW1vKSB7XG4gICAgICAgIF9hcnJheUVhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgbWVtbyA9IGl0ZXJhdG9yKG1lbW8sIHgsIGksIGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2ZvckVhY2hPZihvYmplY3QsIGl0ZXJhdG9yKSB7XG4gICAgICAgIF9hcnJheUVhY2goX2tleXMob2JqZWN0KSwgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgaXRlcmF0b3Iob2JqZWN0W2tleV0sIGtleSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9pbmRleE9mKGFyciwgaXRlbSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGFycltpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIHZhciBfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9rZXlJdGVyYXRvcihjb2xsKSB7XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHZhciBsZW47XG4gICAgICAgIHZhciBrZXlzO1xuICAgICAgICBpZiAoX2lzQXJyYXlMaWtlKGNvbGwpKSB7XG4gICAgICAgICAgICBsZW4gPSBjb2xsLmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0KCkge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICByZXR1cm4gaSA8IGxlbiA/IGkgOiBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleXMgPSBfa2V5cyhjb2xsKTtcbiAgICAgICAgICAgIGxlbiA9IGtleXMubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIHJldHVybiBpIDwgbGVuID8ga2V5c1tpXSA6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2ltaWxhciB0byBFUzYncyByZXN0IHBhcmFtIChodHRwOi8vYXJpeWEub2ZpbGFicy5jb20vMjAxMy8wMy9lczYtYW5kLXJlc3QtcGFyYW1ldGVyLmh0bWwpXG4gICAgLy8gVGhpcyBhY2N1bXVsYXRlcyB0aGUgYXJndW1lbnRzIHBhc3NlZCBpbnRvIGFuIGFycmF5LCBhZnRlciBhIGdpdmVuIGluZGV4LlxuICAgIC8vIEZyb20gdW5kZXJzY29yZS5qcyAoaHR0cHM6Ly9naXRodWIuY29tL2phc2hrZW5hcy91bmRlcnNjb3JlL3B1bGwvMjE0MCkuXG4gICAgZnVuY3Rpb24gX3Jlc3RQYXJhbShmdW5jLCBzdGFydEluZGV4KSB7XG4gICAgICAgIHN0YXJ0SW5kZXggPSBzdGFydEluZGV4ID09IG51bGwgPyBmdW5jLmxlbmd0aCAtIDEgOiArc3RhcnRJbmRleDtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KGFyZ3VtZW50cy5sZW5ndGggLSBzdGFydEluZGV4LCAwKTtcbiAgICAgICAgICAgIHZhciByZXN0ID0gQXJyYXkobGVuZ3RoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgICAgICByZXN0W2luZGV4XSA9IGFyZ3VtZW50c1tpbmRleCArIHN0YXJ0SW5kZXhdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3dpdGNoIChzdGFydEluZGV4KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIHJlc3QpO1xuICAgICAgICAgICAgICAgIGNhc2UgMTogcmV0dXJuIGZ1bmMuY2FsbCh0aGlzLCBhcmd1bWVudHNbMF0sIHJlc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ3VycmVudGx5IHVudXNlZCBidXQgaGFuZGxlIGNhc2VzIG91dHNpZGUgb2YgdGhlIHN3aXRjaCBzdGF0ZW1lbnQ6XG4gICAgICAgICAgICAvLyB2YXIgYXJncyA9IEFycmF5KHN0YXJ0SW5kZXggKyAxKTtcbiAgICAgICAgICAgIC8vIGZvciAoaW5kZXggPSAwOyBpbmRleCA8IHN0YXJ0SW5kZXg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIC8vICAgICBhcmdzW2luZGV4XSA9IGFyZ3VtZW50c1tpbmRleF07XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvLyBhcmdzW3N0YXJ0SW5kZXhdID0gcmVzdDtcbiAgICAgICAgICAgIC8vIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlcmF0b3IodmFsdWUsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLy8vIGV4cG9ydGVkIGFzeW5jIG1vZHVsZSBmdW5jdGlvbnMgLy8vL1xuXG4gICAgLy8vLyBuZXh0VGljayBpbXBsZW1lbnRhdGlvbiB3aXRoIGJyb3dzZXItY29tcGF0aWJsZSBmYWxsYmFjayAvLy8vXG5cbiAgICAvLyBjYXB0dXJlIHRoZSBnbG9iYWwgcmVmZXJlbmNlIHRvIGd1YXJkIGFnYWluc3QgZmFrZVRpbWVyIG1vY2tzXG4gICAgdmFyIF9zZXRJbW1lZGlhdGUgPSB0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSAnZnVuY3Rpb24nICYmIHNldEltbWVkaWF0ZTtcblxuICAgIHZhciBfZGVsYXkgPSBfc2V0SW1tZWRpYXRlID8gZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgLy8gbm90IGEgZGlyZWN0IGFsaWFzIGZvciBJRTEwIGNvbXBhdGliaWxpdHlcbiAgICAgICAgX3NldEltbWVkaWF0ZShmbik7XG4gICAgfSA6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIHR5cGVvZiBwcm9jZXNzLm5leHRUaWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGFzeW5jLm5leHRUaWNrID0gcHJvY2Vzcy5uZXh0VGljaztcbiAgICB9IGVsc2Uge1xuICAgICAgICBhc3luYy5uZXh0VGljayA9IF9kZWxheTtcbiAgICB9XG4gICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gX3NldEltbWVkaWF0ZSA/IF9kZWxheSA6IGFzeW5jLm5leHRUaWNrO1xuXG5cbiAgICBhc3luYy5mb3JFYWNoID1cbiAgICBhc3luYy5lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5lYWNoT2YoYXJyLCBfd2l0aG91dEluZGV4KGl0ZXJhdG9yKSwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5mb3JFYWNoU2VyaWVzID1cbiAgICBhc3luYy5lYWNoU2VyaWVzID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5lYWNoT2ZTZXJpZXMoYXJyLCBfd2l0aG91dEluZGV4KGl0ZXJhdG9yKSwgY2FsbGJhY2spO1xuICAgIH07XG5cblxuICAgIGFzeW5jLmZvckVhY2hMaW1pdCA9XG4gICAgYXN5bmMuZWFjaExpbWl0ID0gZnVuY3Rpb24gKGFyciwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gX2VhY2hPZkxpbWl0KGxpbWl0KShhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmZvckVhY2hPZiA9XG4gICAgYXN5bmMuZWFjaE9mID0gZnVuY3Rpb24gKG9iamVjdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIG9iamVjdCA9IG9iamVjdCB8fCBbXTtcblxuICAgICAgICB2YXIgaXRlciA9IF9rZXlJdGVyYXRvcihvYmplY3QpO1xuICAgICAgICB2YXIga2V5LCBjb21wbGV0ZWQgPSAwO1xuXG4gICAgICAgIHdoaWxlICgoa2V5ID0gaXRlcigpKSAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgIGl0ZXJhdG9yKG9iamVjdFtrZXldLCBrZXksIG9ubHlfb25jZShkb25lKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29tcGxldGVkID09PSAwKSBjYWxsYmFjayhudWxsKTtcblxuICAgICAgICBmdW5jdGlvbiBkb25lKGVycikge1xuICAgICAgICAgICAgY29tcGxldGVkLS07XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENoZWNrIGtleSBpcyBudWxsIGluIGNhc2UgaXRlcmF0b3IgaXNuJ3QgZXhoYXVzdGVkXG4gICAgICAgICAgICAvLyBhbmQgZG9uZSByZXNvbHZlZCBzeW5jaHJvbm91c2x5LlxuICAgICAgICAgICAgZWxzZSBpZiAoa2V5ID09PSBudWxsICYmIGNvbXBsZXRlZCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuZm9yRWFjaE9mU2VyaWVzID1cbiAgICBhc3luYy5lYWNoT2ZTZXJpZXMgPSBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgb2JqID0gb2JqIHx8IFtdO1xuICAgICAgICB2YXIgbmV4dEtleSA9IF9rZXlJdGVyYXRvcihvYmopO1xuICAgICAgICB2YXIga2V5ID0gbmV4dEtleSgpO1xuICAgICAgICBmdW5jdGlvbiBpdGVyYXRlKCkge1xuICAgICAgICAgICAgdmFyIHN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKGtleSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZXJhdG9yKG9ialtrZXldLCBrZXksIG9ubHlfb25jZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAga2V5ID0gbmV4dEtleSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3luYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShpdGVyYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgc3luYyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGl0ZXJhdGUoKTtcbiAgICB9O1xuXG5cblxuICAgIGFzeW5jLmZvckVhY2hPZkxpbWl0ID1cbiAgICBhc3luYy5lYWNoT2ZMaW1pdCA9IGZ1bmN0aW9uIChvYmosIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgX2VhY2hPZkxpbWl0KGxpbWl0KShvYmosIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9lYWNoT2ZMaW1pdChsaW1pdCkge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgICAgICBvYmogPSBvYmogfHwgW107XG4gICAgICAgICAgICB2YXIgbmV4dEtleSA9IF9rZXlJdGVyYXRvcihvYmopO1xuICAgICAgICAgICAgaWYgKGxpbWl0IDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHJ1bm5pbmcgPSAwO1xuICAgICAgICAgICAgdmFyIGVycm9yZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgKGZ1bmN0aW9uIHJlcGxlbmlzaCAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbmUgJiYgcnVubmluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAocnVubmluZyA8IGxpbWl0ICYmICFlcnJvcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBuZXh0S2V5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJ1bm5pbmcgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3Iob2JqW2tleV0sIGtleSwgb25seV9vbmNlKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGVuaXNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZG9QYXJhbGxlbChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oYXN5bmMuZWFjaE9mLCBvYmosIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRvUGFyYWxsZWxMaW1pdChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGZuKF9lYWNoT2ZMaW1pdChsaW1pdCksIG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9TZXJpZXMoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGZuKGFzeW5jLmVhY2hPZlNlcmllcywgb2JqLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9hc3luY01hcChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIGFyciA9IGFyciB8fCBbXTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBfaXNBcnJheUxpa2UoYXJyKSA/IFtdIDoge307XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh2YWx1ZSwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih2YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIHJlc3VsdHNbaW5kZXhdID0gdjtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLm1hcCA9IGRvUGFyYWxsZWwoX2FzeW5jTWFwKTtcbiAgICBhc3luYy5tYXBTZXJpZXMgPSBkb1NlcmllcyhfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcExpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9hc3luY01hcCk7XG5cbiAgICAvLyByZWR1Y2Ugb25seSBoYXMgYSBzZXJpZXMgdmVyc2lvbiwgYXMgZG9pbmcgcmVkdWNlIGluIHBhcmFsbGVsIHdvbid0XG4gICAgLy8gd29yayBpbiBtYW55IHNpdHVhdGlvbnMuXG4gICAgYXN5bmMuaW5qZWN0ID1cbiAgICBhc3luYy5mb2xkbCA9XG4gICAgYXN5bmMucmVkdWNlID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLmVhY2hPZlNlcmllcyhhcnIsIGZ1bmN0aW9uICh4LCBpLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IobWVtbywgeCwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIG1lbW8gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLmZvbGRyID1cbiAgICBhc3luYy5yZWR1Y2VSaWdodCA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmV2ZXJzZWQgPSBfbWFwKGFyciwgaWRlbnRpdHkpLnJldmVyc2UoKTtcbiAgICAgICAgYXN5bmMucmVkdWNlKHJldmVyc2VkLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy50cmFuc2Zvcm0gPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gaXRlcmF0b3I7XG4gICAgICAgICAgICBpdGVyYXRvciA9IG1lbW87XG4gICAgICAgICAgICBtZW1vID0gX2lzQXJyYXkoYXJyKSA/IFtdIDoge307XG4gICAgICAgIH1cblxuICAgICAgICBhc3luYy5lYWNoT2YoYXJyLCBmdW5jdGlvbih2LCBrLCBjYikge1xuICAgICAgICAgICAgaXRlcmF0b3IobWVtbywgdiwgaywgY2IpO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWVtbyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfZmlsdGVyKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGluZGV4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goe2luZGV4OiBpbmRleCwgdmFsdWU6IHh9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc3luYy5zZWxlY3QgPVxuICAgIGFzeW5jLmZpbHRlciA9IGRvUGFyYWxsZWwoX2ZpbHRlcik7XG5cbiAgICBhc3luYy5zZWxlY3RMaW1pdCA9XG4gICAgYXN5bmMuZmlsdGVyTGltaXQgPSBkb1BhcmFsbGVsTGltaXQoX2ZpbHRlcik7XG5cbiAgICBhc3luYy5zZWxlY3RTZXJpZXMgPVxuICAgIGFzeW5jLmZpbHRlclNlcmllcyA9IGRvU2VyaWVzKF9maWx0ZXIpO1xuXG4gICAgZnVuY3Rpb24gX3JlamVjdChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9maWx0ZXIoZWFjaGZuLCBhcnIsIGZ1bmN0aW9uKHZhbHVlLCBjYikge1xuICAgICAgICAgICAgaXRlcmF0b3IodmFsdWUsIGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgICAgICBjYighdik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgIH1cbiAgICBhc3luYy5yZWplY3QgPSBkb1BhcmFsbGVsKF9yZWplY3QpO1xuICAgIGFzeW5jLnJlamVjdExpbWl0ID0gZG9QYXJhbGxlbExpbWl0KF9yZWplY3QpO1xuICAgIGFzeW5jLnJlamVjdFNlcmllcyA9IGRvU2VyaWVzKF9yZWplY3QpO1xuXG4gICAgZnVuY3Rpb24gX2NyZWF0ZVRlc3RlcihlYWNoZm4sIGNoZWNrLCBnZXRSZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgbGltaXQsIGl0ZXJhdG9yLCBjYikge1xuICAgICAgICAgICAgZnVuY3Rpb24gZG9uZSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2IpIGNiKGdldFJlc3VsdChmYWxzZSwgdm9pZCAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmdW5jdGlvbiBpdGVyYXRlZSh4LCBfLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmICghY2IpIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIGl0ZXJhdG9yKHgsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYiAmJiBjaGVjayh2KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IoZ2V0UmVzdWx0KHRydWUsIHgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNiID0gaXRlcmF0b3IgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgICAgZWFjaGZuKGFyciwgbGltaXQsIGl0ZXJhdGVlLCBkb25lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2IgPSBpdGVyYXRvcjtcbiAgICAgICAgICAgICAgICBpdGVyYXRvciA9IGxpbWl0O1xuICAgICAgICAgICAgICAgIGVhY2hmbihhcnIsIGl0ZXJhdGVlLCBkb25lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhc3luYy5hbnkgPVxuICAgIGFzeW5jLnNvbWUgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZiwgdG9Cb29sLCBpZGVudGl0eSk7XG5cbiAgICBhc3luYy5zb21lTGltaXQgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZkxpbWl0LCB0b0Jvb2wsIGlkZW50aXR5KTtcblxuICAgIGFzeW5jLmFsbCA9XG4gICAgYXN5bmMuZXZlcnkgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZiwgbm90SWQsIG5vdElkKTtcblxuICAgIGFzeW5jLmV2ZXJ5TGltaXQgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZkxpbWl0LCBub3RJZCwgbm90SWQpO1xuXG4gICAgZnVuY3Rpb24gX2ZpbmRHZXRSZXN1bHQodiwgeCkge1xuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gICAgYXN5bmMuZGV0ZWN0ID0gX2NyZWF0ZVRlc3Rlcihhc3luYy5lYWNoT2YsIGlkZW50aXR5LCBfZmluZEdldFJlc3VsdCk7XG4gICAgYXN5bmMuZGV0ZWN0U2VyaWVzID0gX2NyZWF0ZVRlc3Rlcihhc3luYy5lYWNoT2ZTZXJpZXMsIGlkZW50aXR5LCBfZmluZEdldFJlc3VsdCk7XG4gICAgYXN5bmMuZGV0ZWN0TGltaXQgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZkxpbWl0LCBpZGVudGl0eSwgX2ZpbmRHZXRSZXN1bHQpO1xuXG4gICAgYXN5bmMuc29ydEJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLm1hcChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKGVyciwgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7dmFsdWU6IHgsIGNyaXRlcmlhOiBjcml0ZXJpYX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBfbWFwKHJlc3VsdHMuc29ydChjb21wYXJhdG9yKSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbXBhcmF0b3IobGVmdCwgcmlnaHQpIHtcbiAgICAgICAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYSwgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmF1dG8gPSBmdW5jdGlvbiAodGFza3MsIGNvbmN1cnJlbmN5LCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1sxXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gY29uY3VycmVuY3kgaXMgb3B0aW9uYWwsIHNoaWZ0IHRoZSBhcmdzLlxuICAgICAgICAgICAgY2FsbGJhY2sgPSBjb25jdXJyZW5jeTtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayA9IF9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICB2YXIga2V5cyA9IF9rZXlzKHRhc2tzKTtcbiAgICAgICAgdmFyIHJlbWFpbmluZ1Rhc2tzID0ga2V5cy5sZW5ndGg7XG4gICAgICAgIGlmICghcmVtYWluaW5nVGFza3MpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IHJlbWFpbmluZ1Rhc2tzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgdmFyIHJ1bm5pbmdUYXNrcyA9IDA7XG5cbiAgICAgICAgdmFyIGhhc0Vycm9yID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICAgICAgICBmdW5jdGlvbiBhZGRMaXN0ZW5lcihmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnVuc2hpZnQoZm4pO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGZuKSB7XG4gICAgICAgICAgICB2YXIgaWR4ID0gX2luZGV4T2YobGlzdGVuZXJzLCBmbik7XG4gICAgICAgICAgICBpZiAoaWR4ID49IDApIGxpc3RlbmVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB0YXNrQ29tcGxldGUoKSB7XG4gICAgICAgICAgICByZW1haW5pbmdUYXNrcy0tO1xuICAgICAgICAgICAgX2FycmF5RWFjaChsaXN0ZW5lcnMuc2xpY2UoMCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghcmVtYWluaW5nVGFza3MpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2FycmF5RWFjaChrZXlzLCBmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgaWYgKGhhc0Vycm9yKSByZXR1cm47XG4gICAgICAgICAgICB2YXIgdGFzayA9IF9pc0FycmF5KHRhc2tzW2tdKSA/IHRhc2tzW2tdOiBbdGFza3Nba11dO1xuICAgICAgICAgICAgdmFyIHRhc2tDYWxsYmFjayA9IF9yZXN0UGFyYW0oZnVuY3Rpb24oZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgcnVubmluZ1Rhc2tzLS07XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhZmVSZXN1bHRzID0ge307XG4gICAgICAgICAgICAgICAgICAgIF9mb3JFYWNoT2YocmVzdWx0cywgZnVuY3Rpb24odmFsLCBya2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1tya2V5XSA9IHZhbDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgaGFzRXJyb3IgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgc2FmZVJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSh0YXNrQ29tcGxldGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHJlcXVpcmVzID0gdGFzay5zbGljZSgwLCB0YXNrLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgLy8gcHJldmVudCBkZWFkLWxvY2tzXG4gICAgICAgICAgICB2YXIgbGVuID0gcmVxdWlyZXMubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGRlcDtcbiAgICAgICAgICAgIHdoaWxlIChsZW4tLSkge1xuICAgICAgICAgICAgICAgIGlmICghKGRlcCA9IHRhc2tzW3JlcXVpcmVzW2xlbl1dKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0hhcyBub25leGlzdGVudCBkZXBlbmRlbmN5IGluICcgKyByZXF1aXJlcy5qb2luKCcsICcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF9pc0FycmF5KGRlcCkgJiYgX2luZGV4T2YoZGVwLCBrKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSGFzIGN5Y2xpYyBkZXBlbmRlbmNpZXMnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmdW5jdGlvbiByZWFkeSgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVubmluZ1Rhc2tzIDwgY29uY3VycmVuY3kgJiYgX3JlZHVjZShyZXF1aXJlcywgZnVuY3Rpb24gKGEsIHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChhICYmIHJlc3VsdHMuaGFzT3duUHJvcGVydHkoeCkpO1xuICAgICAgICAgICAgICAgIH0sIHRydWUpICYmICFyZXN1bHRzLmhhc093blByb3BlcnR5KGspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICBydW5uaW5nVGFza3MrKztcbiAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgICAgICAgICAgIGlmIChyZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJ1bm5pbmdUYXNrcysrO1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuXG5cbiAgICBhc3luYy5yZXRyeSA9IGZ1bmN0aW9uKHRpbWVzLCB0YXNrLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgREVGQVVMVF9USU1FUyA9IDU7XG4gICAgICAgIHZhciBERUZBVUxUX0lOVEVSVkFMID0gMDtcblxuICAgICAgICB2YXIgYXR0ZW1wdHMgPSBbXTtcblxuICAgICAgICB2YXIgb3B0cyA9IHtcbiAgICAgICAgICAgIHRpbWVzOiBERUZBVUxUX1RJTUVTLFxuICAgICAgICAgICAgaW50ZXJ2YWw6IERFRkFVTFRfSU5URVJWQUxcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiBwYXJzZVRpbWVzKGFjYywgdCl7XG4gICAgICAgICAgICBpZih0eXBlb2YgdCA9PT0gJ251bWJlcicpe1xuICAgICAgICAgICAgICAgIGFjYy50aW1lcyA9IHBhcnNlSW50KHQsIDEwKSB8fCBERUZBVUxUX1RJTUVTO1xuICAgICAgICAgICAgfSBlbHNlIGlmKHR5cGVvZiB0ID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICAgICAgYWNjLnRpbWVzID0gcGFyc2VJbnQodC50aW1lcywgMTApIHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgICAgICAgICAgYWNjLmludGVydmFsID0gcGFyc2VJbnQodC5pbnRlcnZhbCwgMTApIHx8IERFRkFVTFRfSU5URVJWQUw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgYXJndW1lbnQgdHlwZSBmb3IgXFwndGltZXNcXCc6ICcgKyB0eXBlb2YgdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgaWYgKGxlbmd0aCA8IDEgfHwgbGVuZ3RoID4gMykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50cyAtIG11c3QgYmUgZWl0aGVyICh0YXNrKSwgKHRhc2ssIGNhbGxiYWNrKSwgKHRpbWVzLCB0YXNrKSBvciAodGltZXMsIHRhc2ssIGNhbGxiYWNrKScpO1xuICAgICAgICB9IGVsc2UgaWYgKGxlbmd0aCA8PSAyICYmIHR5cGVvZiB0aW1lcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0YXNrO1xuICAgICAgICAgICAgdGFzayA9IHRpbWVzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdGltZXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHBhcnNlVGltZXMob3B0cywgdGltZXMpO1xuICAgICAgICB9XG4gICAgICAgIG9wdHMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgb3B0cy50YXNrID0gdGFzaztcblxuICAgICAgICBmdW5jdGlvbiB3cmFwcGVkVGFzayh3cmFwcGVkQ2FsbGJhY2ssIHdyYXBwZWRSZXN1bHRzKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiByZXRyeUF0dGVtcHQodGFzaywgZmluYWxBdHRlbXB0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmllc0NhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2soZnVuY3Rpb24oZXJyLCByZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWVzQ2FsbGJhY2soIWVyciB8fCBmaW5hbEF0dGVtcHQsIHtlcnI6IGVyciwgcmVzdWx0OiByZXN1bHR9KTtcbiAgICAgICAgICAgICAgICAgICAgfSwgd3JhcHBlZFJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJldHJ5SW50ZXJ2YWwoaW50ZXJ2YWwpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihzZXJpZXNDYWxsYmFjayl7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcmllc0NhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKG9wdHMudGltZXMpIHtcblxuICAgICAgICAgICAgICAgIHZhciBmaW5hbEF0dGVtcHQgPSAhKG9wdHMudGltZXMtPTEpO1xuICAgICAgICAgICAgICAgIGF0dGVtcHRzLnB1c2gocmV0cnlBdHRlbXB0KG9wdHMudGFzaywgZmluYWxBdHRlbXB0KSk7XG4gICAgICAgICAgICAgICAgaWYoIWZpbmFsQXR0ZW1wdCAmJiBvcHRzLmludGVydmFsID4gMCl7XG4gICAgICAgICAgICAgICAgICAgIGF0dGVtcHRzLnB1c2gocmV0cnlJbnRlcnZhbChvcHRzLmludGVydmFsKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhc3luYy5zZXJpZXMoYXR0ZW1wdHMsIGZ1bmN0aW9uKGRvbmUsIGRhdGEpe1xuICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhW2RhdGEubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgKHdyYXBwZWRDYWxsYmFjayB8fCBvcHRzLmNhbGxiYWNrKShkYXRhLmVyciwgZGF0YS5yZXN1bHQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBhIGNhbGxiYWNrIGlzIHBhc3NlZCwgcnVuIHRoaXMgYXMgYSBjb250cm9sbCBmbG93XG4gICAgICAgIHJldHVybiBvcHRzLmNhbGxiYWNrID8gd3JhcHBlZFRhc2soKSA6IHdyYXBwZWRUYXNrO1xuICAgIH07XG5cbiAgICBhc3luYy53YXRlcmZhbGwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIGlmICghX2lzQXJyYXkodGFza3MpKSB7XG4gICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCB0byB3YXRlcmZhbGwgbXVzdCBiZSBhbiBhcnJheSBvZiBmdW5jdGlvbnMnKTtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiB3cmFwSXRlcmF0b3IoaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uIChlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtlcnJdLmNvbmNhdChhcmdzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh3cmFwSXRlcmF0b3IobmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBc3luYyhpdGVyYXRvcikuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgd3JhcEl0ZXJhdG9yKGFzeW5jLml0ZXJhdG9yKHRhc2tzKSkoKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX3BhcmFsbGVsKGVhY2hmbiwgdGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcDtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBfaXNBcnJheUxpa2UodGFza3MpID8gW10gOiB7fTtcblxuICAgICAgICBlYWNoZm4odGFza3MsIGZ1bmN0aW9uICh0YXNrLCBrZXksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0YXNrKF9yZXN0UGFyYW0oZnVuY3Rpb24gKGVyciwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzW2tleV0gPSBhcmdzO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLnBhcmFsbGVsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoYXN5bmMuZWFjaE9mLCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5wYXJhbGxlbExpbWl0ID0gZnVuY3Rpb24odGFza3MsIGxpbWl0LCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoX2VhY2hPZkxpbWl0KGxpbWl0KSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VyaWVzID0gZnVuY3Rpb24odGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChhc3luYy5lYWNoT2ZTZXJpZXMsIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLml0ZXJhdG9yID0gZnVuY3Rpb24gKHRhc2tzKSB7XG4gICAgICAgIGZ1bmN0aW9uIG1ha2VDYWxsYmFjayhpbmRleCkge1xuICAgICAgICAgICAgZnVuY3Rpb24gZm4oKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0YXNrc1tpbmRleF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLm5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZuLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChpbmRleCA8IHRhc2tzLmxlbmd0aCAtIDEpID8gbWFrZUNhbGxiYWNrKGluZGV4ICsgMSk6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtYWtlQ2FsbGJhY2soMCk7XG4gICAgfTtcblxuICAgIGFzeW5jLmFwcGx5ID0gX3Jlc3RQYXJhbShmdW5jdGlvbiAoZm4sIGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIF9yZXN0UGFyYW0oZnVuY3Rpb24gKGNhbGxBcmdzKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkoXG4gICAgICAgICAgICAgICAgbnVsbCwgYXJncy5jb25jYXQoY2FsbEFyZ3MpXG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIF9jb25jYXQoZWFjaGZuLCBhcnIsIGZuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBpbmRleCwgY2IpIHtcbiAgICAgICAgICAgIGZuKHgsIGZ1bmN0aW9uIChlcnIsIHkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KHkgfHwgW10pO1xuICAgICAgICAgICAgICAgIGNiKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgYXN5bmMuY29uY2F0ID0gZG9QYXJhbGxlbChfY29uY2F0KTtcbiAgICBhc3luYy5jb25jYXRTZXJpZXMgPSBkb1NlcmllcyhfY29uY2F0KTtcblxuICAgIGFzeW5jLndoaWxzdCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgICAgICBpZiAodGVzdCgpKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IF9yZXN0UGFyYW0oZnVuY3Rpb24oZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGVzdC5hcHBseSh0aGlzLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVyYXRvcihuZXh0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBbbnVsbF0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGl0ZXJhdG9yKG5leHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuZG9XaGlsc3QgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjYWxscyA9IDA7XG4gICAgICAgIHJldHVybiBhc3luYy53aGlsc3QoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gKytjYWxscyA8PSAxIHx8IHRlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMudW50aWwgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBhc3luYy53aGlsc3QoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gIXRlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZG9VbnRpbCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmRvV2hpbHN0KGl0ZXJhdG9yLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmR1cmluZyA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuXG4gICAgICAgIHZhciBuZXh0ID0gX3Jlc3RQYXJhbShmdW5jdGlvbihlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2hlY2spO1xuICAgICAgICAgICAgICAgIHRlc3QuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBjaGVjayA9IGZ1bmN0aW9uKGVyciwgdHJ1dGgpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0cnV0aCkge1xuICAgICAgICAgICAgICAgIGl0ZXJhdG9yKG5leHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0ZXN0KGNoZWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZG9EdXJpbmcgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjYWxscyA9IDA7XG4gICAgICAgIGFzeW5jLmR1cmluZyhmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICBpZiAoY2FsbHMrKyA8IDEpIHtcbiAgICAgICAgICAgICAgICBuZXh0KG51bGwsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0ZXN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9xdWV1ZSh3b3JrZXIsIGNvbmN1cnJlbmN5LCBwYXlsb2FkKSB7XG4gICAgICAgIGlmIChjb25jdXJyZW5jeSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihjb25jdXJyZW5jeSA9PT0gMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25jdXJyZW5jeSBtdXN0IG5vdCBiZSB6ZXJvJyk7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwb3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCAmJiB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRhc2sgY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghX2lzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDAgJiYgcS5pZGxlKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIGRyYWluIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGFyZSBubyB0YXNrc1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9hcnJheUVhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogY2FsbGJhY2sgfHwgbm9vcFxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAocG9zKSB7XG4gICAgICAgICAgICAgICAgICAgIHEudGFza3MudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBxLnRhc2tzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUocS5wcm9jZXNzKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfbmV4dChxLCB0YXNrcykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgd29ya2VycyAtPSAxO1xuXG4gICAgICAgICAgICAgICAgdmFyIHJlbW92ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICBfYXJyYXlFYWNoKHRhc2tzLCBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICAgICAgICAgICAgICBfYXJyYXlFYWNoKHdvcmtlcnNMaXN0LCBmdW5jdGlvbiAod29ya2VyLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdvcmtlciA9PT0gdGFzayAmJiAhcmVtb3ZlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcnNMaXN0LnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHRhc2suY2FsbGJhY2suYXBwbHkodGFzaywgYXJncyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoICsgd29ya2VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB3b3JrZXJzID0gMDtcbiAgICAgICAgdmFyIHdvcmtlcnNMaXN0ID0gW107XG4gICAgICAgIHZhciBxID0ge1xuICAgICAgICAgICAgdGFza3M6IFtdLFxuICAgICAgICAgICAgY29uY3VycmVuY3k6IGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbm9vcCxcbiAgICAgICAgICAgIGVtcHR5OiBub29wLFxuICAgICAgICAgICAgZHJhaW46IG5vb3AsXG4gICAgICAgICAgICBzdGFydGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHBhdXNlZDogZmFsc2UsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIGZhbHNlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAga2lsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHEuZHJhaW4gPSBub29wO1xuICAgICAgICAgICAgICAgIHEudGFza3MgPSBbXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnNoaWZ0OiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIHRydWUsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUoIXEucGF1c2VkICYmIHdvcmtlcnMgPCBxLmNvbmN1cnJlbmN5ICYmIHEudGFza3MubGVuZ3RoKXtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdGFza3MgPSBxLnBheWxvYWQgP1xuICAgICAgICAgICAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoMCwgcS5wYXlsb2FkKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICBxLnRhc2tzLnNwbGljZSgwLCBxLnRhc2tzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBfbWFwKHRhc2tzLCBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhc2suZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzTGlzdC5wdXNoKHRhc2tzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNiID0gb25seV9vbmNlKF9uZXh0KHEsIHRhc2tzKSk7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcihkYXRhLCBjYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBxLnRhc2tzLmxlbmd0aDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW5uaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdvcmtlcnM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd29ya2Vyc0xpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2Vyc0xpc3Q7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWRsZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoICsgd29ya2VycyA9PT0gMDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwYXVzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHEucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXN1bWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAocS5wYXVzZWQgPT09IGZhbHNlKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIHEucGF1c2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VtZUNvdW50ID0gTWF0aC5taW4ocS5jb25jdXJyZW5jeSwgcS50YXNrcy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIC8vIE5lZWQgdG8gY2FsbCBxLnByb2Nlc3Mgb25jZSBwZXIgY29uY3VycmVudFxuICAgICAgICAgICAgICAgIC8vIHdvcmtlciB0byBwcmVzZXJ2ZSBmdWxsIGNvbmN1cnJlbmN5IGFmdGVyIHBhdXNlXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdyA9IDE7IHcgPD0gcmVzdW1lQ291bnQ7IHcrKykge1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUocS5wcm9jZXNzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBxO1xuICAgIH1cblxuICAgIGFzeW5jLnF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgdmFyIHEgPSBfcXVldWUoZnVuY3Rpb24gKGl0ZW1zLCBjYikge1xuICAgICAgICAgICAgd29ya2VyKGl0ZW1zWzBdLCBjYik7XG4gICAgICAgIH0sIGNvbmN1cnJlbmN5LCAxKTtcblxuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuXG4gICAgYXN5bmMucHJpb3JpdHlRdWV1ZSA9IGZ1bmN0aW9uICh3b3JrZXIsIGNvbmN1cnJlbmN5KSB7XG5cbiAgICAgICAgZnVuY3Rpb24gX2NvbXBhcmVUYXNrcyhhLCBiKXtcbiAgICAgICAgICAgIHJldHVybiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9iaW5hcnlTZWFyY2goc2VxdWVuY2UsIGl0ZW0sIGNvbXBhcmUpIHtcbiAgICAgICAgICAgIHZhciBiZWcgPSAtMSxcbiAgICAgICAgICAgICAgICBlbmQgPSBzZXF1ZW5jZS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgd2hpbGUgKGJlZyA8IGVuZCkge1xuICAgICAgICAgICAgICAgIHZhciBtaWQgPSBiZWcgKyAoKGVuZCAtIGJlZyArIDEpID4+PiAxKTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGFyZShpdGVtLCBzZXF1ZW5jZVttaWRdKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGJlZyA9IG1pZDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbmQgPSBtaWQgLSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBiZWc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHByaW9yaXR5LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwgJiYgdHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0YXNrIGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHEuc3RhcnRlZCA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIV9pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gY2FsbCBkcmFpbiBpbW1lZGlhdGVseSBpZiB0aGVyZSBhcmUgbm8gdGFza3NcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBxLmRyYWluKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfYXJyYXlFYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IHByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nID8gY2FsbGJhY2sgOiBub29wXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHEudGFza3Muc3BsaWNlKF9iaW5hcnlTZWFyY2gocS50YXNrcywgaXRlbSwgX2NvbXBhcmVUYXNrcykgKyAxLCAwLCBpdGVtKTtcblxuICAgICAgICAgICAgICAgIGlmIChxLnRhc2tzLmxlbmd0aCA9PT0gcS5jb25jdXJyZW5jeSkge1xuICAgICAgICAgICAgICAgICAgICBxLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUocS5wcm9jZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RhcnQgd2l0aCBhIG5vcm1hbCBxdWV1ZVxuICAgICAgICB2YXIgcSA9IGFzeW5jLnF1ZXVlKHdvcmtlciwgY29uY3VycmVuY3kpO1xuXG4gICAgICAgIC8vIE92ZXJyaWRlIHB1c2ggdG8gYWNjZXB0IHNlY29uZCBwYXJhbWV0ZXIgcmVwcmVzZW50aW5nIHByaW9yaXR5XG4gICAgICAgIHEucHVzaCA9IGZ1bmN0aW9uIChkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZW1vdmUgdW5zaGlmdCBmdW5jdGlvblxuICAgICAgICBkZWxldGUgcS51bnNoaWZ0O1xuXG4gICAgICAgIHJldHVybiBxO1xuICAgIH07XG5cbiAgICBhc3luYy5jYXJnbyA9IGZ1bmN0aW9uICh3b3JrZXIsIHBheWxvYWQpIHtcbiAgICAgICAgcmV0dXJuIF9xdWV1ZSh3b3JrZXIsIDEsIHBheWxvYWQpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfY29uc29sZV9mbihuYW1lKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uIChmbiwgYXJncykge1xuICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoW19yZXN0UGFyYW0oZnVuY3Rpb24gKGVyciwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uc29sZVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2FycmF5RWFjaChhcmdzLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGVbbmFtZV0oeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXSkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIHZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICAgICAgICBoYXNoZXIgPSBoYXNoZXIgfHwgaWRlbnRpdHk7XG4gICAgICAgIHZhciBtZW1vaXplZCA9IF9yZXN0UGFyYW0oZnVuY3Rpb24gbWVtb2l6ZWQoYXJncykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICBpZiAoaGFzLmNhbGwobWVtbywga2V5KSkgeyAgIFxuICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIG1lbW9ba2V5XSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoYXMuY2FsbChxdWV1ZXMsIGtleSkpIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldID0gW2NhbGxiYWNrXTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbX3Jlc3RQYXJhbShmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgICAgICAgICBtZW1vW2tleV0gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcSA9IHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHFbaV0uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIG1lbW9pemVkLm1lbW8gPSBtZW1vO1xuICAgICAgICBtZW1vaXplZC51bm1lbW9pemVkID0gZm47XG4gICAgICAgIHJldHVybiBtZW1vaXplZDtcbiAgICB9O1xuXG4gICAgYXN5bmMudW5tZW1vaXplID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKGZuLnVubWVtb2l6ZWQgfHwgZm4pLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF90aW1lcyhtYXBwZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjb3VudCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBtYXBwZXIoX3JhbmdlKGNvdW50KSwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBhc3luYy50aW1lcyA9IF90aW1lcyhhc3luYy5tYXApO1xuICAgIGFzeW5jLnRpbWVzU2VyaWVzID0gX3RpbWVzKGFzeW5jLm1hcFNlcmllcyk7XG4gICAgYXN5bmMudGltZXNMaW1pdCA9IGZ1bmN0aW9uIChjb3VudCwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gYXN5bmMubWFwTGltaXQoX3JhbmdlKGNvdW50KSwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnNlcSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbnMuLi4gKi8pIHtcbiAgICAgICAgdmFyIGZucyA9IGFyZ3VtZW50cztcbiAgICAgICAgcmV0dXJuIF9yZXN0UGFyYW0oZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wb3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBub29wO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhc3luYy5yZWR1Y2UoZm5zLCBhcmdzLCBmdW5jdGlvbiAobmV3YXJncywgZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgbmV3YXJncy5jb25jYXQoW19yZXN0UGFyYW0oZnVuY3Rpb24gKGVyciwgbmV4dGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IoZXJyLCBuZXh0YXJncyk7XG4gICAgICAgICAgICAgICAgfSldKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoYXQsIFtlcnJdLmNvbmNhdChyZXN1bHRzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLmNvbXBvc2UgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb25zLi4uICovKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5zZXEuYXBwbHkobnVsbCwgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICB9O1xuXG5cbiAgICBmdW5jdGlvbiBfYXBwbHlFYWNoKGVhY2hmbikge1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbihmbnMsIGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBnbyA9IF9yZXN0UGFyYW0oZnVuY3Rpb24oYXJncykge1xuICAgICAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBlYWNoZm4oZm5zLCBmdW5jdGlvbiAoZm4sIF8sIGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuLmFwcGx5KHRoYXQsIGFyZ3MuY29uY2F0KFtjYl0pKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdvLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc3luYy5hcHBseUVhY2ggPSBfYXBwbHlFYWNoKGFzeW5jLmVhY2hPZik7XG4gICAgYXN5bmMuYXBwbHlFYWNoU2VyaWVzID0gX2FwcGx5RWFjaChhc3luYy5lYWNoT2ZTZXJpZXMpO1xuXG5cbiAgICBhc3luYy5mb3JldmVyID0gZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgZG9uZSA9IG9ubHlfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgdmFyIHRhc2sgPSBlbnN1cmVBc3luYyhmbik7XG4gICAgICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRhc2sobmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBlbnN1cmVBc3luYyhmbikge1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIGFyZ3MucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyQXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICBpZiAoc3luYykge1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgaW5uZXJBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgaW5uZXJBcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBzeW5jID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgc3luYyA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc3luYy5lbnN1cmVBc3luYyA9IGVuc3VyZUFzeW5jO1xuXG4gICAgYXN5bmMuY29uc3RhbnQgPSBfcmVzdFBhcmFtKGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgICB2YXIgYXJncyA9IFtudWxsXS5jb25jYXQodmFsdWVzKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXN5bmMud3JhcFN5bmMgPVxuICAgIGFzeW5jLmFzeW5jaWZ5ID0gZnVuY3Rpb24gYXN5bmNpZnkoZnVuYykge1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYgcmVzdWx0IGlzIFByb21pc2Ugb2JqZWN0XG4gICAgICAgICAgICBpZiAoX2lzT2JqZWN0KHJlc3VsdCkgJiYgdHlwZW9mIHJlc3VsdC50aGVuID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSlbXCJjYXRjaFwiXShmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLm1lc3NhZ2UgPyBlcnIgOiBuZXcgRXJyb3IoZXJyKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBOb2RlLmpzXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXN5bmM7XG4gICAgfVxuICAgIC8vIEFNRCAvIFJlcXVpcmVKU1xuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhc3luYztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGluY2x1ZGVkIGRpcmVjdGx5IHZpYSA8c2NyaXB0PiB0YWdcbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IGFzeW5jO1xuICAgIH1cblxufSgpKTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19

//# sourceMappingURL=async-chainable.js.map