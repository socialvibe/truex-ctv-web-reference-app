const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { WebpackPluginServe: Serve } = require('webpack-plugin-serve');
const path = require('path');

const generateAppConfig = require('./generate-config');

module.exports = function(env) {
    // Generate the config module that exposes the build configuration to the runtime code base.
    generateAppConfig(env);

    const outputPath = path.join(process.cwd(), '/dist');
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
            path: outputPath,
        },
        module: {
            rules: [
                // {
                //     test: /\.s?css$/,
                //     use: ['style-loader', 'css-loader']
                // },
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
                    test: /\.(jpe?g|gif|png|svg)/,
                    exclude: /node_modules/,
                    use: 'file-loader',
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
            }),
            new Serve({
                host: '0.0.0.0',
                port: 8080,
                static: outputPath
            })
        ],
        devtool: 'cheap-module-source-map'
    };
};
