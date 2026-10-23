---
status: resolved
file: packages/members/src/application/learning/section-progression.service.ts
line: 329
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Leitura de seção inicia gravação após retirada do owner

## Review Comment

checkProject cerca assertSection/read com awaitWithSignal, mas a operação interna read não recebe signal e contém múltiplas leituras seguidas de saveSectionProgress para autocompletar seções elegíveis. Retirar o owner durante uma leitura encerra a chamada externa, mas a continuação interna ainda inicia uma nova gravação ao resolver. A mesma superfície existe na autorização fresca e na leitura final; assertBlock também chama esse read e é usado por submissão/galeria. Não se trata de uma mutação SQL já admitida: o dispatch de save ocorre somente depois da retirada.

Prova independente `bun test ./.cache/review095-section-lifetime.test.ts`, cwd packages/members: original 0 pass, 1 fail, 6 expect calls, exit1; ampliada para checkProject, SubmitStudioProjectService.execute (entrega final válida após objetivo formativo) e GalleryDeliveryService.prepare: 0 pass, 3 fail, 18 expect calls, exit1. Usa serviços reais, fixture Python e baseline/policy reais, com gate somente em getSectionProgress. Um resultado estrutural previamente aprovado (projectPassed=true/completedAt=null) está elegível para o settlement normal. O caller devolve AbortError e saves=0 antes de liberar a leitura; após liberar o gate, inspeções continuam0 mas saves=1 (esperado0), e a seção é autocompletada. Gates liberados em finally. Fonte do probe é derivada de tests/integration/python-section-project.test.ts sem alterar o teste permanente.

Propagar signal opcional por read/assertSection/assertBlock e cercar cada leitura interna, com pré-dispatch fence no settlement/save. Encaminhar o signal de operação nos consumidores Python e nos consumidores compartilhados de submissão/galeria; preservar o comportamento legítimo de settle e JS. Um wrapper externo adicional ou abandonar a gravação de autocompletion não resolve a propriedade de lifetime.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente do patch estável: read recebe options.signal e usa owned nas leituras/Promise.all/modalidade/draftStates e no dispatch save; assertSection/assertBlock/accessibleBlockIds propagam signal. checkProject inicial/autorização fresca45s/leitura final, Submit inicial/fresh e Gallery.prepare passam o signal da operação. Probe original ampliado manteve os mesmos três cenários e passou, sem gravação depois da liberação tardia nem alteração de completedAt. Combinado independente de probes e permanentes: 34 pass, 0 fail, 199 expect calls, exit0; Biome4 clean. Os três casos foram portados para tests/integration/python-section-project.test.ts e lidos, sem excluir regressões JS/settle. Não duplica092: ali foram corrigidas portas diretamente aguardadas pelo SubmitStudioProjectService; aqui o workflow compartilhado read fazia efeitos posteriores internamente. Não duplica094 nem a pendência conhecida de galeria Python/tree/assets. Prova de serviços reais com repositório em memória; não afirma cancelamento SQL/Cloudflare/SDK/UI novos.
