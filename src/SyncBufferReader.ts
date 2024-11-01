import type { TypedArray } from "./index";

export class SyncBufferReader {
	private index = 0;
	private dataView: DataView;
	constructor(data: TypedArray | ArrayBuffer | DataView) {
		this.dataView =
			data instanceof DataView ? data :
			data instanceof ArrayBuffer ? new DataView(data) :
			new DataView(data.buffer, data.byteOffset, data.byteLength)
		;
	}
	
	private assertSize(bytesSize: number): void {
		if (this.dataView.byteLength < this.index + bytesSize) {
			throw new Error("wrong binary state-data format");
		}
	}
	
	getNextUint8(): number {
		return this.dataView.getUint8(this.index++);
	}
	
	getNextUint16(): number {
		const result = this.dataView.getUint16(this.index, true);
		this.index += 2;
		return result;
	}
	
	getNextUint32(): number {
		const result = this.dataView.getUint32(this.index, true);
		this.index += 4;
		return result;
	}
	
	getNextFloat64(): number{
		const result = this.dataView.getFloat64(this.index, true);
		this.index += 8;
		return result;
	}
	
	skipBytes(count: number): void{
		this.assertSize(count);
		this.index += count;
	}
	
	getNextUint8Array(size: number): Uint8Array {
		return new Uint8Array(this.getArrayBuffer(size));
	}
	
	getArrayBuffer(size: number): ArrayBuffer {
		this.assertSize(size);
		const buffer = this.dataView.buffer.slice(
			this.dataView.byteOffset + this.index,
			this.dataView.byteOffset + this.index + size
		);
		this.index += size;
		return buffer;
	}
	
	hasBytes(): boolean {
		return this.index < this.dataView.byteLength;
	}
	
}
