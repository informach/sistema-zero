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

- [ ] Extrair `tiles/libraryPlacement.ts` do clique atual em `MapLibraryPanel`.
  Testar tamanho, offsets herdados, grade, orçamento e conjunto vinculado.
- [ ] Criar o hook `mapTools/useLibraryPlacement.ts`; ligar biblioteca,
  controlador e `MapStage`. Confirmar prévia sem escrita, alvo visível, soltura
  transacional e cancelamentos; preservar clique/teclado.
- [ ] Acrescentar regressões integradas no editor, incluindo adoção de uma
  revisão externa durante o gesto, histórico e disco.
- [ ] Executar fluxo no Chromium com mouse e toque, reabrir, revisar UI e código,
  rodar gates apropriados e registrar evidências. Só então marcar 4a concluída.
- [ ] Commitar e integrar staging conforme autorização; não interferir no Molda.
