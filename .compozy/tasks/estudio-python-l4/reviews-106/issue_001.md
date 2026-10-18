---
status: resolved
file: packages/member-shell/src/server/studio-python-builder.ts
line: 171
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Recuperação descarta preview antes de checkpoint tardio confirmar

## Review Comment

Após perder o reply de accept(), o helper consulta get e considera qualquer !ownsPreview como recusa suficiente para descartar. Um job ainda validating, na mesma versão e com lease ativa, pode ser lido antes do checkpoint original adquirir o lock. A consulta não fecha sua CAS. O descarte então revoga a prévia e o checkpoint original pode confirmar depois uma referência já retirada. A mesma corrida existe no refresh de review quando a consulta ainda contém o preview anterior e a lease de renovação segue ativa. ACK inconclusivo também precisa dessa distinção.

Probe independente packages/member-shell/.cache/review106-python-builder-ack.test.ts: clientes Core e TCP nativo reais, recibos CPython/playtest controlados, Members/checkpoint ports controlados. accept() começa um write suspenso, perde o reply, get devolve o job na versão/lease original (validating ou review com preview antigo). O helper rejeita e chama previews/remove. Só então a prova libera e aguarda o checkpoint original: a referência efetivamente persistida fica em review, embora já descartada. Resultado0pass/2fail/118asserts exit1, sem atribuir SQL/DO/SDK/R2 real ao revisor.

Manter TTL/telemetria como ownership quando o estado ainda pode admitir a CAS original. Descartar apenas diante de recusa definitiva, como ausência autoritativa ou um estado terminal/sucessor que impeça o write original; confirmação exata transfere o preview. Cobrir o settlement tardio após a resposta de erro, não apenas o estado anterior à liberação. Novo caminho B2.7 de recuperação de ACK, distinto de104 (retirada antes da persistência) e105 (fences no aceite backend).

## Triage

- Decision: `VALID`
- Notes: VALID/resolved. Estado ativo na mesma versão é inconclusivo; envelope/identidade inválidos não viram ausência; ACK inconclusivo também consulta recuperação. Ausência explícita ou sucessor/terminal que impeça a CAS antiga permite discard. Permanentes autorizados2causais(validating/review) falharam antes0/2/122asserts e depois passam;4negativas missing-state/missing-job/foreign-id/foreign-project também passam. Todos em fixtures/studio-python-builder.cases.ts com6originais, wrapper nativo106002. Originais cache reexecutados2pass/0fail/118asserts, com2telemetrias pending esperadas e boundedjobId. Child12/696; child+JS19/742; comboHappyDOM+wrapper+JS10/74 exit0. SQL2 do implementador (l6-python-builder-ack-sql-2.log e qa/python-builder-ack.fixture.ts) conferida por leitura:2pass/0fail/35asserts, realService+repo+get+commitSQL version+1/ref persistida, em validating e refreshreview. Gate é port ANTES de repo.execute final (não advisory wait), get real observa a lease/version original e write tardio é liberado/aguardado; sem remove. Transporte Core/TCP real, relatórios/política controlados; não prova SDK/DO/R2 nem HTTPdisconnect. BFF/configuração/executor/UI ainda bloqueados ou pendentes. Nenhum produto editado pelo revisor; futuras adições de wrapper/asserts SQL ainda não atribuídas a esta prova.
