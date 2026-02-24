/** Binary read/write helpers (big-endian by default, like MTProto) */

export class BinaryReader {
  private view: DataView;
  public offset = 0;

  constructor(private data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  readUint8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  readUint16BE(): number {
    const v = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return v;
  }

  readInt16BE(): number {
    const v = this.view.getInt16(this.offset, false);
    this.offset += 2;
    return v;
  }

  readUint32BE(): number {
    const v = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return v;
  }

  readInt32LE(): number {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  readBigUint64BE(): bigint {
    const v = this.view.getBigUint64(this.offset, false);
    this.offset += 8;
    return v;
  }

  readBytes(n: number): Uint8Array {
    const slice = this.data.slice(this.offset, this.offset + n);
    this.offset += n;
    return slice;
  }

  readRest(): Uint8Array {
    return this.data.slice(this.offset);
  }

  get remaining(): number {
    return this.data.length - this.offset;
  }
}

export class BinaryWriter {
  private parts: Uint8Array[] = [];

  writeUint8(v: number): this {
    const buf = new Uint8Array(1);
    new DataView(buf.buffer).setUint8(0, v);
    this.parts.push(buf);
    return this;
  }

  writeUint16BE(v: number): this {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setUint16(0, v, false);
    this.parts.push(buf);
    return this;
  }

  writeInt16BE(v: number): this {
    const buf = new Uint8Array(2);
    new DataView(buf.buffer).setInt16(0, v, false);
    this.parts.push(buf);
    return this;
  }

  writeUint32BE(v: number): this {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, v, false);
    this.parts.push(buf);
    return this;
  }

  writeInt32LE(v: number): this {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, v, true);
    this.parts.push(buf);
    return this;
  }

  writeBigUint64BE(v: bigint): this {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigUint64(0, v, false);
    this.parts.push(buf);
    return this;
  }

  writeBytes(data: Uint8Array): this {
    this.parts.push(data);
    return this;
  }

  build(): Uint8Array {
    const total = this.parts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const part of this.parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }
}

/** Convert IPv4 string to 4-byte packed representation */
export function packIPv4(ip: string): Uint8Array {
  const parts = ip.split('.').map(Number);
  return new Uint8Array(parts);
}

/** Convert 4-byte packed IPv4 to string */
export function unpackIPv4(data: Uint8Array): string {
  return Array.from(data).join('.');
}

/** Convert IPv6 string to 16-byte packed representation */
export function packIPv6(ip: string): Uint8Array {
  // Expand :: shorthand
  const parts = ip.split(':');
  const expanded: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') {
      const missing = 8 - parts.filter((p) => p !== '').length;
      for (let j = 0; j < missing; j++) expanded.push('0000');
      if (i === 0 || i === parts.length - 1) continue;
    } else {
      expanded.push(parts[i].padStart(4, '0'));
    }
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const val = parseInt(expanded[i] || '0', 16);
    bytes[i * 2] = (val >> 8) & 0xff;
    bytes[i * 2 + 1] = val & 0xff;
  }
  return bytes;
}

/** Convert 16-byte packed IPv6 to string */
export function unpackIPv6(data: Uint8Array): string {
  const groups: string[] = [];
  for (let i = 0; i < 16; i += 2) {
    groups.push(((data[i] << 8) | data[i + 1]).toString(16));
  }
  return groups.join(':');
}

/** Check if an IP address is IPv6 */
export function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/** Convert hex string to Uint8Array */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert Uint8Array to hex string */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
