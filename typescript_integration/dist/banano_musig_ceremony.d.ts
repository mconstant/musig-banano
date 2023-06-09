import { IMusigSuccess, IMusigError } from './interfaces';
export declare const set_addresses: (new_addresses: string[]) => void;
export declare const musig_aggregated_address: () => (IMusigSuccess<string> | IMusigError);
