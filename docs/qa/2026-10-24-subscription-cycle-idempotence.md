# Review: identidade permanente dos ciclos pagos

## Achado reproduzido

Após pagar A e B, remover o registro temporário da notificação de A e recebê-la
novamente fazia o contador passar de três para quatro. Em plano de quatro ciclos,
o estado mudava de ACTIVE para EXPIRED sem outro pagamento. A confirmação do
dinheiro não se repetia; o erro estava na contagem e no encerramento do pai.

Reprodução independente no PostgreSQL QA:

```json
{"before":{"cycles":3,"status":"ACTIVE"},"after":{"cycles":4,"status":"EXPIRED"}}
```

## Correção

Identidades de ciclos ficam em componente próprio da assinatura, com chave única
por assinatura/cobrança. Sua vida acompanha o agregado; retenção de inbox/outbox
não o remove. A confirmação de um ciclo usa transação com lock do pai, dedupe,
atualização do agregado e outbox. Duas réplicas não contam duas vezes. A captura
inicial também registra a identidade na transação normal de `save`.

Migration 0024 gerada pelo Drizzle cria o componente; a migration de dados 0025
foi criada com `db:generate -- --custom`. Ela registra identidades conhecidas de
recibos pagos, último ciclo e eventos existentes, sem reescrever contadores,
dinheiro, estado ou período. Durante o rollout, um evento confirmado de um
writer antigo permite registrar sua identidade sem contar novamente.

Pagamento tardio mantém cancelamento/expiração já confirmados. A contagem não
transforma um cancelamento humano em expiração por quantidade de ciclos.

## Evidência

A mesma reprodução independente passou:

```json
{"before":{"cycles":3,"status":"ACTIVE"},"after":{"cycles":3,"status":"ACTIVE"}}
```

- Payments completo em banco QA r14 desde zero: **589 testes, 1.850 asserções,
  zero falhas/skips**, 47 arquivos, 33,18 s.
- Sete cenários de banco: retenção de inbox e outbox, duas réplicas, writer antigo,
  rollback, pagamento após cancelamento, posse e backfill real idempotente.
- Upgrade do QA r13 de 0023 para 0024/0025 passou. A primeira tentativa detectou
  `uuid = text` na junção da migration custom; corrigida com conversão explícita
  do UUID para texto, antes de qualquer execução nos ambientes reais.
- Tipagem completa e checagem dos arquivos alterados realizadas separadamente.
- O fake foi atualizado para a porta real. Um NUL literal preexistente foi
  convertido no escape TypeScript `\u0000`, preservando o mesmo separador em runtime.

Logs no cache de release: `financial-full-review-cycle-{red,green}-r1.log`,
`financial-cycle-ledger-db-r{1,2,3}.log`, `financial-cycle-ledger-full-r2.log` e
`financial-cycle-ledger-types-r2.log`.

## Inspeção dos ambientes e limite do backfill

A inspeção executou transação READ ONLY. Staging não tinha assinaturas. Produção
tinha duas assinaturas ativas, ambas sem quantidade limitada de ciclos. Uma
apresentava contador seis e quatro recibos pagos. Consulta GET na Efí confirmou
quatro ciclos pagos e assinatura ACTIVE, sem cobrança/cancelamento ou mudança local.

O backfill não deve apagar essa divergência silenciosamente. Falta registrar uma
correção técnica explícita, com prova fresca e auditoria permanente, preservando
os quatro recibos, seu período, o estado ativo e a recorrência. Essa correção de
metadado continua aberta antes do fechamento do review. A assinatura de uma única
cobrança paga não foi alvo dessa comparação de ciclos maiores que um.

Não houve implantação deste lote, alteração do banco de produção ou ativação da
política financeira. As primeiras sondagens de comparação retornaram TypeError
porque o mapper da imagem antiga não devolve `charges` junto do detalhe; a leitura
foi refeita usando seu parser separado, mantendo os negativos registrados.
