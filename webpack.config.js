const path = require("path");
const webpack = require('webpack');

module.exports = {
    entry: "./src/js/app.js",
    module: {
        rules: [
	        {
	            test:/\.(s*)css$/,
	            loaders:['style-loader','css-loader', 'sass-loader']
	        },
          	{
	            test: /\.(js|jsx)$/,
	            exclude: /node_modules/,
	            use: {
	              	loader: "babel-loader",
	                options: {
	          			presets: ['react']
	        		}
	            }
          	},
          	{
                test: /\.png$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'img/'
                    }
                }]
            },
            {
                test: /\.(woff(2*)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[ext]',
                        outputPath: 'fonts/'
                    }
                }]
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js', '.jsx']
    },
    devtool: 'source-map',
    output: {
        path: path.join(__dirname, "public"),
        filename: "bundle.js",
        publicPath: "/"
    }, 
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ],
    devServer: {
        hot: true,
        historyApiFallback: true
    }
};