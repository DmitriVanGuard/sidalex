const gulp = require('gulp'),
    browserSync = require('browser-sync').create(),
    del = require('del'),
    $ = require('gulp-load-plugins')();

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

const moduleJS  = [
  'app/assets/js/main.js',
  'app/assets/js/sidebar.js',
  'app/assets/js/header__nav.js',
  'app/assets/js/slider.js',
  'app/assets/js/flip.js'
];
const paths = {
  pug : {
    src : 'app/pug/_pages/*.pug',
    all : 'app/pug/**/*.pug',
    distDev : 'distDev'
  },
  js : {
    distDev : 'distDev/assets/js',
    all : 'app/assets/js/**/*.js'
  },
  css : {
    main : 'app/assets/css/main.sass',
    vendor: 'app/assets/css/vendor/*.*',
    all : 'app/assets/css/**/*.sass',
    distDev : 'distDev/assets/css/'
  },
  images : {
    all : 'app/img/**/*.{png,jpg}',
    svg : 'app/img/icons/*.svg',
    distDev : 'distDev/img'
  },
  browser : {
    server : 'distDev/',
    proxy : 'phptuc.loc'
  },
  fonts : {
    all : 'app/assets/css/fonts/**/*.{woff2,woff,ttf,eot}', //{woff2, woff, ttf, eot}
    distDev : 'distDev/assets/css/fonts'
  }
};

// RUN SERVER 
gulp.task('serve', function() {
  browserSync.init({
    // proxy: paths.browser.proxy // DOMAIN NAME
      server: paths.browser.server
  });

  browserSync.watch('distDev/**/*.*').on('change', browserSync.reload);
});

// Преобразоване pug to HTML
gulp.task('build:pug', function() {
    return gulp.src(paths.pug.src)
      .pipe($.plumber({
        errorHandler: $.notify.onError(function (err) {
          return {title: 'pug', message: err.message}
        })
      }))
      .pipe($.pug({
        pretty: '\t' // отступы в 1 таб
      }))
      .pipe(gulp.dest(paths.pug.distDev));
});

// перенос и оптимизация картинок
gulp.task('images', function(){
  return gulp.src(paths.images.all) // *.+(svg|png|jpg)
  .pipe($.if('*.{png,jpg}', $.cache($.imagemin({optimizationLevel: 3,
                              progressive: true, 
                              interlaced: true
                            }
                          )
                )))
  .pipe(gulp.dest(paths.images.distDev));
});

//Перенос fonts
gulp.task('fonts', function(){
  return gulp.src(paths.fonts.all)
    .pipe(gulp.dest(paths.fonts.distDev));
});

// Scripts JS
gulp.task('build:js', function() {
  return gulp.src(paths.js.all)
    .pipe($.plumber({
      errorHandler: $.notify.onError(function (err) {
        return {title: 'javaScript', message: err.message}
      })
    }))
    .pipe($.if(isDevelopment, $.sourcemaps.init()))
    .pipe($.concat('main.min.js'))
    .pipe($.uglify())
    .pipe($.if(isDevelopment, $.sourcemaps.write('maps')))
    .pipe(gulp.dest(paths.js.distDev))
});

gulp.task('styles:vendor', function(){
  return gulp.src(paths.css.vendor)
    .pipe($.rename('vendor.min.css'))
    .pipe(gulp.dest(paths.css.distDev));
});

gulp.task('styles', function() {
  return gulp.src([paths.css.main, '!app/assets/css/vendor/'])
    .pipe($.plumber({
        errorHandler: $.notify.onError(function(err){
                return {
                  title: "Styles",
                  message: err.message
                };
              })
        }))
    .pipe($.if(isDevelopment, $.sourcemaps.init()))
    .pipe($.sassGlob())
    .pipe($.sass())
    .pipe($.groupCssMediaQueries())
    .pipe($.if(isDevelopment, $.sourcemaps.write()))
    .pipe($.pleeease({
      "sass": true,
      "autoprefixer": true,
      "opacity": true
    }))
    .pipe($.rename('main.min.css'))
    .pipe(gulp.dest(paths.css.distDev));
});


gulp.task('watch', function() {
  gulp.watch(paths.css.all, gulp.series('styles'));
  gulp.watch('app/img/**/*.{png,jpg}', gulp.series('images'));
  gulp.watch(paths.pug.all, gulp.series('build:pug'));

});

gulp.task('build:svg', function () {
  return gulp.src(paths.images.svg)
  // минифицируем svg
    .pipe($.svgmin({
        js2svg: {
          pretty: true
        }
  }))
  // удалить все атрибуты fill, style and stroke в фигурах
    .pipe($.cheerio({
        run: function ($) {
          $('[fill]').removeAttr('fill');
          $('[stroke]').removeAttr('stroke');
          $('[style]').removeAttr('style');
          $('[fill-rule]').removeAttr('fill-rule');
          $('[clip-rule]').removeAttr('clip-rule');
        },
        parserOptions: {
          xmlMode: true
        }
  }))
  // cheerio плагин заменит, если появилась, скобка '&gt;', на нормальную.
    .pipe($.replace('&gt;', '>'))
  // build svg sprite
    .pipe($.svgSprite({
        mode: {
          symbol: {
            sprite: "../icons/sprite.svg",
            /*example: {
              dest: '../tmp/spriteSvgDemo.html' // демо html
            }*/
          }
        }
  }))
    .pipe(gulp.dest(paths.images.distDev));
});

gulp.task('clean', function() {
  return del('distDev');
});

gulp.task('build', gulp.series(
    'clean',
    'fonts',
    gulp.parallel('styles', 'styles:vendor', 'images', 'build:svg', 'build:pug'))
);

gulp.task('dev',
    gulp.series('build', gulp.parallel('watch', 'serve'))
);