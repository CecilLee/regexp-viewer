var gulp =  require('gulp');
var react = require('gulp-react');
var browserify = require('gulp-browserify');

gulp.task('run1', function(){
    return gulp.src('./src/*.jsx')
      .pipe(react())
      .pipe(browserify())
      .pipe(gulp.dest('build'));
});
gulp.task('watch', function(){
    gulp.watch('src/*.jsx', ['run1']);
});

gulp.task('default', ['run1', 'watch']);
