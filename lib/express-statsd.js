var Lynx = require('lynx');
var hostname = require('os').hostname();

var options = {
    host: 'statsd',
    port: 8125
};

var client = new Lynx(options.host, options.port, options);

var expressStatsd =  function(options) {
    return function(req, res, next) {
        var startTime = new Date().getTime();
        var path = req.path.replace(/\./g, '-').replace(/\//g, '-');

        if(path != "-" && path[path.length-1]=="-"){
            path = path.substring(0,path.length-1);
        }

        // Function called on response finish that sends stats to statsd
        function sendStats() {
            if (hostname.indexOf("local") != -1) {
                cleanup();
                return;
            }
            var app = options.app;
            var key = hostname + "."+path;


            // Status Code
            var statusCode = res.statusCode || 'unknown_status';
            client.increment(app + '.' + 'status-code-' + statusCode + "." + key);

            // Response Time
            var duration = new Date().getTime() - startTime;
            client.timing(app + '.' + 'response-time' + "." + key, duration);

            // Total requests
            client.increment(app + '.' + 'requests' + "." + key);

            cleanup();
        }

        // Function to clean up the listeners we've added
        function cleanup() {
            res.removeListener('finish', sendStats);
            res.removeListener('error', cleanup);
            res.removeListener('close', cleanup);
        }

        // Add response listeners
        res.once('finish', sendStats);
        res.once('error', cleanup);
        res.once('close', cleanup);

        if (next) {
            next();
        }
    }
};


var increment =  function(key) {
    client.increment(key);
};

var timer =  function(key,duration) {
    client.timing(key, duration);
};

module.exports =  {
    expressStatsd:expressStatsd,
    increment:increment,
    timer:timer
};