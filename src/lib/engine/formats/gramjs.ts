import { BinaryReader, BinaryWriter, isIPv6 } from '../binary';
import { b64Encode, b64Decode } from '../base64';
import type { SessionData } from '../types';
import { DC_PROD } from '../types';

const VERSION = '1';

export function decode(session: string): SessionData {
  if (!session.startsWith(VERSION)) {
    throw new Error('Invalid GramJS session: missing version prefix "1"');
  }

  const raw = session.slice(1);
  const data = b64Decode(raw);
  const reader = new BinaryReader(data);

  const dcId = reader.readUint8();

  // Check if this is actually a Telethon session (base64 portion = 352-1 = 351 chars)
  if (raw.length === 351) {
    // Telethon IPv4 format: next 4 bytes are raw IP
    const ipBytes = reader.readBytes(4);
    const ipAddress = Array.from(ipBytes).join('.');
    const port = reader.readUint16BE();
    const authKey = reader.readRest();
    return { dcId, authKey, ipAddress, port, ipv6: false, testMode: false };
  }

  const addrLen = reader.readInt16BE();

  let ipAddress: string;
  let ipv6 = false;

  if (addrLen > 100) {
    // IPv6: the 2 bytes we read are part of the 16-byte address
    reader.offset -= 2;
    const ipBytes = reader.readBytes(16);
    const hexGroups = [];
    for (let i = 0; i < 16; i += 2) {
      hexGroups.push(((ipBytes[i] << 8) | ipBytes[i + 1]).toString(16));
    }
    ipAddress = hexGroups
      .join(':')
      .replace(/(^|:)0(:0)*(:|$)/, '::')
      .replace(/:{3,}/, '::');
    ipv6 = true;
  } else {
    const addrBytes = reader.readBytes(addrLen);
    ipAddress = new TextDecoder().decode(addrBytes).replace(/\0/g, '');
  }

  const port = reader.readInt16BE();
  const authKey = reader.readRest();

  if (authKey.length !== 256) {
    throw new Error(`Invalid GramJS session: auth key is ${authKey.length} bytes, expected 256`);
  }

  return { dcId, authKey, ipAddress, port, ipv6, testMode: false };
}

export function encode(session: SessionData): string {
  const addrBytes = new TextEncoder().encode(session.ipAddress);

  const writer = new BinaryWriter();
  writer.writeUint8(session.dcId);
  writer.writeInt16BE(addrBytes.length);
  writer.writeBytes(addrBytes);
  writer.writeInt16BE(session.port);
  writer.writeBytes(session.authKey);

  return VERSION + b64Encode(writer.build());
}

export function fillDefaults(session: SessionData): SessionData {
  if (!session.ipAddress || session.ipAddress === '') {
    const dc = DC_PROD[session.dcId];
    if (dc) {
      return { ...session, ipAddress: dc.ip, port: dc.port };
    }
  }
  return session;
}
