// Invoke 'strict' JavaScript mode
'use strict';

// Define the routes module' method
module.exports = function( app ) {
	// Load the 'preview' controller
	var preview = require( '../controllers/preview.controller' );

	// Mount the 'preview' controller's 'render' method
	app.get( '/preview', preview.render );
	// Mount the 'preview' controller's 'subscribe' method
	app.post( '/preview', preview.subscribe );
	// Mount the 'preview' controller's 'thankyou.render' method
	app.get( '/preview/thankyou', preview.thankyou.render );
	// Mount the 'preview' controller's  'unsubscribe.render' method
	app.get( '/preview/unsubscribe', preview.unsubscribe.render );
	// Mount the 'preview' controller's 'unsubscribe' method
	app.post( '/preview/unsubscribe', preview.unsubscribe.unsubscribe );
};