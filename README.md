# musig-banano

## precompiled binary from github CI

If you don't want to compile the binary yourself this repo has a github action that compiles the wasm and puts a file in the releases.

You can download musig_banano.wasm from the latest release

## Building the wasm yourself locally

If you have [nix](https://nixos.org/download.html) (recommended)

`$ make tools` to get all your dependencies

then

`$ make build` to build

This will generate a wasm in `target/wasm32-unknown-unknown/release/musig_banano.wasm`

## Background

This is a fork (peel) of musig-nano adapted for [Banano](https://banano.cc)

This is a Rust project that exports a C FFI which is documented in `interface.h`. It allows for N of N multisignature accounts with Banano.

An overview of the MuSig algorithm can be found here: https://blockstream.com/2018/01/23/musig-key-aggregation-schnorr-signatures.html and the paper can be found here: https://eprint.iacr.org/2018/068

This library does require the R value commitment (the 3 round version), because unlike the linked overview says, the scheme without it has been proven insecure. See https://medium.com/blockstream/insecure-shortcuts-in-musig-2ad0d38a97da for more details.
