import type { TeamColor } from "@/lib/colors";
import { cn } from "@/utils/cn";

export function ColorDot({
	color,
	className,
}: {
	color: TeamColor;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-block size-3 shrink-0 rounded-full border border-black/15",
				className,
			)}
			style={{ backgroundColor: color.hex }}
		/>
	);
}
