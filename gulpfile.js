const gulp = require("gulp");
const babel = require("gulp-babel");
const zip = require("gulp-zip");
const size = require("gulp-size");
const sourcemaps = require("gulp-sourcemaps");
const concat = require("gulp-concat");
const del = require("del");
const add = require("gulp-add");
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const cleancss = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const shell = require('gulp-shell');

const levelPacker = require("./level-packer");

gulp.task('clean', () => {
    return del('bin');
});

gulp.task('build:html', () => {
    gulp.src('src/*.html')
        .pipe(htmlmin())
        .pipe(gulp.dest('bin'));
});

gulp.task('build:css', () => {
    gulp.src('src/css/*.css')
        .pipe(cleancss())
        .pipe(gulp.dest('bin'));
});

gulp.task('build:assets', () => {
    gulp.src(['src/assets/*.png', '!src/assets/meta_*.png'])
        .pipe(imagemin())
        .pipe(gulp.dest('bin/assets'));
});

gulp.task('build:js', () => {
    gulp.src('src/js/*.js')
        .pipe(add("LevelCache.js", levelPacker.packAll("src/levels/level*.json"), true))
        .pipe(sourcemaps.init())
        .pipe(concat('app.js'))
        .pipe(babel())
        .pipe(size())
        .pipe(uglify({ toplevel: true }))
        .pipe(size())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('bin'));
});

gulp.task('build', ['build:html', 'build:css', 'build:assets', 'build:js']);

// These two tasks require the advpng and advzip tools which you can download and
// build from http://www.advancemame.it/download (from js13k resources page).
gulp.task('zip:pre', shell.task('../advpng -z -4 bin/assets/*.png'));
gulp.task('zip:post', shell.task('../advzip -z -4 zip/offline.zip'));

gulp.task('zip', () => {
    gulp.src(['bin/**', '!bin/app.js.map'], { base: '.' })
        .pipe(zip('offline.zip'))
        .pipe(size())
        .pipe(gulp.dest('zip'));
});

gulp.task('watch', () => {
    gulp.watch('src/*.html', ['build:html']);
    gulp.watch('src/css/*.css', ['build:css']);
    gulp.watch('src/assets/*', ['build:assets']);
    gulp.watch('src/js/*.js', ['build:js']);
});

gulp.task('default', ['build', 'watch']);
