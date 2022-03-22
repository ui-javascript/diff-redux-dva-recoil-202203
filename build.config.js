const { getEntry } = require('./mpa.utils')
const { CONFIG } = require('./mpa.config')

const mpaEntries = getEntry(CONFIG.entry);
console.log(mpaEntries.entry)

module.exports = {
  define: {
    env: process.env.NODE_ENV,
  },
  minify: 'esbuild',
  // entry: {
  //   demo: '_demo/index',
  // },
  entry: mpaEntries.entry,
  publicPath: './',
  outputDir: 'docs',
  plugins: [
    [
      'build-plugin-ignore-style',
      {
        libraryName: 'antd',
      },
    ],
  ],
};
