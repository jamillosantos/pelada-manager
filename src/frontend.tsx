import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import RoutesApp from "./routes";
import "./styles/globals.css";

/** Follow the OS color scheme (auto dark/light), reacting to live changes. */
function syncTheme() {
	const mq = window.matchMedia("(prefers-color-scheme: dark)");
	const apply = (dark: boolean) => {
		document.documentElement.classList.toggle("dark", dark);
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", dark ? "#0a0a0a" : "#ffffff");
	};
	apply(mq.matches);
	mq.addEventListener("change", (e) => apply(e.matches));
}

function start() {
	syncTheme();
	ReactDOM.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<HashRouter>
				<RoutesApp />
			</HashRouter>
		</React.StrictMode>,
	);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", start);
} else {
	start();
}
