const injector = require('jslang-injector');
const Util = require('./util');
const Runtime = require('./runtime');
const Command = require('./command');
const Master = require('./master');
const Workers = require('./workers');

class Binder {

    constructor(hiveName, hiveConfig) {
        this.di = injector.create();
        this.di.util = injector.service(['asProvider', () => new Util(hiveName, hiveConfig)]);
        this.di.runtime = injector.service(Runtime);
        this.di.command = injector.service(Command);
        this.di.master = injector.service(Master);
        this.di.workers = injector.service(Workers);
    }

    runtime() {
        return this.di.runtime().handle();
    }

}

module.exports = Binder;
