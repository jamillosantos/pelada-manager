export type PlayerClass = "mensalista" | "convidado";

export const DISABLE_REASONS = [
	"Foi embora",
	"Machucado",
	"Pausa / Descanso",
] as const;

export type DisableReason = (typeof DISABLE_REASONS)[number];

export interface Player {
	id: string;
	name: string;
	class: PlayerClass;
	/** epoch ms, stamped on creation — informational tie-breaker */
	arrivedAt: number;
	disabled: boolean;
	disableReason?: DisableReason;
}

export interface Team {
	/** player ids */
	players: string[];
	/** epoch ms the team took the field — lower = more time on field */
	enteredAt: number;
	/** consecutive wins while staying on the field */
	streak: number;
}

export type GameResult = "A" | "B" | "tie";

export interface Goal {
	id: string;
	/** who scored */
	playerId: string;
	/** team they scored for */
	team: "A" | "B";
	at: number;
}

export interface Game {
	id: string;
	teamA: string[];
	teamB: string[];
	startedAt: number;
	endedAt: number;
	result: GameResult;
	/** mode at the moment the game ended */
	tooMany: boolean;
	scoreA: number;
	scoreB: number;
	goals: Goal[];
}

export interface GameDayState {
	name: string;
	teamSize: number;
	/** color id (see TEAM_COLORS) used to label each side */
	teamAColor: string;
	teamBColor: string;
	/** id of the queue strategy (see queue-strategies.ts) */
	queueStrategy: string;
	/** game length in minutes for the countdown */
	gameDurationMin: number;
	/** epoch ms when the running countdown ends; null = not running */
	timerEndsAt: number | null;
	/** waiting-outside count above which "muitos jogadores" mode turns on */
	tooManyThreshold: number;
	/** manual override: force "muitos jogadores" even below the auto threshold */
	manualTooMany: boolean;
	players: Player[];
	/** live waiting line — player ids in priority order */
	queue: string[];
	teamA: Team | null;
	teamB: Team | null;
	/** the match currently being played (teams are on the field) */
	currentGameStartedAt: number | null;
	/** goals scored in the match currently being played */
	currentGoals: Goal[];
	/**
	 * temporary substitutes in the current match: a queue player covering for an
	 * injured one. They keep their queue spot — when the match ends they return
	 * to the queue at `queueIndex` instead of going to the back.
	 */
	subs: { playerId: string; queueIndex: number }[];
	/** first game of the day already started (switches queue from class-order to FIFO) */
	started: boolean;
	history: Game[];
}
