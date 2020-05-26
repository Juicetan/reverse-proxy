var http = require('http');
var https = require('https');
var static = require('node-static');
var httpProxy = require('http-proxy');
var httpProxyRules = require('http-proxy-rules');
var fs = require('fs');
var _ = require('lodash');

var packageConfig = JSON.parse(fs.readFileSync('./package.json'));

var cfg = {
  listenPort: 80,
  sslPort: 443,
  proxyRules: {},
  defaultPath: "http://localhost:80",
  key: null,
  cert: null,
  ca: null,
  PUBLIC: '/public'
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

var fileServer = new static.Server('.'+cfg.PUBLIC, {
  serverInfo: packageConfig.version
});

var proxyRules = new httpProxyRules({
  rules: cfg.proxyRules
});


var proxy = httpProxy.createProxyServer();
proxy.on('error',function(err,req,res){
  console.log('> proxy error', err);
  res.end();
});

var handlerFunction = function(req,res){
  var target = proxyRules.match(req);
  if(target){
    if(target === cfg.PUBLIC){
      req.addListener('end', function(){
        fileServer.serve(req, res);
      }).resume();
      return;
    } else{
      return proxy.web(req, res, {
        target: target
      });
    }
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
