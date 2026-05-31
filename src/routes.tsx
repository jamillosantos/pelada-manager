import { Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import Config from "@/pages/config";
import Games from "@/pages/games";
import Players from "@/pages/players";
import Queue from "@/pages/queue";
import Stats from "@/pages/stats";

export default function RoutesApp() {
	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route index path="/" element={<Players />} />
				<Route path="/fila" element={<Queue />} />
				<Route path="/jogos" element={<Games />} />
				<Route path="/stats" element={<Stats />} />
				<Route path="/config" element={<Config />} />
			</Route>
		</Routes>
	);
}
