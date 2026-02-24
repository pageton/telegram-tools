import { b64UrlEncodeNoPad, b64UrlDecode } from '../base64';
import { BinaryReader, BinaryWriter } from '../binary';
import type { SessionData } from '../types';
import { DC_PROD } from '../types';

const VERSION = 3;

/**
 * mtcute v3 string session format:
 * base64url_nopad( version[1] + flags[4LE] + primaryDc[TL] + [mediaDc[TL]] + [userId+isBot] + authKey[TL-bytes] )
 *
 * BasicDcOption TL serialization:
 *   [0x02, dc_id, flags_byte] + TL-string(ipAddress) + int32LE(port)
 *
 * TL-bytes: length prefix + data (TL serialization)
 */

/** Read a TL-encoded string (length-prefixed) */
function readTlString(reader: BinaryReader): string {
  let len = reader.readUint8();
  let padding: number;

  if (len === 254) {
    // Long string: next 3 bytes are length (little-endian)
    const b1 = reader.readUint8();
    const b2 = reader.readUint8();
    const b3 = reader.readUint8();
    len = b1 | (b2 << 8) | (b3 << 16);
    padding = (4 - ((len + 4) % 4)) % 4;
  } else {
    padding = (4 - ((len + 1) % 4)) % 4;
  }

  const bytes = reader.readBytes(len);
  if (padding > 0) reader.readBytes(padding);
  return new TextDecoder().decode(bytes);
}

/** Write a TL-encoded string */
function writeTlString(writer: BinaryWriter, str: string): void {
  const data = new TextEncoder().encode(str);
  const len = data.length;

  if (len < 254) {
    writer.writeUint8(len);
    writer.writeBytes(data);
    const padding = (4 - ((len + 1) % 4)) % 4;
    if (padding > 0) writer.writeBytes(new Uint8Array(padding));
  } else {
    writer.writeUint8(254);
    writer.writeUint8(len & 0xff);
    writer.writeUint8((len >> 8) & 0xff);
    writer.writeUint8((len >> 16) & 0xff);
    writer.writeBytes(data);
    const padding = (4 - ((len + 4) % 4)) % 4;
    if (padding > 0) writer.writeBytes(new Uint8Array(padding));
  }
}

/** Read TL-bytes (length-prefixed byte array) */
function readTlBytes(reader: BinaryReader): Uint8Array {
  let len = reader.readUint8();
  let padding: number;

  if (len === 254) {
    const b1 = reader.readUint8();
    const b2 = reader.readUint8();
    const b3 = reader.readUint8();
    len = b1 | (b2 << 8) | (b3 << 16);
    padding = (4 - ((len + 4) % 4)) % 4;
  } else {
    padding = (4 - ((len + 1) % 4)) % 4;
  }

  const bytes = reader.readBytes(len);
  if (padding > 0) reader.readBytes(padding);
  return bytes;
}

/** Write TL-bytes */
function writeTlBytes(writer: BinaryWriter, data: Uint8Array): void {
  const len = data.length;
  if (len < 254) {
    writer.writeUint8(len);
    writer.writeBytes(data);
    const padding = (4 - ((len + 1) % 4)) % 4;
    if (padding > 0) writer.writeBytes(new Uint8Array(padding));
  } else {
    writer.writeUint8(254);
    writer.writeUint8(len & 0xff);
    writer.writeUint8((len >> 8) & 0xff);
    writer.writeUint8((len >> 16) & 0xff);
    writer.writeBytes(data);
    const padding = (4 - ((len + 4) % 4)) % 4;
    if (padding > 0) writer.writeBytes(new Uint8Array(padding));
  }
}

interface DcOption {
  id: number;
  ipAddress: string;
  port: number;
  ipv6: boolean;
  mediaOnly: boolean;
  testMode: boolean;
}

function readDcOption(reader: BinaryReader): DcOption {
  const marker = reader.readUint8(); // should be 0x02
  const dcId = reader.readUint8();
  const flags = reader.readUint8();

  const ipv6 = (flags & 1) !== 0;
  const mediaOnly = (flags & 2) !== 0;
  const testMode = (flags & 4) !== 0;

  const ipAddress = readTlString(reader);
  const port = reader.readInt32LE();

  return { id: dcId, ipAddress, port, ipv6, mediaOnly, testMode };
}

function writeDcOption(writer: BinaryWriter, dc: DcOption): void {
  writer.writeUint8(0x02);
  writer.writeUint8(dc.id);
  let flags = 0;
  if (dc.ipv6) flags |= 1;
  if (dc.mediaOnly) flags |= 2;
  if (dc.testMode) flags |= 4;
  writer.writeUint8(flags);
  writeTlString(writer, dc.ipAddress);
  writer.writeInt32LE(dc.port);
}

/** Read int53 (48-bit LE + 1 byte) — mtcute's custom encoding */
function readInt53(reader: BinaryReader): number {
  const lo = reader.readUint8() |
    (reader.readUint8() << 8) |
    (reader.readUint8() << 16) |
    (reader.readUint8() << 24);
  const mi = reader.readUint8() | (reader.readUint8() << 8);
  // This forms a 48-bit int; the last byte is sign extension or high bits
  // mtcute stores int53 as 7 bytes little-endian
  const hi = reader.readUint8();
  return lo + (mi + hi * 65536) * 4294967296;
}

/** Write int53 as 7 bytes LE */
function writeInt53(writer: BinaryWriter, v: number): void {
  const bytes = new Uint8Array(7);
  let n = v;
  for (let i = 0; i < 7; i++) {
    bytes[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  writer.writeBytes(bytes);
}

export function decode(session: string): SessionData {
  const data = b64UrlDecode(session);
  const reader = new BinaryReader(data);

  const version = reader.readUint8();
  if (version !== 3 && version !== 2) {
    throw new Error(`Unsupported mtcute session version: ${version}`);
  }

  const flags = reader.readInt32LE();
  const hasSelf = (flags & 1) !== 0;
  const hasMediaDc = (flags & 4) !== 0;

  const primaryDc = readDcOption(reader);

  let _mediaDc: DcOption | undefined;
  if (hasMediaDc) {
    _mediaDc = readDcOption(reader);
  }

  let userId: number | undefined;
  let isBot: boolean | undefined;
  if (hasSelf) {
    userId = readInt53(reader);
    isBot = reader.readUint8() !== 0;
    // v3 has isPremium and usernames, but we skip them
    if (version >= 3) {
      reader.readUint8(); // isPremium
      // Read usernames array length (TL-style)
      const usernameCount = reader.readInt32LE();
      for (let i = 0; i < usernameCount; i++) {
        readTlString(reader); // skip each username
      }
    }
  }

  const authKey = readTlBytes(reader);

  return {
    dcId: primaryDc.id,
    authKey,
    ipAddress: primaryDc.ipAddress,
    port: primaryDc.port,
    ipv6: primaryDc.ipv6,
    testMode: primaryDc.testMode,
    userId,
    isBot,
  };
}

export function encode(session: SessionData): string {
  const writer = new BinaryWriter();

  writer.writeUint8(VERSION);

  let flags = 0;
  if (session.userId !== undefined && session.userId !== 0) flags |= 1;
  // We don't set media DC flag (bit 2) — keep it simple
  writer.writeInt32LE(flags);

  // Primary DC
  const ip = session.ipAddress || DC_PROD[session.dcId]?.ip || '149.154.167.51';
  const port = session.port || DC_PROD[session.dcId]?.port || 443;

  writeDcOption(writer, {
    id: session.dcId,
    ipAddress: ip,
    port,
    ipv6: session.ipv6 ?? false,
    mediaOnly: false,
    testMode: session.testMode ?? false,
  });

  // Self info
  if (flags & 1) {
    writeInt53(writer, session.userId!);
    writer.writeUint8(session.isBot ? 1 : 0);
    writer.writeUint8(0); // isPremium = false
    writer.writeInt32LE(0); // 0 usernames
  }

  // Auth key
  writeTlBytes(writer, session.authKey);

  return b64UrlEncodeNoPad(writer.build());
}
