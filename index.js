var express = require('express');
var app=express();
var bodyParser= require('body-parser');
var config=  require('./config.js');
var port=8070;
var redis = require('redis'),client = redis.createClient();
var https=require('https');


var githubOAuth = require('github-oauth')({
  githubClient: config.GITHUB_KEY,
  githubSecret: config.GITHUB_SECRET,
  baseURL: 'http://localhost:' + port,
  loginURI: '/auth/github',
  callbackURI: '/auth/github/callback'
})
app.get('/auth/github', function(req, res){
  console.log("started oauth");
  return githubOAuth.login(req, res);
});

app.get('/auth/github/callback', function(req, res){
  console.log("received callback");
  return githubOAuth.callback(req, res);
});

githubOAuth.on('error', function(err) {
  console.error('there was a login error', err)
})

githubOAuth.on('token', function(token, serverResponse) {
  serverResponse.end(JSON.stringify(token))
  let key=token['access_token'],value=token['access_token'];
  
  client.hset('User_Aut', key, value, redis.print);
  
})

app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static('./'));

app.use((req, res, next)=>{
        // check header or url parameters or post parameters for token
        var token = req.body.token || req.query.token || req.headers['x-access-token'];
        if(token){
         
		  client.hget('User_Aut', token, function (err, obj){
				if(obj==null){
					 res.status(403).json({
                message:"Wrong Token"
              });
				}
				else{
					next();
				}
			  			  
		  });
        }
        else{
          res.status(403).json({
            message:"No Token"
          });
        }
});

app.get('/getPlace',(req,res)=>{
	var key=req.headers.lat+req.headers.longu+req.headers.rad;
		client.hget("HSET Placerecord", key, function (err, obj) {
		
	   if(obj==null){	
	console.log("First Time");
	var uri='https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+req.headers.lat+','+req.headers.longu+'&radius='+req.headers.rad+'&type=restaurant&keyword=cruise&key=AIzaSyCOwIo8ixCG4ElF0Y-a3uQsEsSczXDZcP8'
	console.log(uri);
	https.get(uri, (resp) => {
	let data = '';

	// A chunk of data has been recieved.
	resp.on('data', (chunk) => {
	data += chunk;
	client.hset('HSET Placerecord', key, data, redis.print);

	}); 
	// The whole response has been received. Print out the result.
	resp.on('end', () => {
	res.send(data);
	});

	}).on("error", (err) => {
	console.log("Error: " + err.message);
	   
	});
	}
	else{
		console.log("already exist.");
		res.send(obj);
	}
	});
});
app.listen(port, function(){
  console.log('listening on port 8070');
});