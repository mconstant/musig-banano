import * as musig_banano from './musig_banano_bg.wasm';
const bananojs = require("@bananocoin/bananojs");

// TODO: Move to BananoMusigCeremony class
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

// interfaces
export interface IMusigSuccess<T> {
  status: 'ok',
  value: T
}

export interface IMusigError {
  status: 'error',
  message: string
}

// https://github.com/BananoCoin/bananojs/blob/04296a0d5d756f2ba36f043f935658a3aa5e39df/app/scripts/banano-util.js#L382
const hexToUint8 = (hexValue: string): Uint8Array => {
  const length = (hexValue.length / 2) | 0;
  const uint8 = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8[i] = parseInt(hexValue.substr(i * 2, 2), 16);
  }
  return uint8;
};

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
let addresses;
export const aggregate_addresses = (runWithPubkeys: Function): (IMusigSuccess<string> | IMusigError) => {
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
  if (runWithPubkeys) runWithPubkeys(pubkeyPtrs, pubkeys.length);
  for (let i = 0; i < pubkeyPtrsBuf.length; i++) {
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
