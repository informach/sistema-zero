# Migração Railway IaC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Remover a dependência de Config as Code antes de 01/12/2026, mantendo a promoção staging → main automática.

**Architecture:** Uma definição `.railway/railway.ts` para o projeto, selecionando staging ou production pelo contexto do Railway. Configurações de build e deploy dos 17 serviços ficam em `.railway/services/`; variáveis existentes são preservadas, sem exportar seus valores. Postgres, Evolution e volumes permanecem declarados e sem alterações operacionais.

**Tech Stack:** Railway CLI 5.62.1, SDK railway 3.11.0, Node 24, GitHub Actions, Bun 1.3.11.

**Spec:** Solicitação de antecipar a migração Railway e fluxo em `docs/ambientes-e-fluxo.md`.

## Global Constraints

- Preservar bancos, volumes, domínios, variáveis e serviços em execução.
- Aplicar primeiro em staging; produção somente depois da validação.
- Não renovar nem substituir o certificado Fiscal nesta tarefa.
- Não permitir operações destrutivas no apply automático.
- Manter migrações de banco no preDeploy e testes obrigatórios antes de publicar.
- Terminar com main e staging sincronizadas, sem force push.
- Não usar o migrador automático sem completar Dockerfiles, watchPatterns e demais campos que ele omite.

### Task 1: Inventário e definição da infraestrutura

**Files:** `.railway/railway.ts`, `.railway/services/*.json`, `.railway/variables.ts`, `.railway/package.json`, `.railway/package-lock.json`.

- [x] Capturar imports sem valores de variáveis, configurações efetivas, deployments e triggers dos dois ambientes.
- [x] Conferir CLI/SDK publicados e documentação oficial.
- [ ] Declarar todos os recursos atuais e migrar build/deploy completos.
- [ ] Comparar os contratos gerados com os arquivos antigos e preservar diferenças legítimas dos ambientes.
- [ ] Validar os arquivos com Node, Biome e plano remoto do Railway.

### Task 2: Migração operacional e integração contínua

**Files:** `.github/workflows/ci.yml`, `.github/workflows/railway-config.yml`, `scripts/ci/railway-config.mjs`, testes do gate de infraestrutura.

- [ ] Implementar plano salvo e aplicação não destrutiva, com ambiente e árvore Git conferidos.
- [ ] Em staging, aplicar configuração depois dos testes e antes dos deployments.
- [ ] Em produção, aplicar o plano da versão promovida antes dos deploys nativos; usar Wait for CI sem cancelar runs necessários.
- [ ] Migrar as configurações legadas de staging preservando os valores efetivos em uma atualização por serviço e sem reiniciar aplicações.
- [ ] Revisar o plano de staging e aplicar somente diferenças previstas.
- [ ] Remover os 17 arquivos legados, testar o CI completo e conferir os deployments e healthchecks de staging.

### Task 3: Produção e encerramento

**Files:** `docs/ambientes-e-fluxo.md`, `.railway/README.md`.

- [ ] Migrar configurações de produção após staging saudável; conferir variáveis, domínios, volumes, triggers e deployments preservados.
- [ ] Abrir PR staging → main, aguardar checks obrigatórios e promover com merge commit.
- [ ] Acompanhar apply e deployments automáticos; exigir plano sem diferenças após aplicação.
- [ ] Atualizar instruções para próximas promoções e manutenção de infraestrutura.
- [ ] Conferir sincronização automática e atualizar as branches locais por fast-forward.

## Verificação e recuperação

`railway config plan --out <arquivo>` salva o plano vinculado ao ambiente e à árvore `.railway/`. `railway config apply --plan <arquivo> --yes` aplica esse plano e recusa mudanças destrutivas. Não passar `--confirm-destructive`. Se houver drift, gerar e revisar outro plano.

Os snapshots privados ficam em `.cache/railway-iac-operations-2026-09-27`. Restaurar os campos explícitos de build/deploy a partir desses snapshots se necessário; não depender de reativar `railwayConfigFile`, pois novos vínculos já são recusados. Não alterar banco ou volume para recuperar uma configuração de serviço.
