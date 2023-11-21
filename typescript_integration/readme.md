# typescript_integration

## build

```
cd typescript_integration
cp ../pkg/musig_banano_wasm_bg.wasm src/musig_banano_bg.wasm
cp ../pkg/musig_banano_wasm_bg.wasm.d.ts src/musig_banano_bg.wasm.d.ts
cp ../pkg/musig_banano_wasm.js src/musig_banano.js
cp ../pkg/musig_banano_wasm.d.ts src/musig_banano.d.ts
cp ../pkg/musig_banano_wasm_bg.wasm dist/musig_banano_bg.wasm
cp ../pkg/musig_banano_wasm_bg.wasm.d.ts dist/musig_banano_bg.wasm.d.ts
cp ../pkg/musig_banano_wasm.js dist/musig_banano.js
cp ../pkg/musig_banano_wasm.d.ts dist/musig_banano.d.ts
npm run build
```
