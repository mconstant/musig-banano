/* tslint:disable */
/* eslint-disable */

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly musig_malloc: (a: number) => number;
  readonly musig_free: (a: number) => void;
  readonly musig_aggregate_public_keys: (a: number, b: number, c: number, d: number) => void;
  readonly musig_stage0: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly musig_stage1: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly musig_stage2: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly musig_stage3: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly musig_free_stage0: (a: number) => void;
  readonly musig_free_stage1: (a: number) => void;
  readonly musig_free_stage2: (a: number) => void;
  readonly musig_observe: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
