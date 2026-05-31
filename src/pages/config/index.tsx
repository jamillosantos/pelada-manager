import { Check, Eraser, Minus, Plus, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmSheet } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { TEAM_COLORS, getColor } from "@/lib/colors";
import { QUEUE_STRATEGIES } from "@/lib/queue-strategies";
import { playAlarm, unlockAudio } from "@/lib/sound";
import { useStore } from "@/lib/store";
import { cn } from "@/utils/cn";

export default function Config() {
	const name = useStore((s) => s.name);
	const teamSize = useStore((s) => s.teamSize);
	const autoThreshold = teamSize * 3 + 1;
	const setName = useStore((s) => s.setName);
	const setTeamSize = useStore((s) => s.setTeamSize);
	const gameDurationMin = useStore((s) => s.gameDurationMin);
	const setGameDuration = useStore((s) => s.setGameDuration);
	const teamAColor = useStore((s) => s.teamAColor);
	const teamBColor = useStore((s) => s.teamBColor);
	const setTeamColor = useStore((s) => s.setTeamColor);
	const queueStrategy = useStore((s) => s.queueStrategy);
	const setQueueStrategy = useStore((s) => s.setQueueStrategy);
	const resetGames = useStore((s) => s.resetGames);
	const resetDay = useStore((s) => s.resetDay);
	const players = useStore((s) => s.players);
	const history = useStore((s) => s.history);

	const [confirmGames, setConfirmGames] = useState(false);
	const [confirmDay, setConfirmDay] = useState(false);

	return (
		<div className="flex flex-col gap-4 p-4">
			<header className="pt-2">
				<h1 className="text-2xl font-bold">Configurações</h1>
			</header>

			<Card>
				<CardContent className="flex flex-col gap-4 p-4">
					<label className="flex flex-col gap-1.5">
						<span className="text-sm font-medium">Nome da pelada</span>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Pelada"
						/>
					</label>

					<div className="flex items-center justify-between">
						<div className="flex flex-col">
							<span className="text-sm font-medium">Jogadores por time</span>
							<span className="text-xs text-muted-foreground">
								Usado para montar os times
							</span>
						</div>
						<div className="flex items-center gap-3">
							<Button
								size="icon"
								variant="outline"
								onClick={() => setTeamSize(teamSize - 1)}
								aria-label="Menos"
							>
								<Minus />
							</Button>
							<span className="w-6 text-center text-lg font-bold">
								{teamSize}
							</span>
							<Button
								size="icon"
								variant="outline"
								onClick={() => setTeamSize(teamSize + 1)}
								aria-label="Mais"
							>
								<Plus />
							</Button>
						</div>
					</div>

					<div className="flex items-center justify-between gap-3">
						<div className="flex flex-col">
							<span className="text-sm font-medium">Tempo de jogo</span>
							<span className="text-xs text-muted-foreground">
								Minutos (0.1 = 6s, para testar)
							</span>
						</div>
						<div className="flex items-center gap-3">
							<Button
								size="icon"
								variant="outline"
								onClick={() =>
									setGameDuration(
										gameDurationMin <= 1
											? gameDurationMin - 0.1
											: gameDurationMin - 1,
									)
								}
								aria-label="Menos"
							>
								<Minus />
							</Button>
							<span className="w-10 text-center text-lg font-bold tabular-nums">
								{gameDurationMin}
							</span>
							<Button
								size="icon"
								variant="outline"
								onClick={() =>
									setGameDuration(
										gameDurationMin < 1
											? gameDurationMin + 0.1
											: gameDurationMin + 1,
									)
								}
								aria-label="Mais"
							>
								<Plus />
							</Button>
						</div>
					</div>

					<Button
						variant="outline"
						onClick={() => {
							unlockAudio();
							playAlarm();
						}}
					>
						<Volume2 /> Testar alarme
					</Button>

					<p className="text-xs text-muted-foreground">
						Modo "muitos jogadores" liga sozinho com {autoThreshold} jogadores (3
						times + 1). Abaixo disso dá para alternar na aba Jogos.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-col gap-4 p-4">
					<span className="text-sm font-medium">Cores dos times</span>
					<ColorRow
						label="Time A"
						value={teamAColor}
						other={teamBColor}
						onPick={(id) => setTeamColor("A", id)}
					/>
					<ColorRow
						label="Time B"
						value={teamBColor}
						other={teamAColor}
						onPick={(id) => setTeamColor("B", id)}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-col gap-2 p-4">
					<span className="text-sm font-medium">Estratégia da fila</span>
					{QUEUE_STRATEGIES.map((st) => {
						const selected = st.id === queueStrategy;
						return (
							<button
								key={st.id}
								onClick={() => setQueueStrategy(st.id)}
								className={cn(
									"flex items-start gap-3 rounded-lg border p-3 text-left",
									selected ? "border-primary bg-accent" : "bg-card",
								)}
							>
								<span
									className={cn(
										"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
										selected ? "border-primary" : "border-muted-foreground/40",
									)}
								>
									{selected && (
										<span className="size-2.5 rounded-full bg-primary" />
									)}
								</span>
								<span className="flex flex-col">
									<span className="text-sm font-medium">{st.label}</span>
									<span className="text-xs text-muted-foreground">
										{st.description}
									</span>
								</span>
							</button>
						);
					})}
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex items-center justify-between p-4 text-sm">
					<span className="text-muted-foreground">
						{players.length} jogadores · {history.length} jogos
					</span>
				</CardContent>
			</Card>

			<Button
				variant="outline"
				size="lg"
				onClick={() => setConfirmGames(true)}
			>
				<Eraser /> Zerar jogos
			</Button>

			<Button
				variant="destructive"
				size="lg"
				onClick={() => setConfirmDay(true)}
			>
				<Trash2 /> Zerar o dia
			</Button>

			<ConfirmSheet
				open={confirmGames}
				title="Zerar jogos?"
				description="Apaga o histórico e tira os times do campo. Mantém os jogadores e a fila."
				confirmLabel="Sim, zerar jogos"
				onConfirm={resetGames}
				onClose={() => setConfirmGames(false)}
			/>

			<ConfirmSheet
				open={confirmDay}
				title="Zerar o dia?"
				description="Apaga todos os jogadores, a fila e o histórico de jogos. Não dá para desfazer."
				confirmLabel="Sim, apagar tudo"
				onConfirm={resetDay}
				onClose={() => setConfirmDay(false)}
			/>
		</div>
	);
}

function ColorRow({
	label,
	value,
	other,
	onPick,
}: {
	label: string;
	value: string;
	other: string;
	onPick: (id: string) => void;
}) {
	const current = getColor(value);
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground">{label}</span>
				<span className="text-sm font-medium">{current.label}</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{TEAM_COLORS.map((c) => {
					const selected = c.id === value;
					const taken = c.id === other;
					return (
						<button
							key={c.id}
							disabled={taken}
							onClick={() => onPick(c.id)}
							aria-label={c.label}
							className={cn(
								"flex size-9 items-center justify-center rounded-full border-2 transition",
								selected ? "border-foreground" : "border-transparent",
								taken && "opacity-25",
							)}
							style={{ backgroundColor: c.hex }}
						>
							{selected && <Check className="size-4" style={{ color: c.fg }} />}
						</button>
					);
				})}
			</div>
		</div>
	);
}
