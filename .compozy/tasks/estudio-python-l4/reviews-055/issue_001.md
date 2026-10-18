---
status: resolved
file: packages/community-kids/src/components/kids/kids-space-view-client.tsx
line: 228
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Remix em voo ignora a retirada de direitos no mesmo perfil

## Review Comment

A lifetime do remix só muda com `viewerId`/`slug`; `isCurrent` compara essa autoridade e o sinal. O callback captura `canRemix` e `remixTier` antigos. Quando o host atualiza os direitos do mesmo perfil enquanto download/discovery/autorização estão em voo, o card deixa de oferecer a ação, mas o trabalho antigo segue elegível. Uma resposta permitida da consulta anterior e sua autorização de análise tardia ainda importam o projeto novo, registram o marco, mostram sucesso e navegam para o Estúdio. O mesmo problema alcança a retirada de Pro ou do ambiente específico, não apenas a remoção total do tier. A fresh discovery continua necessária, mas uma resposta anterior não deve superar uma revogação que este host já recebeu.

Reprodução independente com KidsSpaceViewClient/validador/importação/IndexedDB reais em `packages/community-kids/.cache/review055-remix.test.tsx`, último teste: iniciar remix Python Pro com direitos válidos, segurar `/api/studio/free-options`, rerender com mesmo viewer/slug e `remixTier=null`, confirmar que o botão sumiu, então entregar a resposta anterior permitida. Mesmo assim surge um projeto no namespace do viewer e `router.push('/estudio')` é chamado. Comando em `packages/community-kids`: `bun test ./.cache/review055-remix.test.tsx --test-name-pattern 'candidate:'` — 1 pass, 0 fail, 5 verificações, exit0; o teste afirma o defeito observado. Não é bypass remoto: é conclusão local depois da revogação recebida pelo próprio host.

Vincular o trabalho em voo também aos gates atuais de remix, incluindo kind/runtime/extensões, ou revalidá-los sincronamente antes/depois das esperas e no `isCurrent` passado à importação. Revogar/cancelar quando o tier ou `canInteract` deixa de cobrir a operação; não abortar por mera referência nova de props com direitos equivalentes. Cobrir retirada total, perda de Pro e perda da release específica durante discovery/autorização/refinamento, sem escrita iniciada depois da revogação nem toast/navegação tardios. Preservar os fences existentes de perfil A→B→A, sessão e unmount.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente. A autoridade incorpora viewer/slug e o conteúdo dos direitos atuais, incluindo canRemix; guards também exigem espaço interativo/desbloqueado e ausência de forbidden/unavailable/loading. A primeira revalidação encontrou a variante Hub403 que conservava o space antigo; foi corrigida dentro desta mesma issue, junto de teaser locked. Reprodutores cache foram convertidos para o comportamento correto. `bun test ./.cache/review055-remix.test.tsx`, em `packages/community-kids`: 21 pass, 0 fail, 141 verificações, exit0, sem avisos. Cobriu tier total/Pro/runtime durante análise com grant tardio válido, perda durante refinamento antes da escrita, Hub200canInteract:false/403/locked/503 durante discovery, perfil A→B→A, unmount/storage/session, discovery retirado/revogado e Pro criação negado. Clone equivalente dos direitos durante análise conserva a operação e cria somente uma cópia exata sem publication link. Teste permanente UI atualizado: 12 pass, 0 fail, 93 verificações; helper/tier Shell: 24 pass, 0 fail, 110 verificações. Biome de cinco implementações relacionadas passou após formatação do implementador. Provas usam UI/importação/IndexedDB reais e transporte controlado; não alegam navegador, desempenho ou authSQL E2E. Nenhuma produção modificada pelo revisor.
