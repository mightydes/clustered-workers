class RuntimeScope {

    constructor(util) {
        this.util = util;
        this.priv = util.getPrivate();
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
        return this.getType() === this.priv.cmd_runtime;
    }

    /**
     * @returns {boolean}
     */
    isApplication() {
        return this.getType() === this.priv.app_runtime;
    }

    /**
     * @private
     * @param {string} argument
     * @returns {boolean}
     */
    isAllowedArgument(argument) {
        return this.priv.allowed_arguments.indexOf(argument) > -1;
    }

    /**
     * @private
     * @param {string} argument
     * @returns {Object}
     */
    createScope(argument) {
        switch (argument) {
            case this.priv.status_arg:
            case this.priv.restart_arg:
            case this.priv.reload_arg:
                return {
                    type: this.priv.cmd_runtime,
                    argument: argument
                };
            case this.priv.watch_arg:
                return {
                    type: this.priv.app_runtime,
                    argument: argument
                };
            default:
                return {
                    type: this.priv.app_runtime,
                    argument: null
                };
        }
    }

}

RuntimeScope.__injectOptions = ['asProvider', (di) => new RuntimeScope(di.util())];

module.exports = RuntimeScope;
