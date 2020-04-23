process.env.DEBUG = 'node-app-hive*';

const http = require('http');

let log = [];

log.push({WORKER_PARAMS: process.env.WORKER_PARAMS});

const workerParams = JSON.parse(process.env.WORKER_PARAMS);

http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Hello World!');
    res.write(JSON.stringify(log));
    res.end();
}).listen(workerParams);
