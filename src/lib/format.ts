export function hhmm(epoch: number): string {
	return new Date(epoch).toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** "há 12 min" style waiting label */
export function elapsed(from: number, now = Date.now()): string {
	const min = Math.max(0, Math.floor((now - from) / 60000));
	if (min < 1) return "agora";
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	const m = min % 60;
	return m ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}
