const debug = require('debug')('nodeAppHive:workers');

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
        process.on('message', (data) => this.handleMasterCommand(data));

        // Run worker script:
        this.util.prepSocket(socket);
        const script = this.conf.worker_script;
        (function () {
            require(script);
        })();
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
            case this.priv.reload_arg:
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
