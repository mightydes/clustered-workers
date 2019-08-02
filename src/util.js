const _ = require('underscore');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('node-app-hive:util');

const STATUS_ARG = 'status';
const RESTART_ARG = 'restart';
const RELOAD_ARG = 'reload';
const WATCH_ARG = 'watch';

const APP_RUNTIME = 'app';
const CMD_RUNTIME = 'cmd';

const WORKER_SOCK_KEY = 'WORKER_SOCKET';

const _private = {
    status_arg: STATUS_ARG,
    restart_arg: RESTART_ARG,
    reload_arg: RELOAD_ARG,
    watch_arg: WATCH_ARG,
    allowed_arguments: [STATUS_ARG, RESTART_ARG, RELOAD_ARG, WATCH_ARG],
    app_runtime: APP_RUNTIME,
    cmd_runtime: CMD_RUNTIME,
    command_exec_ttl: 5000, // ms -- max exec time for a single process
    worker_sock_key: WORKER_SOCK_KEY,
    watch_delay: 2000 // ms
};

const _defaultConfig = {
    env: 'development',
    run_folder: '/tmp',
    command_socket: 'command.sock',
    worker_script: '',
    worker_socket: 'worker%numworker.sock',
    numworkers: 1,
    watch_glob: null
};

class Util {

    /**
     * @param {String} hiveName
     * @param {Object} hiveConfig
     */
    constructor(hiveName, hiveConfig) {
        this.hiveName = hiveName;
        this.config = _.extend(_defaultConfig, hiveConfig);
        this.commandSocket = null;
    }

    getPrivate() {
        return _private;
    }

    getConfig() {
        return this.config;
    }

    getHiveName() {
        return this.hiveName;
    }

    getSystemDateTime(isPrecise = false) {
        const date = new Date();
        return date.getFullYear()
            + '-' + (date.getMonth() + 1).toString().padStart(2, '0')
            + '-' + date.getDate().toString().padStart(2, '0')
            + ' ' + date.getHours().toString().padStart(2, '0')
            + ':' + date.getMinutes().toString().padStart(2, '0')
            + ':' + date.getSeconds().toString().padStart(2, '0');
    }

    getCommandSocket() {
        if (this.commandSocket === null) {
            const socketFile = this.substituteStr(this.getConfig().command_socket, {
                namehive: this.getHiveName()
            });
            this.commandSocket = path.join(this.getConfig().run_folder, socketFile);
        }
        return this.commandSocket;
    }

    getMemoryUsageMB() {
        return Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
    }

    getCommandEmitTtl(command) {
        const ttl = this.getPrivate().command_exec_ttl;
        switch (command) {
            case RELOAD_ARG:
                return ttl * this.getConfig('numworkers') + 1000;
            default:
                return ttl + 1000;
        }
    }

    getCommandExecTtl(command) {
        switch (command) {
            case RELOAD_ARG:
                return ttl * this.getConfig('numworkers');
            default:
                return this.getPrivate().command_exec_ttl;
        }
    }

    halt() {
        return process.exit();
    }

    /**
     * @param {String} str
     * @param {Object} sub
     * @returns {String}
     */
    substituteStr(str, sub) {
        _.each(sub, (val, key) => {
            str = str.replace('%' + key, val);
        });
        return str;
    }

    /**
     * @param {String} socketFilePath
     * @returns {String}
     */
    prepSocket(socketFilePath) {
        debug('prepSocket', socketFilePath);
        try {
            fs.unlinkSync(socketFilePath);
        } catch (e) {
        }
        return socketFilePath;
    }

    log(text) {
        return this.stdOut('log', arguments, 'green');
    }

    warn() {
        return this.stdOut('warn', arguments, 'yellow');
    }

    error() {
        return this.stdOut('error', arguments, 'red');
    }

    /**
     * @private
     * @param {String} method
     * @param {Object} args
     * @param {String} color
     * @returns {*}
     */
    stdOut(method, args, color) {
        color || (color = 'white');
        Array.prototype.unshift.call(args, `[${this.getSystemDateTime()}][${this.getHiveName()}][${this.getConfig().env}]`[color]);
        return console[method].apply(null, args);
    }

}

module.exports = Util;
