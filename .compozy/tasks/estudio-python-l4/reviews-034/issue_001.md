---
status: resolved
file: packages/studio-language-service/src/index.ts
line: 139
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Cancelar a abertura deixa sessões inacessíveis até o TTL

## Review Comment

A abertura reserva uma lease e inicia o contêiner antes de devolver seu identificador. O RPC `open(projectId)` não recebe um identificador recuperável da tentativa nem oferece confirmação de posse pelo cliente. Se a requisição é cancelada nesse intervalo, a inicialização ainda pode concluir e tornar a lease `ready`, mas o cliente perdeu a única resposta que permitiria chamar DELETE. O BFF combina `request.signal` ao fetch e o provider HTTP simplesmente propaga o aborto; nenhum deles consegue recuperar o ID perdido. A verificação de geração no cliente fecha handles tardios somente quando o provider efetivamente resolve, o que não ocorre quando fetch rejeita por aborto.

Duas trocas/fechamentos de editor durante o boot ocupam as duas vagas do proprietário por até cinco minutos. A tentativa seguinte recebe `session-limit`, embora nenhum editor mantenha uma conexão utilizável. Além da indisponibilidade, ficam dois processos pagos sem proprietário ativo. O TTL limita a duração, mas não constitui encerramento do ciclo cancelado.

Reprodução independente em `.cache/studio-python-l0/review034-lifecycle.ts`: executa `PythonLanguageOwner`, o roteador Worker e `createPythonLanguageHttpProvider` reais, com SQLite síncrono e somente APIs da plataforma/contêiner substituídas. Segura `waitForPort`, cancela o fetch, libera a inicialização e repete. Resultado: duas linhas `ready`, `started=2`, `destroyed=0`, `deletes=0`, e a terceira abertura recusada. Esta prova verifica a lógica do protocolo, não uma implantação Cloudflare real.

Dar identidade recuperável à operação antes do trabalho remoto e tornar criação/encerramento idempotentes, ou separar reserva e confirmação com expiração curta do estado não confirmado. Um cancelamento conhecido deve poder encerrar a tentativa mesmo antes de o boot terminar; a continuação tardia não pode ressuscitar uma lease encerrada. Cobrir cancelamento antes/depois da reserva, perda da resposta e fechamento durante a inicialização. Arquivos relacionados: `packages/member-shell/src/routes/studio-python-language.ts` e `packages/studio/src/python/language/httpProvider.ts`.

## Triage

- Decision: `VALID`
- Notes: Corrigido por reserva barata separada do início, limpeza pelo ID e coordenação do fechamento com operações reais do SDK. Revalidação independente abaixo. Não é falha de isolamento entre proprietários.

## Verification

- `bun run .cache/studio-python-l0/review034-lifecycle.ts`: exit 0; `{"case":"aborted-open-retains-leases","rows":[{"phase":"ready"},{"phase":"ready"}],"started":2,"destroyed":0,"deletes":0,"thirdOpened":false}`.

## Revalidation

- `bun run .cache/studio-python-l0/review034-revalidate.ts`: exit 0. O provider termina de ler o ID da reserva mesmo se o caller cancelar; a prova segura essa resposta, cancela o caller e verifica POST `/open` seguido de um DELETE, zero leases e nenhuma chamada ao contêiner.
- Cancelamento durante `startProcess`, `waitForPort` e health check: a lease permanece `closing` enquanto o SDK está pendente. Após liberar a operação real, cada caso termina com exatamente um `destroy`, zero leases e nenhuma chamada capaz de reiniciar o contêiner depois da destruição.
- Dois `start` simultâneos compartilham um boot. Dois `close` simultâneos compartilham uma destruição. Um `containerFetch` de comando que ignora aborto mantém a lease ocupada até terminar; recebe aborto no sinal, responde 410 ao concluir tardiamente e é seguido de `destroy` único.
- Simulação de resposta de reserva perdida seguida de expiração aos 31 segundos: zero leases e nenhum contato com o contêiner. A perda real dessa resposta pode conservar uma reserva por até 30 segundos, sem CPU, conforme o contrato revisado.
- A prova usa os módulos de gateway/provider reais e SQLite síncrono. Apenas Durable Object/SDK/transporte são substituídos com operações controladas. Não certifica comportamento de uma implantação Cloudflare nem limites reais de latência do SDK.
