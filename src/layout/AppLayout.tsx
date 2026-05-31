import { ListOrdered, ListChecks, Settings, Volleyball } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/utils/cn";

const tabs = [
	{ to: "/", label: "Jogadores", icon: ListOrdered, end: true },
	{ to: "/fila", label: "Fila", icon: ListChecks, end: false },
	{ to: "/jogos", label: "Jogos", icon: Volleyball, end: false },
	{ to: "/config", label: "Config", icon: Settings, end: false },
];

export function AppLayout() {
	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col">
			<main className="flex-1 pb-24">
				<Outlet />
			</main>
			<nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
				<div className="mx-auto grid max-w-md grid-cols-4">
					{tabs.map(({ to, label, icon: Icon, end }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								cn(
									"flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
									isActive ? "text-primary" : "text-muted-foreground",
								)
							}
						>
							<Icon className="size-5" />
							{label}
						</NavLink>
					))}
				</div>
			</nav>
		</div>
	);
}
