import { toPng } from "html-to-image";
import { ImageDown, Share2 } from "lucide-react";
import { useMemo, useRef } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { getColor } from "@/lib/colors";
import { useStore } from "@/lib/store";

const ACCENT = "#16a34a";
const ACCENT2 = "#2563eb";

const tooltipStyle = {
	background: "var(--card)",
	border: "1px solid var(--border)",
	borderRadius: 8,
	color: "var(--foreground)",
	fontSize: 12,
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

export default function Stats() {
	const history = useStore((s) => s.history);
	const players = useStore((s) => s.players);
	const dayName = useStore((s) => s.name);
	const colorA = useStore((s) => getColor(s.teamAColor));
	const colorB = useStore((s) => getColor(s.teamBColor));

	const shotRef = useRef<HTMLDivElement>(null);

	const nameOf = useMemo(() => {
		const m = new Map(players.map((p) => [p.id, p.name] as const));
		return (id: string) => m.get(id) ?? "?";
	}, [players]);

	const stats = useMemo(() => {
		const played = new Map<string, number>();
		const goals = new Map<string, number>();
		const wins = new Map<string, number>();
		const bump = (m: Map<string, number>, id: string, n = 1) =>
			m.set(id, (m.get(id) ?? 0) + n);

		let totalGoals = 0;
		let ties = 0;
		let aWins = 0;
		let bWins = 0;
		// oldest → newest for the per-game timeline
		const chrono = [...history].reverse();
		const perGame = chrono.map((g, i) => {
			for (const id of [...g.teamA, ...g.teamB]) bump(played, id);
			for (const go of g.goals) bump(goals, go.playerId);
			totalGoals += g.scoreA + g.scoreB;
			if (g.result === "tie") ties++;
			else if (g.result === "A") {
				aWins++;
				for (const id of g.teamA) bump(wins, id);
			} else {
				bWins++;
				for (const id of g.teamB) bump(wins, id);
			}
			return { name: `J${i + 1}`, gols: g.scoreA + g.scoreB };
		});

		const top = (m: Map<string, number>, key: string) =>
			[...m.entries()]
				.filter(([, v]) => v > 0)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10)
				.map(([id, v]) => ({ name: nameOf(id), [key]: v }));

		const ranking = [...played.entries()]
			.map(([id, p]) => ({
				name: nameOf(id),
				jogos: p,
				vitorias: wins.get(id) ?? 0,
				aprov: Math.round(((wins.get(id) ?? 0) / p) * 100),
			}))
			.sort((a, b) => b.aprov - a.aprov || b.jogos - a.jogos);

		return {
			games: history.length,
			totalGoals,
			ties,
			avg: history.length ? (totalGoals / history.length).toFixed(1) : "0",
			scorers: top(goals, "gols"),
			presence: top(played, "jogos"),
			perGame,
			ranking,
			aWins,
			bWins,
		};
	}, [history, nameOf]);

	if (history.length === 0) {
		return (
			<div className="flex flex-col gap-4 p-4">
				<header className="pt-2">
					<h1 className="text-2xl font-bold">Estatísticas</h1>
				</header>
				<p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
					Sem jogos ainda. Jogue algumas partidas para ver os números.
				</p>
			</div>
		);
	}

	const colorWins = [
		{ name: colorA.label, value: stats.aWins, hex: colorA.hex },
		{ name: colorB.label, value: stats.bWins, hex: colorB.hex },
	].filter((d) => d.value > 0);

	const shareWhatsApp = () => {
		const scorers = stats.scorers
			.map((s, i) => `${i + 1}. ${s.name} — ${s.gols}`)
			.join("\n");
		const ranking = stats.ranking
			.slice(0, 10)
			.map(
				(r, i) =>
					`${i + 1}. ${r.name} — ${r.aprov}% (${r.vitorias}/${r.jogos})`,
			)
			.join("\n");
		const text =
			`*${dayName}* — Estatísticas\n\n` +
			`Jogos: ${stats.games} | Gols: ${stats.totalGoals} | ` +
			`Média: ${stats.avg} | Empates: ${stats.ties}\n\n` +
			(scorers ? `*Artilheiros*\n${scorers}\n\n` : "") +
			`*Vitórias por cor*\n${colorA.label}: ${stats.aWins} | ${colorB.label}: ${stats.bWins}\n\n` +
			`*Aproveitamento*\n${ranking}`;
		window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
	};

	const shareImage = async () => {
		const node = shotRef.current;
		if (!node) return;
		try {
			const bg = getComputedStyle(document.body).backgroundColor || "#0a0a0a";
			const dataUrl = await toPng(node, {
				pixelRatio: 2,
				backgroundColor: bg,
				cacheBust: true,
			});
			const blob = await (await fetch(dataUrl)).blob();
			const file = new File([blob], "estatisticas.png", { type: "image/png" });
			// native share sheet (includes WhatsApp on mobile); fallback to download
			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({
					files: [file],
					title: `${dayName} — Estatísticas`,
				});
			} else {
				const a = document.createElement("a");
				a.href = dataUrl;
				a.download = "estatisticas.png";
				a.click();
			}
		} catch {
			// user cancelled or capture failed — ignore
		}
	};

	return (
		<div className="flex flex-col gap-4 p-4">
			<header className="flex items-center justify-between pt-2">
				<h1 className="text-2xl font-bold">Estatísticas</h1>
				<div className="flex gap-2">
					<Button
						size="icon"
						variant="outline"
						onClick={shareImage}
						aria-label="Compartilhar imagem"
					>
						<ImageDown />
					</Button>
					<Button
						size="icon"
						variant="outline"
						onClick={shareWhatsApp}
						aria-label="Compartilhar texto no WhatsApp"
					>
						<Share2 />
					</Button>
				</div>
			</header>

			<div ref={shotRef} className="flex flex-col gap-4 bg-background">
				{/* summary */}
				<div className="grid grid-cols-2 gap-2">
					<Stat label="Jogos" value={stats.games} />
					<Stat label="Gols" value={stats.totalGoals} />
					<Stat label="Média gols/jogo" value={stats.avg} />
					<Stat label="Empates" value={stats.ties} />
				</div>

				{stats.scorers.length > 0 && (
					<ChartCard title="Artilheiros">
						<ResponsiveContainer
							width="100%"
							height={stats.scorers.length * 34 + 20}
						>
							<BarChart
								data={stats.scorers}
								layout="vertical"
								margin={{ left: 8, right: 16 }}
							>
								<XAxis type="number" tick={axisTick} allowDecimals={false} />
								<YAxis
									type="category"
									dataKey="name"
									width={80}
									tick={axisTick}
								/>
								<Tooltip
									contentStyle={tooltipStyle}
									cursor={{ fill: "var(--muted)" }}
								/>
								<Bar dataKey="gols" fill={ACCENT} radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</ChartCard>
				)}

				<ChartCard title="Gols por jogo">
					<ResponsiveContainer width="100%" height={200}>
						<LineChart data={stats.perGame} margin={{ left: -16, right: 8 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
							<XAxis dataKey="name" tick={axisTick} />
							<YAxis tick={axisTick} allowDecimals={false} />
							<Tooltip contentStyle={tooltipStyle} />
							<Line
								type="monotone"
								dataKey="gols"
								stroke={ACCENT}
								strokeWidth={2}
								dot={{ r: 3 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</ChartCard>

				{stats.presence.length > 0 && (
					<ChartCard title="Presenças">
						<ResponsiveContainer
							width="100%"
							height={stats.presence.length * 34 + 20}
						>
							<BarChart
								data={stats.presence}
								layout="vertical"
								margin={{ left: 8, right: 16 }}
							>
								<XAxis type="number" tick={axisTick} allowDecimals={false} />
								<YAxis
									type="category"
									dataKey="name"
									width={80}
									tick={axisTick}
								/>
								<Tooltip
									contentStyle={tooltipStyle}
									cursor={{ fill: "var(--muted)" }}
								/>
								<Bar dataKey="jogos" fill={ACCENT2} radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</ChartCard>
				)}

				{colorWins.length > 0 && (
					<ChartCard title="Vitórias por cor">
						<ResponsiveContainer width="100%" height={200}>
							<PieChart>
								<Pie
									data={colorWins}
									dataKey="value"
									nameKey="name"
									outerRadius={80}
									label={(e) => `${e.name}: ${e.value}`}
								>
									{colorWins.map((d) => (
										<Cell key={d.name} fill={d.hex} />
									))}
								</Pie>
								<Tooltip contentStyle={tooltipStyle} />
							</PieChart>
						</ResponsiveContainer>
					</ChartCard>
				)}

				<ChartCard title="Aproveitamento">
					<div className="flex flex-col">
						<div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b pb-1 text-xs font-semibold text-muted-foreground">
							<span>Jogador</span>
							<span className="w-10 text-right">Jogos</span>
							<span className="w-10 text-right">Vit.</span>
							<span className="w-12 text-right">%</span>
						</div>
						{stats.ranking.map((r) => (
							<div
								key={r.name}
								className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b py-1.5 text-sm last:border-0"
							>
								<span className="truncate">{r.name}</span>
								<span className="w-10 text-right tabular-nums">{r.jogos}</span>
								<span className="w-10 text-right tabular-nums">
									{r.vitorias}
								</span>
								<span className="w-12 text-right tabular-nums font-semibold">
									{r.aprov}%
								</span>
							</div>
						))}
					</div>
				</ChartCard>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: number | string }) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-0.5 p-3">
				<span className="text-2xl font-bold tabular-nums">{value}</span>
				<span className="text-xs text-muted-foreground">{label}</span>
			</CardContent>
		</Card>
	);
}

function ChartCard({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-2 p-3">
				<CardTitle className="text-sm">
					<Badge variant="secondary">{title}</Badge>
				</CardTitle>
				{children}
			</CardContent>
		</Card>
	);
}
