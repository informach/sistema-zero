# Revisão dos lotes recebidos

Base: `f62ab0807c0960bb4d433c68fe7a0e3bfd5ea359`, 30/10/2026.
Relatório: [revisão e matriz de pendências](../../../.audits/architectural-analysis-2026-10-30-arquipelago-lotes-recebidos.md).

## Reprodução das visitas

O [reprodutor](reproduzir-visitas.ts) chama serviço e repositórios de produção com Postgres real.
Aceita somente localhost e banco `arquipelago_test*`. Use um banco NOVO e descartável,
exclusivo do reprodutor. Ele aplica migrações e cria dados sintéticos, além de instalar um
gatilho de atraso para forçar a intercalação concorrente. O gatilho é removido no finally.
Não rode ao mesmo tempo que uma suíte na mesma base.

```powershell
bun docs/qa/2026-10-30-revisao-lotes-recebidos/reproduzir-visitas.ts 'postgres://USUARIO:SENHA@127.0.0.1:PORTA/arquipelago_test_review'
```

Saída observada na base revisada:

```json
{"caso":"revogar-e-gerar-outro","antes":1,"revogado":0,"novoSemAceite":1}
{"caso":"revogar-durante-members","devolveuCasa":true,"casasAtuais":0}
{"caso":"limite-concorrente","maximo":20,"aceites":2,"casas":21}
```

Esses resultados são defeitos observados, não cenários aprovados. O script é diagnóstico e
termina com zero quando conclui as observações; não deve ser usado como gate verde de CI.
Para uma regressão após correção, exigir respectivamente zero casas sem novo aceite,
recusa da leitura revogada e no máximo 20 casas.

## Testes frescos

- Contratos: `bun test`, 226 aprovados.
- Jogo: `bun test`, 1.447 aprovados, 1 ignorado.
- API: `bun test` com `TEST_DATABASE_URL` apontando para `arquipelago_test` local exclusivo,
  338 aprovados, 45 ignorados.
- Conteúdo: `bun test` nos arquivos `recife/recife-python.test.ts`, `pico/pico-python.test.ts`,
  `vale/vale-texto.test.ts`, `nuvens/nuvens-pro.test.ts` e `farol/farol.test.ts`, dentro de
  `docs/desafios-do-jogo/`, 13 aprovados.
- `bun run typecheck` em arquipelago, arquipelago-contracts e arquipelago-api, todos aprovados,
  com `NODE_OPTIONS=--max-old-space-size=8192` apenas no processo da verificação.

Nenhum banco remoto, `.env`, workflow, GLB ou gerador de arte foi modificado. Não há prints
novos porque esta rodada não executou navegador. Evidências gráficas anteriores continuam
com seus escopos e bases originais, sem transferência automática de aceite.
