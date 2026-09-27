import { spawnSync } from "node:child_process";

const ready = spawnSync("docker", ["info"], { stdio: "ignore" });
if (ready.error || ready.status !== 0) {
	console.error(
		"Docker is unavailable. Install/open Docker Desktop, wait for it to start, then retry mise run db:start (or setup/dev). No AWS account is needed.",
	);
	process.exitCode = 1;
} else {
	const result = spawnSync("docker", ["compose", "up", "-d", "dynamodb"], {
		stdio: "inherit",
	});
	process.exitCode = result.status ?? 1;
}
