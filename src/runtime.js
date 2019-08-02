const cluster = require('cluster');
const debug = require('debug')('node-app-hive:runtime');
const RuntimeScope = require('./runtime-scope');

class Runtime {

    constructor(util, command, master, workers) {
        this.util = util;
        this.priv = util.getPrivate();
        this.command = command;
        this.master = master;
        this.workers = workers;
    }

    handle() {
        const argument = process.argv[2];
        if (argument && !this.isAllowedArgument(argument)) {
            this.util.warn(`Invalid runtime argument: '${argument}'!`);
            return this.util.halt();
        }

        this.scope = new RuntimeScope(this.util, argument);
        debug(`Runtime scope: [type=${this.scope.getType()}] [argument=${this.scope.getArgument()}]`);

        // Application runtime:
        if (this.scope.isApplication()) {
            if (cluster.isMaster) {
                return this.master.run(this.scope.getArgument());
            } else if (cluster.isWorker) {
                return this.workers.runForked();
            }
        }

        // Command runtime:
        if (this.scope.isCommand()) {
            return this.emitCommand(this.scope.getArgument());
        }

        // Otherwise:
        return this.util.halt();
    }

    /**
     * @private
     * @param {String} command
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
     * @param {String} command
     * @param {String} strRes
     */
    printCommandResult(command, strRes) {
        this.util.log(`\n-----${command.toUpperCase()}-----\n${strRes}\n`);
    }

    /**
     * @private
     * @param {String} argument
     * @returns {boolean}
     */
    isAllowedArgument(argument) {
        return this.priv.allowed_arguments.indexOf(argument) > -1;
    }

}

Runtime.__injectOptions = ['asProvider', (di) => new Runtime(di.util(), di.command(), di.master(), di.workers())];

module.exports = Runtime;
