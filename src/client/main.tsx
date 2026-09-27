import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { browserChapterSource } from "./cached-chapter-source.js";
import { configureShell } from "./pwa.js";
import { Reader } from "./reader.js";

void configureShell(import.meta.env.PROD);

const root = document.getElementById("root");
const source = browserChapterSource();
if (!root) throw new Error("Missing application root.");
createRoot(root).render(
	<StrictMode>
		<Reader source={source} />
	</StrictMode>,
);
