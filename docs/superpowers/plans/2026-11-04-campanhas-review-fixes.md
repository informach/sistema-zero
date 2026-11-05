# Correções do full review de campanhas

> Execução inline com a skill executing-plans, sem delegação.

**Goal:** corrigir os três achados reproduzidos, mantendo os acordos aceitos e a unicidade do Pix.

**Architecture:** reconciliar atomicamente uma conversão sem comissão quando chega um pagamento anterior elegível. Preservar a linha anterior como `superseded`, fora da vaga única e das métricas. A aceitação lê o status do beneficiário sob lock e desliga comissão de novos resgates quando desativado. Estorno cancela também autoindicações.

**Tech Stack:** Bun, TypeScript, Drizzle/PostgreSQL, React.

**Spec:** `.audits/architectural-analysis-2026-11-04-campanhas.md`.

## Restrições

- Nenhum cadastro real ou mensagem. Preservar os arquivos de Palco exclusivos de staging.
- Conversões elegíveis/pagas não são substituídas; duplicatas de paymentId não revivem registros cancelados ou substituídos.
- `superseded` significa compra fora da janela substituída na atribuição, não estorno. Não reescrever histórico financeiro nem apagar paymentId.
- A desativação mantém o presente disponível, mas novos acordos ficam sem comissão. Reativação afeta somente novos resgates.
- Migração de índice gerada por `bun run db:generate`, sem editar SQL gerado. Não alterar dados históricos.

## 1. Reproduções automatizadas

- [x] Criar `packages/referrals/tests/db/campaign-review.test.ts`, PostgreSQL real: duas ordens e concorrência de pagamentos dentro/fora do prazo; duplicatas e refund; garantia/Pix não duplicados; desativação e histórico; autoindicação estornada.
- [x] Rodar `bun test tests/db/campaign-review.test.ts` com banco local descartável e comprovar os três erros.

## 2. Implementação

- [x] `referral.repository.ts`: `insertConversion` usa transação e lock do resgate; em conflito por resgate, só substitui `unrewarded` com pagamento anterior `pending` e bônus positivo. Antes de inserir, muda a linha anterior para `superseded`; violação única aborta a transação inteira. Preservar retorno `{ created: boolean }`.
- [x] `referral-repository.port.ts`, `schema.ts`: adicionar status e retirar `superseded` do índice parcial de vaga ativa; gerar migração. Espelhar o comportamento no fake existente.
- [x] `insertRedemption`: calcular `commissionEnabled = campaign.commissionEnabled && beneficiary.status === 'active'`; valor/prazo nulos quando desligada. Snapshot anterior não muda.
- [x] `cancelPendingConversionByPayment`: cancelar `self_blocked` e `superseded` além dos estados atuais, sem alerta financeiro para bônus zero.
- [x] Relatórios escolhem conversão corrente e excluem substituídas das métricas. Admin rotula novo estado e explica desativação nas campanhas.

## 3. Verificação e entrega

- [x] Rodar novamente regressões e suíte completa de Referrals com PostgreSQL real; testes relevantes do Admin; lint e typecheck dos pacotes alterados; conferir diff e geração sem drift.
- [x] Atualizar runbook/CLAUDE e registrar evidências no relatório. Corrigir também a caixa documental do deploy anterior com referência ao recibo.
- [ ] Revisar alterações, abrir PR e publicar a correção no destino de produção já solicitado, após CI/plano da versão exata. Confirmar saúde e SHA dos dois serviços.
