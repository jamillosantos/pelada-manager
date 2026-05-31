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
import { Plus, RotateCcw, Share2, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ClassBadge,
	DisableSheet,
	Empty,
	PlayerSheet,
	SectionTitle,
	SortableRow,
} from "@/components/player-bits";
import { hhmm } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Player } from "@/lib/types";

export default function Players() {
	const players = useStore((s) => s.players);
	const dayName = useStore((s) => s.name);
	const setPlayerOrder = useStore((s) => s.setPlayerOrder);
	const enablePlayer = useStore((s) => s.enablePlayer);

	const [disabling, setDisabling] = useState<Player | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Player | null>(null);

	const openAdd = () => {
		setEditing(null);
		setFormOpen(true);
	};
	const openEdit = (p: Player) => {
		setEditing(p);
		setFormOpen(true);
	};

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { delay: 120, tolerance: 6 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// roster in arrival order = the order of the players array
	const active = useMemo(() => players.filter((p) => !p.disabled), [players]);
	const disabled = players.filter((p) => p.disabled);

	const shareWhatsApp = () => {
		const list = (cls: "mensalista" | "convidado") =>
			active
				.filter((p) => p.class === cls)
				.map((p, i) => `${i + 1}. ${p.name}`)
				.join("\n") || "—";
		const text =
			`*${dayName}*\n\n` +
			`*Mensalistas*\n${list("mensalista")}\n\n` +
			`*Convidados*\n${list("convidado")}`;
		window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
	};

	return (
		<div className="flex flex-col gap-4 p-4">
			<header className="flex items-start justify-between gap-2 pt-2">
				<div>
					<h1 className="text-2xl font-bold">Jogadores</h1>
					<p className="text-sm text-muted-foreground">
						Ordem de chegada · arraste para corrigir
					</p>
				</div>
				<Button
					size="icon"
					variant="outline"
					onClick={shareWhatsApp}
					disabled={active.length === 0}
					aria-label="Compartilhar no WhatsApp"
				>
					<Share2 />
				</Button>
			</header>

			<Button size="lg" onClick={openAdd}>
				<Plus /> Adicionar jogador
			</Button>

			<section className="flex flex-col gap-2">
				<SectionTitle>
					Lista <Badge variant="secondary">{active.length}</Badge>
				</SectionTitle>
				{active.length === 0 && <Empty>Nenhum jogador. Adicione acima.</Empty>}
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={(e: DragEndEvent) => {
						const { active: a, over } = e;
						if (!over || a.id === over.id) return;
						const ids = active.map((p) => p.id);
						const from = ids.indexOf(String(a.id));
						const to = ids.indexOf(String(over.id));
						if (from < 0 || to < 0) return;
						setPlayerOrder(arrayMove(ids, from, to));
					}}
				>
					<SortableContext
						items={active.map((p) => p.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="flex flex-col gap-2">
							{active.map((p, i) => (
								<SortableRow key={p.id} id={p.id}>
									<span className="w-5 text-center text-sm font-semibold text-muted-foreground">
										{i + 1}
									</span>
									<div className="flex min-w-0 flex-1 flex-col">
										<span
											className="truncate font-medium"
											onDoubleClick={() => openEdit(p)}
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
							))}
						</div>
					</SortableContext>
				</DndContext>
			</section>

			{disabled.length > 0 && (
				<section className="flex flex-col gap-2">
					<SectionTitle>Fora ({disabled.length})</SectionTitle>
					{disabled.map((p) => (
						<div
							key={p.id}
							className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
						>
							<div className="flex flex-col">
								<span
									className="font-medium text-muted-foreground line-through"
									onDoubleClick={() => openEdit(p)}
								>
									{p.name}
								</span>
								<span className="text-xs text-destructive">
									{p.disableReason}
								</span>
							</div>
							<Button
								size="sm"
								variant="outline"
								onClick={() => enablePlayer(p.id)}
							>
								<RotateCcw className="size-4" /> Voltar
							</Button>
						</div>
					))}
				</section>
			)}

			<DisableSheet player={disabling} onClose={() => setDisabling(null)} />
			<PlayerSheet
				open={formOpen}
				player={editing}
				onClose={() => setFormOpen(false)}
			/>
		</div>
	);
}
