export type Type<T> = new (...args: any[]) => T;

export type TypeWithArgs<T, A> = new (...args: A[]) => T;
