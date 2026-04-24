/*global module:false*/
module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		// Metadata.
		pkg: grunt.file.readJSON('package.json'),
		banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
		'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
		'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.license %>; */\n',
		// Task configuration.
		watch: {
		options: {
			interval: 300
		},
		concatJS: {
			files: ['/var/www/html/js/**/*.js', '!/var/www/html/js/lib/**/*', '!/var/www/html/js/libs.js', '!/var/www/html/js/timetracker.js', '!/var/www/html/js/timetracker-compiled.js'],
			tasks: ['concat:toCompiled'],
			interrupt: true
		},
		concatTemplates: {
			files: ['/var/www/html/tmpl/**/*.html'],
			tasks: ['concat:templates'],
			interrupt: true
		},
		concatLibs: {
			files: ['/var/www/html/js/lib/**/*'],
			tasks: ['concat:libs'],
			interrupt: true
		},
		scss: {
			files: "/var/www/html/**/*.scss",
			tasks: ['sass:dist'],
			interrupt: true
		}
		},
		concat: {
		options: {
			sourceMap: false
		},
		js: {
			options: {
			banner: '',
			stripBanners: true
			},
			src: [
					'/var/www/html/js/utils/packages.js', 
					'/var/www/html/js/utils/router.js', 
					'/var/www/html/js/utils/base-form-view.js', 
					'/var/www/html/js/utils/base-list-views.js', 
					'/var/www/html/js/utils/base-modal.js', 
					'/var/www/html/js/models/user/**', 
					'/var/www/html/js/models/gang/**', 
					'/var/www/html/js/models/campaign/**', 
					'/var/www/html/js/models/messaging/**', 
					'/var/www/html/js/views/**/**'
				],
			dest: '/var/www/html/js/timetracker.js'
		},
		toCompiled: {
			options: {
			banner: "/* Compiled: <%= grunt.template.today('yyyy-mm-dd, h:MM:ss TT') %> */\n",
			stripBanners: true,
			sourceMap: false
			},
			src: [
					'/var/www/html/js/utils/packages.js', 
					'/var/www/html/js/utils/router.js', 
					'/var/www/html/js/utils/base-form-view.js', 
					'/var/www/html/js/utils/base-list-views.js', 
					'/var/www/html/js/utils/base-modal.js', 
					'/var/www/html/js/models/user/**', 
					'/var/www/html/js/models/gang/**', 
					'/var/www/html/js/models/campaign/**', 
					'/var/www/html/js/models/messaging/**', 
					'/var/www/html/js/views/**/**'
				],
			dest: '/var/www/html/js/timetracker.js'
		},
		toCompiledDist: {
			options: {
			banner: '',
			stripBanners: true,
			sourceMap: false
			},
			src: [
					'/var/www/html/js/utils/packages.js', 
					'/var/www/html/js/utils/router.js', 
					'/var/www/html/js/utils/base-modal.js', 
					'/var/www/html/js/utils/base-list-views.js', 
					'/var/www/html/js/utils/base-form-views.js', 
					'/var/www/html/js/utils/modal.js', 
					'/var/www/html/js/models/**', 
					'/var/www/html/js/views/**/**'
				],
			dest: '/usr/src/timetracker/timetracker-compiled.js'
		},
		templates: {
			options: {
			process: function (src, filepath) {
				var match = /\/([a-zA-Z0-9\-\_]+)\.html/.exec(filepath);
				/*
				grunt.log.writeln(filepath);
				for (var i = 0; i < match.length; i++) {
				grunt.log.writeln(match[i]);  
				}
				*/
				return '<script type="text/tempate" id="' + match[1] + '">' +
				grunt.util.linefeed +
				src +
				grunt.util.linefeed +
				'</script>' +
				grunt.util.linefeed;
			}
			},
			src: ['/var/www/html/tmpl/**/*.html'],
			dest: '/var/www/html/js/templates.js'
		},
		templatesDist: {
			options: {
			process: function (src, filepath) {
				var match = /\/([a-zA-Z0-9\-\_]+)\.html/.exec(filepath);
				/*
				grunt.log.writeln(filepath);
				for (var i = 0; i < match.length; i++) {
				grunt.log.writeln(match[i]);  
				}
				*/
				return '<script type="text/tempate" id="' + match[1] + '">' +
				grunt.util.linefeed +
				src +
				'</script>' +
				grunt.util.linefeed;
			}
			},
			src: ['/var/www/html/tmpl/**/*.html'],
			dest: '/usr/src/timetracker/package/js/templates.js'
		}
		},
		uglify: {
		fromCompiled: {
			options: {
			sourceMap: false,
			compress: true,
			mangle: false,
			banner: '/* Compiled: <%= grunt.template.today("yyyy-mm-dd, h:MM:ss TT") %> */'
			},
			files: {
			'/usr/src/timetracker/package/js/timetracker.js': ['/usr/src/timetracker/timetracker-compiled.js']
			}
		}
		},
		sass: {
		dist: {
			/*options: {
			loadPath: ['/usr/lib/node_modules/foundation-sites/scss'],
			update: true
			},*/
			files: [{
			expand: true,
			cwd: '/var/www/html',
			src: ['**/*.scss'],
			dest: '/var/www/html',
			ext: '.css'
			}]
		}
		},
		copy: {
		production: {
			cwd: '/var/www/html',
			expand: true,
			dot: true,
			src: [
			'**/*',
			'!js/models/**/*',
			'!js/routers/**/*',
			'!js/sandbox/**/*',
			'!js/tpl/**/*',
			'!js/utils/**/*',
			'!js/views/**/*',
			'!api/_config.php',
			'!api/.gitignore',
			'!**/.DS_Store',
			'!**/.buildpath',
			'!**/.gitignore',
			'!**/.project',
			'!**/.settings',
			'!build.xml',
			'!build.properties',
			'!entitydb.php',
			'!TODO.txt',
			'!phpinfo.php'
			],
			dest: '/usr/src/timetracker/package/'
		},
		uglified: {
			cwd: '/usr/src/timetracker/package/js',
			expand: true,
			src: [
			'timetracker.js'
			],
			dest: '/var/www/html/js/'
		}
		},
		zip: {
		packageProduction: {
			cwd: 'package/',
			dot: true,
			src: ['package/**/*'],
			dest: '/usr/src/timetracker/production-build.zip'
		}
		},
		clean: {
		options: {
			'force': true
		},
		removeCompiled: ['/var/www/html/js/timetracker-compiled.js'],
		all: [
			'/usr/src/timetracker/timetracker-compiled.js',
			'/usr/src/timetracker/package/*',
			'/usr/src/timetracker/production-build.zip',
			'/var/www/html/js/timetracker.js',
			'/var/www/html/js/timetracker.js.map',
			'/var/www/html/js/libs.js',
			'/var/www/html/js/templates.js'
		],
		cleanCSS: [
			'/var/www/html/css/timetracker.css',
		],
		cleanTemplates: ['/var/www/html/js/templates.js'],
		cleanJS: [
			'/usr/src/timetracker/timetracker-compiled.js',
			'/var/www/html/js/timetracker.js',
			'/var/www/html/js/timetracker.js.map'
		],
		cleanProduction: [
			'/usr/src/timetracker/package/build',
			'/usr/src/timetracker/package/docs',
			'/usr/src/timetracker/package/sql',
			'/usr/src/timetracker/package/test',
			'/usr/src/timetracker/package/js/models',
			'/usr/src/timetracker/package/js/routers',
			'/usr/src/timetracker/package/js/sandbox',
			'/usr/src/timetracker/package/js/tpl',
			'/usr/src/timetracker/package/js/utils',
			'/usr/src/timetracker/package/js/views'
		]
	}
});

// These plugins provide necessary tasks.
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-sass');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-newer');
grunt.loadNpmTasks('grunt-replace');
grunt.loadNpmTasks('grunt-zip');

// Default task.
grunt.registerTask('default', ['watch']);
grunt.registerTask('process-js', ['clean:cleanJS', 'concat:toCompiled']);
grunt.registerTask('process-js-dist', ['clean:cleanJS', 'concat:toCompiledDist', 'uglify:fromCompiled', 'clean:removeCompiled']);
grunt.registerTask('process-templates', ['concat:templates']);
grunt.registerTask('process-sass', ['sass:dist']);
grunt.registerTask('clean-all', ['clean:all']);
grunt.registerTask('clean-compiled', ['clean:removeCompiled']);
grunt.registerTask('package-production', ['clean:all', 'copy:production', 'clean:cleanProduction', 'concat:templatesDist', 'concat:toCompiledDist', 'uglify:fromCompiled', 'zip:packageProduction']);
grunt.registerTask('refresh', ['clean:all', 'concat:toCompiled', 'concat:templates', 'sass:dist']);
grunt.registerTask('ugly-js', ['clean:cleanJS', 'concat:toCompiledDist', 'uglify:fromCompiled', 'clean:removeCompiled', 'copy:uglified']);


};
