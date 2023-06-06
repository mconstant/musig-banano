.POSIX:
.PHONY: *

default: build

tools:
	nix-shell -p rustup libiconv wasm-tools

build:
	cargo build --target wasm32-unknown-unknown --release
