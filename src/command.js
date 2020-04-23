const net = require('net');
const debug = require('debug')('node-app-hive:command');
const Util = require('./util');

class Command {

    constructor(util) {
        this.util = util;
        this.conf = util.getConfig();
        this.connParams = null;
    }

    /**
     * @param {CommandHandler} commandHandler
     */
    startListener(commandHandler) {
        this.createServer()
            .on('connection', (emitter) => {
                debug('Command emitter connected...');
                emitter.on('data', (data) => {
                    const command = data.toString();
                    debug('Received emitted command:', command);
                    if ([Util.STATUS_ARG, Util.RESTART_ARG, Util.RELOAD_ARG].indexOf(command) < 0) {
                        return this.util.warn(`Invalid command: '${command}'!`);
                    }
                    commandHandler.handle(emitter, command, this.getParams(command));
                });
            });
    }

    /**
     * @param {string} command
     * @param {*} options
     * @returns {Promise}
     */
    emit(command, options = {}) {
        const params = this.getParams(command);
        return new Promise((resolve, reject) => {
            this.util.log(`Emitting command '${command}' (timeout: ${params.execTime / 1000} sec)`.blue);

            const connParams = this.getConnectionParams();
            const client = net.createConnection(connParams, () => {
                debug(`Connected to server. Emitting command:`, command);
                client.write(command);
            });

            client.setTimeout(params.execTime);

            // On response received:
            client.on('data', (data) => {
                if (typeof options.onData === 'function') {
                    options.onData(data);
                }
            });

            client.on('end', () => {
                debug(`Command '${command}' emitter disconnected.`);
                resolve();
            });

            // On timeout:
            client.on('timeout', () => reject(new Error(`Command '${command}' connection timed out!`)));

            // On error:
            client.on('error', (e) => reject(e));
        });
    }

    /**
     * @private
     * @returns {Server}
     */
    createServer() {
        const connParams = this.getConnectionParams();
        this.util.unlinkSocketSync(connParams);
        const server = net.createServer();
        server.listen(connParams);
        this.util.log(`Created command server:`, connParams);
        return server;
    }

    /**
     * @private
     * @return {*}
     */
    getConnectionParams() {
        if (this.connParams === null) {
            const options = Object.assign({}, this.conf.command_conn);
            if (!options.port && options.path) {
                options.path = this.util.substituteStr(options.path, {
                    baserun: this.conf.baserun,
                    namehive: this.util.getHiveName()
                });
            }
            this.connParams = options;
        }
        return this.connParams;
    }

    /**
     * @private
     * @param {string} command
     * @return {{nodesTotal: number, isParallel: boolean, execTime: number}}
     */
    getParams(command) {
        const isParallel = command !== Util.RELOAD_ARG;
        const nodesTotal = 1 + this.conf.numworkers; // master + workers

        let execTime;
        if (isParallel) {
            execTime = this.conf.command_exec_time;
        } else {
            execTime = this.conf.command_exec_time * nodesTotal;
        }

        if (command === Util.RESTART_ARG) {
            execTime += this.conf.worker_startup_time;
        }

        if (command === Util.RELOAD_ARG) {
            execTime += this.conf.worker_startup_time * this.conf.numworkers;
        }

        return {isParallel, nodesTotal, execTime};
    }

}

Command.__injectOptions = ['asProvider', (di) => new Command(di.util())];

module.exports = Command;
