#!/bin/sh
':' //; exec /usr/bin/env node "$0" "$@"

process.env.DEBUG = 'node-app-hive*';

const hive = require('../src');

hive.bind('test-app', {
    command_conn: {
        path: `%baserun/%namehive.command.sock`,
    },
    worker_conn: {
        path: `%baserun/%namehive.worker%numworker.sock`,
    },
    worker_script: require.resolve('./ipc-worker'),
    numworkers: 2,
    watch_glob: [
        `${__dirname}/**/*.{js,json}`,
        `${__dirname}/../src/**/*.{js,json}`,
    ],
}).runtime();
