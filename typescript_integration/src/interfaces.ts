export interface IMusigSuccess<T> {
  status: 'ok',
  value: T
}

export interface IMusigError {
  status: 'error',
  message: string
}
