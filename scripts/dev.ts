import { spawn } from "node:child_process";

const preview = process.argv.includes("--preview");
const children = [
	spawn(
		"bun",
		preview
			? ["dist/server/listener.js"]
			: ["--watch", "src/server/listener.ts"],
		{ stdio: "inherit" },
	),
	spawn("bun", ["x", "--no-install", "vite", ...(preview ? ["preview"] : [])], {
		stdio: "inherit",
	}),
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
