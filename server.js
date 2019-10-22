const express = require("express")
require('dotenv').config()
app = express()

if(process.argv[2] && process.argv[2] === 'prod') {
	console.log("Running in prod!");
} else {
	const webpack = require('webpack');
	const middleware = require('webpack-dev-middleware');
	const configs = require('./webpack.config.js')
	const compiler = webpack(configs);
	app.use(middleware(compiler, { index:'./public/index.html' }));	
}

app.use(express.static('public'))
// app.get('/hello', (req, res) => res.send("world"));

app.listen(process.env.PORT,  () => console.log("Visual query builder listening!"));