# musig-banano

## Building the wasm

If you have [nix](https://nixos.org/download.html) (recommended)

`$ make tools` to get all your dependencies

then

`$ make build` to build

This will generate a wasm and js:
```
pkg/musig_banano_bg.wasm
pkg/musig_banano_bg.d.ts
pkg/musig_banano.d.ts
pkg/musig_banano.js
```

## Background

This is a fork (peel) of musig-nano adapted for [Banano](https://banano.cc)

This is a Rust project that exports a C FFI which is documented in `interface.h`. It allows for N of N multisignature accounts with Banano.

An overview of the MuSig algorithm can be found here: https://blockstream.com/2018/01/23/musig-key-aggregation-schnorr-signatures.html and the paper can be found here: https://eprint.iacr.org/2018/068

This library does require the R value commitment (the 3 round version), because unlike the linked overview says, the scheme without it has been proven insecure. See https://medium.com/blockstream/insecure-shortcuts-in-musig-2ad0d38a97da for more details.

## summary

```
make tools
make build
```

## Build

This repo builds automatically and publishes to https://mconstant.github.io/musig-banano/

## Test Results

The test results from every build are available at https://mconstant.github.io/musig-banano/mochawesome.html
