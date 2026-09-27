import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { Reader } from "./reader.js";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root.");
createRoot(root).render(
	<StrictMode>
		<Reader />
	</StrictMode>,
);
