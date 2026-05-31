import {
	ArrowLeftRight,
	Check,
	Flag,
	Play,
	Plus,
	RotateCcw,
	Timer,
	Trash2,
	Trophy,
	Users,
	X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClassBadge } from "@/components/player-bits";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ColorDot } from "@/components/ui/color-dot";
import { ConfirmSheet } from "@/components/ui/confirm";
import { Sheet } from "@/components/ui/sheet";
import { type TeamColor, getColor } from "@/lib/colors";
import { elapsed, hhmm } from "@/lib/format";
import { autoTooMany, isTooMany, useStore } from "@/lib/store";
import { playAlarm, stopAlarm, unlockAudio } from "@/lib/sound";
import type { Game, GameResult, Player, Team } from "@/lib/types";
import { cn } from "@/utils/cn";

export default function Games() {
	const players = useStore((s) => s.players);
	const teamA = useStore((s) => s.teamA);
	const teamB = useStore((s) => s.teamB);
	const queue = useStore((s) => s.queue);
	const teamSize = useStore((s) => s.teamSize);
	const playing = useStore((s) => s.currentGameStartedAt);
	const history = useStore((s) => s.history);
	const colorA = useStore((s) => getColor(s.teamAColor));
	const colorB = useStore((s) => getColor(s.teamBColor));
	const startGameTeams = useStore((s) => s.startGameTeams);
	const endGame = useStore((s) => s.endGame);
	const cancelGame = useStore((s) => s.cancelGame);
	const deleteGame = useStore((s) => s.deleteGame);
	const tooMany = useStore(isTooMany);
	const auto = useStore(autoTooMany);
	const toggleMode = useStore((s) => s.toggleMode);
	const currentGoals = useStore((s) => s.currentGoals);
	const addGoal = useStore((s) => s.addGoal);
	const removeGoal = useStore((s) => s.removeGoal);
	const substitute = useStore((s) => s.substitute);
	const gameDurationMin = useStore((s) => s.gameDurationMin);
	const timerEndsAt = useStore((s) => s.timerEndsAt);
	const startTimer = useStore((s) => s.startTimer);
	const resetTimer = useStore((s) => s.resetTimer);

	const [toDelete, setToDelete] = useState<Game | null>(null);
	const [confirmCancel, setConfirmCancel] = useState(false);
	const [picking, setPicking] = useState(false);
	const [subFor, setSubFor] = useState<Player | null>(null);

	const byId = useMemo(
		() => new Map(players.map((p) => [p.id, p] as const)),
		[players],
	);
	const nameOf = (id: string) => byId.get(id)?.name ?? "?";
	const classOf = (id: string) => byId.get(id)?.class;

	// candidates for a new game, in priority order: who is on the field, then the
	// waiting queue. Deduped so nobody appears twice.
	const candidates = useMemo<Player[]>(() => {
		const order = [
			...(teamA?.players ?? []),
			...(teamB?.players ?? []),
			...queue,
		];
		const seen = new Set<string>();
		return order
			.filter((id) => !seen.has(id) && seen.add(id))
			.map((id) => byId.get(id))
			.filter((p): p is Player => !!p && !p.disabled);
	}, [teamA, teamB, queue, byId]);

	// how many come in next: one team if the field is set (winner stays), two if
	// it's empty (first game / both left)
	const fieldSet =
		(teamA?.players.length ?? 0) > 0 || (teamB?.players.length ?? 0) > 0;
	const intake = fieldSet ? teamSize : teamSize * 2;
	const nextUp = queue.slice(0, intake);

	// standing winner that stays for the next game (just highlighted in the draft,
	// still editable). endGame already applied the mode rules: in too-many ties /
	// 2-in-a-row both teams leave (streak 0), so there is no staying winner.
	const winnerTeam = useMemo<{ side: "A" | "B"; ids: string[] } | null>(() => {
		if (playing) return null;
		if (teamA && teamA.streak > 0 && teamA.players.length > 0)
			return { side: "A", ids: teamA.players };
		if (teamB && teamB.streak > 0 && teamB.players.length > 0)
			return { side: "B", ids: teamB.players };
		return null;
	}, [playing, teamA, teamB]);

	const scoreA = currentGoals.filter((g) => g.team === "A").length;
	const scoreB = currentGoals.filter((g) => g.team === "B").length;
	const goalsByPlayer = useMemo(() => {
		const m = new Map<string, number>();
		for (const g of currentGoals)
			m.set(g.playerId, (m.get(g.playerId) ?? 0) + 1);
		return m;
	}, [currentGoals]);

	// the score leader is the suggested ("candidato") winner
	const candidate: GameResult =
		scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie";

	// keep the screen awake while a game is running
	useWakeLock(!!playing);

	// live countdown tick. The timer is epoch-based (timerEndsAt), so even if the
	// page was backgrounded/asleep the remaining value is correct on resume — we
	// also tick on visibilitychange so the end is detected (and the alarm fires)
	// the moment the phone comes back.
	const [nowTs, setNowTs] = useState(() => Date.now());
	useEffect(() => {
		if (!timerEndsAt) return;
		const tick = () => setNowTs(Date.now());
		const id = setInterval(tick, 500);
		const onVisible = () => {
			if (document.visibilityState === "visible") tick();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [timerEndsAt]);
	const remaining = timerEndsAt ? Math.max(0, timerEndsAt - nowTs) : null;

	// when the clock hits zero, ask to confirm the winner (once per timer)
	const [confirmWinner, setConfirmWinner] = useState(false);
	const firedFor = useRef<number | null>(null);
	useEffect(() => {
		if (
			timerEndsAt &&
			nowTs >= timerEndsAt &&
			firedFor.current !== timerEndsAt
		) {
			firedFor.current = timerEndsAt;
			setConfirmWinner(true);
			playAlarm();
			navigator.vibrate?.([300, 120, 300]);
		}
	}, [timerEndsAt, nowTs]);

	return (
		<div className="flex flex-col gap-4 p-4">
			<header className="flex items-start justify-between pt-2">
				<div>
					<h1 className="text-2xl font-bold">Jogos</h1>
					<p className="text-sm text-muted-foreground">
						{playing ? "Jogo" : "Próximo"} nº {history.length + 1}
					</p>
				</div>
				<button
					onClick={toggleMode}
					disabled={auto}
					title={
						auto
							? "Ligado automático (3 times + 1 jogador)"
							: "Toque para alternar o modo"
					}
				>
					<Badge variant={tooMany ? "warning" : "secondary"}>
						{tooMany ? "Muitos jogadores" : "Modo normal"}
						{auto ? " (auto)" : ""}
					</Badge>
				</button>
			</header>

			{/* field — only while a game is running */}
			{playing && (
				<Card>
					<CardContent className="flex flex-col gap-3 p-4">
						{/* placar */}
						<div className="flex items-center justify-center gap-4">
							<div className="flex flex-1 items-center justify-end gap-1.5 truncate">
								<span className="truncate text-sm font-semibold">
									{colorA.label}
								</span>
								<ColorDot color={colorA} />
							</div>
							<span className="min-w-16 text-center text-3xl font-bold tabular-nums">
								{scoreA} <span className="text-muted-foreground">x</span>{" "}
								{scoreB}
							</span>
							<div className="flex flex-1 items-center gap-1.5 truncate">
								<ColorDot color={colorB} />
								<span className="truncate text-sm font-semibold">
									{colorB.label}
								</span>
							</div>
						</div>

						<TeamView
							color={colorA}
							team={teamA}
							nameOf={nameOf}
							playing={!!playing}
							goalsByPlayer={goalsByPlayer}
							onAddGoal={addGoal}
							onSub={(id) => setSubFor(byId.get(id) ?? null)}
						/>
						<div className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground">
							<span className="h-px flex-1 bg-border" />
							VS
							<span className="h-px flex-1 bg-border" />
						</div>
						<TeamView
							color={colorB}
							team={teamB}
							nameOf={nameOf}
							playing={!!playing}
							goalsByPlayer={goalsByPlayer}
							onAddGoal={addGoal}
							onSub={(id) => setSubFor(byId.get(id) ?? null)}
						/>
					</CardContent>
				</Card>
			)}

			{/* goals / undo */}
			{playing && currentGoals.length > 0 && (
				<section className="flex flex-col gap-1">
					<h2 className="text-sm font-semibold text-muted-foreground">
						Gols ({currentGoals.length})
					</h2>
					{[...currentGoals].reverse().map((g) => (
						<div
							key={g.id}
							className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm"
						>
							<ColorDot color={g.team === "A" ? colorA : colorB} />
							<span className="min-w-0 flex-1 truncate">
								{nameOf(g.playerId)}
							</span>
							<span className="text-xs text-muted-foreground">
								{hhmm(g.at)}
							</span>
							<button
								onClick={() => removeGoal(g.id)}
								className="text-destructive"
								aria-label="Remover gol"
							>
								<X className="size-4" />
							</button>
						</div>
					))}
				</section>
			)}

			{/* controls */}
			{playing ? (
				<div className="flex flex-col gap-2">
					{/* timer */}
					{remaining === null ? (
						<Button
							size="lg"
							variant="secondary"
							onClick={() => {
								unlockAudio();
								startTimer();
							}}
						>
							<Timer /> Iniciar tempo ({mmss(gameDurationMin * 60_000)})
						</Button>
					) : (
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"flex flex-1 items-center justify-center gap-2 rounded-md border py-2 text-3xl font-bold tabular-nums",
									remaining === 0 && "border-destructive text-destructive",
								)}
							>
								<Timer className="size-6" /> {mmss(remaining)}
							</div>
							<Button
								size="icon"
								variant="outline"
								onClick={() => {
									stopAlarm();
									unlockAudio();
									startTimer();
								}}
								aria-label="Reiniciar tempo"
							>
								<RotateCcw />
							</Button>
							<Button
								size="icon"
								variant="outline"
								onClick={() => {
									stopAlarm();
									resetTimer();
								}}
								aria-label="Zerar tempo"
							>
								<X />
							</Button>
						</div>
					)}

					<p className="text-center text-sm text-muted-foreground">
						Quem venceu?
					</p>
					<WinnerOptions
						candidate={candidate}
						colorA={colorA}
						colorB={colorB}
						onPick={(r) => {
							stopAlarm();
							endGame(r);
						}}
					/>
					<Button
						variant="ghost"
						className="text-destructive"
						onClick={() => {
							stopAlarm();
							setConfirmCancel(true);
						}}
					>
						<X /> Cancelar jogo
					</Button>
				</div>
			) : (
				<Button
					size="lg"
					onClick={() => setPicking(true)}
					disabled={candidates.length === 0}
				>
					<Play /> {history.length === 0 ? "Novo jogo" : "Próximo jogo"}
				</Button>
			)}

			{/* next up */}
			<section className="flex flex-col gap-2">
				<h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
					<Users className="size-4" /> Próximos na fila ({nextUp.length})
				</h2>
				{nextUp.length === 0 ? (
					<p className="rounded-lg border border-dashed py-5 text-center text-sm text-muted-foreground">
						Fila vazia.
					</p>
				) : (
					<ul className="flex flex-col gap-1">
						{nextUp.map((id, i) => (
							<li
								key={id}
								className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
							>
								<span className="w-5 text-center font-semibold text-muted-foreground">
									{i + 1}
								</span>
								<span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
								{classOf(id) && <ClassBadge cls={classOf(id)!} />}
							</li>
						))}
					</ul>
				)}
			</section>

			{/* history */}
			{history.length > 0 && (
				<section className="flex flex-col gap-2">
					<h2 className="text-sm font-semibold text-muted-foreground">
						Histórico ({history.length})
					</h2>
					{history.map((g, i) => (
						<HistoryRow
							key={g.id}
							game={g}
							number={history.length - i}
							nameOf={nameOf}
							colorA={colorA}
							colorB={colorB}
							onDelete={() => setToDelete(g)}
						/>
					))}
				</section>
			)}

			<SubstituteSheet
				injured={subFor}
				queue={queue}
				nameOf={nameOf}
				onClose={() => setSubFor(null)}
				onPick={(replacerId) => {
					if (subFor) substitute(subFor.id, replacerId);
					setSubFor(null);
				}}
			/>

			<GamePickerSheet
				open={picking}
				candidates={candidates}
				teamSize={teamSize}
				colorA={colorA}
				colorB={colorB}
				winner={winnerTeam}
				onClose={() => setPicking(false)}
				onConfirm={(aIds, bIds) => {
					startGameTeams(aIds, bIds);
					setPicking(false);
				}}
			/>

			<Sheet
				open={confirmWinner}
				onClose={() => {
					stopAlarm();
					setConfirmWinner(false);
				}}
				title="Tempo esgotado!"
			>
				<p className="mb-3 text-sm text-muted-foreground">
					Placar {scoreA} x {scoreB}. Confirme o vencedor:
				</p>
				<WinnerOptions
					candidate={candidate}
					colorA={colorA}
					colorB={colorB}
					onPick={(r) => {
						stopAlarm();
						endGame(r);
						setConfirmWinner(false);
					}}
				/>
				<Button
					variant="ghost"
					className="mt-2 w-full"
					onClick={() => {
						stopAlarm();
						setConfirmWinner(false);
					}}
				>
					Continuar jogando
				</Button>
			</Sheet>

			<ConfirmSheet
				open={confirmCancel}
				title="Cancelar jogo?"
				description="O jogo atual é descartado e os times voltam para o começo da fila."
				confirmLabel="Sim, cancelar"
				cancelLabel="Voltar"
				onConfirm={cancelGame}
				onClose={() => setConfirmCancel(false)}
			/>
			<ConfirmSheet
				open={!!toDelete}
				title="Excluir este jogo?"
				description="Remove o registro do histórico. Não desfaz as trocas de time."
				onConfirm={() => toDelete && deleteGame(toDelete.id)}
				onClose={() => setToDelete(null)}
			/>
		</div>
	);
}

function SubstituteSheet({
	injured,
	queue,
	nameOf,
	onClose,
	onPick,
}: {
	injured: Player | null;
	queue: string[];
	nameOf: (id: string) => string;
	onClose: () => void;
	onPick: (replacerId: string) => void;
}) {
	return (
		<Sheet
			open={!!injured}
			onClose={onClose}
			title={injured ? `Substituir ${injured.name}` : ""}
		>
			<p className="mb-3 text-sm text-muted-foreground">
				Escolha quem entra. O substituto mantém o lugar na fila.
			</p>
			{queue.length === 0 ? (
				<p className="rounded-lg border border-dashed py-5 text-center text-sm text-muted-foreground">
					Ninguém na fila.
				</p>
			) : (
				<div className="-mx-1 flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto px-1">
					{queue.map((id, i) => (
						<button
							key={id}
							onClick={() => onPick(id)}
							className={cn(
								"flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left",
								i === 0 ? "border-primary bg-accent" : "bg-card",
							)}
						>
							<span className="w-5 text-center text-sm font-semibold text-muted-foreground">
								{i + 1}
							</span>
							<span className="min-w-0 flex-1 truncate font-medium">
								{nameOf(id)}
							</span>
							{i === 0 && (
								<Badge variant="outline" className="text-[10px]">
									próximo
								</Badge>
							)}
						</button>
					))}
				</div>
			)}
		</Sheet>
	);
}

function mmss(ms: number): string {
	const t = Math.max(0, Math.round(ms / 1000));
	const m = Math.floor(t / 60);
	const s = t % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Result buttons with the score leader highlighted and the rest dimmed. */
function WinnerOptions({
	candidate,
	colorA,
	colorB,
	onPick,
}: {
	candidate: GameResult;
	colorA: TeamColor;
	colorB: TeamColor;
	onPick: (r: GameResult) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-2 gap-2">
				<Button
					size="lg"
					style={{ backgroundColor: colorA.hex, color: colorA.fg }}
					className={cn(
						candidate === "A" ? "ring-2 ring-foreground" : "opacity-40",
					)}
					onClick={() => onPick("A")}
				>
					<Trophy /> {colorA.label}
				</Button>
				<Button
					size="lg"
					style={{ backgroundColor: colorB.hex, color: colorB.fg }}
					className={cn(
						candidate === "B" ? "ring-2 ring-foreground" : "opacity-40",
					)}
					onClick={() => onPick("B")}
				>
					<Trophy /> {colorB.label}
				</Button>
			</div>
			<Button
				size="lg"
				variant="outline"
				className={cn(
					candidate === "tie" ? "ring-2 ring-foreground" : "opacity-40",
				)}
				onClick={() => onPick("tie")}
			>
				<Flag /> Empate
			</Button>
		</div>
	);
}

function GamePickerSheet({
	open,
	candidates,
	teamSize,
	colorA,
	colorB,
	winner,
	onClose,
	onConfirm,
}: {
	open: boolean;
	candidates: Player[];
	teamSize: number;
	colorA: TeamColor;
	colorB: TeamColor;
	winner: { side: "A" | "B"; ids: string[] } | null;
	onClose: () => void;
	onConfirm: (aIds: string[], bIds: string[]) => void;
}) {
	const need = teamSize * 2;
	const winnerSet = useMemo(() => new Set(winner?.ids ?? []), [winner]);
	const openSide = winner ? (winner.side === "A" ? "B" : "A") : null;

	// suggested split: keep the winner on its side, draft the challenger on the
	// other; first game / both-left → first teamSize A, next teamSize B
	const suggested = useMemo(() => {
		const map = new Map<string, "A" | "B">();
		if (winner) {
			for (const id of winner.ids) map.set(id, winner.side);
			candidates
				.filter((p) => !winnerSet.has(p.id))
				.slice(0, teamSize)
				.forEach((p) => map.set(p.id, openSide!));
		} else {
			candidates.slice(0, teamSize).forEach((p) => map.set(p.id, "A"));
			candidates.slice(teamSize, need).forEach((p) => map.set(p.id, "B"));
		}
		return map;
	}, [candidates, teamSize, need, winner, winnerSet, openSide]);

	const [assign, setAssign] = useState<Map<string, "A" | "B">>(new Map());

	useEffect(() => {
		if (open) setAssign(new Map(suggested));
	}, [open, suggested]);

	// fully editable — everyone can be moved between sides or out
	const setTeam = (id: string, team: "A" | "B") =>
		setAssign((prev) => {
			const next = new Map(prev);
			if (next.get(id) === team) next.delete(id);
			else next.set(id, team);
			return next;
		});

	const idsFor = (team: "A" | "B") =>
		candidates.filter((p) => assign.get(p.id) === team).map((p) => p.id);
	const aIds = idsFor("A");
	const bIds = idsFor("B");
	const count = aIds.length + bIds.length;

	const SideButton = ({ id, team }: { id: string; team: "A" | "B" }) => {
		const color = team === "A" ? colorA : colorB;
		const active = assign.get(id) === team;
		return (
			<button
				onClick={() => setTeam(id, team)}
				aria-label={color.label}
				className={cn(
					"flex size-9 items-center justify-center rounded-full border-2 transition",
					active ? "border-foreground" : "border-transparent opacity-40",
				)}
				style={{ backgroundColor: color.hex }}
			>
				{active && <Check className="size-4" style={{ color: color.fg }} />}
			</button>
		);
	};

	// staying winner first, then the rest to draft
	const ordered = useMemo(() => {
		if (!winner) return candidates;
		const win = candidates.filter((p) => winnerSet.has(p.id));
		const rest = candidates.filter((p) => !winnerSet.has(p.id));
		return [...win, ...rest];
	}, [candidates, winner, winnerSet]);

	const winnerColor = winner ? (winner.side === "A" ? colorA : colorB) : null;
	// index where the staying group ends, to draw a divider before the challengers
	const dividerAfter = winner ? winnerSet.size - 1 : -1;

	return (
		<Sheet open={open} onClose={onClose} title="Montar jogo">
			<p className="mb-2 text-sm text-muted-foreground">
				{winner
					? `${winnerColor!.label} venceu e fica — pode ajustar se quiser.`
					: "Toque na cor para escolher o time de cada jogador."}
			</p>
			<div className="mb-2 flex items-center gap-3 text-sm font-medium">
				<span className="flex items-center gap-1.5">
					<ColorDot color={colorA} /> {colorA.label} {aIds.length}/{teamSize}
				</span>
				<span className="flex items-center gap-1.5">
					<ColorDot color={colorB} /> {colorB.label} {bIds.length}/{teamSize}
				</span>
			</div>
			<div className="-mx-1 flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto px-1">
				{ordered.map((p, i) => {
					const isWinner = winnerSet.has(p.id);
					const team = assign.get(p.id);
					return (
						<Fragment key={p.id}>
							<div
								className={cn(
									"flex items-center gap-2 rounded-lg border px-3 py-2",
									isWinner && "border-success/60 bg-success/5",
									!isWinner && team && "border-primary bg-accent",
									!isWinner && !team && "bg-card",
								)}
							>
								<span className="min-w-0 flex-1 truncate font-medium">
									{p.name}
								</span>
								{isWinner && (
									<span className="flex items-center gap-1 text-xs font-medium text-success">
										<Trophy className="size-3.5" /> fica
									</span>
								)}
								<SideButton id={p.id} team="A" />
								<SideButton id={p.id} team="B" />
							</div>
							{i === dividerAfter && (
								<div className="flex items-center gap-2 py-0.5">
									<hr className="flex-1 border-t border-dashed" />
									<span className="text-[10px] font-medium uppercase text-muted-foreground">
										desafiantes
									</span>
									<hr className="flex-1 border-t border-dashed" />
								</div>
							)}
						</Fragment>
					);
				})}
			</div>
			<Button
				size="lg"
				className="mt-3 w-full"
				disabled={count === 0}
				onClick={() => onConfirm(aIds, bIds)}
			>
				<Play /> Começar ({count})
			</Button>
		</Sheet>
	);
}

function TeamView({
	color,
	team,
	nameOf,
	playing,
	goalsByPlayer,
	onAddGoal,
	onSub,
}: {
	color: TeamColor;
	team: Team | null;
	nameOf: (id: string) => string;
	playing: boolean;
	goalsByPlayer: Map<string, number>;
	onAddGoal: (id: string) => void;
	onSub: (id: string) => void;
}) {
	const empty = !team || team.players.length === 0;
	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between">
				<span className="flex items-center gap-1.5 text-sm font-semibold">
					<ColorDot color={color} /> {color.label}
				</span>
				{team && team.streak > 0 && (
					<Badge variant="success" className="gap-1">
						<Trophy className="size-3" /> {team.streak} seguida
						{team.streak > 1 ? "s" : ""}
					</Badge>
				)}
				{team && !empty && (
					<span className="text-xs text-muted-foreground">
						em campo {elapsed(team.enteredAt)}
					</span>
				)}
			</div>
			{empty ? (
				<p className="text-sm text-muted-foreground">— vazio —</p>
			) : (
				<ul className="flex flex-col gap-1">
					{team.players.map((id) => {
						const goals = goalsByPlayer.get(id) ?? 0;
						return (
							<li
								key={id}
								className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-sm font-medium"
							>
								<span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
								{goals > 0 && (
									<span className="flex items-center gap-0.5 text-xs text-muted-foreground">
										⚽ {goals}
									</span>
								)}
								{playing && (
									<>
										<button
											onClick={() => onSub(id)}
											className="flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground active:scale-95"
											aria-label={`Substituir ${nameOf(id)}`}
										>
											<ArrowLeftRight className="size-4" />
										</button>
										<button
											onClick={() => onAddGoal(id)}
											className="flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground active:scale-95"
											aria-label={`Gol de ${nameOf(id)}`}
										>
											<Plus className="size-4" />
										</button>
									</>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function HistoryRow({
	game,
	number,
	nameOf,
	colorA,
	colorB,
	onDelete,
}: {
	game: Game;
	number: number;
	nameOf: (id: string) => string;
	colorA: TeamColor;
	colorB: TeamColor;
	onDelete: () => void;
}) {
	const goalsByPlayer = useMemo(() => {
		const m = new Map<string, number>();
		for (const g of game.goals) m.set(g.playerId, (m.get(g.playerId) ?? 0) + 1);
		return m;
	}, [game.goals]);

	return (
		<div className="rounded-lg border bg-card px-3 py-2 text-sm">
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2 font-medium">
					Jogo {number}
					<span className="tabular-nums text-muted-foreground">
						{game.scoreA} x {game.scoreB}
					</span>
					{game.tooMany && (
						<Badge variant="warning" className="text-[10px]">
							muitos
						</Badge>
					)}
				</span>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground">
						{hhmm(game.endedAt)}
					</span>
					<button
						onClick={onDelete}
						className="text-muted-foreground"
						aria-label="Remover jogo"
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</div>
			<div className="mt-2 grid grid-cols-2 gap-2">
				<HistoryTeam
					color={colorA}
					ids={game.teamA}
					score={game.scoreA}
					goalsByPlayer={goalsByPlayer}
					nameOf={nameOf}
					result={
						game.result === "A" ? "win" : game.result === "tie" ? "tie" : "lose"
					}
				/>
				<HistoryTeam
					color={colorB}
					ids={game.teamB}
					score={game.scoreB}
					goalsByPlayer={goalsByPlayer}
					nameOf={nameOf}
					result={
						game.result === "B" ? "win" : game.result === "tie" ? "tie" : "lose"
					}
				/>
			</div>
		</div>
	);
}

function HistoryTeam({
	color,
	ids,
	score,
	goalsByPlayer,
	nameOf,
	result,
}: {
	color: TeamColor;
	ids: string[];
	score: number;
	goalsByPlayer: Map<string, number>;
	nameOf: (id: string) => string;
	result: "win" | "lose" | "tie";
}) {
	return (
		<div className="rounded-md border bg-background p-2">
			<div className="mb-1.5 flex items-center gap-1.5">
				<ColorDot color={color} />
				<span className="truncate text-xs font-semibold">{color.label}</span>
				<span className="text-xs font-bold tabular-nums">{score}</span>
				{result === "win" && (
					<Badge variant="success" className="ml-auto text-[10px]">
						venceu
					</Badge>
				)}
				{result === "tie" && (
					<Badge variant="secondary" className="ml-auto text-[10px]">
						empate
					</Badge>
				)}
			</div>
			<ul className="flex flex-col gap-0.5">
				{ids.map((id) => {
					const goals = goalsByPlayer.get(id) ?? 0;
					return (
						<li
							key={id}
							className="flex items-center gap-1 truncate text-xs text-muted-foreground"
						>
							<span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
							{goals > 0 && <span className="shrink-0">⚽{goals}</span>}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
