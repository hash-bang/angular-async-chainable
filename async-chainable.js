(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.asyncChainable = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"async":2}],2:[function(require,module,exports){
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

},{"_process":3}],3:[function(require,module,exports){
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXN5bmMtY2hhaW5hYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2FzeW5jL2xpYi9hc3luYy5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsNEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2p2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGFzeW5jID0gcmVxdWlyZSgnYXN5bmMnKTtcblxuLyoqXG4qIEV4YW1pbmVzIGFuIGFyZ3VtZW50IHN0YWNrIGFuZCByZXR1cm5zIGFsbCBwYXNzZWQgYXJndW1lbnRzIGFzIGEgQ1NWXG4qIGUuZy5cbipcdGZ1bmN0aW9uIHRlc3QgKCkgeyBnZXRPdmVybG9hZChhcmd1bWVudHMpIH07XG4qXHR0ZXN0KCdoZWxsbycsICd3b3JsZCcpIC8vICdzdHJpbmcsc3RyaW5nJ1xuKlx0dGVzdChmdW5jdGlvbigpIHt9LCAxKSAvLyAnZnVuY3Rpb24sbnVtYmVyJ1xuKlx0dGVzdCgnaGVsbG8nLCAxMjMsIHtmb286ICdiYXInfSwgWydiYXonXSwgW3txdXo6ICdxdXpWYWx1ZSd9LCB7cXV1ejogJ3F1dXpWYWx1ZSd9XSkgLy8gJ3N0cmluZyxudW1iZXIsb2JqZWN0LGFycmF5LGNvbGxlY3Rpb24nXG4qXG4qIEBwYXJhbSBvYmplY3QgYXJncyBUaGUgc3BlY2lhbCBKYXZhU2NyaXB0ICdhcmd1bWVudHMnIG9iamVjdFxuKiBAcmV0dXJuIHN0cmluZyBDU1Ygb2YgYWxsIHBhc3NlZCBhcmd1bWVudHNcbiovXG5mdW5jdGlvbiBnZXRPdmVybG9hZChhcmdzKSB7XG5cdHZhciBpID0gMDtcblx0dmFyIG91dCA9IFtdO1xuXHR3aGlsZSgxKSB7XG5cdFx0dmFyIGFyZ1R5cGUgPSB0eXBlb2YgYXJnc1tpXTtcblx0XHRpZiAoYXJnVHlwZSA9PSAndW5kZWZpbmVkJykgYnJlYWs7XG5cdFx0aWYgKGFyZ1R5cGUgPT0gJ29iamVjdCcgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFyZ3NbaV0pID09ICdbb2JqZWN0IEFycmF5XScpIHsgLy8gU3BlY2lhbCBjYXNlIGZvciBhcnJheXMgYmVpbmcgY2xhc3NlZCBhcyBvYmplY3RzXG5cdFx0XHRhcmdUeXBlID0gJ2FycmF5Jztcblx0XHRcdGlmIChhcmdzW2ldLmxlbmd0aCAmJiBhcmdzW2ldLmV2ZXJ5KGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0cmV0dXJuICh0eXBlb2YgaXRlbSA9PSAnb2JqZWN0JyAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaXRlbSkgPT0gJ1tvYmplY3QgT2JqZWN0XScpO1xuXHRcdFx0fSkpXG5cdFx0XHRcdGFyZ1R5cGUgPSAnY29sbGVjdGlvbic7XG5cdFx0fVxuXHRcdG91dC5wdXNoKGFyZ1R5cGUpO1xuXHRcdGkrKztcblx0fVxuXHRyZXR1cm4gb3V0LnRvU3RyaW5nKCk7XG59O1xuXG4vLyBVdGlsaXR5IGZ1bmN0aW9ucyB7e3tcbi8qKlxuKiBSZXR1cm4gdHJ1ZSBpZiBhIHZhcmlhYmxlIGlzIGFuIGFycmF5XG4qIEBwYXJhbSBtaXhlZCB0aGluZyBUaGUgdmFyYWJsZSB0byBleGFtaW5lXG4qIEByZXR1cm4gYm9vbCBUcnVlIGlmIHRoZSBpdGVtIGlzIGEgY2xhc3NpYyBKUyBhcnJheSBhbmQgbm90IGFuIG9iamVjdFxuKi9cbmZ1bmN0aW9uIGlzQXJyYXkodGhpbmcpIHtcblx0cmV0dXJuIChcblx0XHR0eXBlb2YgdGhpbmcgPT0gJ29iamVjdCcgJiZcblx0XHRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpbmcpID09ICdbb2JqZWN0IEFycmF5XSdcblx0KTtcbn1cblxuXG4vKipcbiogUmV0dXJuIHRydWUgaWYgYSB2YXJpYWJsZSBpcyBhbiBvYmplY3RcbiogQHBhcmFtIG1peGVkIHRoaW5nIFRoZSB2YXJhYmxlIHRvIGV4YW1pbmVcbiogQHJldHVybiBib29sIFRydWUgaWYgdGhlIGl0ZW0gaXMgYSBjbGFzc2ljIEpTIGFycmF5IGFuZCBub3QgYW4gb2JqZWN0XG4qL1xuZnVuY3Rpb24gaXNPYmplY3QodGhpbmcpIHtcblx0cmV0dXJuIChcblx0XHR0eXBlb2YgdGhpbmcgPT0gJ29iamVjdCcgJiZcblx0XHRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpbmcpICE9ICdbb2JqZWN0IEFycmF5XSdcblx0KTtcbn1cbi8vIH19fVxuXG4vLyBQbHVnaW4gZnVuY3Rpb25hbGl0eSAtIHZpYSBgdXNlKClgXG52YXIgX3BsdWdpbnMgPSB7fTtcbmZ1bmN0aW9uIHVzZShtb2R1bGUpIHtcblx0bW9kdWxlLmNhbGwodGhpcyk7XG5cdHJldHVybiB0aGlzO1xufTtcbi8vIH19fVxuXG4vKipcbiogUXVldWUgdXAgYSBmdW5jdGlvbihzKSB0byBleGVjdXRlIGluIHNlcmllc1xuKiBAcGFyYW0gYXJyYXksb2JqZWN0LGZ1bmN0aW9uIFRoZSBmdW5jdGlvbihzKSB0byBleGVjdXRlXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIHNlcmllcygpIHtcblx0dmFyIGNhbGxlZEFzID0gZ2V0T3ZlcmxvYWQoYXJndW1lbnRzKTtcblx0c3dpdGNoKGNhbGxlZEFzKSB7XG5cdFx0Y2FzZSAnJzpcblx0XHRcdC8vIFBhc3Ncblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2Z1bmN0aW9uJzogLy8gRm9ybTogc2VyaWVzKGZ1bmMpXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNBcnJheScsIHBheWxvYWQ6IFthcmd1bWVudHNbMF1dIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAgJ3N0cmluZyxmdW5jdGlvbic6IC8vIEZvcm06IHNlcmllcyhTdHJpbmcgPGlkPiwgZnVuYylcblx0XHRcdHZhciBwYXlsb2FkID0ge307XG5cdFx0XHRwYXlsb2FkW2FyZ3VtZW50c1swXV0gPSBhcmd1bWVudHNbMV07XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNPYmplY3QnLCBwYXlsb2FkOiBwYXlsb2FkfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdhcnJheSc6IC8vIEZvcm06IHNlcmllcyhBcnJheSA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzQXJyYXknLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdvYmplY3QnOiAvLyBGb3JtOiBzZXJpZXMoT2JqZWN0IDxmdW5jcz4pXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNPYmplY3QnLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdjb2xsZWN0aW9uJzogLy8gRm9ybTogc2VyaWVzKENvbGxlY3Rpb24gPGZ1bmNzPilcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3Nlcmllc0NvbGxlY3Rpb24nLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblxuXHRcdC8vIEFzeW5jIGxpYnJhcnkgY29tcGF0aWJpbGl0eSB7e3tcblx0XHRjYXNlICdhcnJheSxmdW5jdGlvbic6XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNBcnJheScsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdHRoaXMuZW5kKGFyZ3VtZW50c1sxXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdvYmplY3QsZnVuY3Rpb24nOlxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2VyaWVzT2JqZWN0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0dGhpcy5lbmQoYXJndW1lbnRzWzFdKTtcblx0XHRcdGJyZWFrO1xuXHRcdC8vIH19fVxuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLnNlcmllcygpOiAnICsgY2FsbGVkQXMpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuKiBRdWV1ZSB1cCBhIGZ1bmN0aW9uKHMpIHRvIGV4ZWN1dGUgaW4gcGFyYWxsZWxcbiogQHBhcmFtIGFycmF5LG9iamVjdCxmdW5jdGlvbiBUaGUgZnVuY3Rpb24ocykgdG8gZXhlY3V0ZVxuKiBAcmV0dXJuIG9iamVjdCBUaGlzIGNoYWluYWJsZSBvYmplY3RcbiovXG5mdW5jdGlvbiBwYXJhbGxlbCgpIHtcblx0dmFyIGNhbGxlZEFzID0gZ2V0T3ZlcmxvYWQoYXJndW1lbnRzKVxuXHRzd2l0Y2ggKGNhbGxlZEFzKSB7XG5cdFx0Y2FzZSAnJzpcblx0XHRcdC8vIFBhc3Ncblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2Z1bmN0aW9uJzogLy8gRm9ybTogcGFyYWxsZWwoZnVuYylcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsQXJyYXknLCBwYXlsb2FkOiBbYXJndW1lbnRzWzBdXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ3N0cmluZyxmdW5jdGlvbic6IC8vIEZvcm06IHBhcmFsbGVsKFN0cmluZyA8aWQ+LCBmdW5jKVxuXHRcdFx0dmFyIHBheWxvYWQgPSB7fTtcblx0XHRcdHBheWxvYWRbYXJndW1lbnRzWzBdXSA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3BhcmFsbGVsQXJyYXknLCBwYXlsb2FkOiBwYXlsb2FkIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnYXJyYXknOiAvLyBGb3JtOiBwYXJhbGxlbChBcnJheSA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAncGFyYWxsZWxBcnJheScsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ29iamVjdCc6IC8vIEZvcm06IHBhcmFsbGVsKE9iamVjdCA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAncGFyYWxsZWxPYmplY3QnLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdjb2xsZWN0aW9uJzogLy8gRm9ybTogcGFyYWxsZWwoQ29sbGVjdGlvbiA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAncGFyYWxsZWxDb2xsZWN0aW9uJywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cblx0XHQvLyBBc3luYyBsaWJyYXJ5IGNvbXBhdGliaWxpdHkge3t7XG5cdFx0Y2FzZSAnYXJyYXksZnVuY3Rpb24nOlxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAncGFyYWxsZWxBcnJheScsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdHRoaXMuZW5kKGFyZ3VtZW50c1sxXSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdvYmplY3QsZnVuY3Rpb24nOlxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAncGFyYWxsZWxPYmplY3QnLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHR0aGlzLmVuZChhcmd1bWVudHNbMV0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Ly8gfX19XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBjYWxsIHN0eWxlIGZvciAucGFyYWxsZWwoKTogJyArIGNhbGxlZEFzKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogUnVuIGFuIGFycmF5L29iamVjdC9jb2xsZWN0aW9uIHRob3VnaCBhIGZ1bmN0aW9uXG4qIFRoaXMgaXMgc2ltaWxhciB0byB0aGUgYXN5bmMgbmF0aXZlIC5lYWNoKCkgZnVuY3Rpb24gYnV0IGNoYWluYWJsZVxuKi9cbmZ1bmN0aW9uIGZvckVhY2goKSB7XG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cylcblx0c3dpdGNoIChjYWxsZWRBcykge1xuXHRcdGNhc2UgJyc6XG5cdFx0XHQvLyBQYXNzXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdjb2xsZWN0aW9uLGZ1bmN0aW9uJzogLy8gRm9ybTogZm9yRWFjaChDb2xsZWN0aW9uIGZ1bmMpXG5cdFx0Y2FzZSAnYXJyYXksZnVuY3Rpb24nOiAvLyBGb3JtOiBmb3JFYWNoKEFycmF5LCBmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZm9yRWFjaEFycmF5JywgcGF5bG9hZDogYXJndW1lbnRzWzBdLCBjYWxsYmFjazogYXJndW1lbnRzWzFdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb2JqZWN0LGZ1bmN0aW9uJzogLy8gRm9ybTogZm9yRWFjaChPYmplY3QsIGZ1bmMpXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdmb3JFYWNoT2JqZWN0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdLCBjYWxsYmFjazogYXJndW1lbnRzWzFdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3RyaW5nLGZ1bmN0aW9uJzogLy8gRm9ybTogZm9yRWFjaChTdHJpbmcgPHNldCBsb29rdXA+LCBmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZm9yRWFjaExhdGVCb3VuZCcsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSwgY2FsbGJhY2s6IGFyZ3VtZW50c1sxXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLmZvckVhY2goKTogJyArIGNhbGxlZEFzKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufVxuXG5cbi8vIERlZmVyIGZ1bmN0aW9uYWxpdHkgLSBIZXJlIGJlIGRyYWdvbnMhIHt7e1xuLyoqXG4qIENvbGxlY3Rpb24gb2YgaXRlbXMgdGhhdCBoYXZlIGJlZW4gZGVmZXJyZWRcbiogQHR5cGUgY29sbGVjdGlvbiB7cGF5bG9hZDogZnVuY3Rpb24sIGlkOiBudWxsfFN0cmluZywgcHJlcmVxOiBbZGVwMSwgZGVwMi4uLl19XG4qIEBhY2Nlc3MgcHJpdmF0ZVxuKi9cbmZ1bmN0aW9uIGRlZmVyQWRkKGlkLCB0YXNrLCBwYXJlbnRDaGFpbikge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHBhcmVudENoYWluLndhaXRpbmdPbiA9IChwYXJlbnRDaGFpbi53YWl0aW5nT24gfHwgMCkgKyAxO1xuXG5cdGlmICghIHBhcmVudENoYWluLndhaXRpbmdPbklkcylcblx0XHRwYXJlbnRDaGFpbi53YWl0aW5nT25JZHMgPSBbXTtcblx0cGFyZW50Q2hhaW4ud2FpdGluZ09uSWRzLnB1c2goaWQpO1xuXG5cdHNlbGYuX2RlZmVycmVkLnB1c2goe1xuXHRcdGlkOiBpZCB8fCBudWxsLFxuXHRcdHByZXJlcTogcGFyZW50Q2hhaW4ucHJlcmVxIHx8IFtdLFxuXHRcdHBheWxvYWQ6IGZ1bmN0aW9uKG5leHQpIHtcblx0XHRcdHNlbGYuX2NvbnRleHQuX2lkID0gaWQ7XG5cdFx0XHR0YXNrLmNhbGwoc2VsZi5fb3B0aW9ucy5jb250ZXh0LCBmdW5jdGlvbihlcnIsIHZhbHVlKSB7XG5cdFx0XHRcdGlmIChpZClcblx0XHRcdFx0XHRzZWxmLl9jb250ZXh0W2lkXSA9IHZhbHVlO1xuXHRcdFx0XHRzZWxmLl9kZWZlcnJlZFJ1bm5pbmctLTtcblx0XHRcdFx0aWYgKC0tcGFyZW50Q2hhaW4ud2FpdGluZ09uID09IDApIHtcblx0XHRcdFx0XHRwYXJlbnRDaGFpbi5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGlmIChzZWxmLl9zdHJ1Y3QubGVuZ3RoICYmIHNlbGYuX3N0cnVjdFtzZWxmLl9zdHJ1Y3RQb2ludGVyXS50eXBlID09ICdhd2FpdCcpXG5cdFx0XHRcdFx0XHRzZWxmLl9leGVjdXRlKGVycik7XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcbn07XG5cblxuZnVuY3Rpb24gX2RlZmVyQ2hlY2soKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblx0aWYgKHNlbGYuX29wdGlvbnMubGltaXQgJiYgc2VsZi5fZGVmZXJyZWRSdW5uaW5nID49IHNlbGYuX29wdGlvbnMubGltaXQpIHJldHVybjsgLy8gQWxyZWFkeSBvdmVyIGxpbWl0XG5cdHNlbGYuX2RlZmVycmVkID0gc2VsZi5fZGVmZXJyZWQuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRpZiAoc2VsZi5fb3B0aW9ucy5saW1pdCAmJiBzZWxmLl9kZWZlcnJlZFJ1bm5pbmcgPj0gc2VsZi5fb3B0aW9ucy5saW1pdCkge1xuXHRcdFx0cmV0dXJuIHRydWU7IC8vIEFscmVhZHkgb3ZlciBsaW1pdCAtIGFsbCBzdWJzZXFlbnQgaXRlbXMgc2hvdWxkIGJlIGxlZnQgaW4gcGxhY2Vcblx0XHR9XG5cdFx0aWYgKFxuXHRcdFx0aXRlbS5wcmVyZXEubGVuZ3RoID09IDAgfHwgLy8gTm8gcHJlLXJlcXMgLSBjYW4gZXhlY3V0ZSBub3dcblx0XHRcdGl0ZW0ucHJlcmVxLmV2ZXJ5KGZ1bmN0aW9uKGRlcCkgeyAvLyBBbGwgcHJlLXJlcXMgYXJlIHNhdGlzZmllZFxuXHRcdFx0XHRyZXR1cm4gc2VsZi5fY29udGV4dC5oYXNPd25Qcm9wZXJ0eShkZXApO1xuXHRcdFx0fSlcblx0XHQpIHsgXG5cdFx0XHRzZWxmLl9kZWZlcnJlZFJ1bm5pbmcrKztcblx0XHRcdHNldFRpbWVvdXQoaXRlbS5wYXlsb2FkKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9IGVsc2UgeyAvLyBDYW4ndCBkbyBhbnl0aGluZyB3aXRoIHNlbGYgcmlnaHQgbm93XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdH0pO1xufTtcbi8vIH19fVxuXG5cbi8qKlxuKiBRdWV1ZSB1cCBhIGZ1bmN0aW9uKHMpIHRvIGV4ZWN1dGUgYXMgZGVmZXJyZWQgLSBpLmUuIGRvbnQgc3RvcCB0byB3YWl0IGZvciBpdFxuKiBAcGFyYW0gYXJyYXksb2JqZWN0LGZ1bmN0aW9uIFRoZSBmdW5jdGlvbihzKSB0byBleGVjdXRlIGFzIGEgZGVmZXJcbiogQHJldHVybiBvYmplY3QgVGhpcyBjaGFpbmFibGUgb2JqZWN0XG4qL1xuZnVuY3Rpb24gZGVmZXIoKSB7XG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cyk7XG5cdHN3aXRjaCAoY2FsbGVkQXMpIHtcblx0XHRjYXNlICcnOlxuXHRcdFx0Ly8gUGFzc1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnZnVuY3Rpb24nOiAvLyBGb3JtOiBkZWZlcihmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZGVmZXJBcnJheScsIHBheWxvYWQ6IFthcmd1bWVudHNbMF1dIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3RyaW5nLGZ1bmN0aW9uJzogLy8gRm9ybTogZGVmZXIoU3RyaW5nIDxpZD4sIGZ1bmMpXG5cdFx0XHR2YXIgcGF5bG9hZCA9IHt9O1xuXHRcdFx0cGF5bG9hZFthcmd1bWVudHNbMF1dID0gYXJndW1lbnRzWzFdO1xuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZGVmZXJPYmplY3QnLCBwYXlsb2FkOiBwYXlsb2FkIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnYXJyYXknOiAvLyBGb3JtOiBkZWZlcihBcnJheSA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZGVmZXJBcnJheScsIHBheWxvYWQ6IGFyZ3VtZW50c1swXSB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ29iamVjdCc6IC8vIEZvcm06IGRlZmVyKE9iamVjdCA8ZnVuY3M+KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZGVmZXJPYmplY3QnLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdjb2xsZWN0aW9uJzogLy8gRm9ybSBkZWZlcihDb2xsZWN0aW9uIDxmdW5jcz4pXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdkZWZlckNvbGxlY3Rpb24nLCBwYXlsb2FkOiBhcmd1bWVudHNbMF0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdhcnJheSxmdW5jdGlvbic6IC8vIEZvcm06IGRlZmVyKEFycmF5IDxwcmVyZXFzPiwgZnVuYylcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2RlZmVyQXJyYXknLCBwcmVyZXE6IGFyZ3VtZW50c1swXSwgcGF5bG9hZDogW2FyZ3VtZW50c1sxXV0gfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdzdHJpbmcsc3RyaW5nLGZ1bmN0aW9uJzogLy8gRm9ybTogZGVmZXIoU3RyaW5nIDxwcmVyZXE+LCBTdHJpbmcgPG5hbWU+LCBmdW5jKVxuXHRcdFx0dmFyIHBheWxvYWQgPSB7fTtcblx0XHRcdHBheWxvYWRbYXJndW1lbnRzWzFdXSA9IGFyZ3VtZW50c1syXTtcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2RlZmVyT2JqZWN0JywgcHJlcmVxOiBbYXJndW1lbnRzWzBdXSwgcGF5bG9hZDogcGF5bG9hZCB9KTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2FycmF5LHN0cmluZyxmdW5jdGlvbic6IC8vRm9ybTogZGVmZXIoQXJyYXkgPHByZXJlcXM+LCBTdHJpbmcgPGlkPiwgZnVuYylcblx0XHRcdHZhciBwYXlsb2FkID0ge307XG5cdFx0XHRwYXlsb2FkW2FyZ3VtZW50c1sxXV0gPSBhcmd1bWVudHNbMl07XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdkZWZlck9iamVjdCcsIHByZXJlcTogYXJndW1lbnRzWzBdLCBwYXlsb2FkOiBwYXlsb2FkIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBjYWxsIHN0eWxlIGZvciAuZGVmZXIoKTonICsgY2FsbGVkQXMpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuKiBRdWV1ZSB1cCBhbiBhd2FpdCBwb2ludFxuKiBUaGlzIHN0b3BzIHRoZSBleGVjdXRpb24gcXVldWUgdW50aWwgaXRzIHNhdGlzZmllZCB0aGF0IGRlcGVuZGVuY2llcyBoYXZlIGJlZW4gcmVzb2x2ZWRcbiogQHBhcmFtIGFycmF5LC4uLiBUaGUgZGVwZW5kZW5jaWVzIHRvIGNoZWNrIHJlc29sdXRpb24gb2YuIElmIG9taXR0ZWQgYWxsIGFyZSBjaGVja2VkXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIGF3YWl0KCkge1xuXHR2YXIgcGF5bG9hZCA9IFtdO1xuXG5cdC8vIFNsdXJwIGFsbCBhcmdzIGludG8gcGF5bG9hZCB7e3tcblx0dmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cdGdldE92ZXJsb2FkKGFyZ3VtZW50cykuc3BsaXQoJywnKS5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUsIG9mZnNldCkge1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnJzogLy8gQmxhbmsgYXJndW1lbnRzIC0gZG8gbm90aGluZ1xuXHRcdFx0XHQvLyBQYXNzXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc3RyaW5nJzpcblx0XHRcdFx0cGF5bG9hZC5wdXNoKGFyZ3Nbb2Zmc2V0XSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnYXJyYXknOlxuXHRcdFx0XHRwYXlsb2FkLmNvbmNhdChhcmdzW29mZnNldF0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBhcmd1bWVudCB0eXBlIHBhc3NlZCB0byAuYXdhaXQoKTogJyArIHR5cGUpO1xuXHRcdH1cblx0fSk7XG5cdC8vIH19fVxuXG5cdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2F3YWl0JywgcGF5bG9hZDogcGF5bG9hZCB9KTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIFF1ZXVlIHVwIGEgbGltaXQgc2V0dGVyXG4qIEBwYXJhbSBpbnR8bnVsbHxmYWxzZSBFaXRoZXIgdGhlIG51bWJlciBvZiBkZWZlciBwcm9jZXNzZXMgdGhhdCBhcmUgYWxsb3dlZCB0byBleGVjdXRlIHNpbXVsdGFuaW91c2x5IG9yIGZhbHN5IHZhbHVlcyB0byBkaXNhYmxlXG4qIEByZXR1cm4gb2JqZWN0IFRoaXMgY2hhaW5hYmxlIG9iamVjdFxuKi9cbmZ1bmN0aW9uIHNldExpbWl0KHNldExpbWl0KSB7XG5cdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2xpbWl0JywgcGF5bG9hZDogc2V0TGltaXQgfSk7XG5cdHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogUXVldWUgdXAgYSBjb250ZXh0IHNldHRlclxuKiBAcGFyYW0gb2JqZWN0IG5ld0NvbnRleHQgVGhlIG5ldyBjb250ZXh0IHRvIHBhc3MgdG8gYWxsIHN1YnNlcXVlbnQgZnVuY3Rpb25zIHZpYSBgdGhpc2BcbiogQHJldHVybiBvYmplY3QgVGhpcyBjaGFpbmFibGUgb2JqZWN0XG4qL1xuZnVuY3Rpb24gc2V0Q29udGV4dChuZXdDb250ZXh0KSB7XG5cdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ2NvbnRleHQnLCBwYXlsb2FkOiBuZXdDb250ZXh0IH0pO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4qIFF1ZXVlIHVwIGEgdmFyYWJsZSBzZXR0ZXIgKGkuZS4gc2V0IGEgaGFzaCBvZiB2YXJpYWJsZXMgaW4gY29udGV4dClcbiogQHBhcmFtIHN0cmluZyBUaGUgbmFtZWQga2V5IHRvIHNldFxuKiBAcGFyYW0gbWl4ZWQgVGhlIHZhbHVlIHRvIHNldFxuKiBAcmV0dXJuIG9iamVjdCBUaGlzIGNoYWluYWJsZSBvYmplY3RcbiovXG5mdW5jdGlvbiBzZXQoKSB7XG5cdHZhciBjYWxsZWRBcyA9IGdldE92ZXJsb2FkKGFyZ3VtZW50cyk7XG5cdHN3aXRjaChjYWxsZWRBcykge1xuXHRcdGNhc2UgJyc6XG5cdFx0XHQvLyBQYXNzXG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdzdHJpbmcsc3RyaW5nJzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgU3RyaW5nIDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLG51bWJlcic6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIE51bWJlciA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxib29sZWFuJzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgQm9vbGVhbiA8dmFsdWU+KVxuXHRcdGNhc2UgJ3N0cmluZyxhcnJheSc6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIEFycmF5IDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLGNvbGxlY3Rpb24nOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBDb2xsZWN0aW9uIDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLG9iamVjdCc6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIE9iamVjdCA8dmFsdWU+KVxuXHRcdFx0dmFyIHBheWxvYWQgPSB7fTtcblx0XHRcdHBheWxvYWRbYXJndW1lbnRzWzBdXSA9IGFyZ3VtZW50c1sxXTtcblx0XHRcdHRoaXMuX3N0cnVjdC5wdXNoKHsgdHlwZTogJ3NldCcsIHBheWxvYWQ6IHBheWxvYWQgfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdvYmplY3QnOiAvLyBGb3JtOiBzZXQoT2JqZWN0KVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnc2V0JywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnZnVuY3Rpb24nOiAvLyBGb3JtOiBzZXQoZnVuYykgLT4gc2VyaWVzKGZ1bmMpXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNBcnJheScsIHBheWxvYWQ6IFthcmd1bWVudHNbMF1dIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAgJ3N0cmluZyxmdW5jdGlvbic6IC8vIEZvcm06IHNldChTdHJpbmcsIGZ1bmMpIC0+IHNlcmllcyhTdHJpbmcgPGlkPiwgZnVuYylcblx0XHRcdHZhciBwYXlsb2FkID0ge307XG5cdFx0XHRwYXlsb2FkW2FyZ3VtZW50c1swXV0gPSBhcmd1bWVudHNbMV07XG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdzZXJpZXNPYmplY3QnLCBwYXlsb2FkOiBwYXlsb2FkfSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdzdHJpbmcnOiAvLyBTZXQgdG8gdW5kZWZpbmVkXG5cdFx0XHR0aGlzLl9zZXRSYXcoYXJndW1lbnRzWzBdLCB1bmRlZmluZWQpO1xuXHRcdFx0YnJlYWs7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBjYWxsIHN0eWxlIGZvciAuc2V0KCk6JyArIGNhbGxlZEFzKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiogU2V0IGEgY29udGV4dCBpdGVtcyB2YWx1ZVxuKiBOb3QgdG8gYmUgY29uZnVzZWQgd2l0aCBgc2V0KClgIHdoaWNoIGlzIHRoZSBjaGFpbmFibGUgZXh0ZXJuYWwgdmlzaWJsZSB2ZXJzaW9uIG9mIHRoaXNcbiogVW5saWtlIGBzZXQoKWAgdGhpcyBmdW5jdGlvbiBzZXRzIGFuIGl0ZW0gb2YgX2NvbnRleHQgaW1tZWRpYXRlbHlcbiogQGFjY2VzcyBwcml2YXRlXG4qIEBzZWUgX3NldFJhdygpXG4qL1xuZnVuY3Rpb24gX3NldCgpIHtcblx0dmFyIGNhbGxlZEFzID0gZ2V0T3ZlcmxvYWQoYXJndW1lbnRzKTtcblx0c3dpdGNoKGNhbGxlZEFzKSB7XG5cdFx0Y2FzZSAnJzpcblx0XHRcdC8vIFBhc3Ncblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ3N0cmluZyxzdHJpbmcnOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBTdHJpbmcgPHZhbHVlPilcblx0XHRjYXNlICdzdHJpbmcsbnVtYmVyJzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgTnVtYmVyIDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLGJvb2xlYW4nOiAvLyBGb3JtOiBzZXQoU3RyaW5nIDxrZXk+LCBCb29sZWFuIDx2YWx1ZT4pXG5cdFx0Y2FzZSAnc3RyaW5nLGFycmF5JzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgQXJyYXkgPHZhbHVlPilcblx0XHRjYXNlICdzdHJpbmcsY29sbGVjdGlvbic6IC8vIEZvcm06IHNldChTdHJpbmcgPGtleT4sIENvbGxlY3Rpb24gPHZhbHVlPilcblx0XHRjYXNlICdzdHJpbmcsb2JqZWN0JzogLy8gRm9ybTogc2V0KFN0cmluZyA8a2V5PiwgT2JqZWN0IDx2YWx1ZT4pXG5cdFx0XHR0aGlzLl9zZXRSYXcoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnb2JqZWN0JzogLy8gRm9ybTogc2V0KE9iamVjdClcblx0XHRcdGZvciAodmFyIGtleSBpbiBhcmd1bWVudHNbMF0pXG5cdFx0XHRcdHRoaXMuX3NldFJhdyhrZXksIGFyZ3VtZW50c1swXVtrZXldKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgICdzdHJpbmcsZnVuY3Rpb24nOiAvLyBGb3JtOiBzZXQoU3RyaW5nLCBmdW5jKSAtPiBzZXJpZXMoU3RyaW5nIDxpZD4sIGZ1bmMpXG5cdFx0XHR0aGlzLl9zZXRSYXcoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0uY2FsbCh0aGlzKSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlICdmdW5jdGlvbic6IC8vIEZvcm06IF9zZXQoZnVuYykgLy8gRXhwZWN0IGZ1bmMgdG8gcmV0dXJuIHNvbWV0aGluZyB3aGljaCBpcyB0aGVuIHByb2Nlc3NlZCB0byBfc2V0XG5cdFx0XHR0aGlzLl9zZXQoYXJndW1lbnRzWzFdLmNhbGwodGhpcykpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAnc3RyaW5nJzogLy8gU2V0IHRvIHVuZGVmaW5lZFxuXHRcdFx0dGhpcy5fc2V0UmF3KGFyZ3VtZW50c1swXSwgdW5kZWZpbmVkKTtcblx0XHRcdGJyZWFrO1xuXHRcdGRlZmF1bHQ6XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gY2FsbCBzdHlsZSBmb3IgLnNldCgpOicgKyBjYWxsZWRBcyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiogQWN0dWFsIHJhdyB2YWx1ZSBzZXR0ZXJcbiogVGhpcyBmdW5jdGlvbiBpcyB0aGUgaW50ZXJuYWwgdmVyc2lvbiBvZiBfc2V0IHdoaWNoIHRha2VzIGV4YWN0bHkgdHdvIHZhbHVlcywgdGhlIGtleSBhbmQgdGhlIHZhbHVlIHRvIHNldFxuKiBPdmVycmlkZSB0aGlzIGZ1bmN0aW9uIGlmIHNvbWUgYWx0ZXJuYXRpdmUgX2NvbnRleHQgcGxhdGZvcm0gaXMgcmVxdWlyZWRcbiogQHBhcmFtIHN0cmluZyBrZXkgVGhlIGtleSB3aXRoaW4gX2NvbnRleHQgdG8gc2V0IHRoZSB2YWx1ZSBvZlxuKiBAcGFyYW0gbWl4ZWQgdmFsdWUgVGhlIHZhbHVlIHdpdGhpbiBfY29udGV4dFtrZXldIHRvIHNldCB0aGUgdmFsdWUgb2ZcbiogQGFjY2VzcyBwcml2YXRlXG4qL1xuZnVuY3Rpb24gX3NldFJhdyhrZXksIHZhbHVlKSB7XG5cdHRoaXMuX2NvbnRleHRba2V5XSA9IHZhbHVlO1xuXHRyZXR1cm4gdGhpcztcbn1cblxuXG4vKipcbiogSW50ZXJuYWwgZnVuY3Rpb24gZXhlY3V0ZWQgYXQgdGhlIGVuZCBvZiB0aGUgY2hhaW5cbiogVGhpcyBjYW4gb2NjdXIgZWl0aGVyIGluIHNlcXVlbmNlIChpLmUuIG5vIGVycm9ycykgb3IgYSBqdW1wIHRvIHRoaXMgcG9zaXRpb24gKGkuZS4gYW4gZXJyb3IgaGFwcGVuZWQgc29tZXdoZXJlKVxuKiBAYWNjZXNzIHByaXZhdGVcbiovXG5mdW5jdGlvbiBfZmluYWxpemUoZXJyKSB7XG5cdC8vIFNhbml0eSBjaGVja3Mge3t7XG5cdGlmICh0aGlzLl9zdHJ1Y3QubGVuZ3RoID09IDApIHJldHVybjsgLy8gRmluYWxpemUgY2FsbGVkIG9uIGRlYWQgb2JqZWN0IC0gcHJvYmFibHkgYSBkZWZlcigpIGZpcmVkIHdpdGhvdXQgYW4gYXdhaXQoKVxuXHRpZiAodGhpcy5fc3RydWN0W3RoaXMuX3N0cnVjdC5sZW5ndGggLSAxXS50eXBlICE9ICdlbmQnKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdXaGlsZSB0cnlpbmcgdG8gZmluZCBhbiBlbmQgcG9pbnQgaW4gdGhlIGFzeW5jLWNoYWluYWJsZSBzdHJ1Y3R1cmUgdGhlIGxhc3QgaXRlbSBpbiB0aGUgdGhpcy5fc3RydWN0IGRvZXMgbm90IGhhdmUgdHlwZT09ZW5kIScpO1xuXHRcdHJldHVybjtcblx0fVxuXHQvLyB9fX1cblx0dGhpcy5fc3RydWN0W3RoaXMuX3N0cnVjdC5sZW5ndGgtMV0ucGF5bG9hZC5jYWxsKHRoaXMuX29wdGlvbnMuY29udGV4dCwgZXJyKTtcblx0aWYgKHRoaXMuX29wdGlvbnMuYXV0b1Jlc2V0KVxuXHRcdHRoaXMucmVzZXQoKTtcbn07XG5cblxuLyoqXG4qIEludGVybmFsIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgdGhlIG5leHQgcGVuZGluZyBxdWV1ZSBpdGVtXG4qIFRoaXMgaXMgdXN1YWxseSBjYWxsZWQgYWZ0ZXIgdGhlIGNvbXBsZXRpb24gb2YgZXZlcnkgYXN5bmMuc2VyaWVzKCkgLyBhc3luYy5wYXJhbGxlbCgpIC8gYXN5bmNDaGFpbmFibGUuX3J1biBjYWxsXG4qIEBhY2Nlc3MgcHJpdmF0ZVxuKi9cbmZ1bmN0aW9uIF9leGVjdXRlKGVycikge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdGlmIChlcnIpIHJldHVybiB0aGlzLl9maW5hbGl6ZShlcnIpOyAvLyBBbiBlcnJvciBoYXMgYmVlbiByYWlzZWQgLSBzdG9wIGV4ZWMgYW5kIGNhbGwgZmluYWxpemUgbm93XG5cdGRvIHtcblx0XHR2YXIgcmVkbyA9IGZhbHNlO1xuXHRcdGlmIChzZWxmLl9zdHJ1Y3RQb2ludGVyID49IHNlbGYuX3N0cnVjdC5sZW5ndGgpIHJldHVybiB0aGlzLl9maW5hbGl6ZShlcnIpOyAvLyBOb3RoaW5nIG1vcmUgdG8gZXhlY3V0ZSBpbiBzdHJ1Y3Rcblx0XHRzZWxmLl9kZWZlckNoZWNrKCk7IC8vIEtpY2sgb2ZmIGFueSBwZW5kaW5nIGRlZmVycmVkIGl0ZW1zXG5cdFx0dmFyIGN1cnJlbnRFeGVjID0gc2VsZi5fc3RydWN0W3NlbGYuX3N0cnVjdFBvaW50ZXJdO1xuXHRcdC8vIFNhbml0eSBjaGVja3Mge3t7XG5cdFx0aWYgKCFjdXJyZW50RXhlYy50eXBlKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vIHR5cGUgaXMgc3BlY2lmaWVkIGZvciBhc3luYy1jaGFpbmFibGUgc3RydWN0dXJlIGF0IG9mZnNldCAnICsgc2VsZi5fc3RydWN0UG9pbnRlcik7XG5cdFx0XHRyZXR1cm4gc2VsZjtcblx0XHR9XG5cdFx0Ly8gfX19XG5cdFx0c2VsZi5fc3RydWN0UG9pbnRlcisrO1xuXG5cdFx0Ly8gU2tpcCBzdGVwIHdoZW4gZnVuY3Rpb24gc3VwcG9ydHMgc2tpcHBpbmcgaWYgdGhlIGFyZ3VtZW50IGlzIGVtcHR5IHt7e1xuXHRcdGlmIChcblx0XHRcdFtcblx0XHRcdFx0J3BhcmFsbGVsQXJyYXknLCAncGFyYWxsZWxPYmplY3QnLCAncGFyYWxsZWxDb2xsZWN0aW9uJyxcblx0XHRcdFx0J2ZvckVhY2hBcnJheScsICdmb3JFYWNoT2JqZWN0Jyxcblx0XHRcdFx0J3Nlcmllc0FycmF5JywgJ3Nlcmllc09iamVjdCcsICdzZXJpZXNDb2xsZWN0aW9uJyxcblx0XHRcdFx0J2RlZmVyQXJyYXknLCAnZGVmZXJPYmplY3QnLCAnZGVmZXJDb2xsZWN0aW9uJyxcblx0XHRcdFx0J3NldCdcblx0XHRcdF0uaW5kZXhPZihjdXJyZW50RXhlYy50eXBlKSA+IC0xICYmXG5cdFx0XHQoXG5cdFx0XHRcdCFjdXJyZW50RXhlYy5wYXlsb2FkIHx8IC8vIE5vdCBzZXQgT1Jcblx0XHRcdFx0KGlzQXJyYXkoY3VycmVudEV4ZWMucGF5bG9hZCkgJiYgIWN1cnJlbnRFeGVjLnBheWxvYWQubGVuZ3RoKSB8fCAvLyBBbiBlbXB0eSBhcnJheVxuXHRcdFx0XHQoaXNPYmplY3QoY3VycmVudEV4ZWMucGF5bG9hZCkgJiYgIU9iamVjdC5rZXlzKGN1cnJlbnRFeGVjLnBheWxvYWQpLmxlbmd0aCkgLy8gQW4gZW1wdHkgb2JqZWN0XG5cdFx0XHQpXG5cdFx0KSB7XG5cdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0cmVkbyA9IHRydWU7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0Ly8gfX19XG5cblx0XHRzd2l0Y2ggKGN1cnJlbnRFeGVjLnR5cGUpIHtcblx0XHRcdGNhc2UgJ3BhcmFsbGVsQXJyYXknOlxuXHRcdFx0XHRzZWxmLl9ydW4oY3VycmVudEV4ZWMucGF5bG9hZC5tYXAoZnVuY3Rpb24odGFzaykge1xuXHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbihuZXh0KSB7XG5cdFx0XHRcdFx0XHR0YXNrLmNhbGwoc2VsZi5fb3B0aW9ucy5jb250ZXh0LCBuZXh0KTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KSwgc2VsZi5fb3B0aW9ucy5saW1pdCwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZWxmLl9leGVjdXRlKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3BhcmFsbGVsT2JqZWN0Jzpcblx0XHRcdFx0dmFyIHRhc2tzID0gW107XG5cdFx0XHRcdE9iamVjdC5rZXlzKGN1cnJlbnRFeGVjLnBheWxvYWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0dGFza3MucHVzaChmdW5jdGlvbihuZXh0KSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy5wYXlsb2FkW2tleV0uY2FsbChzZWxmLl9vcHRpb25zLmNvbnRleHQsIGZ1bmN0aW9uKGVyciwgdmFsdWUpIHtcblx0XHRcdFx0XHRcdFx0c2VsZi5fc2V0KGtleSwgdmFsdWUpOyAvLyBBbGxvY2F0ZSByZXR1cm5lZCB2YWx1ZSB0byBjb250ZXh0XG5cdFx0XHRcdFx0XHRcdG5leHQoZXJyKTtcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLl9ydW4odGFza3MsIHNlbGYuX29wdGlvbnMubGltaXQsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdwYXJhbGxlbENvbGxlY3Rpb24nOlxuXHRcdFx0XHR2YXIgdGFza3MgPSBbXTtcblx0XHRcdFx0Y3VycmVudEV4ZWMucGF5bG9hZC5mb3JFYWNoKGZ1bmN0aW9uKHRhc2spIHtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyh0YXNrKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdFx0dGFza3MucHVzaChmdW5jdGlvbihuZXh0LCBlcnIpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiB0YXNrW2tleV0gIT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdDb2xsZWN0aW9uIGl0ZW0gZm9yIHBhcmFsbGVsIGV4ZWMgaXMgbm90IGEgZnVuY3Rpb24nLCBjdXJyZW50RXhlYy5wYXlsb2FkKTtcblx0XHRcdFx0XHRcdFx0dGFza1trZXldLmNhbGwoc2VsZi5fb3B0aW9ucy5jb250ZXh0LCBmdW5jdGlvbihlcnIsIHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdFx0c2VsZi5fc2V0KGtleSwgdmFsdWUpOyAvLyBBbGxvY2F0ZSByZXR1cm5lZCB2YWx1ZSB0byBjb250ZXh0XG5cdFx0XHRcdFx0XHRcdFx0bmV4dChlcnIpO1xuXHRcdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLl9ydW4odGFza3MsIHNlbGYuX29wdGlvbnMubGltaXQsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdmb3JFYWNoQXJyYXknOlxuXHRcdFx0XHRzZWxmLl9ydW4oY3VycmVudEV4ZWMucGF5bG9hZC5tYXAoZnVuY3Rpb24oaXRlbSwgaXRlcikge1xuXHRcdFx0XHRcdHNlbGYuX2NvbnRleHQuX2l0ZW0gPSBpdGVtO1xuXHRcdFx0XHRcdHNlbGYuX2NvbnRleHQuX2tleSA9IGl0ZXI7XG5cdFx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKG5leHQpIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNhbGxiYWNrLmNhbGwoc2VsZi5fb3B0aW9ucy5jb250ZXh0LCBuZXh0LCBpdGVtLCBpdGVyKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHR9KSwgc2VsZi5fb3B0aW9ucy5saW1pdCwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZWxmLl9leGVjdXRlKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2ZvckVhY2hPYmplY3QnOlxuXHRcdFx0XHR2YXIgdGFza3MgPSBbXTtcblx0XHRcdFx0T2JqZWN0LmtleXMoY3VycmVudEV4ZWMucGF5bG9hZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHR0YXNrcy5wdXNoKGZ1bmN0aW9uKG5leHQpIHtcblx0XHRcdFx0XHRcdHNlbGYuX2NvbnRleHQuX2l0ZW0gPSBjdXJyZW50RXhlYy5wYXlsb2FkW2tleV07XG5cdFx0XHRcdFx0XHRzZWxmLl9jb250ZXh0Ll9rZXkgPSBrZXk7XG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy5jYWxsYmFjay5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRzZWxmLl9zZXQoa2V5LCB2YWx1ZSk7IC8vIEFsbG9jYXRlIHJldHVybmVkIHZhbHVlIHRvIGNvbnRleHRcblx0XHRcdFx0XHRcdFx0bmV4dChlcnIpO1xuXHRcdFx0XHRcdFx0fSwgY3VycmVudEV4ZWMucGF5bG9hZFtrZXldLCBrZXkpO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5fcnVuKHRhc2tzLCBzZWxmLl9vcHRpb25zLmxpbWl0LCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNlbGYuX2V4ZWN1dGUoZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZm9yRWFjaExhdGVCb3VuZCc6XG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHQoIWN1cnJlbnRFeGVjLnBheWxvYWQgfHwgIWN1cnJlbnRFeGVjLnBheWxvYWQubGVuZ3RoKSB8fCAvLyBQYXlsb2FkIGlzIGJsYW5rXG5cdFx0XHRcdFx0KCFzZWxmLl9jb250ZXh0W2N1cnJlbnRFeGVjLnBheWxvYWRdKSAvLyBQYXlsb2FkIGRvZXNudCBleGlzdCB3aXRoaW4gY29udGV4dFxuXHRcdFx0XHQpIHsgLy8gR290byBuZXh0IGNoYWluXG5cdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRyZWRvID0gdHJ1ZTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlcGxhY2Ugb3duIGV4ZWMgYXJyYXkgd2l0aCBhY3R1YWwgdHlwZSBvZiBwYXlsb2FkIG5vdyB3ZSBrbm93IHdoYXQgaXQgaXMge3t7XG5cdFx0XHRcdHZhciBvdmVybG9hZFR5cGUgPSBnZXRPdmVybG9hZChbc2VsZi5fY29udGV4dFtjdXJyZW50RXhlYy5wYXlsb2FkXV0pO1xuXHRcdFx0XHRzd2l0Y2ggKG92ZXJsb2FkVHlwZSkge1xuXHRcdFx0XHRcdGNhc2UgJ2NvbGxlY3Rpb24nOlxuXHRcdFx0XHRcdGNhc2UgJ2FycmF5Jzpcblx0XHRcdFx0XHRcdGN1cnJlbnRFeGVjLnR5cGUgPSAnZm9yRWFjaEFycmF5Jztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ29iamVjdCc6XG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy50eXBlID0gJ2ZvckVhY2hPYmplY3QnO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignQ2Fubm90IHBlcmZvcm0gZm9yRWFjaCBvdmVyIHVua25vd24gb2JqZWN0IHR5cGU6ICcgKyBvdmVybG9hZFR5cGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN1cnJlbnRFeGVjLnBheWxvYWQgPSBzZWxmLl9jb250ZXh0W2N1cnJlbnRFeGVjLnBheWxvYWRdO1xuXHRcdFx0XHRzZWxmLl9zdHJ1Y3RQb2ludGVyLS07IC8vIEZvcmNlIHJlLWV2YWwgb2YgdGhpcyBjaGFpbiBpdGVtIG5vdyBpdHMgYmVlbiByZXBsYWNlIHdpdGggaXRzIHJlYWwgKGxhdGUtYm91bmQpIHR5cGVcblx0XHRcdFx0cmVkbyA9IHRydWU7XG5cdFx0XHRcdC8vIH19fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3Nlcmllc0FycmF5Jzpcblx0XHRcdFx0c2VsZi5fcnVuKGN1cnJlbnRFeGVjLnBheWxvYWQubWFwKGZ1bmN0aW9uKHRhc2spIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24obmV4dCkge1xuXHRcdFx0XHRcdFx0dGFzay5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgbmV4dCk7XG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0fSksIDEsIGZ1bmN0aW9uKGVycikge1xuXHRcdFx0XHRcdGN1cnJlbnRFeGVjLmNvbXBsZXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0c2VsZi5fZXhlY3V0ZShlcnIpO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzZXJpZXNPYmplY3QnOlxuXHRcdFx0XHR2YXIgdGFza3MgPSBbXTtcblx0XHRcdFx0T2JqZWN0LmtleXMoY3VycmVudEV4ZWMucGF5bG9hZCkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHR0YXNrcy5wdXNoKGZ1bmN0aW9uKG5leHQpIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRFeGVjLnBheWxvYWRba2V5XS5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRzZWxmLl9zZXQoa2V5LCB2YWx1ZSk7IC8vIEFsbG9jYXRlIHJldHVybmVkIHZhbHVlIHRvIGNvbnRleHRcblx0XHRcdFx0XHRcdFx0bmV4dChlcnIpO1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYuX3J1bih0YXNrcywgMSwgZnVuY3Rpb24oZXJyKSB7XG5cdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZWxmLl9leGVjdXRlKGVycik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ3Nlcmllc0NvbGxlY3Rpb24nOlxuXHRcdFx0XHR2YXIgdGFza3MgPSBbXTtcblx0XHRcdFx0Y3VycmVudEV4ZWMucGF5bG9hZC5mb3JFYWNoKGZ1bmN0aW9uKHRhc2spIHtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyh0YXNrKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdFx0dGFza3MucHVzaChmdW5jdGlvbihuZXh0LCBlcnIpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiB0YXNrW2tleV0gIT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdDb2xsZWN0aW9uIGl0ZW0gZm9yIHNlcmllcyBleGVjIGlzIG5vdCBhIGZ1bmN0aW9uJywgY3VycmVudEV4ZWMucGF5bG9hZCk7XG5cdFx0XHRcdFx0XHRcdHRhc2tba2V5XS5jYWxsKHNlbGYuX29wdGlvbnMuY29udGV4dCwgZnVuY3Rpb24oZXJyLCB2YWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuX3NldChrZXksIHZhbHVlKTsgLy8gQWxsb2NhdGUgcmV0dXJuZWQgdmFsdWUgdG8gY29udGV4dFxuXHRcdFx0XHRcdFx0XHRcdG5leHQoZXJyKTtcblx0XHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5fcnVuKHRhc2tzLCAxLCBmdW5jdGlvbihlcnIpIHtcblx0XHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNlbGYuX2V4ZWN1dGUoZXJyKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZGVmZXJBcnJheSc6XG5cdFx0XHRcdGN1cnJlbnRFeGVjLnBheWxvYWQuZm9yRWFjaChmdW5jdGlvbih0YXNrKSB7XG5cdFx0XHRcdFx0c2VsZi5fZGVmZXJBZGQobnVsbCwgdGFzaywgY3VycmVudEV4ZWMpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZWRvID0gdHJ1ZTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdkZWZlck9iamVjdCc6XG5cdFx0XHRcdE9iamVjdC5rZXlzKGN1cnJlbnRFeGVjLnBheWxvYWQpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0c2VsZi5fZGVmZXJBZGQoa2V5LCBjdXJyZW50RXhlYy5wYXlsb2FkW2tleV0sIGN1cnJlbnRFeGVjKTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmVkbyA9IHRydWU7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnZGVmZXJDb2xsZWN0aW9uJzpcblx0XHRcdFx0Y3VycmVudEV4ZWMucGF5bG9hZC5mb3JFYWNoKGZ1bmN0aW9uKHRhc2spIHtcblx0XHRcdFx0XHRPYmplY3Qua2V5cyh0YXNrKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdFx0c2VsZi5fZGVmZXJBZGQoa2V5LCB0YXNrW2tleV0sIGN1cnJlbnRFeGVjKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJlZG8gPSB0cnVlO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2F3YWl0JzogLy8gQXdhaXQgY2FuIG9wZXJhdGUgaW4gdHdvIG1vZGVzLCBlaXRoZXIgcGF5bG9hZD1bXSAoZXhhbWluZSBhbGwpIGVsc2UgKGV4YW1pbmUgc3BlY2lmaWMga2V5cylcblx0XHRcdFx0aWYgKCFjdXJyZW50RXhlYy5wYXlsb2FkLmxlbmd0aCkgeyAvLyBDaGVjayBhbGwgdGFza3MgYXJlIGNvbXBsZXRlXG5cdFx0XHRcdFx0aWYgKHNlbGYuX3N0cnVjdC5zbGljZSgwLCBzZWxmLl9zdHJ1Y3RQb2ludGVyIC0gMSkuZXZlcnkoZnVuY3Rpb24oc3RhZ2UpIHsgLy8gRXhhbWluZSBhbGwgaXRlbXMgVVAgVE8gc2VsZiBvbmUgYW5kIGNoZWNrIHRoZXkgYXJlIGNvbXBsZXRlXG5cdFx0XHRcdFx0XHRyZXR1cm4gc3RhZ2UuY29tcGxldGVkO1xuXHRcdFx0XHRcdH0pKSB7IC8vIEFsbCB0YXNrcyB1cCB0byBzZWxmIHBvaW50IGFyZSBtYXJrZWQgYXMgY29tcGxldGVkXG5cdFx0XHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0cmVkbyA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHNlbGYuX3N0cnVjdFBvaW50ZXItLTsgLy8gQXQgbGVhc3Qgb25lIHRhc2sgaXMgb3V0c3RhbmRpbmcgLSByZXdpbmQgdG8gc2VsZiBzdGFnZSBzbyB3ZSByZXBlYXQgb24gbmV4dCByZXNvbHV0aW9uXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgeyAvLyBDaGVjayBjZXJ0YWluIHRhc2tzIGFyZSBjb21wbGV0ZSBieSBrZXlcblx0XHRcdFx0XHRpZiAoY3VycmVudEV4ZWMucGF5bG9hZC5ldmVyeShmdW5jdGlvbihkZXApIHsgLy8gRXhhbWluZSBhbGwgbmFtZWQgZGVwZW5kZW5jaWVzXG5cdFx0XHRcdFx0XHRyZXR1cm4gISEgc2VsZi5fY29udGV4dFtkZXBdO1xuXHRcdFx0XHRcdH0pKSB7IC8vIEFsbCBhcmUgcHJlc2VudFxuXHRcdFx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHJlZG8gPSB0cnVlO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzZWxmLl9zdHJ1Y3RQb2ludGVyLS07IC8vIEF0IGxlYXN0IG9uZSBkZXBlbmRlbmN5IGlzIG91dHN0YW5kaW5nIC0gcmV3aW5kIHRvIHNlbGYgc3RhZ2Ugc28gd2UgcmVwZWF0IG9uIG5leHQgcmVzb2x1dGlvblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2xpbWl0JzogLy8gU2V0IHRoZSBvcHRpb25zLmxpbWl0IHZhcmlhYmxlXG5cdFx0XHRcdHNlbGYuX29wdGlvbnMubGltaXQgPSBjdXJyZW50RXhlYy5wYXlsb2FkO1xuXHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRyZWRvID0gdHJ1ZTsgLy8gTW92ZSBvbiB0byBuZXh0IGFjdGlvblxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2NvbnRleHQnOiAvLyBDaGFuZ2UgdGhlIHNlbGYuX29wdGlvbnMuY29udGV4dCBvYmplY3Rcblx0XHRcdFx0c2VsZi5fb3B0aW9ucy5jb250ZXh0ID0gY3VycmVudEV4ZWMucGF5bG9hZCA/IGN1cnJlbnRFeGVjLnBheWxvYWQgOiBzZWxmLl9jb250ZXh0OyAvLyBTZXQgY29udGV4dCAoaWYgbnVsbCB1c2UgaW50ZXJuYWwgY29udGV4dClcblx0XHRcdFx0Y3VycmVudEV4ZWMuY29tcGxldGVkID0gdHJ1ZTtcblx0XHRcdFx0cmVkbyA9IHRydWU7IC8vIE1vdmUgb24gdG8gbmV4dCBhY3Rpb25cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdzZXQnOiAvLyBTZXQgYSBoYXNoIG9mIHZhcmlhYmxlcyB3aXRoaW4gY29udGV4dFxuXHRcdFx0XHRPYmplY3Qua2V5cyhjdXJyZW50RXhlYy5wYXlsb2FkKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHNlbGYuX3NldChrZXksIGN1cnJlbnRFeGVjLnBheWxvYWRba2V5XSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRjdXJyZW50RXhlYy5jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0XHRyZWRvID0gdHJ1ZTsgLy8gTW92ZSBvbiB0byBuZXh0IGFjdGlvblxuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2VuZCc6IC8vIHNlbGYgc2hvdWxkIEFMV0FZUyBiZSB0aGUgbGFzdCBpdGVtIGluIHRoZSBzdHJ1Y3R1cmUgYW5kIGluZGljYXRlcyB0aGUgZmluYWwgZnVuY3Rpb24gY2FsbFxuXHRcdFx0XHR0aGlzLl9maW5hbGl6ZSgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGlmICh0aGlzLl9wbHVnaW5zW2N1cnJlbnRFeGVjLnR5cGVdKSB7IC8vIElzIHRoZXJlIGEgcGx1Z2luIHRoYXQgc2hvdWxkIG1hbmFnZSB0aGlzP1xuXHRcdFx0XHRcdHRoaXMuX3BsdWdpbnNbY3VycmVudEV4ZWMudHlwZV0uY2FsbCh0aGlzLCBjdXJyZW50RXhlYyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGFzeW5jLWNoYWluYWJsZSBleGVjIHR5cGU6ICcgKyBjdXJyZW50RXhlYy50eXBlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9IHdoaWxlIChyZWRvKTtcbn07XG5cblxuLyoqXG4qIEludGVybmFsIGZ1bmN0aW9uIHRvIHJ1biBhbiBhcnJheSBvZiBmdW5jdGlvbnMgKHVzdWFsbHkgaW4gcGFyYWxsZWwpXG4qIFNlcmllcyBleGVjdXRpb24gY2FuIGJlIG9idGFpbmVkIGJ5IHNldHRpbmcgbGltaXQgPSAxXG4qIEBwYXJhbSBhcnJheSB0YXNrcyBUaGUgYXJyYXkgb2YgdGFza3MgdG8gZXhlY3V0ZVxuKiBAcGFyYW0gaW50IGxpbWl0IFRoZSBsaW1pdGVyIG9mIHRhc2tzIChpZiBsaW1pdD09MSB0YXNrcyBhcmUgcnVuIGluIHNlcmllcywgaWYgbGltaXQ+MSB0YXNrcyBhcmUgcnVuIGluIGxpbWl0ZWQgcGFyYWxsZWwsIGVsc2UgdGFza3MgYXJlIHJ1biBpbiBwYXJhbGxlbClcbiogQHBhcmFtIGZ1bmN0aW9uIGNhbGxiYWNrKGVycikgVGhlIGNhbGxiYWNrIHRvIGZpcmUgb24gZmluaXNoXG4qL1xuZnVuY3Rpb24gX3J1bih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG5cdGlmIChsaW1pdCA9PSAxKSB7XG5cdFx0YXN5bmMuc2VyaWVzKHRhc2tzLCBjYWxsYmFjayk7XG5cdH0gZWxzZSBpZiAobGltaXQgPiAwKSB7XG5cdFx0YXN5bmMucGFyYWxsZWxMaW1pdCh0YXNrcywgbGltaXQsIGNhbGxiYWNrKTtcblx0fSBlbHNlIHtcblx0XHRhc3luYy5wYXJhbGxlbCh0YXNrcywgY2FsbGJhY2spO1xuXHR9XG59XG5cblxuLyoqXG4qIFJlc2V0IGFsbCBzdGF0ZSB2YXJpYWJsZXMgYW5kIHJldHVybiB0aGUgb2JqZWN0IGludG8gYSBwcmlzdGluZSBjb25kaXRpb25cbiogQHJldHVybiBvYmplY3QgVGhpcyBjaGFpbmFibGUgb2JqZWN0XG4qL1xuZnVuY3Rpb24gcmVzZXQoKSB7XG5cdHRoaXMuX3N0cnVjdCA9IFtdO1xuXHR0aGlzLl9zdHJ1Y3RQb2ludGVyID0gMDtcblxuXHR2YXIgcmVBdHRhY2hDb250ZXh0ID0gKHRoaXMuX29wdGlvbnMuY29udGV4dCA9PSB0aGlzLl9jb250ZXh0KTsgLy8gUmVhdHRhY2ggdGhlIGNvbnRleHQgcG9pbnRlciBhZnRlciByZXNldD9cblx0dGhpcy5fY29udGV4dCA9IHtcblx0XHRfc3RydWN0OiB0aGlzLl9zdHJ1Y3QsXG5cdFx0X3N0cnVjdFBvaW50ZXI6IHRoaXMuX3N0cnVjdFBvaW50ZXIsXG5cdFx0X29wdGlvbnM6IHRoaXMuX29wdGlvbnMsXG5cdFx0X2RlZmVycmVkUnVubmluZzogdGhpcy5fZGVmZXJyZWRSdW5uaW5nLFxuXHR9O1xuXG5cdGlmIChyZUF0dGFjaENvbnRleHQpIHRoaXMuX29wdGlvbnMuY29udGV4dCA9IHRoaXMuX2NvbnRleHQ7XG59O1xuXG4vKipcbiogUXVldWUgdXAgYW4gb3B0aW9uYWwgc2luZ2xlIGZ1bmN0aW9uIGZvciBleGVjdXRpb24gb24gY29tcGxldGlvblxuKiBUaGlzIGZ1bmN0aW9uIGFsc28gc3RhcnRzIHRoZSBxdWV1ZSBleGVjdXRpbmdcbiogQHJldHVybiBvYmplY3QgVGhpcyBjaGFpbmFibGUgb2JqZWN0XG4qL1xuZnVuY3Rpb24gZW5kKCkgeyBcblx0dmFyIGNhbGxlZEFzID0gZ2V0T3ZlcmxvYWQoYXJndW1lbnRzKTtcblx0c3dpdGNoIChjYWxsZWRBcykge1xuXHRcdGNhc2UgJyc6IC8vIE5vIGZ1bmN0aW9ucyBwYXNzZWQgLSBkbyBub3RoaW5nXG5cdFx0XHR0aGlzLl9zdHJ1Y3QucHVzaCh7IHR5cGU6ICdlbmQnLCBwYXlsb2FkOiBmdW5jdGlvbigpIHt9IH0pOyAvLyAuZW5kKCkgY2FsbGVkIHdpdGggbm8gYXJncyAtIG1ha2UgYSBub29wKClcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2Z1bmN0aW9uJzogLy8gRm9ybTogZW5kKGZ1bmMpIC0+IHJlZGlyZWN0IGFzIGlmIGNhbGxlZCB3aXRoIHNlcmllcyhmdW5jKVxuXHRcdFx0dGhpcy5fc3RydWN0LnB1c2goeyB0eXBlOiAnZW5kJywgcGF5bG9hZDogYXJndW1lbnRzWzBdIH0pO1xuXHRcdFx0YnJlYWs7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5rbm93biBjYWxsIHN0eWxlIGZvciAuZW5kKCk6ICcgKyBjYWxsZWRBcyk7XG5cdH1cblxuXHR0aGlzLl9leGVjdXRlKCk7XG5cdHJldHVybiB0aGlzO1xufTtcblxudmFyIG9iamVjdEluc3RhbmNlID0gZnVuY3Rpb24oKSB7XG5cdC8vIFZhcmlhYmxlcyB7e3tcblx0dGhpcy5fc3RydWN0ID0gW107XG5cdHRoaXMuX3N0cnVjdFBvaW50ZXIgPSAwO1xuXHR0aGlzLl9jb250ZXh0ID0ge307XG5cblx0dGhpcy5fb3B0aW9ucyA9IHtcblx0XHRhdXRvUmVzZXQ6IHRydWUsIC8vIFJ1biBhc3luY0NoYWluYWJsZS5yZXNldCgpIGFmdGVyIGZpbmFsaXplLiBEaXNhYmxlIHRoaXMgaWYgeW91IHdhbnQgdG8gc2VlIGEgcG9zdC1tb3J0ZW0gb24gd2hhdCBkaWQgcnVuXG5cdFx0bGltaXQ6IDEwLCAvLyBOdW1iZXIgb2YgZGVmZXIgZnVuY3Rpb25zIHRoYXQgYXJlIGFsbG93ZWQgdG8gZXhlY3V0ZSBhdCBvbmNlXG5cdFx0Y29udGV4dDogdGhpcy5fY29udGV4dCwgLy8gVGhlIGNvbnRleHQgaXRlbSBwYXNzZWQgdG8gdGhlIGZ1bmN0aW9ucyAoY2FuIGJlIGNoYW5nZWQgd2l0aCAuY29udGV4dCgpKVxuXHR9O1xuXHQvLyB9fX1cblxuXHQvLyBBc3luYy1DaGFpbmFibGUgZnVuY3Rpb25zIHt7e1xuXHQvLyBQcml2YXRlIHt7e1xuXHR0aGlzLl9leGVjdXRlID0gX2V4ZWN1dGU7XG5cdHRoaXMuX3J1biA9IF9ydW47XG5cdHRoaXMuX2RlZmVyQ2hlY2sgPSBfZGVmZXJDaGVjaztcblx0dGhpcy5fZGVmZXJBZGQgPSBkZWZlckFkZDtcblx0dGhpcy5fZGVmZXJyZWQgPSBbXTtcblx0dGhpcy5fZGVmZXJyZWRSdW5uaW5nID0gMDtcblx0dGhpcy5fZmluYWxpemUgPSBfZmluYWxpemU7XG5cdHRoaXMuX2dldE92ZXJsb2FkID0gZ2V0T3ZlcmxvYWQ7IC8vIFNvIHRoaXMgZnVuY3Rpb24gaXMgYWNjZXNzaWJsZSBieSBwbHVnaW5zXG5cdHRoaXMuX3BsdWdpbnMgPSBfcGx1Z2lucztcblx0Ly8gfX19XG5cblx0dGhpcy5hd2FpdCA9IGF3YWl0O1xuXHR0aGlzLmNvbnRleHQgPSBzZXRDb250ZXh0O1xuXHR0aGlzLmRlZmVyID0gZGVmZXI7XG5cdHRoaXMuZW5kID0gZW5kO1xuXHR0aGlzLmZvckVhY2ggPSBmb3JFYWNoO1xuXHR0aGlzLmxpbWl0ID0gc2V0TGltaXQ7XG5cdHRoaXMucGFyYWxsZWwgPSBwYXJhbGxlbDtcblx0dGhpcy5yZXNldCA9IHJlc2V0O1xuXHR0aGlzLnNlcmllcyA9IHNlcmllcztcblx0dGhpcy5zZXQgPSBzZXQ7XG5cdHRoaXMuX3NldCA9IF9zZXQ7XG5cdHRoaXMuX3NldFJhdyA9IF9zZXRSYXc7XG5cdHRoaXMudGhlbiA9IHNlcmllcztcblx0dGhpcy5uZXcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBvYmplY3RJbnN0YW5jZSB9O1xuXHR0aGlzLnVzZSA9IHVzZTtcblx0Ly8gfX19XG5cblx0Ly8gQXN5bmMgY29tcGF0IGZ1bmN0aW9uYWxpdHkgLSBzbyB0aGlzIG1vZHVsZSBiZWNvbWVzIGEgZHJvcC1pbiByZXBsYWNlbWVudCB7e3tcblx0Ly8gQ29sbGVjdGlvbnNcblx0dGhpcy5lYWNoID0gYXN5bmMuZWFjaDtcblx0dGhpcy5lYWNoU2VyaWVzID0gYXN5bmMuZWFjaFNlcmllcztcblx0dGhpcy5lYWNoTGltaXQgPSBhc3luYy5lYWNoTGltaXQ7XG5cdHRoaXMubWFwID0gYXN5bmMubWFwO1xuXHR0aGlzLm1hcFNlcmllcyA9IGFzeW5jLm1hcFNlcmllcztcblx0dGhpcy5tYXBMaW1pdCA9IGFzeW5jLm1hcExpbWl0O1xuXHR0aGlzLmZpbHRlciA9IGFzeW5jLmZpbHRlcjtcblx0dGhpcy5maWx0ZXJTZXJpZXMgPSBhc3luYy5maWx0ZXJTZXJpZXM7XG5cdHRoaXMucmVqZWN0ID0gYXN5bmMucmVqZWN0O1xuXHR0aGlzLnJlamVjdFNlcmllcyA9IGFzeW5jLnJlamVjdFNlcmllcztcblx0dGhpcy5yZWR1Y2UgPSBhc3luYy5yZWR1Y2U7XG5cdHRoaXMucmVkdWNlUmlnaHQgPSBhc3luYy5yZWR1Y2VSaWdodDtcblx0dGhpcy5kZXRlY3QgPSBhc3luYy5kZXRlY3Q7XG5cdHRoaXMuZGV0ZWN0U2VyaWVzID0gYXN5bmMuZGV0ZWN0U2VyaWVzO1xuXHR0aGlzLnNvcnRCeSA9IGFzeW5jLnNvcnRCeTtcblx0dGhpcy5zb21lID0gYXN5bmMuc29tZTtcblx0dGhpcy5ldmVyeSA9IGFzeW5jLmV2ZXJ5O1xuXHR0aGlzLmNvbmNhdCA9IGFzeW5jLmNvbmNhdDtcblx0dGhpcy5jb25jYXRTZXJpZXMgPSBhc3luYy5jb25jYXRTZXJpZXM7XG5cblx0Ly8gQ29udHJvbCBGbG93XG5cdC8vIFNlZSBtYWluIC5zZXJpZXMoKSBhbmQgLnBhcmFsbGVsKCkgY29kZSBmb3IgYXN5bmMgY29tcGF0aWJpbGl0eVxuXHR0aGlzLnBhcmFsbGVsTGltaXQgPSBhc3luYy5wYXJhbGxlbExpbWl0O1xuXHR0aGlzLndoaWxzdCA9IGFzeW5jLndoaWxzdDtcblx0dGhpcy5kb1doaWxzdCA9IGFzeW5jLmRvV2hpbHN0O1xuXHR0aGlzLnVudGlsID0gYXN5bmMudW50aWw7XG5cdHRoaXMuZG9VbnRpbCA9IGFzeW5jLmRvVW50aWw7XG5cdHRoaXMuZm9yZXZlciA9IGFzeW5jLmZvcmV2ZXI7XG5cdHRoaXMud2F0ZXJmYWxsID0gYXN5bmMud2F0ZXJmYWxsO1xuXHR0aGlzLmNvbXBvc2UgPSBhc3luYy5jb21wb3NlO1xuXHR0aGlzLnNlcSA9IGFzeW5jLnNlcTtcblx0dGhpcy5hcHBseUVhY2ggPSBhc3luYy5hcHBseUVhY2g7XG5cdHRoaXMuYXBwbHlFYWNoU2VyaWVzID0gYXN5bmMuYXBwbHlFYWNoU2VyaWVzO1xuXHR0aGlzLnF1ZXVlID0gYXN5bmMucXVldWU7XG5cdHRoaXMucHJpb3JpdHlRdWV1ZSA9IGFzeW5jLnByaW9yaXR5UXVldWU7XG5cdHRoaXMuY2FyZ28gPSBhc3luYy5jYXJnbztcblx0dGhpcy5hdXRvID0gYXN5bmMuYXV0bztcblx0dGhpcy5yZXRyeSA9IGFzeW5jLnJldHJ5O1xuXHR0aGlzLml0ZXJhdG9yID0gYXN5bmMuaXRlcmF0b3I7XG5cdHRoaXMuYXBwbHkgPSBhc3luYy5hcHBseTtcblx0dGhpcy5uZXh0VGljayA9IGFzeW5jLm5leHRUaWNrO1xuXHR0aGlzLnRpbWVzID0gYXN5bmMudGltZXM7XG5cdHRoaXMudGltZXNTZXJpZXMgPSBhc3luYy50aW1lc1Nlcmllcztcblx0dGhpcy5VdGlscyA9IGFzeW5jLlV0aWxzO1xuXG5cdC8vIFV0aWxzXG5cdHRoaXMubWVtb2l6ZSA9IGFzeW5jLm1lbW9pemU7XG5cdHRoaXMudW5tZW1vaXplID0gYXN5bmMudW5tZW1vaXplO1xuXHR0aGlzLmxvZyA9IGFzeW5jLmxvZztcblx0dGhpcy5kaXIgPSBhc3luYy5kaXI7XG5cdHRoaXMubm9Db25mbGljdCA9IGFzeW5jLm5vQ29uZmxpY3Q7XG5cdC8vIH19fVxuXG5cdHRoaXMucmVzZXQoKTtcblx0cmV0dXJuIHRoaXM7XG59XG5cbi8vIFJldHVybiB0aGUgb3V0cHV0IG9iamVjdFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhc3luY0NoYWluYWJsZSgpIHtcblx0cmV0dXJuIG5ldyBvYmplY3RJbnN0YW5jZTtcbn07XG4iLCIvKiFcbiAqIGFzeW5jXG4gKiBodHRwczovL2dpdGh1Yi5jb20vY2FvbGFuL2FzeW5jXG4gKlxuICogQ29weXJpZ2h0IDIwMTAtMjAxNCBDYW9sYW4gTWNNYWhvblxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKi9cbihmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgYXN5bmMgPSB7fTtcbiAgICBmdW5jdGlvbiBub29wKCkge31cbiAgICBmdW5jdGlvbiBpZGVudGl0eSh2KSB7XG4gICAgICAgIHJldHVybiB2O1xuICAgIH1cbiAgICBmdW5jdGlvbiB0b0Jvb2wodikge1xuICAgICAgICByZXR1cm4gISF2O1xuICAgIH1cbiAgICBmdW5jdGlvbiBub3RJZCh2KSB7XG4gICAgICAgIHJldHVybiAhdjtcbiAgICB9XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgKGBzZWxmYCkgaW4gdGhlIGJyb3dzZXIsIGBnbG9iYWxgXG4gICAgLy8gb24gdGhlIHNlcnZlciwgb3IgYHRoaXNgIGluIHNvbWUgdmlydHVhbCBtYWNoaW5lcy4gV2UgdXNlIGBzZWxmYFxuICAgIC8vIGluc3RlYWQgb2YgYHdpbmRvd2AgZm9yIGBXZWJXb3JrZXJgIHN1cHBvcnQuXG4gICAgdmFyIHJvb3QgPSB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmICYmIHNlbGYgfHxcbiAgICAgICAgICAgIHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbC5nbG9iYWwgPT09IGdsb2JhbCAmJiBnbG9iYWwgfHxcbiAgICAgICAgICAgIHRoaXM7XG5cbiAgICBpZiAocm9vdCAhPSBudWxsKSB7XG4gICAgICAgIHByZXZpb3VzX2FzeW5jID0gcm9vdC5hc3luYztcbiAgICB9XG5cbiAgICBhc3luYy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb290LmFzeW5jID0gcHJldmlvdXNfYXN5bmM7XG4gICAgICAgIHJldHVybiBhc3luYztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gb25seV9vbmNlKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChmbiA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgd2FzIGFscmVhZHkgY2FsbGVkLlwiKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBmbiA9IG51bGw7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX29uY2UoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGZuID09PSBudWxsKSByZXR1cm47XG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgZm4gPSBudWxsO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vLy8gY3Jvc3MtYnJvd3NlciBjb21wYXRpYmxpdHkgZnVuY3Rpb25zIC8vLy9cblxuICAgIHZhciBfdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4gICAgdmFyIF9pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBfdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH07XG5cbiAgICAvLyBQb3J0ZWQgZnJvbSB1bmRlcnNjb3JlLmpzIGlzT2JqZWN0XG4gICAgdmFyIF9pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgICAgIHJldHVybiB0eXBlID09PSAnZnVuY3Rpb24nIHx8IHR5cGUgPT09ICdvYmplY3QnICYmICEhb2JqO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfaXNBcnJheUxpa2UoYXJyKSB7XG4gICAgICAgIHJldHVybiBfaXNBcnJheShhcnIpIHx8IChcbiAgICAgICAgICAgIC8vIGhhcyBhIHBvc2l0aXZlIGludGVnZXIgbGVuZ3RoIHByb3BlcnR5XG4gICAgICAgICAgICB0eXBlb2YgYXJyLmxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJlxuICAgICAgICAgICAgYXJyLmxlbmd0aCA+PSAwICYmXG4gICAgICAgICAgICBhcnIubGVuZ3RoICUgMSA9PT0gMFxuICAgICAgICApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9hcnJheUVhY2goYXJyLCBpdGVyYXRvcikge1xuICAgICAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgICAgIGxlbmd0aCA9IGFyci5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltpbmRleF0sIGluZGV4LCBhcnIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX21hcChhcnIsIGl0ZXJhdG9yKSB7XG4gICAgICAgIHZhciBpbmRleCA9IC0xLFxuICAgICAgICAgICAgbGVuZ3RoID0gYXJyLmxlbmd0aCxcbiAgICAgICAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBpdGVyYXRvcihhcnJbaW5kZXhdLCBpbmRleCwgYXJyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIF9yYW5nZShjb3VudCkge1xuICAgICAgICByZXR1cm4gX21hcChBcnJheShjb3VudCksIGZ1bmN0aW9uICh2LCBpKSB7IHJldHVybiBpOyB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfcmVkdWNlKGFyciwgaXRlcmF0b3IsIG1lbW8pIHtcbiAgICAgICAgX2FycmF5RWFjaChhcnIsIGZ1bmN0aW9uICh4LCBpLCBhKSB7XG4gICAgICAgICAgICBtZW1vID0gaXRlcmF0b3IobWVtbywgeCwgaSwgYSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbWVtbztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBfZm9yRWFjaE9mKG9iamVjdCwgaXRlcmF0b3IpIHtcbiAgICAgICAgX2FycmF5RWFjaChfa2V5cyhvYmplY3QpLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBpdGVyYXRvcihvYmplY3Rba2V5XSwga2V5KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2luZGV4T2YoYXJyLCBpdGVtKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXJyW2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgdmFyIF9rZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2tleUl0ZXJhdG9yKGNvbGwpIHtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgdmFyIGxlbjtcbiAgICAgICAgdmFyIGtleXM7XG4gICAgICAgIGlmIChfaXNBcnJheUxpa2UoY29sbCkpIHtcbiAgICAgICAgICAgIGxlbiA9IGNvbGwubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIHJldHVybiBpIDwgbGVuID8gaSA6IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5cyA9IF9rZXlzKGNvbGwpO1xuICAgICAgICAgICAgbGVuID0ga2V5cy5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkgPCBsZW4gPyBrZXlzW2ldIDogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTaW1pbGFyIHRvIEVTNidzIHJlc3QgcGFyYW0gKGh0dHA6Ly9hcml5YS5vZmlsYWJzLmNvbS8yMDEzLzAzL2VzNi1hbmQtcmVzdC1wYXJhbWV0ZXIuaHRtbClcbiAgICAvLyBUaGlzIGFjY3VtdWxhdGVzIHRoZSBhcmd1bWVudHMgcGFzc2VkIGludG8gYW4gYXJyYXksIGFmdGVyIGEgZ2l2ZW4gaW5kZXguXG4gICAgLy8gRnJvbSB1bmRlcnNjb3JlLmpzIChodHRwczovL2dpdGh1Yi5jb20vamFzaGtlbmFzL3VuZGVyc2NvcmUvcHVsbC8yMTQwKS5cbiAgICBmdW5jdGlvbiBfcmVzdFBhcmFtKGZ1bmMsIHN0YXJ0SW5kZXgpIHtcbiAgICAgICAgc3RhcnRJbmRleCA9IHN0YXJ0SW5kZXggPT0gbnVsbCA/IGZ1bmMubGVuZ3RoIC0gMSA6ICtzdGFydEluZGV4O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoYXJndW1lbnRzLmxlbmd0aCAtIHN0YXJ0SW5kZXgsIDApO1xuICAgICAgICAgICAgdmFyIHJlc3QgPSBBcnJheShsZW5ndGgpO1xuICAgICAgICAgICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHJlc3RbaW5kZXhdID0gYXJndW1lbnRzW2luZGV4ICsgc3RhcnRJbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzd2l0Y2ggKHN0YXJ0SW5kZXgpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6IHJldHVybiBmdW5jLmNhbGwodGhpcywgcmVzdCk7XG4gICAgICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gZnVuYy5jYWxsKHRoaXMsIGFyZ3VtZW50c1swXSwgcmVzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDdXJyZW50bHkgdW51c2VkIGJ1dCBoYW5kbGUgY2FzZXMgb3V0c2lkZSBvZiB0aGUgc3dpdGNoIHN0YXRlbWVudDpcbiAgICAgICAgICAgIC8vIHZhciBhcmdzID0gQXJyYXkoc3RhcnRJbmRleCArIDEpO1xuICAgICAgICAgICAgLy8gZm9yIChpbmRleCA9IDA7IGluZGV4IDwgc3RhcnRJbmRleDsgaW5kZXgrKykge1xuICAgICAgICAgICAgLy8gICAgIGFyZ3NbaW5kZXhdID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vIGFyZ3Nbc3RhcnRJbmRleF0gPSByZXN0O1xuICAgICAgICAgICAgLy8gcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX3dpdGhvdXRJbmRleChpdGVyYXRvcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVyYXRvcih2YWx1ZSwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vLy8gZXhwb3J0ZWQgYXN5bmMgbW9kdWxlIGZ1bmN0aW9ucyAvLy8vXG5cbiAgICAvLy8vIG5leHRUaWNrIGltcGxlbWVudGF0aW9uIHdpdGggYnJvd3Nlci1jb21wYXRpYmxlIGZhbGxiYWNrIC8vLy9cblxuICAgIC8vIGNhcHR1cmUgdGhlIGdsb2JhbCByZWZlcmVuY2UgdG8gZ3VhcmQgYWdhaW5zdCBmYWtlVGltZXIgbW9ja3NcbiAgICB2YXIgX3NldEltbWVkaWF0ZSA9IHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicgJiYgc2V0SW1tZWRpYXRlO1xuXG4gICAgdmFyIF9kZWxheSA9IF9zZXRJbW1lZGlhdGUgPyBmdW5jdGlvbihmbikge1xuICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICBfc2V0SW1tZWRpYXRlKGZuKTtcbiAgICB9IDogZnVuY3Rpb24oZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHByb2Nlc3MubmV4dFRpY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGFzeW5jLm5leHRUaWNrID0gX2RlbGF5O1xuICAgIH1cbiAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBfc2V0SW1tZWRpYXRlID8gX2RlbGF5IDogYXN5bmMubmV4dFRpY2s7XG5cblxuICAgIGFzeW5jLmZvckVhY2ggPVxuICAgIGFzeW5jLmVhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmVhY2hPZihhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmZvckVhY2hTZXJpZXMgPVxuICAgIGFzeW5jLmVhY2hTZXJpZXMgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLmVhY2hPZlNlcmllcyhhcnIsIF93aXRob3V0SW5kZXgoaXRlcmF0b3IpLCBjYWxsYmFjayk7XG4gICAgfTtcblxuXG4gICAgYXN5bmMuZm9yRWFjaExpbWl0ID1cbiAgICBhc3luYy5lYWNoTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfZWFjaE9mTGltaXQobGltaXQpKGFyciwgX3dpdGhvdXRJbmRleChpdGVyYXRvciksIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZm9yRWFjaE9mID1cbiAgICBhc3luYy5lYWNoT2YgPSBmdW5jdGlvbiAob2JqZWN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgb2JqZWN0ID0gb2JqZWN0IHx8IFtdO1xuXG4gICAgICAgIHZhciBpdGVyID0gX2tleUl0ZXJhdG9yKG9iamVjdCk7XG4gICAgICAgIHZhciBrZXksIGNvbXBsZXRlZCA9IDA7XG5cbiAgICAgICAgd2hpbGUgKChrZXkgPSBpdGVyKCkpICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgaXRlcmF0b3Iob2JqZWN0W2tleV0sIGtleSwgb25seV9vbmNlKGRvbmUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb21wbGV0ZWQgPT09IDApIGNhbGxiYWNrKG51bGwpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGRvbmUoZXJyKSB7XG4gICAgICAgICAgICBjb21wbGV0ZWQtLTtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2hlY2sga2V5IGlzIG51bGwgaW4gY2FzZSBpdGVyYXRvciBpc24ndCBleGhhdXN0ZWRcbiAgICAgICAgICAgIC8vIGFuZCBkb25lIHJlc29sdmVkIHN5bmNocm9ub3VzbHkuXG4gICAgICAgICAgICBlbHNlIGlmIChrZXkgPT09IG51bGwgJiYgY29tcGxldGVkIDw9IDApIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5mb3JFYWNoT2ZTZXJpZXMgPVxuICAgIGFzeW5jLmVhY2hPZlNlcmllcyA9IGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IF9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICBvYmogPSBvYmogfHwgW107XG4gICAgICAgIHZhciBuZXh0S2V5ID0gX2tleUl0ZXJhdG9yKG9iaik7XG4gICAgICAgIHZhciBrZXkgPSBuZXh0S2V5KCk7XG4gICAgICAgIGZ1bmN0aW9uIGl0ZXJhdGUoKSB7XG4gICAgICAgICAgICB2YXIgc3luYyA9IHRydWU7XG4gICAgICAgICAgICBpZiAoa2V5ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaXRlcmF0b3Iob2JqW2tleV0sIGtleSwgb25seV9vbmNlKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBrZXkgPSBuZXh0S2V5KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzeW5jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGl0ZXJhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBzeW5jID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaXRlcmF0ZSgpO1xuICAgIH07XG5cblxuXG4gICAgYXN5bmMuZm9yRWFjaE9mTGltaXQgPVxuICAgIGFzeW5jLmVhY2hPZkxpbWl0ID0gZnVuY3Rpb24gKG9iaiwgbGltaXQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBfZWFjaE9mTGltaXQobGltaXQpKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX2VhY2hPZkxpbWl0KGxpbWl0KSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgICAgIG9iaiA9IG9iaiB8fCBbXTtcbiAgICAgICAgICAgIHZhciBuZXh0S2V5ID0gX2tleUl0ZXJhdG9yKG9iaik7XG4gICAgICAgICAgICBpZiAobGltaXQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcnVubmluZyA9IDA7XG4gICAgICAgICAgICB2YXIgZXJyb3JlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAoZnVuY3Rpb24gcmVwbGVuaXNoICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9uZSAmJiBydW5uaW5nIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChydW5uaW5nIDwgbGltaXQgJiYgIWVycm9yZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IG5leHRLZXkoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVubmluZyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcnVubmluZyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpdGVyYXRvcihvYmpba2V5XSwga2V5LCBvbmx5X29uY2UoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVubmluZyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBkb1BhcmFsbGVsKGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHJldHVybiBmbihhc3luYy5lYWNoT2YsIG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9QYXJhbGxlbExpbWl0KGZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oX2VhY2hPZkxpbWl0KGxpbWl0KSwgb2JqLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkb1Nlcmllcyhmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4oYXN5bmMuZWFjaE9mU2VyaWVzLCBvYmosIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gX2FzeW5jTWFwKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgYXJyID0gYXJyIHx8IFtdO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IF9pc0FycmF5TGlrZShhcnIpID8gW10gOiB7fTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHZhbHVlLCBpbmRleCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHZhbHVlLCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0c1tpbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMubWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcFNlcmllcyA9IGRvU2VyaWVzKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwTGltaXQgPSBkb1BhcmFsbGVsTGltaXQoX2FzeW5jTWFwKTtcblxuICAgIC8vIHJlZHVjZSBvbmx5IGhhcyBhIHNlcmllcyB2ZXJzaW9uLCBhcyBkb2luZyByZWR1Y2UgaW4gcGFyYWxsZWwgd29uJ3RcbiAgICAvLyB3b3JrIGluIG1hbnkgc2l0dWF0aW9ucy5cbiAgICBhc3luYy5pbmplY3QgPVxuICAgIGFzeW5jLmZvbGRsID1cbiAgICBhc3luYy5yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaE9mU2VyaWVzKGFyciwgZnVuY3Rpb24gKHgsIGksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB4LCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1lbW8pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZm9sZHIgPVxuICAgIGFzeW5jLnJlZHVjZVJpZ2h0ID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXZlcnNlZCA9IF9tYXAoYXJyLCBpZGVudGl0eSkucmV2ZXJzZSgpO1xuICAgICAgICBhc3luYy5yZWR1Y2UocmV2ZXJzZWQsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBpdGVyYXRvcjtcbiAgICAgICAgICAgIGl0ZXJhdG9yID0gbWVtbztcbiAgICAgICAgICAgIG1lbW8gPSBfaXNBcnJheShhcnIpID8gW10gOiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jLmVhY2hPZihhcnIsIGZ1bmN0aW9uKHYsIGssIGNiKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB2LCBrLCBjYik7XG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9maWx0ZXIoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgaW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7aW5kZXg6IGluZGV4LCB2YWx1ZTogeH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKF9tYXAocmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXggLSBiLmluZGV4O1xuICAgICAgICAgICAgfSksIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLnNlbGVjdCA9XG4gICAgYXN5bmMuZmlsdGVyID0gZG9QYXJhbGxlbChfZmlsdGVyKTtcblxuICAgIGFzeW5jLnNlbGVjdExpbWl0ID1cbiAgICBhc3luYy5maWx0ZXJMaW1pdCA9IGRvUGFyYWxsZWxMaW1pdChfZmlsdGVyKTtcblxuICAgIGFzeW5jLnNlbGVjdFNlcmllcyA9XG4gICAgYXN5bmMuZmlsdGVyU2VyaWVzID0gZG9TZXJpZXMoX2ZpbHRlcik7XG5cbiAgICBmdW5jdGlvbiBfcmVqZWN0KGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgX2ZpbHRlcihlYWNoZm4sIGFyciwgZnVuY3Rpb24odmFsdWUsIGNiKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih2YWx1ZSwgZnVuY3Rpb24odikge1xuICAgICAgICAgICAgICAgIGNiKCF2KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBjYWxsYmFjayk7XG4gICAgfVxuICAgIGFzeW5jLnJlamVjdCA9IGRvUGFyYWxsZWwoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0TGltaXQgPSBkb1BhcmFsbGVsTGltaXQoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0U2VyaWVzID0gZG9TZXJpZXMoX3JlamVjdCk7XG5cbiAgICBmdW5jdGlvbiBfY3JlYXRlVGVzdGVyKGVhY2hmbiwgY2hlY2ssIGdldFJlc3VsdCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNiKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBkb25lKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYikgY2IoZ2V0UmVzdWx0KGZhbHNlLCB2b2lkIDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIGl0ZXJhdGVlKHgsIF8sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYikgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNiICYmIGNoZWNrKHYpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYihnZXRSZXN1bHQodHJ1ZSwgeCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IgPSBpdGVyYXRvciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICAgICAgICBlYWNoZm4oYXJyLCBsaW1pdCwgaXRlcmF0ZWUsIGRvbmUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYiA9IGl0ZXJhdG9yO1xuICAgICAgICAgICAgICAgIGl0ZXJhdG9yID0gbGltaXQ7XG4gICAgICAgICAgICAgICAgZWFjaGZuKGFyciwgaXRlcmF0ZWUsIGRvbmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFzeW5jLmFueSA9XG4gICAgYXN5bmMuc29tZSA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mLCB0b0Jvb2wsIGlkZW50aXR5KTtcblxuICAgIGFzeW5jLnNvbWVMaW1pdCA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mTGltaXQsIHRvQm9vbCwgaWRlbnRpdHkpO1xuXG4gICAgYXN5bmMuYWxsID1cbiAgICBhc3luYy5ldmVyeSA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mLCBub3RJZCwgbm90SWQpO1xuXG4gICAgYXN5bmMuZXZlcnlMaW1pdCA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mTGltaXQsIG5vdElkLCBub3RJZCk7XG5cbiAgICBmdW5jdGlvbiBfZmluZEdldFJlc3VsdCh2LCB4KSB7XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgICBhc3luYy5kZXRlY3QgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZiwgaWRlbnRpdHksIF9maW5kR2V0UmVzdWx0KTtcbiAgICBhc3luYy5kZXRlY3RTZXJpZXMgPSBfY3JlYXRlVGVzdGVyKGFzeW5jLmVhY2hPZlNlcmllcywgaWRlbnRpdHksIF9maW5kR2V0UmVzdWx0KTtcbiAgICBhc3luYy5kZXRlY3RMaW1pdCA9IF9jcmVhdGVUZXN0ZXIoYXN5bmMuZWFjaE9mTGltaXQsIGlkZW50aXR5LCBfZmluZEdldFJlc3VsdCk7XG5cbiAgICBhc3luYy5zb3J0QnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMubWFwKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHt2YWx1ZTogeCwgY3JpdGVyaWE6IGNyaXRlcmlhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIF9tYXAocmVzdWx0cy5zb3J0KGNvbXBhcmF0b3IpLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY29tcGFyYXRvcihsZWZ0LCByaWdodCkge1xuICAgICAgICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhLCBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPiBiID8gMSA6IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuYXV0byA9IGZ1bmN0aW9uICh0YXNrcywgY29uY3VycmVuY3ksIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzFdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBjb25jdXJyZW5jeSBpcyBvcHRpb25hbCwgc2hpZnQgdGhlIGFyZ3MuXG4gICAgICAgICAgICBjYWxsYmFjayA9IGNvbmN1cnJlbmN5O1xuICAgICAgICAgICAgY29uY3VycmVuY3kgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrID0gX29uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG4gICAgICAgIHZhciBrZXlzID0gX2tleXModGFza3MpO1xuICAgICAgICB2YXIgcmVtYWluaW5nVGFza3MgPSBrZXlzLmxlbmd0aDtcbiAgICAgICAgaWYgKCFyZW1haW5pbmdUYXNrcykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gcmVtYWluaW5nVGFza3M7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgICB2YXIgcnVubmluZ1Rhc2tzID0gMDtcblxuICAgICAgICB2YXIgaGFzRXJyb3IgPSBmYWxzZTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIGZ1bmN0aW9uIGFkZExpc3RlbmVyKGZuKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMudW5zaGlmdChmbik7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZm4pIHtcbiAgICAgICAgICAgIHZhciBpZHggPSBfaW5kZXhPZihsaXN0ZW5lcnMsIGZuKTtcbiAgICAgICAgICAgIGlmIChpZHggPj0gMCkgbGlzdGVuZXJzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHRhc2tDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgIHJlbWFpbmluZ1Rhc2tzLS07XG4gICAgICAgICAgICBfYXJyYXlFYWNoKGxpc3RlbmVycy5zbGljZSgwKSwgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgYWRkTGlzdGVuZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCFyZW1haW5pbmdUYXNrcykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBfYXJyYXlFYWNoKGtleXMsIGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICBpZiAoaGFzRXJyb3IpIHJldHVybjtcbiAgICAgICAgICAgIHZhciB0YXNrID0gX2lzQXJyYXkodGFza3Nba10pID8gdGFza3Nba106IFt0YXNrc1trXV07XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gX3Jlc3RQYXJhbShmdW5jdGlvbihlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBydW5uaW5nVGFza3MtLTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2ZvckVhY2hPZihyZXN1bHRzLCBmdW5jdGlvbih2YWwsIHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gdmFsO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc2FmZVJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBoYXNFcnJvciA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHRhc2tDb21wbGV0ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIHRhc2subGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAvLyBwcmV2ZW50IGRlYWQtbG9ja3NcbiAgICAgICAgICAgIHZhciBsZW4gPSByZXF1aXJlcy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgZGVwO1xuICAgICAgICAgICAgd2hpbGUgKGxlbi0tKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZGVwID0gdGFza3NbcmVxdWlyZXNbbGVuXV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSGFzIG5vbmV4aXN0ZW50IGRlcGVuZGVuY3kgaW4gJyArIHJlcXVpcmVzLmpvaW4oJywgJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoX2lzQXJyYXkoZGVwKSAmJiBfaW5kZXhPZihkZXAsIGspID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdIYXMgY3ljbGljIGRlcGVuZGVuY2llcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlYWR5KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBydW5uaW5nVGFza3MgPCBjb25jdXJyZW5jeSAmJiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVhZHkoKSkge1xuICAgICAgICAgICAgICAgIHJ1bm5pbmdUYXNrcysrO1xuICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZ1Rhc2tzKys7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgdGFza1t0YXNrLmxlbmd0aCAtIDFdKHRhc2tDYWxsYmFjaywgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG5cblxuICAgIGFzeW5jLnJldHJ5ID0gZnVuY3Rpb24odGltZXMsIHRhc2ssIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBERUZBVUxUX1RJTUVTID0gNTtcbiAgICAgICAgdmFyIERFRkFVTFRfSU5URVJWQUwgPSAwO1xuXG4gICAgICAgIHZhciBhdHRlbXB0cyA9IFtdO1xuXG4gICAgICAgIHZhciBvcHRzID0ge1xuICAgICAgICAgICAgdGltZXM6IERFRkFVTFRfVElNRVMsXG4gICAgICAgICAgICBpbnRlcnZhbDogREVGQVVMVF9JTlRFUlZBTFxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIHBhcnNlVGltZXMoYWNjLCB0KXtcbiAgICAgICAgICAgIGlmKHR5cGVvZiB0ID09PSAnbnVtYmVyJyl7XG4gICAgICAgICAgICAgICAgYWNjLnRpbWVzID0gcGFyc2VJbnQodCwgMTApIHx8IERFRkFVTFRfVElNRVM7XG4gICAgICAgICAgICB9IGVsc2UgaWYodHlwZW9mIHQgPT09ICdvYmplY3QnKXtcbiAgICAgICAgICAgICAgICBhY2MudGltZXMgPSBwYXJzZUludCh0LnRpbWVzLCAxMCkgfHwgREVGQVVMVF9USU1FUztcbiAgICAgICAgICAgICAgICBhY2MuaW50ZXJ2YWwgPSBwYXJzZUludCh0LmludGVydmFsLCAxMCkgfHwgREVGQVVMVF9JTlRFUlZBTDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbnN1cHBvcnRlZCBhcmd1bWVudCB0eXBlIGZvciBcXCd0aW1lc1xcJzogJyArIHR5cGVvZiB0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAobGVuZ3RoIDwgMSB8fCBsZW5ndGggPiAzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgYXJndW1lbnRzIC0gbXVzdCBiZSBlaXRoZXIgKHRhc2spLCAodGFzaywgY2FsbGJhY2spLCAodGltZXMsIHRhc2spIG9yICh0aW1lcywgdGFzaywgY2FsbGJhY2spJyk7XG4gICAgICAgIH0gZWxzZSBpZiAobGVuZ3RoIDw9IDIgJiYgdHlwZW9mIHRpbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHRhc2s7XG4gICAgICAgICAgICB0YXNrID0gdGltZXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB0aW1lcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcGFyc2VUaW1lcyhvcHRzLCB0aW1lcyk7XG4gICAgICAgIH1cbiAgICAgICAgb3B0cy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICBvcHRzLnRhc2sgPSB0YXNrO1xuXG4gICAgICAgIGZ1bmN0aW9uIHdyYXBwZWRUYXNrKHdyYXBwZWRDYWxsYmFjaywgd3JhcHBlZFJlc3VsdHMpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJldHJ5QXR0ZW1wdCh0YXNrLCBmaW5hbEF0dGVtcHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oc2VyaWVzQ2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFzayhmdW5jdGlvbihlcnIsIHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJpZXNDYWxsYmFjayghZXJyIHx8IGZpbmFsQXR0ZW1wdCwge2VycjogZXJyLCByZXN1bHQ6IHJlc3VsdH0pO1xuICAgICAgICAgICAgICAgICAgICB9LCB3cmFwcGVkUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gcmV0cnlJbnRlcnZhbChpbnRlcnZhbCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHNlcmllc0NhbGxiYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWVzQ2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGludGVydmFsKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAob3B0cy50aW1lcykge1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpbmFsQXR0ZW1wdCA9ICEob3B0cy50aW1lcy09MSk7XG4gICAgICAgICAgICAgICAgYXR0ZW1wdHMucHVzaChyZXRyeUF0dGVtcHQob3B0cy50YXNrLCBmaW5hbEF0dGVtcHQpKTtcbiAgICAgICAgICAgICAgICBpZighZmluYWxBdHRlbXB0ICYmIG9wdHMuaW50ZXJ2YWwgPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgYXR0ZW1wdHMucHVzaChyZXRyeUludGVydmFsKG9wdHMuaW50ZXJ2YWwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzeW5jLnNlcmllcyhhdHRlbXB0cywgZnVuY3Rpb24oZG9uZSwgZGF0YSl7XG4gICAgICAgICAgICAgICAgZGF0YSA9IGRhdGFbZGF0YS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAod3JhcHBlZENhbGxiYWNrIHx8IG9wdHMuY2FsbGJhY2spKGRhdGEuZXJyLCBkYXRhLnJlc3VsdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIGEgY2FsbGJhY2sgaXMgcGFzc2VkLCBydW4gdGhpcyBhcyBhIGNvbnRyb2xsIGZsb3dcbiAgICAgICAgcmV0dXJuIG9wdHMuY2FsbGJhY2sgPyB3cmFwcGVkVGFzaygpIDogd3JhcHBlZFRhc2s7XG4gICAgfTtcblxuICAgIGFzeW5jLndhdGVyZmFsbCA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBfb25jZShjYWxsYmFjayB8fCBub29wKTtcbiAgICAgICAgaWYgKCFfaXNBcnJheSh0YXNrcykpIHtcbiAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IHRvIHdhdGVyZmFsbCBtdXN0IGJlIGFuIGFycmF5IG9mIGZ1bmN0aW9ucycpO1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHdyYXBJdGVyYXRvcihpdGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIF9yZXN0UGFyYW0oZnVuY3Rpb24gKGVyciwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgW2Vycl0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHdyYXBJdGVyYXRvcihuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUFzeW5jKGl0ZXJhdG9yKS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB3cmFwSXRlcmF0b3IoYXN5bmMuaXRlcmF0b3IodGFza3MpKSgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBfcGFyYWxsZWwoZWFjaGZuLCB0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBub29wO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IF9pc0FycmF5TGlrZSh0YXNrcykgPyBbXSA6IHt9O1xuXG4gICAgICAgIGVhY2hmbih0YXNrcywgZnVuY3Rpb24gKHRhc2ssIGtleSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRhc2soX3Jlc3RQYXJhbShmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHNba2V5XSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMucGFyYWxsZWwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChhc3luYy5lYWNoT2YsIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsTGltaXQgPSBmdW5jdGlvbih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbChfZWFjaE9mTGltaXQobGltaXQpLCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5zZXJpZXMgPSBmdW5jdGlvbih0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgX3BhcmFsbGVsKGFzeW5jLmVhY2hPZlNlcmllcywgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuaXRlcmF0b3IgPSBmdW5jdGlvbiAodGFza3MpIHtcbiAgICAgICAgZnVuY3Rpb24gbWFrZUNhbGxiYWNrKGluZGV4KSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBmbigpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzW2luZGV4XS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZm4ubmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4ubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGluZGV4IDwgdGFza3MubGVuZ3RoIC0gMSkgPyBtYWtlQ2FsbGJhY2soaW5kZXggKyAxKTogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1ha2VDYWxsYmFjaygwKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXBwbHkgPSBfcmVzdFBhcmFtKGZ1bmN0aW9uIChmbiwgYXJncykge1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbiAoY2FsbEFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShcbiAgICAgICAgICAgICAgICBudWxsLCBhcmdzLmNvbmNhdChjYWxsQXJncylcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gX2NvbmNhdChlYWNoZm4sIGFyciwgZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGluZGV4LCBjYikge1xuICAgICAgICAgICAgZm4oeCwgZnVuY3Rpb24gKGVyciwgeSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5jb25jYXQoeSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhc3luYy5jb25jYXQgPSBkb1BhcmFsbGVsKF9jb25jYXQpO1xuICAgIGFzeW5jLmNvbmNhdFNlcmllcyA9IGRvU2VyaWVzKF9jb25jYXQpO1xuXG4gICAgYXN5bmMud2hpbHN0ID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG4gICAgICAgIGlmICh0ZXN0KCkpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gX3Jlc3RQYXJhbShmdW5jdGlvbihlcnIsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yKG5leHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIFtudWxsXS5jb25jYXQoYXJncykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaXRlcmF0b3IobmV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1doaWxzdCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNhbGxzID0gMDtcbiAgICAgICAgcmV0dXJuIGFzeW5jLndoaWxzdChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiArK2NhbGxzIDw9IDEgfHwgdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLndoaWxzdChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5kb1VudGlsID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0ZXN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuZHVyaW5nID0gZnVuY3Rpb24gKHRlc3QsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3A7XG5cbiAgICAgICAgdmFyIG5leHQgPSBfcmVzdFBhcmFtKGZ1bmN0aW9uKGVyciwgYXJncykge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChjaGVjayk7XG4gICAgICAgICAgICAgICAgdGVzdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGNoZWNrID0gZnVuY3Rpb24oZXJyLCB0cnV0aCkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRydXRoKSB7XG4gICAgICAgICAgICAgICAgaXRlcmF0b3IobmV4dCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRlc3QoY2hlY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5kb0R1cmluZyA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNhbGxzID0gMDtcbiAgICAgICAgYXN5bmMuZHVyaW5nKGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgIGlmIChjYWxscysrIDwgMSkge1xuICAgICAgICAgICAgICAgIG5leHQobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX3F1ZXVlKHdvcmtlciwgY29uY3VycmVuY3ksIHBheWxvYWQpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKGNvbmN1cnJlbmN5ID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmN1cnJlbmN5IG11c3Qgbm90IGJlIHplcm8nKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHBvcywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsICYmIHR5cGVvZiBjYWxsYmFjayAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGFzayBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxLnN0YXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCFfaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihkYXRhLmxlbmd0aCA9PT0gMCAmJiBxLmlkbGUoKSkge1xuICAgICAgICAgICAgICAgIC8vIGNhbGwgZHJhaW4gaW1tZWRpYXRlbHkgaWYgdGhlcmUgYXJlIG5vIHRhc2tzXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX2FycmF5RWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayB8fCBub29wXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcS50YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHEudGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggPT09IHEuY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgICAgcS5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIF9uZXh0KHEsIHRhc2tzKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB3b3JrZXJzIC09IDE7XG5cbiAgICAgICAgICAgICAgICB2YXIgcmVtb3ZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIF9hcnJheUVhY2godGFza3MsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIF9hcnJheUVhY2god29ya2Vyc0xpc3QsIGZ1bmN0aW9uICh3b3JrZXIsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod29ya2VyID09PSB0YXNrICYmICFyZW1vdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2Vyc0xpc3Quc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdvcmtlcnMgPSAwO1xuICAgICAgICB2YXIgd29ya2Vyc0xpc3QgPSBbXTtcbiAgICAgICAgdmFyIHEgPSB7XG4gICAgICAgICAgICB0YXNrczogW10sXG4gICAgICAgICAgICBjb25jdXJyZW5jeTogY29uY3VycmVuY3ksXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBub29wLFxuICAgICAgICAgICAgZW1wdHk6IG5vb3AsXG4gICAgICAgICAgICBkcmFpbjogbm9vcCxcbiAgICAgICAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgcGF1c2VkOiBmYWxzZSxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgZmFsc2UsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBraWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcS5kcmFpbiA9IG5vb3A7XG4gICAgICAgICAgICAgICAgcS50YXNrcyA9IFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgdHJ1ZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSghcS5wYXVzZWQgJiYgd29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpe1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXNrcyA9IHEucGF5bG9hZCA/XG4gICAgICAgICAgICAgICAgICAgICAgICBxLnRhc2tzLnNwbGljZSgwLCBxLnBheWxvYWQpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHEudGFza3Muc3BsaWNlKDAsIHEudGFza3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IF9tYXAodGFza3MsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFzay5kYXRhO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocS50YXNrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHEuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB3b3JrZXJzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcnNMaXN0LnB1c2godGFza3NbMF0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5X29uY2UoX25leHQocSwgdGFza3MpKTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKGRhdGEsIGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VycztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3b3JrZXJzTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzTGlzdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZGxlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhdXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChxLnBhdXNlZCA9PT0gZmFsc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgcS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdW1lQ291bnQgPSBNYXRoLm1pbihxLmNvbmN1cnJlbmN5LCBxLnRhc2tzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgLy8gTmVlZCB0byBjYWxsIHEucHJvY2VzcyBvbmNlIHBlciBjb25jdXJyZW50XG4gICAgICAgICAgICAgICAgLy8gd29ya2VyIHRvIHByZXNlcnZlIGZ1bGwgY29uY3VycmVuY3kgYWZ0ZXIgcGF1c2VcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB3ID0gMTsgdyA8PSByZXN1bWVDb3VudDsgdysrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfVxuXG4gICAgYXN5bmMucXVldWUgPSBmdW5jdGlvbiAod29ya2VyLCBjb25jdXJyZW5jeSkge1xuICAgICAgICB2YXIgcSA9IF9xdWV1ZShmdW5jdGlvbiAoaXRlbXMsIGNiKSB7XG4gICAgICAgICAgICB3b3JrZXIoaXRlbXNbMF0sIGNiKTtcbiAgICAgICAgfSwgY29uY3VycmVuY3ksIDEpO1xuXG4gICAgICAgIHJldHVybiBxO1xuICAgIH07XG5cbiAgICBhc3luYy5wcmlvcml0eVF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcblxuICAgICAgICBmdW5jdGlvbiBfY29tcGFyZVRhc2tzKGEsIGIpe1xuICAgICAgICAgICAgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5O1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX2JpbmFyeVNlYXJjaChzZXF1ZW5jZSwgaXRlbSwgY29tcGFyZSkge1xuICAgICAgICAgICAgdmFyIGJlZyA9IC0xLFxuICAgICAgICAgICAgICAgIGVuZCA9IHNlcXVlbmNlLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICB3aGlsZSAoYmVnIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1pZCA9IGJlZyArICgoZW5kIC0gYmVnICsgMSkgPj4+IDEpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wYXJlKGl0ZW0sIHNlcXVlbmNlW21pZF0pID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYmVnID0gbWlkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVuZCA9IG1pZCAtIDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGJlZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIF9pbnNlcnQocSwgZGF0YSwgcHJpb3JpdHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCAmJiB0eXBlb2YgY2FsbGJhY2sgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRhc2sgY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcS5zdGFydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghX2lzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBjYWxsIGRyYWluIGltbWVkaWF0ZWx5IGlmIHRoZXJlIGFyZSBubyB0YXNrc1xuICAgICAgICAgICAgICAgIHJldHVybiBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9hcnJheUVhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogcHJpb3JpdHksXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG5vb3BcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcS50YXNrcy5zcGxpY2UoX2JpbmFyeVNlYXJjaChxLnRhc2tzLCBpdGVtLCBfY29tcGFyZVRhc2tzKSArIDEsIDAsIGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHEudGFza3MubGVuZ3RoID09PSBxLmNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTdGFydCB3aXRoIGEgbm9ybWFsIHF1ZXVlXG4gICAgICAgIHZhciBxID0gYXN5bmMucXVldWUod29ya2VyLCBjb25jdXJyZW5jeSk7XG5cbiAgICAgICAgLy8gT3ZlcnJpZGUgcHVzaCB0byBhY2NlcHQgc2Vjb25kIHBhcmFtZXRlciByZXByZXNlbnRpbmcgcHJpb3JpdHlcbiAgICAgICAgcS5wdXNoID0gZnVuY3Rpb24gKGRhdGEsIHByaW9yaXR5LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCBwcmlvcml0eSwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJlbW92ZSB1bnNoaWZ0IGZ1bmN0aW9uXG4gICAgICAgIGRlbGV0ZSBxLnVuc2hpZnQ7XG5cbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcblxuICAgIGFzeW5jLmNhcmdvID0gZnVuY3Rpb24gKHdvcmtlciwgcGF5bG9hZCkge1xuICAgICAgICByZXR1cm4gX3F1ZXVlKHdvcmtlciwgMSwgcGF5bG9hZCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIF9jb25zb2xlX2ZuKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIF9yZXN0UGFyYW0oZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbX3Jlc3RQYXJhbShmdW5jdGlvbiAoZXJyLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29uc29sZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChjb25zb2xlW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYXJyYXlFYWNoKGFyZ3MsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSldKSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhc3luYy5sb2cgPSBfY29uc29sZV9mbignbG9nJyk7XG4gICAgYXN5bmMuZGlyID0gX2NvbnNvbGVfZm4oJ2RpcicpO1xuICAgIC8qYXN5bmMuaW5mbyA9IF9jb25zb2xlX2ZuKCdpbmZvJyk7XG4gICAgYXN5bmMud2FybiA9IF9jb25zb2xlX2ZuKCd3YXJuJyk7XG4gICAgYXN5bmMuZXJyb3IgPSBfY29uc29sZV9mbignZXJyb3InKTsqL1xuXG4gICAgYXN5bmMubWVtb2l6ZSA9IGZ1bmN0aW9uIChmbiwgaGFzaGVyKSB7XG4gICAgICAgIHZhciBtZW1vID0ge307XG4gICAgICAgIHZhciBxdWV1ZXMgPSB7fTtcbiAgICAgICAgdmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBpZGVudGl0eTtcbiAgICAgICAgdmFyIG1lbW9pemVkID0gX3Jlc3RQYXJhbShmdW5jdGlvbiBtZW1vaXplZChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChoYXMuY2FsbChtZW1vLCBrZXkpKSB7ICAgXG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgbWVtb1trZXldKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhhcy5jYWxsKHF1ZXVlcywga2V5KSkge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0gPSBbY2FsbGJhY2tdO1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtfcmVzdFBhcmFtKGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbW9ba2V5XSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcVtpXS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgbWVtb2l6ZWQubWVtbyA9IG1lbW87XG4gICAgICAgIG1lbW9pemVkLnVubWVtb2l6ZWQgPSBmbjtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkO1xuICAgIH07XG5cbiAgICBhc3luYy51bm1lbW9pemUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAoZm4udW5tZW1vaXplZCB8fCBmbikuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gX3RpbWVzKG1hcHBlcikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG1hcHBlcihfcmFuZ2UoY291bnQpLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGFzeW5jLnRpbWVzID0gX3RpbWVzKGFzeW5jLm1hcCk7XG4gICAgYXN5bmMudGltZXNTZXJpZXMgPSBfdGltZXMoYXN5bmMubWFwU2VyaWVzKTtcbiAgICBhc3luYy50aW1lc0xpbWl0ID0gZnVuY3Rpb24gKGNvdW50LCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBhc3luYy5tYXBMaW1pdChfcmFuZ2UoY291bnQpLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VxID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gYXJndW1lbnRzO1xuICAgICAgICByZXR1cm4gX3Jlc3RQYXJhbShmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IG5vb3A7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFzeW5jLnJlZHVjZShmbnMsIGFyZ3MsIGZ1bmN0aW9uIChuZXdhcmdzLCBmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChbX3Jlc3RQYXJhbShmdW5jdGlvbiAoZXJyLCBuZXh0YXJncykge1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9KV0pKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhhdCwgW2Vycl0uY29uY2F0KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY29tcG9zZSA9IGZ1bmN0aW9uICgvKiBmdW5jdGlvbnMuLi4gKi8pIHtcbiAgICAgICAgcmV0dXJuIGFzeW5jLnNlcS5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGFyZ3VtZW50cykpO1xuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIF9hcHBseUVhY2goZWFjaGZuKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uKGZucywgYXJncykge1xuICAgICAgICAgICAgdmFyIGdvID0gX3Jlc3RQYXJhbShmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgXywgY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgYXJncy5jb25jYXQoW2NiXSkpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLmFwcGx5RWFjaCA9IF9hcHBseUVhY2goYXN5bmMuZWFjaE9mKTtcbiAgICBhc3luYy5hcHBseUVhY2hTZXJpZXMgPSBfYXBwbHlFYWNoKGFzeW5jLmVhY2hPZlNlcmllcyk7XG5cblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBkb25lID0gb25seV9vbmNlKGNhbGxiYWNrIHx8IG5vb3ApO1xuICAgICAgICB2YXIgdGFzayA9IGVuc3VyZUFzeW5jKGZuKTtcbiAgICAgICAgZnVuY3Rpb24gbmV4dChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFzayhuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGVuc3VyZUFzeW5jKGZuKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5uZXJBcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIGlmIChzeW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBpbm5lckFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBpbm5lckFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICBzeW5jID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jLmVuc3VyZUFzeW5jID0gZW5zdXJlQXN5bmM7XG5cbiAgICBhc3luYy5jb25zdGFudCA9IF9yZXN0UGFyYW0oZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICAgIHZhciBhcmdzID0gW251bGxdLmNvbmNhdCh2YWx1ZXMpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhc3luYy53cmFwU3luYyA9XG4gICAgYXN5bmMuYXN5bmNpZnkgPSBmdW5jdGlvbiBhc3luY2lmeShmdW5jKSB7XG4gICAgICAgIHJldHVybiBfcmVzdFBhcmFtKGZ1bmN0aW9uIChhcmdzKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBpZiByZXN1bHQgaXMgUHJvbWlzZSBvYmplY3RcbiAgICAgICAgICAgIGlmIChfaXNPYmplY3QocmVzdWx0KSAmJiB0eXBlb2YgcmVzdWx0LnRoZW4gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJlc3VsdC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KVtcImNhdGNoXCJdKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIubWVzc2FnZSA/IGVyciA6IG5ldyBFcnJvcihlcnIpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIE5vZGUuanNcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBhc3luYztcbiAgICB9XG4gICAgLy8gQU1EIC8gUmVxdWlyZUpTXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gaW5jbHVkZWQgZGlyZWN0bHkgdmlhIDxzY3JpcHQ+IHRhZ1xuICAgIGVsc2Uge1xuICAgICAgICByb290LmFzeW5jID0gYXN5bmM7XG4gICAgfVxuXG59KCkpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=

//# sourceMappingURL=async-chainable.js.map