const path = require('path');
const fs = require('fs');
const net = require('net');
const debug = require('debug')('nodeAppHive:commands');

class Commands {

    constructor(util) {
        this.util = Commands;
        this.priv = util.getPrivate();
        this.socketFilepath = path.join(
            this.util.getConfig().run_folder,
            this.util.getConfig().command_socket
        );
    }

    createServer(callback) {
        this.server = net.createServer((socket) => {
            if (callback) {
                callback(socket);
            }
        });
        this.server.listen(this.prepSocket());
    }

    prepSocket() {
        debug('prepSocket', this.socketFilepath);
        try {
            fs.unlinkSync(this.socketFilepath);
        } catch (e) {
        }
        return this.socketFilepath;
    }

    emit(command) {
        const client = new net.Socket();
        client.on('close', () => debug('send()', `'close' emitted...`));
        client.on('data', (data) => {
            debug('send()', `'data' emitted...`);
            this.util.log(data.toString());
            client.destroy();
        });
        client.connect(this.socketFilepath, () => client.write(command));
        setTimeout(() => client.destroy(), this.priv.send_command_ttl);
    }

}

Commands.__injectOptions = ['asProvider', (di) => new Commands(di.util())];

module.exports = Commands;
