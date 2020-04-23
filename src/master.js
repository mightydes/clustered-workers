const cluster = require('cluster');
const _ = require('underscore');
const debug = require('debug')('node-app-hive:master');
const Util = require('./util');
const Watcher = require('./watcher');
const CommandHandler = require('./command-handler');
const Signal = require('./signal');

class Master {

    constructor(util, command, workers) {
        this.util = util;
        this.conf = util.getConfig();
        this.command = command;
        this.workers = workers;
        this._hive = {};
        this.commandHandler = new CommandHandler(this, util);
        this.watcherEnabled = false;
    }

    run(argument) {
        this.util.log(`Run master`);

        this.command.startListener(this.commandHandler);

        // Fork workers:
        this.forkWorkers();
        cluster.on('exit', (worker) => this.reSpawnWorker(worker));

        // Handle watcher:
        this.watcherEnabled = argument === Util.WATCH_ARG;
        debug('watcherEnabled', this.watcherEnabled);
        if (this.watcherEnabled) {
            const watcher = new Watcher(this.util);
            watcher.onWatch(() => this.util.log(`Watching for:`, this.conf.watch_glob));
            watcher.onChanged(() => this.command.emit(Util.RESTART_ARG));
            watcher.run();
        }
    }

    /**
     * @param {Signal} reqSignal
     * @return {Function}
     */
    getMasterCommandStarter(reqSignal) {
        return () => {
            const type = reqSignal.getType();
            const uid = reqSignal.getUid();
            const dateTime = Util.getSystemDateTime();
            let messages = [];
            let resSignalType;
            switch (type) {
                case Signal.types.M_M_STATUS_REQ:
                    const mb = this.util.getMemoryUsageMB();
                    messages = [
                        `Memory usage: ~${mb} mb`,
                        this.commandHandler.getStatus(),
                        `Watcher: ${this.watcherEnabled ? JSON.stringify(this.conf.watch_glob) : 'disabled'}`,
                    ];
                    resSignalType = Signal.types.M_M_STATUS_RES;
                    break;
                case Signal.types.M_M_RESTART_REQ:
                    messages = [`You should not restart master application.`];
                    resSignalType = Signal.types.M_M_RESTART_RES;
                    break;
                case Signal.types.M_M_RELOAD_REQ:
                    messages = [`You should not reload master application.`];
                    resSignalType = Signal.types.M_M_RELOAD_RES;
                    break;
                default:
                    return this.util.warn(`Unhandled signal type: ${type}!`);
            }
            const resSignal = new Signal(resSignalType, uid);
            resSignal.setData({dateTime, messages});
            this.commandHandler.notify(resSignal);
        };
    }

    /**
     * @param {Function} fn
     */
    eachWorker(fn) {
        _.each(this._hive, (val, key) => fn(val, key));
    }

    /**
     * @private
     */
    forkWorkers() {
        for (let k = 0; k < this.conf.numworkers; k++) {
            const workerParams = this.workers.createWorkerParams(k);
            this.forkWorker(this.workers.stringifyWorkerParams(workerParams));
        }
    }

    /**
     * @private
     * @param {string} workerParamsStr
     */
    forkWorker(workerParamsStr) {
        let extEnv = {};
        extEnv[Util.WORKER_PARAMS_KEY] = workerParamsStr;

        let worker = cluster.fork(extEnv);
        worker[Util.WORKER_PARAMS_KEY] = workerParamsStr;

        // Listen for worker messages:
        worker.on('message', (message) => {
            const signal = Signal.parse(message);
            if (signal instanceof Signal) {
                this.commandHandler.notify(signal);
            }
        });

        this._hive[workerParamsStr] = worker;

        debug('Forked worker:', workerParamsStr);
    }

    /**
     * @private
     * @param {Object} worker
     */
    reSpawnWorker(worker) {
        const workerParamsStr = worker[Util.WORKER_PARAMS_KEY];
        this.util.warn(`Re-spawning worker:`, workerParamsStr);
        this.forkWorker(workerParamsStr);
    }

}

Master.__injectOptions = ['asProvider', (di) => new Master(di.util(), di.command(), di.workers())];

module.exports = Master;
