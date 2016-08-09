var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var httpProxyRules = require('http-proxy-rules');
var fs = require('fs');
var _ = require('lodash');

var cfg = {
  listenPort: 80,
  sslPort: 443,
  proxyRules: {},
  defaultPath: "http://localhost:80",
  key: null,
  cert: null,
  ca: null
};

var readCFG = function(uri){
  try{
    var data = fs.readFileSync(uri);
  } catch(e){
    throw new Error("Config file read failed: "+uri);
  }
  try{
    _.extend(cfg,JSON.parse(data));
    console.log('> config file successfully parsed: '+uri);
  } catch(e){
    throw new Error("Malformed Config file: "+uri);
  }
};

readCFG(__dirname+"/res/cfg.json");

var proxyRules = new httpProxyRules({
  rules: cfg.proxyRules
});

var proxy = httpProxy.createProxyServer();
proxy.on('error',function(err,req,res){
  res.end();
});

var handlerFunction = function(req,res){
  var target = proxyRules.match(req);
  if(target){
    return proxy.web(req, res, {
      target: target
    });
  }

  res.writeHead(404, { 'context-type': 'application/json' });
  res.end(JSON.stringify({
    error: "where are you going?"
  }));
};

http.createServer(handlerFunction).listen(cfg.listenPort,function(){
  console.log('> proxy listening on :',cfg.listenPort);
});

if(cfg.key && cfg.cert && cfg.ca){
  var sslOpts = {
    key: fs.readFileSync(cfg.key),
    cert: fs.readFileSync(cfg.cert),
    ca: fs.readFileSync(cfg.ca)
  };

  https.createServer(sslOpts,handlerFunction).listen(cfg.sslPort,function(){
    console.log('> ssl proxy listening on :',cfg.sslPort);
  });
}
