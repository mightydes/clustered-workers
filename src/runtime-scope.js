const Util = require('./util');

class RuntimeScope {

    constructor(util) {
        this.util = util;
    }

    handle() {
        const argument = process.argv[2];
        if (argument && !this.isAllowedArgument(argument)) {
            this.util.warn(`Invalid runtime argument: '${argument}'!`);
            return this.util.halt();
        }
        this.scope = this.createScope(argument);
    }

    /**
     * @returns {string}
     */
    getType() {
        return this.scope.type;
    }

    /**
     * @returns {string}
     */
    getArgument() {
        return this.scope.argument;
    }

    /**
     * @returns {boolean}
     */
    isCommand() {
        return this.getType() === Util.CMD_RUNTIME;
    }

    /**
     * @returns {boolean}
     */
    isApplication() {
        return this.getType() === Util.APP_RUNTIME;
    }

    /**
     * @private
     * @param {string} argument
     * @returns {boolean}
     */
    isAllowedArgument(argument) {
        return RuntimeScope.allowedArguments.indexOf(argument) > -1;
    }

    /**
     * @private
     * @param {string} argument
     * @returns {Object}
     */
    createScope(argument) {
        switch (argument) {
            case Util.STATUS_ARG:
            case Util.RESTART_ARG:
            case Util.RELOAD_ARG:
                return {
                    type: Util.CMD_RUNTIME,
                    argument: argument
                };
            case Util.WATCH_ARG:
                return {
                    type: Util.APP_RUNTIME,
                    argument: argument
                };
            default:
                return {
                    type: Util.APP_RUNTIME,
                    argument: null
                };
        }
    }

}

RuntimeScope.allowedArguments = [
    Util.STATUS_ARG,
    Util.RESTART_ARG,
    Util.RELOAD_ARG,
    Util.WATCH_ARG,
];

RuntimeScope.__injectOptions = ['asProvider', (di) => new RuntimeScope(di.util())];

module.exports = RuntimeScope;
