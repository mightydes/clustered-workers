const debug = require('debug')('node-app-hive:workers');
const _ = require('underscore');
const WorkerReady = require('./signals/worker-ready');

class Workers {

    constructor(util) {
        this.util = util;
        this.priv = util.getPrivate();
        this.conf = util.getConfig();

    }

    runForked() {
        const socket = process.env[this.priv.worker_sock_key];
        this.util.log(`Run worker: ${socket}`);

        // Listen for master commands:
        process.on('message', (message) => this.handleMasterMessage(message));

        // Run worker script:
        this.util.prepSocket(socket);
        const script = this.conf.worker_script;
        (function () {
            require(script);
        })();
        const signal = new WorkerReady(socket);
        process.send(signal.getBody());
    }

    /**
     * @private
     * @param {*} message
     */
    handleMasterMessage(message) {
        if (_.isObject(message) && message.type === 'WorkerCommand') {
            this.handleMasterCommand(message);
        }
    }

    /**
     * @private
     * @param {Object} data
     */
    handleMasterCommand(data) {
        const socket = process.env[this.priv.worker_sock_key];
        const command = data.command;
        debug(`Worker '${socket}' command received:`, command);
        switch (command) {
            case this.priv.restart_arg:
                data.response = `WORKER ${socket}\n\tReloading...`;
                process.send(data);
                process.exit();
                break;
            case this.priv.status_arg:
                const mb = this.util.getMemoryUsageMB();
                data.response = `WORKER ${socket}\n\tMemory usage: ~${mb} mb`;
                process.send(data);
                break;
            default:
                data.response = `WORKER ${socket}\n\tInvalid command: '${command}'!`;
                process.send(data);
        }
    }

}

Workers.__injectOptions = ['asProvider', (di) => new Workers(di.util())];

module.exports = Workers;
