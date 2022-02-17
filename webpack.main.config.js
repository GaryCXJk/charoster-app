const path = require('path');
const plugins = require('./webpack.main.plugins');

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  plugins,
  resolve: {
    alias: {
      '@@helpers': path.resolve(__dirname, 'src/helpers'),
    }
  },
  externals: {
    sharp: 'commonjs sharp',
  },
};
