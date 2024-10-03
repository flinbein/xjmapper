import type { TypedArray } from "./index";
export declare class SyncBufferReader {
    private index;
    private dataView;
    constructor(data: TypedArray | ArrayBuffer | DataView);
    private assertSize;
    getNextUint8(): number;
    getNextInt32(): number;
    getNextFloat64(): number;
    skipBytes(count?: number): void;
    getNextUint8Array(size: number): Uint8Array;
    getNextUintSizeAndUint8Array(multiplier?: number): Uint8Array;
    readUintSizeAndArrayBuf(multiplier?: number): ArrayBuffer;
    hasBytes(): boolean;
}
