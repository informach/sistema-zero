---
status: resolved
file: packages/studio/src/components/layout/ShareDialog.tsx
line: 278
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Python Clássico perde o vínculo com o histórico publicado

## Review Comment

O servidor já publica Python Clássico pelo mesmo registro durável com revisões/CAS/restore/disable do Python Pro, conforme o plano `2026-10-17-studio-public-python.md`. Porém `doPublish` só conserva `res.publicationId` quando `latest.kind === 'pro'`, via `setProPublication`, e a renderização do histórico também exige `project.kind === 'pro' && project.proMeta?.publication`. O documento Python Clássico não possui outro campo para esse vínculo. Após publicar com sucesso e reabrir Compartilhar, a criança perdeu o caminho para publicar uma nova revisão no mesmo link, restaurar uma anterior ou desativá-lo. Publicar novamente cria outra publicação, em vez de operar o histórico da existente. A generalização dos tipos do adapter/histórico não alcança esse fluxo.

Reprodução independente com ShareDialog/store/factory de documento reais em `packages/studio/.cache/review054-classic-history.test.tsx`: publicar Python Classic com adapter que devolve `publicationId`, conferir sucesso/Copiar link e reabrir modal. O ID não está mais no documento, `publication.get` nunca foi chamado e os controles de histórico/update/disable estão ausentes. `bun test ./.cache/review054-classic-history.test.tsx`, em `packages/studio`: 1 pass, 0 fail, 6 verificações, exit0, sem avisos. O teste afirma a lacuna observada para documentar a reprodução.

Persistir um vínculo de publicação recuperável também no Python Clássico e usar esse vínculo para montar o histórico comum. Tratar esse metadado somente como referência local: autorização/owner/revisão continuam no servidor, e a projeção pública/remix deve retirar vínculos privados conforme o contrato. Cobrir publicação, fechar/reabrir e persistir/recarregar, update no mesmo link, restore e disable em Python Clássico, preservando o comportamento legado do JavaScript Clássico.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente. Python Clássico conserva `publication.playId` no documento/partições/IDB e monta o histórico comum; projeção pública, importação, duplicação e promoção retiram o vínculo da cópia. Share guarda a resposta commitada para repetir somente o save local e vincula esse recibo à lifetime do modal. Cache `packages/studio/.cache/review054-classic-history.test.tsx` foi convertido para o comportamento correto: publicação/reabertura, troca de projeto durante save e A→B→A durante persistência sem sucesso tardio ou reaproveitamento indevido após reabrir. A hipótese transitória de recibo antigo foi eliminada pelo reset/lifetime antes do teste final; não originou novo achado. Prova própria conjunta com player: `bun test ./.cache/review054-classic-history.test.tsx ./.cache/review054-player.test.tsx` — 9 pass, 0 fail, 61 verificações, exit0, sem avisos. Suíte permanente de store/partições/Share/history/player/buffer: 53 pass, 0 fail, 319 verificações; cobre IDB reload, update/restore/disable, falha de save e retry sem republicar. BFF público/publicação: 15 pass, 0 fail, 194 verificações. Nenhuma produção modificada pelo revisor; sem claim de navegador ou desempenho.
