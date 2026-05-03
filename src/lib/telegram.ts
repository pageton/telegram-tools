import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export interface AuthCallbacks {
	onCodeRequired: () => Promise<string>;
	onPasswordRequired: () => Promise<string>;
	onError: (error: Error) => void;
}

export async function createUserSession(
	apiId: number,
	apiHash: string,
	phoneNumber: string,
	callbacks: AuthCallbacks,
): Promise<{ client: TelegramClient; sessionString: string }> {
	const session = new StringSession("");
	const client = new TelegramClient(session, apiId, apiHash, {
		connectionRetries: 5,
		deviceModel: "Web Browser",
		systemVersion: "1.0",
	});

	await client.start({
		phoneNumber: async () => phoneNumber,
		phoneCode: async () => callbacks.onCodeRequired(),
		password: async () => callbacks.onPasswordRequired(),
		onError: callbacks.onError,
	});

	const sessionString = client.session.save() as unknown as string;
	return { client, sessionString };
}

export async function createBotSession(
	apiId: number,
	apiHash: string,
	botToken: string,
	onError: (error: Error) => void,
): Promise<{ client: TelegramClient; sessionString: string }> {
	const session = new StringSession("");
	const client = new TelegramClient(session, apiId, apiHash, {
		connectionRetries: 5,
		deviceModel: "Web Browser",
		systemVersion: "1.0",
	});

	await client.start({
		botAuthToken: botToken,
		onError,
	});

	const sessionString = client.session.save() as unknown as string;
	return { client, sessionString };
}

export async function getMe(client: TelegramClient): Promise<{
	id: number;
	isBot: boolean;
	firstName: string;
	username?: string;
}> {
	const me = await client.getMe();
	return {
		id: Number(me.id),
		isBot: !!me.bot,
		firstName: me.firstName ?? "Unknown",
		username: me.username ?? undefined,
	};
}
