# Contexto do comando IaC na promoção de produção

O workflow `40049531633`, promovendo `83481fec75ea1c4ddd1dae65cf095e7977bdcc47`,
parou na conferência de configuração antes dos deployments dos aplicativos.
O plano aprovado tinha zero alterações; não houve apply nem remoção da barreira.

## Causa e correção

O processo de rollout fornece `RAILWAY_PROJECT_ID` e `RAILWAY_ENVIRONMENT_ID`.
Na CLI Railway 5.62.1, `src/config.rs` omite `environment_name` quando o ID vem
desse override. `src/iac/eval.rs` usa esse nome para `ctx.environment`, que então
chega nulo à definição, embora `railway link` tenha selecionado o ambiente correto.

`runConfig` agora remove os overrides de projeto, ambiente e serviço somente da
cópia de ambiente dos processos filhos IaC. O vínculo explícito com projeto/ID
permitidos continua obrigatório. O ambiente do processo pai, usado pelo rollout,
e as credenciais continuam preservados. A definição e o plano IaC não mudaram.

## Verificação

- Regressão causal antes da correção: 30 passam, uma falha pelo override herdado.
- Depois: 79 testes / 284 asserções, zero falhas, cobrindo configuração e promoção.
- Biome dos dois arquivos de código e `git diff --check` sem erros.
- Conferência real somente de leitura em produção, 24/10/2026 01:27:57–01:27:59 UTC:
  `link` local + `config plan --detailed-exit-code`, ambos exit 0, zero alterações.
  Processo pai simulava os mesmos IDs injetados no workflow. Nenhum apply/deploy.
- No Windows, a prova selecionou o próprio executável nativo 5.62.1 para a
  detecção do SDK; `execFileSync` não executa o shim npm `.cmd`. As duas tentativas
  anteriores preservam esse diagnóstico local, separado da causa no runner Linux.

Essa prova não significa que os aplicativos já foram promovidos. A correção deve
passar pelo CI e pelo fluxo canônico antes da nova tentativa de produção.
