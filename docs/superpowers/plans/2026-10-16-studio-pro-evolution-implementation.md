# Studio Pro: implementação da evolução por lotes

> Execução nesta sessão com `executing-plans`, revisão própria entre lotes e verificação fresca antes de commit/merge, conforme autorização do usuário.

**Objetivo:** evoluir desempenho, navegação convencional, diagnósticos, materiais e exportação de fonte preservando Zappy e contratos do Sistema Zero.
**Base:** `staging` em `b030c443e`; branch `feat/studio-pro-evolution`.
**Especificação:** [proposta revisão 3](../../plans/2026-10-16-polaris-studio-pro-proxima-evolucao.md).
**Arquitetura:** manter `Project`, coordenadores de persistência/FS, worker TypeScript e adapters atuais. Otimizações de derivados ficam nos respectivos donos; comandos usam o mesmo caminho revisado por menu/atalho. Sem migração de projetos Pro legados, conforme instrução do usuário.
**Stack:** React 19, Monaco 0.52.2, TypeScript 5.9.3, Zustand, WebContainer, fflate, Bun e Playwright existentes.

## Restrições e provas

- Preservar todos os 16 grupos Zappy da especificação, incluindo construção durável e voz opcional. Sem nova chamada de IA implícita.
- Preservar perfis, autoria/observação, versões, flush, recibos e isolamento do runtime.
- Testar desempenho com dados sintéticos reproduzíveis; sem código/prompts de usuários nos relatórios.
- Esta máquina tem Ryzen 5 5600G, aproximadamente 16 GB e RTX 3050. Não representa a máquina física de entrada de 8 GB da proposta. Medições locais e cobertura automatizada serão identificadas como tal; estudo com alunos e hardware externo não podem ser fabricados.
- Inspector, Git, grupos de editor, substituição multiarquivo e sourcemaps remotos permanecem incrementos posteriores, como na proposta aprovada.

## Lote 0 — Referência e cobertura

Arquivos: `scripts/pro-workspace-benchmark.ts`, fixtures de benchmark, `e2e/pro-workspace-performance.spec.ts` e relatório `.audits/studio-pro-evolution/`.

- [x] Registrar base, máquina, versões, fixtures e limites quantitativos de comparação.
- [x] Medir busca sem correspondência/com muitas linhas, filtro de diagnósticos e ZIP; guardar resultados e hashes dos resultados funcionais.
- [x] Medir abertura/interação no browser com runtime/tutor controlados, registrando limites da instrumentação e caches.
- [x] Mapear suítes existentes para workspace, Zappy, FS, persistência, export, kits, acesso e bundle.
- [x] Review: confirmar que cada medida observa código real, que as fixtures estão dentro dos limites e que não há sucesso inferido de cenário pulado.

## Lote 1 — Desempenho sem mudar semântica

Arquivos: `modes/pro/workspace/search.ts`, `ProNavigator.tsx`, `ProBottomPanel.tsx`, módulo puro de diagnósticos, `ProCodeTools.tsx`, `monaco/pro/session.ts`, `export/zip.ts` e testes correspondentes.

Interfaces: conservar `searchProFiles(tree, query, mode, limit)` e a ordem/limite dos resultados; acrescentar índice por nós imutáveis se o perfil justificar. Diagnósticos continuam validados por hash/revisão. `zipFiles(map)` conserva os bytes descompactados e a posse dos buffers de entrada.

- [x] Eliminar cálculos de busca/guias invisíveis; reduzir processamento repetido por arquivo sem perder posições Unicode/CRLF.
- [x] Calcular hash uma vez por arquivo/versão no filtro de problemas; separar logs e apresentação do editor.
- [x] Reduzir invalidação de símbolos e preparação redundante, mantendo dependências/configurações e respostas antigas corretas.
- [x] Corrigir compressão bloqueante se confirmada, com workers/cópias limitados e falhas propagadas.
- [x] Comparar antes/depois, golden outputs e regressões funcionais; registrar review antes de navegação nova.

## Lote 2 — Editor e comandos

Arquivos: `ProCodeMode.tsx`, `workspace/commands.ts`, `ProCodeTools.tsx`, `ProNavigator.tsx`, componentes locais de navegação e traduções do Studio.

Interfaces: descritores existentes `ProCommand` alimentam ações Monaco e menu; callback de busca diferencia arquivos/conteúdo. Ações verificam disponibilidade atual na execução. F2 usa `operations.prepare`, nunca aplica renomeação diretamente.

- [x] Criar abertura rápida com teclado e busca de projeto dedicada; manter arquivos como visão inicial.
- [x] Integrar paleta nativa, símbolos, referências, formatação e renomeação aos comandos existentes; preservar Ctrl/Cmd+K e Zappy contextual.
- [x] Separar Guias da árvore, tornar breadcrumbs úteis e preservar seleção/undo/painéis em mudanças de layout.
- [x] Usar tema, fonte, locale e componentes existentes; testar foco, Escape, teclado e modo observador.
- [x] Review de navegação no browser, regressões Zappy e desempenho.

## Lote 3 — Problemas, materiais e guias

Arquivos: `ProBottomPanel.tsx`, `ProAssetPaths.tsx`, módulos de guias/materiais e testes.

Interfaces: diagnóstico leva arquivo/linha/hash ao mesmo `requestProHelp`; materiais continuam em `Project.assets`, com busca de usos literal explicitamente limitada. Guia usa `compatibleProGuides`, sem outro catálogo ou marcação de jornada.

- [x] Mostrar estados de análise e mensagem técnica com ação contextual de investigação; não navegar para revisão antiga.
- [x] Melhorar inspeção e busca de usos de materiais sem renderer 3D por item nem decodificação repetida.
- [x] Oferecer guias opcionais pesquisáveis e navegação a arquivos/símbolos reais, preservando avisos de conversão.
- [x] Review de hosts sem tutor, observação, materiais/terminal, acessibilidade e concorrência.

## Lote 4 — Continuidade externa e review completo

Arquivos: `export/sourceExport.ts`, novo módulo puro de instruções por manifesto se necessário, `Topbar.tsx`, testes de export/ZIP e provas de browser.

Interfaces: `exportProjectSource(project)` mantém formato; instrução gerada respeita scripts/lockfiles/Node e não sobrescreve documentação do autor. UI exibe avisos/falhas sem alterar o projeto.

- [x] Adaptar instruções aos scripts reais e indicar inconsistências sem instalar no download.
- [x] Tornar avisos visíveis e coordenar snapshot, projeto/escopo e pedido único.
- [x] Reutilizar provas externas dos kits e ampliar casos React/convertido/materiais, sem depender de `node_modules` do monorepo.
- [x] Executar checks afetados, suíte Studio, E2E workspace/Zappy, budgets e typechecks; inspecionar UI real.
- [x] Full review do diff completo, corrigir achados e repetir verificações afetadas.
- [ ] Reconferir staging e integrar avanços; commit e merge local somente após verificação do conjunto.

## Critério final

Relatório final contém mudanças, provas, base integrada, resultados e limitações externas reais. Falhas de produto são corrigidas antes do merge. Medições não realizadas e avaliação com alunos não são anunciadas como aprovadas.

Evidência consolidada: [full review](../../../.audits/studio-pro-evolution/full-review.md). A integração Git será registrada após conferir a árvore de staging.
