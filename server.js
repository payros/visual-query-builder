const express = require("express")
const { Pool } = require('pg')
const app = express()
require('dotenv').config()
const env = process.env
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
  	rejectUnauthorized: false
  }
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
	const constructedQuery = (terminatorIdx > -1 ? req.query.q.substring(0, terminatorIdx) : req.query.q).replace(/\sLIMIT.*$/i, '') + " LIMIT 1000"
	console.log(constructedQuery)
	//Restrict to read queries - A bit naive, but it will do for now
	if(constructedQuery.substring(0,6).toUpperCase() === "SELECT"){
		pool.query(constructedQuery).then(rs => {
			res.json(rs.rows)
		}).catch(e => {
			res.status(500).send({pos:e.position, msg:e.message.replace(' at or near "LIMIT"', '')})
		})
	} else {
		res.status(500).send({pos:1, msg:"This query is not supported"})
	}

});


app.get('/get-schema', (req, res) => {
	const queryStr = "SELECT table_name,column_name,data_type FROM pg_catalog.pg_tables tb LEFT JOIN information_schema.COLUMNS cl ON tb.tablename=cl.table_name WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' ORDER BY table_name, column_name";
	console.log(queryStr)

	pool.query(queryStr).then(rs => {
		res.json(rs.rows.reduce((obj, row) => {
			if(!obj.hasOwnProperty(row.table_name)) obj[row.table_name] = []
			obj[row.table_name].push({name:row.column_name, type:row.data_type})
			return obj
		}, {}))
	}).catch(e => {
		res.status(500).send(e.message)
	})

});

app.listen(process.env.PORT,  () => console.log("Visual query builder listening!"));
