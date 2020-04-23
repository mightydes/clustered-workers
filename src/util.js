const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('node-app-hive:util');

const exitPolicies = {
    halt: 'halt',
    SIGTERM: 'SIGTERM',
};

const _defaultConfig = {
    numworkers: 1,
    command_exec_time: 2000, // per process
    worker_startup_time: 3000,
    watch_glob: null,
    watch_delay: 2000,
    exit_policy: exitPolicies.halt,
    baserun: path.normalize(`${__dirname}/../run`)
};

class Util {

    /**
     * @param {string} hiveName
     * @param {Object} hiveConfig
     */
    constructor(hiveName, hiveConfig = {}) {
        this.hiveName = hiveName;
        this.config = Object.assign({}, _defaultConfig, hiveConfig);
    }

    getConfig() {
        return this.config;
    }

    getHiveName() {
        return this.hiveName;
    }

    getMemoryUsageMB() {
        return Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
    }

    halt() {
        return process.exit();
    }

    /**
     * @param {string} str
     * @param {Object} sub
     * @returns {string}
     */
    substituteStr(str, sub) {
        _.each(sub, (val, key) => {
            str = str.replace('%' + key, val);
        });
        return str;
    }

    /**
     * @param {*} options
     */
    unlinkSocketSync(options) {
        if (!options.port && options.path) {
            // IPC socket:
            try {
                fs.unlinkSync(options.path);
            } catch (e) {
            }
        }
    }

    log(...args) {
        return this.stdOut('log', args, 'green');
    }

    warn(...args) {
        return this.stdOut('warn', args, 'yellow');
    }

    error(...args) {
        return this.stdOut('error', args, 'red');
    }

    /**
     * @private
     * @param {string} method
     * @param {Object} args
     * @param {string} color
     * @returns {*}
     */
    stdOut(method, args, color) {
        color || (color = 'white');
        Array.prototype.unshift.call(args, `[${Util.getSystemDateTime()}][${this.getHiveName()}]`[color]);
        return console[method].apply(null, args);
    }

}

Util.STATUS_ARG = 'status';
Util.RESTART_ARG = 'restart';
Util.RELOAD_ARG = 'reload';
Util.WATCH_ARG = 'watch';

Util.APP_RUNTIME = 'app';
Util.CMD_RUNTIME = 'cmd';

Util.WORKER_PARAMS_KEY = 'WORKER_PARAMS';

Util.exitPolicies = exitPolicies;

Util.getSystemDateTime = () => {
    const date = new Date();
    return date.getFullYear()
        + '-' + (date.getMonth() + 1).toString().padStart(2, '0')
        + '-' + date.getDate().toString().padStart(2, '0')
        + ' ' + date.getHours().toString().padStart(2, '0')
        + ':' + date.getMinutes().toString().padStart(2, '0')
        + ':' + date.getSeconds().toString().padStart(2, '0')
        + '.' + date.getMilliseconds().toString().padStart(2, '0');
};

module.exports = Util;
