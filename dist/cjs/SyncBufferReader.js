"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncBufferReader = void 0;
class SyncBufferReader {
    index = 0;
    dataView;
    constructor(data) {
        this.dataView =
            data instanceof DataView ? data :
                data instanceof ArrayBuffer ? new DataView(data) :
                    new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    assertSize(bytesSize) {
        if (this.dataView.byteLength < this.index + bytesSize) {
            throw new Error("wrong binary state-data format");
        }
    }
    getNextUint8() {
        return this.dataView.getUint8(this.index++);
    }
    getNextUint16() {
        const result = this.dataView.getUint16(this.index, true);
        this.index += 2;
        return result;
    }
    getNextUint32() {
        const result = this.dataView.getUint32(this.index, true);
        this.index += 4;
        return result;
    }
    getNextFloat64() {
        const result = this.dataView.getFloat64(this.index, true);
        this.index += 8;
        return result;
    }
    skipBytes(count) {
        this.assertSize(count);
        this.index += count;
    }
    getNextUint8Array(size) {
        return new Uint8Array(this.getArrayBuffer(size));
    }
    getArrayBuffer(size) {
        this.assertSize(size);
        const buffer = this.dataView.buffer.slice(this.dataView.byteOffset + this.index, this.dataView.byteOffset + this.index + size);
        this.index += size;
        return buffer;
    }
    hasBytes() {
        return this.index < this.dataView.byteLength;
    }
}
exports.SyncBufferReader = SyncBufferReader;
//# sourceMappingURL=SyncBufferReader.js.map