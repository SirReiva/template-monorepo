export type Type<T> = new (...args: any[]) => T;

export type TypeWithArgs<T, A> = new (...args: A[]) => T;

type AllKeysOf<T> = T extends any ? keyof T : never; // get all keys of a union
type ProhibitKeys<K extends keyof any> = { [P in K]?: never }; // from above
export type ExactlyOneOf<T extends any[]> = {
	[K in keyof T]: T[K] &
		ProhibitKeys<Exclude<AllKeysOf<T[number]>, keyof T[K]>>;
}[number];
