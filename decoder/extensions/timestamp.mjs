import {parseUnsigned} from "../_common.mjs";

export default function parseTimestamp(array, start, size) {
    if (size === 4) {
        return new Date(parseUnsigned(array, start, start + 4)[0] * 1000);
    } else if (size === 8) {
        var nanoRaw = parseUnsigned(array, start, start + 4)[0];
        var seconds = (nanoRaw & 0b11) * Math.pow(2, 32) + parseUnsigned(array, start + 4, start + 8)[0];
        return new Date((nanoRaw >>> 2) / 1e6 + seconds);
    } else if (size === 12) {
        return new Date(parseUnsigned(array, start, start + 4)[0] / 1e6, parseSigned(array, start + 4, start + 12)[0]);
    }
    throw new ReferenceError("Unknown timestamp size " + size);
}