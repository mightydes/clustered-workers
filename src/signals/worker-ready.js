class WorkerReady {

    constructor(socket) {
        this.type = 'WorkerReady';
        this.socket = socket;
    }

    getBody() {
        return {
            type: this.type,
            socket: this.socket
        };
    }

}

module.exports = WorkerReady;
