export type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
export type XJPrimitive = undefined | null | boolean | number | bigint | string | ArrayBuffer | TypedArray;
export type XJArray = readonly XJData[];
export type XJRecord = {
    readonly [key: string]: XJData;
};
export type XJData = Error | XJPrimitive | XJArray | XJRecord;
export declare function serialize(...val: XJData[]): Uint8Array;
export declare function parse(data: TypedArray | ArrayBuffer, maxCount?: number): readonly XJData[];
