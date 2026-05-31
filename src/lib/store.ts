import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	DEFAULT_QUEUE_STRATEGY,
	getQueueStrategy,
} from "./queue-strategies";
import type {
	DisableReason,
	Game,
	GameDayState,
	GameResult,
	Goal,
	Player,
	PlayerClass,
	Team,
} from "./types";

const uid = () =>
	typeof crypto !== "undefined" && crypto.randomUUID
		? crypto.randomUUID()
		: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

interface Actions {
	// players
	addPlayer: (name: string, cls: PlayerClass) => void;
	renamePlayer: (id: string, name: string) => void;
	setPlayerClass: (id: string, cls: PlayerClass) => void;
	disablePlayer: (id: string, reason: DisableReason) => void;
	enablePlayer: (id: string) => void;
	deletePlayer: (id: string) => void;
	/** set the arrival order of the roster (Jogadores screen drag) */
	setPlayerOrder: (orderedIds: string[]) => void;
	// queue
	moveQueue: (id: string, dir: -1 | 1) => void;
	setQueue: (ids: string[]) => void;
	// games
	startGame: () => void;
	/** start a game with players explicitly assigned to each team */
	startGameTeams: (aIds: string[], bIds: string[]) => void;
	endGame: (result: GameResult) => void;
	/** record a goal for the player (team inferred from the field) */
	addGoal: (playerId: string) => void;
	/** undo a goal in the current match */
	removeGoal: (goalId: string) => void;
	/** swap an injured player for a replacer (replacer keeps their queue spot) */
	substitute: (injuredId: string, replacerId: string) => void;
	/** discard the match in progress; teams go back to the front of the queue */
	cancelGame: () => void;
	/** remove a finished game from the history */
	deleteGame: (id: string) => void;
	// config
	setName: (name: string) => void;
	setTeamSize: (n: number) => void;
	setQueueStrategy: (id: string) => void;
	setTeamColor: (team: "A" | "B", colorId: string) => void;
	setGameDuration: (min: number) => void;
	/** start/restart the countdown from the full configured duration */
	startTimer: () => void;
	/** stop and clear the countdown */
	resetTimer: () => void;
	/** flip the manual crowded-mode override (ignored while auto-forced on) */
	toggleMode: () => void;
	/** clear games + field, keep the players */
	resetGames: () => void;
	resetDay: () => void;
}

export type Store = GameDayState & Actions;

const initial = (): GameDayState => ({
	name: "Pelada",
	teamSize: 6,
	teamAColor: "blue",
	teamBColor: "yellow",
	queueStrategy: DEFAULT_QUEUE_STRATEGY,
	gameDurationMin: 10,
	timerEndsAt: null,
	// crowded mode turns on automatically with 3 full teams + 1 player
	tooManyThreshold: 18,
	manualTooMany: false,
	players: [],
	queue: [],
	teamA: null,
	teamB: null,
	currentGameStartedAt: null,
	currentGoals: [],
	subs: [],
	started: false,
	history: [],
});

/** Ids currently on the field (so they are never double-counted in the queue). */
function onField(s: GameDayState): Set<string> {
	return new Set([...(s.teamA?.players ?? []), ...(s.teamB?.players ?? [])]);
}

/**
 * Before the first game, the queue mirrors the arrival order and is rebuilt on
 * every roster change. After the first game it is a live FIFO line, so we only
 * prune ids that no longer belong (disabled / removed / on field) and append new
 * enabled players to the tail.
 */
function syncQueue(s: GameDayState): string[] {
	if (!s.started) return getQueueStrategy(s.queueStrategy).seed(s.players);
	const valid = new Set(
		s.players.filter((p) => !p.disabled).map((p) => p.id),
	);
	const field = onField(s);
	const kept = s.queue.filter((id) => valid.has(id) && !field.has(id));
	const known = new Set(kept);
	const appended = s.players
		.filter((p) => !p.disabled && !known.has(p.id) && !field.has(p.id))
		.map((p) => p.id);
	return [...kept, ...appended];
}

export const useStore = create<Store>()(
	persist(
		(set) => ({
			...initial(),

			addPlayer: (name, cls) =>
				set((s) => {
					const trimmed = name.trim();
					if (!trimmed) return s;
					const player: Player = {
						id: uid(),
						name: trimmed,
						class: cls,
						arrivedAt: Date.now(),
						disabled: false,
					};
					const players = [...s.players, player];
					return { players, queue: syncQueue({ ...s, players }) };
				}),

			renamePlayer: (id, name) =>
				set((s) => ({
					players: s.players.map((p) =>
						p.id === id ? { ...p, name: name.trim() || p.name } : p,
					),
				})),

			setPlayerClass: (id, cls) =>
				set((s) => {
					const players = s.players.map((p) =>
						p.id === id ? { ...p, class: cls } : p,
					);
					return { players, queue: syncQueue({ ...s, players }) };
				}),

			disablePlayer: (id, reason) =>
				set((s) => {
					const players = s.players.map((p) =>
						p.id === id ? { ...p, disabled: true, disableReason: reason } : p,
					);
					return {
						players,
						queue: syncQueue({ ...s, players }),
					};
				}),

			enablePlayer: (id) =>
				set((s) => {
					const players = s.players.map((p) =>
						p.id === id
							? { ...p, disabled: false, disableReason: undefined }
							: p,
					);
					return { players, queue: syncQueue({ ...s, players }) };
				}),

			deletePlayer: (id) =>
				set((s) => {
					const players = s.players.filter((p) => p.id !== id);
					const strip = (t: Team | null): Team | null =>
						t ? { ...t, players: t.players.filter((p) => p !== id) } : t;
					const next = {
						...s,
						players,
						teamA: strip(s.teamA),
						teamB: strip(s.teamB),
					};
					return {
						players,
						teamA: next.teamA,
						teamB: next.teamB,
						queue: syncQueue(next),
					};
				}),

			setPlayerOrder: (orderedIds) =>
				set((s) => {
					// reorder only the listed players (the reordered subset); everyone
					// else (e.g. disabled) stays in their current slot
					const byId = new Map(s.players.map((p) => [p.id, p] as const));
					const seq = orderedIds.filter((id) => byId.has(id));
					const inSet = new Set(seq);
					let k = 0;
					const players = s.players.map((p) =>
						inSet.has(p.id) ? byId.get(seq[k++])! : p,
					);
					return { players, queue: syncQueue({ ...s, players }) };
				}),

			moveQueue: (id, dir) =>
				set((s) => {
					const q = s.queue.slice();
					const i = q.indexOf(id);
					const j = i + dir;
					if (i < 0 || j < 0 || j >= q.length) return s;
					[q[i], q[j]] = [q[j], q[i]];
					return { queue: q };
				}),

			setQueue: (ids) =>
				set((s) => {
					// keep only ids that genuinely belong to the live queue, then
					// append anything we somehow missed so nobody silently disappears.
					const allowed = new Set(s.queue);
					const ordered = ids.filter((id) => allowed.has(id));
					const seen = new Set(ordered);
					const rest = s.queue.filter((id) => !seen.has(id));
					return { queue: [...ordered, ...rest] };
				}),

			startGame: () =>
				set((s) => {
					if (s.currentGameStartedAt) return s; // already playing
					const size = s.teamSize;
					let queue = syncQueue(s);
					let teamA = s.teamA;
					let teamB = s.teamB;
					const now = Date.now();

					// Fill any empty side from the head of the queue.
					if (!teamA || teamA.players.length === 0) {
						const picked = queue.slice(0, size);
						queue = queue.slice(picked.length);
						teamA = { players: picked, enteredAt: now, streak: 0 };
					}
					if (!teamB || teamB.players.length === 0) {
						const picked = queue.slice(0, size);
						queue = queue.slice(picked.length);
						teamB = { players: picked, enteredAt: now, streak: 0 };
					}

					if (teamA.players.length === 0 && teamB.players.length === 0) {
						return s; // nobody to play
					}

					return {
						started: true,
						queue,
						teamA,
						teamB,
						currentGameStartedAt: now,
						currentGoals: [],
						timerEndsAt: null,
						subs: [],
					};
				}),

			startGameTeams: (aIds, bIds) =>
				set((s) => {
					if (s.currentGameStartedAt) return s; // already playing
					const valid = new Set(
						s.players.filter((p) => !p.disabled).map((p) => p.id),
					);
					const filterValid = (ids: string[]) => ids.filter((id) => valid.has(id));
					const aRoster = filterValid(aIds);
					const bRoster = filterValid(bIds);
					if (aRoster.length === 0 && bRoster.length === 0) return s;
					const now = Date.now();

					// keep a team's streak/time when its exact roster is unchanged, so
					// confirming the suggested teams preserves the winner-stays logic
					const sameRoster = (a: string[], b: string[]) =>
						a.length === b.length && a.every((id) => b.includes(id));
					const inherit = (roster: string[]): Team => {
						for (const prev of [s.teamA, s.teamB]) {
							if (prev && prev.players.length && sameRoster(roster, prev.players)) {
								return { players: roster, enteredAt: prev.enteredAt, streak: prev.streak };
							}
						}
						return { players: roster, enteredAt: now, streak: 0 };
					};

					const teamA = inherit(aRoster);
					const teamB = inherit(bRoster);

					// everyone not picked waits: players left on the field go to the
					// front, then the existing queue — minus whoever is now playing
					const picked = new Set([...aRoster, ...bRoster]);
					const leftField = [
						...(s.teamA?.players ?? []),
						...(s.teamB?.players ?? []),
					].filter((id) => valid.has(id) && !picked.has(id));
					const rest = s.queue.filter((id) => !picked.has(id));
					const seen = new Set<string>();
					const queue = [...leftField, ...rest].filter(
						(id) => !seen.has(id) && seen.add(id),
					);

					return {
						started: true,
						queue,
						teamA,
						teamB,
						currentGameStartedAt: now,
						currentGoals: [],
						timerEndsAt: null,
						subs: [],
					};
				}),

			addGoal: (playerId) =>
				set((s) => {
					if (!s.currentGameStartedAt) return s;
					const team = s.teamA?.players.includes(playerId)
						? "A"
						: s.teamB?.players.includes(playerId)
							? "B"
							: null;
					if (!team) return s;
					const goal: Goal = { id: uid(), playerId, team, at: Date.now() };
					return { currentGoals: [...s.currentGoals, goal] };
				}),

			removeGoal: (goalId) =>
				set((s) => ({
					currentGoals: s.currentGoals.filter((g) => g.id !== goalId),
				})),

			substitute: (injuredId, replacerId) =>
				set((s) => {
					if (!s.currentGameStartedAt || injuredId === replacerId) return s;
					const onA = s.teamA?.players.includes(injuredId) ?? false;
					const onB = s.teamB?.players.includes(injuredId) ?? false;
					if (!onA && !onB) return s;
					const replacer = s.players.find(
						(p) => p.id === replacerId && !p.disabled,
					);
					if (!replacer) return s;

					// injured leaves the day (Machucado); may be re-enabled if they return
					const players = s.players.map((p) =>
						p.id === injuredId
							? { ...p, disabled: true, disableReason: "Machucado" as const }
							: p,
					);
					const swap = (t: Team | null): Team | null =>
						t
							? {
									...t,
									players: t.players.map((id) =>
										id === injuredId ? replacerId : id,
									),
								}
							: t;

					// remember the replacer's queue place, then pull them onto the field
					const queueIndex = Math.max(0, s.queue.indexOf(replacerId));
					return {
						players,
						teamA: onA ? swap(s.teamA) : s.teamA,
						teamB: onB ? swap(s.teamB) : s.teamB,
						queue: s.queue.filter((id) => id !== replacerId),
						subs: [
							...s.subs.filter((x) => x.playerId !== replacerId),
							{ playerId: replacerId, queueIndex },
						],
					};
				}),

			endGame: (result) =>
				set((s) => {
					if (!s.currentGameStartedAt || !s.teamA || !s.teamB) return s;
					const size = s.teamSize;
					const now = Date.now();
					const tooMany = isTooMany(s);

					const scoreA = s.currentGoals.filter((g) => g.team === "A").length;
					const scoreB = s.currentGoals.filter((g) => g.team === "B").length;
					const game: Game = {
						id: uid(),
						teamA: s.teamA.players,
						teamB: s.teamB.players,
						startedAt: s.currentGameStartedAt,
						endedAt: now,
						result,
						tooMany,
						scoreA,
						scoreB,
						goals: s.currentGoals,
					};

					let queue = s.queue.slice();
					let teamA: Team | null = s.teamA;
					let teamB: Team | null = s.teamB;

					const take = (n: number): string[] => {
						const picked = queue.slice(0, n);
						queue = queue.slice(picked.length);
						return picked;
					};
					const fresh = (): Team => ({
						players: take(size),
						enteredAt: now,
						streak: 0,
					});
					// players leaving the field now — they all share the same waiting
					// time, so the strategy's orderGroup decides their order in the queue
					let leaving: string[] = [];

					const winner: "A" | "B" | null =
						result === "A" ? "A" : result === "B" ? "B" : null;

					if (result === "tie") {
						if (tooMany) {
							// Both teams lose and leave; refill both from the head.
							leaving = [...teamA.players, ...teamB.players];
							teamA = fresh();
							teamB = fresh();
						} else {
							// Team with less time on field (entered later) stays.
							const aStays = teamA.enteredAt >= teamB.enteredAt;
							const stay = aStays ? teamA : teamB;
							const leave = aStays ? teamB : teamA;
							leaving = [...leave.players];
							const replacement = fresh();
							teamA = aStays ? stay : replacement;
							teamB = aStays ? replacement : stay;
						}
					} else {
						const win = winner === "A" ? teamA : teamB;
						const lose = winner === "A" ? teamB : teamA;
						win.streak += 1;

						if (tooMany && win.streak >= 2) {
							// Win 2 in a row in crowded mode: both leave for newcomers.
							leaving = [...win.players, ...lose.players];
							teamA = fresh();
							teamB = fresh();
						} else {
							// Winner stays, loser leaves and is replaced from the head.
							leaving = [...lose.players];
							const replacement = fresh();
							if (winner === "A") {
								teamA = win;
								teamB = replacement;
							} else {
								teamA = replacement;
								teamB = win;
							}
						}
					}

					// append the leaving players (ordered by the active strategy) to the
					// back of the queue, after the refills were pulled from the head
					queue.push(
						...getQueueStrategy(s.queueStrategy).orderGroup(leaving, s.players),
					);

					// substitutes don't lose their place: pull them off the field and
					// back into the queue at the spot they held before subbing in
					for (const sub of s.subs) {
						queue = queue.filter((id) => id !== sub.playerId);
						const strip = (t: Team | null): Team | null =>
							t
								? { ...t, players: t.players.filter((id) => id !== sub.playerId) }
								: t;
						teamA = strip(teamA);
						teamB = strip(teamB);
						queue.splice(Math.min(sub.queueIndex, queue.length), 0, sub.playerId);
					}

					return {
						history: [game, ...s.history],
						queue,
						teamA,
						teamB,
						currentGameStartedAt: null,
						currentGoals: [],
						timerEndsAt: null,
						subs: [],
					};
				}),

			cancelGame: () =>
				set((s) => {
					if (!s.currentGameStartedAt) return s;
					// return both teams to the front of the queue, preserving order
					const back = [
						...(s.teamA?.players ?? []),
						...(s.teamB?.players ?? []),
					];
					let queue = [...back, ...s.queue];
					// keep substitutes at their original queue place
					for (const sub of s.subs) {
						queue = queue.filter((id) => id !== sub.playerId);
						queue.splice(Math.min(sub.queueIndex, queue.length), 0, sub.playerId);
					}
					// if this was the very first game, re-seed by arrival order next time
					const started = s.history.length > 0;
					return {
						queue,
						teamA: null,
						teamB: null,
						currentGameStartedAt: null,
						currentGoals: [],
						timerEndsAt: null,
						subs: [],
						started,
					};
				}),

			deleteGame: (id) =>
				set((s) => ({ history: s.history.filter((g) => g.id !== id) })),

			setQueueStrategy: (id) =>
				set((s) => {
					const next = { ...s, queueStrategy: id };
					return { queueStrategy: id, queue: syncQueue(next) };
				}),

			setName: (name) => set({ name }),

			setTeamColor: (team, colorId) =>
				set(team === "A" ? { teamAColor: colorId } : { teamBColor: colorId }),

			setGameDuration: (min) =>
				set(() => {
					// allow fractional minutes (e.g. 0.1 = 6s) for testing the timer
					const v = Math.round((Number(min) || 0) * 10) / 10;
					return { gameDurationMin: Math.max(0.1, Math.min(90, v)) };
				}),

			startTimer: () =>
				set((s) => ({ timerEndsAt: Date.now() + s.gameDurationMin * 60_000 })),

			resetTimer: () => set({ timerEndsAt: null }),

			toggleMode: () => set((s) => ({ manualTooMany: !s.manualTooMany })),

			setTeamSize: (n) =>
				set((s) => {
					const teamSize = Math.max(1, Math.min(11, Math.round(n) || 1));
					// keep "3 teams + 1 person" semantics as team size changes
					const tooManyThreshold = teamSize * 3;
					return {
						teamSize,
						tooManyThreshold,
						queue: syncQueue({ ...s, teamSize }),
					};
				}),

			resetGames: () =>
				set((s) => {
					const next: GameDayState = {
						...s,
						history: [],
						teamA: null,
						teamB: null,
						currentGameStartedAt: null,
						currentGoals: [],
						timerEndsAt: null,
						subs: [],
						started: false,
					};
					return {
						history: [],
						teamA: null,
						teamB: null,
						currentGameStartedAt: null,
						currentGoals: [],
						timerEndsAt: null,
						subs: [],
						started: false,
						queue: syncQueue(next),
					};
				}),

			resetDay: () => set(() => initial()),
		}),
		{
			name: "pelada-gameday-v1",
			version: 7,
			// backfill fields added after a save
			migrate: (state) => {
				const s = state as Partial<GameDayState> | undefined;
				if (s && typeof s === "object") {
					s.tooManyThreshold = (s.teamSize ?? 6) * 3;
					s.teamAColor ??= "blue";
					s.teamBColor ??= "yellow";
					s.manualTooMany ??= false;
					s.queueStrategy ??= DEFAULT_QUEUE_STRATEGY;
					s.gameDurationMin ??= 10;
					s.timerEndsAt ??= null;
					s.currentGoals ??= [];
					s.subs ??= [];
					s.history = (s.history ?? []).map((g) => ({
						...g,
						scoreA: g.scoreA ?? 0,
						scoreB: g.scoreB ?? 0,
						goals: g.goals ?? [],
					}));
				}
				return s as GameDayState;
			},
		},
	),
);

/** Players needed for the crowded mode to auto-enable: 3 full teams + 1. */
export function tooManyThreshold(s: GameDayState): number {
	return s.teamSize * 3 + 1;
}

/** Auto rule: enough enabled players to make 3 teams + 1. */
export function autoTooMany(s: GameDayState): boolean {
	const enabled = s.players.filter((p) => !p.disabled).length;
	return enabled >= tooManyThreshold(s);
}

/** Effective crowded ("muitos jogadores") mode: auto rule OR manual override. */
export function isTooMany(s: GameDayState): boolean {
	return autoTooMany(s) || s.manualTooMany;
}
