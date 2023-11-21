{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/2d17793c38fde8000c382b6e41084e45e1aa1ea9.tar.gz") {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.rustup
    pkgs.pkg-config
    pkgs.zlib
    pkgs.binaryen
    pkgs.libiconv
    pkgs.wasm-pack
    pkgs.wabt
    pkgs.openssl
    pkgs.nodejs
    pkgs.nodePackages.typescript
  ];
}
