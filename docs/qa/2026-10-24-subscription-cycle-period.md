# Renovação quitada com atraso: dinheiro, período e histórico

## Contrato

O instante financeiro `paidAt` permanece intacto. A evidência `cycleAccess` separa
período confirmado de período que exige revisão. O período confirmado usa a criação
original da cobrança consultada na assinatura do provedor e o intervalo de calendário
comprado, com a mesma regra anterior do Members. Datas ausentes, futuras ou identidade
divergente não são inventadas: o dinheiro fica PAID, mas o acesso aguarda revisão.

Members valida coerência antes de efeitos e aplica fim do período + carência existente.
Uma cobrança antiga não reduz validade maior nem reativa matrícula revogada. Resolver
uma revisão emite `payment.subscription_period_confirmed`; não repete `payment.paid`
nem recibo fiscal. O motivo e instante da recusa anterior ficam em colunas próprias.

As migrations geradas 0016/0017 são aditivas e foram aplicadas somente no PostgreSQL
de QA local. Não foi alterada a assinatura de cliente, enviada mensagem real ou feita
cobrança. Este lote não conclui o plano financeiro nem constitui deploy.

## Evidência local

- Payments: 497 testes, zero falhas, 1433 asserções, 40 arquivos, PostgreSQL real
  isolado em 127.0.0.1:15463. Tipagem Payments: zero erros, heap 768 MiB.
- Funnel: 599 testes passaram, dois testes PostgreSQL não executados nessa suíte.
  Astro check: 336 arquivos, zero erros, três hints. Integração de assinatura inclui
  período antigo, revisão seguida de confirmação, payload inválido e assinatura alheia.
- Core billing + grant Members: 37 testes, zero falhas, 115 asserções.
  A suíte completa e tipagem completa Members ainda exigem CI fresco da composição.
- Biome: 28 arquivos; diff check limpo.
- Prova causal do rollback: retirar eventos antes de commit faz o teste novo falhar
  (esperados dois eventos retidos, recebidos zero). Fonte restaurada byte a byte;
  suíte completa Payments verde depois da restauração. No banco, falha de outbox
  reverte a confirmação do período e preserva a recusa arquivada; sucesso posterior
  grava exatamente um evento de cada tipo, sem duplicar pagamento.

Logs locais em `.cache/subscription-recovery-20261023/cycle-period-*`; contagens
referem-se aos comandos descritos, sem somar testes sobrepostos.

## Liberação e limites

Deployar Members, depois Funnel e só então o produtor Payments. Um consumidor antigo
ignoraria a evidência e calcularia acesso pela data tardia; portanto essa ordem precisa
ser confirmada no release, além da aplicação das migrations antes do produtor.

Ainda faltam a ação administrativa de resolução auditada, pagamento explícito com
consentimento e período congelado, revisão financeira completa, ativação de templates/
configuração, testes sandbox e qualificação integrada em staging/produção. A confirmação
de período no agregado não autoriza automaticamente qualquer endpoint público.
