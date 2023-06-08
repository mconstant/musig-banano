export interface IMusigSuccess<T> {
    status: 'ok';
    value: T;
}
export interface IMusigError {
    status: 'error';
    message: string;
}
export declare const aggregate_addresses: (runWithPubkeys: Function) => (IMusigSuccess<string> | IMusigError);
