/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export function musig_malloc(a: number): number;
export function musig_free(a: number): void;
export function musig_aggregate_public_keys(a: number, b: number, c: number, d: number): void;
export function musig_stage0(a: number, b: number): number;
export function musig_stage1(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number): number;
export function musig_stage2(a: number, b: number, c: number, d: number, e: number): number;
export function musig_stage3(a: number, b: number, c: number, d: number, e: number): void;
export function musig_free_stage0(a: number): void;
export function musig_free_stage1(a: number): void;
export function musig_free_stage2(a: number): void;
export function musig_observe(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number): void;
