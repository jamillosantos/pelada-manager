import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import {
	DISABLE_REASONS,
	type DisableReason,
	type Player,
	type PlayerClass,
} from "@/lib/types";
import { cn } from "@/utils/cn";

export function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
			{children}
		</h2>
	);
}

export function Empty({ children }: { children: React.ReactNode }) {
	return (
		<p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
			{children}
		</p>
	);
}

/** Draggable row shell with a grip handle; pass the row content as children. */
export function SortableRow({
	id,
	children,
	className,
}: {
	id: string;
	children: React.ReactNode;
	className?: string;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"flex items-center gap-1 rounded-lg border bg-card px-2 py-2",
				isDragging && "z-10 opacity-80 shadow-lg",
				className,
			)}
		>
			<button
				className="cursor-grab touch-none px-2 py-1 text-muted-foreground active:cursor-grabbing"
				aria-label="Arrastar"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-5" />
			</button>
			{children}
		</div>
	);
}

export function ClassBadge({ cls }: { cls: PlayerClass }) {
	return (
		<Badge variant={cls === "mensalista" ? "default" : "secondary"}>
			{cls === "mensalista" ? "Mensal" : "Convid"}
		</Badge>
	);
}

export function ClassToggle({
	value,
	onChange,
}: {
	value: PlayerClass;
	onChange: (c: PlayerClass) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
			{(["mensalista", "convidado"] as const).map((c) => (
				<button
					key={c}
					onClick={() => onChange(c)}
					className={cn(
						"rounded-md py-2 text-sm font-medium capitalize transition-colors",
						value === c ? "bg-background shadow-sm" : "text-muted-foreground",
					)}
				>
					{c}
				</button>
			))}
		</div>
	);
}

export function DisableSheet({
	player,
	onClose,
}: {
	player: Player | null;
	onClose: () => void;
}) {
	const disablePlayer = useStore((s) => s.disablePlayer);
	const pick = (reason: DisableReason) => {
		if (player) disablePlayer(player.id, reason);
		onClose();
	};
	return (
		<Sheet
			open={!!player}
			onClose={onClose}
			title={player ? `Tirar ${player.name}` : ""}
		>
			<div className="flex flex-col gap-2">
				{DISABLE_REASONS.map((r) => (
					<Button
						key={r}
						variant="outline"
						size="lg"
						className="justify-start"
						onClick={() => pick(r)}
					>
						{r}
					</Button>
				))}
			</div>
		</Sheet>
	);
}

export function PlayerSheet({
	open,
	player,
	onClose,
}: {
	open: boolean;
	player: Player | null;
	onClose: () => void;
}) {
	const addPlayer = useStore((s) => s.addPlayer);
	const renamePlayer = useStore((s) => s.renamePlayer);
	const setPlayerClass = useStore((s) => s.setPlayerClass);
	const [name, setName] = useState("");
	const [cls, setCls] = useState<PlayerClass>("mensalista");

	// seed the draft each time the sheet opens (edit = current values, add = blank)
	useEffect(() => {
		if (!open) return;
		setName(player?.name ?? "");
		setCls(player?.class ?? "mensalista");
	}, [open, player]);

	const save = () => {
		if (player) {
			renamePlayer(player.id, name);
			setPlayerClass(player.id, cls);
		} else {
			if (!name.trim()) return;
			addPlayer(name, cls);
		}
		onClose();
	};

	return (
		<Sheet
			open={open}
			onClose={onClose}
			title={player ? "Editar jogador" : "Novo jogador"}
		>
			<div className="flex flex-col gap-3">
				<Input
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && save()}
					placeholder="Nome do jogador"
					autoCapitalize="words"
				/>
				<ClassToggle value={cls} onChange={setCls} />
				<Button size="lg" onClick={save}>
					{player ? "Salvar" : "Adicionar"}
				</Button>
			</div>
		</Sheet>
	);
}
