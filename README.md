# Pelada

App mobile-first para controlar os jogos de uma pelada. React + Bun + shadcn,
estado salvo no `localStorage` (funciona offline).

## Rodar

```bash
bun install
bun dev        # http://localhost:3000
```

Outros comandos: `bun run build`, `bun run typecheck`, `bun run check`.

## Deploy (GitHub Pages)

O app é estático (dados no `localStorage`). Usa `HashRouter`, então funciona em
subpasta (`/<repo>/`) sem config de servidor.

- `bun run build` gera `dist/` com caminhos relativos + `.nojekyll`.
- O workflow `.github/workflows/deploy.yml` builda e publica no Pages a cada
  push na `main`. Em **Settings → Pages**, defina **Source: GitHub Actions**.

## Estrutura

- `src/lib/types.ts` — modelo de domínio
- `src/lib/store.ts` — estado + regras (zustand + persist)
- `src/pages/players` — fila de jogadores, classes, desativar/reativar
- `src/pages/games` — campo, modos, resultado, histórico
- `src/pages/config` — nome, tamanho do time, zerar dia

Regras completas em [RULES.md](./RULES.md).
