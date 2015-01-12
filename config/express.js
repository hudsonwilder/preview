// Invoke 'strict' JavaScript mode
'use strict';

// Load the module dependencies
var config = require('./config'),
	express = require('express'),
	morgan = require('morgan'),
	compress = require('compression'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	validator = require('express-validator'),
	flash = require('connect-flash'),
	path = require('path');

// Define the Express configuration method
module.exports = function() {
	// Create a new Express application instance
	var app = express();

	// Use the 'NDOE_ENV' variable to activate the 'morgan' logger or 'compress' middleware
	if (process.env.NODE_ENV === 'development') {
		app.use(morgan('dev'));
	} else if (process.env.NODE_ENV === 'production') {
		app.use(compress());
	}

	// Use the 'body-parser' and 'method-override' middleware functions
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());
	app.use(validator());
	app.use(methodOverride());

	// Configure the 'session' middleware
	app.use(session({
		saveUninitialized: true,
		resave: true,
		secret: config.sessionSecret
	}));

	// Set the application view engine and 'views' folder
	app.set('views', path.join(__dirname + '/../app/views'));
	app.set('view engine', 'jade');

	// Configure the flash messages middleware
	app.use(flash());

	// Load the routing files
	require('../app/routes/index.routes.js')(app);
	require('../app/routes/preview.routes.js')(app);

	// Configure static file serving
	app.use(express.static(path.join(__dirname, '/../public')));

	// Return the Express application instance
	return app;
};