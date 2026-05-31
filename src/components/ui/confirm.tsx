import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

interface ConfirmSheetProps {
	open: boolean;
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onClose: () => void;
}

/** Bottom-sheet confirmation for destructive actions. */
export function ConfirmSheet({
	open,
	title,
	description,
	confirmLabel = "Excluir",
	cancelLabel = "Cancelar",
	onConfirm,
	onClose,
}: ConfirmSheetProps) {
	return (
		<Sheet open={open} onClose={onClose} title={title}>
			{description && (
				<p className="mb-4 text-sm text-muted-foreground">{description}</p>
			)}
			<div className="flex flex-col gap-2">
				<Button
					variant="destructive"
					size="lg"
					onClick={() => {
						onConfirm();
						onClose();
					}}
				>
					{confirmLabel}
				</Button>
				<Button variant="outline" size="lg" onClick={onClose}>
					{cancelLabel}
				</Button>
			</div>
		</Sheet>
	);
}
