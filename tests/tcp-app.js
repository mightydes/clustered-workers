#!/bin/sh
':' //; exec /usr/bin/env node "$0" "$@"

process.env.DEBUG = 'node-app-hive*';

const hive = require('../src');

hive.bind('test-app', {
    command_conn: {
        port: 4000,
        host: 'localhost'
    },
    command_exec_time: 20000,
    worker_conn: {
        // port: '4001 + %numworker',
        port: 8080,
        host: 'localhost'
    },
    worker_script: require.resolve('./tcp-worker'),
    worker_startup_time: 9000,
    numworkers: 2,
    watch_glob: [
        `${__dirname}/**/*.{js,json}`,
        `${__dirname}/../src/**/*.{js,json}`,
    ],
    exit_policy: 'SIGTERM',
}).runtime();
