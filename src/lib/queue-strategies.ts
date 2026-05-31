import type { Player, PlayerClass } from "./types";

/**
 * A queue strategy decides priority order in two moments:
 *
 * - `seed`: the order before the first game (and re-seeded whenever the roster
 *   changes while no game has started yet).
 * - `orderGroup`: how to order a batch of players that enter the queue at the
 *   *same instant* (e.g. a whole team leaving the field) — i.e. the tie-break
 *   among players who have waited the same amount of time. Players entering at
 *   different times keep their relative order from the live FIFO queue, so the
 *   "waited longest = highest priority" rule always holds across batches.
 *
 * New strategies just get added to the registry below and become selectable in
 * the settings.
 */
export interface QueueStrategy {
	id: string;
	label: string;
	description: string;
	/** priority order (player ids) of the enabled players, before the 1st game */
	seed: (players: Player[]) => string[];
	/** order a set of players entering the queue at the same time */
	orderGroup: (ids: string[], players: Player[]) => string[];
}

const classRank = (c: PlayerClass) => (c === "mensalista" ? 0 : 1);

/** mensalistas first, then convidados, each in arrival (players array) order */
function byClassThenArrival(players: Player[]): string[] {
	return players
		.filter((p) => !p.disabled)
		.slice()
		.sort((a, b) => classRank(a.class) - classRank(b.class))
		.map((p) => p.id);
}

const arrival: QueueStrategy = {
	id: "arrival",
	label: "Ordem de chegada",
	description:
		"Mensalistas primeiro, depois convidados, cada grupo pela ordem de chegada. Durante o dia vale só o tempo de espera.",
	seed: byClassThenArrival,
	// pure waiting time: a leaving group keeps its order, no class re-priority
	orderGroup: (ids) => ids,
};

const mensalistasPriority: QueueStrategy = {
	id: "mensalistas-priority",
	label: "Mensalistas com prioridade",
	description:
		"Quem está fora há mais tempo joga primeiro. No empate de espera, mensalistas na frente; depois a ordem de chegada.",
	seed: byClassThenArrival,
	// same-wait tie-break: mensalistas first, then arrival order
	orderGroup: (ids, players) => {
		const arrivalIdx = new Map(players.map((p, i) => [p.id, i] as const));
		const cls = new Map(players.map((p) => [p.id, p.class] as const));
		const rank = (id: string) =>
			classRank(cls.get(id) ?? "convidado");
		return ids
			.slice()
			.sort(
				(a, b) =>
					rank(a) - rank(b) ||
					(arrivalIdx.get(a) ?? 0) - (arrivalIdx.get(b) ?? 0),
			);
	},
};

export const QUEUE_STRATEGIES: QueueStrategy[] = [arrival, mensalistasPriority];

export const DEFAULT_QUEUE_STRATEGY = arrival.id;

export function getQueueStrategy(id: string): QueueStrategy {
	return QUEUE_STRATEGIES.find((s) => s.id === id) ?? arrival;
}
