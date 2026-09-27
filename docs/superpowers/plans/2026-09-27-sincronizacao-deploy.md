# Sincronização das branches e promoção para produção

**Objetivo:** promover staging para main por PR, disparar os deploys dos serviços
afetados e devolver o commit da promoção para staging sem perder trabalho.

**Arquitetura:** preservar o deploy nativo do Railway em main, corrigir os gatilhos
ausentes ou ligados à branch errada e usar um workflow separado para atualizar
staging somente por fast-forward. Um hotfix que altere o conteúdo dispara o CI de
staging com o intervalo anterior; o retorno de um merge com conteúdo igual não
repete builds. Divergência ou corrida de push interrompe a sincronização, sem force.

**Execução:** nesta sessão, com a skill executing-plans. Autorizada pelo pedido de
sincronizar as branches e deixar os próximos deploys limitados à promoção.

## Decisões

- Manter os gatilhos nativos evita criar um segundo disparo de produção no Actions.
- Não usar squash entre branches permanentes nem reescrever o histórico.
- Não fazer merge automático de novas funcionalidades de staging após a promoção.
  Se ela avançar, preservar o trabalho e informar a necessidade de integrar main.
- O Fiscal continua fora deste ajuste. Workers Cloudflare, alterações de conteúdo
  no banco e conversões de dados mantêm seus procedimentos próprios.

## Tarefas

- [x] Integrar os históricos de main, staging e revisão dos tutoriais em worktree isolada.
- [x] Resolver os dois conflitos de testes; executar os testes afetados e Biome.
- [x] Adicionar `scripts/ci/sync-staging.mjs` com fast-forward e rejeição de divergência.
- [x] Exercitar o script com repositórios Git temporários, inclusive preservação de trabalho novo e corrida de push.
- [x] Adicionar `.github/workflows/sync-staging.yml`, com permissões mínimas e dispatch explícito do CI quando o conteúdo mudar.
- [x] Permitir `services=auto` e `before_sha` no dispatch de `ci.yml`, com validação do intervalo.
- [x] Corrigir gatilhos Railway de Helpdesk, Indicações e Marketing; conferir os 16 serviços web/API ligados à main.
- [x] Atualizar `docs/ambientes-e-fluxo.md` e registrar as exceções ao deploy comum.
- [ ] Executar `bun test scripts/release scripts/ci`, o validador dos tutoriais e lint; abrir PR e acompanhar todos os checks.
- [ ] Integrar por merge commit, verificar o workflow de sincronização e os deploys afetados.
- [ ] Preservar arquivos locais em backup, atualizar branches locais e provar igualdade com `git rev-list --left-right --count origin/main...origin/staging` e `git diff --exit-code origin/main origin/staging`.

## Recuperação

Falha de sincronização não muda main. Se staging recebeu novos commits, integrar
main em staging sem squash, resolver eventuais conflitos e deixar o CI terminar.
Corrigir o erro do workflow antes de usar Re-run jobs. Não usar force push.

O dispatch explícito é necessário porque pushes feitos com GITHUB_TOKEN não
disparam outro workflow de push, conforme a
[documentação do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

