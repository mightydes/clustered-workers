const gaze = require('gaze');

class Watcher {

    constructor(util) {
        this.util = util;
        this.conf = util.getConfig();
        this._onWatch = () => {
        };
        this._onChanged = () => {
        };
        this.isWatching = false;
    }

    /**
     * @param {Function} fn
     */
    onWatch(fn) {
        this._onWatch = fn;
    }

    /**
     * @param {Function} fn
     */
    onChanged(fn) {
        this._onChanged = fn;
    }

    run() {
        if (this.isWatching) {
            return this.util.warn(`Already watching!`);
        }
        this.isWatching = true;

        const glob = this.conf.watch_glob;
        if (!glob) {
            throw new Error(`Invalid 'watch_glob' parameter!`);
        }

        return setTimeout(() => {
            gaze(glob, (err, watcher) => {
                this._onWatch();
                watcher.on('changed', () => this._onChanged());
            });
        }, this.conf.watch_delay);
    }

}

module.exports = Watcher;
