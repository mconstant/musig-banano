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
const copyToWasm = (bytes: Uint8Array, ptr: any = undefined) => {
  if (!ptr) {
    ptr = musig_banano.musig_malloc(bytes.length);
  }
  const buf = new Uint8Array(musig_banano.memory.buffer, ptr, bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    buf[i] = bytes[i];
  }
  return ptr;
}
const copyFromWasm = (ptr, length) => {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = musig_banano.memory.buffer[ptr + i];
  }
  return out;
}
// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4191-L4194
const wasmErrors = ["No error", "Internal WASM error", "Invalid parameter(s) passed to WASM", "Invalid peer message specified"];
const wasmError = (errCode): string => {
  return `WASM error ${errCode}: ${wasmErrors[errCode]}`;
}

// address to pubkey string helper functions
const get_pubkey = (address: string): (string | undefined) => {
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
const get_pubkeys = (addresses: string[]): (IMusigSuccess<string[]> | IMusigError) => {
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
let musigStagePtr, musigStageNum;

export const set_addresses = (new_addresses: string[]): void => {
  addresses = new_addresses;
};

export const get_addresses = (): string[] => {
  return addresses;
}

// https://github.com/PlasmaPower/musig-nano/blob/gh-pages/index.html#L4198-L4258
// note that the aggregate function in this example uses an older build of musig
// before some parameters were moved from musig_stage0 to musig_state1:
// https://github.com/PlasmaPower/musig-nano/commit/7ab8c8d0dcc604cab72f0d28e6ec5ca19851b156
export const musig_aggregated_address = (): (IMusigSuccess<string> | IMusigError) => {
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
  const pubkeyPtrs = musig_banano.musig_malloc(pubkeys.length * 4);
  const pubkeyPtrsBuf = new Uint32Array(musig_banano.memory.buffer, pubkeyPtrs, pubkeys.length);
  for (let i = 0; i < pubkeys.length; i++) {
    const pubkeyBytes: Uint8Array = hexToUint8(pubkeys[i]);
    pubkeyPtrsBuf[i] = copyToWasm(pubkeyBytes);
  }

  const outPtr = musig_banano.musig_malloc(33);
  const outBuf = new Uint8Array(musig_banano.memory.buffer, outPtr, 33);
  outBuf[0] = 0;
  musig_banano.musig_aggregate_public_keys(pubkeyPtrs, pubkeys.length, outPtr, outPtr + 1);

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
