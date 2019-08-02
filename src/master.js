const cluster = require('cluster');
const path = require('path');
const _ = require('underscore');
const debug = require('debug')('node-app-hive:master');
const CommandResponse = require('./command-response');
const Watcher = require('./watcher');
const WorkerCommand = require('./signals/worker-command');

class Master {

    constructor(util, command, workers) {
        this.util = util;
        this.priv = util.getPrivate();
        this.conf = util.getConfig();
        this.command = command;
        this.workers = workers;
        this._hive = {};
        this.commandResponse = CommandResponse.getInitial();
        this.watcherEnabled = false;
        this.pollQueue = [];
    }

    run(argument) {
        this.util.log(`Run master`);

        this.createCommandListener();

        // Fork workers:
        this.forkWorkers();
        cluster.on('exit', (worker) => this.reSpawnWorker(worker));

        // Handle watcher:
        this.watcherEnabled = argument === this.priv.watch_arg;
        debug('watcherEnabled', this.watcherEnabled);
        if (this.watcherEnabled) {
            const watcher = new Watcher(this.util);
            watcher.onWatch(() => this.util.log(`Watching for:`, JSON.stringify(this.conf.watch_glob)));
            watcher.onChanged(() => this.command.emit(this.priv.restart_arg));
            watcher.run();
        }
    }

    /**
     * @private
     */
    createCommandListener() {
        const server = this.command.createServer();
        server.on('connection', (emitter) => {
            debug('Command emitter connected...');
            emitter.on('data', (data) => {
                const command = data.toString();
                this.util.log('Received emitted command:', command);
                this.handleCommand(command, emitter);
            });
        });
    }

    /**
     * @private
     */
    forkWorkers() {
        for (let k = 0; k < this.conf.numworkers; k++) {
            let workerSocket = this.util.substituteStr(this.conf.worker_socket, {
                namehive: this.util.getHiveName(),
                numworker: k
            });
            workerSocket = path.join(this.conf.run_folder, workerSocket);
            this.forkWorker(workerSocket);
        }
    }

    /**
     * @private
     * @param {String} workerSocket
     */
    forkWorker(workerSocket) {
        let env = {};
        env[this.priv.worker_sock_key] = workerSocket;

        let worker = cluster.fork(env);
        worker[this.priv.worker_sock_key] = workerSocket;

        // Listen worker messages:
        worker.on('message', (data) => {
            if (!_.has(data, 'type')) {
                return;
            }
            if (data.type === 'WorkerCommand'
                && data.uid === this.commandResponse.uid) {
                return this.commandResponse.add(data.response);
            }
            if (data.type === 'WorkerReady'
                && this.commandResponse.uid !== null
                && this.commandResponse.getCommand() === this.priv.reload_arg) {
                return this.popPollQueue();
            }
        });

        this._hive[workerSocket] = worker;

        debug('Forked worker:', workerSocket);
    }

    /**
     * @private
     * @param {Object} worker
     */
    reSpawnWorker(worker) {
        const workerSocket = worker[this.priv.worker_sock_key];
        this.util.warn(`Re-spawning worker:`, workerSocket);
        this.forkWorker(workerSocket);
    }

    /**
     * @private
     * @param {String} command
     * @param {Socket} emitter
     */
    handleCommand(command, emitter) {
        if (this.commandResponse.uid !== null) {
            return emitter.end(this.commandResponse.getTaskVerbose());
        }

        const uid = _.uniqueId('commandResponse');
        this.commandResponse = new CommandResponse(this.util, uid, command, (results) => {
            emitter.end(results);
            this.commandResponse = CommandResponse.getInitial();
        });

        // Handle command for master:
        this.performMasterCommandResponse(uid, command)
            .then((data) => {
                if (uid === data.uid) {
                    this.commandResponse.add(data.response);
                }
            });

        // Handle command for workers:
        this.performWorkersCommandResponse(uid, command);

        this.commandResponse.timeout(this.util.getCommandExecTtl(command));
    }

    /**
     * @private
     * @param {String} uid
     * @param {String} command
     */
    performMasterCommandResponse(uid, command) {
        const dateTime = this.util.getSystemDateTime();
        let out = {
            uid: uid,
            response: `MASTER ${dateTime}\n\t-no message-`
        };
        return new Promise((resolve) => {
            switch (command) {
                case this.priv.status_arg:
                    const mb = this.util.getMemoryUsageMB();
                    out.response = `MASTER ${dateTime}\n\tMemory usage: ~${mb} mb`
                        + `\n\tWatcher: ${this.watcherEnabled ? JSON.stringify(this.conf.watch_glob) : 'disabled'}`;
                    break;
            }
            debug('Master responded with message:', out);
            return resolve(out);
        });
    }

    /**
     * @private
     * @param {String} uid
     * @param {String} command
     */
    performWorkersCommandResponse(uid, command) {
        const signal = new WorkerCommand(uid, command);
        switch (command) {
            case this.priv.reload_arg:
                _.each(this._hive, (worker) => this.pollQueue.push(() => worker.send(signal.getBody())));
                this.popPollQueue();
                break;
            default:
                _.each(this._hive, (worker) => worker.send(signal.getBody()));
                break;
        }
    }

    /**
     * @private
     */
    popPollQueue() {
        if (this.pollQueue.length) {
            const fn = this.pollQueue.pop();
            fn();
        }
    }

}

Master.__injectOptions = ['asProvider', (di) => new Master(di.util(), di.command(), di.workers())];

module.exports = Master;
