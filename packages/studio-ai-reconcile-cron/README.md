# Reconciliação da IA do Estúdio

Worker exclusivo para chamar a rota privada de reconciliação no BFF Kids a cada
minuto. Essa rota consulta o uso de gerações já existentes e faz a limpeza de
revisões vencidas do construtor. Não executa inferência. O contrato do serviço está
em [IA do Estúdio](../members/docs/studio-ai.md).

| Ambiente | Worker | Destino exato do POST |
| --- | --- | --- |
| staging | `sistemazero-studio-ai-reconcile-staging` | `https://community-kids-staging.up.railway.app/api/internal/studio-ai/reconcile` |
| production | `sistemazero-studio-ai-reconcile-production` | `https://kids.sistemazero.com.br/api/internal/studio-ai/reconcile` |

Cada Worker tem seu próprio `STUDIO_AI_RECONCILE_CRON_SECRET`, igual ao segredo do
BFF Kids do mesmo ambiente. O código recusa combinações divergentes de ambiente
e origem antes de enviar o bearer. O ambiente padrão é inerte, sem cron; é
obrigatório escolher um ambiente nomeado. `workers.dev` e URLs de preview estão
desabilitados, e o handler HTTP sempre responde 404.

## Limites e observação

Cada agendamento faz um único POST, com `redirect: 'error'`, prazo total de
25 segundos e resposta de até 4 KiB. O prazo cobre conexão e leitura do corpo.
Não há retry imediato. Abortar a espera não prova que o BFF cancelou o trabalho;
uma resposta perdida continua sem confirmação. A próxima execução usa a rota
existente, cuja autoridade de claim, lease e settlement permanece no Members.

A resposta precisa ser HTTP 200 e JSON com exatamente `confirmed`, `pending` e
`expiredBuilderJobs`. As duas primeiras contagens são inteiras não negativas e
somam no máximo quatro; a limpeza aceita de zero a cem revisões, ou `null` quando
não foi confirmada. Campos adicionais, respostas malformadas e contagens fora do
contrato são recusados.

Os logs da aplicação contêm somente `event`, `environment`, `state` e os campos
validados do estado: `reason`, status HTTP ou as três contagens. Não incluem
URLs, headers, credenciais, mensagens de exceção ou corpos de resposta.

- `reconciled`: consulta e limpeza confirmadas, sem uso pendente nesta chamada.
- `pending`: existe uso pendente ou a limpeza retornou `null`; exige observação.
- `skipped`, `http-error`, `invalid-response` ou `unconfirmed`: a execução não
  confirmou o resultado; conferir configuração, saúde do BFF e Members.

Um resultado sem pendências nesta chamada não prova que o ledger inteiro está
reconciliado. O Worker não altera custos nem interpreta timeout como custo zero.
O cron de limpeza de criações em `creation-cleanup-cron` continua separado, a
cada cinco minutos. Este Worker não gerencia salas, gravações ou mídia ao vivo.

## Verificação local

Na raiz do repositório, com Bun 1.3.11 e Node 24:

```sh
bun install --frozen-lockfile --ignore-scripts
bun test packages/studio-ai-reconcile-cron/tests scripts/ci/railway-config.test.ts
bun run --filter @sistemazero/studio-ai-reconcile-cron typecheck
bun run --filter @sistemazero/studio-ai-reconcile-cron check
node packages/studio-ai-reconcile-cron/node_modules/wrangler/bin/wrangler.js types packages/studio-ai-reconcile-cron/worker-configuration.d.ts --config packages/studio-ai-reconcile-cron/wrangler.jsonc --include-runtime=false --check
```

`worker-configuration.d.ts` é gerado pelo Wrangler 4.120.1 fixado no pacote. Não
editar o arquivo manualmente. A suíte usa transportes controlados; não chama
Railway, Cloudflare nem OpenRouter.

## Ordem de ativação por ambiente

1. Provisionar o segredo ausente do BFF Kids, sem substituir um valor existente
   inesperado, e implantar a versão que contém a rota privada e sua configuração.
   Confirmar a versão saudável e a retirada da anterior pela barreira canônica
   de implantação.
2. Validar no ambiente de destino a rota autenticada e a recusa sem credencial.
   Não registrar bearer, corpo de erro ou credenciais de provedor na evidência.
3. Provisionar no Worker o mesmo segredo do BFF daquele ambiente por stdin, sem
   colocá-lo em argumentos, arquivo público ou logs. Conferir o nome do Worker
   e o ambiente antes de qualquer escrita.
4. Só então implantar o ambiente nomeado. O deploy instala o cron de um minuto.
   Não há etapa automática deste pacote que antecipe a ativação ao BFF.
5. Observar a primeira execução real e guardar um recibo sanitizado com versão,
   ambiente, horário, estado e contagens. Testes locais não substituem essa prova.

Comandos de operação, executados pelo responsável pela implantação após essas
barreiras (substituir `staging` por `production` somente para a outra onda):

```sh
node packages/studio-ai-reconcile-cron/node_modules/wrangler/bin/wrangler.js secret put STUDIO_AI_RECONCILE_CRON_SECRET --config packages/studio-ai-reconcile-cron/wrangler.jsonc --env staging
node packages/studio-ai-reconcile-cron/node_modules/wrangler/bin/wrangler.js deploy --config packages/studio-ai-reconcile-cron/wrangler.jsonc --env staging
```

`secrets.required` declara o contrato e participa da geração de tipos e validação
local; não substitui conferir o segredo remoto nem a prontidão do BFF. O próprio
Worker também recusa a chamada sem segredo válido. A configuração não contém
valores secretos.

Os agendamentos usam o handler `scheduled` e `waitUntil`, conforme os
[Cron Triggers do Cloudflare](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
Mudanças de agendamento podem levar até 15 minutos para propagar; uma chamada
manual não comprova que o cron remoto já executou.
