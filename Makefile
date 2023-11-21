.POSIX:
.PHONY: *

default: build

tools:
	nix-shell

build:
	wasm-pack build --target web --release

clean:
	rm -rf pkg
