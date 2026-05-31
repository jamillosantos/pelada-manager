// Browser alarm via Web Audio API — no audio asset needed.
// Audio is gesture-gated: call unlockAudio() inside a tap handler (e.g. when the
// timer starts) so the context is running by the time the alarm fires.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
	if (typeof window === "undefined") return null;
	const AC = window.AudioContext ?? (window as any).webkitAudioContext;
	if (!AC) return null;
	if (!ctx) ctx = new AC();
	return ctx;
}

/** Resume the audio context from a user gesture so later beeps can play. */
export function unlockAudio() {
	const c = getCtx();
	if (c && c.state === "suspended") c.resume();
}

// oscillators currently scheduled, so an in-progress alarm can be stopped
let active: OscillatorNode[] = [];

function beep(c: AudioContext, start: number, freq: number, dur: number) {
	const osc = c.createOscillator();
	const gain = c.createGain();
	osc.type = "square";
	osc.frequency.value = freq;
	// quick fade in/out to avoid clicks
	gain.gain.setValueAtTime(0.0001, start);
	gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
	osc.connect(gain).connect(c.destination);
	osc.start(start);
	osc.stop(start + dur);
	osc.onended = () => {
		active = active.filter((o) => o !== osc);
	};
	active.push(osc);
}

/** Stop any alarm/warning currently sounding or scheduled. */
export function stopAlarm() {
	for (const o of active) {
		try {
			o.stop();
		} catch {}
		try {
			o.disconnect();
		} catch {}
	}
	active = [];
}

/** Short single beep — countdown warning (1m, 30s, 15s, 5s). */
export function playWarning() {
	const c = getCtx();
	if (!c) return;
	if (c.state === "suspended") c.resume();
	beep(c, c.currentTime, 660, 0.15);
}

/** Repeating alarm that sounds for `durationMs` (default 5s). */
export function playAlarm(durationMs = 5000) {
	const c = getCtx();
	if (!c) return;
	if (c.state === "suspended") c.resume();
	stopAlarm();
	const t0 = c.currentTime;
	let i = 0;
	for (let off = 0; off < durationMs / 1000; off += 0.45) {
		beep(c, t0 + off, i % 2 === 0 ? 880 : 1175, 0.22);
		i++;
	}
}
