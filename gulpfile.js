var gulp    = require('gulp');
var concat  = require('gulp-concat');
var sass    = require('gulp-sass')(require('sass'));
var header  = require('gulp-header');
var through2 = require('through2');
var path    = require('path');
var del     = require('del');

var paths = {
    js: {
        src: [
            '/var/www/html/js/utils/packages.js',
            '/var/www/html/js/utils/base-form-view.js',
            '/var/www/html/js/utils/base-list-views.js',
            '/var/www/html/js/utils/base-modal.js',
            '/var/www/html/js/utils/router.js',
            '/var/www/html/js/models/user/**/*.js',
            '/var/www/html/js/models/client/**/*.js',
            '/var/www/html/js/models/organization/**/*.js',
            '/var/www/html/js/views/**/*.js'
        ],
        dest:   '/var/www/html/js/',
        output: 'timetracker.js'
    },
    sass: {
        src:  '/var/www/html/**/*.scss',
        dest: '/var/www/html/'
    }
};

function getTimestamp() {
    var now = new Date();
    return now.toISOString().replace('T', ', ').substring(0, 22);
}

function clean() {
    return del(['/var/www/html/js/timetracker.js'], { force: true });
}

function scripts() {
    var banner = '/* TimeTracker – Compiled: ' + getTimestamp() + ' */\n';
    return gulp.src(paths.js.src, { allowEmpty: true })
        .pipe(concat(paths.js.output))
        .pipe(header(banner))
        .pipe(gulp.dest(paths.js.dest));
}

function styles() {
    return gulp.src(paths.sass.src, { allowEmpty: true })
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(paths.sass.dest));
}

function watchFiles() {
    gulp.watch([
        '/var/www/html/js/**/*.js',
        '!/var/www/html/js/timetracker.js',
        '!/var/www/html/js/libs/**'
    ], scripts);

    gulp.watch('/var/www/html/**/*.scss', styles);
}

var build   = gulp.series(clean, gulp.parallel(scripts, styles));
var refresh = gulp.series(clean, gulp.parallel(scripts, styles));
var defaultTask = gulp.series(build, watchFiles);

exports.clean   = clean;
exports.scripts = scripts;
exports.styles  = styles;
exports.watch   = watchFiles;
exports.build   = build;
exports.refresh = refresh;
exports.default = defaultTask;
