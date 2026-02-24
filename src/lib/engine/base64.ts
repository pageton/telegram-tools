/** Base64 encoding/decoding utilities for browser environment */

/** Standard base64 encode */
export function b64Encode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/** Standard base64 decode */
export function b64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** URL-safe base64 encode (with padding) */
export function b64UrlEncode(data: Uint8Array): string {
  return b64Encode(data).replace(/\+/g, '-').replace(/\//g, '_');
}

/** URL-safe base64 encode (no padding) */
export function b64UrlEncodeNoPad(data: Uint8Array): string {
  return b64UrlEncode(data).replace(/=/g, '');
}

/** URL-safe base64 decode (handles missing padding) */
export function b64UrlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const pad = (4 - (s.length % 4)) % 4;
  s += '='.repeat(pad);
  return b64Decode(s);
}
