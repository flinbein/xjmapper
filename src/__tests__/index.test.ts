import {parse, serialize, XJData} from "../index"

test("parse-serialize null", () => {
	expect(parse(serialize(null))[0]).toBeNull();
});

test("parse-serialize undefined", () => {
	expect(parse(serialize(undefined))[0]).toBeUndefined();
});

describe('parse-serialize boolean', function () {
	test("false", () => expect(parse(serialize(false))[0]).toBe(false));
	test("true", () => expect(parse(serialize(true))[0]).toBe(true));
});

describe('parse-serialize number', function () {
	
	test("0", () => expect(parse(serialize(0))[0]).toBe(0));
	test("-0", () => expect(parse(serialize(0))[0]).toBe(0));
	test("0 is positive", () => {
		const result = parse(serialize(0))[0] as number;
		expect(1 / result > 0).toBeTruthy()
	});
	test("-0 is negative", () => {
		const result = parse(serialize(-0))[0] as number;
		expect(1 / result < 0).toBeTruthy()
	});
	test("0x01", () => expect(parse(serialize(0x01))[0]).toBe(0x01));
	test("-0x01", () => expect(parse(serialize(-0x01))[0]).toBe(-0x01));
	test("0x0f", () => expect(parse(serialize(0x0f))[0]).toBe(0x0f));
	test("-0x0f", () => expect(parse(serialize(-0x0f))[0]).toBe(-0x0f));
	test("0x10", () => expect(parse(serialize(0x10))[0]).toBe(0x10));
	test("-0x10", () => expect(parse(serialize(-0x10))[0]).toBe(-0x10));
	test("0xff20", () => expect(parse(serialize(0xff20))[0]).toBe(0xff20));
	test("-0xff20", () => expect(parse(serialize(-0xff20))[0]).toBe(-0xff20));
	test("999999999999", () => expect(parse(serialize(999999999999))[0]).toBe(999999999999));
	test("-999999999999", () => expect(parse(serialize(-999999999999))[0]).toBe(-999999999999));
	test("Pi", () => expect(parse(serialize(Math.PI))[0]).toBe(Math.PI));
	test("-Pi", () => expect(parse(serialize(-Math.PI))[0]).toBe(-Math.PI));
	test("max", () => expect(parse(serialize(Number.MAX_VALUE))[0]).toBe(Number.MAX_VALUE));
	test("min", () => expect(parse(serialize(Number.MIN_VALUE))[0]).toBe(Number.MIN_VALUE));
	test("max safe", () => expect(parse(serialize(Number.MAX_SAFE_INTEGER))[0]).toBe(Number.MAX_SAFE_INTEGER));
	test("min safe", () => expect(parse(serialize(Number.MIN_SAFE_INTEGER))[0]).toBe(Number.MIN_SAFE_INTEGER));
	test("eps", () => expect(parse(serialize(Number.EPSILON))[0]).toBe(Number.EPSILON));
	test("inf", () => expect(parse(serialize(Number.POSITIVE_INFINITY))[0]).toBe(Number.POSITIVE_INFINITY));
	test("neg inf", () => expect(parse(serialize(Number.NEGATIVE_INFINITY))[0]).toBe(Number.NEGATIVE_INFINITY));
	test("nan", () => expect(parse(serialize(Number.NaN))[0]).toBeNaN());
});

describe('parse-serialize bigint', function () {
	test("0n", () => expect(parse(serialize(0n))[0]).toBe(0n));
	test("1n", () => expect(parse(serialize(1n))[0]).toBe(1n));
	test("-1n", () => expect(parse(serialize(-1n))[0]).toBe(-1n));
	test("255n", () => expect(parse(serialize(255n))[0]).toBe(255n));
	test("-255n", () => expect(parse(serialize(-255n))[0]).toBe(-255n));
	test("256n", () => expect(parse(serialize(256n))[0]).toBe(256n));
	test("-256n", () => expect(parse(serialize(-256n))[0]).toBe(-256n));
	test("medium", () => expect(parse(serialize(1234567890n))[0]).toBe(1234567890n));
	test("negative", () => expect(parse(serialize(-1234567890n))[0]).toBe(-1234567890n));
	test("rly big", () => {
		const value = 1234567890123456723453245233245890123456789012345678901234567890123456789012345678901234567890n;
		expect(parse(serialize(value))[0]).toBe(value);
	});
	test("rly big neg", () => {
		const value = 1234567890123456723453245233245890123456789012345678901234567890123456789012345678901234567890n;
		expect(parse(serialize(-value))[0]).toBe(-value);
	});
});


describe('parse-serialize string', function () {
	test("empty", () => {
		expect(parse(serialize(""))[0]).toBe("");
	});
	
	test("string 'x'", () => {
		const value = "x";
		expect(parse(serialize(value))[0]).toBe(value);
	});
	
	test("long", () => {
		const value = "Широкая электрификация южных губерний даст мощный толчок подъёму сельского хозяйства!"
		expect(parse(serialize(value))[0]).toBe(value);
	});
	
	test("rly long (80mb string)", () => {
		const value = "Широкая электрификация южных губерний даст мощный толчок подъёму сельского хозяйства!".repeat(500000)
		expect(parse(serialize(value))[0]).toBe(value);
	});
	
	test("unicode", () => {
		const value = "🐲🐲🐲"
		expect(parse(serialize(value))[0]).toBe(value);
	});
});

describe('array-buffer', function () {
	test("empty", () => {
		const data = serialize(new ArrayBuffer(0));
		const buf = parse(data)[0] as ArrayBuffer;
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBe(0);
	});
	
	test("equals", () => {
		const binArray = Uint8Array.of(0, 1, 2, 3, 253, 254, 255);
		const source = binArray.buffer.slice(binArray.byteOffset, binArray.byteLength);
		const buf = parse(serialize(source))[0] as ArrayBuffer;
		expect(buf).toBeInstanceOf(ArrayBuffer);
		expect(buf.byteLength).toBe(source.byteLength);
		const sourceView = new Uint8Array(source);
		const bufView = new Uint8Array(buf);
		for(let i=0; i<sourceView.byteLength; i++){
			expect(sourceView[i]).toBe(bufView[i]);
		}
	});
});

describe('typed arrays', function () {
	
	function testTypedArray(source: Extract<XJData, { subarray: any }>) {
		expect(parse(serialize(source))[0]).toBeInstanceOf(source.constructor);
		expect(parse(serialize(source))[0]).toEqual(source);
		const subSource = source.subarray(0,0);
		expect(parse(serialize(subSource))[0]).toBeInstanceOf(subSource.constructor);
		expect((parse(serialize(subSource))[0] as typeof subSource).length).toBe(0);
	}
	
	test("Int8Array", () => testTypedArray(Int8Array.of(0, 1, 2, 3, 254, 255)));
	test("Int16Array", () => testTypedArray(Int16Array.of(0, 1, 2, 3, 254, 255)));
	test("Int32Array", () => testTypedArray(Int32Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint8Array", () => testTypedArray(Uint8Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint16Array", () => testTypedArray(Uint16Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint32Array", () => testTypedArray(Uint32Array.of(0, 1, 2, 3, 254, 255)));
	test("Uint8ClampedArray", () => testTypedArray(Uint8ClampedArray.of(0, 1, 2, 3, 254, 255)));
	test("Float32Array", () => testTypedArray(Float32Array.of(0, 1, 2, 3, 254, 255)));
	test("Float64Array", () => testTypedArray(Float64Array.of(0, 1, 2, 3, 254, 255)));
	test("BigInt64Array", () => testTypedArray(BigInt64Array.of(0n, 24343435234324342n)));
	test("BigUint64Array", () => testTypedArray(BigUint64Array.of(0n, 24343435234324342n)));
	
	test("synthetic buffer", () => {
		const int8Data = Uint8Array.of(0, 1, 2, 3, 254, 255, 0, 0, 0, 22);
		const buffer = int8Data.buffer;
		const int16Data = new Uint16Array(buffer, 2, 2);
		const result = parse(serialize(int16Data))[0] as typeof int16Data;
		expect(result.length).toBe(int16Data.length);
	});
});

describe('array', function () {
	test("empty", () => {
		const source = [] as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(result).toBeInstanceOf(Array);
		expect(result.length).toBe(0);
	});
	
	test("primitives", () => {
		const source = [1, "foo", 32n] as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(result).toBeInstanceOf(Array);
		expect(result).toEqual(source);
	});
	
	test("deep array", () => {
		const source = [[[[[Int32Array.of(1,2)]]]]] as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(result).toBeInstanceOf(Array);
		expect(result[0][0][0][0][0]).toBeInstanceOf(Int32Array);
		expect(result[0][0][0][0][0].length).toBe(2);
		expect(result[0][0][0][0][0][0]).toBe(1);
		expect(result[0][0][0][0][0][1]).toBe(2);
	});
})

describe('object', function () {
	test("empty", () => {
		const source = {} as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(Object.getPrototypeOf(result)).toBe(null);
		expect(Object.getOwnPropertyNames(result)).toEqual([]);
	});
	
	test("primitives", () => {
		const source = {x: null, y: -123n, z: NaN};
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(result.x).toBeNull();
		expect(result.y).toBe(-123n);
		expect(result.z).toBeNaN();
		expect(Object.getOwnPropertyNames(result).length).toBe(3);
	});
	
	test("deep", () => {
		const source = {x: null, y: -123n, z: [3, null, {m: {x:4}, s:{x:5, u: undefined}}]} as const;
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(Object.getOwnPropertyNames(result).length).toBe(3);
		expect(result.z[2].m.x).toBe(4);
		expect(result.z[2].s.x).toBe(5);
		expect(result.z[2].s.u).toBeUndefined();
	});
})

describe('error', function () {
	test("simple", () => {
		const source = new Error("msg");
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(result).toBeInstanceOf(Error);
		expect(result.name).toBe("Error");
		expect(result.message).toBe("msg");
		expect(typeof result.stack).toBe("string");
		expect(result).not.toHaveProperty("cause");
	});
	
	test("with cause", () => {
		const cause = new Error("cs");
		const source = new Error("msg", {cause: cause});
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(result).toBeInstanceOf(Error);
		expect(result.name).toBe("Error");
		expect(result.message).toBe("msg");
		expect(typeof result.stack).toBe("string");
		expect(result).toHaveProperty("cause");
		const resultCause = result?.cause as any;
		expect(typeof resultCause).toBe("object");
		expect(resultCause).toBeInstanceOf(Error);
		expect(resultCause?.name).toBe("Error");
		expect(resultCause?.message).toBe("cs");
		expect(typeof resultCause?.stack).toBe("string");
	});
	
	test("with custom cause", () => {
		const cause = [new Error("cs")];
		const source = new Error("msg", {cause: cause});
		const result = parse(serialize(source))[0] as typeof source;
		expect(typeof result).toBe("object");
		expect(result).toBeInstanceOf(Error);
		expect(result.name).toBe("Error");
		expect(result.message).toBe("msg");
		expect(typeof result.stack).toBe("string");
		expect(result).toHaveProperty("cause");
		const resultCause = result?.cause as any;
		expect(Array.isArray(resultCause)).toBeTruthy();
		expect(resultCause).toBeInstanceOf(Array);
		expect(resultCause.length).toBe(1);
		expect(resultCause[0].name).toBe("Error");
		expect(resultCause[0].message).toBe("cs");
		expect(typeof resultCause[0].stack).toBe("string");
	});
})

describe('multi-value', function () {
	test("parse values", () => {
		const a = 4 as const;
		const b = 100 as const;
		const c = ["str"] as const;
		const result = parse(serialize(a, b, c));
		expect(result.length).toBe(3);
		expect(result[0]).toBe(a);
		expect(result[1]).toBe(b);
		expect(result[2]).toEqual(c);
	});
	
	test("parse values with limit", () => {
		const a = 4 as const;
		const b = 100 as const;
		const c = ["str"] as const;
		const result = parse(serialize(a, b, c), 2);
		expect(result.length).toBe(2);
		expect(result[0]).toBe(a);
		expect(result[1]).toEqual(b);
	});
	
	test("compact", () => {
		const a = 0x0f as const;
		const b = 0x00 as const;
		const c = null;
		const d = "";
		const buf = serialize(a, b, c, d);
		expect(buf.length).toBe(4);
	});
	
	test("read subarray", () => {
		const a = 0x0f as const;
		const b = 0x00 as const;
		const c = null;
		const buf = serialize(a, b, c);
		const bigArr = new Uint8Array(10);
		bigArr.set(buf, 5); // [0×5, a, b, c, 0×3]
		const dataPart = bigArr.subarray(5); // <0×5>[a, b, c, 0×3]
		expect(dataPart.byteLength).not.toBe(dataPart.buffer.byteLength);
		expect(parse(dataPart, 3)).toEqual([a, b, c]);
	});
})

describe('test source types', function () {
	test("Uint8array", () => {
		const data = serialize("foo", "bar", "long-string-ignored-in-parse");
		expect(parse(data, 2)[1]).toBe("bar")
	});
	
	test("buffer", () => {
		const data = serialize("foo", "bar", "long-string-ignored-in-parse");
		expect(parse(data.buffer, 2)[1]).toBe("bar")
	});
	
	test("Uint32Array", () => {
		const data = serialize("foo", "bar", "long-string-ignored-in-parse");
		const array = new Uint32Array(data.buffer, 0, 3);
		expect(parse(array, 2)[1]).toBe("bar")
	});
	
	test("DataView", () => {
		const fooData = serialize("foo");
		const data = serialize("foo", "bar", "long-string-ignored-in-parse");
		const dataView = new DataView(data.buffer, data.byteOffset + fooData.byteLength /* skip foo */, 15);
		expect(parse(dataView, 1)[0]).toBe("bar")
	});
});