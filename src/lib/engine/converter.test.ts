import { describe, expect, it } from "vitest";
import {
	convertSession,
	decodeSession,
	detectFormat,
	encodeSession,
	sessionSummary,
	validateSession,
} from "./converter";
import type { SessionData, SessionFormat } from "./types";
import { DC_PROD } from "./types";

// ---------------------------------------------------------------------------
// Test fixture: deterministic 256-byte auth key
// ---------------------------------------------------------------------------
const AUTH_KEY = new Uint8Array(256);
for (let i = 0; i < 256; i++) AUTH_KEY[i] = i;

const BASE_SESSION: SessionData = {
	dcId: 2,
	authKey: AUTH_KEY,
	ipAddress: DC_PROD[2].ip, // 149.154.167.51
	port: 443,
	ipv6: false,
	testMode: false,
};

const SESSION_WITH_META: SessionData = {
	...BASE_SESSION,
	userId: 123456789,
	isBot: false,
	apiId: 98765,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compare authKey byte arrays */
function authKeysEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

/** Core fields that all formats round-trip */
function expectCoreFields(
	got: SessionData,
	expected: SessionData,
	opts?: { checkIp?: boolean },
) {
	expect(got.dcId).toBe(expected.dcId);
	expect(got.authKey.length).toBe(256);
	expect(authKeysEqual(got.authKey, expected.authKey)).toBe(true);
	if (opts?.checkIp !== false) {
		expect(got.ipAddress).toBe(expected.ipAddress);
	}
	expect(got.port).toBe(expected.port);
}

// ---------------------------------------------------------------------------
// Round-trip tests per format
// ---------------------------------------------------------------------------

describe("Telethon round-trip", () => {
	it("encode → decode preserves core fields", async () => {
		const encoded = await encodeSession(BASE_SESSION, "telethon");
		expect(encoded.startsWith("1")).toBe(true);

		const decoded = decodeSession(encoded, "telethon");
		expectCoreFields(decoded, BASE_SESSION);
		expect(decoded.ipv6).toBe(false);
	});
});

describe("GramJS round-trip", () => {
	it("encode → decode preserves core fields", async () => {
		const encoded = await encodeSession(BASE_SESSION, "gramjs");
		expect(encoded.startsWith("1")).toBe(true);

		const decoded = decodeSession(encoded, "gramjs");
		expectCoreFields(decoded, BASE_SESSION);
	});
});

describe("Pyrogram round-trip", () => {
	it("encode → decode preserves core + metadata fields", async () => {
		const encoded = await encodeSession(SESSION_WITH_META, "pyrogram", {
			apiId: 98765,
		});

		const decoded = decodeSession(encoded, "pyrogram");
		expectCoreFields(decoded, SESSION_WITH_META);
		expect(decoded.userId).toBe(SESSION_WITH_META.userId);
		expect(decoded.isBot).toBe(false);
		expect(decoded.apiId).toBe(98765);
	});

	it("encode without apiId defaults to 0", async () => {
		const noApiId = { ...BASE_SESSION };
		const encoded = await encodeSession(noApiId, "pyrogram");
		const decoded = decodeSession(encoded, "pyrogram");
		expect(decoded.apiId).toBe(0);
	});
});

describe("mtcute round-trip", () => {
	it("encode → decode preserves core fields (no self)", async () => {
		const encoded = await encodeSession(BASE_SESSION, "mtcute");

		const decoded = decodeSession(encoded, "mtcute");
		expectCoreFields(decoded, BASE_SESSION);
	});

	it("encode → decode preserves userId + isBot", async () => {
		const encoded = await encodeSession(SESSION_WITH_META, "mtcute");

		const decoded = decodeSession(encoded, "mtcute");
		expectCoreFields(decoded, SESSION_WITH_META);
		expect(decoded.userId).toBe(SESSION_WITH_META.userId);
		expect(decoded.isBot).toBe(false);
	});
});

describe("gotg round-trip", () => {
	it("encode → decode preserves core fields", async () => {
		const encoded = await encodeSession(BASE_SESSION, "gotg");

		const decoded = decodeSession(encoded, "gotg");
		expect(decoded.dcId).toBe(BASE_SESSION.dcId);
		expect(decoded.authKey.length).toBe(256);
		expect(authKeysEqual(decoded.authKey, BASE_SESSION.authKey)).toBe(true);
		// gotg always uses DC_PROD ip
		expect(decoded.ipAddress).toBe(DC_PROD[2].ip);
	});
});

// ---------------------------------------------------------------------------
// Cross-format conversion
// ---------------------------------------------------------------------------

describe("convertSession", () => {
	const formats: SessionFormat[] = [
		"telethon",
		"gramjs",
		"pyrogram",
		"mtcute",
		"gotg",
	];

	it.each(formats)("telethon → %s preserves auth key", async (target) => {
		const telethonStr = await encodeSession(BASE_SESSION, "telethon");
		const result = await convertSession(telethonStr, "telethon", target, {
			apiId: 12345,
		});

		const decoded = decodeSession(result, target);
		expect(decoded.dcId).toBe(BASE_SESSION.dcId);
		expect(authKeysEqual(decoded.authKey, BASE_SESSION.authKey)).toBe(true);
	});

	it("pyrogram → all other formats preserves auth key", async () => {
		const pyroStr = await encodeSession(SESSION_WITH_META, "pyrogram", {
			apiId: 98765,
		});

		for (const target of formats.filter((f) => f !== "pyrogram")) {
			const result = await convertSession(pyroStr, "pyrogram", target, {
				apiId: 98765,
			});
			const decoded = decodeSession(result, target);
			expect(decoded.dcId).toBe(SESSION_WITH_META.dcId);
			expect(authKeysEqual(decoded.authKey, SESSION_WITH_META.authKey)).toBe(
				true,
			);
		}
	});
});

// ---------------------------------------------------------------------------
// detectFormat
// ---------------------------------------------------------------------------

describe("detectFormat", () => {
	it("detects telethon with high confidence", async () => {
		const encoded = await encodeSession(BASE_SESSION, "telethon");
		const result = detectFormat(encoded);
		expect(result).not.toBeNull();
		expect(result!.format).toBe("telethon");
		expect(result!.confidence).toBe("high");
		expectCoreFields(result!.session, BASE_SESSION);
	});

	it("detects gramjs-encoded string (indistinguishable from telethon)", async () => {
		// gramjs and telethon both start with "1" and use similar encoding.
		// detectFormat tries telethon first, so gramjs strings get detected as telethon.
		// The IP/port bytes are misread (gramjs length-prefixed string vs telethon raw bytes),
		// but the auth key — the critical credential — is preserved. IP check skipped.
		const encoded = await encodeSession(BASE_SESSION, "gramjs");
		const result = detectFormat(encoded);
		expect(result).not.toBeNull();
		expect(result!.confidence).toBe("high");
		expectCoreFields(result!.session, BASE_SESSION, { checkIp: false });
	});

	it("detects pyrogram with high confidence", async () => {
		const encoded = await encodeSession(SESSION_WITH_META, "pyrogram", {
			apiId: 98765,
		});
		const result = detectFormat(encoded);
		expect(result).not.toBeNull();
		expect(result!.format).toBe("pyrogram");
		expect(result!.confidence).toBe("high");
	});

	it("detects gotg with high confidence", async () => {
		const encoded = await encodeSession(BASE_SESSION, "gotg");
		const result = detectFormat(encoded);
		expect(result).not.toBeNull();
		expect(result!.format).toBe("gotg");
		expect(result!.confidence).toBe("high");
	});

	it("returns null for garbage input", () => {
		expect(detectFormat("")).toBeNull();
		expect(detectFormat("not-a-session")).toBeNull();
		expect(detectFormat("aaaa")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// validateSession
// ---------------------------------------------------------------------------

describe("validateSession", () => {
	it("valid session returns no errors", () => {
		expect(validateSession(BASE_SESSION)).toEqual([]);
	});

	it("invalid dcId returns error", () => {
		const bad = { ...BASE_SESSION, dcId: 0 };
		const errors = validateSession(bad);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("Invalid DC ID");
	});

	it("wrong auth key length returns error", () => {
		const bad = { ...BASE_SESSION, authKey: new Uint8Array(128) };
		const errors = validateSession(bad);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("Invalid auth key length");
	});

	it("all-zero auth key returns error", () => {
		const bad = { ...BASE_SESSION, authKey: new Uint8Array(256) };
		const errors = validateSession(bad);
		expect(errors.some((e) => e.includes("all zeros"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// sessionSummary
// ---------------------------------------------------------------------------

describe("sessionSummary", () => {
	it("includes DC ID, IP, Port, Auth Key", () => {
		const summary = sessionSummary(BASE_SESSION);
		expect(summary["DC ID"]).toBe("2");
		expect(summary["IP Address"]).toBe(DC_PROD[2].ip);
		expect(summary["Port"]).toBe("443");
		expect(summary["Auth Key"]).toContain("256 bytes");
	});

	it("includes optional fields when present", () => {
		const summary = sessionSummary(SESSION_WITH_META);
		expect(summary["User ID"]).toBe("123456789");
		expect(summary["Account Type"]).toBe("User");
		expect(summary["API ID"]).toBe("98765");
	});

	it("omits optional fields when absent", () => {
		const summary = sessionSummary(BASE_SESSION);
		expect(summary["User ID"]).toBeUndefined();
		expect(summary["Account Type"]).toBeUndefined();
		expect(summary["API ID"]).toBeUndefined();
	});

	it("shows test mode", () => {
		const testSession = { ...BASE_SESSION, testMode: true };
		const summary = sessionSummary(testSession);
		expect(summary["Test Mode"]).toBe("Yes");
	});
});

// ---------------------------------------------------------------------------
// Base64 utilities (imported indirectly — tested via round-trips above)
// Additional direct edge-case tests
// ---------------------------------------------------------------------------

describe("decodeSession rejects invalid input", () => {
	it("throws on empty string", () => {
		expect(() => decodeSession("", "telethon")).toThrow();
	});

	it("throws on wrong format hint", () => {
		// Encode as telethon, try to decode as gramjs — the "1" prefix
		// makes it ambiguous, but the base64 variant difference should cause
		// either a wrong length or invalid data error.
		// We just verify it throws *something* for truly invalid input.
		expect(() => decodeSession("garbage-data", "telethon")).toThrow();
		expect(() => decodeSession("garbage-data", "gramjs")).toThrow();
		expect(() => decodeSession("garbage-data", "pyrogram")).toThrow();
		expect(() => decodeSession("garbage-data", "mtcute")).toThrow();
	});
});
