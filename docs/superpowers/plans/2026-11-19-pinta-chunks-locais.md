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

- [ ] Criar `packages/pinta/src/state/localChunkStorage.test.ts`: ida/volta,
  arestas, mapas/conjuntos, valores virados, vazios, mudança de uma célula,
  remoção/resize e cabeçalhos/chunks inválidos; confirmar teste vermelho.
- [ ] Implementar `localChunkStorage.ts`, comparação exata, orçamento antes
  de alocação, descoberta de chaves e coleção dos chunks obsoletos.
- [ ] Registrar o acesso cru no teste de arquitetura das células, com motivo.

## 2. IO atômico e regressões

- [ ] Integrar descoberta/reconstrução/escrita em `state/assetAuthorityDb.ts`.
- [ ] Exercitar o adaptador real, sem considerar somente o mock da suíte,
  inclusive seleção de dependências, quota no segundo put e revisão antiga.
- [ ] Conferir migração dos envelopes 1 e recusa do protocolo 2 no leitor
  anterior real; preservar todos os testes e critérios da issue 026.

## 3. Fluxo, medições e revisão

- [ ] Acrescentar prova IndexedDB real nos scripts/ensaios do Pinta: mapa
  ruidoso, uma edição, cópia recuperada, remoção e reabertura sem RAM.
- [ ] Conferir edição e undo/redo na interface existente; medir escrita de
  chunks, espelho, memória e duração, separando CPU/toque emulados.
- [ ] Executar tipos, suíte Pinta, autoridade local e regressão dos destinos.
- [ ] Documentar protocolo, resultados, custos e limites; revisar e commitar.
- [ ] Integrar somente a entrega verificada, preservando mudanças concorrentes.
