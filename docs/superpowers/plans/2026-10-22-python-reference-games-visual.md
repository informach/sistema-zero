# Exemplos Python inteiramente visuais — Implementation Plan

> **For agentic workers:** Use `executing-plans` in batches with review. Parallel
> work and implementation were explicitly authorized by the user. Respect the
> ownership below; no hosted key/configuration work belongs to this batch.

**Goal:** Entregar Pac-Man e Space Arena completos e editáveis em Blocos, Ponte e
Código, com versões Blocos/Código nos exemplos Python.

**Architecture:** Fontes Python educacionais originais compartilhadas por duas
entradas Clássicas de cada jogo. Codecs gerais e Blockly reais preservam a árvore
semântica; o qualificador recusa fonte opaca e comprova edição/salvar/reabrir.

**Tech Stack:** TypeScript, Bun 1.3.11, Blockly, CPython/Pyodide 3.14.2 pinado,
Turtle, `sz_audio` 1.0.0 e Playwright.

**Spec:** [Design e requisito aprovado](../../plans/2026-10-22-python-reference-games-visual-design.md).

## Global Constraints

- JavaScript padrão e oferta Python administrativa preservados.
- Não copiar corpus/mídia de terceiros para contornar licenças; fontes/sons novos
  terão procedência explícita e serão versionados.
- Sem blocos executa-jogo, `exec`, trecho opaco ou lógica escondida em biblioteca.
- Cada apresentação usa os mesmos bytes de fonte/assets do respectivo jogo.
- Não reduzir pools do Space Arena: 25/30/20/5 e partículas 30/20.
- Melhorias no motor devem ser gerais, sem alterar release imutável silenciosamente.
- Não mexer em Railway/chaves. Processos pesados seriais; sem fechar apps do usuário.

## Lote 1 — Qualificador geral e criação Clássica

**Files:** `packages/studio/scripts/python/visual-example-qualification.ts`,
teste e adapter pinado adjacentes; `src/examples/pythonCatalog.ts`,
`src/projects/createPythonExampleProject.ts` e testes; `src/projects/KitGallery.tsx`.

**Interfaces:** `qualifyPythonVisualExample({source,path,analysis,allowedBlockIds,edits})`
consome parse/render canônicos e produz relatório de cobertura/IDs/roundtrip/edições.
Metadata declara kind e modo inicial. A criação valida release para esse kind/modo,
valida arquivos/assets e autoriza candidato antes de persistir uma única vez.

- [ ] Testar recusa de fonte sem codec e igualdade AST→Blockly→save/load→AST.
- [ ] Provar edição real com valor anterior/endereço semântico e código alterado;
  recusar seleção ambígua ou impossível em vez de ignorar edição.
- [ ] Cobrir criação Classic blocks/code e alternância permitida em release;
  preservar cancelamento, escopo de armazenamento e exemplos Pro existentes.
- [ ] Corrigir aviso/badge/disponibilidade por entrada na galeria sem ampliar
  oferta administrativa; manter carregamento preguiçoso dos payloads.
- [ ] Rodar testes focados e revisar antes de commit.

## Lote 2 — Pac-Man educacional completo

**Files:** `src/examples/python/pacman-visual/{main.py,README.md,NOTICE.md}`,
testes inertes próprios; wrapper metadata/payload e fontes geradas determinísticas.

**Interfaces:** `main.py` usa `turtle`, `random` e `sz_audio.play/stop`. WAVs
`opening.wav`, `collect.wav`, `power.wav`, `collision.wav` são assets originais.

- [ ] Implementar mecânicas do design com constantes editáveis, estado mutável,
  callbacks nomeados e um timer; documentar adaptações e controles.
- [ ] Exercitar paredes/viradas, pontos/especial, inimigos, dano/respawn e finais,
  pausa/reinício/encerramento em testes determinísticos do modelo real.
- [ ] Rodar qualificador integral, resolver codecs gerais faltantes com regressões
  e provar edições de cor/velocidade/coordenada sem perder lógica.
- [ ] Conferir fonte e licenças, gerar payload sem divergência e revisar o lote.

## Lote 3 — Space Arena educacional completo

**Files:** `src/examples/python/space-arena-visual/{main.py,README.md,NOTICE.md}`,
testes inertes próprios; wrapper metadata/payload e fontes geradas determinísticas.

**Interfaces:** `sz_audio.play(path,loop=False,volume=1.0)` devolve voz e
`sz_audio.stop(handle=None)` encerra voz/todas. Assets originais `bgm.wav`,
`explosion.wav`, `missile_fire.wav`, `powerup.wav`, `thruster.wav`.

- [ ] Implementar todas as mecânicas/pools do design com render vetorial e HUD;
  não duplicar timer ou loop de áudio ao pausar/reiniciar.
- [ ] Cobrir física, keyrelease, tiros, colisões, pickups, câmera/radar, partículas,
  transições e limpeza com modelos determinísticos do código real.
- [ ] Exigir cobertura visual integral, save/load/geração e edições causais.
- [ ] Conferir fontes/sons/procedência e revisar o lote.

## Lote 4 — Galeria, execução real e entrega

**Files:** Catálogo/payloads, testes de galeria/criação/exportação, cenário
Playwright real e recibos/documentos de continuidade novos.

- [ ] Adicionar quatro entradas: cada jogo começa em Blocos ou Código; os três
  modos permanecem disponíveis. Testar mesmos bytes e identidades novas por criação.
- [ ] Provar exportação preservando fontes/sons e dependência desktop canônica.
- [ ] Exercitar cada jogo na interface, editar bloco, ver Ponte, salvar/reabrir,
  executar fonte e conferir controles e Stop. Registrar resultado e negativos reais.
- [ ] Rever desempenho do workspace e jogo sem ocultar carga; manter testes JS e
  limites de runtime. Declarar separadamente o que não puder ser qualificado.
- [ ] Full review, corrigir achados, rodar checagens afetadas, integrar remoto
  recente e commit/merge/push em staging conforme autorização existente.
