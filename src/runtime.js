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
        this.util.log(`:: Emitting command ::`, `${command}`.yellow);

        const options = {
            onData: (data) => this.util.log(data.toString())
        };

        return this.command.emit(command, options)
            .then(() => {
                debug(`Resolved command '${command}'.`);
                this.util.log(`Done.`.green);
                this.util.halt();
            })
            .catch((e) => {
                debug(`Rejected command '${command}'.`);
                this.util.error(e);
                this.util.halt();
            });
    }

}

Runtime.__injectOptions = ['asProvider', (di) => new Runtime(di.util(), di.runtimeScope(), di.command(), di.master(), di.workers())];

module.exports = Runtime;
