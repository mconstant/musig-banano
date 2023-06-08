"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregate_addresses = void 0;
var musig_banano = require("./musig_banano_bg.wasm");
var bananojs = require("@bananocoin/bananojs");
// TODO: Move to BananoMusigCeremony class
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#LL4157C1-L4173C10
var copyToWasm = function (bytes, ptr) {
    if (ptr === void 0) { ptr = undefined; }
    if (!ptr) {
        ptr = musig_banano.musig_malloc(bytes.length);
    }
    var buf = new Uint8Array(musig_banano.memory.buffer, ptr, bytes.length);
    for (var i = 0; i < bytes.length; i++) {
        buf[i] = bytes[i];
    }
    return ptr;
};
var copyFromWasm = function (ptr, length) {
    var out = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
        out[i] = musig_banano.memory.buffer[ptr + i];
    }
    return out;
};
// https://github.com/BananoCoin/bananojs/blob/04296a0d5d756f2ba36f043f935658a3aa5e39df/app/scripts/banano-util.js#L382
var hexToUint8 = function (hexValue) {
    var length = (hexValue.length / 2) | 0;
    var uint8 = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
        uint8[i] = parseInt(hexValue.substr(i * 2, 2), 16);
    }
    return uint8;
};
var get_pubkey = function (address) {
    var pubkey = undefined;
    try {
        pubkey = bananojs.getAccountPublicKey(address);
    }
    catch (error) {
        return undefined;
    }
    // TODO: verify account_hex here. It's not really needed since bananojs.getAccountPublicKey
    // not throwing an error should be good enough.
    return pubkey;
};
var get_pubkeys = function (addresses) {
    var pubkeys = [];
    for (var _i = 0, addresses_1 = addresses; _i < addresses_1.length; _i++) {
        var address = addresses_1[_i];
        if (!address.startsWith('ban_1') && !address.startsWith('ban_3')) {
            return {
                status: 'error',
                message: "Banano address must start with ban_1 or ban_3"
            };
        }
        var pubkey = get_pubkey(address);
        if (typeof (pubkey) === 'string') {
            pubkeys.push(pubkey);
        }
        else if (pubkey === undefined) {
            return {
                status: 'error',
                message: "Banano address invalid"
            };
        }
        else {
            return {
                status: 'error',
                message: "Unexpected public key type. Expected string, got: ".concat(typeof (pubkey))
            };
        }
    }
    return {
        status: 'ok',
        value: pubkeys
    };
};
// TODO: wrap musigStagePtr, musigStageNum, addresses and so on in the BananoMusigCeremony class.
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4198
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#LL4267C32-L4267C45
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4283
// TODO: Check if BananoMusigCeremony is thread safe and if it isn't, create mutex lock for the ceremony.
var addresses;
var aggregate_addresses = function (runWithPubkeys) {
    if (!musig_banano) {
        return {
            status: 'error',
            message: 'musig_banano wasm not loaded'
        };
    }
    if (addresses.length < 2) {
        return {
            status: 'error',
            message: 'aggregate_addresses require at least 2 addresses'
        };
    }
    var generate_pubkeys_result = get_pubkeys(addresses);
    if (generate_pubkeys_result.status === 'error') {
        return generate_pubkeys_result;
    }
    var pubkeys = generate_pubkeys_result.value;
    // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4227C17-L4231
    var pubkeyPtrs = musig_banano.musig_malloc(pubkeys.length * 4);
    var pubkeyPtrsBuf = new Uint32Array(musig_banano.memory.buffer, pubkeyPtrs, pubkeys.length);
    for (var i = 0; i < pubkeys.length; i++) {
        var pubkeyBytes = hexToUint8(pubkeys[i]);
        pubkeyPtrsBuf[i] = copyToWasm(pubkeyBytes);
    }
    var outPtr = musig_banano.musig_malloc(33);
    var outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 33);
    outBuf[0] = 0;
    musig_banano.musig_aggregate_public_keys(pubkeyPtrs, pubkeys.length, outPtr, outPtr + 1);
    if (runWithPubkeys)
        runWithPubkeys(pubkeyPtrs, pubkeys.length);
    for (var i = 0; i < pubkeyPtrsBuf.length; i++) {
        musig_banano.musig_free(pubkeyPtrsBuf[i]);
    }
    /*
    const aggregated_address = ''; // TODO
  
    return {
      status: 'ok',
      value: aggregated_address
    };
    */
};
exports.aggregate_addresses = aggregate_addresses;
//# sourceMappingURL=index.js.map