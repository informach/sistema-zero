# Pagamento explícito: motor de regularização

O serviço `RetrySubscriptionChargeService` prepara uma intenção com cobrança original,
valor, período e próxima execução congelados. Só aceita ciclo recusado de assinatura
ativa, previamente paga, do próprio comprador. Consulta assinatura e cobrança no
provedor; histórico sem data, ciclo posterior, cancelamento, valor divergente ou período
encerrado impedem o POST. Atualizar cartão preventivamente continua separado.

Uma confirmação exige consentimento explícito e token efêmero, sem persistir/logar token,
PAN ou CVV. O CAS do ledger compartilhado permite um executor por assinatura. Após POST,
o handler canônico consulta a fonte; aceite do POST sozinho não comprova pagamento.
Resposta perdida ou liquidação sem prova fica UNKNOWN, sem repetição automática/manual
do POST pela mesma intenção. Apenas pagamento canônico confirmado conclui SUCCEEDED.

## Provas locais

- Nove cenários novos com PostgreSQL real: sucesso e histórico financeiro único,
  concorrência de abas, resposta perdida, aceite sem liquidação, anti-IDOR/consentimento,
  mudança de próxima cobrança, histórico incompleto, expiração e cancelamento concorrente.
- Composição Payments: 507 testes, zero falhas, 1471 asserções, 41 arquivos; banco QA
  novo `sistemazero_recovery_test_r8` no container próprio, porta 15463.
- Tipagem Payments: zero erros com heap 768 MiB; Biome dos nove arquivos TS limpo.
- Primeiro teste da migration recusou corretamente retries antigos de QA sem termos no
  banco r6. Nenhum período foi inventado/backfilled. Migrations foram então ensaiadas do
  zero em r7/r8. Antes de liberação, consultar contagem de RETRY sem termos no destino;
  qualquer ocorrência exige migração/resolução auditada antes de aplicar a constraint.
- Um primeiro agregado detectou fixture nova deixando pedido de cancelamento para a
  suíte seguinte. Corrigida limpeza pelo consumer exclusivo; nova composição verde em r8.
  Logs negativos preservados em `.cache/subscription-recovery-20261023/retry-explicit-*`.

## Limites desta entrega

Este commit entrega o motor e a migration gerada 0018. Ainda faltam conexão HTTP/BFF,
interface com consentimento e termos, resolução auditada de UNKNOWN, testes sandbox e
qualificação dos dois públicos. Nenhuma cobrança real, mensagem, alteração de cartão ou
assinatura foi executada. Não é conclusão do plano financeiro nem deploy de produção.

## Integração HTTP e interface (lote seguinte)

O motor está conectado ao composition-root e às rotas `/payments/my/subscriptions/:id/retry-intents`.
O BFF comum e os shims dos dois apps preservam ownership, sessão própria do titular,
validação estrita e consentimento `true`. Kids exige conta do responsável na borda local.
Leitura pública de pagamento passa a expor `subscriptionId` canônico quando presente.

A janela comum reutiliza tokenização e limpeza da troca preventiva. Abrir só consulta;
`Conferir cobrança` prepara termos; checkbox e botão confirmam o valor explicitamente.
Intenção expirada não ganha termos novos silenciosamente. Estado UNKNOWN só permite GET,
inclusive ao reabrir; PAN/CPF/CVV não entram no corpo enviado ao BFF.

Evidência do lote: Payments 508/0, 1494 asserções, PostgreSQL r8 e tipagem limpa;
BFF/impersonação/política Kids + wrapper DOM 16/0, 81 asserções externas (não somar
novamente os casos internos); fixture DOM inclui quatro cenários novos de regularização;
tipagem focada do componente/fixture limpa com TypeScript do workspace e heap768.
Biome nos arquivos alterados e diff check exigidos antes do commit. Navegador real,
compilação completa dos hosts e sandbox Efí ainda pendentes; CI novo deve qualificar
esta composição, não herdar o resultado do commit anterior.

Ainda pendentes: fila administrativa e ações de exceção auditadas, conciliação explícita
de UNKNOWN, tratamento individual do legado, troca do dunning antigo, ativação dos
consumidores/templates/variáveis, full review financeiro e release completo.
