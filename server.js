const express = require("express")
const { Pool } = require('pg')
const app = express()
require('dotenv').config()
const env = process.env
const pool = new Pool({
  connectionString: env.DATABASE_URL
})

if(process.argv.length > 2 && process.argv[2] === 'prod') {
	console.log("Running in prod!");
} else {
	const webpack = require('webpack');
	const middleware = require('webpack-dev-middleware');
	const configs = require('./webpack.config.js')
	const compiler = webpack(configs);
	app.use(middleware(compiler, { index:'./public/index.html' }));	
}

app.use(express.static('public'))

app.get('/query', (req, res) => {
	const terminatorIdx = req.query.q.indexOf(';');
	const constructedQuery = (terminatorIdx > -1 ? req.query.q.substring(0, terminatorIdx) : req.query.q) + " LIMIT 1000"
	console.log(constructedQuery)
	//Restrict to read queries - A bit naive, but it will do for now
	if(constructedQuery.substring(0,6).toUpperCase() === "SELECT"){
		pool.query(constructedQuery).then(rs => {
			res.json(rs.rows)
		}).catch(e => {
			res.status(500).send(e.message)
		})
	} else {
		res.status(500).send("This query is not supported")
	}

});

app.listen(process.env.PORT,  () => console.log("Visual query builder listening!"));