const gulp = require('gulp')
const gulpIf = require('gulp-if')
const markdown = require('../utils/markdown')
const ejs = require('../../etc/gulp-ejs')
const data = require('gulp-data')
const wrap = require('gulp-wrap')
const posthtml = require('gulp-posthtml')
const prettyUrls = require('../utils/pretty-urls')
const touch = require('../../etc/gulp-touch')
const locals = require('./locals')
const { destDir } = require('../../etc/build-config')

const compile = (stream) => {
  return stream
    .pipe(gulpIf(/\.md$/, markdown()))
    .pipe(gulpIf(/\.md$/, wrap({ src: 'src/layouts/page-md.html' })))
    .pipe(data({ locals }))
    .pipe(
      gulpIf(
        /\.ejs$/,
        ejs((file) => file.data.locals),
      ),
    )
    .pipe(posthtml())
    .pipe(prettyUrls())
    .pipe(gulp.dest(destDir))
}

const compilePages = () => {
  return compile(
    gulp.src('src/pages/**/*', {
      since: gulp.lastRun(compilePages),
    }),
  )
}

const compileAllPages = () => {
  return compile(gulp.src('src/pages/**/*')).pipe(touch())
}

const watchPages = () => {
  gulp.watch('src/pages/**/*', compilePages)
  gulp.watch('src/layouts/page-md.html', compileAllPages)
}

module.exports = {
  compile: compilePages,
  compileAll: compileAllPages,
  watch: watchPages,
}
