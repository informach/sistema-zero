# Regularização de assinaturas: base financeira

Estado: implementação parcial em `feat/subscription-recovery`, sem ativação financeira
em staging ou produção. Não substitui o aceite de ponta a ponta do plano aprovado.

## Implementado e verificado

- Recusa de cartão: motivo sanitizado da resposta/histórico Efí chega ao campo
  `failure_reason` e ao evento existente. Não inferir pagamento ou cancelamento de texto.
- Liquidação posterior do mesmo ciclo recusado: valida assinatura, provedor, charge e
  valor; preserva o pagamento original e emite `payment.paid` uma vez. A transição
  genérica FAILED → PAID de pagamentos avulsos continua proibida.
- Reconciliação encontra ciclos locais FAILED/PENDING já pagos na fonte.
- Adaptadores distintos: troca preventiva envia apenas `payment_token` no PUT da
  assinatura; retry envia cartão + `update_card`, sem criar outro charge. Nenhuma
  das duas operações repete automaticamente requisição ambígua.
- Snapshot normalizado reúne estado, ciclos e próxima execução civil da assinatura.
- Intenções persistidas: prazo de dez minutos, identidade/valor fixados, unicidade de
  operação ativa por assinatura, CAS antes da execução e UNKNOWN sem repetição.
- Serviço e rotas autenticadas da troca preventiva: posse por e-mail, fonte ACTIVE,
  intenção vinculada, token transitório, resultado seguro e consulta da solicitação.
- Pedido de cancelamento é persistido antes da rede; bloqueia autorização de troca.
  Cancelamento só é anunciado após GET confirmar encerramento. Resposta perdida do
  PUT é resolvida por essa confirmação, mantendo o período pago.
- Worker retoma **pedidos explícitos** pendentes, com lease própria, lote limitado,
  chamadas fora da transação SQL e drenagem no shutdown. Não decide cancelamento D7.
- Contrato financeiro rejeita propriedades não declaradas, incluindo PAN/CVV, sem
  repetir corpo/token no erro de validação. Configuração de tokenização expõe somente
  identificador público da conta e ambiente, nunca credenciais privadas.

## Evidência local

Payments: **382 testes / 964 asserções / zero falhas e zero skips** com PostgreSQL 17
isolado, após migrations geradas 0007–0009. `bun run typecheck`, Biome dos 19 arquivos
do lote e `git diff --check` passaram. Os números incluem testes existentes.

Provas específicas no banco: duas réplicas não abrem/executam duas intenções; expiração
não autoriza token antigo; UNKNOWN impede uma segunda operação; pedido de cancelamento
invalida intenção aberta; lease sobrevive à troca da instância do repositório e não
compartilha cursor com a reconciliação geral. Os testes HTTP e de aplicação cobrem
IDOR, reentrega, retorno perdido, troca de estado no provedor e persistência sem token.

Comandos, de `packages/payments`:

```sh
bun run typecheck
# TEST_DATABASE_URL deve apontar exclusivamente para PostgreSQL descartável de QA.
bun test
```

Sem `TEST_DATABASE_URL`, testes de banco podem pular; isso não é prova de migração.
Nunca executar estes testes em banco de staging/produção: a suíte usa dados descartáveis.

Negativos preservados localmente: recusa seguida de pagamento bloqueada pelo domínio
anterior; CHECK SQL permitindo NULL corrigido no schema e migration regenerada antes de
commit; normalização TypeBox descartando extras substituída por Standard Schema Zod
estrito; armadilha `expect.rejects`/thenables substituída pela captura assíncrona já
adotada nos testes PostgreSQL do projeto. Não foram aumentados timeouts para esconder falhas.

## Ainda necessário antes da ativação

1. Interface de cartão e tokenização compartilhada com o checkout, BFFs Kids/Adultos,
   regras de sessão do responsável/titular e rotas auditadas do gateway.
2. Ensaio Efí sandbox da troca sem débito e do retry autorizado; confirmar preço,
   plano, data e relação entre ciclo original, período de acesso e próxima execução.
3. Casos/política versionada D0/D3/D6/D7, avisos duráveis e cancelamento automático
   somente após aviso e nova consulta; não ativar isso para históricos retroativos.
4. Fluxo de retry e retomada antiga, com reconciliação do período correto. A data
   financeira do pagamento não deve prometer um novo mês a partir de hoje se a próxima
   renovação do provedor continuar ancorada no ciclo original.
5. Sincronização de cancelamentos externos sem charge, tratamento operacional de
   UNKNOWN e fila Admin, distinção assinatura/pagamento/acesso e métricas por público.
6. Configurar `EFI_ACCOUNT_IDENTIFIER` com o identificador público da conta do ambiente,
   revisar variáveis/consumidores/mensagens e executar full review antes do rollout.

Não houve cobrança, retry, cancelamento ou mensagem para clientes reais nesta qualificação.
Os efeitos externos foram simulados no port de pagamento; concorrência e persistência
foram exercitadas no PostgreSQL real. Browser e Efí sandbox ainda não foram qualificados.
