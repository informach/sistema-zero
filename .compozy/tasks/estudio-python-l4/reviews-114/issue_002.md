---
status: resolved
file: packages/studio/e2e-python-editor/live-performance.spec.ts
line: 156
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: GET opcional de rede perde uma medição já concluída

## Review Comment

Depois de obter e conferir drawing.at/clickedAt/elapsed, o teste aguarda GET /network sem prazo próprio e só depois adiciona a amostra a evidence.samples. Se o diagnóstico de rede trava/rejeita, o finally arquiva samples vazio, apesar de a medição principal já estar disponível. A falha de um contador secundário apaga o resultado positivo ou negativo que deveria ser preservado, comprometendo a série e sua auditoria.

Reprodução já observada no browser real smoke2: Chrome Pro termina timedOut após90000ms, apiRequestContext.get GET http://127.0.0.1:5297/network / Request context disposed. O erro aponta o await networkAfter posterior às verificações de tempo. O attachment live-startup-diagnostic e analysis.json possuem samples=[]; o caminho só alcança esse GET depois de calcular e validar os relógios. Não se inventa elapsed ausente nem se atribui causa ao servidor/Bun: a causa do GET pendente continua desconhecida; o defeito confirmado é perder a amostra antes dele. Artifacts em `.cache/studio-python-l0/stdlib-live-f1-smoke-2`.

Inserir a amostra principal assim que seus relógios forem validados, antes de qualquer await opcional. Dar prazo limitado às leituras dos contadores e tornar falha de rede explícita no resultado/erro, preservando o sample mesmo quando o teste falha. Não omitir silenciosamente requisitos de cold bytes e não converter medição incompleta em aprovação. Aplicar às três fases/modos, sem alterar metas nem produto.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e planejou sample imediato, contador bounded5000ms e erro visível. Medium de evidência QA; é distinto da montagem Console114001 e da retirada tracing112. Nenhum novo claim de performance ou causa exclusiva do timeout. Aguarda fix/revalidação.

### Independent revalidation in progress

Actual spec callback executed through isolated `.cache/review114-counter-runner.ts`, f1/drawing in separate Bun processes: EXIT0, four Classic/Pro cases. Second/network rejection preserves measured sample and originalnetworkError, rejectsoriginalError, confirmsboth timeout5000, closesowner. No copiedimplementation or heavybrowser. Fix causalconfirmed; administrative status remainsVALID pendingfreshbrowser/TSC as requested.


### Final independent revalidation

Resolved apenas preservação da evidência: rerun fresco dos comandos `bun ./.cache/review114-counter-runner.ts f1` e `bun ./.cache/review114-counter-runner.ts drawing` EXIT0, quatrocallbacksactualspec Classic/Pro preservam1samplecold comelapsed e networkError original, mesma Errorpropagada, ambosgets timeout5000, close1/F1CDPdetach1. Smoke3 realChromePro também preserva10825.2001953125ms +networkError timeout5000, antesapagava sample. FreshStudioTSC68865 log l8-live-f1-typecheck-1 registra Exit code0, lido. Causa do GETpendente continuaaberta; falha é visível e não vira aprovação, metasinalteradas.
