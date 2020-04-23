const _ = require('underscore');
const debug = require('debug')('node-app-hive:workers');
const Util = require('./util');
const Signal = require('./signal');

class Workers {

    constructor(util) {
        this.util = util;
        this.conf = util.getConfig();
    }

    /**
     * @param {number} numworker
     * @return {*}
     */
    createWorkerParams(numworker) {
        const options = Object.assign({}, this.conf.worker_conn);

        let params;
        if (!options.port && options.path) {
            // IPC socket used:
            let socketPath = this.util.substituteStr(options.path, {
                baserun: this.conf.baserun,
                namehive: this.util.getHiveName(),
                numworker: numworker
            });
            params = {path: socketPath};
        } else {
            // TCP port used:
            let tcpPort = this.util.substituteStr(options.port, {
                numworker: numworker
            });
            tcpPort = eval(tcpPort.replace(/[^-()\d/*+.]/g, ''));
            params = _.extend({port: tcpPort}, _.pick(options, ['host']));
        }
        params.numworker = numworker;

        return params;
    }

    /**
     * @param {*} paramsObj
     * @return {string}
     */
    stringifyWorkerParams(paramsObj) {
        return JSON.stringify(paramsObj);
    }

    /**
     * @param {string} paramsStr
     * @return {*}
     */
    parseWorkerParams(paramsStr) {
        return JSON.parse(paramsStr);
    }

    runForked() {
        const params = this.parseWorkerParams(process.env[Util.WORKER_PARAMS_KEY]);
        this.util.log('Run worker', params);

        // Listen for master messages:
        process.on('message', (message) => {
            const signal = Signal.parse(message);
            if (signal instanceof Signal) {
                this.handleSignalFromMaster(signal);
            }
        });

        // Run worker script:
        this.util.unlinkSocketSync(params);
        const script = this.conf.worker_script;
        (function () {
            require(script);
        })();

        // Emit 'ready' signal:
        setTimeout(() => {
            const signal = new Signal(Signal.types.W_M_READY);
            this.setSignalData(signal, `Worker is ready.`);
            process.send(signal.stringify());
        }, this.conf.worker_startup_time)
    }

    /**
     * @private
     * @param {Signal} reqSignal
     */
    handleSignalFromMaster(reqSignal) {
        const workerKey = process.env[Util.WORKER_PARAMS_KEY];
        const type = reqSignal.getType();
        this.util.log(`Worker '${workerKey}' is handling signal '${type}'...`.cyan);
        let messages = [];
        let resSignalType;
        let onSend = undefined;

        switch (type) {
            case Signal.types.M_W_STATUS_REQ:
                const mb = this.util.getMemoryUsageMB();
                messages = [`Memory usage: ~${mb} mb`];
                resSignalType = Signal.types.W_M_STATUS_RES;
                break;
            case Signal.types.M_W_RESTART_REQ:
                messages = [`Restarting...`];
                resSignalType = Signal.types.W_M_RESTART_RES;
                onSend = () => this.shutdown();
                break;
            case Signal.types.M_W_RELOAD_REQ:
                messages = [`Reloading...`];
                resSignalType = Signal.types.W_M_RELOAD_RES;
                onSend = () => this.shutdown();
                break;
            default:
                return this.util.warn(`Unhandled signal type: ${type}!`);
        }

        const resSignal = new Signal(resSignalType, reqSignal.getUid());
        this.setSignalData(resSignal, messages);
        process.send(resSignal.stringify());
        if (typeof onSend === 'function') {
            onSend();
        }
    }

    /**
     * @private
     * @param {Signal} signal
     * @param {string|Array} messages
     */
    setSignalData(signal, messages) {
        if (typeof messages === 'string') {
            messages = [messages];
        }
        if (!Array.isArray(messages)) {
            throw new Error(`Invalid 'messages' argument type: '${typeof messages}'!`);
        }
        const dateTime = Util.getSystemDateTime();
        const workerKey = process.env[Util.WORKER_PARAMS_KEY];
        signal.setData({dateTime, messages, workerKey});
    }

    /**
     * @private
     * @return {*}
     */
    shutdown() {
        const policy = this.conf.exit_policy;
        switch (policy) {
            case Util.exitPolicies.halt:
                return process.exit();
            case Util.exitPolicies.SIGTERM:
                return process.emit('SIGTERM');
            default:
                throw new Error(`Invalid exit policy: '${policy}'!`);
        }
    }

}

Workers.__injectOptions = ['asProvider', (di) => new Workers(di.util())];

module.exports = Workers;
