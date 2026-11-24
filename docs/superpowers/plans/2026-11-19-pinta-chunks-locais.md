# Chunks locais — plano de execução

**Objetivo:** tornar incremental a autoridade IndexedDB de mapas grandes,
mantendo documento, revisão, compatibilidade e recuperação da issue 026.

**Arquitetura:** codec físico puro abaixo da autoridade existente. IO de
chunks e metadados na mesma transação. O editor e os motores continuam
consumindo o documento lógico completo.

**Tecnologias:** TypeScript, IndexedDB/idb-keyval existente, Bun e Playwright.

**Design:** `docs/plans/2026-11-19-pinta-chunks-locais-design.md`.

Executar diretamente pela skill `executing-plans`, sem delegação. O usuário
determinou continuar sem aprovação entre etapas e preservar o trabalho 3D.

## 1. Codec físico e limites

- [x] Criar `packages/pinta/src/state/localChunkStorage.test.ts`: ida/volta,
  arestas, mapas/conjuntos, valores virados, vazios, mudança de uma célula,
  remoção/resize e cabeçalhos/chunks inválidos; confirmar teste vermelho.
- [x] Implementar `localChunkStorage.ts`, comparação exata, orçamento antes
  de alocação, descoberta de chaves e coleção dos chunks obsoletos.
- [x] Registrar o acesso cru no teste de arquitetura das células, com motivo.

## 2. IO atômico e regressões

- [x] Integrar descoberta/reconstrução/escrita em `state/assetAuthorityDb.ts`.
- [x] Exercitar o adaptador real, sem considerar somente o mock da suíte,
  inclusive seleção de dependências, quota no segundo put e revisão antiga.
- [x] Conferir migração dos envelopes 1 e recusa do protocolo 2 no leitor
  anterior real; preservar todos os testes e critérios da issue 026.

## 3. Fluxo, medições e revisão

- [x] Acrescentar prova IndexedDB real nos scripts/ensaios do Pinta: mapa
  ruidoso, uma edição, cópia recuperada, remoção e reabertura sem RAM.
- [x] Conferir edição e undo/redo na interface existente; medir escrita de
  chunks, espelho, memória e duração, separando CPU/toque emulados.
- [x] Executar tipos, suíte Pinta, autoridade local e regressão dos destinos.
- [x] Documentar protocolo, resultados, custos e limites; revisar e commitar.
- [x] Integrar somente a entrega verificada, preservando mudanças concorrentes.
  `00cea8696` contém a implementação; `0ebb89a63` inclui os gates de CI e foi
  integrado em staging local e remoto, preservando os 82 arquivos de trabalho
  preexistentes por comparação de status e SHA-256. O typecheck completo do
  Estúdio após os merges passou; Biome conferiu 16.482 arquivos e 65 casos
  focados de persistência/células passaram. Isso não declara o CI global verde.
