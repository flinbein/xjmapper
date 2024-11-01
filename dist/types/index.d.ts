export type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
export type XJPrimitive = 
/**
 * 0x15
 */
undefined
/**
 * 0x00
 */
 | null
/**
 * 0x01 = false
 * 0x02 = true
 */
 | boolean
/**
 * 0xf? = ?
 * 0x16 [*1] = positive 0x00 - 0xff (uint8)
 * 0x18 [*1] = negative 0x00 - 0xff (uint8)
 * 0x19 [*2] = positive 0x0000 - 0xffff (uint16)
 * 0x1A [*2] = negative 0x0000 - 0xffff (uint16)
 * 0x1B [*4] = positive 0x00000000 - 0xffffffff (uint32)
 * 0x1C [*4] = negative 0x00000000 - 0xffffffff (uint32)
 * 0x04 [*8] = float64
 */
 | number
/**
 * 0x04 [number] [data*?] = positive bigint
 * 0x17 [number] [data*?] = negative bigint
 */
 | bigint
/**
 * 0xe? [data*?] = string len 0 - 15
 * 0x05 [number] [*] = other strings
 */
 | string
/**
 * 0x06 [number] [*]
 */
 | ArrayBuffer
/**
 * 0x07-0x11 [number] [*]
 */
 | TypedArray;
export type XJArray = readonly XJData[];
export type XJRecord = {
    readonly [key: string]: XJData;
};
export type XJData = Error | XJPrimitive | XJArray | XJRecord;
export declare function serialize(...val: XJData[]): Uint8Array;
export declare function parse(data: ArrayBuffer | TypedArray | DataView | string, maxCount?: number): XJData[];
