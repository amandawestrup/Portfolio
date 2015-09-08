// Node modules
var browserSync = require('browser-sync').create();
var fs = require('fs');
var ftp = require( 'vinyl-ftp' );
var lib = require('bower-files')();
var merge2 = require('merge2');
var pngquant = require('imagemin-pngquant');

// Gulp modules
var gulp = require('gulp');
var concat = require('gulp-concat');
var gutil = require('gulp-util');
var imagemin = require('gulp-imagemin');
var order = require("gulp-order");
var prompt = require('gulp-prompt');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
 
gulp.task('bower-files', function () {
	return merge2(
		gulp.src(lib.ext('js').files)
		.pipe(gulp.dest('source/js/')),
		gulp.src(lib.ext('css').files)
		.pipe(gulp.dest('source/css/')),
		gulp.src(lib.ext(['png', 'gif', 'jpg']).files)
		.pipe(gulp.dest('source/images/'))
	);
});

gulp.task('browser-sync', function() {
	browserSync.init({
		server: {
			baseDir: "build/"
		}
	});
});

// Deploy build directory to an FTP server
gulp.task('deploy', function() {
	return gulp.src('package.json')
		.pipe(prompt.prompt([{
			type: 'input',
			name: 'host',
			message: 'Host: '
		}, {
			type: 'input',
			name: 'user',
			message: 'User:'
		}, {
			type: 'password',
			name: 'password',
			message: 'Password'
		}], function(response){
			var conn = ftp.create({
				host: response.host,
				user: response.user,
				password: response.password,
				log: gutil.log
			});

			return gulp.src('build/**/*', { 
				base: 'build/',
				buffer: false 
			})
			.pipe(conn.newer('/public_html'))
			.pipe(conn.dest('/public_html'));
	}));
});

// Compile html templates.
gulp.task('templates', function(){
	return gulp.src(['source/**/*.html', '!source/templates/**/*.html'])
		.pipe(replace(/\s+{{include\s(.+|^})}}/g, function(original, match) {
			return fs.readFileSync('source/templates/' + match, 'utf8');
		}))
		.pipe(gulp.dest('build/'));
});

// Concatenate css styles based on a specific order.
gulp.task('styles', function() {
	return gulp.src('source/css/**/*.css')
		.pipe(order([
			"**/normalize.css",
			"**/lightbox.css",
			"**/*.css"
		]))
		.pipe(concat('sara-sites.css'))
		.pipe(gulp.dest('build/css/'));
});

// Concatenate javascript files.
gulp.task('scripts', function() {
	return gulp.src('source/js/**/*.js')
		.pipe(order([
			"**/jquery.js",
			"**/*.js"
		]))
		.pipe(concat('sara-sites.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('build/js/'));
});

// Minify images.
gulp.task('images', function () {
	return gulp.src('source/images/*')
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			use: [pngquant()]
		}))
		.pipe(gulp.dest('build/images/'));
});

// Watch for file changes and rebuild
gulp.task('watch', function() {
    gulp.watch('source/js/**/*.js', ['scripts']);
    gulp.watch('source/css/**/*.css', ['styles']);
    gulp.watch('source/**/*.html', ['templates']);
	gulp.watch('source/images/*', ['images']);
});

gulp.task('serve', ['browser-sync']);

// Build html templates, css styles, javascripts, and minifiy images.
gulp.task('build', ['templates', 'styles', 'scripts', 'images']);

// Build and run browser-sync server by default.
gulp.task('default', ['build', 'browser-sync']);