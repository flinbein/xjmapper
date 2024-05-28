var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { SyncBufferReader } from "./SyncBufferReader.js";
import { CausedError } from "./CausedError";
var encoder = new TextEncoder();
var decoder = new TextDecoder();
export function serialize() {
    var val = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        val[_i] = arguments[_i];
    }
    var dataList = val.flatMap(function (data) { return _serialize(data); });
    var totalSize = dataList.reduce(function (acc, e) { return acc + (typeof e === "number" ? 1 : e.byteLength); }, 0);
    var merged = new Uint8Array(totalSize);
    var offset = 0;
    for (var _a = 0, dataList_1 = dataList; _a < dataList_1.length; _a++) {
        var data = dataList_1[_a];
        if (typeof data === "number") {
            merged[offset++] = data;
        }
        else {
            var view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            merged.set(view, offset);
            offset += data.byteLength;
        }
    }
    return merged;
}
function _serialize(val, pool) {
    if (pool === null || pool === void 0 ? void 0 : pool.has(val))
        throw new Error("wrong xj format: recursive");
    if (val === null)
        return [0x00];
    if (val === undefined)
        return [0x15];
    if (typeof val === "boolean")
        return [val ? 0x02 : 0x01];
    if (typeof val === "number") {
        if (Number.isInteger(val) && val >= 0 && val <= 0x0f)
            return [0xf0 + val]; // small integers
        return [0x03, Float64Array.of(val)];
    }
    if (typeof val === "bigint") {
        var _a = _serialize(val.toString(10)), ignored_type = _a[0], dataBin = _a.slice(1);
        return __spreadArray([0x04], dataBin, true);
    }
    if (typeof val === "string") {
        encoder.encode(val);
        var stringBuffer = encoder.encode(val);
        return [
            0x05,
            Uint32Array.of(stringBuffer.byteLength),
            stringBuffer
        ];
    }
    if (val instanceof ArrayBuffer)
        return [0x06, Uint32Array.of(val.byteLength), new Uint8Array(val)];
    if (val instanceof Int8Array)
        return [0x07, Uint32Array.of(val.length), val];
    if (val instanceof Int16Array)
        return [0x08, Uint32Array.of(val.length), val];
    if (val instanceof Int32Array)
        return [0x09, Uint32Array.of(val.length), val];
    if (val instanceof Uint8Array)
        return [0x0a, Uint32Array.of(val.length), val];
    if (val instanceof Uint16Array)
        return [0x0b, Uint32Array.of(val.length), val];
    if (val instanceof Uint32Array)
        return [0x0c, Uint32Array.of(val.length), val];
    if (val instanceof Uint8ClampedArray)
        return [0x0d, Uint32Array.of(val.length), val];
    if (val instanceof Float32Array)
        return [0x0e, Uint32Array.of(val.length), val];
    if (val instanceof Float64Array)
        return [0x0f, Uint32Array.of(val.length), val];
    if (val instanceof BigInt64Array)
        return [0x10, Uint32Array.of(val.length), val];
    if (val instanceof BigUint64Array)
        return [0x11, Uint32Array.of(val.length), val];
    if (Array.isArray(val))
        return __spreadArray([
            0x12,
            Uint32Array.of(val.length)
        ], val.flatMap(function (item) { return _serialize(item, new Set(pool).add(val)); }), true);
    if (val instanceof Error) {
        var _b = _serialize(String(val.name)), dataName = _b.slice(1);
        var _c = _serialize(String(val.message)), dataMessage = _c.slice(1);
        var _d = _serialize(String(val.stack)), dataStack = _d.slice(1);
        var causeData = [0x00];
        if (val instanceof CausedError && val.cause !== undefined)
            try {
                var causeSerialized = _serialize(val.cause);
                causeData = __spreadArray([0x01], causeSerialized, true);
            }
            catch (_e) { }
        return __spreadArray(__spreadArray(__spreadArray(__spreadArray([
            0x14
        ], dataName, true), dataMessage, true), dataStack, true), causeData, true);
    }
    if (typeof val === "object") {
        var names = Object.getOwnPropertyNames(val).sort();
        var closedVal_1 = val;
        return __spreadArray([
            0x13,
            Uint32Array.of(names.length)
        ], names.flatMap(function (key) {
            var _a = _serialize(key), ignored_type = _a[0], dataBin = _a.slice(1);
            return __spreadArray(__spreadArray([], dataBin, true), _serialize(closedVal_1[key], new Set(pool).add(val)), true);
        }), true);
    }
    throw new Error("wrong xj format: wrong type");
}
export function parse(data, maxCount) {
    if (maxCount === void 0) { maxCount = Infinity; }
    var result = [];
    var reader = new SyncBufferReader(data);
    while (maxCount-- > 0 && reader.hasBytes())
        result.push(_parse(reader));
    return result;
}
function _parse(data, type) {
    if (type == null)
        type = data.getNextUint8();
    if (type === 0x00)
        return null;
    if (type === 0x01)
        return false;
    if (type === 0x02)
        return true;
    if (type === 0x03)
        return data.getNextFloat64();
    if (type === 0x04)
        return BigInt(_parse(data, 0x05));
    if (type === 0x05)
        return decoder.decode(data.getNextUintSizeAndUint8Array());
    if (type === 0x06)
        return data.readUintSizeAndArrayBuf();
    if (type === 0x07 /*Int8Array*/)
        return new Int8Array(data.readUintSizeAndArrayBuf());
    if (type === 0x08 /*Int16Array*/)
        return new Int16Array(data.readUintSizeAndArrayBuf(2));
    if (type === 0x09 /*Int32Array*/)
        return new Int32Array(data.readUintSizeAndArrayBuf(4));
    if (type === 0x0a /*Uint8Array*/)
        return new Uint8Array(data.readUintSizeAndArrayBuf());
    if (type === 0x0b /*Uint16Array*/)
        return new Uint16Array(data.readUintSizeAndArrayBuf(2));
    if (type === 0x0c /*Uint32Array*/)
        return new Uint32Array(data.readUintSizeAndArrayBuf(4));
    if (type === 0x0d /*Uint8ClampedArray*/)
        return new Uint8ClampedArray(data.readUintSizeAndArrayBuf());
    if (type === 0x0e /*Float32Array*/)
        return new Float32Array(data.readUintSizeAndArrayBuf(4));
    if (type === 0x0f /*Float64Array*/)
        return new Float64Array(data.readUintSizeAndArrayBuf(8));
    if (type === 0x10 /*BigInt64Array*/)
        return new BigInt64Array(data.readUintSizeAndArrayBuf(8));
    if (type === 0x11 /*BigUint64Array*/)
        return new BigUint64Array(data.readUintSizeAndArrayBuf(8));
    if (type === 0x12 /*Array*/)
        return Array.from({ length: data.getNextInt32() }).map(function () { return _parse(data); });
    if (type === 0x13 /*Object*/) {
        var result = Object.create(null);
        var size = data.getNextInt32();
        while (size-- > 0)
            Object.defineProperty(result, _parse(data, 0x05), {
                value: _parse(data),
                enumerable: true,
                writable: true,
            });
        return result;
    }
    if (type === 0x14 /*Error*/) {
        var name_1 = decoder.decode(data.getNextUintSizeAndUint8Array());
        var message = decoder.decode(data.getNextUintSizeAndUint8Array());
        var stack = decoder.decode(data.getNextUintSizeAndUint8Array());
        var hasCause = data.getNextUint8();
        var result = void 0;
        if (!hasCause) {
            result = new Error(message);
        }
        else {
            var cause = _parse(data);
            result = new CausedError(message, { cause: cause });
        }
        result.name = name_1;
        result.stack = stack;
        return result;
    }
    if (type === 0x15)
        return undefined;
    if (type >= 0xf0 && type <= 0xff)
        return type - 0xf0; // small integers
    throw new Error("wrong binary state-data format");
}
