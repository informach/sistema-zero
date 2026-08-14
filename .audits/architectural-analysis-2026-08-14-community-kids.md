# Full review — Community Kids

**Data:** 2026-08-14  
**Snapshot final verificado:** 2026-08-14T07:08:08-03:00  
**Escopo:** `packages/community-kids`, integrações em `packages/members` e contratos de `packages/member-shell`  
**Parecer:** **APROVADO — TODOS OS ACHADOS CORRIGIDOS**  
**Achados encerrados:** 1 alto, 3 médios, 1 baixo

## Resumo executivo

Os cinco achados do review foram corrigidos na raiz. O chrome global não transfere mais a união completa de blocos em toda navegação: a gamificação kids traz somente uma revisão SHA-256 curta, e o cliente busca o snapshot completo por uma rota BFF apenas quando essa revisão muda. A checagem de acesso passou a ser deduplicada no request.

O contrato agora preserva explicitamente os estados `true`, `false` e desconhecido; falhas não apagam o baseline. A identidade persistida deixou de ser o nome editorial da gaveta e passou a ser o ID estável de cada bloco, em um formato versionado e atômico. Falhas de rede ou storage das ferramentas não consomem mais a celebração de nível. Por fim, todas as declarações do PDF.js foram elevadas à versão corrigida e o lockfile resolve `6.2.108`.

## Achados encerrados

### [RESOLVIDO] SEC-01 — PDF.js afetado

- `pdfjs-dist` foi atualizado de `^6.0.227` para `^6.2.108` em Admin, Community, Community Kids e Member Shell.
- `bun.lock` resolve `pdfjs-dist@6.2.108`.
- `bun audit --prod` não lista mais `pdfjs-dist` nem o advisory correspondente. O audit global ainda reporta 32 ocorrências de outros workspaces, fora dos achados deste review.

### [RESOLVIDO] PERF-01 — unlocks pesados no layout global

- `CelebrationChrome` não importa nem chama mais `getStudioUnlocksReadonly` ou `drawersForBlocks`.
- O Members calcula `studioUnlockRevision` a partir dos cursos qualificados e de `courses.updatedAt`, sem ler o JSON de blocos.
- O navegador chama `/api/members/studio-unlock-drawers` somente quando a revisão muda; navegação normal com a mesma revisão faz zero fetches desse payload.
- `checkStudioAccessReadonly` agora usa cache request-scoped no Member Shell.
- A rota BFF valida a posse antes de executar a consulta pesada.

### [RESOLVIDO] COR-01 — falha confundida com estado vazio

- O layout mantém três estados de acesso: `true`, `false` e `null` para indisponível/malformado.
- Revisão ausente, acesso desconhecido e produto não adquirido não leem, apagam nem substituem o snapshot salvo.
- Resposta inválida ou erro da BFF não atualiza o baseline.
- Falha apenas no cálculo da revisão degrada para campo ausente sem derrubar `/gamification/me`.

### [RESOLVIDO] COR-02 — nome mutável como identidade

- O storage passou para `{ version: 2, revision, blockIds }`.
- O diff usa IDs de bloco; o nome da gaveta serve somente para a mensagem da interface.
- O formato anterior é tratado como primeira visita e migrado sem celebração retroativa.
- Há regressão explícita provando que renomear a gaveta com os mesmos blocos não gera conquista.

### [RESOLVIDO] ROB-01 — falha de storage consumia celebração de nível

- Detecção/persistência de nível e ferramentas foram separadas.
- Rede, JSON ou `localStorage` indisponível no fluxo de ferramentas não impede o overlay de nível já detectado.
- O watcher aborta a requisição ao desmontar e evita atualização após cancelamento.

## Verificação executada

| Gate | Resultado |
|---|---|
| Community Kids `biome check` | PASS — 365 arquivos |
| Community Kids testes completos | PASS — 252 testes, 0 falhas, 47 arquivos |
| Community Kids typecheck | PASS |
| Community Kids build de produção | PASS — Next.js 16.3, 52 páginas estáticas; nova rota BFF compilada |
| Members `biome check` | PASS — 292 arquivos |
| Members testes completos | PASS — 754 testes, 0 falhas, 77 arquivos |
| Members typecheck | PASS |
| Member Shell `biome check` | PASS — 128 arquivos |
| Member Shell testes completos | PASS — 326 testes, 0 falhas, 40 arquivos |
| Member Shell typecheck | PASS |
| `bun audit --prod` | PDF.js corrigido; 32 ocorrências restantes fora deste escopo |

## Escopo e limitações

- Revisão estática, testes automatizados e build de produção executados localmente.
- Sem sessão autenticada ou dados reais de produção; não houve teste manual em dispositivo físico, leitor de tela real ou pentest dinâmico.
- Alterações concorrentes já existentes no worktree foram preservadas.

## Decisão

**Aprovado quanto aos achados deste full review.** Não resta correção pendente no escopo revisado.
