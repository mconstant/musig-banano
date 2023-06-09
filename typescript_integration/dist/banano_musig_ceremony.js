"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musig_aggregated_address = exports.set_addresses = void 0;
// external dependencies
var bananojs = require("@bananocoin/bananojs");
// src imports
var hex_to_uint8_1 = require("./hex_to_uint8");
var bytes_to_hex_1 = require("./bytes_to_hex");
var musig_banano = require("./musig_banano_bg.wasm");
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
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4191-L4194
var wasmErrors = ["No error", "Internal WASM error", "Invalid parameter(s) passed to WASM", "Invalid peer message specified"];
var wasmError = function (errCode) {
    return "WASM error ".concat(errCode, ": ").concat(wasmErrors[errCode]);
};
// address to pubkey string helper functions
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
var musigStagePtr, musigStageNum;
var set_addresses = function (new_addresses) {
    addresses = new_addresses;
};
exports.set_addresses = set_addresses;
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4198-L4258
// note that the aggregate function in this example uses an older build of musig
// before some parameters were moved from musig_stage0 to musig_state1:
// https://github.com/PlasmaPower/musig-nano/commit/7ab8c8d0dcc604cab72f0d28e6ec5ca19851b156
var musig_aggregated_address = function () {
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
        var pubkeyBytes = (0, hex_to_uint8_1.hexToUint8)(pubkeys[i]);
        pubkeyPtrsBuf[i] = copyToWasm(pubkeyBytes);
    }
    var outPtr = musig_banano.musig_malloc(33);
    var outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 33);
    outBuf[0] = 0;
    musig_banano.musig_aggregate_public_keys(pubkeyPtrs, pubkeys.length, outPtr, outPtr + 1);
    // runWithPubkeys is unrolled into this aggregate function
    // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4236
    // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4283-L4286
    musigStagePtr = musig_banano.musig_stage0(outPtr + 1, outPtr + 33);
    musigStageNum = 0;
    for (var i = 0; i < pubkeyPtrsBuf.length; i++) {
        musig_banano.musig_free(pubkeyPtrsBuf[i]);
    }
    musig_banano.musig_free(pubkeyPtrs);
    var err = outBuf[0];
    if (err !== 0) {
        musig_banano.musig_free(outPtr);
        return {
            status: 'error',
            message: wasmError(err)
        };
    }
    var aggregated_address;
    try {
        var aggPubkeyBytes = outBuf.subarray(1).slice();
        var aggPubkey = (0, bytes_to_hex_1.bytesToHex)(aggPubkeyBytes);
        aggregated_address = bananojs.getAccount(aggPubkey);
    }
    catch (_a) {
        return {
            status: 'error',
            message: 'error generating banano address from aggregated public key'
        };
    }
    finally {
        musig_banano.musig_free(outPtr);
    }
    return {
        status: 'ok',
        value: aggregated_address
    };
};
exports.musig_aggregated_address = musig_aggregated_address;
//# sourceMappingURL=banano_musig_ceremony.js.map