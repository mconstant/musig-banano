// https://github.com/BananoCoin/bananojs/blob/04296a0d5d756f2ba36f043f935658a3aa5e39df/app/scripts/banano-util.js#LL173C3-L178C5
export const bytesToHex = (bytes: Uint8Array): string => {
  return Array.prototype.map
      .call(bytes, (x) => ('00' + x.toString(16)).slice(-2))
      .join('')
      .toUpperCase();
};
