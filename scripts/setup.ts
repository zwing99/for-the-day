import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";

try {
	await copyFile(".env.example", ".env", constants.COPYFILE_EXCL);
	console.log(
		"Created .env. Configure provider credentials before reading Scripture.",
	);
} catch (error) {
	if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
	console.log("Kept existing .env configuration.");
}
