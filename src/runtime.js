const cluster = require('cluster');
const debug = require('debug')('node-app-hive:runtime');

class Runtime {

    constructor(util, runtimeScope, command, master, workers) {
        this.util = util;
        this.runtimeScope = runtimeScope;
        this.command = command;
        this.master = master;
        this.workers = workers;
    }

    handle() {
        debug(`Runtime scope: [type=${this.runtimeScope.getType()}] [argument=${this.runtimeScope.getArgument()}]`);

        // Application runtime:
        if (this.runtimeScope.isApplication()) {
            if (cluster.isMaster) {
                return this.master.run(this.runtimeScope.getArgument());
            } else if (cluster.isWorker) {
                return this.workers.runForked();
            }
        }

        // Command runtime:
        if (this.runtimeScope.isCommand()) {
            return this.emitCommand(this.runtimeScope.getArgument());
        }

        // Otherwise:
        return this.util.halt();
    }

    /**
     * @private
     * @param {string} command
     */
    emitCommand(command) {
        return this.command.emit(command)
            .then((result) => {
                this.printCommandResult(command, result);
                this.util.halt();
            })
            .catch((e) => {
                this.util.error(e);
                this.util.halt();
            });
    }

    /**
     * @private
     * @param {string} command
     * @param {string} strRes
     */
    printCommandResult(command, strRes) {
        this.util.log(`\n-----${command.toUpperCase()}-----\n${strRes}\n`);
    }

}

Runtime.__injectOptions = ['asProvider', (di) => new Runtime(di.util(), di.runtimeScope(), di.command(), di.master(), di.workers())];

module.exports = Runtime;
