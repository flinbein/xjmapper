"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncBufferReader = void 0;
class SyncBufferReader {
    byteData;
    index = 0;
    dataView;
    constructor(byteData) {
        this.byteData = byteData;
        this.dataView = byteData instanceof ArrayBuffer
            ? new DataView(byteData)
            : new DataView(byteData.buffer, byteData.byteOffset, byteData.byteLength);
    }
    assertSize(bytesSize) {
        if (this.byteData.byteLength < this.index + bytesSize) {
            throw new Error("wrong binary state-data format");
        }
    }
    getNextUint8() {
        return this.dataView.getUint8(this.index++);
    }
    getNextInt32() {
        const result = this.dataView.getInt32(this.index, true);
        this.index += 4;
        return result;
    }
    getNextFloat64() {
        const result = this.dataView.getFloat64(this.index, true);
        this.index += 8;
        return result;
    }
    skipBytes(count = 1) {
        this.assertSize(count);
        this.index += count;
    }
    getNextUint8Array(size) {
        this.assertSize(size);
        const buffer = this.dataView.buffer.slice(this.dataView.byteOffset + this.index, this.dataView.byteOffset + this.index + size);
        const result = new Uint8Array(buffer);
        this.index += size;
        return result;
    }
    getNextUintSizeAndUint8Array(multiplier = 1) {
        const size = this.getNextInt32();
        const byteLength = size * multiplier;
        return this.getNextUint8Array(byteLength);
    }
    readUintSizeAndArrayBuf(multiplier = 1) {
        const { buffer, byteLength, byteOffset } = this.getNextUintSizeAndUint8Array(multiplier);
        return buffer.slice(byteOffset, byteOffset + byteLength);
    }
    hasBytes() {
        return this.index < this.byteData.byteLength;
    }
}
exports.SyncBufferReader = SyncBufferReader;
//# sourceMappingURL=SyncBufferReader.js.map