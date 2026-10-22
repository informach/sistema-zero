# Exemplos Python inteiramente visuais — Implementation Plan

> **For agentic workers:** Use `executing-plans` in batches with review. Parallel
> work and implementation were explicitly authorized by the user. Respect the
> ownership below; no hosted key/configuration work belongs to this batch.

**Goal:** Entregar Pac-Man e Space Arena completos e editáveis em Blocos, Ponte e
Código, com versões Blocos/Código nos exemplos Python.

**Architecture:** Fontes Python educacionais originais compartilhadas por uma
entrada Clássica (Blocos/Ponte) e uma Pro (Código) de cada jogo. Codecs gerais e Blockly reais preservam a árvore
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
- Python nunca foi ativado: remover compatibilidade/fallbacks de versões anteriores
  e adotar apenas os contratos atuais. Preservar o JavaScript existente.

## Lote 1 — Qualificador geral e criação Clássica

**Files:** `packages/studio/scripts/python/visual-example-qualification.ts`,
teste e adapter pinado adjacentes; `src/examples/pythonCatalog.ts`,
`src/projects/createPythonExampleProject.ts` e testes; `src/projects/KitGallery.tsx`.

**Interfaces:** `qualifyPythonVisualExample({source,path,analysis,authoring,edits})`
consome parse/render canônicos e produz relatório de cobertura/IDs/roundtrip/edições.
Metadata declara kind e modo inicial. A criação valida release para esse kind/modo,
valida arquivos/assets e autoriza candidato antes de persistir uma única vez.

- [x] Testar recusa de fonte sem codec e igualdade AST→Blockly→save/load→AST.
- [x] Provar edição real com valor anterior/endereço semântico e código alterado;
  recusar seleção ambígua ou impossível em vez de ignorar edição.
- [x] Cobrir criação Classic blocks/bridge e Pro code conforme a release;
  preservar cancelamento, escopo de armazenamento e exemplos Pro existentes.
- [x] Corrigir aviso/badge/disponibilidade por entrada na galeria sem ampliar
  oferta administrativa; manter carregamento preguiçoso dos payloads.
- [x] Conservar os IDs/curadoria de autoria devolvidos pelo host no contexto
  fresco. Novos exemplos Clássicos exigem sua lista integral de blocos na paleta;
  Pro/Código e exemplos antigos não passam a depender de aprovação de blocos.
- [x] Rodar testes focados e revisar antes de commit.

## Lote 2 — Pac-Man educacional completo

**Files:** `src/examples/python/pacman-visual/{main.py,README.md,NOTICE.md}`,
testes inertes próprios; wrapper metadata/payload e fontes geradas determinísticas.

**Interfaces:** `main.py` usa `turtle`, `random` e `sz_audio.play/stop`. WAVs
`opening.wav`, `collect.wav`, `power.wav`, `collision.wav` são assets originais.

- [x] Implementar mecânicas do design com constantes editáveis, estado mutável,
  callbacks nomeados e um timer; documentar adaptações e controles.
- [x] Exercitar paredes/viradas, pontos/especial, inimigos, dano/respawn e finais,
  pausa/reinício/encerramento em testes determinísticos do modelo real.
- [x] Rodar qualificador integral, resolver codecs gerais faltantes com regressões
  e provar edições de cor/velocidade/coordenada sem perder lógica.
- [x] Conferir fonte e licenças, gerar payload sem divergência e revisar o lote.

## Lote 3 — Space Arena educacional completo

**Files:** `src/examples/python/space-arena-visual/{main.py,README.md,NOTICE.md}`,
testes inertes próprios; wrapper metadata/payload e fontes geradas determinísticas.

**Interfaces:** `sz_audio.play(path,loop=False,volume=1.0)` devolve voz e
`sz_audio.stop(handle=None)` encerra voz/todas. Assets originais `bgm.wav`,
`explosion.wav`, `missile_fire.wav`, `powerup.wav`, `thruster.wav`.

- [x] Implementar todas as mecânicas/pools do design com render vetorial e HUD;
  não duplicar timer ou loop de áudio ao pausar/reiniciar.
- [x] Cobrir física, keyrelease, tiros, colisões, pickups, câmera/radar, partículas,
  transições e limpeza com modelos determinísticos do código real.
- [x] Exigir cobertura visual integral, save/load/geração e edições causais.
- [x] Conferir fontes/sons/procedência e revisar o lote.

## Lote 4 — Galeria, execução real e entrega

**Files:** Catálogo/payloads, testes de galeria/criação/exportação, cenário
Playwright real e recibos/documentos de continuidade novos.

- [x] Adicionar quatro entradas: cada jogo começa em Blocos (Clássico, com Ponte)
  ou Código (Pro). Testar mesmos bytes e identidades novas por criação.
- [x] Provar exportação preservando fontes/sons e dependência desktop canônica.
- [x] Habilitar formas compostas oficiais de maneira geral, com testes de cotas,
  dados inválidos e preservação de estado. Declarar a feature no novo par
  distribuição/release; preservar pins antigos e gerar candidato próprio.
- [x] Exercitar cada jogo na interface, editar bloco, ver Ponte, salvar/reabrir,
  executar fonte e conferir controles e Stop. Registrar resultado e negativos reais.
- [x] Rever desempenho do workspace e jogo sem ocultar carga; manter testes JS e
  limites de runtime. Declarar separadamente o que não puder ser qualificado.
- [ ] Full review, corrigir achados, rodar checagens afetadas, integrar remoto
  recente e commit/merge/push em staging conforme autorização existente.

## Checkpoint de integração — 22/10/2026

Os recibos atuais R4 em
`docs/continuity/2026-10-22-python-reference-games-visual-evidence/`
usam o loader real de autoria e a distribuição candidata
`e3188c84b1b63baee730656ea1399e6ee4d03946e6cbe6cbee57ef92bc43f8e9`.
Pac-Man: 2.307 blocos/54 IDs; Space Arena: 2.808/45 IDs; ambos zero opacos,
três edições reais e roundtrip integral. Esses recibos não executam os jogos.
Os metadados de blocos gerados são vinculados aos hashes dos fontes atuais.

A revisão acrescentou a validação de blocos/modos/curadoria da decisão final do
host, além do `prepare`. Foram reproduzidas seis recusas ausentes antes da correção.
Os testes do helper e do hook passaram depois do ajuste; o criador comprova que
uma recusa final deixa o armazenamento vazio. A possibilidade de revelar níveis
avançados não equivale a ter a paleta avançada já exibida.

Os quatro cenários gráficos finais passaram no Chrome, sem retries, testes
ignorados ou erros de navegador: galeria, edição, Ponte, salvar/reabrir, revisão
autorizada exata, controles causais em pixels e Stop. O recibo `ui-r12` registra
a release e a limpeza dos processos/portas. Não é aceite de autenticação
hospedada, áudio audível, FPS ou hardware de 8 GB.

A revisão final corrigiu a reserva de cotas para reuso de formas de atores que
sobrevivem a `clear()`. Foram quatro falhas causais antes da correção; os 31
testes de motor passaram depois. Uma segunda construção produziu os mesmos
bytes da candidata final. A fonte, os metadados e as duas apresentações de cada
jogo continuam idênticos entre si. Integração e entrega serão registradas após
o commit e o push efetivos.

## Lote 5 — Contrato Python atual único

Adicionado por instrução explícita do usuário durante a integração. Não há dados
Python de produção a migrar. Arquivos de evidência são registros de testes,
não implementações ativas nem justificativa para manter caminhos antigos.

- [x] Publicação Python usa somente a receita atual, sem leitor/conversor V1.
- [x] Rascunhos visuais usam uma única coleção, mesmo para apenas um arquivo;
  manter edição, descarte, hidratação, exportação e privacidade do Zappy.
- [x] Manifestos/distribuição e áudio exigem metadados atuais explícitos;
  remover fixtures executáveis e ramificações de ausência histórica.
- [x] LSP/Builder exigem release e bootstrap atuais; remover inicialização sem
  vínculo de release e migração de leases antigas.
- [x] Revisar handshake e inspeção para aceitar somente seus formatos atuais,
  preservando as funcionalidades distintas de compilar e inspecionar.
- [x] Atualizar os comandos operacionais ativos e a candidata inicial depois do
  freeze; não fazer um artefato antigo passar por uma nova qualificação.
- [x] Repetir verificações afetadas e revisar a limpeza inteira com JavaScript.

## Checkpoint de código para outras sessões

Full review e correções de jogos, contratos atuais e conquistas por linguagem
foram integrados na staging local em `1e8dd0e87`, após tipagem completa e testes
afetados. O avanço remoto `2429a37bd` está incluído. A rodada gráfica adicional
`ui-r13` passou nos quatro exemplos sobre esse commit e confirmou limpeza.
O [registro do lote](../../continuity/2026-10-22-python-visual-games-and-unlocks.md)
separa essas provas locais de CI, imagem e ativação/homologação hospedadas.
