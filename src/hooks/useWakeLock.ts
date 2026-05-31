import { useEffect, useRef } from "react";

type WakeLockSentinelLike = {
	release: () => Promise<void>;
	addEventListener?: (type: "release", cb: () => void) => void;
};

/**
 * Keep the screen awake while `active` is true (e.g. during a game). The lock is
 * released by the browser whenever the page is hidden, so we re-request it on
 * `visibilitychange`. Requires HTTPS; no-ops where the API is unsupported.
 */
export function useWakeLock(active: boolean) {
	const lock = useRef<WakeLockSentinelLike | null>(null);

	useEffect(() => {
		if (!active) return;
		const api = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
		if (!api) return;

		const request = async () => {
			if (document.visibilityState !== "visible" || lock.current) return;
			try {
				const sentinel = await api.request("screen");
				lock.current = sentinel;
				sentinel.addEventListener?.("release", () => {
					lock.current = null;
				});
			} catch {
				// denied / not allowed — ignore
			}
		};
		const onVisible = () => {
			if (document.visibilityState === "visible") request();
		};

		request();
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			lock.current?.release().catch(() => {});
			lock.current = null;
		};
	}, [active]);
}
