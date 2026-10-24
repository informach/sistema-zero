# Confirmação administrativa de período

A ação de período da fila consulta assinatura e cobrança na operadora; exige dinheiro
PAID, mesma identidade/valor/intervalo, período original verificável e prova de até 60 s.
O corpo aceita somente versão e identificador da solicitação. Datas ou ator fornecidos
pelo cliente são recusados. O ator vem da sessão administrativa confiável; staff,
impersonação e perfil de criança não podem confirmar.

A decisão fica em `payments.payments.period_confirmation`, migration gerada 0019,
com ator, solicitação, assinatura do provedor, instante observado, instante confirmado
e motivo anterior. É gravada no mesmo CAS/transação do período e do outbox. Período já
confirmado não é substituído; repetição da mesma solicitação não duplica evento. O
registro sobrevive à retenção do outbox. A API pública do comprador não o expõe.

O único evento novo é `payment.subscription_period_confirmed`; `paidAt` e o recibo
financeiro permanecem. A confirmação não cria cobrança, não cancela recorrência e não
reinicia o período do acesso. A interface protege clique duplicado e usa consulta para
reconciliar resposta perdida, sem repetir automaticamente a escrita.

## Provas locais

- Payments: 517 testes, zero falhas, 1559 asserções, PostgreSQL isolado r8; tipagem
  limpa com heap768. Quatro cenários novos de fonte, autoria/retencão, prova vencida,
  indisponibilidade/divergência e concorrência, além da prova de rollback do outbox.
- Admin: fixtures isoladas de interface/BFF e regras de entrada passaram. Incluem
  staff sem ação, clique duplicado, corpo sem datas/ator, limite de JSON, sessão e no-store.
- Tipagem focada da interface/fixture Admin passou. A tentativa ampliada incluindo o
  grafo do BFF excedeu heap1024 (exit134); NÃO é prova de tipagem completa nem erro TS
  confirmado. Log `period-confirmation-admin-types-r1.log` preservado; tipagem completa
  desta composição fica pendente do CI remoto.
- Nenhuma ação foi executada em cliente, sandbox Efí ou ambiente implantado. A migration
  foi aplicada somente no PostgreSQL próprio de QA, porta15463.

## Pendências do plano

Conciliação de operações UNKNOWN, admissão individual do legado, retirada coordenada do
dunning antigo, configurações/templates/consumidores e qualificação sandbox/navegador.
Depois ainda há os dois full reviews e os lotes de interface/roteiros autorizados.

Não ligar o encerramento da recorrência ao endpoint legado de revogação imediata do
Members: esse comando tem outra semântica. No processo financeiro novo, validade já
paga continua sendo respeitada e o acesso termina pela própria validade. A revisão
também precisa conferir a data prevista de cobrança exibida: o helper antigo deriva
de `lastChargeAt` (instante pago), enquanto a regularização já consulta `nextExecution`.
