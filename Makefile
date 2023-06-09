.POSIX:
.PHONY: *

default: build

tools:
	nix-shell -p rustup libiconv wasm-pack openssl

build:
	wasm-pack build --target web --release

clean:
	rm -rf pkg
