# Aparelho modesto, emulado (21/11/2026)

**Decisão da dona (21/11):** o aparelho modesto é só emulado, no CI. Tudo aqui é **emulado, não
conferido em aparelho físico**.

## Como a medida é feita

- **Onde:** workflow `studio-modest-device.yml`, no CI Linux (`ubuntu-24.04`), com o Chromium 159
  do Playwright 1.65.1, run 44896882655 no commit `e5391751a`.
- **A emulação:** a CPU do editor é desacelerada pelo CDP (`Emulation.setCPUThrottlingRate`, em
  `e2e/helpers/cpuThrottle.ts`), 4x e 6x.
- **O que não é emulado:**
  - o Firefox e o WebKit não têm essa emulação;
  - o jogo roda em outro processo e não é desacelerado;
  - não há placa de vídeo nem memória limitada.
- **Evidência bruta:** `evidencias/aparelho-modesto-2026-11-21/`.

## Clássico em escala (`e2e/classic-scale.spec.ts`)

| CPU | Blocos | Abrir | Editar um campo (maior tarefa) | Mover a área (maior tarefa) |
|---|---|---|---|---|
| 4x | 2.002 | 4,9 s | 165 ms | 136 ms |
| 4x | 5.002 | 13,3 s | 361 ms | 420 ms |
| 6x | 2.002 | 7,2 s | 254 ms | 191 ms |
| 6x | 5.002 | 19,3 s | 520 ms | 593 ms |

As metas da etapa 2 (com 5 mil, abrir em menos de 8 s, mover sem tarefa acima de 500 ms e editar
sem tarefa acima de 200 ms) foram escritas para a máquina do teste, não para o aparelho emulado. A
4x, o 5 mil passa no mover e não passa no abrir nem no editar. A 6x, só o 2 mil fica dentro das três.

## Pro modular de 60 arquivos (`e2e/pro-workspace-performance.spec.ts`)

| CPU | Digitar (p95) | Abrir painel (p95) | Abrir a gaveta (p95) | Primeira resposta da busca (p95) |
|---|---|---|---|---|
| 4x | 47,8 ms | 40,5 ms | 36,1 ms | 25,0 ms |
| 6x | **55,4 ms** | 50,9 ms | 47,0 ms | 33,6 ms |

Critérios da etapa 3: digitar abaixo de 50 ms, painel abaixo de 150 ms, busca abaixo de 200 ms. A
4x passam os três. A 6x, só a digitação passa do critério.

## Programas hostis (`e2e/preview-hostile-programs.spec.ts`)

Os cinco passam a 4x e a 6x: o editor responde em menos de 500 ms, o Parar para em menos de 5 s e o
conserto roda em menos de 15 s. São eles:
- trabalho síncrono longo;
- recursão sem fim;
- enxurrada de mensagens;
- execução interrompida;
- memória crescendo.

## O que isso diz

- Num aparelho de 4 a 6 vezes mais lento que o runner do CI, o editor continua respondendo com
  programa hostil, e o Pro modular fica nos critérios até 4x.
- O Clássico grande é o que mais sente: abrir 5 mil blocos passa de 13 s a 4x.
- Nada disso substitui o aparelho de verdade: placa de vídeo, memória e o processo do jogo não
  entram na emulação.
