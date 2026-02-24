import { BinaryReader, BinaryWriter, packIPv4, unpackIPv4, packIPv6, unpackIPv6, isIPv6 } from '../binary';
import { b64UrlEncode, b64UrlDecode } from '../base64';
import type { SessionData } from '../types';
import { DC_PROD } from '../types';

const VERSION = '1';

export function decode(session: string): SessionData {
  if (!session.startsWith(VERSION)) {
    throw new Error('Invalid Telethon session: missing version prefix "1"');
  }

  const data = b64UrlDecode(session.slice(1));
  const reader = new BinaryReader(data);

  const dcId = reader.readUint8();

  // Determine IPv4 vs IPv6 by total decoded length
  // IPv4: 1 + 4 + 2 + 256 = 263
  // IPv6: 1 + 16 + 2 + 256 = 275
  let ipAddress: string;
  let ipv6 = false;

  if (data.length === 263) {
    ipAddress = unpackIPv4(reader.readBytes(4));
  } else if (data.length === 275) {
    ipAddress = unpackIPv6(reader.readBytes(16));
    ipv6 = true;
  } else {
    throw new Error(`Invalid Telethon session: unexpected length ${data.length}`);
  }

  const port = reader.readUint16BE();
  const authKey = reader.readBytes(256);

  return { dcId, authKey, ipAddress, port, ipv6, testMode: false };
}

export function encode(session: SessionData): string {
  const ipBytes = session.ipv6 || isIPv6(session.ipAddress)
    ? packIPv6(session.ipAddress)
    : packIPv4(session.ipAddress);

  const writer = new BinaryWriter();
  writer.writeUint8(session.dcId);
  writer.writeBytes(ipBytes);
  writer.writeUint16BE(session.port);
  writer.writeBytes(session.authKey);

  return VERSION + b64UrlEncode(writer.build());
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
