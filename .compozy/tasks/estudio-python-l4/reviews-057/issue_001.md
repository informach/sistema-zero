---
status: resolved
file: packages/studio-language-service/src/index.ts
line: 261
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Cancelamento sem política renova a sessão nativa ociosa

## Review Comment

O BFF permite `cancel` e `dispose` sem consultar Members, para reduzir recursos depois da perda de acesso. Porém `PythonLanguageOwner.command` atualiza `used_ms` incondicionalmente antes de encaminhar qualquer comando; `runtime/http.ts` também reinicia o timer de idle para qualquer comando analisado. Um titular já revogado, ainda autenticado e conhecendo seu próprio contexto/sessionId, pode enviar `cancel` com um `requestId` inexistente a cada poucos minutos e manter o container e o slot ativos até o teto absoluto de duas horas. A limpeza vira uma renovação de lease sem reautorização. O isolamento por owner/binding e o teto absoluto continuam válidos; não há acesso a consultas ou fontes por essa via.

Prova independente em `packages/studio-language-service/.cache/review057-analysis-lifecycle.test.ts`, teste `candidate: policy-free cancellation renews...`, usa a implementação real do DO e SQLite, com somente a fronteira Cloudflare/Sandbox controlada. Abrir/iniciar sessão; envelhecer `used_ms` para cerca de 4m50; enviar cancel para pedido inexistente. O comando retorna 200 e `used_ms` avança quase cinco minutos, conservando `phase=ready`. Comando: `bun test ./.cache/review057-analysis-lifecycle.test.ts --test-name-pattern 'candidate:'`: 1 pass, 0 fail, 5 verificações, exit0. O BFF permanente e a prova independente de transporte confirmam que esse caminho não consulta Members depois da revogação; o parser rejeita source/capabilities extras. A leitura de `runtime/http.ts` confirma a segunda renovação do timer nativo.

Não renovar idle/lease ao processar cancelamento ou descarte, preservando sua disponibilidade e os fences de binding/owner. Somente uma operação que atravessou a política fresca deve renovar a sessão. Cobrir cancelamento legítimo e de ID inexistente próximos do idle, consultas autorizadas que ainda renovam, expiração/DELETE e a ordenação com trabalho em voo; garantir que o container não fique disponível por mais tempo apenas por pedidos de limpeza.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente. BFF deriva o header interno `x-studio-python-operation` exclusivamente do comando já analisado; Worker e DO validam seu enum antes de executar, e DO não renova used_ms em cancel/dispose. O serviço HTTP nativo usa o comando real para conservar o timer de idle nesses dois casos. Reprodutor convertido ao comportamento correto usando a entrada Worker real com token/header interno: `bun test ./.cache/review057-analysis-lifecycle.test.ts` em studio-language-service — 10 pass, 0 fail, 72 verificações, exit0. Cancel/dispose mantêm used_ms intacto; query ainda renova; header ausente/inválido é negado sem renovar; alarm fecha a sessão ociosa; binding e migração, cancelamento/drain e close preservados. Prova BFF independente `bun test ./.cache/review057-language-auth.test.ts` em member-shell — 9 pass, 0 fail, 84 verificações, exit0: header forjado no browser não transforma cancel em query nem libera query revogada, cancel não carrega fonte/grants, request abortado durante Members não chega ao serviço e outro contexto autorizado produz binding distinto. Permanente worker+HTTP Node (`bun test ./worker-tests/lifecycle.test.ts ./tests/http.test.ts`) — 11 pass/61 verificações, exit0, incluindo timer nativo cancel versus query. Core binding 4 pass/18 verificações e Members HTTP 2 pass/20 verificações, exit0. Biome das sete implementações centrais passou após formatação do implementador. Sem alterações de produção pelo revisor, navegador/TSC/build de aplicação/SQL externo ou alegação de desempenho/ativação nos hosts. A geometria intermitente do palco público permanece separada deste review.
