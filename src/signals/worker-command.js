class WorkerCommand {

    constructor(uid, command) {
        this.type = 'WorkerCommand';
        this.uid = uid;
        this.command = command;
    }

    getBody() {
        return {
            type: this.type,
            uid: this.uid,
            command: this.command
        };
    }

}

module.exports = WorkerCommand;
