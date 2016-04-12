var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');

gulp.task('default', ['build']);

gulp.task('build', function () {
	return browserify(['./node_modules/async-chainable/index.js', './lib/angular-async-chainable.js'], {
		standalone: 'asyncChainable',
		debug: true,
	}).bundle()
		.pipe(source('async-chainable.js')) // Output filename
		.pipe(buffer())
		.pipe(sourcemaps.init())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./'));
});
