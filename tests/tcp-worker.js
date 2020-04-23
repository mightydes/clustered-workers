process.env.DEBUG = 'node-app-hive*';

const http = require('http');

let log = [];

log.push({WORKER_PARAMS: process.env.WORKER_PARAMS});

const workerParams = JSON.parse(process.env.WORKER_PARAMS);

const response_delay = 0;
const listen_delay = 5000;

const server = http.createServer((req, res) => {
    setTimeout(() => {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write('Hello World!');
        res.write(JSON.stringify(log));
        res.end();
        // throw new Error('Test!');
    }, response_delay);
});

setTimeout(() => {
    server.listen(workerParams);
    // server.listen(8080);
}, listen_delay);

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    server.close(() => {
        console.log('Http server closed.');
        process.exit();
    });
});
