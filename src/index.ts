import { SyncBufferReader } from "./SyncBufferReader.js";

// maximum string length is 2^31-1

export type TypedArray =
	| Int8Array /*07*/ | Int16Array /*08*/ | Int32Array /*09*/
	| Uint8Array  /*0a*/ | Uint16Array  /*0b*/ | Uint32Array  /*0c*/ | Uint8ClampedArray  /*0d*/
	| Float32Array  /*0e*/ | Float64Array  /*0f*/ | BigInt64Array  /*10*/ | BigUint64Array  /*11*/
;
export type XJPrimitive =
	/**
	 * 0x15
	 */
	| undefined
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
	| TypedArray
;
export type XJArray = readonly XJData[]  /* 0x12 [size:number] ...[members] */
export type XJRecord = { readonly [key: string]: XJData }  /* 0x13 [size:number] ...[string, member] */

export type XJData = Error /*14*/ | XJPrimitive | XJArray | XJRecord;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function serialize(...val: XJData[]): Uint8Array {
	const dataList = val.flatMap(data => _serialize(data));
	const totalSize = dataList.reduce((acc: number, e) => acc + (typeof e === "number" ? 1 : e.byteLength), 0);
	const merged = new Uint8Array(totalSize);
	let offset = 0;
	for (let data of dataList) {
		if (typeof data === "number") {
			merged[offset++] = data;
		} else {
			const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
			merged.set(view, offset);
			offset += data.byteLength;
		}
	}
	return merged;
}

function _serialize(val: XJData, pool?: Set<any>): (number|TypedArray)[] {
	if (pool?.has(val)) throw new Error("wrong xj format: recursive");
	
	if (val === null) return [0x00];
	if (val === undefined) return [0x15];
	if (typeof val === "boolean") return [val ? 0x02 : 0x01];
	if (typeof val === "number") {
		if (Number.isInteger(val) && isIntegerPositive(val) && val <= 0x0f) return [0xf0 | val]; // small integers
		if (Number.isSafeInteger(val)) {
			const abs = val > 0 ? val : -val;
			if (abs <= 0xff) return [isIntegerPositive(val) ? 0x16 : 0x18, abs];
			if (abs <= 0xffff) return [isIntegerPositive(val) ? 0x19 : 0x1A, Uint16Array.of(abs)];
			if (abs <= 0xffffffff) return [isIntegerPositive(val) ? 0x1B : 0x1C, Uint32Array.of(abs)];
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
		encoder.encode(val)
		const stringBuffer = encoder.encode(val);
		if (stringBuffer.length <= 0x0f) return [
			stringBuffer.length | 0xe0,
			stringBuffer
		]
		return [
			0x05,
			...serialize(stringBuffer.length),
			stringBuffer
		];
	}
	if (val instanceof ArrayBuffer) return [0x06, ..._serialize(val.byteLength), new Uint8Array(val)];
	if (val instanceof Int8Array) return [0x07, ..._serialize(val.length), val];
	if (val instanceof Int16Array) return [0x08, ..._serialize(val.length), val];
	if (val instanceof Int32Array) return [0x09, ..._serialize(val.length), val];
	if (val instanceof Uint8Array) return [0x0a, ..._serialize(val.length), val];
	if (val instanceof Uint16Array) return [0x0b, ..._serialize(val.length), val];
	if (val instanceof Uint32Array) return [0x0c, ..._serialize(val.length), val];
	if (val instanceof Uint8ClampedArray) return [0x0d, ..._serialize(val.length), val];
	if (val instanceof Float32Array) return [0x0e, ..._serialize(val.length), val];
	if (val instanceof Float64Array) return [0x0f, ..._serialize(val.length), val];
	if (val instanceof BigInt64Array) return [0x10, ..._serialize(val.length), val];
	if (val instanceof BigUint64Array) return [0x11, ..._serialize(val.length), val];
	if (Array.isArray(val)) return [
		0x12,
		..._serialize(val.length),
		...val.flatMap(item => _serialize(item, new Set(pool).add(val)))
	];
	if (val instanceof Error) {
		let causeData: ReturnType<typeof _serialize> = [0x00];
		if (val.cause !== undefined) try {
			const causeSerialized = _serialize(val.cause as any);
			causeData = [0x01, ...causeSerialized];
		} catch {}
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
		const closedVal = val as XJRecord;
		return [
			0x13,
			..._serialize(names.length),
			...names.flatMap((key) => {
				return [..._serialize(key), ..._serialize(closedVal[key], new Set(pool).add(val))]
			})
		];
	}
	throw new Error("wrong xj format: wrong type");
}

export function parse(data: ArrayBuffer | TypedArray | DataView | string, maxCount = Infinity): XJData[] {
	if (typeof data === "string") data = encoder.encode(data);
	const result: XJData[] = []
	const reader = new SyncBufferReader(data);
	while (maxCount --> 0 && reader.hasBytes()) result.push(_parse(reader));
	return result;
}

function _parse(data: SyncBufferReader): XJData {
	const type = data.getNextUint8();
	if (type === 0x00) return null;
	if (type === 0x01) return false;
	if (type === 0x02) return true;
	if (type === 0x03) return data.getNextFloat64();
	if (type === 0x04 || type === 0x17) {
		const size = _parse(data) as number;
		const array = data.getNextUint8Array(size);
		const positiveResult = uint8ArrayToPositiveBigInt(array);
		return type === 0x04 ? positiveResult : -positiveResult;
	}
	if (type === 0x05) {
		const len = _parse(data) as number
		return decoder.decode(data.getNextUint8Array(len));
	}
	if (type === 0x06) return data.getArrayBuffer(_parse(data) as number);
	if (type === 0x07 /*Int8Array*/ ) return new Int8Array(data.getArrayBuffer(_parse(data) as number));
	if (type === 0x08 /*Int16Array*/ ) return new Int16Array(data.getArrayBuffer(_parse(data) as number * 2));
	if (type === 0x09 /*Int32Array*/ ) return new Int32Array(data.getArrayBuffer(_parse(data) as number * 4));
	if (type === 0x0a /*Uint8Array*/ ) return new Uint8Array(data.getArrayBuffer(_parse(data) as number));
	if (type === 0x0b /*Uint16Array*/ ) return new Uint16Array(data.getArrayBuffer(_parse(data) as number * 2));
	if (type === 0x0c /*Uint32Array*/ ) return new Uint32Array(data.getArrayBuffer(_parse(data) as number * 4));
	if (type === 0x0d /*Uint8ClampedArray*/ ) return new Uint8ClampedArray(data.getArrayBuffer(_parse(data) as number));
	if (type === 0x0e /*Float32Array*/ ) return new Float32Array(data.getArrayBuffer(_parse(data) as number * 4));
	if (type === 0x0f /*Float64Array*/ ) return new Float64Array(data.getArrayBuffer(_parse(data) as number * 8));
	if (type === 0x10 /*BigInt64Array*/ ) return new BigInt64Array(data.getArrayBuffer(_parse(data) as number * 8));
	if (type === 0x11 /*BigUint64Array*/ ) return new BigUint64Array(data.getArrayBuffer(_parse(data) as number * 8));
	if (type === 0x12 /*Array*/ ) return Array.from({length: _parse(data) as number}).map(() => _parse(data));
	if (type === 0x13 /*Object*/ ) {
		const result = Object.create(null);
		let size = _parse(data) as number;
		while (size --> 0) Object.defineProperty(result, _parse(data) as string, {
			value: _parse(data),
			enumerable: true,
			writable: true,
		})
		return result;
	}
	if (type === 0x14 /*Error*/ ) {
		const name = _parse(data) as string;
		const message = _parse(data) as string;
		const stack = _parse(data) as string;
		
		const hasCause = data.getNextUint8();
		let result: Error;
		if (!hasCause) {
			result = new Error(message);
		} else {
			const cause = _parse(data);
			result = new Error(message, {cause});
		}
		result.name = name;
		result.stack = stack;
		return result;
	}
	if (type === 0x15) return undefined;
	if (type === 0x16) return data.getNextUint8();
	// 0x17 reserved for bigint
	if (type === 0x18) return -data.getNextUint8();
	if (type === 0x19) return data.getNextUint16();
	if (type === 0x1A) return -data.getNextUint16();
	if (type === 0x1B) return data.getNextUint32();
	if (type === 0x1C) return -data.getNextUint32();
	if (type >= 0xe0 && type <= 0xef) return decoder.decode(data.getNextUint8Array(type & 0x0f)); // small strings
	if (type >= 0xf0 && type <= 0xff) return type - 0xf0; // small integers
	throw new Error("wrong binary state-data format");
}

function positiveBigIntToUint8Array(bn: bigint) {
	if (bn === 0n) return new Uint8Array(0);
	let hex = BigInt(bn).toString(16);
	if (hex.length % 2) { hex = '0' + hex; }
	const len = hex.length / 2;
	const result = new Uint8Array(len);
	let i = 0, j = 0;
	while (i < len) {
		result[i] = parseInt(hex.slice(j, j+2), 16);
		i += 1;
		j += 2;
	}
	
	return result;
}

function uint8ArrayToPositiveBigInt(buf: Uint8Array) {
	if (buf.length === 0) return 0n;
	const hex: string[] = [];
	const u8 = Uint8Array.from(buf);
	
	u8.forEach(function (i) {
		var h = i.toString(16);
		if (h.length % 2) { h = '0' + h; }
		hex.push(h);
	});
	
	return BigInt('0x' + hex.join(''));
}

function isIntegerPositive(v: number){
	return (Infinity / v) > 0
}
