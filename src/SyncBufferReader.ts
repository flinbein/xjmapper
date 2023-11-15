export class SyncBufferReader {
	private index = 0;
	private dataView: DataView;
	constructor(private byteData: Uint8Array) {
		this.dataView = new DataView(byteData.buffer, byteData.byteOffset, byteData.byteLength);
	}
	
	private assertSize(bytesSize: number): void {
		if (this.byteData.length < this.index + bytesSize) {
			throw new Error("wrong binary state-data format");
		}
	}
	
	getNextUint8(): number {
		return this.dataView.getUint8(this.index++);
	}
	
	getNextInt32(): number {
		const result = this.dataView.getInt32(this.index, true);
		this.index += 4;
		return result;
	}
	
	getNextFloat64(): number{
		const result = this.dataView.getFloat64(this.index, true);
		this.index += 8;
		return result;
	}
	
	skipBytes(count = 1): void{
		this.assertSize(count);
		this.index += count;
	}
	
	getNextUint8Array(size: number): Uint8Array {
		this.assertSize(size);
		const result = this.byteData.subarray(this.index, this.index + size);
		this.index += size;
		return result;
	}
	
	getNextUintSizeAndUint8Array(multiplier = 1): Uint8Array {
		const size = this.getNextInt32();
		const byteLength = size * multiplier;
		return this.getNextUint8Array(byteLength);
	}
	
	readUintSizeAndArrayBuf(multiplier = 1): ArrayBuffer {
		const {buffer, byteLength, byteOffset} = this.getNextUintSizeAndUint8Array(multiplier);
		return buffer.slice(byteOffset, byteOffset + byteLength)
	}
	
	hasBytes(): boolean {
		return this.index < this.byteData.length;
	}
	
}
