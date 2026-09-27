// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ShareLink } from "../../../src/client/share-link.js";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});
const url = "http://localhost:5173/7/psalm/67/3?translation=NLT&org=PSA.67.3";
it("shares only the current canonical link and announces native success", async () => {
	const share = vi.fn().mockResolvedValue(undefined);
	vi.stubGlobal("navigator", { share });
	let link = "old";
	render(<ShareLink getLink={() => link} />);
	link = url;
	fireEvent.click(screen.getByRole("button", { name: "Share link" }));
	await waitFor(() =>
		expect(screen.getByRole("status").textContent).toBe("Link shared."),
	);
	expect(share).toHaveBeenCalledWith({ url });
});
it.each([
	new DOMException("cancel", "AbortError"),
	new Error("private platform detail"),
])(
	"allows copy after native sharing fails or is cancelled",
	async (failure) => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal("navigator", {
			share: vi.fn().mockRejectedValue(failure),
			clipboard: { writeText },
		});
		render(<ShareLink getLink={() => url} />);
		fireEvent.click(screen.getByRole("button", { name: "Share link" }));
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toMatch(/copy/i),
		);
		expect(screen.getByRole("status").textContent).not.toContain(
			"private platform detail",
		);
		fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toBe("Link copied."),
		);
		expect(writeText).toHaveBeenCalledWith(url);
	},
);
it.each([
	{},
	{ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } },
])(
	"offers a selectable link when native share and clipboard are unavailable",
	async (platform) => {
		vi.stubGlobal("navigator", platform);
		render(<ShareLink getLink={() => url} />);
		expect(screen.queryByRole("button", { name: "Share link" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
		const field = await screen.findByRole("textbox", { name: "Location link" });
		expect((field as HTMLInputElement).value).toBe(url);
		field.focus();
		expect((field as HTMLInputElement).selectionEnd).toBe(url.length);
	},
);
