'use strict';

var linkifyjs = require("linkifyjs");
var path = process.cwd();

module.exports = function (app, mongoose) {

	function isLoggedIn (req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		} else {
			res.redirect('/login');
		}
	}
	
	var db = mongoose.connection;
	db.once("open", function(){
		var urlSchema = mongoose.Schema({
			original_url: String,
			short_url: String
		});
		var Urls = mongoose.model('Urls', urlSchema);
		
		app.route('/api/urlshorten')
			.get(function(req, res) {
				
				res.sendFile(path + '/public/urlshorten.html');
					
			});

		app.route('/api/urlshorten/*')
			.get(function(req, res) {
				
				
				var hostUrl = req.protocol + '://' + req.get('host').split(':')[0];
				var urlSuffix = req.originalUrl.slice('/api/urlshorten/'.length);
				
				console.log("hostUrl: ", hostUrl, req.originalUrl);
				
				if(linkifyjs.test(urlSuffix)) {
					
					var original_url = (/^https?:\/\//.test(urlSuffix))?urlSuffix:"http://" + urlSuffix;
					
					Urls.find({original_url: original_url}, function(err, urlfound){
						if(err) console.log(err);
						
						if(urlfound.length) {
							//url is in db
							console.log("urlfound1: ", urlfound);
							res.send(JSON.stringify({shorten_url: urlfound[0].short_url, original_url:urlfound[0].original_url}));
						}else{
							//insert new doc
							console.log("not url found");
							Urls.find().count(function(err, number) {
								if(err) console.log(err);
								
								var newUrl = new Urls({original_url: original_url, short_url: hostUrl + '/api/urlshorten/' + number});
								newUrl.save(function(err) {
									if(err) console.log(err);
								})
								console.log(number, newUrl);
								
								res.send(JSON.stringify({shorten_url: newUrl.short_url, original_url: newUrl.original_url}));
							});
							
						}
						
					});
				} else if(Number(urlSuffix)){
					//this is a short url, search it in DB
					Urls.find(function(err, doc) {
						if(err) console.log(err);
						
					});
					
					console.log("short_url: ", hostUrl);
					Urls.find({short_url: hostUrl + req.originalUrl}, function(err, urlfound) {
					    if(err) console.log(err);
					    
					    if(urlfound.length) {
					    	
					    	console.log("urlfound2: ", urlfound);
					    	res.redirect(urlfound[0].original_url);
					    }else{
					    	
					    	console.log(Number(urlSuffix));
					    	res.send(JSON.stringify({error: "No short url found for given input"}))
					    }
					})
					
				} else {
					res.send(JSON.stringify({error: "not a valid original url"}));
				}
				
				//res.send(req.originalUrl.slice('/api/urlshorten/'.length));
			});
	});

	app.route('/')
		.get(function (req, res) {
			res.sendFile(path + '/public/index.html');
		});
		
	app.route('/api/whoami')
		.get(function(req, res) {
			var ipaddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			var language = req.headers['accept-language'].split(',')[0];
			req.headers['user-agent'].match(/\(([^\(]+)\)/);
			var software = RegExp.$1;
			
			var returnInfo = {
				ipaddress: ipaddress, 
				language: language,
				software: software
			};
			
		    res.send(JSON.stringify(returnInfo));
		})
	
	
	
};
