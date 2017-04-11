const gulp = require('gulp');
const inline = require('gulp-inline');
const inlineImages = require('gulp-inline-images');
const exec = require('gulp-exec');

gulp.task('inline', function () {
    gulp.src('./build/RethinkDBJS.docset/Contents/Resources/Documents/index.html')
        .pipe(inline({
            base: './build/RethinkDBJS.docset/Contents/Resources/Documents/'
        }))
        .pipe(inlineImages({basedir: './build/RethinkDBJS.docset/Contents/Resources/Documents/'}))
        .pipe(gulp.dest('./build/RethinkDBJS.docset/Contents/Resources/Documents/'));
});