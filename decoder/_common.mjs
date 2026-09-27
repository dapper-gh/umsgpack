// Minifier optimization
var $ArrayBuffer = ArrayBuffer;
var $Uint8Array = Uint8Array;
var $256 = 256;

var modulo = function(num, base) {
    base = base || $256;
    if (num < 0) {
        return (base + (num % base)) % base;
    } else {
        return num % base;
    }
};

var parseUnsigned = function(array, start, end) {
    var output = 0;
    while (start < end) {
        output *= $256;
        output += modulo(array[start++]);
    }
    return [output, end];
};

var parseSigned = function(array, start, end) {
    var result = parseUnsigned(array, start, end)[0];
    return [result >= Math.pow(2, (end - start) * 8 - 1) ? result - Math.pow(2, (end - start) * 8) : result, end];
};

var endiannessBuffer = new $ArrayBuffer(2);
new DataView(endiannessBuffer).setInt16(0, 1, false);
var isLittleEndian = !new $Uint8Array(endiannessBuffer)[0]

var parseFloat = function(TypedArray, bytes, array, start) {
    var buffer = new $ArrayBuffer(bytes);
    var uint8 = new $Uint8Array(buffer);
    var typed = new TypedArray(buffer);
    for (var i = 0; i < bytes; i++) {
        uint8[isLittleEndian ? bytes - i - 1 : i] = modulo(array[start + i]);
    }
    return [typed[0], start + i];
};

var parseByteArray = function(array, start, length) {
    var out = [];
    for (var i = 0; i < length; i++) {
        out[i] = modulo(array[start + i]);
    }
    return [out, start + i];
};

var parseString = function(array, start, length) {
    return stringifyResult(parseByteArray(array, start, length));
};

var stringifyResult = function(result) {
    return typeof result[0] == "string" ? result : [new TextDecoder().decode(new $Uint8Array(result[0])), result[1]];
};

var parseArray = function(array, start, length, decoder) {
    var out = [];
    while (out.length < length) {
        var result = decode(array, start, decoder);
        start = result[1];
        out.push(result[0]);
    }
    return [out, start];
};

var parseMap = function(array, start, size, decoder) {
    var out = {};
    while (size--) {
        var keyResult = stringifyResult(decode(array, start, decoder));
        var valueResult = decode(array, keyResult[1], decoder);
        start = valueResult[1];
        out[keyResult[0]] = valueResult[0];
    }
    return [out, start];
};

var parseExt = function(array, start, size, decoder) {
    var extType = parseSigned(array, start, start + 1)[0];
    if (extType in decoder.p.e) {
        return [decoder.p.e[extType](array, start + 1, size, decoder), start + 1 + size];
    } else {
        throw ReferenceError("Unknown ext " + extType);
    }
};

var decode = function(array, i, decoder) {
    var tag = modulo(array[i++]);
    if (tag == 0xC0) {
        return [null, i];
    } else if (tag == 0xC2) {
        return [false, i];
    } else if (tag == 0xC3) {
        return [true, i];
    } else if (tag < 128) {
        return [tag, i];
    } else if (tag > 223) {
        return [tag - $256, i];
    } else if (tag == 0xCC) {
        return [modulo(array[i++]), i];
    } else if (tag == 0xCD) {
        return parseUnsigned(array, i, i + 2);
    } else if (tag == 0xCE) {
        return parseUnsigned(array, i, i + 4);
    } else if (tag == 0xCF) {
        return parseUnsigned(array, i, i + 8);
    } else if (tag == 0xD0) {
        return parseSigned(array, i, i + 1);
    } else if (tag == 0xD1) {
        return parseSigned(array, i, i + 2);
    } else if (tag == 0xD2) {
        return parseSigned(array, i, i + 4);
    } else if (tag == 0xD3) {
        return parseSigned(array, i, i + 8);
    } else if (tag == 0xCA) {
        return parseFloat(Float32Array, 4, array, i);
    } else if (tag == 0xCB) {
        return parseFloat(Float64Array, 8, array, i);
    } else if (tag > 0b10011111 && tag < 0b11000000) {
        return parseString(array, i, tag - 160);
    } else if (tag == 0xD9) {
        // str
        return parseString(array, i + 1, modulo(array[i]));
    } else if (tag == 0xDA) {
        // str
        return parseString(array, i + 2, parseUnsigned(array, i, i + 2)[0]);
    } else if (tag == 0xDB) {
        // str
        return parseString(array, i + 4, parseUnsigned(array, i, i + 4)[0]);
    } else if (tag == 0xC4) {
        // bytes
        return parseByteArray(array, i + 1, modulo(array[i]));
    } else if (tag == 0xC5) {
        // bytes
        return parseByteArray(array, i + 2, parseUnsigned(array, i, i + 2)[0]);
    } else if (tag == 0xC6) {
        // bytes
        return parseByteArray(array, i + 4, parseUnsigned(array, i, i + 4)[0]);
    } else if (tag > 0b10001111 && tag < 0b10100000) {
        return parseArray(array, i, tag - 0b10010000, decoder);
    } else if (tag == 0xDC) {
        return parseArray(array, i + 2, parseUnsigned(array, i, i + 2)[0], decoder);
    } else if (tag == 0xDD) {
        return parseArray(array, i + 4, parseUnsigned(array, i, i + 4)[0], decoder);
    } else if (tag > 0b01111111 && tag < 0b10010000) {
        return parseMap(array, i, tag - 0b10000000, decoder);
    } else if (tag == 0xDE) {
        return parseMap(array, i + 2, parseUnsigned(array, i, i + 2)[0], decoder);
    } else if (tag == 0xDF) {
        return parseMap(array, i + 4, parseUnsigned(array, i, i + 4)[0], decoder);
    } else if (tag == 0xD4) {
        return parseExt(array, i, 1, decoder);
    } else if (tag == 0xD5) {
        return parseExt(array, i, 2, decoder);
    } else if (tag == 0xD6) {
        return parseExt(array, i, 4, decoder);
    } else if (tag == 0xD7) {
        return parseExt(array, i, 8, decoder);
    } else if (tag == 0xD8) {
        return parseExt(array, i, 16, decoder);
    } else if (tag == 0xC7) {
        return parseExt(array, i + 1, modulo(array[i]), decoder);
    } else if (tag == 0xC8) {
        return parseExt(array, i + 2, parseUnsigned(array, i, i + 2)[0], decoder);
    } else if (tag == 0xC9) {
        return parseExt(array, i + 4, parseUnsigned(array, i, i + 4)[0], decoder);
    }
};

export {modulo, parseUnsigned, parseSigned, isLittleEndian, parseFloat, parseByteArray, parseString, stringifyResult, parseArray, parseMap, parseExt, decode};
