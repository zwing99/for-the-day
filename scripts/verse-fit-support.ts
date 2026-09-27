/** Keep provider and proxy error details out of command output. */
export function publicFailureCategory(status: number, code?: string): string {
	if (status === 429 || code === "rate-limit") return "rate-limit";
	if ([401, 403].includes(status) || code === "access-denied")
		return "access-denied";
	if (code === "configuration") return "configuration";
	return "unavailable";
}
