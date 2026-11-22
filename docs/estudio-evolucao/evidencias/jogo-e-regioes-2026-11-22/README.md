# Jogo E: regiões no motor (lote 7 da conclusão, 22/11/2026)

## O jogo

Um mundo 3D dividido em seis regiões, montado pelo caminho de verdade, sem nada do Arquipélago:

- **Cenário**: a oficina do Molda Cenários (em memória, num Chrome sem janela) monta o mundo pelas
  mesmas intenções do agente: relevo por receita (colinas), seis regiões em grade 3 × 2 com as
  vizinhas em par (Vila, Floresta, Caverna, Lago, Praia e Montanha), um lago na bacia cavada, 433
  objetos (floresta densa, pedras na caverna e na montanha, árvores na praia, 16 casas e 8 postes
  na vila), o início e duas luzes. A compilação é a da oficina, com "Juntar peças" (os 433 objetos
  viram 23 lotes, cada um numa região).
- **Estúdio**: importa os dois pacotes (com e sem regiões), confere o orçamento por janela e monta o
  programa só com blocos que existem: o cenário, o herói do Molda, as moedas que caem no relevo
  (corpos com física), o placar e o "Quando o heroi entrar na região" escrevendo o nome da região no
  canto da tela. A ida e volta código ⇄ blocos é conferida no gerador.
- Geradores: `packages/molda-cenarios/playground/jogo-e/preparar-cenario.mjs` (com
  `bun run dev:oficina`) e `packages/studio/playground/cenarios-integration/preparar-jogo-e.ts`.
  A saída fica em `output/cenarios-reforma/jogo-e/` (fora do Git).

## A prova (`packages/studio/e2e/engine-regions.spec.ts`)

Rota Vila → Floresta → Caverna → Floresta → Vila, dez vezes, no jogo com regiões e no mesmo jogo
sem regiões. Roda no `studio-engines.yml` (fora da suíte que barra o merge, GPU emulada).

Reprova se:

- uma entrada numa região não disparar exatamente uma vez (medido: Vila 11, que começa dentro e
  volta uma vez por volta; Floresta 20; Caverna 10);
- os objetos de GPU vivos (buffers, texturas, programas e VAOs) mudarem nas últimas quatro voltas
  (cada volta é amostrada no estado estável, depois de a Caverna sair da carga);
- a região onde o herói chegou não entrar na carga (a Caverna, que não é vizinha da Vila, só
  carrega quando ele chega lá), ou alguma região falhar e ficar esperando nova tentativa;
- a Caverna continuar carregada depois da volta à Vila.

Registra sem reprovar (GPU emulada, SwiftShader). Cada rodada grava as medidas em
`output/cenarios-reforma/jogo-e/medidas.json` (fora do Git; no CI, o artefato `studio-engines`), e
a cópia `medidas.json` desta pasta é a da rodada registrada aqui:

| | Com regiões | Sem regiões |
|---|---|---|
| Quadro p50 / p95 / máximo (ms) | 217 / 317 / 350 | 283 / 383 / 500 |
| Quadros por segundo (mediana) | 4,6 | 3,5 |
| Desenhos (Vila / Floresta / Caverna) | 27 / 36 / 29 | 31 / 35 / 27 |
| Memória JS | 167 MB | 103 MB |

Os tempos absolutos são da GPU emulada (a meta de 30 quadros por segundo vale para GPU de verdade e
não é medida aqui). A comparação relativa mostra a carga por regiões desenhando menos e com quadros
mais curtos que o mundo inteiro; a memória JS maior com regiões é a dos arquivos contados que ficam
guardados para a volta.

## O tamanho do mundo: 384 m, e por quê

O plano pedia ~1024 × 1024 m. Com os tetos de hoje, o maior mundo que o Estúdio aceita fica perto
de 384 m, e o motivo é o chão pintado:

- a compilação pinta o chão a **8 pixels por metro**: cada peça de 64 m vira uma imagem de
  512 × 512, contada decodificada no pacote e na janela;
- **1024 m** são 256 peças: passa do teto de **256 MiB** decodificados do pacote;
- **640 m** cabe no pacote, mas a janela da Vila (com Floresta e Lago) passa dos **128 MiB** por
  janela;
- **512 m** cabe nas memórias, mas os arquivos somam 24,5 MB e passam do teto de **24 MiB de
  materiais por projeto** do Estúdio;
- **384 m** cabe em tudo (36 peças de relevo).

Um mundo de 1 km no Estúdio pede um chão mais leve no destino Estúdio (por exemplo, 2 pixels por
metro: 16 vezes menos memória e arquivo) ou tetos maiores. É uma decisão de produto, registrada no
relatório final.
