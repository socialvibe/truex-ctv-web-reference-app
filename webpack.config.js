const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

const generateAppConfig = require('./generate-config');

module.exports = function(env) {
    // Generate the config module that exposes the build configuration to the runtime code base.
    generateAppConfig(env);

    return {
        mode: 'development',
        entry: {
            main: [
                './src/main.js',
                './src/main.scss'
            ],
        },
        output: {
            filename: '[name].[hash].js',
            path: path.resolve(__dirname, 'dist'),
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    use: ['style-loader', 'css-loader', 'sass-loader']
                },
                {
                    test: /\.html$/,
                    exclude: /node_modules/,
                    use: [{
                        loader: 'html-loader',
                        options: {
                            minimize: false
                        },
                    },],
                },
                {
                    test: /\.(jpeg|.jpg|gif|png)$/i,
                    exclude: /node_modules/,
                    use: 'file-loader',
                },
                {
                    test: /\.svg$/i,
                    exclude: /node_modules/,
                    use: 'svg-inline-loader',
                },
                {
                    test: /\.js$/,
                    use: 'babel-loader',
                    include: [
                        path.resolve(__dirname, 'src'),
                        path.resolve(__dirname, 'node_modules/truex-shared/src'),
                    ],
                },
            ],
        },
        resolve: {
            alias: {
                'truex-shared': path.resolve(__dirname, './node_modules/truex-shared/src/'),
            },
        },
        plugins: [
            new HtmlWebpackPlugin({
                filename: 'index.html',
                template: './src/index.html',
                chunks: ['main'],
            })
        ],
        devtool: 'cheap-module-source-map'
    };
};
