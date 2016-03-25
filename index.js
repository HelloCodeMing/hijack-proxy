const http = require('http');
const https = require('https');
const fs = require('fs');
const net = require('net');
const url = require('url');
const log4js = require('log4js');

log4js.configure({
    appenders: [
        { type: 'console' },
        { type: 'file', filename: 'log/proxy.log' }
    ]
});

const logger = log4js.getLogger();

const proxy_ip = 'localhost';
const http_proxy_port = 8080;
const https_proxy_port = 8081;
const key_path = './douban.key';
const cert_path = './douban.crt';

/**
 * dump request
 */
function dump_request(req) {
    let dump = {
        url: req.url,
        host: req.headers.host || req.headers.hostname,
        headers: req.headers
    };
    logger.info(JSON.stringify(dump));
}

function connect_handler(c_req, c_sock) {
    let u = url.parse('http://' + c_req.url);
    let p_sock = net.connect(https_proxy_port, proxy_ip, () => {
        c_sock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        p_sock.pipe(c_sock);
    }).on('error', (e) => {
        c_sock.end();
    });
    c_sock.pipe(p_sock);
}

function transmit(req, res, request) {
    let u = url.parse(req.url);
    let options = {
        host : u.host || req.headers.host,
        hostname: u.hostname || req.headers.hostname,
        port: u.port || req.headers.port,
        path : u.path || req.headers.path,
        method : req.method,
        headers : req.headers
    };
    let c_req = request(options, function (c_res) {
        res.writeHead(c_res.statusCode, c_res.headers);
        c_res.pipe(res);
    }).on('error', (e) => {
        res.end();
    });
    req.pipe(c_req);
}

function https_proxy(req, res) {
    dump_request(req);
    transmit(req, res, https.request);
}

function http_proxy(req, res) {
    dump_request(req);
    transmit(req, res, http.request);
}

let options = {
    key: fs.readFileSync(key_path),
    cert: fs.readFileSync(cert_path)
};

http.createServer()
    .on('request', http_proxy)
    .on('connect', connect_handler)
    .listen(http_proxy_port, proxy_ip);

https.createServer(options)
     .on('request', https_proxy)
     .listen(https_proxy_port, proxy_ip);
