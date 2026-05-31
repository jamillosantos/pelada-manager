import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { UserX, Volleyball } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import {
	ClassBadge,
	DisableSheet,
	Empty,
	PlayerSheet,
	SectionTitle,
	SortableRow,
} from "@/components/player-bits";
import { Badge } from "@/components/ui/badge";
import { ColorDot } from "@/components/ui/color-dot";
import { type TeamColor, getColor } from "@/lib/colors";
import { hhmm } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Player } from "@/lib/types";

export default function Queue() {
	const players = useStore((s) => s.players);
	const queue = useStore((s) => s.queue);
	const started = useStore((s) => s.started);
	const teamSize = useStore((s) => s.teamSize);
	const setQueue = useStore((s) => s.setQueue);
	const teamA = useStore((s) => s.teamA);
	const teamB = useStore((s) => s.teamB);
	const colorA = useStore((s) => getColor(s.teamAColor));
	const colorB = useStore((s) => getColor(s.teamBColor));

	const [disabling, setDisabling] = useState<Player | null>(null);
	const [editing, setEditing] = useState<Player | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { delay: 120, tolerance: 6 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const byId = useMemo(
		() => new Map(players.map((p) => [p.id, p] as const)),
		[players],
	);
	const waiting = queue
		.map((id) => byId.get(id))
		.filter((p): p is Player => !!p);
	const onField = players.filter((p) => !p.disabled && !queue.includes(p.id));
	// players pulled from the head for the next game: one team if the field is
	// already set (winner stays, loser replaced), two teams if it's empty
	const fieldSet =
		(teamA?.players.length ?? 0) > 0 || (teamB?.players.length ?? 0) > 0;
	const intake = fieldSet ? teamSize : teamSize * 2;

	const teamColorOf = (id: string): TeamColor | undefined => {
		if (teamA?.players.includes(id)) return colorA;
		if (teamB?.players.includes(id)) return colorB;
		return undefined;
	};

	return (
		<div className="flex flex-col gap-4 p-4">
			<header className="pt-2">
				<h1 className="text-2xl font-bold">Fila</h1>
				<p className="text-sm text-muted-foreground">
					{started
						? "Prioridade para o próximo jogo · arraste para mudar"
						: "Mensalistas primeiro, depois convidados · arraste para mudar"}
				</p>
			</header>

			<section className="flex flex-col gap-2">
				<SectionTitle>
					Aguardando <Badge variant="secondary">{waiting.length}</Badge>
				</SectionTitle>
				{waiting.length + onField.length === 0 && (
					<Empty>Sem jogadores. Adicione na aba Jogadores.</Empty>
				)}
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={(e: DragEndEvent) => {
						const { active, over } = e;
						if (!over || active.id === over.id) return;
						const ids = waiting.map((p) => p.id);
						const from = ids.indexOf(String(active.id));
						const to = ids.indexOf(String(over.id));
						if (from < 0 || to < 0) return;
						setQueue(arrayMove(ids, from, to));
					}}
				>
					<SortableContext
						items={waiting.map((p) => p.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="flex flex-col gap-2">
							{waiting.map((p, i) => (
								<Fragment key={p.id}>
									{i === intake && (
									<div className="flex items-center gap-2 py-0.5">
										<hr className="flex-1 border-t border-dashed" />
										<span className="text-[10px] font-medium text-muted-foreground uppercase">
											entram no próximo jogo ↑
										</span>
										<hr className="flex-1 border-t border-dashed" />
									</div>
								)}
									<SortableRow id={p.id}>
										<span className="w-5 text-center text-sm font-semibold text-muted-foreground">
											{i + 1}
										</span>
										<div className="flex min-w-0 flex-1 flex-col">
											<span
												className="truncate font-medium"
												onDoubleClick={() => setEditing(p)}
												title="Toque 2x para editar"
											>
												{p.name}
											</span>
											<span className="text-xs text-muted-foreground">
												chegou {hhmm(p.arrivedAt)}
											</span>
										</div>
										<ClassBadge cls={p.class} />
										<button
											onClick={() => setDisabling(p)}
											className="px-1.5 text-destructive"
											aria-label="Remover"
										>
											<UserX className="size-5" />
										</button>
									</SortableRow>
								</Fragment>
							))}
						</div>
					</SortableContext>
				</DndContext>

				{onField.map((p, i) => {
					const color = teamColorOf(p.id);
					return (
						<div
							key={p.id}
							className="flex items-center gap-1 rounded-lg border border-primary/40 bg-accent px-2 py-2"
						>
							<span className="flex w-9 justify-center px-2 py-1 text-muted-foreground">
								<Volleyball className="size-5" />
							</span>
							<span className="w-5 text-center text-sm font-semibold text-muted-foreground">
								{waiting.length + i + 1}
							</span>
							<div className="flex min-w-0 flex-1 flex-col">
								<span
									className="flex items-center gap-1.5 truncate font-medium"
									onDoubleClick={() => setEditing(p)}
								>
									{color && <ColorDot color={color} />}
									{p.name}
								</span>
								<span className="text-xs text-muted-foreground">
									chegou {hhmm(p.arrivedAt)}
								</span>
							</div>
							<Badge variant="outline" className="mr-1">
								em campo
							</Badge>
							<button
								onClick={() => setDisabling(p)}
								className="px-1.5 text-destructive"
								aria-label="Remover"
							>
								<UserX className="size-5" />
							</button>
						</div>
					);
				})}
			</section>

			<DisableSheet player={disabling} onClose={() => setDisabling(null)} />
			<PlayerSheet
				open={!!editing}
				player={editing}
				onClose={() => setEditing(null)}
			/>
		</div>
	);
}
