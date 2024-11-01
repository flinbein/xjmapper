import { SyncBufferReader } from "./SyncBufferReader.js";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export function serialize(...val) {
    const dataList = val.flatMap(data => _serialize(data));
    const totalSize = dataList.reduce((acc, e) => acc + (typeof e === "number" ? 1 : e.byteLength), 0);
    const merged = new Uint8Array(totalSize);
    let offset = 0;
    for (let data of dataList) {
        if (typeof data === "number") {
            merged[offset++] = data;
        }
        else {
            const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            merged.set(view, offset);
            offset += data.byteLength;
        }
    }
    return merged;
}
function _serialize(val, pool) {
    if (pool?.has(val))
        throw new Error("wrong xj format: recursive");
    if (val === null)
        return [0x00];
    if (val === undefined)
        return [0x15];
    if (typeof val === "boolean")
        return [val ? 0x02 : 0x01];
    if (typeof val === "number") {
        if (Number.isInteger(val) && isIntegerPositive(val) && val <= 0x0f)
            return [0xf0 | val]; // small integers
        if (Number.isSafeInteger(val)) {
            const abs = val > 0 ? val : -val;
            if (abs <= 0xff)
                return [isIntegerPositive(val) ? 0x16 : 0x18, abs];
            if (abs <= 0xffff)
                return [isIntegerPositive(val) ? 0x19 : 0x1A, Uint16Array.of(abs)];
            if (abs <= 0xffffffff)
                return [isIntegerPositive(val) ? 0x1B : 0x1C, Uint32Array.of(abs)];
        } // small integers
        return [0x03, Float64Array.of(val)];
    }
    if (typeof val === "bigint") {
        const absVal = val < 0n ? -val : val;
        const bigintData = positiveBigIntToUint8Array(absVal);
        return [
            val < 0n ? 0x17 : 0x04,
            ..._serialize(bigintData.length),
            ...bigintData
        ];
    }
    if (typeof val === "string") {
        encoder.encode(val);
        const stringBuffer = encoder.encode(val);
        if (stringBuffer.length <= 0x0f)
            return [
                stringBuffer.length | 0xe0,
                stringBuffer
            ];
        return [
            0x05,
            ...serialize(stringBuffer.length),
            stringBuffer
        ];
    }
    if (val instanceof ArrayBuffer)
        return [0x06, ..._serialize(val.byteLength), new Uint8Array(val)];
    if (val instanceof Int8Array)
        return [0x07, ..._serialize(val.length), val];
    if (val instanceof Int16Array)
        return [0x08, ..._serialize(val.length), val];
    if (val instanceof Int32Array)
        return [0x09, ..._serialize(val.length), val];
    if (val instanceof Uint8Array)
        return [0x0a, ..._serialize(val.length), val];
    if (val instanceof Uint16Array)
        return [0x0b, ..._serialize(val.length), val];
    if (val instanceof Uint32Array)
        return [0x0c, ..._serialize(val.length), val];
    if (val instanceof Uint8ClampedArray)
        return [0x0d, ..._serialize(val.length), val];
    if (val instanceof Float32Array)
        return [0x0e, ..._serialize(val.length), val];
    if (val instanceof Float64Array)
        return [0x0f, ..._serialize(val.length), val];
    if (val instanceof BigInt64Array)
        return [0x10, ..._serialize(val.length), val];
    if (val instanceof BigUint64Array)
        return [0x11, ..._serialize(val.length), val];
    if (Array.isArray(val))
        return [
            0x12,
            ..._serialize(val.length),
            ...val.flatMap(item => _serialize(item, new Set(pool).add(val)))
        ];
    if (val instanceof Error) {
        let causeData = [0x00];
        if (val.cause !== undefined)
            try {
                const causeSerialized = _serialize(val.cause);
                causeData = [0x01, ...causeSerialized];
            }
            catch { }
        return [
            0x14,
            ..._serialize(String(val.name)),
            ..._serialize(String(val.message)),
            ..._serialize(String(val.stack)),
            ...causeData
        ];
    }
    if (typeof val === "object") {
        const names = Object.getOwnPropertyNames(val).sort();
        const closedVal = val;
        return [
            0x13,
            ..._serialize(names.length),
            ...names.flatMap((key) => {
                return [..._serialize(key), ..._serialize(closedVal[key], new Set(pool).add(val))];
            })
        ];
    }
    throw new Error("wrong xj format: wrong type");
}
export function parse(data, maxCount = Infinity) {
    if (typeof data === "string")
        data = encoder.encode(data);
    const result = [];
    const reader = new SyncBufferReader(data);
    while (maxCount-- > 0 && reader.hasBytes())
        result.push(_parse(reader));
    return result;
}
function _parse(data) {
    const type = data.getNextUint8();
    if (type === 0x00)
        return null;
    if (type === 0x01)
        return false;
    if (type === 0x02)
        return true;
    if (type === 0x03)
        return data.getNextFloat64();
    if (type === 0x04 || type === 0x17) {
        const size = _parse(data);
        const array = data.getNextUint8Array(size);
        const positiveResult = uint8ArrayToPositiveBigInt(array);
        return type === 0x04 ? positiveResult : -positiveResult;
    }
    if (type === 0x05) {
        const len = _parse(data);
        return decoder.decode(data.getNextUint8Array(len));
    }
    if (type === 0x06)
        return data.getArrayBuffer(_parse(data));
    if (type === 0x07 /*Int8Array*/)
        return new Int8Array(data.getArrayBuffer(_parse(data)));
    if (type === 0x08 /*Int16Array*/)
        return new Int16Array(data.getArrayBuffer(_parse(data) * 2));
    if (type === 0x09 /*Int32Array*/)
        return new Int32Array(data.getArrayBuffer(_parse(data) * 4));
    if (type === 0x0a /*Uint8Array*/)
        return new Uint8Array(data.getArrayBuffer(_parse(data)));
    if (type === 0x0b /*Uint16Array*/)
        return new Uint16Array(data.getArrayBuffer(_parse(data) * 2));
    if (type === 0x0c /*Uint32Array*/)
        return new Uint32Array(data.getArrayBuffer(_parse(data) * 4));
    if (type === 0x0d /*Uint8ClampedArray*/)
        return new Uint8ClampedArray(data.getArrayBuffer(_parse(data)));
    if (type === 0x0e /*Float32Array*/)
        return new Float32Array(data.getArrayBuffer(_parse(data) * 4));
    if (type === 0x0f /*Float64Array*/)
        return new Float64Array(data.getArrayBuffer(_parse(data) * 8));
    if (type === 0x10 /*BigInt64Array*/)
        return new BigInt64Array(data.getArrayBuffer(_parse(data) * 8));
    if (type === 0x11 /*BigUint64Array*/)
        return new BigUint64Array(data.getArrayBuffer(_parse(data) * 8));
    if (type === 0x12 /*Array*/)
        return Array.from({ length: _parse(data) }).map(() => _parse(data));
    if (type === 0x13 /*Object*/) {
        const result = Object.create(null);
        let size = _parse(data);
        while (size-- > 0)
            Object.defineProperty(result, _parse(data), {
                value: _parse(data),
                enumerable: true,
                writable: true,
            });
        return result;
    }
    if (type === 0x14 /*Error*/) {
        const name = _parse(data);
        const message = _parse(data);
        const stack = _parse(data);
        const hasCause = data.getNextUint8();
        let result;
        if (!hasCause) {
            result = new Error(message);
        }
        else {
            const cause = _parse(data);
            result = new Error(message, { cause });
        }
        result.name = name;
        result.stack = stack;
        return result;
    }
    if (type === 0x15)
        return undefined;
    if (type === 0x16)
        return data.getNextUint8();
    // 0x17 reserved for bigint
    if (type === 0x18)
        return -data.getNextUint8();
    if (type === 0x19)
        return data.getNextUint16();
    if (type === 0x1A)
        return -data.getNextUint16();
    if (type === 0x1B)
        return data.getNextUint32();
    if (type === 0x1C)
        return -data.getNextUint32();
    if (type >= 0xe0 && type <= 0xef)
        return decoder.decode(data.getNextUint8Array(type & 0x0f)); // small strings
    if (type >= 0xf0 && type <= 0xff)
        return type - 0xf0; // small integers
    throw new Error("wrong binary state-data format");
}
function positiveBigIntToUint8Array(bn) {
    if (bn === 0n)
        return new Uint8Array(0);
    let hex = BigInt(bn).toString(16);
    if (hex.length % 2) {
        hex = '0' + hex;
    }
    const len = hex.length / 2;
    const result = new Uint8Array(len);
    let i = 0, j = 0;
    while (i < len) {
        result[i] = parseInt(hex.slice(j, j + 2), 16);
        i += 1;
        j += 2;
    }
    return result;
}
function uint8ArrayToPositiveBigInt(buf) {
    if (buf.length === 0)
        return 0n;
    const hex = [];
    const u8 = Uint8Array.from(buf);
    u8.forEach(function (i) {
        var h = i.toString(16);
        if (h.length % 2) {
            h = '0' + h;
        }
        hex.push(h);
    });
    return BigInt('0x' + hex.join(''));
}
function isIntegerPositive(v) {
    return (Infinity / v) > 0;
}
//# sourceMappingURL=index.js.map