import { X } from "lucide-react";
import type * as React from "react";
import { useEffect } from "react";
import { cn } from "@/utils/cn";

interface SheetProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

/** Bottom sheet modal, optimized for thumb reach on mobile. */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex flex-col justify-end">
			<button
				className="absolute inset-0 bg-black/50 animate-in fade-in"
				onClick={onClose}
				aria-label="Fechar"
			/>
			<div
				className={cn(
					"relative z-10 rounded-t-2xl border-t bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg animate-in slide-in-from-bottom",
					className,
				)}
			>
				<div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
				{title && (
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">{title}</h2>
						<button onClick={onClose} aria-label="Fechar">
							<X className="size-5 text-muted-foreground" />
						</button>
					</div>
				)}
				{children}
			</div>
		</div>
	);
}
