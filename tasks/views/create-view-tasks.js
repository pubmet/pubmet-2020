const gulp = require('gulp')
const data = require('gulp-data')
const gulpIf = require('gulp-if')
const noop = require('gulp-noop')
const getFrontmatter = require('./get-frontmatter')
const wrap = require('gulp-wrap')
const ejs = require('../../etc/gulp-ejs')
const markdown = require('./markdown')
const posthtml = require('gulp-posthtml')
const prettyUrls = require('./pretty-urls')
const touch = require('../../etc/gulp-touch')
const lazypipe = require('lazypipe')
const transform = require('through2').obj
const globals = require('./globals')
const Case = require('case')

const PAGES_PATH = `${process.cwd()}/src/pages`

const ejsLayout = (src) =>
  lazypipe().pipe(wrap, { src }, (file) => file.data, {
    engine: 'ejs',
    views: [`${process.cwd()}/src`],
  })

const collectGlobals = (key) => {
  return transform(async (file, enc, cb) => {
    if (file.isBuffer()) {
      const id = file.basename.replace(file.extname, '')
      const frontmatter = await getFrontmatter(file)
      globals[key] = {
        ...globals[key],
        [id]: frontmatter,
      }
    }
    cb(null, file)
  })
}

const createViewTasks = ({
  taskId,
  src,
  layout,
  dest,
  collectionKey,
  onChange = [],
}) => {
  const result = {}

  if (collectionKey) {
    result.collectGlobals = () => {
      return gulp.src(src).pipe(collectGlobals(collectionKey))
    }
  }

  const layoutPre = layout ? ejsLayout(layout) : noop
  const layoutBase = ejsLayout('src/layouts/base.ejs')

  const compileBase = (stream) => {
    return stream
      .pipe(
        data(async (file) => ({
          ...globals,
          frontmatter: await getFrontmatter(file),
          page: {
            path: file.path.startsWith(PAGES_PATH)
              ? file.path
                  .replace(PAGES_PATH, '')
                  .replace(/(index)?\.(html|md|ejs)$/, '')
              : undefined,
          },
        })),
      )
      .pipe(ejs())
      .pipe(gulpIf(/\.md$/, markdown()))
      .pipe(gulpIf(layoutPre, layoutPre()))
      .pipe(layoutBase())
      .pipe(posthtml())
      .pipe(prettyUrls())
      .pipe(gulp.dest(dest))
  }

  result.compile = () =>
    compileBase(gulp.src(src, { since: gulp.lastRun(result.compile) }))

  result.compileAll = () => compileBase(gulp.src(src).pipe(touch()))

  result.watch = () => {
    gulp.watch(src, gulp.parallel(result.compile, ...onChange))
    if (layout) {
      gulp.watch(layout, result.compileAll)
    }
  }

  Object.keys(result).forEach((key) => {
    Object.defineProperty(result[key], 'name', {
      value: Case.camel(`${taskId} ${key}`),
    })
  })

  return result
}

module.exports = createViewTasks