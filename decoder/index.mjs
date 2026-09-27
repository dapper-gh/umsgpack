import {decode} from "./_common.mjs";

export function Decoder(extensions) {
    this.p = {
        e: arguments.length ? extensions : {}
    };
}

Decoder.prototype.decode = function(array) {
    return decode(array, 0, this)[0];
};
