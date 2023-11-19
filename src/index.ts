import { SyncBufferReader } from "./SyncBufferReader.js";

type TypedArray =
	| Int8Array /*07*/ | Int16Array /*08*/ | Int32Array /*09*/
	| Uint8Array  /*0a*/ | Uint16Array  /*0b*/ | Uint32Array  /*0c*/ | Uint8ClampedArray  /*0d*/
	| Float32Array  /*0e*/ | Float64Array  /*0f*/ | BigInt64Array  /*10*/ | BigUint64Array  /*11*/
;
export type XJPrimitive =
	| undefined /*15*/  | null /*00*/ | boolean /*01,02*/ | number /*03 or 0xf_*/ | bigint /*04*/ | string /*05*/
	| ArrayBuffer /*06*/
	| TypedArray /*07-11*/
export type XJArray = readonly XJData[]  /*12*/
export type XJRecord = { readonly [key: string]: XJData }  /*13*/

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
		if (Number.isInteger(val) && val >= 0 && val <= 0x0f) return [0xf0 + val]; // small integers
		return [0x03, Float64Array.of(val)];
	}
	if (typeof val === "bigint") {
		const [ignored_type, ...dataBin] = _serialize(val.toString(10));
		return [0x04, ...dataBin];
	}
	if (typeof val === "string") {
		encoder.encode(val)
		const stringBuffer = encoder.encode(val);
		return [
			0x05,
			Uint32Array.of(stringBuffer.byteLength),
			stringBuffer
		];
	}
	if (val instanceof ArrayBuffer) return [0x06, Uint32Array.of(val.byteLength), new Uint8Array(val)];
	if (val instanceof Int8Array) return [0x07, Uint32Array.of(val.length), val];
	if (val instanceof Int16Array) return [0x08, Uint32Array.of(val.length), val];
	if (val instanceof Int32Array) return [0x09, Uint32Array.of(val.length), val];
	if (val instanceof Uint8Array) return [0x0a, Uint32Array.of(val.length), val];
	if (val instanceof Uint16Array) return [0x0b, Uint32Array.of(val.length), val];
	if (val instanceof Uint32Array) return [0x0c, Uint32Array.of(val.length), val];
	if (val instanceof Uint8ClampedArray) return [0x0d, Uint32Array.of(val.length), val];
	if (val instanceof Float32Array) return [0x0e, Uint32Array.of(val.length), val];
	if (val instanceof Float64Array) return [0x0f, Uint32Array.of(val.length), val];
	if (val instanceof BigInt64Array) return [0x10, Uint32Array.of(val.length), val];
	if (val instanceof BigUint64Array) return [0x11, Uint32Array.of(val.length), val];
	if (Array.isArray(val)) return [
		0x12,
		Uint32Array.of(val.length),
		...val.flatMap(item => _serialize(item, new Set(pool).add(val)))
	];
	if (val instanceof Error) {
		const [/*ignored_type*/, ...dataName] = _serialize(String(val.name));
		const [/*ignored_type*/, ...dataMessage] = _serialize(String(val.message));
		const [/*ignored_type*/, ...dataStack] = _serialize(String(val.stack));
		let causeData: ReturnType<typeof _serialize> = [0x00];
		if (val.cause !== undefined) try {
			const causeSerialized = _serialize(val.cause as any);
			causeData = [0x01, ...causeSerialized];
		} catch {}
		return [
			0x14,
			...dataName,
			...dataMessage,
			...dataStack,
			...causeData
		];
	}
	if (typeof val === "object") {
		const names = Object.getOwnPropertyNames(val).sort();
		const closedVal = val as XJRecord;
		return [
			0x13,
			Uint32Array.of(names.length),
			...names.flatMap((key) => {
				const [ignored_type, ...dataBin] = _serialize(key);
				return [...dataBin, ..._serialize(closedVal[key], new Set(pool).add(val))]
			})
		];
	}
	throw new Error("wrong xj format: wrong type");
}

export function parse(data: Uint8Array, maxCount = Infinity): readonly XJData[] {
	const result: XJData[] = []
	const reader = new SyncBufferReader(data);
	while (maxCount --> 0 && reader.hasBytes()) result.push(_parse(reader));
	return result;
}

function _parse(data: SyncBufferReader, type?: number|null): XJData {
	if (type == null) type = data.getNextUint8();
	if (type === 0x00) return null;
	if (type === 0x01) return false;
	if (type === 0x02) return true;
	if (type === 0x03) return data.getNextFloat64();
	if (type === 0x04) return BigInt(_parse(data, 0x05) as string);
	if (type === 0x05) return decoder.decode(data.getNextUintSizeAndUint8Array());
	if (type === 0x06) return data.readUintSizeAndArrayBuf()
	if (type === 0x07 /*Int8Array*/ ) return new Int8Array(data.readUintSizeAndArrayBuf());
	if (type === 0x08 /*Int16Array*/ ) return new Int16Array(data.readUintSizeAndArrayBuf(2));
	if (type === 0x09 /*Int32Array*/ ) return new Int32Array(data.readUintSizeAndArrayBuf(4));
	if (type === 0x0a /*Uint8Array*/ ) return new Uint8Array(data.readUintSizeAndArrayBuf());
	if (type === 0x0b /*Uint16Array*/ ) return new Uint16Array(data.readUintSizeAndArrayBuf(2));
	if (type === 0x0c /*Uint32Array*/ ) return new Uint32Array(data.readUintSizeAndArrayBuf(4));
	if (type === 0x0d /*Uint8ClampedArray*/ ) return new Uint8ClampedArray(data.readUintSizeAndArrayBuf());
	if (type === 0x0e /*Float32Array*/ ) return new Float32Array(data.readUintSizeAndArrayBuf(4));
	if (type === 0x0f /*Float64Array*/ ) return new Float64Array(data.readUintSizeAndArrayBuf(8));
	if (type === 0x10 /*BigInt64Array*/ ) return new BigInt64Array(data.readUintSizeAndArrayBuf(8));
	if (type === 0x11 /*BigUint64Array*/ ) return new BigUint64Array(data.readUintSizeAndArrayBuf(8));
	if (type === 0x12 /*Array*/ ) return Array.from({length: data.getNextInt32()}).map(() => _parse(data));
	if (type === 0x13 /*Object*/ ) {
		const result = Object.create(null);
		let size = data.getNextInt32();
		while (size --> 0) Object.defineProperty(result, _parse(data, 0x05) as string, {
			value: _parse(data),
			enumerable: true,
			writable: true,
		})
		return result;
	}
	if (type === 0x14 /*Error*/ ) {
		const name = decoder.decode(data.getNextUintSizeAndUint8Array());
		const message = decoder.decode(data.getNextUintSizeAndUint8Array());
		const stack = decoder.decode(data.getNextUintSizeAndUint8Array());
		
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
	if (type >= 0xf0 && type <= 0xff) return type - 0xf0; // small integers
	throw new Error("wrong binary state-data format");
}

