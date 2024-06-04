export declare class SyncBufferReader {
    private byteData;
    private index;
    private dataView;
    constructor(byteData: Uint8Array);
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
//# sourceMappingURL=SyncBufferReader.d.ts.map