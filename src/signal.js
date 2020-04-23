const _ = require('underscore');

class Signal {

    constructor(type, uid = undefined) {
        if (!_.has(Signal.types, type)) {
            throw new Error(`Invalid 'type' argument: ${JSON.stringify(type)}!`);
        }
        if (typeof uid !== 'string') {
            uid = Signal.NO_UID;
        }

        this.type = type;
        this.uid = uid;
        this.data = null;
    }

    /**
     * @return {string}
     */
    getType() {
        return this.type;
    }

    /**
     * @return {string}
     */
    getUid() {
        return this.uid;
    }

    /**
     * @param {*} data
     */
    setData(data) {
        this.data = data;
    }

    /**
     * @param data
     * @return {*}
     */
    getData(data) {
        return this.data;
    }

    /**
     * @return {string}
     */
    stringify() {
        return JSON.stringify({
            type: this.type,
            uid: this.uid,
            data: this.data
        });
    }

}

Signal.NO_UID = '__NO_UID__';

Signal.types = {
    // master:
    M_M_STATUS_REQ: 'M_M_STATUS_REQ',
    M_M_STATUS_RES: 'M_M_STATUS_RES',

    M_M_RESTART_REQ: 'M_M_RESTART_REQ',
    M_M_RESTART_RES: 'M_M_RESTART_RES',

    M_M_RELOAD_REQ: 'M_M_RELOAD_REQ',
    M_M_RELOAD_RES: 'M_M_RELOAD_RES',

    // worker:
    M_W_STATUS_REQ: 'M_W_STATUS_REQ',
    W_M_STATUS_RES: 'W_M_STATUS_RES',

    M_W_RESTART_REQ: 'M_W_RESTART_REQ',
    W_M_RESTART_RES: 'W_M_RESTART_RES',

    M_W_RELOAD_REQ: 'M_W_RELOAD_REQ',
    W_M_RELOAD_RES: 'W_M_RELOAD_RES',

    W_M_READY: 'W_M_READY',
};

Signal.isMasterType = (type) => {
    return [
        Signal.types.M_M_STATUS_REQ,
        Signal.types.M_M_STATUS_RES,
        Signal.types.M_M_RESTART_REQ,
        Signal.types.M_M_RESTART_RES,
        Signal.types.M_M_RELOAD_REQ,
        Signal.types.M_M_RELOAD_RES,
    ].indexOf(type) > -1;
};

/**
 * @param {*} signalStr
 * @return {Signal|null}
 */
Signal.parse = (signalStr) => {
    const it = JSON.parse(signalStr);
    if (_.isObject(it) && _.has(it, 'type') && _.has(Signal.types, it['type'])) {
        const signal = new Signal(
            it['type'],
            _.has(it, 'uid') ? it['uid'] : undefined
        );
        signal.setData(_.has(it, 'data') ? it['data'] : null);
        return signal;
    }
    return null;
};

module.exports = Signal;
