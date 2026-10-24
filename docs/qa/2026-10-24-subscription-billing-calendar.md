# Calendário e período original da assinatura

## Mudança

A conta não calcula mais próxima cobrança nem fim do período pago somando meses ao
recebimento. Um pagamento atrasado conserva seu ciclo original. `lastChargeAt`
continua registrando recebimento, sem alteração no agregado financeiro.

O backstop obtém `nextExecution` do mesmo GET de assinatura que já consultava para
descobrir ciclos pagos. Não há uma consulta extra à operadora nem acesso externo
ao abrir a conta. Persiste uma projeção advisory separada, escopada por assinatura,
consumidor, provedor, vínculo e intervalo. Instantes mais antigos não sobrescrevem
observações recentes. Falha dessa projeção é registrada e não impede conciliar
dinheiro recebido.

A leitura em lote usa o índice por assinatura para os recibos PAID/VERIFIED_PERIOD
do mesmo consumidor/provedor. Seleciona o período confirmado mais recente pelo fim
original, não pela ordem de recebimento. Uma previsão anterior a um recibo novo é
omitida até nova observação, evitando anunciar outra cobrança do ciclo já pago.

Calendário com mais de 24h, futuro, vencido ou cancelamento solicitado fica sem
previsão. Data civil é exibida no dia correto em Brasília; fim de mês e ano bissexto
não usam o rollover de `Date.setMonth`. O aviso de período pago cancelado usa o
recibo, sem fallback para recebimento/criação. Essa projeção não autoriza débito,
acesso ou janela de regularização.

## Persistência e implantação

Migration gerada pelo Drizzle `0021_amused_naoko.sql`: somente ADD COLUMN JSONB
nullable em `payments.subscriptions`. Sem backfill de datas, exclusão ou alteração
de status. Saves do agregado não apagam a projeção e a observação não incrementa
sua versão nem publica eventos financeiros.

O serviço tem pre-deploy `db:migrate`; conferir a configuração efetiva antes da
implantação financeira. A nova coluna precisa existir antes do novo código servir
requisições. O worker já roda no boot e depois no intervalo configurado. Não há seed
de calendário fictício. Este lote foi aplicado somente em bases QA novas.

## Evidências e limites

- RED do algoritmo anterior no mesmo boundary: 1 pass / 7 fail; candidato
  restaurado byte a byte. GREEN: 8 testes / 16 asserções de calendário.
- Payments completo, PostgreSQL 17 dedicado, base nova `sistemazero_recovery_test_r11`
  com migrations desde zero até 0021: **543 testes / 1663 asserções**, zero falhas/skips.
- Tipos completos Payments (heap 768 MiB) e foco compartilhado (1024 MiB): exit 0.
- Shared billing/continuidade: 18 testes / 69 asserções externas; Adulto completo:
  90 / 446; Kids área dos pais: 13 / 65, sem falhas. Wrappers não somados novamente.
- Casos de banco cobrem concorrência/observação antiga, save do agregado, cancelamento,
  TTL, origem divergente, atraso, recibos fora de ordem e período em revisão.
- Casos do worker demonstram um GET e continuidade da conciliação quando a projeção falha.

As primeiras tentativas do novo teste de banco usavam uma instância já salva como
se sua versão fosse atual e não removiam a auditoria de cancelamento no cleanup.
Corrigidas as fixtures para recarregar e respeitar as FKs, sem mudar o repositório
de escrita ou enfraquecer a auditoria. Negativos preservados nos logs locais
`financial-calendar-*` do coordenador.

Não houve operação financeira/aviso real. Sandbox, fluxo autenticado integrado,
review global e ativação em staging/produção permanecem pendentes.
