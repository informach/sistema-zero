---
status: resolved
file: packages/member-shell/src/lib/pinta-cloud-persistence.ts
line: 368
severity: high
author: codex
provider_ref:
---

# Issue 023: Reinício após quota permite ao cliente novo subir o cache cortado como formato atual

## Triage

- Decision: `VALID`.
- Reproduzido com storage que conserva a marca confirmada revisão 2, mas recusa a chave nova de memória de formato por quota. Espelho 1 confirma mapa nativo 5/nuvem 4. Após descarte do espelho e do registry de marcas, leitor legado deixa cache de envelope 1 e timestamp novo; espelho 2 sem memória produz upload com `baseRevision:2` e `formatVersion:4` (CAS válido), sobrescrevendo o documento completo.
- Segundo teste red confirma que abrir o cache e editar no espelho 2 também mascara o corte pela assinatura da nova gravação.
- Correção: preservar o snapshot/floor observado antes da primeira gravação quando a proveniência é desconhecida e há revisão sincronizada; consultar o remoto somente no produtor. Comparar o floor remoto com a base observada, não com a assinatura nova, e reutilizar a recuperação existente com a resposta já baixada. Falha de rede conserva a incerteza e rejeita o produtor para retry; autosave permanece local. Legado comprovado é verificado uma vez por instância; assets sem marca não baixam nada.
- Escopo: somente espelho Pinta e testes de quota/nuvem. Formatos 5/4, UI, runtime, Molda e motores permanecem congelados. Sem commits; gate amplo coordenado pelo parent.

## Fix

- Snapshots de proveniência por id são observados ao carregar/listar ou antes do primeiro save, somente para tipos versionados com revisão previamente confirmada e sem floor confiável. A leitura pré-save é local e uma falha nela mantém a proveniência desconhecida; rede não entra no autosave.
- O produtor confere e valida a versão remota antes de emitir qualquer snapshot. A comparação usa a base anterior à assinatura nova: editar um cache cortado não o autentica como íntegro. Falha de download mantém essa base e rejeita o produtor para retry da fila existente.
- Recuperação reutiliza `resolveLostFormat`, passando o download já validado: uma consulta restaura o original completo e conserva a edição local na cópia, sem duplicar RPC.
- Um legado comprovado é lembrado durante a vida do espelho; não é baixado a cada save. Uma assinatura persistida de schema zero só prova floor zero se coincide com o commit confirmado; assinatura não confirmada de sessão anterior continua exigindo conferência.
- Rebaixamentos assinados sobre base canônica conhecida continuam permitidos; o fallback de quota retém a assinatura na mesma instância. Asset sem marca confirmada não faz download.

## Verification

Red: dois cenários novos devolveram indevidamente envelope 1 com `baseRevision:2` e `formatVersion:4`, com timestamps 2000 e 3000 (edição nova), respectivamente.

Green após todas as alterações de fonte:

- `bun test tests/pinta-cloud-persistence.test.ts` em community-kids: `60 pass`, `0 fail`, `349 expect() calls`, 1,82 s.
- `bun test tests/pinta-format-memory.test.ts` em member-shell: `4 pass`, `0 fail`, `8 expect() calls`, 96 ms.
- Sete casos novos cobrem reinício com memória perdida por quota, nova edição antes do produtor, rede falhando com autosave local/retry, assinatura legítima durante quota, rebaixamento após load canônico 5, legado consultado uma vez e assinatura zero não confirmada de sessão anterior.
- O caso antigo de asset nunca sincronizado foi mantido e agora exige explicitamente zero downloads. Testes de quota usam storage simulado, não quota física de dispositivo.
- Biome e `git diff --check` nos dois arquivos alterados, sem erros. Gate amplo/E2E ficam com o parent. Nenhum commit criado.

## Fechamento da rodada

Reinício após quota, edição antes do produtor, assinatura zero não confirmada e retry cobertos na suíte completa de nuvem do community-kids; sem rede no autosave.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
