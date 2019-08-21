const injector = require('jslang-injector');
const Util = require('./util');
const RuntimeScope = require('./runtime-scope');
const Runtime = require('./runtime');
const Command = require('./command');
const Master = require('./master');
const Workers = require('./workers');

class Binder {

    constructor(hiveName, configProvider) {
        this.di = injector.create();
        this.di.util = injector.service(['asProvider', () => new Util(hiveName, configProvider)]);
        this.di.runtimeScope = injector.service(RuntimeScope);
        this.di.runtime = injector.service(Runtime);
        this.di.command = injector.service(Command);
        this.di.master = injector.service(Master);
        this.di.workers = injector.service(Workers);
    }

    runtime() {
        this.di.runtimeScope().handle();
        return this.di.runtime().handle();
    }

}

module.exports = Binder;
