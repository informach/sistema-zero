---
status: resolved
file: packages/member-shell/src/routes/studio-zappy.ts
line: 190
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Zappy recusa IDs Python válidos pelo contrato compartilhado

## Review Comment

O novo ContextualHistoryBody e o corpo da pergunta usam a expressão local legada de ID, exigindo primeiro caractere alfanumérico. `_game` e `-game` são IDs válidos do Core e podem identificar projetos Python portáveis existentes, mas recebem400 antes da autorização contextual; histórico e ajuda ficam indisponíveis. É um consumidor novo do contrato, distinto da053, que corrigiu a persistência/leitura de publicações. O DTO Members `STUDIO_LOCAL_PROJECT_ID` tem a mesma restrição e também precisa admitir os IDs compartilhados nas operações de conversa.

Prova independente Shell `.cache/review061-project-ids.test.ts`: documentos PythonPro Core-válidos para os dois prefixos recebem decisão200 dos serviços reais FreeAccess/FreeRuntime/Analysis/policy; as rotas de historyPOST e ask recusam ambos400 antes de consultar policy ou reservar pergunta. Teste original:1 pass,0 fail,14 verificações,exit0. As operações de histórico/reserva no boundary Members são stubs; esta prova não atravessa o DTO HTTP, cuja restrição foi confirmada por leitura.

Alinhar as admissões novas ao validador Core sem restringir o contrato JavaScript antigo. O primeiro fix que substituiu todos os IDs pelo Core estrito introduziu regressão: GET histórico de `old.game` e `old:game`, antes aceitos, passa a devolver400 para ator autorizado. Cache `.cache/review061-legacy-js-id.test.ts`:1 pass,0 fail,3 verificações,exit0 afirmando a regressão. Conservar a união explícita dos IDs compartilhados e legados nas chaves de conversa; contexto/sujeito Python permanecem estritamente validados pelo Core. Cobrir prefixos válidos e inválidos em ambas as bordas HTTP, preservando IDs legados de JS em pergunta/histórico/exclusão/feedback.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou como consumidor novo e corrigiu ambas as bordas com STUDIO_READABLE_PROJECT_ID_PATTERN compartilhado: união derivada do Core estrito e contrato JS legado. O Core estrito e sujeito/authorization/contextual-history Python permanecem inalterados. Revalidação independente: prefixos _game/-game recebem autorizaçãoFree real, historyPOST200 e pergunta Python determinística200; GET legado old.game/old:game preservado200. Combinado dos três caches Shell (IDsFree,legado,adapter) com permanentes BFFPython/JS/native:95 pass,0 fail,513 verificações,exit0. Elysia real com os DTOs de produção history/reserve/feedback admite os quatro IDs e rejeita _bad.dot,/bad,bad id em todas as rotas:1 pass,0 fail,21 verificações,exit0. Prova do adapter real confirmaPOSTcontextual nas três operações, authmetadata idêntica, signal do owner e propagação403 sem GETfallback. Biome8 arquivos do recorte/fix:exit0,sem alterações. Revisor somente lê produção; sem browser/build/TSC/SQL/modelo remoto. Persistência da linguagem da conversa em desenvolvimento permanece fora deste recorte.
