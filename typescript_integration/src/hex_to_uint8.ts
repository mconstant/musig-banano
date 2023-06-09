// https://github.com/BananoCoin/bananojs/blob/04296a0d5d756f2ba36f043f935658a3aa5e39df/app/scripts/banano-util.js#L382
export const hexToUint8 = (hexValue: string): Uint8Array => {
  const length = (hexValue.length / 2) | 0;
  const uint8 = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8[i] = parseInt(hexValue.substr(i * 2, 2), 16);
  }
  return uint8;
};
