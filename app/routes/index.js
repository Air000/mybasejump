'use strict';

var linkifyjs = require("linkifyjs");
var googleapis = require("googleapis");
var customsearch = googleapis.customsearch('v1');
const API_KEY = 'AIzaSyCohpypclJBMcPy5nXXN2vNKlsbrATCzrg';
const CX = '005349598196185284476:xuxolxmchfk';
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
		/********************this block for Url shorten********************************/
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
								});
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
		/********************************************************************************/	
		
		/*****************this block for Image Search Abstraction Layer******************/
		
		var imageSearchSchema = mongoose.Schema({
			term: String,
			when: String
		});
		var ImageSearch = mongoose.model('ImageSearch', imageSearchSchema);
		app.route('/api/imagesearch')
			.get(function(req, res) {
			    res.sendFile(path + '/public/search.html');
			});
	
		app.route('/api/imagesearch/*')
			.get(function(req, res) {
			    //console.log(req)
			    var queryItem = req.params[0];
			    var offset = req.query.offset || 1;
			    console.log(queryItem, offset);
			    
			    customsearch.cse.list({ cx: CX, q: queryItem, start: offset, searchType: 'image', num: 10, auth: API_KEY }, function(err, resp) {
				  if (err) {
				    res.send(err);
				    return;
				  }
				  // Got the response from custom search
				  var reformatItems = resp.items.map(function(item) {
				  	var rItem = {};
				  	rItem.url = item.link;
				  	rItem.snippet = item.snippet;
				  	rItem.thumbnail = item.image.thumbnailLink;
				  	rItem.context = item.image.contextLink;
				  	
				  	return rItem;
				  })
				  res.send(reformatItems);
				  
				  var searchRecord = new ImageSearch({term: queryItem, when: new Date().toISOString()});
				  searchRecord.save(function(err) {
						if(err) console.log(err);
					});
				});
			});
		app.route('/api/latestsearch')
			.get(function(req, res) {
			    ImageSearch.find().sort('-_id').limit(10).exec(function (err, latestSearch) {
			    	if(err) console.log(err);
			    	
			    	res.send(latestSearch.map(function(record) {
			    		var rRecord = {};
			    		rRecord.term = record.term;
			    		rRecord.when = record.when;
			    		
			    		return rRecord;
			    	}));
			    });
			    
			});
			
			
		/*********************************************************************************/	
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
		});
		
	// app.route('/api/imagesearch')
	// 	.get(function(req, res) {
	// 	    res.sendFile(path + '/public/search.html');
	// 	});
	
	// app.route('/api/latestsearch')
	// 	.get(function(req, res) {
		    
	// 	});
	
};
