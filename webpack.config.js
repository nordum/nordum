const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      main: './src/js/main.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'build/assets/js'),
      filename: '[name].js',
      chunkFilename: '[name].chunk.js',
      clean: true,
      publicPath: '/assets/js/'
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: '../fonts/[name][ext]'
          }
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: '../images/[name][ext]'
          }
        }
      ]
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.NORDUM_VERSION': JSON.stringify(require('./package.json').version),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString())
      }),
      
      new webpack.ProvidePlugin({
        // Make common utilities available globally
        'NordumUtils': path.resolve(__dirname, 'src/js/utils/index.js')
      })
    ],
    
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@js': path.resolve(__dirname, 'src/js'),
        '@css': path.resolve(__dirname, 'src/styles'),
        '@data': path.resolve(__dirname, 'data'),
        '@utils': path.resolve(__dirname, 'src/js/utils'),
        '@components': path.resolve(__dirname, 'src/js/components'),
        '@tools': path.resolve(__dirname, 'src/js/tools')
      }
    },
    
    optimization: {
      minimize: isProduction
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'build'),
      },
      port: 3001,
      hot: true,
      open: false,
      historyApiFallback: {
        rewrites: [
          { from: /^\/da\//, to: '/da/index.html' },
          { from: /^\/nb\//, to: '/nb/index.html' },
          { from: /^\/nn\//, to: '/nn/index.html' },
          { from: /^\/sv\//, to: '/sv/index.html' },
          { from: /^\/nordum\//, to: '/nordum/index.html' },
          { from: /./, to: '/index.html' }
        ]
      },
      
      setupMiddlewares: (middlewares, devServer) => {
        // Add custom middleware for API endpoints during development
        devServer.app.get('/api/dictionary/:word', (req, res) => {
          // Mock dictionary API for development
          const word = req.params.word;
          res.json({
            word,
            definition: `Mock definition for ${word}`,
            translations: {
              norwegian: word,
              danish: word,
              swedish: word,
              english: word
            }
          });
        });
        
        return middlewares;
      }
    },
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 250000,
      maxAssetSize: 250000
    },
    
    stats: {
      children: false,
      chunks: false,
      modules: false,
      reasons: false,
      usedExports: false,
      providedExports: false,
      optimizationBailout: false,
      errorDetails: true,
      colors: true
    }
  };
};