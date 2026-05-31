# Pelada — Regras do Dia de Jogo

App para controlar peladas (dia de futebol) pelo celular. Funciona offline:
todo o estado fica salvo no `localStorage` do navegador.

Este documento é a fonte da verdade da lógica de domínio. O código deve segui-lo.

---

## 1. Conceitos

- **Dia de jogo** — uma sessão única. Guarda sua configuração, a lista de
  jogadores e a lista de jogos.
- **Jogador** — uma pessoa presente na pelada.
- **Classe** — todo jogador é:
  - **Mensalista** — membro mensal. Prioridade maior.
  - **Convidado** — convidado. Prioridade menor.
- **Campo** — onde o jogo acontece. Tem exatamente dois times (A e B) de
  `teamSize` jogadores cada.
- **Fila** — lista ordenada de jogadores esperando fora do campo, prontos para
  jogar.
- **`teamSize`** — jogadores por time. Padrão **6**, configurável por dia de jogo.

---

## 2. Jogadores

- Cada jogador tem: `nome`, `classe` (mensalista | convidado), `chegouEm`
  (data/hora marcada na entrada), além da informação de desativação.
- A **data/hora de chegada** é marcada automaticamente quando o jogador é
  adicionado. É guardada como informação e usada como critério de desempate
  padrão da ordenação.
- A **reordenação manual** é permitida a qualquer momento. Reordenar manualmente
  sobrescreve a ordem por chegada. A data/hora de chegada permanece intacta como
  informação.

### 2.1 Ordem padrão (a "ordem de chegada")

Quando não há sobrescrita manual, os jogadores são ordenados por:

1. **Classe** — todos os mensalistas vêm antes de todos os convidados,
   independentemente de quem chegou primeiro.
2. **Data/hora de chegada** — dentro da mesma classe, quem chegou antes vem
   primeiro.

> Exemplo: um convidado que chegou às 08:00 ainda fica *depois* de um mensalista
> que chegou às 09:00.

### 2.2 Desativar um jogador

- Um jogador pode ser **desativado** (tirado do jogo) em vez de excluído.
- Desativar exige um **motivo**, sendo um destes:
  - `Foi embora`
  - `Machucado`
  - `Pausa / Descanso` (pode voltar depois)
- Jogadores desativados aparecem **riscados** com o motivo na lista.
- Jogadores desativados ficam fora da fila e das sugestões de novos jogos.
- Um jogador desativado pode ser **reativado** (ex.: depois de uma pausa). Ao
  reativar, ele volta para a fila mantendo seu lugar na ordem de chegada.

---

## 3. A Fila (ordem de espera)

A fila é a lista ordenada de jogadores ativos que não estão no campo.

- **Primeiro jogo do dia** — a fila segue a ordem de chegada padrão (§2.1):
  mensalistas primeiro (por chegada), depois convidados (por chegada).
- **Jogos seguintes** — a prioridade é o **tempo esperando sem jogar**. A classe
  deixa de importar; só importa a ordem de chegada na fila de espera.
  - Quando um jogador sai do campo, ele vai para o **fim** da fila (acabou de
    jogar, então passa a esperar mais que os outros).
  - Quem nunca saiu da fila mantém sua posição relativa à frente de quem acabou
    de jogar.
- O organizador pode **reordenar manualmente** a fila a qualquer momento.

> Modelo prático: a fila é FIFO. O primeiro jogo é montado a partir da ordem de
> chegada. Depois disso, quem sai do campo entra no fim, e os próximos times são
> tirados do começo.

---

## 4. Começar um jogo

- Um novo jogo é **sugerido** pelo sistema usando a fila atual.
- O app pega os próximos `2 * teamSize` jogadores do começo da fila para
  preencher o Time A e o Time B (os primeiros `teamSize` → Time A, os
  `teamSize` seguintes → Time B). O organizador pode ajustar antes de confirmar.
- Se houver menos de `2 * teamSize` jogadores disponíveis, o organizador decide
  (preenche o que dá / espera chegar mais gente).

---

## 5. Modos

O modo é definido por quantos jogadores ativos estão **esperando fora** do campo
(tamanho da fila) enquanto um jogo acontece.

- **Modo normal** — até **3 times + 1 pessoa** esperando fora (≤ `3 * teamSize`).
- **Modo muitos jogadores** — **mais de 3 times** esperando fora
  (> `3 * teamSize`; com `teamSize = 6`, mais de 18 esperando).

> Ou seja, o modo liga quando há gente suficiente fora para montar 3 times
> cheios e ainda sobrar pelo menos 1 pessoa.

---

## 6. Encerrar um jogo — Modo normal (≤ 6 esperando)

- **Um time vence** → o vencedor **fica no campo**. O perdedor sai e é
  substituído pelos próximos `teamSize` jogadores do começo da fila. Os
  perdedores vão para o fim da fila.
- **Empate** → o time que está **há menos tempo no campo fica**; o outro sai
  (para o fim da fila) e é substituído pelos próximos `teamSize` da fila.
  - "Tempo no campo" é medido por time, por quanto tempo o time segura o campo.
    O time que entrou no campo mais recentemente é o que tem menos tempo e fica.

---

## 7. Encerrar um jogo — Modo muitos jogadores (> 6 esperando)

Objetivo: girar mais gente para ninguém esperar demais.

- **Empate** → **os dois times perdem** e saem do campo. Todos que estavam no
  campo vão para o fim da fila. O campo é preenchido pela fila (próximos
  `2 * teamSize` do começo).
- **Sequência de vitórias** — uma **sequência** é o número de jogos seguidos que
  um time venceu **mantendo-se no campo**.
  - A sequência **zera quando o time sai do campo** (perde, sai por empate ou é
    rodado). Um time que acabou de entrar começa em 0.
  - Se um time **vence 2 seguidas** (sequência chega a 2) nesse modo, **os dois
    times saem do campo** e dão lugar aos próximos. Os dois vão para o fim da
    fila; o campo é preenchido pelo começo (próximos `2 * teamSize`).
- **Sequência abaixo de 2** → funciona como o modo normal: vencedor fica,
  perdedor sai para o fim da fila e é substituído pelo começo.

---

## 8. Exemplos

Assumindo `teamSize = 6`.

### 8.1 Montagem do primeiro jogo
Lista: 8 mensalistas (M1..M8 por chegada), 6 convidados (C1..C6 por chegada).
Ordem da fila: `M1 M2 M3 M4 M5 M6 M7 M8 C1 C2 C3 C4 C5 C6`.
- Time A = `M1..M6`, Time B = `M7 M8 C1 C2 C3 C4`.
- Esperando = `C5 C6` → 2 esperando → **Modo normal**.

### 8.2 Modo normal, vencedor fica
Time A vence o Time B.
- A fica. B (`M7 M8 C1 C2 C3 C4`) vai para o fim.
- A fila era `C5 C6` → precisaria de 6, mas só há `C5 C6` → organizador preenche
  o que dá ou espera.

### 8.3 Muitos jogadores, vence 2 seguidas
19 esperando fora (> 18 = 3 times + 1) → **Modo muitos jogadores**.
Time A vence o jogo 1 (sequência 1, fica), vence o jogo 2 (sequência 2).
- Sequência chegou a 2 → **A e B saem**, vão para o fim da fila.
- Campo preenchido com os próximos 12 do começo.

### 8.4 Muitos jogadores, empate
Empate nesse modo → os dois saem para o fim; campo preenchido com os próximos 12
do começo.

---

## 9. Persistência

- Todo o estado (configuração do dia, jogadores, fila, jogos, campo atual,
  sequências) é salvo no `localStorage` para o app sobreviver ao celular ficar
  offline ou à página recarregar.
- Não depende de backend / rede para o funcionamento principal.

---

## 10. Configurável

- `teamSize` — configurável por dia de jogo (padrão 6).
- O limite de "muitos jogadores" acompanha o `teamSize`: liga com mais de
  `3 * teamSize` esperando (3 times + 1 pessoa).
