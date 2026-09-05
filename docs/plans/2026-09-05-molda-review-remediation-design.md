# Correções do full review do Molda

**Data:** 2026-09-05  
**Escopo:** `molda`, integração com Studio, sincronização de criações, catálogo e acessibilidade.

## Objetivo

Eliminar os bloqueadores e riscos encontrados no full review sem trocar o formato das criações nem quebrar projetos existentes. Cada correção deve nascer com uma regressão que falhe no código anterior e passe após a mudança.

## Decisões

### Exportação Molda → Studio

O export clássico do Studio usará o manifesto 3D que já alimenta o preview. `buildClassicFileMap` passará `asset3DManifest(project.assets)` ao quarto argumento de `buildAssetsRuntime` e criará `sz-assets.js` quando houver somente assets 3D. O runtime continuará lendo data URLs; não haverá um segundo protocolo para arquivos `.glb` e `.hdr`.

### Exclusão concorrente

Toda exclusão remota levará a revisão conhecida pelo cliente. O contrato propagará `baseRevision` do espelho local ao BFF, ao members e ao repositório. O servidor recusará uma revisão vencida com `CREATION_STALE_BASE`, como já faz no upload. O cliente reconciliará o item em vez de abandonar a exclusão como erro genérico.

Uma criação inexistente aceitará somente `baseRevision = 0`. Se um cliente apresentar revisão positiva para uma linha já compactada, o servidor responderá base vencida; assim, um aparelho antigo não recria silenciosamente um item apagado.

### Lápides e sincronização

A listagem será paginada por cursor e devolverá lápides sem miniatura. O reconciliador aplicará o orçamento também às lápides. O backend removerá lápides antigas em lotes, após uma janela de retenção definida no domínio. Clientes cuja revisão positiva aponta para uma linha removida receberão o mesmo conflito de revisão e convergirão por reconciliação.

O rollout manterá compatibilidade de leitura com respostas sem cursor. Escritas novas exigirão a revisão-base; falhar fechado preserva dados de abas antigas.

### ZIP da galeria

O Molda deixará de acumular todos os arquivos prontos antes da compressão. A montagem usará a API incremental do `fflate`, liberará cada export após enviá-lo ao ZIP e controlará três limites derivados: número máximo do ZIP clássico, bytes prontos processados e bytes comprimidos emitidos. A API aceitará `AbortSignal` e progresso. A galeria permitirá cancelar uma preparação em andamento.

### Versão e cache

Toda alteração persistida, inclusive miniatura, avançará um timestamp monotônico: `max(relógio, updatedAt anterior + 1)`. O cache Molda → Studio guardará somente o resultado codificado e combinará seus metadados com o asset recém-carregado. Mudanças com o mesmo relógio não reutilizarão metadados antigos nem serão ignoradas pela nuvem.

### Catálogo e assinantes existentes

O seed reconciliará o componente Molda no bundle existente de forma aditiva e idempotente. Um comando de rollout separado, com `--dry-run` obrigatório por padrão, auditará e concederá o entitlement aos assinantes ativos. O comando usará os serviços/portas existentes e registrará totais, erros e reexecuções; não esconderá a correção em inicialização de aplicação.

**Decisão dela (05/09/2026, registrada pela outra sessão):** o alvo do rollout são os assinantes ativos das ofertas `comunidade-dos-criadores-mensal`/`-anual` (identificados por `snapshot->>'offerSlug'`; a linha do Molda espelha a fonte da irmã, `subscription:<id>:<produtoMolda>` ou `payment:<id>:<produtoMolda>`, para vencer/cancelar junto via `expireBySubscriptionId`/`revokeBySubscriptionId`) **e também as cortesias de admin** da chave-mestra kids (`access_type='all_kids_courses'`, `source_kind='manual'`, `product_id …0001`) — para essas, linha `manual`, sem vencimento. A linha precisa de `access_type='community'` + `course_ref='molda'` para `/members/access?refs=molda` responder `true` (a chave-mestra não conta); `product_id` = `catalog.products where sku='molda'` (mesmo Postgres, schema `catalog`). O cache de posse guarda só positivos (60 s), então o grant vale na hora. Quem executa em staging e produção (dry-run → confirm) é a outra sessão, depois que este código chegar; o combo ganha o Molda como 7º componente via PATCH do produto nos dois ambientes.

### Interface e manutenção

Controles de toque crus terão alvo mínimo de 44 px. Campos receberão `name` e `autoComplete`; animações de carregamento respeitarão movimento reduzido. Os ciclos de tipo dos templates serão removidos por um módulo de tipos. O helper `core/perf.ts` sem consumidores será excluído.

`MoldaViewport` e `ModelEditor` serão reduzidos por extrações coesas: matemática/geometria de viewport, captura de miniatura, atalhos de teclado e ciclo de miniatura. As extrações manterão os contratos públicos atuais.

## Tratamento de erros

- Conflito de exclusão usa o código existente `CREATION_STALE_BASE` e nunca apaga o blob corrente.
- Limite ou cancelamento do ZIP produz resultado tipado e mensagem específica; não retorna arquivo parcial.
- Falha do backfill identifica a conta afetada, mantém o comando reexecutável e encerra com código diferente de zero.
- Paginação inválida recebe erro de validação na borda.

## Testes

1. Export do Studio contém modelo e céu no `sz-assets.js`.
2. Dispositivo na revisão 1 não apaga a revisão 2; a revisão corrente permanece disponível.
3. Linha ausente com revisão positiva é recusada; item novo com revisão zero continua válido.
4. Listagem pagina itens e omite miniaturas das lápides; retenção remove apenas o lote elegível.
5. Reconciliador respeita o orçamento durante lápides.
6. ZIP incremental limita bytes/entradas, informa progresso e cancela sem download parcial.
7. Miniatura com relógio igual avança a versão, atualiza cache e entra na próxima subida.
8. Seed e rollout são idempotentes; dry-run não altera dados.
9. Controles mantêm nomes acessíveis, campos completos e alvos de 44 px.
10. Typecheck, Biome, testes unitários, E2E do Molda e build do Kids fecham o trabalho.

## Ordem de implementação

1. Export 3D do Studio.
2. Concorrência do DELETE ponta a ponta.
3. Paginação e retenção de lápides.
4. ZIP incremental e cancelável.
5. Versão monotônica e cache.
6. Catálogo e rollout.
7. Acessibilidade e extrações arquiteturais.
8. Verificação integrada.
