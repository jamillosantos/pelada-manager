export interface TeamColor {
	id: string;
	label: string;
	/** dot/background color */
	hex: string;
	/** text color that reads on top of hex */
	fg: string;
}

export const TEAM_COLORS: TeamColor[] = [
	{ id: "blue", label: "Azul", hex: "#2563eb", fg: "#ffffff" },
	{ id: "yellow", label: "Amarelo", hex: "#facc15", fg: "#171717" },
	{ id: "red", label: "Vermelho", hex: "#dc2626", fg: "#ffffff" },
	{ id: "green", label: "Verde", hex: "#16a34a", fg: "#ffffff" },
	{ id: "orange", label: "Laranja", hex: "#ea580c", fg: "#ffffff" },
	{ id: "purple", label: "Roxo", hex: "#7c3aed", fg: "#ffffff" },
	{ id: "pink", label: "Rosa", hex: "#db2777", fg: "#ffffff" },
	{ id: "black", label: "Preto", hex: "#171717", fg: "#ffffff" },
	{ id: "white", label: "Branco", hex: "#f5f5f5", fg: "#171717" },
	{ id: "gray", label: "Cinza", hex: "#6b7280", fg: "#ffffff" },
];

const FALLBACK = TEAM_COLORS[0];

export function getColor(id: string): TeamColor {
	return TEAM_COLORS.find((c) => c.id === id) ?? FALLBACK;
}
