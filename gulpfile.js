const gulp = require("gulp");
const babel = require("gulp-babel");
const zip = require("gulp-zip");
const size = require("gulp-size");
const sourcemaps = require("gulp-sourcemaps");
const concat = require("gulp-concat");
const del = require("del");

gulp.task('clean', () => {
    return del('dist');
});

gulp.task('build:html', () => {
    gulp.src('src/*.html')
        .pipe(gulp.dest('dist'));
});

gulp.task('build:css', () => {
    gulp.src('src/css/*.css')
        .pipe(gulp.dest('dist'));
});

gulp.task('build:assets', () => {
    gulp.src('src/assets/*')
        .pipe(gulp.dest('dist/assets'));
});

gulp.task('build:js', () => {
    gulp.src('src/js/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(concat('app.js'))
        .pipe(size())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build', ['build:html', 'build:css', 'build:assets', 'build:js']);

gulp.task('zip', () => {
    gulp.src(['dist/**', '!dist/offline.zip'], { base: '.' })
        .pipe(zip('offline.zip'))
        .pipe(size())
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', () => {
    gulp.watch('src/*.html', ['build:html']);
    gulp.watch('src/css/*.css', ['build:css']);
    gulp.watch('src/assets/*', ['build:assets']);
    gulp.watch('src/js/*.js', ['build:js']);
});

gulp.task('default', ['build', 'watch']);
