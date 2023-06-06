.POSIX:
.PHONY: *

default: build

tools:
	nix-shell -p rustup libiconv

build:
	cargo build --target wasm32-unknown-unknown --release