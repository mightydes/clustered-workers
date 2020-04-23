const _ = require('underscore');
const debug = require('debug')('node-app-hive:command-handler');
const CommandJar = require('./command-jar');

class CommandHandler {

    constructor(master, util) {
        this.master = master;
        this.util = util;
        this._jars = {};
    }

    /**
     * @param {*} emitter
     * @param {string} command
     * @param {{nodesTotal: number, isParallel: boolean, execTime: number}} params
     */
    handle(emitter, command, params) {
        const jar = new CommandJar(this.master, this.util, emitter, command, params);
        this.registerJar(jar);
        jar.handle();
    }

    /**
     * @param {Signal} signal
     */
    notify(signal) {
        debug('notify %o', signal);
        _.each(this._jars, (jar) => jar.notify(signal));
    }

    /**
     * @private
     * @param {CommandJar} jar
     */
    registerJar(jar) {
        const uid = jar.getUid();
        const command = jar.getCommand();
        let destroyed = false;

        const dropReference = () => {
            if (_.has(this._jars, uid)) {
                delete this._jars[uid];
            }
        };

        // Bind cleanup timer:
        const timer = setTimeout(() => {
            debug(`Destroying command jar '${command}[${uid}]' on timed out...`);
            if (!destroyed) {
                dropReference();
                destroyed = true;
            }
            if (typeof jar === 'object' && typeof jar['destroy'] === 'function') {
                jar.destroy();
            }
        }, jar.getParams().execTime);

        const cancelTimer = () => {
            if (timer) {
                clearTimeout(timer);
                debug(`Cancelled jar '${command}[${uid}]' cleanup timer.`);
            }
        };

        jar.onDestroy(() => {
            if (!destroyed) {
                dropReference();
                cancelTimer();
                destroyed = true;
            }
        });

        // Create jar reference:
        this._jars[uid] = jar;
    }

    /**
     * @return {string}
     */
    getStatus() {
        return `Commands running: ${_.keys(this._jars).length}`;
    }

}

module.exports = CommandHandler;
