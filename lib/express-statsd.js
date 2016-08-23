var extend = require('obj-extend');
var Lynx = require('lynx');
var hostname = require('os').hostname();

options = extend({
    host: '10.0.0.7',
    port: 8125
}, options);
var client = options.client || new Lynx(options.host, options.port, options);

var expressStatsd = function(req, res, next) {
    var startTime = new Date().getTime();

    // Function called on response finish that sends stats to statsd
    function sendStats() {
        if (hostname.indexOf("local") != -1) {
            hostname = "local";
            /*cleanup();
             return*/
        }
        var app = options.app;
        var path = req.path == "/" ? ".home" : "." + req.path.replace(/\//g, '-').substring(1);
        var key = hostname + path;

        // Status Code
        var statusCode = res.statusCode || 'unknown_status';
        client.increment(app + '.' + 'status-code-' + statusCode + "." + key);

        // Response Time
        var duration = new Date().getTime() - startTime;
        client.timing(app + '.' + 'response-time' + "." + key, duration);

        // Total requests
        client.increment(app + '.' + 'requests.' + key);

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
};

module.exports =  {
    expressStatsd:expressStatsd
};