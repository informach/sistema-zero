# Implementação da regularização de assinaturas

**Objetivo:** fluxo único Kids/Adultos de aviso, recuperação e cancelamento automático
após sete dias sem regularização, com período pago e histórico preservados.
**Especificação:** `docs/superpowers/specs/2026-10-23-subscription-recovery.md`.
**Estado:** implementação autorizada pelo usuário; lotes financeiros ainda não ativados.
Este documento não autoriza cancelamentos ou cobranças manuais em clientes reais.

## Prioridade concluída e retomada — 24/10, 14:47 UTC

Por nova orientação da responsável, os lotes de gravação foram antecipados e já
foram implantados: menu adulto, “Objetivos do projeto” / “Verificar projeto”, fontes
dos cursos e derivados. Staging ativo em `b2d096fae`; produção em `93f7f9221`, PR
#212. Os arquivos e as versões ativas foram conferidos; os manifestos publicados
serão reimportados pela responsável, sem migração direta de textos nem mídia.
Detalhes em `docs/qa/2026-10-24-recording-deploy-verification.md`.

A frente financeira foi retomada do commit `ffb988ae5`, com o staging atual
integrado, preservando as mudanças financeiras ainda não ativadas. Já existem
admissão e coordenação duráveis D0/D3/D6/D7, avisos deduplicados e retiradas,
cancelamento auditado/fenced, troca preventiva de cartão e pagamento explícito do
ciclo original, fila Admin e confirmação auditada do período por fonte recente.
As caixas abaixo continuam representando o aceite integrado, não ausência de código.

Conferência de RETRY incerto implementada: consulta canônica do pagamento original,
auditoria permanente, CAS por executor/tentativa e revisão separada do período,
sem repetir POST. Migration gerada 0020; prova local em
`docs/qa/2026-10-24-subscription-retry-confirmation.md`. Ainda não ativada.

Próximos pontos: operar os demais resultados UNKNOWN com prova sem repetir POST;
revisar o caso histórico individual com aviso/prazo novos; fechar UX/contratos de
regularização e projeção da próxima cobrança; retirar a coordenação antiga só no
corte; configurar templates/ambientes, provar migrações e ensaiar os dois públicos.
Depois, full review financeiro, correções, revisão final da composição e ativação.

Atualização da retomada: o status de operação pendente passou a aparecer na própria
assinatura das duas comunidades, inclusive depois do webhook PAID. Os contextos
explicam o bloqueio entre cartão/regularização; a leitura da conta distingue falha
de lista vazia e descarta respostas obsoletas. Provas e limites em
`docs/qa/2026-10-24-subscription-pending-status.md`. O polling em lote/backoff também
foi implementado (`80d0ea698`), conforme
`docs/qa/2026-10-24-deployment-monitor-backoff.md`; permanece para a entrega financeira.

Por pedido expresso, as correções do acompanhamento serão publicadas junto da
entrega financeira: orçamento de produção de 60 minutos (já presente nesta branch,
agora conciliado com a revisão e controles adicionais de limite global) e polling
de staging em lote com tratamento de limitação da API. O CI dos aplicativos passou;
os acompanhamentos anteriores falharam por cota da API e prazo, e os deployments
foram reconciliados sem duplicação. Não repetir os POST desses deployments.

## Complemento verificável — auditoria de cancelamento, 24/10

Coordenação de avisos e oito templates versionados foram implementados no lote
posterior à retirada de intenções (`16bd9b966`). O prazo usa o aceite original;
falta de envio no D7 vai para revisão; retiradas pendentes sobrevivem ao fechamento
do caso com janela limitada. Payments 479/1349, Messaging 171/813, tipos completos
dos dois pacotes exit 0. Detalhes em
`docs/qa/2026-10-24-recovery-notice-coordination.md`. Ainda falta ligar o coordenador
financeiro/D7 e ativar templates/configuração nos ambientes; nenhum envio real foi
feito por esses testes.

Lote seguinte implementou fila de admissão, política congelada, prova recente do
provedor, revisão de origens ambíguas/antigas, dedupe após crash e worker limitado.
Migration gerada 0015; PostgreSQL descartável desde zero; Payments 472/1309, sem
falhas ou skips, tipos completos exit 0. Detalhes e limites em
`docs/qa/2026-10-24-subscription-recovery-admission.md`. Coordenação dos avisos e D7
ainda não executa nessa etapa; o processo não foi ativado nos ambientes.

O CI `40080180893` da composição `c974f61cb` terminou SUCCESS, incluindo tipos
completos e os nove jobs adicionais; o deploy de staging foi pulado por ser branch
financeira. Isso não constitui implantação ou aceite financeiro ponta a ponta.

O lote local posterior acrescenta origem/autor/caso do pedido, confirmação observada
e histórico permanente na mesma transação da assinatura/outbox, com migration
gerada 0014. Pedido explícito substitui o automático sem perder suas evidências;
recuperação não retira pedido humano. O worker de cancelamento genérico não
reivindica solicitações NONPAYMENT: a decisão D7 continua do coordenador pendente.
Revisão causal identificou e corrigiu vínculo de caso de outra assinatura.
PostgreSQL descartável dedicado: Payments 453 testes / 1267 asserções, zero falhas
ou skips. Tipagem do Payments passou; resultados e limites em
`docs/qa/2026-10-24-subscription-cancellation-audit.md`.

Ainda faltam coordenação integrada/admissão dos casos, revalidação D7, pagamento
explícito com período original, templates/seeds, operação de exceções, configuração
dos ambientes e ensaios sandbox/UI. Os dois full reviews globais, os dois lotes
finais e os deploys desta entrega permanecem pendentes na sequência aprovada.

## Checkpoint anterior — 24/10, 09:00 UTC

Implementados e commitados na branch financeira: diagnóstico seguro de recusa;
liquidação estreita de renovação FAILED confirmada PAID; intenções de operação;
troca preventiva de cartão com UI/BFF nas duas comunidades; confirmação durável de
cancelamento com fencing de execução e bloqueio de débito incerto; casos e política
persistentes; retirada de mensagens ainda na fila; adapter HMAC de comunicação com
capacidade limitada; ledger de envelopes/recibos; público da compra validado pelo
registry; editor administrativo de prazos/lembretes e auditoria de sua configuração.

Últimos lotes: `553ef6f42` (avisos), `68d14f8de` (origem do público), `e783b6560`
(fencing/cancelamento), `2b5f9e528` (política/Admin/IaC); conciliação com staging
remoto em `c974f61cb`. CI manual da composição `c974f61cb`: run `40080180893`, em
andamento neste checkpoint, sem deploy por estar na branch financeira.
Provas locais: Payments 438/1206 sem skip contra PostgreSQL real; Admin 916/3819;
Gateway 290/1214 com dois testes Redis opcionais não executados. Tipos locais de
Payments/Gateway e foco UI Admin passaram; tipos completos Admin/BFF são parte do CI.

Ainda não entregar como fluxo concluído: falta admissão e coordenação integrada dos
casos, motivo/autor do cancelamento, D7 com revalidação, regularização com pagamento
explícito/período original seguro, templates e seeds de comunicação, fila de
exceções/ações operacionais, migração/configuração de ambientes, sandbox e prova real
dos dois públicos. A coordenação antiga do Funnel só sai no corte para o novo motor.
O primeiro full review global só ocorre após isso. Os dois lotes finais e o segundo
full review continuam na sequência aprovada ao fim deste documento.

A implantação anterior, separada deste fluxo financeiro, foi conferida em produção
no SHA `6067b14e7`: sete serviços alvo SUCCESS, nenhum pending e antigo Kids REMOVED;
health público das três interfaces 200. O workflow expirou antes do Kids terminar
e continua registrado como falho; não houve repetição cega. Relatório em
`docs/qa/2026-10-24-production-lesson-release.md`.

## Restrições comuns a todos os lotes

### Corte e ambiente — checkpoint 24/10, 18:21 UTC

Full review posterior reproduziu recontagem de ciclo após retenção do inbox, com
expiração prematura de plano finito. Corrigida por identidade persistente e
confirmação atômica; migrations 0024/0025 e Payments 589/1850 em banco novo, sem
falhas/skips. Ver `docs/qa/2026-10-24-subscription-cycle-idempotence.md`.
Inspeção READ ONLY detectou uma divergência histórica de contador em assinatura
ilimitada; GET da operadora confirmou quatro ciclos, contador local seis. Falta
correção técnica auditada desse metadado, sem mexer em recibos/acesso/recorrência.

A correção técnica está implementada e validada localmente, com prova nova da Efí,
igualdade exata de identidades, CAS e auditoria protegida em coluna própria.
Payments 598/1882 sem falhas/skips e tipos completos. Ver
`docs/qa/2026-10-24-subscription-legacy-cycle-review.md`. Resta executar preview/apply
na imagem qualificada após deploy e confirmar o resultado por leitura. Não houve
escrita no registro real.

Preparados: retirada do remetente antigo do Funil, seed restrito dos oito modelos,
prontidão de modelos/remetente/fila antiga e download Windows limitado em etapa
separada. Messaging 176/843 sem falhas/skips e tipos completos; Funil 596 sem
falhas, dois testes opcionais de analytics não executados, tipos Astro sem erros.
Variáveis novas configuradas e referências conferidas nos dois ambientes, com
skipDeploys; nenhuma política ou cliente real acionado. Roteiro operacional e
limites em `docs/qa/2026-10-24-subscription-cutover-preparation.md`.

Faltam full review integrado, CI do SHA final, integração/deploy staging com
migrations e aposentadoria de réplicas antigas, seed real e ensaio sandbox/UI
Kids/Adultos; depois promoção e ativação controlada em produção. A publicação dos
textos/menu para gravação já foi concluída e não depende deste corte financeiro.

### Próxima cobrança e período exibidos — lote de leitura

Implementado e validado localmente: migration gerada 0021, 543 testes Payments,
projeção advisory sem novas chamadas no browser e provas de atraso/coerência.
Detalhes em `docs/qa/2026-10-24-subscription-billing-calendar.md`. Ainda não ativado.

Remover a derivação por `lastChargeAt + meses`: esse timestamp registra recebimento,
inclusive tardio. Manter o contrato financeiro de `lastChargeAt` intacto. Projetar
a data civil `nextExecution` da consulta já feita pelo backstop de assinaturas,
sem chamadas à operadora na página da conta. Persistir observação nullable em coluna
própria, com fencing de origem/instante; vencer a projeção após 24h e não inventar
data quando faltar prova. Falha nessa projeção deve ser registrada e não pode
impedir a conciliação canônica de dinheiro já recebido.

Ler o período pago dos recibos VERIFIED_PERIOD persistidos, em lote e escopado às
assinaturas do titular. Usar esse período no aviso de assinatura cancelada; sem
fallback para paidAt. Testar atraso, fim de mês/ano bissexto, calendário de Brasília,
leitura vencida, observações fora de ordem e ausência de dados. Gerar migration
pelo Drizzle e aplicar somente na base QA nova antes da ativação financeira.

### Entrada histórica controlada — contrato de implementação

Implementada e validada localmente com migration gerada 0022: Payments completo
563/1748, tipos completos exit 0; Admin quatro testes externos/13 asserções e
Biome 21 arquivos. Revisão individual, concorrência, prova vencida, auditoria e
reuso do público Kids/Adulto na próxima recusa estão cobertos. Detalhes e limites:
`docs/qa/2026-10-24-subscription-historical-admission.md`. Sem ativação nos ambientes.

Inventário readonly de renovações FAILED anteriores à ativação, sem acompanhamento
ou admissão; registros revisados já existentes também aparecem. Não somar valores
como dívida nem criar casos em massa. O Admin age em uma cobrança por vez, com
versão esperada, request ID e público explícito quando a origem não o informa.
Público comprovado pelo registry não pode ser sobrescrito por esse comando.

A aplicação confere assinatura/valor/titular/estado atuais e o histórico do provedor:
exige a cobrança mais recente identificável, ainda FAILED, assinatura ACTIVE, data
original conhecida e nenhuma tentativa de pagamento pendente. Informação ambígua
recusa a abertura. O caso usa política atual e abertura atual; o prazo começa só
no aceite do primeiro aviso, nunca na primeira falha histórica.

Persistir caso, auditoria permanente da revisão e recibo de admissão na mesma
transação, revalidando fonte local/versão/política e frescor depois das esperas.
Auditoria identifica autor/request/público/versão/instante observado e data original.
Não falsificar metadata de registry nem repetir efeito em replay. Uma admissão
automática concorrente fica fenced pelo mesmo caso/recibo. A ação não cobra,
cancela nem concede acesso. Testes locais não atuam sobre a cliente real.

Fechamento por ciclo posterior implementado e validado localmente: ação Admin
própria, auditoria permanente e reavaliação de CASE_EXISTS em lote limitado.
Payments completo 582/1824; 18 cenários de banco/68 asserções revalidados após as
últimas guardas. Detalhes: `docs/qa/2026-10-24-subscription-subsequent-payment.md`.
Sem implantação/ativação ou ensaio sandbox/UI. A reutilização do público já está implementada,
sem inventar `billingAudienceSource=funnel-registry-v1`.

Implementação do fechamento por ciclo posterior: ação administrativa própria e
idempotente no caso, com versão/request. Exigir consulta nova da assinatura e da
cobrança posterior, mesma origem/valor/titular, recibo local PAID com período
VERIFIED_PERIOD e ciclo original ainda FAILED. Sem operação financeira ativa ou
lease vigente do coordenador. Gravar fechamento com motivo distinto
SUBSEQUENT_CYCLE_PAID, auditoria permanente referindo o recibo posterior e outbox
atomicamente; não mudar o pagamento antigo nem produzir outro payment.paid.
Replays retornam a decisão já auditada. Reavaliar CASE_EXISTS em lote limitado,
somente com assinatura ativa sem cancelamento e sem outro caso ativo, preservando
política e contador de tentativas. Nenhuma cobrança ou novo período é criado pela
ação. Provas vencidas após locks/escritas fazem rollback. Cobrir casos sem recibo,
fonte divergente, operação/lease ativo, concorrência e reavaliação futura em banco.

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

- [x] Escrever testes de respostas reais anonimizadas: motivo no histórico,
  `payment.message` vazio, código ausente e resposta desconhecida.
- [x] Definir dados seguros de recusa; preservar texto sem automatismo por texto livre.
- [x] Reusar `payments.failure_reason`, já existente e exibido pelo Admin; nenhuma
  migration necessária neste lote. Não preencher motivos fictícios em linhas antigas.
- [x] Alimentar o diagnóstico existente do Admin sem mudar o resultado financeiro
  ou cancelar assinatura. Conferência visual em staging pendente.
- [x] Validar contrato dos consumidores, redação e testes existentes: 331 testes,
  791 asserções, zero falhas; 10 casos de banco pulados sem PostgreSQL local.
  Typecheck do Payments e Biome dos nove arquivos passaram.

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

Base verificada em 24/10: caso/política congelada, agenda D0/D3/D6/D7,
migration gerada 0010, repositório com lease/CAS/outbox e testes de concorrência
em PostgreSQL real. A integração do worker, dos avisos, da política administrativa
e das origens continua pendente; as caixas deste lote representam o fluxo inteiro.

## Lote 3 — Regularização autenticada e tokenização

Modificar o port/gateway Efí e rotas Payments, os BFFs compartilhados em
`packages/member-shell/src/routes/index.ts` e `server/clients.ts`, e as telas
`community-kids/src/app/pais/_components/purchase-history.tsx` e
`community/src/app/(app)/compras/purchases-client.tsx`. Extrair tokenização reutilizável
do `packages/funnel/src/islands/CardCheckout.tsx`, sem copiar o checkout inteiro.

- [ ] Definir intenção de regularização ligada a usuário, assinatura, charge,
  moeda, valor/período e prazo; nunca aceitar provider ID arbitrário do cliente.
- [ ] Criar página de confirmação: cobrança agora + atualização para ciclos futuros.
- [ ] Criar atualização preventiva de cartão em assinatura ativa, sem débito imediato,
  via edição `payment_token`, preservando preço/plano/data e separada do retry.
- [ ] Provar liquidação de ciclo recusado existente: operação explícita do domínio
  para confirmação financeira, sem reset de status, duplicação de charge ou evento;
  reconciliador deve tratar a linha local FAILED ao receber confirmação PAID.
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

## Sequência final aprovada em 24/10

1. Concluir assinaturas, atualização de cartão, regularização, avisos e cancelamento
   para Kids e Adultos. Fazer full review de domínio, segurança, concorrência,
   persistência, acesso, comunicação e interface; corrigir e verificar os achados.
2. Implementar o lote visual da lista de aulas adulta conforme
   `2026-10-24-adult-lesson-outline-theme.md`.
3. Implementar “Objetivos do projeto” / “Verificar projeto” conforme
   `2026-10-24-project-objective-names.md`, incluindo roteiros e todos os textos
   derivados de falas ElevenLabs afetados. Preservar as demais falas e instruções.
4. Fazer outro full review da composição completa e corrigir os achados antes de
   integrar. Atualização dos textos não significa substituição de áudio já gravado;
   entregar a relação exata dos trechos de gravação afetados.
5. Fazer commit dos lotes verificados, atualizar o staging local com o remoto,
   integrar, enviar a staging e validar CI e implantação. Promover a mesma árvore
   aprovada a produção pelo fluxo canônico e conferir versões, configuração,
   migrações, saúde e fluxos implantados nos dois ambientes.

A implantação anterior já iniciada continua separadamente, com seu SHA congelado.
Nenhum lote financeiro incompleto entra nessa promoção. A conclusão de deploy
exige evidência dos ambientes; disparar o workflow não basta.

## Critério de conclusão operacional

Não basta a interface mostrar “cancelada”: a Efí deve confirmar encerramento e deixar
de agendar novos ciclos. Pagamento confirmado encerra o caso e concede somente seu
acesso legítimo. A prova cobre os dois públicos, efeitos externos e falhas concorrentes.

O plano fica em branch de documentação separada da promoção de layout em andamento.
Não altera o SHA congelado, os CIs ou as assinaturas da produção atual.
