# Plano: biblioteca com arrasto

Execução direta na worktree isolada existente, conforme a autorização de continuar
sem aprovação entre etapas. Usar `executing-plans` e verificar antes dos commits.

**Objetivo:** arrastar artes e conjuntos existentes para o cenário com prévia,
cancelamento seguro e um desfazer por inserção.

**Arquitetura:** cálculo de colocação compartilhado no núcleo de mapas; hook de
Pointer Events no editor; prévia reutilizando a arte existente. Sem novo formato,
dependência, identidade visual ou lógica de jogo.

**Especificação:** `docs/plans/2026-11-19-pinta-biblioteca-arrasto-design.md`.

## Tarefas verificáveis

- [x] Extrair `tiles/libraryPlacement.ts` do clique atual em `MapLibraryPanel`.
  Testar tamanho, offsets herdados, grade, orçamento e conjunto vinculado.
- [x] Criar o hook `mapTools/useLibraryPlacement.ts`; ligar biblioteca,
  controlador e `MapStage`. Confirmar prévia sem escrita, alvo visível, soltura
  transacional e cancelamentos; preservar clique/teclado.
- [x] Acrescentar regressões integradas no editor, incluindo adoção de uma
  revisão externa durante o gesto, histórico e disco.
- [x] Executar fluxo no Chromium com mouse e toque, reabrir, revisar UI e código,
  rodar gates apropriados e registrar evidências. Só então marcar 4a concluída.
- [x] Commitar e integrar staging conforme autorização; não interferir no Molda.
  Commit `89948a3a8`; integração e push em `386eb685b`, preservando 162 arquivos
  de trabalho preexistentes por status e hash. O CI desse head está em execução.
