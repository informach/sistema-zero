# Implementação da regularização de assinaturas

**Objetivo:** fluxo único Kids/Adultos de aviso, recuperação e cancelamento automático
após sete dias sem regularização, com período pago e histórico preservados.
**Especificação:** `docs/superpowers/specs/2026-10-23-subscription-recovery.md`.
**Estado:** planejamento; nenhuma implementação ou cancelamento autorizado por este arquivo.

## Restrições comuns a todos os lotes

- Payments coordena dinheiro/assinatura; Members controla acesso; Messaging entrega.
- Kids fala com responsável e exige seu portão; Adultos fala com o titular.
- Não estender acesso por tentativa; não cobrar meses recusados em bloco.
- Não repetir POST ambíguo, reativar cancelada por link velho ou inventar sucesso.
- Usar outbox e estado persistido; não manter sete dias em timers locais.
- Comunicação financeira não passa pela sessão da criança. Segredos e dados de
  cartão não aparecem em log, banco de negócio, Git ou relatórios de teste.
- Não duplicar o dunning atual. Remover seu disparo antigo no corte definitivo.
- Fazer review e testes por lote, full review antes da ativação financeira.

## Lote 1 — Diagnóstico e contrato de dados

Modificar em `packages/payments`: `src/domain/ports/payment-gateway.port.ts`,
`src/infrastructure/gateways/efi/efi-cobrancas.mapper.ts`, `efi.gateway.ts`,
`src/application/subscription/cycle-payment.ts`, `handle-subscription-notification`,
agregado/repositório/read models de pagamento e view administrativa.

- [ ] Escrever testes de respostas reais anonimizadas: motivo no histórico,
  `payment.message` vazio, código ausente e resposta desconhecida.
- [ ] Definir dados seguros de recusa; preservar texto sem automatismo por texto livre.
- [ ] Gerar migration aditiva e testar banco antigo/novo, sem preencher motivos fictícios.
- [ ] Exibir diagnóstico no Admin sem mudar o resultado financeiro ou cancelar assinatura.
- [ ] Validar contrato dos consumidores, logs redigidos e testes existentes.

Entrega: diagnóstico confiável antes de qualquer automação.

## Lote 2 — Processo durável e cancelamento confirmado

Criar no Payments `src/domain/subscription-recovery/`, porta/repositório de casos,
casos de uso em `src/application/subscription-recovery/` e worker próprio. Alterar
`schema.ts`, composição, eventos/outbox e cancelamento/reconciliação existentes.

- [ ] Testar máquina de estados e relógio: D0/D3/D6/D7, sem reiniciar prazo por webhook.
- [ ] Gerar migration do caso, política versionada, operações e índices/uniqueness.
- [ ] Implementar aquisição de trabalho por lease, CAS e lote limitado.
- [ ] Registrar intenção antes de efeitos externos e conciliar status/histórico em
  consulta normalizada ao provedor, sem consultas redundantes por tela.
- [ ] Tratar eventos de assinatura sem cobrança e cancelamentos externos.
- [ ] Provar cancelamento confirmado, resposta perdida, falha local após sucesso,
  duas réplicas, pagamento simultâneo e reinício com trabalho pendente.
- [ ] Expor ações de observação/revisão sem ligar cancelamento automático ainda.

Entrega: um único dono, estado auditável e ações operacionais recuperáveis.

## Lote 3 — Regularização autenticada e tokenização

Modificar o port/gateway Efí e rotas Payments, os BFFs compartilhados em
`packages/member-shell/src/routes/index.ts` e `server/clients.ts`, e as telas
`community-kids/src/app/pais/_components/purchase-history.tsx` e
`community/src/app/(app)/compras/purchases-client.tsx`. Extrair tokenização reutilizável
do `packages/funnel/src/islands/CardCheckout.tsx`, sem copiar o checkout inteiro.

- [ ] Definir intenção de regularização ligada a usuário, assinatura, charge,
  moeda, valor/período e prazo; nunca aceitar provider ID arbitrário do cliente.
- [ ] Criar página de confirmação: cobrança agora + atualização para ciclos futuros.
- [ ] Bloquear link vencido/cancelado, repetição, troca de usuário e sessão de criança.
- [ ] Provar `retry` com `update_card` em sandbox; não supor que seja operação sem débito.
- [ ] Retorno muito antigo: provar cancelamento antigo antes de novo checkout,
  com período/preço novos claros e nenhuma assinatura ativa duplicada.
- [ ] Confirmar pagamento por fonte autoritativa antes de restaurar o acesso.

Entrega: caminho real de regularização, inclusive para quem já perdeu o acesso.

## Lote 4 — Avisos e experiência para cada público

Modificar templates/seeds do Messaging e consumir eventos do novo fluxo. Substituir
o disparo de `funnel/src/server/dunning.ts`/`webhook.ts` pelo dono durável de Payments,
preservando checkout, fulfillment e renovação paga já existentes.

- [ ] Definir destinatário e público pela compra/assinatura; não exigir lead do Funnel.
- [ ] Criar textos Kids para responsável e Adultos para titular: inicial, lembretes,
  regularizado e encerrado, com datas reais do prazo e do acesso.
- [ ] Registrar solicitação e resultado de entrega, com dedupe por caso/etapa/canal.
- [ ] Suprimir mensagens após pagamento/cancelamento; agrupar lembretes atrasados.
- [ ] Provar falha de e-mail/WhatsApp e fila operacional de contato, sem falso “enviado”.
- [ ] Conferir e atualizar apenas trechos comerciais necessários dos termos e
  mensagens existentes; nenhuma mudança em roteiros ou manifestos de cursos.

Entrega: avisos apropriados, sem motor duplicado nem interrupção da entrega de eventos.

## Lote 5 — Admin, política e exceções

Modificar `packages/admin/src/app/admin/pagamentos/assinaturas/`, transações,
`src/server/payments.ts`, BFFs e contratos de leitura correspondentes.

- [ ] Política inicial: sete dias, avisos D0/D3/D6, encerramento automático no D7.
- [ ] Mostrar assinatura, pagamento e acesso separadamente, inclusive divergência Efí/local.
- [ ] Filtros Kids/Adultos, pendências, motivo, prazo e histórico de ações/avisos.
- [ ] Fila de cancelamentos pendentes, resultados desconhecidos, entrega falha e
  pagamentos tardios; ações manuais autorizadas e auditadas.
- [ ] Distinguir recebido, esperado e em regularização nas métricas financeiras.
- [ ] Testar permissões, concorrência de operadores e validade dos dados exibidos.

Entrega: equipe consegue operar exceções sem SQL manual e sem marcar “pago” fictício.

## Lote 6 — Migração, ensaio completo e ativação

- [ ] Inventário somente de leitura de assinaturas existentes e relatório sem PII.
- [ ] Provar migrações Drizzle em PostgreSQL descartável com dados anteriores reais anonimizados.
- [ ] Ensaiar ponta a ponta em staging para Kids e Adultos: webhooks, worker,
  comunicação, autenticação, cartão, prazo, cancelamento e acesso.
- [ ] Testar resposta desconhecida após efeito externo e comportamento ao desligar worker.
- [ ] Full review do fluxo, de todos os efeitos financeiros e dos mecanismos de dedupe.
- [ ] Deploy de produtor/consumidores em ordem compatível; ativação primeiro em casos
  novos. Casos antigos recebem aviso/prazo novos após revisão, sem cancelamento retroativo em massa.
- [ ] Conferir confirmação Efí/local, acessos e métricas depois da ativação.
- [ ] Remover o caminho antigo de coordenação e documentar operação/retomada de exceções.

## Critério de conclusão

Não basta a interface mostrar “cancelada”: a Efí deve confirmar encerramento e deixar
de agendar novos ciclos. Pagamento confirmado encerra o caso e concede somente seu
acesso legítimo. A prova cobre os dois públicos, efeitos externos e falhas concorrentes.

O plano fica em branch de documentação separada da promoção de layout em andamento.
Não altera o SHA congelado, os CIs ou as assinaturas da produção atual.
