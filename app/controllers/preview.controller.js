// Invoke 'strict' JavaScript mode
'use strict';

var config = require( '../../config/config' ),
	mailgun = require( 'mailgun-js' )( { apiKey: config.mailgunOptions.api_key, domain:config.mailgunOptions.domain } ),
	salt = config.mailgunSecret,
	md5 = require("blueimp-md5").md5;

// Create a new 'render' controller method
exports.render = function( req, res ) {
	// Use the 'response' object to render the 'preview' view with json
	res.render( 'preview.view.jade' );
};

// Create a new 'subscribe' controller method
exports.subscribe = function( req, res ) {
    // validate the input
    req.checkBody( 'email', 'Email is required' ).notEmpty();
  	req.checkBody( 'email', 'Email does not appear to be valid' ).isEmail();
	req.checkBody( 'zipcode', 'Zipcode is required' ).notEmpty();
	req.checkBody( 'zipcode', 'Zipcode must be 5 digits' ).len( 5, 5 );
	req.checkBody( 'zipcode', 'Zipcode must be numeric' ).isNumeric();

  	// check the validation object for errors
  	var errors = req.validationErrors();
  	
  	if ( errors ) {
  		// create response for errors and send
  		var json_res = { flash: { success: false, messages: errors } };

  		sendResponse( req, res, json_res );
  	} else {
  		// subscribe user and send back response

  		// user
  		var subscriber = {
  			subscribed: false,
			address: req.body.email.toLowerCase(),
		 	vars: { zipcode: req.body.zipcode }
		};

		// // mailing list
		var list = mailgun.lists( config.mailgunOptions.mailing_list_address );

		// add user to the list
		list.members().create( subscriber, function( err, data ) {
			onSubscribeResponse( req, res, err, data ); 
		} );
  	}
};

// callback for mailgun service when user is subscribed
var onSubscribeResponse = function( req, res, err, data ) {
	// create the JSON response
	var json_res;

    if ( err !== undefined ) {
    	// there's an error from the mail service.
    	var errors = [ { param: 'email', msg: data.message, value: '' } ];
    	
    	json_res = { flash: { success: false, messages: errors } };	
    } else {
    	// prepare successful JSON response and send confirmation email

    	// successful subscription.
    	json_res = { flash: { success: true, messages: [ { msg: 'A confirmation email has been sent!' } ] } };

    	// send confirmation email
    	sendConfirmationEmail( req.get('host'), data.member );
    }

    // deliver the response
    sendResponse( req, res, json_res );
};

// method for either rendering the view for a brower or JSON for ajax request
var sendResponse = function( req, res, json_res ) {
  	var is_ajax_request = req.xhr;

  	// if ajax request, respond with json, otherwise render template with errors
  	if ( is_ajax_request ) {
  		res.json( json_res.flash );
  	} else {
  		res.render( 'preview.view.jade', json_res );
  	}
}; 

// send confirmation email for user to confirm subscription
var sendConfirmationEmail = function( host, member ) {
	// normalize email address for hash and encrypt with salt
  	var email = member.address.toLowerCase(),
  		hash = md5( email, salt ),
  		url = "http://" + host + "/preview/thankyou/?c=" + hash + "&e=" + email,
  		unsubscribeURL = "http://" + host + "/preview/unsubscribe/?e=" + email,
  		msg = '<p>Hello, please confirm you want to receive marketing emails from Hudson Wilder by clicking on the below link </p><p><a href="' + url + '" target="_blank">Join us</a></p><br><p><a href="' + unsubscribeURL + '" target="_blank">Unsubscribe</a></p>';

	var data = {
		from: 'Hudson Wilder <confirmation@hudsonwilder.com>',
		to: email,
		subject: 'Please Confirm',
		html: msg
	};

	mailgun.messages().send( data, function ( error, body ) {
	} );
};

// Placeholder for thankyou methods
exports.thankyou = {};

// renders page for users coming from confirmation email link
exports.thankyou.render = function( req, res ) {
	// confirm the hash by using the provided email and secret to compare against provided hash
	var email = req.query.e,
		confirmationHash = req.query.c,
  		hash = md5( email, salt ),
  		confirmed = hash === confirmationHash ? true : false;

  	// check if confirmed
  	if ( confirmed ) {
  		// complete the subscription with the mail service 

		// mailing list
		var list = mailgun.lists( config.mailgunOptions.mailing_list_address );

		// update member and finish confirmation by sending email
		list.members( email ).update( { subscribed: 'true' }, function ( err, body ) {

			if ( err ) {
				res.render( 'thankyou.view.jade', {
					title: 'Server Error!'
				} );
			} else {
				sendCompleteEmail( req.get('host'), body );

				res.render( 'thankyou.view.jade', {
					title: 'Welcome to Hudson Wilder...'
				} );
			}
		});	
  	} else {
  		// render page for incorrect hash
  		res.render( 'thankyou.view.jade', {
			title: 'Incorrect Hash!'
		} );
  	}	
};

// send email after users completes confirmation step
var sendCompleteEmail = function ( host, body ) {
	// normalize email address for delivery and construct message
  	var email = body.member.address.toLowerCase(),
  		unsubscribeURL = "http://" + host + "/preview/unsubscribe/?e=" + email,
  		msg = '<p>Thank you for signing up!</p><br><p><a href="' + unsubscribeURL + '" target="_blank">Unsubscribe</a></p>';

  	// build email
	var data = {
		from: 'Hudson Wilder <confirmation@hudsonwilder.com>',
		to: email,
		subject: 'Thank you!',
		html: msg
	};

	// send email
	mailgun.messages().send( data, function ( error, body ) {
	} );
};

// Placeholder for thankyou methods
exports.unsubscribe = {};

// renders page for users coming from unsubscribe email link
exports.unsubscribe.render = function( req, res ) {
	var email = req.query.e !== undefined ? req.query.e.toLowerCase() : '';

	// render page for unsubscribe
  	res.render( 'unsubscribe.view.jade', {
		email: email
	} );
};

// Create a new 'unsubscribe' controller method
exports.unsubscribe.unsubscribe = function( req, res ) {
	// validate the input
    req.checkBody( 'email', 'Email is required' ).notEmpty();
  	req.checkBody( 'email', 'Email does not appear to be valid' ).isEmail();

  	// check the validation object for errors
  	var errors = req.validationErrors();
  	var email = req.body.email.toLowerCase();

  	if ( errors ) {
  		// create response for errors and send
  		var json_res = { flash: { success: false, messages: errors }, email: email };

  		sendUnsubscribeResponse( req, res, json_res );
  	} else {
  		// unsubscribe user and send back response

		// mailing list
		var list = mailgun.lists( config.mailgunOptions.mailing_list_address );

		// remove user from the list
		list.members(email).delete( function( err, data ) {
			onUnsubscribeResponse( req, res, err, data ); 
		} );
  	}
};

// method for either rendering the view for a brower or JSON for ajax request
var sendUnsubscribeResponse = function( req, res, json_res ) {
  	var is_ajax_request = req.xhr;

  	// if ajax request, respond with json, otherwise render template with errors
  	if ( is_ajax_request ) {
  		res.json( json_res.flash );
  	} else {
  		res.render( 'unsubscribe.view.jade', json_res );
  	}
}; 

// callback for mailgun service when user is unsubscribed
var onUnsubscribeResponse = function( req, res, err, data ) {
	// create the JSON response
	var json_res;

    if ( err !== undefined ) {
    	// there's an error from the mail service.
    	var errors = [ { param: 'email', msg: 'Subscription not found.', value: '' } ];
    	
    	json_res = { flash: { success: false, messages: errors } };	
    } else {
    	// prepare successful JSON response and add to unsubscribe list

    	// mailing list
		var unsubscribers = mailgun.unsubscribes();

		// user
  		var unsubscriber = {
			address: req.body.email.toLowerCase(),
			tag: '*'
		};

		// add to list
		unsubscribers.create(unsubscriber, function( err, data ) { 
		} );

    	// successful removal.
    	json_res = { flash: { success: true, messages: [ { msg: 'You have been removed.' } ] } };
    }

    // clear out the email
    json_res.email = '';

    // deliver the response
    sendUnsubscribeResponse( req, res, json_res );
};




