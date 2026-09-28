import { describe, expect, it } from "vitest";
import {
	isPrivateHttpDevelopmentOrigin,
	installPlatform,
	readInstallPreference,
} from "../../../src/client/install-invitation.js";

describe("install invitation", () => {
	it("recognizes secure origins and private-network development hosts on mobile", () => {
		expect(installPlatform("Mozilla/5.0 (iPhone)", true, false)).toBe("iphone");
		expect(
			installPlatform("Mozilla/5.0 (Linux; Android 16)", true, false),
		).toBe("android");
		expect(installPlatform("Mozilla/5.0 (iPhone)", true, true)).toBeUndefined();
		expect(
			installPlatform("Mozilla/5.0 (iPhone)", false, false),
		).toBeUndefined();
		expect(installPlatform("Desktop", true, false)).toBeUndefined();
		expect(
			installPlatform(
				"Mozilla/5.0 (Android 16)",
				false,
				false,
				"http://10.13.0.5:5173",
			),
		).toBe("android");
		expect(
			installPlatform(
				"Mozilla/5.0 (iPhone)",
				false,
				false,
				"http://192.168.1.8:5173",
			),
		).toBe("iphone");
		expect(
			installPlatform(
				"Mozilla/5.0 (Android 16)",
				false,
				false,
				"http://example.com",
			),
		).toBeUndefined();
		expect(isPrivateHttpDevelopmentOrigin("http://10.13.0.5:5173")).toBe(true);
		expect(isPrivateHttpDevelopmentOrigin("http://172.20.0.4")).toBe(true);
		expect(isPrivateHttpDevelopmentOrigin("https://10.13.0.5")).toBe(false);
	});
	it("validates one-week reminder and permanent choice", () => {
		const now = 1_000_000_000;
		const storage = (value: unknown) => ({
			getItem: () => JSON.stringify(value),
		});
		expect(
			readInstallPreference(
				storage({
					version: 1,
					neverAsk: false,
					remindAfter: now + 7 * 86400_000,
				}),
				now,
			).remindAfter,
		).toBe(now + 7 * 86400_000);
		expect(
			readInstallPreference(
				storage({
					version: 1,
					neverAsk: false,
					remindAfter: now + 8 * 86400_000,
				}),
				now,
			).remindAfter,
		).toBeUndefined();
		expect(
			readInstallPreference(storage({ version: 1, neverAsk: true }), now)
				.neverAsk,
		).toBe(true);
		expect(
			readInstallPreference(storage({ version: 1, neverAsk: false }), now)
				.neverAsk,
		).toBe(false);
		expect(
			readInstallPreference(
				{
					getItem: () => {
						throw Error("blocked");
					},
				},
				now,
			).neverAsk,
		).toBe(false);
	});
});
