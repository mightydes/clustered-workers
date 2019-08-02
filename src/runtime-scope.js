class RuntimeScope {

    constructor(util, argument) {
        this.priv = util.getPrivate();
        this.scope = this.createScope(argument);
    }

    /**
     * @private
     * @param {String} argument
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

    /**
     * @returns {String}
     */
    getType() {
        return this.scope.type;
    }

    /**
     * @returns {String}
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

}

module.exports = RuntimeScope;
