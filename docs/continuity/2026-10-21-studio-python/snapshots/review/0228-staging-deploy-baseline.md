# Baseline do deploy de staging

O push calcula o diff desde a última onda ancestral com CI e `deploy-staging`
bem-sucedidos na mesma execução/tentativa. Isso mantém alterações de pushes cujo
deploy falhou. `event.before` não representa essa garantia.

O resolvedor roda logo após o checkout completo, antes da instalação e de qualquer
acesso a provedores. Falta de bootstrap, erro de Git/GitHub, metadados inconsistentes
ou paginação incompleta recusam o deploy sem produzir um seletor alternativo.

## Ativação e bootstrap

O commit que introduz `.github/staging-deploy-epoch-v1.json` deve também ativar o
resolvedor no workflow. O helper pode ser integrado antes, sem esse arquivo. O Git
determina o commit de introdução; seu blob deve permanecer igual. Assim não há SHA
autorreferente, e ondas com o seletor antigo não se tornam baselines posteriores.

A primeira ativação requer `.github/staging-deploy-bootstrap-v1.json`, revisado e
versionado por Root após a reconciliação real. Este lote não cria esse arquivo.
Uma execução parcial bem-sucedida não basta: o recibo CI e os recibos dos serviços
extras devem cobrir, sem duplicação, todos os serviços configurados no workflow.

| Campo | Contrato |
| --- | --- |
| `version` | Número `1`. |
| `headSha` | SHA Git completo da versão reconciliada. |
| `ci.runId`, `ci.attempt`, `ci.jobId` | Inteiros positivos; `jobId` identifica o job **deploy-staging**. |
| `coverage.ciServices` | Nomes efetivamente implantados pelo CI; lista não vazia. |
| `coverage.extraServices` | Nomes reconciliados fora dessa onda CI. |
| `coverage.ciReceiptSha256` | SHA-256 do recibo da seleção/execução CI real. |
| `coverage.extraReceiptSha256` | SHA-256 obrigatório quando há serviços extras. |
| `ready.receiptSha256` | SHA-256 do recibo de prontidão de todos os serviços. |
| `ready.services[]` | Um registro por nome configurado, com `name`, `serviceId`, `deploymentId`, `commitSha` igual a `headSha` e `status: "SUCCESS"`. IDs são UUIDs distintos. |

O resolvedor verifica a identidade da execução CI pelo GitHub e confere localmente
a cobertura, os IDs e o formato dos hashes. Os recibos externos são uma atestação
revisada por Root; o helper não baixa esses recibos nem consulta o estado vivo dos
provedores. O bootstrap deve continuar ancestral ao checkout, e a API deve confirmar
seu push de staging, workflow CI, tentativa e jobs bem-sucedidos.

Ondas posteriores elegíveis descendem do bootstrap e do commit de ativação, são
ancestrais ao checkout e excluem a execução atual e disparos manuais. A seleção usa
a conclusão mais recente do job de deploy. Sem outra onda elegível, o bootstrap
validado continua sendo o baseline. Paginação tem limite de 20 páginas; excedê-lo
recusa o deploy, sem truncar a evidência.

## Disparo manual e verificação

`workflow_dispatch` conserva o contrato existente: `all`, CSV ou `auto` com
`before_sha`. O valor de `before_sha` passa pelo output JSON sem consultar GitHub,
Git ou bootstrap; o seletor Bash existente valida o modo manual.

Verificação leve, sem navegador, build ou provedores:

```sh
bun test ./scripts/ci/staging-deploy-baseline.test.ts ./scripts/ci/staging-deploy-transport.test.ts ./scripts/ci/staging-deploy-backlog.test.ts ./scripts/ci/staging-deploy-workflow.test.ts
```

O controle de backlog cria um histórico Git temporário e executa somente o trecho
de seleção Bash do workflow, com ambiente sem credenciais. Seus recibos são
sintéticos e não qualificam bootstrap, publicação ou aceite de staging.

## Reconciliação inicial de 21 de outubro de 2026

O bootstrap versionado usa `face8acef32f1e924f1461557e82716ea7acc3dc`, CI
`39514471699`, tentativa 1 e job de deploy `118956576693`. A execução implantou
Admin, Auth, Members e Kids. Os outros 14 serviços foram reconciliados
separadamente. O inventário final, concluído às 02:23:20 UTC, confirmou os 18
serviços com uma implantação ativa `SUCCESS` da mesma versão.

A comunidade teve uma segunda implantação da mesma imagem e commit. A leitura
oficial confirmou a anterior removida e a substituta bem-sucedida. O recibo de
reconciliação preserva o ACK original e registra a substituição observada, sem
atribuir sua autoria. Os dois lotes que inicialmente falharam também conservam
seus resultados negativos e suas reconciliações posteriores separadas.

Os hashes em `coverage` e `ready` vinculam essas evidências à referência inicial.
Essa referência comprova coerência das implantações observadas; a homologação dos
fluxos de interface, Python e produção continua sendo uma etapa separada.
