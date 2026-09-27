import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const preview = process.argv.includes("--preview");
const host = process.argv.includes("--host");
if (host) {
	const port = preview ? 4173 : Number(process.env.WEB_PORT ?? 5173);
	const addresses = new Set(
		Object.values(networkInterfaces())
			.flatMap((entries) => entries ?? [])
			.filter((entry) => entry.family === "IPv4" && !entry.internal)
			.map((entry) => entry.address),
	);
	console.log("\nPhone testing: connect your phone to the same Wi-Fi network.");
	for (const address of addresses)
		console.log(`Open on your phone: http://${address}:${port}`);
	if (!addresses.size)
		console.log("No local IPv4 address found. Connect to Wi-Fi and try again.");
	console.log("Ctrl-C stops the frontend and API.\n");
}
const children = [
	spawn(
		"bun",
		preview
			? ["dist/server/listener.js"]
			: ["--watch", "src/server/listener.ts"],
		{ stdio: "inherit" },
	),
	spawn(
		"bun",
		[
			"x",
			"--no-install",
			"vite",
			...(preview ? ["preview"] : []),
			...(host ? ["--host", "0.0.0.0"] : []),
		],
		{ stdio: "inherit" },
	),
];
let stopping = false;
function stop(code = 0) {
	if (stopping) return;
	stopping = true;
	process.exitCode = code;
	for (const child of children) child.kill("SIGTERM");
	const timeout = setTimeout(() => {
		for (const child of children) child.kill("SIGKILL");
	}, 3000);
	timeout.unref();
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.once(signal, () => stop());
for (const child of children) {
	child.once("error", () => stop(1));
	child.once("exit", (code) => stop(code ?? 1));
}
