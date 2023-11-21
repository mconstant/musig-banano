import * as fs from 'fs';
// external dependencies
const bananojs = require("@bananocoin/bananojs");

// interfaces
import { IMusigSuccess, IMusigError } from './interfaces';

// src imports
import { hexToUint8 } from './hex_to_uint8';
import { bytesToHex } from './bytes_to_hex';

const wasmCode = fs.readFileSync('../pkg/musig_banano_wasm_bg.wasm');
const wasmModule = new WebAssembly.Module(wasmCode);
const imports = {};
const musig_banano_instance: any = new WebAssembly.Instance(wasmModule, imports);
const musig_banano = musig_banano_instance.exports;

// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#LL4157C1-L4173C10
function copyToWasm(bytes: Uint8Array, ptr: any = undefined) {
  if (!ptr) {
    ptr = musig_banano.musig_malloc(bytes.length);
  }
  const buf = new Uint8Array(musig_banano.memory.buffer, ptr, bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    buf[i] = bytes[i];
  }
  return ptr;
}
function copyFromWasm(ptr, length) {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = musig_banano.memory.buffer[ptr + i];
  }
  return out;
}
function fromHexString(hexString) {
  if (!hexString) return new Uint8Array();
  return new Uint8Array(hexString.match(/.{2}/g).map(byte => parseInt(byte, 16)));
}
function toHexString(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}
function byteArraysEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4191-L4194
const wasmErrors = ["No error", "Internal WASM error", "Invalid parameter(s) passed to WASM", "Invalid peer message specified"];
const wasmError = (errCode): string => {
  return `WASM error ${errCode}: ${wasmErrors[errCode]}`;
}

// address to pubkey string helper functions
function get_pubkey(address: string): (string | undefined) {
  let pubkey: (string | undefined) = undefined;

  try {
    pubkey = bananojs.getAccountPublicKey(address);
  } catch (error) {
    return undefined;
  }

  // TODO: verify account_hex here. It's not really needed since bananojs.getAccountPublicKey
  // not throwing an error should be good enough.

  return pubkey;
};
function get_pubkeys(addresses: string[]): (IMusigSuccess<string[]> | IMusigError) {
  let pubkeys: string[] = [];

  for (let address of addresses) {
    if (!address.startsWith('ban_1') && !address.startsWith('ban_3')) {
      return {
        status: 'error',
        message: "Banano address must start with ban_1 or ban_3"
      };
    }

    const pubkey: (string | undefined) = get_pubkey(address);

    if (typeof (pubkey) === 'string') {
      pubkeys.push(pubkey);
    } else if (pubkey === undefined) {
      return {
        status: 'error',
        message: "Banano address invalid"
      };
    } else {
      return {
        status: 'error',
        message: `Unexpected public key type. Expected string, got: ${typeof (pubkey)}`
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
let addresses = [];
let messageToSign;
type TCeremoryState = undefined | "started" | "succeeded" | "failed";
let ceremonyState: TCeremoryState = undefined;
let musigStagePtr, musigStageNum, pubkeyPtrs, pubkeysLen, musigStageInputToShare;

export function set_addresses2(new_addresses: string[]): void {
  addresses = new_addresses;
};

export function get_addresses2(): string[] {
  return addresses;
};

export function set_message_to_sign2(new_message: string): void {
  // TODO: Validate that it's a block hash
  messageToSign = new_message;
};

export function ceremony_state2(): TCeremoryState {
  return ceremonyState;
}

// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4198-L4258
// note that the aggregate function in this example uses an older build of musig
// before some parameters were moved from musig_stage0 to musig_state1:
// https://github.com/PlasmaPower/musig-nano/commit/7ab8c8d0dcc604cab72f0d28e6ec5ca19851b156
export function musig_aggregated_address2(): (IMusigSuccess<string> | IMusigError) {
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

  const generate_pubkeys_result: (IMusigSuccess<string[]> | IMusigError) = get_pubkeys(addresses);
  if (generate_pubkeys_result.status === 'error') {
    return generate_pubkeys_result;
  }
  const pubkeys = generate_pubkeys_result.value;

  // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4227C17-L4231
  pubkeyPtrs = musig_banano.musig_malloc(pubkeys.length * 4);
  pubkeysLen =  addresses.length
  const pubkeyPtrsBuf = new Uint32Array(musig_banano.memory.buffer, pubkeyPtrs, pubkeys.length);
  for (let i = 0; i < pubkeys.length; i++) {
    const pubkeyBytes: Uint8Array = hexToUint8(pubkeys[i]);
    pubkeyPtrsBuf[i] = copyToWasm(pubkeyBytes);
  }

  const outPtr = musig_banano.musig_malloc(33);
  const outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 33);
  outBuf[0] = 0;
  musig_banano.musig_aggregate_public_keys(pubkeyPtrs, pubkeys.length, outPtr, outPtr + 1);

  // TODO: solved, delete this
  // TODO: Figure out what this does
  // runWithPubkeys is unrolled into this aggregate function
  // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4236
  // https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4283-L4286
  //musigStagePtr = musig_banano.musig_stage0(outPtr, outPtr + 1);
  //musigStageNum = 0;

  for (let i = 0; i < pubkeyPtrsBuf.length; i++) {
    musig_banano.musig_free(pubkeyPtrsBuf[i]);
  }

  musig_banano.musig_free(pubkeyPtrs);
  const err = outBuf[0];
  if (err !== 0) {
    musig_banano.musig_free(outPtr);
    return {
      status: 'error',
      message: wasmError(err)
    };
  }

  let aggregated_address;
  try {
    const aggPubkeyBytes = outBuf.subarray(1).slice();
    const aggPubkey = bytesToHex(aggPubkeyBytes);
    aggregated_address = bananojs.getAccount(aggPubkey, 'ban_');
  } catch {
    return {
      status: 'error',
      message: 'error generating banano address from aggregated public key'
    };
  } finally {
    musig_banano.musig_free(outPtr);
  }

  return {
    status: 'ok',
    value: aggregated_address
  };
};

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
export function input_to_share2() {
  return musigStageInputToShare;
}

export function musig_start_ceremony2(private_key: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(private_key)) {
    throw new Error("Invalid private key");
  }
  if (!/^([a-fA-F0-9]{2})*$/.test(messageToSign)) {
    throw new Error("Message isn't valid hexadecimal");
  }
  const privateKeyPtr = copyToWasm(fromHexString(private_key));
  const outPtr = musig_banano.musig_malloc(65);
  const outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 65);
  outBuf[0] = 0;

  const isScalar = 0;
  let aggPubKey;
  try {
    const aggregate_status = musig_aggregated_address2();
    if (aggregate_status.status === "ok") {
      musigStagePtr = musig_banano.musig_stage0(outPtr, outPtr + 1);
      musigStageNum = 0;
    } else {
      try {
        cleanup1();
      } catch (error) {
        throw (error);
      } finally {
        cleanup_free_ptr(privateKeyPtr);
        cleanup_ceremony();
      }
    }
  } catch (error) {
    cleanup1();
    throw (error);
  } finally {
    cleanup_free_ptr(privateKeyPtr);
    cleanup_ceremony();
  }
  const err = outBuf[0];
  if (err !== 0) {
    musigStagePtr = undefined;
    musigStageNum = undefined;
    cleanup_free_ptr(outPtr);
    cleanup_ceremony();
    throw wasmError(err);
  }
  if (!byteArraysEqual(aggPubKey, outBuf.subarray(1, 33))) {
    musig_banano.musig_free_stage0(musigStagePtr);
    musigStagePtr = undefined;
    musigStageNum = undefined;
    musig_banano.musig_free(outPtr);
    cleanup_free_ptr(outPtr);
    cleanup_ceremony();
    throw new Error("Specified private key not in the list of public keys");
  }

  ceremonyState = "started";
  musigStageInputToShare = toHexString(outBuf.subarray(33));
  musig_banano.musig_free(outPtr);
}

export function musig_advance_ceremony2(other_participants_inputs) {
  if (["failed", undefined].includes(ceremonyState)) {
    throw Error(`Unable to call musig_advance_ceremony, ceremonyState: ${ceremonyState}`);
  }
  if (ceremonyState === "succeeded") {
    console.error(`called musig_advance_ceremony but the ceremony already succeeded`);
    return;
  }
  const protocolInputs = other_participants_inputs.map(s => s.trim().toLowerCase());
  let expectedLen = pubkeysLen - 1;
  if (other_participants_inputs.includes(musigStageInputToShare)) expectedLen++;
  if (other_participants_inputs.length != expectedLen) {
    throw new Error("Wrong number of inputs from other participants:" +
      " expected 1 for each other participant (and optionally our own input)");
  }
  const protocolInputPtrs = musig_banano.musig_malloc(protocolInputs.length * 4);
  const protocolInputPtrsBuf = new Uint32Array(musig_banano.memory.buffer, protocolInputPtrs, protocolInputs.length);
  for (let i = 0; i < protocolInputs.length; i++) {
    protocolInputPtrsBuf[i] = copyToWasm(fromHexString(protocolInputs[i]));
  }
  const outLen = (musigStageNum === 2) ? 65 : 33;
  const outPtr = musig_banano.musig_malloc(outLen);
  const outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, outLen);
  outBuf[0] = 0;
  let newStagePtr;
  if (musigStageNum === 0) {
    const message = fromHexString(messageToSign);
    const messagePtr = copyToWasm(message);
    newStagePtr = musig_banano.musig_stage1(musigStagePtr, messagePtr, message.length, protocolInputPtrs, protocolInputs.length, outPtr, outPtr + 1);
    musig_banano.musig_free(messagePtr);
  } else if (musigStageNum === 1) {
    newStagePtr = musig_banano.musig_stage2(musigStagePtr, protocolInputPtrs, protocolInputs.length, outPtr, outPtr + 1);
  } else if (musigStageNum === 2) {
    newStagePtr = musig_banano.musig_stage3(musigStagePtr, protocolInputPtrs, protocolInputs.length, outPtr, outPtr + 1);
  } else {
    musig_banano.musig_free(outPtr);
    cleanup_ceremony();
    throw new Error("Unexpected musigStageNum " + musigStageNum);
  }
  const err = outBuf[0];
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