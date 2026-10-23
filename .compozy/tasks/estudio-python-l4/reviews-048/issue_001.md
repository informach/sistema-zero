---
status: resolved
file: packages/member-shell/src/components/live/live-workspace.tsx
line: 705
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Handoff conhecido espera autorização antes de revogar runtime

## Review Comment

O poll recebe o workspace com outro escritor/dispositivo ou epoch, mas aguarda `queue.current` antes de `apply`/`remember`. A nova integração passou a colocar a autorização de runtime nessa mesma fila. Se uma autorização HTTP anterior ainda está pendente, o host mantém `editing=true` e a autoridade do interpretador anterior viva, embora já tenha recebido a prova de perda de autoria. O aborto do hook só ocorre depois que essa requisição antiga termina e o snapshot remoto finalmente é aplicado.

Reprodução independente: `bun test --tsconfig-override .cache/studio-python-l0/review048.tsconfig.json ./.cache/studio-python-l0/review048-poll.test.tsx` — 1 pass, 0 fail, 6 verificações, exit 0 (o teste confirma o sintoma). Monta `LiveContinuedWorkspace`, `WorkspaceEditor`, hook, factory e transporte reais, substituindo StudioEditor, journal e HTTP para controlar a ordem sem iniciar navegador. Depois que o poll recebe `writerEpoch:2` e outro dispositivo, a saída é `changedPolled=true`, `authorityAborted=false`, `editingAccess='author'`. Só ao liberar a resposta antiga o signal é abortado. O caso usa biblioteca, mas a fila e a aplicação são compartilhadas com a sala/ajuda.

Separar revogação da autoridade da aplicação ordenada do documento. Assim que uma resposta válida do poll comprovar perda de escritor/epoch/dispositivo, leitura apenas ou lease encerrado, bloquear edição/autoridade antes de esperar a fila; preservar a ordenação de fontes, confirmações e journal. Não resolver antecipando `latest/project` nem aplicando snapshot sobre saves em andamento. Cobrir uma autorização pendente durante handoff e provar que sua resposta tardia não restaura runtime/autoria, sem descartar o trabalho local.

## Triage

- Decision: `FIXED`
- Notes: O hook expõe invalidação estável e síncrona por AbortController; o poll a chama e retira autoria antes de esperar a fila quando recebe perda válida de escritor/epoch/dispositivo ou readOnly, ignorando epochs anteriores. A aplicação do snapshot continua ordenada. O transporte reconfere escritor/lease/sinal após a resposta, comparando a revisão recebida com a capturada no pedido, sem confundi-la com um autosave posterior. Produção permaneceu somente leitura para o revisor.

## Revalidation

- `bun test --tsconfig-override .cache/studio-python-l0/review048.tsconfig.json ./.cache/studio-python-l0/review048-poll-revalidate.test.tsx` — 1 pass, 0 fail, 10 verificações, exit 0. Mesma composição real do teste original: após o poll observar o novo dono, antes de liberar a autorização antiga, `authorityAborted=true`, `editingAccess='observer'`, ambiente ausente e `applied=1`. A resposta tardia rejeita; depois a aplicação ordenada avança, sem restaurar a autoridade.
- `bun .cache/studio-python-l0/review048-transport-revalidate.ts` — exit 0. Cinco mudanças de autoridade ocorridas durante o HTTP (epoch, dispositivo, escritor, readOnly e lease) retornam `LIVE_AUTHORITY_CHANGED`/409 e deixam a fila drenável. Um avanço somente de revisão continua aceito contra a revisão capturada antes do HTTP, preservando o comportamento contratado de autosave.
- `bun test tests/live-studio-runtime-hook.test.tsx`, em member-shell — 3 pass, 0 fail, 24 verificações, exit 0. Mantidos fila/CAS, identidade da instância entre save/renovação, expiração, handoff e recusa não JSON.
- O harness React emite o aviso interno `directory mismatch` do Bun ao usar tsconfig externo. Não houve navegador, TSC, build nem SQL nesta revisão. Esta prova não qualifica o engine real com duas pessoas nem o desempenho da oficina; cobre a composição de autoridade/fila e a recusa de respostas tardias.
