const debug = require('debug')('node-app-hive:command-response');

class CommandResponse {

    constructor(util, uid, command, onSubmit) {
        this.uid = uid;
        this.command = command;
        this.taskMessage = `Processing command '${command}'...`;
        this.resMax = util.getConfig().numworkers + 1; // workers + master
        this.resCounter = 0;
        this.isDone = false;
        this.results = [];
        this.onSubmit = onSubmit;
    }

    /**
     * @param {String} strRes
     */
    add(strRes) {
        this.resCounter++;
        if (this.isDone || this.resCounter > this.resMax) {
            return;
        }
        this.results.push(strRes);
        debug(`Add response:`, strRes);
        if (this.resCounter === this.resMax) {
            this.submit();
        }
    }

    /**
     * @param {Number} ms
     */
    timeout(ms) {
        if (!this.isDone) {
            setTimeout(() => this.submit(), ms);
        }
    }

    /**
     * @returns {String}
     */
    getTaskVerbose() {
        return this.taskMessage;
    }

    /**
     * @returns {String}
     */
    getCommand() {
        return this.command;
    }

    /**
     * @private
     */
    submit() {
        if (!this.isDone) {
            this.isDone = true;
            this.onSubmit(this.results.join('\n'));
        }
    }

}

CommandResponse.getInitial = () => {
    return {uid: null};
};

module.exports = CommandResponse;
