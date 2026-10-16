# Demonstrações de produto no marketing — Implementation Plan

> **For agentic workers:** executar com `executing-plans`, sequencialmente, revisando cada lote antes de avançar. Execução, reviews, commit e merge no staging local autorizados pelo usuário em 16/10/2026; não dependem de novo aceite entre lotes.

**Goal:** permitir que a equipe peça demonstrações visuais de fontes reais, com receitas reproduzíveis no Player e no render existente, preservando evidência, revisão e aprovação.

**Architecture:** extensão aditiva dos contratos de vídeo existentes; receitas Remotion mantidas, sem novo motor, serviço, catálogo editorial ou executor. Evidências e assets continuam no serviço central. A autoria de código arbitrário e a prova física com dois computadores são pendências registradas da reforma principal; esta entrega não as declara resolvidas por receitas parametrizadas.

**Tech Stack:** TypeScript, Zod 4, React 19, Remotion 4.0.535, Bun, Electron e PostgreSQL existentes.

**Spec:** [proposta revisada](../../plans/2026-10-15-flute-aproveitamento-marketing.md), subordinada à [reforma](../../plans/2026-10-15-marketing-app-fluxo-editorial-proposta.md).

## Base reconciliada

- Worktree `sistema-zero-flute`, branch `feat/marketing-demonstracoes-flute`, criada de `staging` em `b37fc3f72`.
- O staging já contém contratos, sync, requests, arte editável, timeline, render receipts, publicação e métricas. Reutilizar esses percursos.
- Estado antigo “L1–L11 pendentes” da análise Flute é histórico, não diagnóstico atual. Os reviews da reforma ainda registram lacunas de integração e isolamento de autoria de código; não fechar seus checkboxes por inferência.
- Preservar arquivos e trabalho alheios nas demais worktrees; conferir novamente o staging antes de integrar.

## Restrições globais

- Tempo do Remotion; imagens reais preservadas, sem simular trajetória de jogo com prints.
- Ajustes não geram final automaticamente. Edição aprovada continua fixando bytes e revisão.
- Schemas em `marketing-contracts`; sem dependência React/Node no protocolo.
- Fontes por evidência/revisão/asset/hash, autorizadas pelo projeto; nenhuma URL local persistida.
- Escopo de cena/texto/efeito validado no servidor; source facts não são criados pela resposta de IA.
- Remotion nativo é a implementação padrão. Flute não é requisito; rejeitar contornos para seu fundo preto e dependências internas.

## Lote F1 — Contratos e integridade da demonstração

**Arquivos:** `marketing-contracts/src/demonstration.ts`, `video.ts`, `index.ts`; testes de contrato; `marketing/src/domain/workspace/demonstration.ts`, `references.ts`, `video-proposal.ts`; validação de referências/contexto/aprovação no repositório existente.

**Interfaces:** `demonstrationSchema` descreve três receitas e suas fontes; `demonstrationSources(timeline)` extrai dependências. Cada fonte tem ID estável, evidência, revisão, asset/hash, rótulo e região de foco normalizada. `validateDemonstrationSources` verifica vínculo factual e conteúdo confirmado. Campo opcional em clipe de imagem mantém documentos antigos legíveis.

- [x] Testar receita/contagem/região inválidas, dependências secundárias, hash, evidência e fonte fora do projeto.
- [x] Implementar schemas e coleta de refs; validar nas gravações diretas e resultados de IA.
- [x] Incluir fontes congeladas no contexto e evidências atuais na aprovação/revalidação existente.
- [x] Executar testes/typecheck; revisar compatibilidade, autorização, versões e ausência de duplicação. [Review F1](../../../.audits/marketing-demonstracoes-flute-2026-10-16/F1-review.md).

## Lote F2 — Composições e revisão visual

**Arquivos:** `marketing-production/src/video/demonstration.tsx`, `demonstration-motion.ts`, composição e testes; provas do desktop.

**Interfaces:** `DemonstrationScene` consome contrato e URLs resolvidas; `demonstrationFrame` calcula estado apenas do frame local. Três receitas: detalhe → contexto; regra → resultado; antes → alteração → depois. Um componente compartilhado atende 9:16 e 4:5, sem três motores.

- [x] Testar extremos, busca fora de ordem, duração e preservação das fontes.
- [x] Compor imagens com `Img`, contain, foco destacado e texto conferido pelo preflight existente.
- [x] Usar as mesmas props no Player e no bundle; falha de asset interrompe render.
- [x] Executar testes/typecheck e review de enquadramento, legibilidade e tempo. [Review F2](../../../.audits/marketing-demonstracoes-flute-2026-10-16/F2-review.md); inspeção de renders em F4.

## Lote F3 — Produção assistida e operação no app

**Arquivos:** guia de demonstração em `marketing-production`; `provider-video-schema.ts`, `execution/video-edit.ts`; `request-panel.tsx`, `video-preview.tsx`; testes de transporte e domínio.

**Interfaces:** guia deriva receitas/schemas e fontes do contexto congelado, consumido pelo executor atual. O workbench oferece exemplos de pedidos e identifica fontes da prévia. Schema nativo transforma null de transporte sem mudar o contrato persistido.

- [x] Testar round-trip da saída nativa e rejeição de fonte inventada ou alteração fora do alvo.
- [x] Disponibilizar receitas no pedido em linguagem natural; manter limites, variantes e aplicação existentes.
- [x] Exibir o que precisa de conferência e revisão exata; nenhuma promessa de captura em movimento a partir de imagem.
- [x] Executar testes e review do percurso request → resultado → prévia → render/edição.

## Lote F4 — Evidências e full review

**Arquivos:** script reproduzível de prova visual; `.audits/marketing-demonstracoes-flute-2026-10-16/`; atualização factual da proposta.

- [x] Usar capturas reais de P07/P08 com hashes/origens; não atribuir aprovação de campanha a fixtures.
- [x] Renderizar dimensões e frames críticos, incluindo ordem inversa e final MP4; inspecionar imagens.
- [x] Exercitar regressão dos pacotes afetados, integração PostgreSQL quando disponível, builds web/desktop e fronteiras de transporte.
- [x] Fazer full review da diferença, corrigir achados e repetir apenas verificações afetadas.
- [x] Registrar resultados e limites externos com honestidade; decidir sobre Flute conforme proposta.
- [x] Commit da implementação revisada; atualizar a branch sobre o staging local se avançar; testar conflitos resolvidos; merge local e conferir estado final. Implementação `2816e277b`, integrada sobre `3511cd6c6` sem conflitos; árvore de código do merge conferida contra a árvore testada.

## Critério de conclusão

Receitas acessíveis no fluxo existente, validação central de fontes/escopo, prévia e render demonstrados, reviews por lote e final, evidência de testes e merge local. A entrega não marca como comprovados assinatura/login, R2, duas máquinas físicas ou autoria de código isolado se não foram exercitados; esses critérios permanecem com seus donos no plano principal.

Review F3: [registro](../../../.audits/marketing-demonstracoes-flute-2026-10-16/F3-review.md). Review F4 e final: [registro e limites](../../../.audits/marketing-demonstracoes-flute-2026-10-16/full-review.md). Base atualizada para staging 3511cd6c6 antes dos builds e regressão finais, sem conflitos.

Revisão posterior à integração: [segundo full review](../../../.audits/marketing-demonstracoes-flute-2026-10-16/second-full-review.md), iniciado sobre staging `4db993ba8`. Corrige orientação/dimensões das fontes, duplicação de referências, limites multimodais e edição textual invisível, conservando os critérios de aceite e limites externos deste plano.
