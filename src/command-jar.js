const _ = require('underscore');
const debug = require('debug')('node-app-hive:command-jar');
const Util = require('./util');
const Signal = require('./signal');

class CommandJar {

    constructor(master, util, emitter, command, params) {
        util.log(`Processing command:`.yellow, command);
        this.master = master;
        this.util = util;
        this.emitter = emitter;
        this.command = command;
        this.params = params;
        this.uid = _.uniqueId('command_jar_');
        this.destroyCallback = undefined;

        this.starterSeq = [];
        this.stopperSeq = [];
    }

    /**
     * @param {Function} fn
     */
    onDestroy(fn) {
        this.destroyCallback = fn;
    }

    handle() {
        let masterSignalType;
        let workerSignalType;
        switch (this.getCommand()) {
            case Util.STATUS_ARG:
                masterSignalType = Signal.types.M_M_STATUS_REQ;
                workerSignalType = Signal.types.M_W_STATUS_REQ;
                break;
            case Util.RESTART_ARG:
                masterSignalType = Signal.types.M_M_RESTART_REQ;
                workerSignalType = Signal.types.M_W_RESTART_REQ;
                break;
            case Util.RELOAD_ARG:
                masterSignalType = Signal.types.M_M_RELOAD_REQ;
                workerSignalType = Signal.types.M_W_RELOAD_REQ;
                break;
            default:
                return this.util.warn(`Unhandled command: ${this.getCommand()}!`);
        }

        this.starterSeq.push({
            signalType: masterSignalType,
            isMaster: true,
            handler: this.master.getMasterCommandStarter(new Signal(masterSignalType, this.getUid()))
        });

        this.master.eachWorker((worker, workerKey) => {
            this.starterSeq.push({
                signalType: workerSignalType,
                isMaster: false,
                handler: () => {
                    const signal = new Signal(workerSignalType, this.getUid());
                    worker.send(signal.stringify());
                },
                workerKey: workerKey
            });
        });

        this.nextStarter();
    }

    /**
     * @return {string}
     */
    getUid() {
        return this.uid;
    }

    /**
     * @return {string}
     */
    getCommand() {
        return this.command;
    }

    /**
     * @return {{nodesTotal: number, isParallel: boolean, execTime: number}}
     */
    getParams() {
        return this.params;
    }

    destroy() {
        debug(`Destroying command jar '${this.getCommand()}[${this.getUid()}]'...`);
        if (this.emitter && typeof this.emitter === 'object' && typeof this.emitter['end'] === 'function') {
            this.emitter.end();
            this.emitter = undefined;
        }
        if (typeof this.destroyCallback === 'function') {
            this.destroyCallback();
        }
    }

    notify(signal) {
        const uid = signal.getUid();
        if (uid === Signal.NO_UID || uid === this.getUid()) {
            this.stopperSeq = this.stopperSeq.filter((stopper) => {
                const isStopped = stopper.handler(signal);
                if (isStopped) {
                    this.writeData(signal);
                }
                return !isStopped;
            });
            debug(`${this.getCommand()}[${this.getUid()}] stopperSeq length`, this.stopperSeq.length);
            if (!this.stopperSeq.length) {
                this.nextStarter();
            }
        }
    }

    nextStarter() {
        if (!this.starterSeq.length) {
            debug(`${this.getCommand()}[${this.getUid()}] Processed all starters.`);
            return this.destroy();
        }

        if (this.params.isParallel) { // Run all starters in parallel:
            // Create stoppers:
            this.starterSeq.map((starter) => {
                this.stopperSeq.push(this.getStopper(starter));
            });

            // Run starters:
            this.starterSeq.map((starter) => starter.handler());

            // Flush starters:
            this.starterSeq = [];
        } else { // Serial:
            debug(`${this.getCommand()}[${this.getUid()}] starterSeq length`, this.starterSeq.length);
            const starter = this.starterSeq.shift();
            const stopper = this.getStopper(starter);
            this.stopperSeq.push(stopper);
            starter.handler();
        }
    }

    /**
     * @private
     * @param {*} starter
     * @return {void|*}
     */
    getStopper(starter) {
        const type = starter.signalType;
        let stopper = _.pick(starter, ['signalType', 'isMaster', 'workerKey']);
        switch (type) {
            case Signal.types.M_M_STATUS_REQ:
                return this.performMasterStatusStopper(stopper);
            case Signal.types.M_M_RESTART_REQ:
                return this.performMasterRestartStopper(stopper);
            case Signal.types.M_M_RELOAD_REQ:
                return this.performMasterReloadStopper(stopper);
            case Signal.types.M_W_STATUS_REQ:
                return this.performWorkerStatusStopper(stopper);
            case Signal.types.M_W_RESTART_REQ:
                return this.performWorkerRestartStopper(stopper);
            case Signal.types.M_W_RELOAD_REQ:
                return this.performWorkerReloadStopper(stopper);
            default:
                return this.util.warn(`Unhandled signal type: '${type}'!`);
        }
    }

    /**
     * @private
     * @param {Signal} signal
     */
    writeData(signal) {
        if (this.emitter && typeof this.emitter === 'object' && typeof this.emitter['write'] === 'function') {
            const type = signal.getType();
            const data = signal.getData();
            const cred = Signal.isMasterType(type)
                ? `:: MASTER ::`.yellow
                : `:: WORKER ${data.workerKey} ::`.cyan;
            const msg = `${cred}\n\t` + data.messages.join('\n\t');
            this.emitter.write(msg);
        }
    }

    /**
     * @private
     * @param {*} stopper
     * @return {*}
     */
    performMasterStatusStopper(stopper) {
        stopper.handler = (signal) => {
            return signal.getType() === Signal.types.M_M_STATUS_RES;
        };
        return stopper;
    }

    /**
     * @private
     * @param {*} stopper
     * @return {*}
     */
    performMasterRestartStopper(stopper) {
        stopper.handler = (signal) => {
            return signal.getType() === Signal.types.M_M_RESTART_RES;
        };
        return stopper;
    }

    /**
     * @private
     * @param {*} stopper
     * @return {*}
     */
    performMasterReloadStopper(stopper) {
        stopper.handler = (signal) => {
            return signal.getType() === Signal.types.M_M_RELOAD_RES;
        };
        return stopper;
    }

    /**
     * @private
     * @param {*} stopper
     * @return {*}
     */
    performWorkerStatusStopper(stopper) {
        stopper.handler = (signal) => {
            return signal.getType() === Signal.types.W_M_STATUS_RES
                && signal.getData().workerKey === stopper.workerKey;
        };
        return stopper;
    }

    /**
     * @private
     * @param {*} stopper
     * @return {*}
     */
    performWorkerRestartStopper(stopper) {
        stopper._state = 'restart_awaiting'; // 'restart_awaiting' -> 'ready_awaiting'
        stopper.handler = (signal) => {
            if (stopper._state === 'restart_awaiting'
                && signal.getType() === Signal.types.W_M_RESTART_RES
                && signal.getData().workerKey === stopper.workerKey) {
                stopper._state = 'ready_awaiting';
                return false;
            }
            if (stopper._state === 'ready_awaiting') {
                return signal.getType() === Signal.types.W_M_READY
                    && signal.getData().workerKey === stopper.workerKey;
            }
            return false;
        };
        return stopper;
    }

    /**
     * @private
     * @param {*} stopper
     * @return {*}
     */
    performWorkerReloadStopper(stopper) {
        stopper._state = 'reload_awaiting'; // 'reload_awaiting' -> 'ready_awaiting'
        stopper.handler = (signal) => {
            if (stopper._state === 'reload_awaiting'
                && signal.getType() === Signal.types.W_M_RELOAD_RES
                && signal.getData().workerKey === stopper.workerKey) {
                stopper._state = 'ready_awaiting';
                return false;
            }
            if (stopper._state === 'ready_awaiting') {
                return signal.getType() === Signal.types.W_M_READY
                    && signal.getData().workerKey === stopper.workerKey;
            }
            return false;
        };
        return stopper;
    }

}

module.exports = CommandJar;
