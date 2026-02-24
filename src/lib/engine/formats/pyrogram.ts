import { BinaryReader, BinaryWriter } from '../binary';
import { b64UrlEncodeNoPad, b64UrlDecode } from '../base64';
import type { SessionData } from '../types';
import { DC_PROD, DC_TEST } from '../types';

/** Current Pyrogram format: >BI?256sQ? */
export function decode(session: string): SessionData {
  const data = b64UrlDecode(session);

  if (data.length !== 271 && data.length !== 263 && data.length !== 267) {
    throw new Error(
      `Invalid Pyrogram session: unexpected decoded length ${data.length} (expected 271, 263, or 267)`
    );
  }

  const reader = new BinaryReader(data);
  const dcId = reader.readUint8();

  let apiId: number | undefined;
  let testMode: boolean;
  let authKey: Uint8Array;
  let userId: number;
  let isBot: boolean;

  if (data.length === 271) {
    // New format: >BI?256sQ?
    apiId = reader.readUint32BE();
    testMode = reader.readUint8() === 1;
    authKey = reader.readBytes(256);
    userId = Number(reader.readBigUint64BE());
    isBot = reader.readUint8() === 1;
  } else if (data.length === 267) {
    // Old format 64-bit: >B?256sQ?
    testMode = reader.readUint8() === 1;
    authKey = reader.readBytes(256);
    userId = Number(reader.readBigUint64BE());
    isBot = reader.readUint8() === 1;
  } else {
    // Old format 32-bit: >B?256sI?
    testMode = reader.readUint8() === 1;
    authKey = reader.readBytes(256);
    userId = reader.readUint32BE();
    isBot = reader.readUint8() === 1;
  }

  // Derive IP from DC
  const dcTable = testMode ? DC_TEST : DC_PROD;
  const dc = dcTable[dcId] ?? DC_PROD[dcId];
  const ipAddress = dc?.ip ?? '';
  const port = dc?.port ?? 443;

  return {
    dcId,
    authKey,
    ipAddress,
    port,
    ipv6: false,
    testMode,
    userId,
    isBot,
    apiId,
  };
}

export function encode(session: SessionData, apiId?: number): string {
  const writer = new BinaryWriter();

  const effectiveApiId = apiId ?? session.apiId ?? 0;

  writer.writeUint8(session.dcId);
  writer.writeUint32BE(effectiveApiId);
  writer.writeUint8(session.testMode ? 1 : 0);
  writer.writeBytes(session.authKey);
  writer.writeBigUint64BE(BigInt(session.userId ?? 0));
  writer.writeUint8(session.isBot ? 1 : 0);

  return b64UrlEncodeNoPad(writer.build());
}
