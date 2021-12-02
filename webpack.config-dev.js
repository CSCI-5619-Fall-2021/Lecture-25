const merge = require('webpack-merge');
const path = require('path');
const fs = require('fs');
const common = require('./webpack.common.js');

// App directory
const appDirectory = fs.realpathSync(process.cwd());

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',

    devServer: {
        contentBase: path.resolve(appDirectory),
        publicPath: '/',
        compress: true,
        hot: true,
        open: true,
        disableHostCheck: true,

        // enable this if you are using the custom WebXR emulator
        useLocalIp: true,
        host: '0.0.0.0', 

        // required for remote connections with WebXR if you are not using ngrok
        //https: true,
    }    
});