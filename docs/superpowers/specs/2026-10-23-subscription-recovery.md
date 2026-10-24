# Regularização e encerramento de assinaturas

Estado: proposta para revisão, sem implementação financeira ou alteração em assinaturas.
Decisões confirmadas: atender Kids e Adultos; avisar o responsável no Kids e o próprio
assinante no Adulto; cancelar automaticamente a recorrência após sete dias sem
regularização, preservando histórico e período já pago.

## 1. Resultado esperado

Uma renovação recusada inicia um processo acompanhado: informar o motivo, oferecer
regularização, lembrar o prazo e encerrar a recorrência quando não houver solução.
Não acumular silenciosamente novos ciclos recusados por meses. Cancelamento solicitado
pelo cliente é imediato e não espera esses sete dias.

Três informações permanecem independentes: situação da assinatura no provedor,
situação de cada pagamento e validade do acesso. Uma assinatura pode estar ativa na
Efí, ter uma cobrança recusada e já não conceder acesso; a interface deve explicar isso.

## 2. O que já existe e o que falta

| Área | Existente | Ajuste proposto |
| --- | --- | --- |
| Payments | Assinaturas/ciclos, cancelamento, eventos, outbox, webhook e reconciliação de ciclos pagos | Motivo seguro da recusa, processo durável de recuperação e reconciliação do cancelamento |
| Efí | Gera as recorrências; consulta e cancelamento; recuperação de cobrança com novo token | Adapter completo e prova de autorização antes de qualquer recuperação |
| Members | Acesso até o período pago mais carência configurada | Mostrar a validade real sem estendê-la por um aviso ou uma tentativa |
| Funnel | Aviso best-effort por falha; encaminha eventos ao Messaging | Transferir a coordenação da recuperação para Payments e retirar o disparo duplicável |
| Messaging | Templates e entrega por e-mail/WhatsApp | Templates por público, agenda durável, registro de envio/recusa e deduplicação |
| Kids | Área dos Pais com assinatura/cancelamento e portão de responsável | Regularização autenticada, motivo compreensível, prazo e estado do acesso |
| Adultos | Compras com assinatura/cancelamento | Mesmo fluxo financeiro, diretamente para o assinante |
| Admin | Pagamentos e assinaturas separados | Visão operacional integrada e fila de exceções |

Referências de código verificadas: `payments/src/application/handle-subscription-notification`,
`payments/src/infrastructure/workers/subscription-reconciliation-worker.ts`,
`payments/src/application/cancel-subscription`, `funnel/src/server/dunning.ts`,
`funnel/src/server/webhook.ts`, `messaging/scripts/seed-templates.ts`,
`members/src/application/grant-entitlement/grant-entitlement.service.ts`,
`community-kids/src/app/pais/_components/purchase-history.tsx` e
`community/src/app/(app)/compras/purchases-client.tsx` (todos sob `packages/`).

## 3. Política comercial inicial

- Escopo inicial: renovação de assinatura anteriormente paga. Primeira compra recusada
  continua no fluxo de checkout; não recebe mensagem de perda de um acesso nunca concedido.
- D0: recusa confirmada no provedor, abertura do caso e aviso inicial.
- D3: lembrete se ainda pendente. D6: último lembrete com data de encerramento.
- D7: nova consulta ao provedor; se continuar sem pagamento e sem operação de pagamento
  pendente, solicitar cancelamento e confirmar seu resultado.
- Repetição de webhook ou outro ciclo não reinicia o prazo. Política e vencimento
  ficam fixados no caso; mudanças no Admin valem para casos novos.
- Não adicionar novas retentativas automáticas de débito nesta primeira versão. A Efí
  já controla a recorrência; regularização de pagamento depende de ação autorizada.
- Não cobrar os meses recusados em bloco. O usuário vê qual cobrança, valor, período
  e próxima renovação está autorizando. Retomada posterior é uma contratação clara.
- A janela de recuperação de sete dias não vira sete dias extras de acesso. Members
  continua aplicando a carência configurada (padrão atual de três dias).
- Históricos, projetos, conquistas e cursos concluídos são preservados. O término
  afeta apenas acessos oriundos daquela assinatura, respeitando outras concessões válidas.

Prazos e agenda serão configuráveis no Admin com limites validados, versão, autor
e trilha de auditoria. O padrão aprovado é o mesmo para os dois públicos.

## 4. Responsabilidade de cada serviço

**Payments é o único dono do processo financeiro.** Registra a recusa e sua origem,
abre/fecha casos, coordena intenções de regularização, cancela a recorrência e confere
o estado na Efí. Não depende de lead do Funnel existir para acompanhar uma assinatura.

**Members continua dono do acesso.** Apenas pagamento confirmado e regras existentes
concedem/estendem acesso. Uma tentativa, um novo cartão, aviso enviado ou resposta
`waiting` do provedor não liberam produto. Cancelar não retira período já pago.

**Messaging entrega comunicações.** Reaproveitar templates, fila e idempotência;
registrar solicitado, aceito, entregue ou falho conforme evidência disponível. Envio
aceito não é prova de leitura. Dados do comprador vêm de referências existentes da
assinatura; público vem da compra/oferta validada, não do nome do produto.

**Funnel permanece dono do checkout e da aquisição.** Não manter dois motores de
avisos: retirar seu dunning best-effort quando o fluxo durável for ativado. Renovação
não repete boas-vindas, aquisição, uso de cupom ou concessão inicial.

## 5. Dados e estados

Adicionar dados seguros de falha ao pagamento: status original do provedor, código
quando fornecido de forma confiável, mensagem sanitizada, categoria e instante observado.
Não armazenar PAN, CVV, token de pagamento ou resposta integral da Efí.

Na consulta real examinada, o motivo apareceu no texto do histórico, enquanto
`payment.message` estava vazio. Portanto, não pressupor um código estruturado sempre
disponível. Preservar o texto seguro para o Admin; categoria desconhecida permanece
desconhecida. Não basear débito, cancelamento ou concessão em interpretação de texto livre.

Criar `subscription_recovery_cases` com assinatura/consumidor, ciclo de origem,
primeira falha, prazo, versão da política, estado, próxima ação, evidências dos avisos,
última confirmação do provedor e motivo de encerramento. Índice único impede dois
casos abertos para a mesma assinatura. Intenções e resultados das operações são duráveis.

Estados do caso: `open`, `payment_pending`, `cancel_pending`, `recovered`, `canceled`
e `manual_review`. O estado financeiro existente da assinatura não é substituído por
esses rótulos. Razões de cancelamento distinguem solicitação do cliente, decisão
administrativa, falta de regularização e cancelamento externo confirmado.

Reutilizar a outbox transacional de Payments. Scheduler consulta `next_action_at`
com índice, lote limitado e lease persistido. Não manter transação SQL aberta durante
chamada externa nem usar timer em memória para representar sete dias.

## 6. Regularização segura

No Kids, entrada em `/pais/conta`, com autenticação e portão do responsável. No Adulto,
entrada em `/compras`, com autenticação do assinante. Links de mensagem localizam o
fluxo; não autorizam cobrança por si só. A página continua acessível para regularizar
mesmo se o produto estiver sem acesso. Criança não recebe ações ou alertas financeiros.

Incluir também atualização preventiva em assinatura ativa e em dia: **Atualizar cartão**
altera somente o cartão das próximas renovações, pela edição de assinatura da Efí
(`PUT /v1/subscription/:id`, apenas `payment_token`). Não mudar preço, plano ou data,
nem chamar a operação de retry nesse fluxo. Provar os efeitos em sandbox. A operação
com parcela pendente é outra ação, **Atualizar cartão e pagar**, com confirmação do valor.

Reaproveitar a tokenização usada em `funnel/src/islands/CardCheckout.tsx`, extraindo
o que for compartilhável. Token segue uma única intenção autorizada, nunca logs ou
armazenamento permanente. O servidor resolve a cobrança por posse da assinatura e
confere consumidor, público, moeda, valor original e estado atual na Efí.

A Efí documenta `POST /v1/charge/:id/retry` para cartão `unpaid`, com `update_card`.
Isso pode cobrar a parcela escolhida e atualizar o cartão; a tela deve dizer isso
claramente, sem apresentar o botão como simples cadastro sem débito. A relação entre
ciclo quitado, novo período de acesso e próxima execução deve ser provada em sandbox.

Uma cobrança de vários meses atrás não será usada automaticamente para prometer
acesso a partir de hoje. Nesse caso, encerrar a recorrência antiga e iniciar nova
assinatura após confirmação do encerramento e aceite explícito do novo período/preço.

Após cancelamento, links antigos de recuperação deixam de executar retry. A Efí
pode reativar assinatura cancelada se a última parcela pendente for paga por retry;
somente uma nova autorização explícita pode iniciar a retomada. Não misturar recuperação
de caso aberto com criação de uma nova assinatura.

O domínio atual considera `FAILED` terminal, e o reconciliador ignora ciclos pagos
que já têm linha local. A recuperação da mesma cobrança exige uma operação explícita
para registrar liquidação confirmada de um ciclo recusado, com prova de identidade e
valor. Não liberar genericamente toda transição de FAILED/EXPIRED/CANCELED para PAID,
não zerar o registro para PENDING e não criar outro pagamento para o mesmo charge.
Manter o histórico da recusa e emitir o pagamento confirmado apenas uma vez.

## 7. Cancelamento, falhas e concorrência

- Solicitação do cliente invalida imediatamente novas intenções de débito e tem
  prioridade sobre ações agendadas. D7 usa o mesmo caso de uso de cancelamento.
- Confirmar cancelamento por consulta ao provedor antes de anunciar sucesso. Timeout
  deixa `cancel_pending`; reconciliação resolve o resultado, sem forjar `canceled`.
- Cancelamento já efetivado é idempotente. Se o provedor cancelar e o banco local
  falhar, reconciliação deve concluir o registro e sua comunicação.
- Webhooks de assinatura sem `charge_id` precisam de tratamento próprio; o parser
  atual focaliza cobranças. Cancelamento externo deve sincronizar mesmo sem pagamento novo.
- D7 concorre com pagamento: se houver confirmação paga, fechar como recuperado; se
  houver resultado desconhecido/pendente, conciliar antes de decidir. Não ignorar prazo
  indefinidamente: sinalizar operação ambígua e escalar para revisão da equipe.
- POST de recuperação sem garantia de idempotência do provedor não é repetido por
  timeout. Persistir intenção, impedir segundo comando e consultar o mesmo charge.
- Débito pago que chegue depois do cancelamento é registrado e conciliado, sem
  apagar o pedido do cliente nem reativar cobranças futuras automaticamente.
- Falha de contato ou de provedor gera alerta e fila visível. Não considerar aviso
  enviado se a entrega nem foi aceita; não cancelar silenciosamente sem aviso anterior.

## 8. Comunicação e telas

| Local | Experiência |
| --- | --- |
| Kids / responsável | “Não conseguimos renovar a Comunidade Kids. Confira o pagamento para manter o acesso da criança.” |
| Adulto / assinante | “Não conseguimos renovar sua assinatura. Confira o pagamento para continuar usando sua comunidade.” |
| Último aviso | Data de encerramento, ação de regularizar e opção de cancelar, sem ameaça de cobrança retroativa |
| Confirmação | Recorrência encerrada; validade efetiva do acesso e histórico preservado |
| Admin | Motivo da recusa, situação Efí/local, ciclos, prazo, avisos, tentativas e cancelamento confirmado/pendente |

E-mail transacional é o canal principal. WhatsApp reutiliza integração e preferências
válidas, sem multiplicar mensagens por reentregas. Após recuperação/cancelamento,
avisos pendentes são suprimidos. Depois de indisponibilidade do sistema, agrupar
lembretes vencidos em um aviso adequado; não despejar três mensagens de uma vez.

No Admin, manter separação Kids/Adultos na visão comercial e identidade financeira
da assinatura. Métricas distinguem pago, esperado, em regularização e cancelado;
parcela recusada não vira receita recebida nem dívida consolidada por inferência.

## 9. Migração e implantação

Adicionar tabelas/colunas e índices com migrations geradas pelo fluxo Drizzle do
projeto; dados antigos sem motivo detalhado ficam desconhecidos, não inventados.
Primeiro rodar inventário somente de leitura e comparar provedor, acesso e registros.

Não cancelar em massa assinaturas antigas porque sua primeira falha foi há mais de
sete dias. A entrada do legado é uma campanha controlada: confirmação de estado,
aviso novo e prazo novo, sem mensagens retroativas. Linhas ambíguas ficam para revisão.

Implantar o fluxo completo primeiro em staging com dados de teste; depois ativar
em produção para falhas novas e um lote revisado das antigas. Versão de política e
modo operacional ficam explícitos. Desativar o worker interrompe ações futuras, mas
não desfaz cancelamentos confirmados nem apaga intenções financeiras pendentes.

## 10. Critérios de aceite

Provar Kids e Adultos: recusa, aviso, regularização com cartão novo, sucesso antes
do prazo, ausência de pagamento até D7, cancelamento pelo titular e cancelamento
externo. Provar webhook duplicado/atrasado, duas réplicas, reinício do worker,
timeout após efeito externo, pagamento concorrente e e-mail indisponível.

Nenhum teste financeiro usa cartão, dados ou assinatura de cliente real. Usar
relógio controlado para sete dias, PostgreSQL real para concorrência e sandbox Efí
para efeitos externos. Acesso deve ser conferido em Members e ambas as interfaces.

## Fontes técnicas

- https://dev.efipay.com.br/docs/api-cobrancas/assinatura/ — consulta, cancelamento,
  recuperação por charge, `update_card` e reativação por retry.
- https://dev.efipay.com.br/docs/api-cobrancas/notificacoes/ — notificações do provedor.
- Código do Sistema Zero inspecionado na base `ef292cb0f`.

Este documento não contém dados, identificadores ou mensagens de clientes reais.
