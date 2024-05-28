var SyncBufferReader = /** @class */ (function () {
    function SyncBufferReader(byteData) {
        this.byteData = byteData;
        this.index = 0;
        this.dataView = new DataView(byteData.buffer, byteData.byteOffset, byteData.byteLength);
    }
    SyncBufferReader.prototype.assertSize = function (bytesSize) {
        if (this.byteData.length < this.index + bytesSize) {
            throw new Error("wrong binary state-data format");
        }
    };
    SyncBufferReader.prototype.getNextUint8 = function () {
        return this.dataView.getUint8(this.index++);
    };
    SyncBufferReader.prototype.getNextInt32 = function () {
        var result = this.dataView.getInt32(this.index, true);
        this.index += 4;
        return result;
    };
    SyncBufferReader.prototype.getNextFloat64 = function () {
        var result = this.dataView.getFloat64(this.index, true);
        this.index += 8;
        return result;
    };
    SyncBufferReader.prototype.skipBytes = function (count) {
        if (count === void 0) { count = 1; }
        this.assertSize(count);
        this.index += count;
    };
    SyncBufferReader.prototype.getNextUint8Array = function (size) {
        this.assertSize(size);
        var result = this.byteData.subarray(this.index, this.index + size);
        this.index += size;
        return result;
    };
    SyncBufferReader.prototype.getNextUintSizeAndUint8Array = function (multiplier) {
        if (multiplier === void 0) { multiplier = 1; }
        var size = this.getNextInt32();
        var byteLength = size * multiplier;
        return this.getNextUint8Array(byteLength);
    };
    SyncBufferReader.prototype.readUintSizeAndArrayBuf = function (multiplier) {
        if (multiplier === void 0) { multiplier = 1; }
        var _a = this.getNextUintSizeAndUint8Array(multiplier), buffer = _a.buffer, byteLength = _a.byteLength, byteOffset = _a.byteOffset;
        return buffer.slice(byteOffset, byteOffset + byteLength);
    };
    SyncBufferReader.prototype.hasBytes = function () {
        return this.index < this.byteData.length;
    };
    return SyncBufferReader;
}());
export { SyncBufferReader };
