const rules = require('./webpack.rules');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const assets = [ 'images', 'fonts' ]; // asset directories

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

rules.push({
  test: /\.s[ac]ss$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'sass-loader' }],
});

rules.push({
  test: /\.svg$/,
  use: [{ loader: 'svg-loader' }],
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: assets.map(asset => {
    return new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/assets', asset),
          to: path.resolve(__dirname, '.webpack/renderer/assets', asset)
        },
    ]});
  }),
  resolve: {
    alias: {
      '@@helpers': path.resolve(__dirname, 'src/helpers'),
      '@components': path.resolve(__dirname, 'src/renderer/components'),
    }
  },
};
