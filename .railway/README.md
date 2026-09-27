# Infraestrutura Railway

Esta pasta substitui os 17 arquivos `packages/*/railway.json`. O formato antigo deixa de ser lido em 01/12/2026. O projeto usa a mesma definição para staging e produção, com variáveis e domínios próprios de cada ambiente.

- `railway.ts`: projeto, serviços, Postgres, Evolution e volumes existentes.
- `services/*.json`: Dockerfile, padrões de arquivos, preDeploy, comando inicial e healthcheck de cada aplicação.
- `variables.ts`: nomes das variáveis que devem permanecer no Railway. Não contém valores nem credenciais.
- `package-lock.json`: SDK Railway 3.11.0. A automação fixa a CLI em 5.62.1 e usa Node 24.

O Railway usa `ON_FAILURE` como política padrão de reinício. O importador omite esse padrão; os serviços mantêm três tentativas em `restartPolicyMaxRetries`. Os nomes e tamanhos dos volumes refletem recursos existentes, sem recriação. Staging tem origem na branch staging, com autodeploy nativo desligado; produção acompanha main.

## Próximo deploy

1. Integrar o trabalho em staging. O CI executa todos os testes, aplica a configuração de staging e publica os serviços afetados.
2. Abrir PR de staging para main. Além dos testes, `railway-config-plan` salva o plano de produção, vinculado ao SHA da pasta `.railway/` e ao estado remoto.
3. Fazer merge commit. O workflow de configuração aplica exatamente o plano salvo. Os 16 autodeploys de produção usam **Wait for CI** e aguardam esse workflow antes de iniciar.
4. Conferir os deployments e a sincronização automática de staging com main.

Não cancelar o workflow de configuração de produção: ele é pré-requisito do deploy. Fiscal continua sem autodeploy em produção; esta migração não altera seu certificado.

O secret `RAILWAY_TOKEN` existente é um token de conta. A CLI o recebe como `RAILWAY_API_TOKEN` e vincula explicitamente o projeto e o ambiente antes de cada operação. O gate confere o ambiente do plano e a definição recusa IDs desconhecidos. Nenhuma credencial é gravada no repositório.

## Alterar configuração

Edite o JSON do serviço e teste em staging. Mudanças em `.railway/` acionam todos os serviços da aplicação, pois podem alterar configurações compartilhadas. O preDeploy continua executando as migrações antes de iniciar cada serviço. Não volte a criar arquivos `railway.json` nem vínculos `railwayConfigFile`.

O apply do Railway pode iniciar deployments quando altera build ou deploy. Por isso, staging só aplica após os testes, usa sua própria branch como origem e depois confere a publicação do SHA validado. Alterações incompatíveis de infraestrutura ou de contrato precisam de rollout específico por ondas. Na migração inicial, o Fiscal teve apenas sua configuração migrada: o certificado vencido impede seu redeploy, e a validação de staging usa CSV explícito dos outros 16 serviços.

Ao adicionar uma variável pelo painel, inclua seu nome em `variables.ts`, na lista comum ou na lista específica do ambiente. Use `preserve()` para manter seu valor no Railway. Se o nome estiver ausente, o plano mostrará uma exclusão e o gate impedirá a aplicação. Alterar apenas o valor de uma variável preservada não exige editar o repositório.

O gate automático aceita somente alterações seguras de build, deploy e origem das aplicações existentes. Recusa mudanças em variáveis, domínios, bancos, volumes, Evolution e operações destrutivas. Alterações nesses recursos precisam de um plano operacional específico.

## Conferir localmente

Use Node 24 e Railway CLI 5.62.1, com `railway` dessa versão no PATH:

```sh
npm ci --prefix .railway --ignore-scripts
railway link --project 415d5a1c-5f75-432c-8445-b395d0977ce3 --environment staging
railway config plan
```

Para conferir produção, vincule explicitamente `--environment production`. `plan` não modifica o ambiente. Não use `--include-variables`, `--decrypt-variables` ou `--show-values` em logs ou arquivos versionados.

O script de CI exige `.railway/` commitada e limpa:

```sh
node scripts/ci/railway-config.mjs plan staging /tmp/railway-staging-plan.json
node scripts/ci/railway-config.mjs apply staging /tmp/railway-staging-plan.json
```

Guarde os planos fora da pasta `.railway/`, pois ela é fixada por hash. O apply recusa estado remoto alterado ou árvore diferente. Se isso ocorrer antes do merge, reexecute o job de plano do PR. Depois do merge, investigue o drift e abra um novo PR para gerar um plano atualizado; não desative a verificação nem passe `--confirm-destructive` para contorná-la.

Referências: [IaC Railway](https://docs.railway.com/infrastructure-as-code), [Wait for CI](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci).
