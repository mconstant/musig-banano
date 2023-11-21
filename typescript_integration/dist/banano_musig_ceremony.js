"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musig_advance_ceremony = exports.musig_start_ceremony = exports.musig_aggregated_address = exports.input_to_share = exports.ceremony_state = exports.set_message_to_sign = exports.get_addresses = exports.set_addresses = void 0;
var fs = require("fs");
// external dependencies
var bananojs = require("@bananocoin/bananojs");
// src imports
var hex_to_uint8_1 = require("./hex_to_uint8");
var bytes_to_hex_1 = require("./bytes_to_hex");
var wasmCode = fs.readFileSync('../pkg/musig_banano_wasm_bg.wasm');
var wasmModule = new WebAssembly.Module(wasmCode);
var imports = {};
var musig_banano_instance = new WebAssembly.Instance(wasmModule, imports);
var musig_banano = musig_banano_instance.exports;
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#LL4157C1-L4173C10
function copyToWasm(bytes, ptr) {
    if (ptr === void 0) { ptr = undefined; }
    if (!ptr) {
        ptr = musig_banano.musig_malloc(bytes.length);
    }
    var buf = new Uint8Array(musig_banano.memory.buffer, ptr, bytes.length);
    for (var i = 0; i < bytes.length; i++) {
        buf[i] = bytes[i];
    }
    return ptr;
}
function copyFromWasm(ptr, length) {
    var out = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
        out[i] = musig_banano.memory.buffer[ptr + i];
    }
    return out;
}
function fromHexString(hexString) {
    if (!hexString)
        return new Uint8Array();
    return new Uint8Array(hexString.match(/.{2}/g).map(function (byte) { return parseInt(byte, 16); }));
}
function toHexString(bytes) {
    return bytes.reduce(function (str, byte) { return str + byte.toString(16).padStart(2, '0'); }, '');
}
function byteArraysEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4191-L4194
var wasmErrors = ["No error", "Internal WASM error", "Invalid parameter(s) passed to WASM", "Invalid peer message specified"];
var wasmError = function (errCode) {
    return "WASM error ".concat(errCode, ": ").concat(wasmErrors[errCode]);
};
// address to pubkey string helper functions
function get_pubkey(address) {
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
}
;
function get_pubkeys(addresses) {
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
}
;
// TODO: wrap musigStagePtr, musigStageNum, addresses and so on in the BananoMusigCeremony class.
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4198
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#LL4267C32-L4267C45
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4283
// TODO: Check if BananoMusigCeremony is thread safe and if it isn't, create mutex lock for the ceremony.
var addresses = [];
var messageToSign;
var ceremonyState = undefined;
var musigStagePtr, musigStageNum, musigStageInputToShare, pubkeysLen;
function set_addresses(new_addresses) {
    addresses = new_addresses;
}
exports.set_addresses = set_addresses;
;
function get_addresses() {
    return addresses;
}
exports.get_addresses = get_addresses;
;
function set_message_to_sign(new_message) {
    // TODO: Validate that it's a block hash
    messageToSign = new_message;
}
exports.set_message_to_sign = set_message_to_sign;
;
function ceremony_state() {
    return ceremonyState;
}
exports.ceremony_state = ceremony_state;
function input_to_share() {
    return musigStageInputToShare;
}
exports.input_to_share = input_to_share;
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4198-L4258
// note that the aggregate function in this example uses an older build of musig
// before some parameters were moved from musig_stage0 to musig_state1:
// https://github.com/PlasmaPower/musig-nano/commit/7ab8c8d0dcc604cab72f0d28e6ec5ca19851b156
function musig_aggregated_address(callback) {
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
    pubkeysLen = pubkeys.length; //addresses.length
    var pubkeyPtrsBuf = new Uint32Array(musig_banano.memory.buffer, pubkeyPtrs, pubkeys.length);
    for (var i = 0; i < pubkeys.length; i++) {
        var pubkeyBytes = (0, hex_to_uint8_1.hexToUint8)(pubkeys[i]);
        pubkeyPtrsBuf[i] = copyToWasm(pubkeyBytes);
    }
    var outPtr = musig_banano.musig_malloc(33);
    var outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 33);
    outBuf[0] = 0;
    musig_banano.musig_aggregate_public_keys(pubkeyPtrs, pubkeysLen, outPtr, outPtr + 1);
    if (callback)
        callback(pubkeyPtrs, pubkeysLen);
    // TODO: solved, delete this
    // TODO: Figure out what this does
    // runWithPubkeys is unrolled into this aggregate function
    // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4236
    // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4283-L4286
    //musigStagePtr = musig_banano.musig_stage0(outPtr, outPtr + 1);
    //musigStageNum = 0;
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
        aggregated_address = bananojs.getAccount(aggPubkey, 'ban_');
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
}
exports.musig_aggregated_address = musig_aggregated_address;
;
function cleanup1() {
    if (musigStagePtr) {
        musig_banano.musig_free_stage0(musigStagePtr);
    }
    musigStagePtr = undefined;
    musigStageNum = undefined;
}
function cleanup_free_ptr(ptr) {
    musig_banano.musig_free(ptr);
}
function cleanup_ceremony() {
    // TODO: clean up musig_banano memory?
    ceremonyState = undefined;
}
function musig_start_ceremony(private_key) {
    if (!/^[a-fA-F0-9]{64}$/.test(private_key)) {
        throw new Error("Invalid private key");
    }
    if (!/^([a-fA-F0-9]{2})*$/.test(messageToSign)) {
        throw new Error("Message isn't valid hexadecimal");
    }
    var privateKeyPtr = copyToWasm(fromHexString(private_key));
    var outPtr = musig_banano.musig_malloc(65);
    var outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 65);
    outBuf[0] = 0;
    var isScalar = 0;
    var aggPubKey;
    try {
        var aggregate_status = musig_aggregated_address(function _stage0(pubkeyPtrs, pubkeysLen) {
            console.log(".------");
            musigStagePtr = musig_banano.musig_stage0(privateKeyPtr, pubkeyPtrs, pubkeysLen, isScalar, outPtr, outPtr + 1, outPtr + 33);
            musigStageNum = 0;
            console.log("musigStageNum", musigStageNum);
        });
        if (aggregate_status.status === "ok") {
            aggPubKey = aggregate_status.value;
            // do nothing
        }
        else {
            try {
                cleanup1();
            }
            catch (error) {
                throw (error);
            }
            finally {
                cleanup_free_ptr(privateKeyPtr);
                cleanup_ceremony();
            }
        }
    }
    catch (error) {
        cleanup1();
        throw (error);
    }
    finally {
        cleanup_free_ptr(privateKeyPtr);
        cleanup_ceremony();
    }
    var err = outBuf[0];
    if (err !== 0) {
        musigStagePtr = undefined;
        musigStageNum = undefined;
        cleanup_free_ptr(outPtr);
        cleanup_ceremony();
        throw wasmError(err);
    }
    // TODO: !!!
    /*
    if (!byteArraysEqual(aggPubKey, outBuf.subarray(1, 33))) {
      musig_banano.musig_free_stage0(musigStagePtr);
      musigStagePtr = undefined;
      musigStageNum = undefined;
      musig_banano.musig_free(outPtr);
      cleanup_free_ptr(outPtr);
      cleanup_ceremony();
      throw new Error("Specified private key not in the list of public keys");
    }
    */
    ceremonyState = "started";
    musigStageInputToShare = toHexString(outBuf.subarray(33));
    musig_banano.musig_free(outPtr);
}
exports.musig_start_ceremony = musig_start_ceremony;
function musig_advance_ceremony(other_participants_inputs) {
    if (["failed", undefined].includes(ceremonyState)) {
        throw Error("Unable to call musig_advance_ceremony, ceremonyState: ".concat(ceremonyState));
    }
    if (ceremonyState === "succeeded") {
        console.error("called musig_advance_ceremony but the ceremony already succeeded");
        return;
    }
    var protocolInputs = other_participants_inputs.map(function (s) { return s.trim().toLowerCase(); });
    var expectedLen = pubkeysLen - 1;
    if (other_participants_inputs.includes(musigStageInputToShare))
        expectedLen++;
    if (other_participants_inputs.length != expectedLen) {
        throw new Error("Wrong number of inputs from other participants:" +
            " expected 1 for each other participant (and optionally our own input)");
    }
    var protocolInputPtrs = musig_banano.musig_malloc(protocolInputs.length * 4);
    var protocolInputPtrsBuf = new Uint32Array(musig_banano.memory.buffer, protocolInputPtrs, protocolInputs.length);
    for (var i = 0; i < protocolInputs.length; i++) {
        protocolInputPtrsBuf[i] = copyToWasm(fromHexString(protocolInputs[i]));
    }
    var outLen = (musigStageNum === 2) ? 65 : 33;
    var outPtr = musig_banano.musig_malloc(outLen);
    var outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, outLen);
    outBuf[0] = 0;
    var newStagePtr;
    if (musigStageNum === 0) {
        var message = fromHexString(messageToSign);
        var messagePtr = copyToWasm(message);
        newStagePtr = musig_banano.musig_stage1(musigStagePtr, messagePtr, message.length, protocolInputPtrs, protocolInputs.length, outPtr, outPtr + 1);
        musig_banano.musig_free(messagePtr);
    }
    else if (musigStageNum === 1) {
        newStagePtr = musig_banano.musig_stage2(musigStagePtr, protocolInputPtrs, protocolInputs.length, outPtr, outPtr + 1);
    }
    else if (musigStageNum === 2) {
        newStagePtr = musig_banano.musig_stage3(musigStagePtr, protocolInputPtrs, protocolInputs.length, outPtr, outPtr + 1);
    }
    else {
        musig_banano.musig_free(outPtr);
        cleanup_ceremony();
        throw new Error("Unexpected musigStageNum " + musigStageNum);
    }
    var err = outBuf[0];
    if (err !== 0) {
        musig_banano.musig_free(outPtr);
        if (err === 1) {
            // Now in an invalid state
            ceremonyState = "failed";
        }
        throw wasmError(err);
    }
    musigStagePtr = newStagePtr;
    musigStageNum++;
    musigStageInputToShare = toHexString(outBuf.subarray(1));
    if (musigStageNum === 3) {
        ceremonyState = "succeeded";
    }
    musig_banano.musig_free(outPtr);
}
exports.musig_advance_ceremony = musig_advance_ceremony;
//# sourceMappingURL=banano_musig_ceremony.js.map