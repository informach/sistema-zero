# Full review — campanhas e embaixadores

Revisão em 04/11/2026 da PR #242, base `14de0b47c`, implementação `053b051ad`, integrada em `1f1c36aa5`. Escopo: os 28 arquivos alterados e os consumidores relevantes de resgates, pagamentos, bônus e administração. Não é uma auditoria integral de todos os módulos do monorepo.

## Resultado

Três achados P2, reproduzidos com PostgreSQL local e os repositórios/serviço de conversão reais. Recomendo corrigi-los antes de começar uma campanha com comissão. Não foram alterados código de produto, dados de produção ou deployments durante esta revisão.

### 1. P2 — A ordem dos eventos pode eliminar uma comissão legítima

**Local:** `packages/referrals/src/application/conversions/record-conversion.service.ts:135–151`; persistência em `referral.repository.ts:934–940` e índice parcial `conversions_redemption_uq`.

Uma compra fora da janela cria uma conversão `unrewarded`. Se seu webhook chegar antes do webhook de uma compra anterior, feita dentro da janela, a restrição por resgate impede gravar a compra anterior. O serviço consome o evento sem reconciliar a comissão. A decisão fica baseada no primeiro evento processado, não na primeira compra paga.

**Reprodução:** mesmo resgate, comissão de R$ 45 e prazo de 30 dias. Processar primeiro a compra do dia 31 e depois a do dia 1 deixa `unrewarded`, R$ 0. Processar as mesmas datas em ordem cronológica deixa `pending`, R$ 45. As entregas do Payments admitem essa inversão: são reivindicadas por `nextAttemptAt`, com retries e workers concorrentes (`packages/payments/src/infrastructure/persistence/drizzle/webhook-delivery.repository.ts:47–76`).

**Impacto:** perda permanente de comissão devida em reentregas/reprocessamentos fora de ordem. Repetir o webhook anterior não recupera o valor.

**Correção recomendada:** reconciliar por data e identidade do pagamento elegível, de forma atômica e idempotente, em vez de deixar qualquer conversão sem comissão bloquear pagamentos anteriores. Preservar as proteções contra comissão dupla e pagamentos já marcados como pagos. Testar as duas ordens, duplicatas, concorrência e estornos.

### 2. P2 — Desativação do embaixador não impede novos acordos de comissão

**Local:** `packages/referrals/src/infrastructure/persistence/drizzle/referral.repository.ts:672–686`.

O resgate bloqueia e lê o beneficiário, mas verifica apenas sua existência. Copia `commissionEnabled: true` mesmo se o status já for `disabled`. A ação de desativação só desativa códigos que têm `codes.ambassadorId`; códigos de campanha usam `campaignId`, portanto continuam aceitando novos resgates com comissão.

**Reprodução:** criar campanha ativa com R$ 45, desativar o embaixador pelo método usado no Admin, aceitar um e-mail novo e registrar a compra. Resultado: snapshot com comissão habilitada e conversão `pending` de R$ 45 para o embaixador desativado.

**Impacto:** desativar a pessoa não interrompe a geração de novas obrigações por campanhas já existentes. A regra também fica incoerente com criar/reativar campanha, operações que exigem embaixador ativo. Não se trata de quitar resgates históricos: o caso reproduzido é um cadastro aceito depois da desativação.

**Correção recomendada:** definir e aplicar o efeito da desativação sobre novas aceitações de campanhas. Não capturar novos acordos remunerados para pessoa desativada; preservar acordos já aceitos. Se a intenção de produto for manter campanhas independentes, o Admin precisa tornar essa consequência explícita e oferecer o encerramento correspondente. Testar a corrida entre desativação e resgate.

### 3. P2 — Autoindicação estornada continua contando como conversão

**Local:** `packages/referrals/src/infrastructure/persistence/drizzle/campaign.repository.ts:207`, em combinação com `referral.repository.ts:955`.

A nova contagem inclui todos os estados exceto `canceled`, inclusive `self_blocked`. Entretanto, o tratamento de estorno só cancela `pending` e `unrewarded`. Uma compra do próprio beneficiário permanece `self_blocked` depois do estorno e continua no indicador de conversões e no detalhe como assinatura registrada.

**Reprodução:** campanha com comissão; resgate e compra pelo e-mail do beneficiário; evento `payment.refunded`. Resultado: `self_blocked` e `stats.conversions = 1`, embora o único pagamento esteja estornado. Antes do vínculo remunerado, campanhas geravam `unrewarded`, que era cancelado nesse fluxo.

**Impacto:** relatório superestima vendas da ação e contradiz a legenda do Admin, que diz excluir estornos. Não houve pagamento de comissão nesse cenário.

**Correção recomendada:** refletir o estorno também nas conversões bloqueadas sem bônus, ou separar o estado da compra do estado da comissão. Preservar a auditoria e garantir que a métrica não conte a compra devolvida. Cobrir refund repetido e nova compra posterior.

## Cobertura e verificações

- Contrato, validação HTTP, autorização de leitura/escrita e preservação de campos omitidos por clientes antigos.
- Seleção de embaixador, valor em centavos, prazo, remoção do vínculo, duplicação com comissão desligada e isolamento de audiência no Admin.
- Migração aditiva, defaults antigos, restrições financeiras, journal e snapshot de schema.
- Snapshot privado no aceite, primeiro resgate por e-mail/público, edição posterior e retomada após encerramento.
- Conversão, janela, autoindicação, unicidade, estornos, maturação, notificação e marcação manual de Pix.
- Relatórios de campanhas e embaixadores, filtros de audiência e serialização explícita dos dados públicos.
- Documentação operacional e especificação da entrega.

Verificação nova: `bun test` em Referrals com PostgreSQL 17 descartável: **200 passaram, 0 falharam, 1484 assertions**. Admin: `campaign-audience`, `campaigns-client` e `ambassador-copy`: **13 passaram, 0 falharam, 56 assertions**. Esses resultados não invalidam os achados: os cenários adversos não estavam cobertos.

Prova adicional: `.cache/campaign-review/full-review.ts` usa os serviços e repositórios reais, com apenas Payments/Catalog simulados em memória; resultado em `.cache/campaign-review/full-review-evidence.json`. A execução fica restrita ao PostgreSQL local na porta 55434. Nenhum envio de e-mail ou requisição financeira externa ocorre.

Não identifiquei outro defeito concreto de autorização, exposição pública dos termos privados ou aplicação retroativa da migração no escopo revisado. Não há evidência suficiente para propor refatorações por tamanho de arquivo ou remoção de exports: os novos símbolos examinados têm consumidores. A leitura duplicada de embaixador na lista de campanhas e o filtro de conversões por participante merecem atenção apenas se houver evidência de custo; não são classificados como defeitos nesta revisão.

## Limites

As reproduções são locais, não uma investigação de registros reais de produção. O review não afirma que alguém tenha sido afetado. Não houve nova execução de toda a suíte de navegador do monorepo; a validação de implantação anterior permanece evidência histórica, separada das verificações feitas aqui. O plano de implementação ainda tem a caixa de deploy aberta, mas o recibo anterior confirma publicação concluída; isso é uma desatualização documental, não falha de deploy.

## Correções autorizadas após a revisão

Os três achados foram corrigidos na branch `fix/campanhas-review`:

- Reconciliação transacional por resgate: compra anterior elegível substitui somente `unrewarded`, preservando a linha como `superseded`. O índice parcial e os relatórios excluem essa linha, mas o paymentId continua único. Conflito de pagamento desfaz a substituição inteira; bônus já prometidos/pagos permanecem intactos.
- Aceite com beneficiário desativado preserva atribuição e presente, mas captura comissão desligada. O bloqueio de linha serializa a decisão com a desativação. Aceites históricos não mudam; reativação vale apenas para novos aceites. O Admin explica a regra.
- Estorno cancela também autoindicações e compras substituídas sem bônus. Métricas excluem o pagamento devolvido, mantendo a proteção de comissões elegíveis/pagas.

Evidência: as regressões inicialmente tiveram **3 passes e 5 falhas**, reproduzindo os defeitos. Após correção, a suíte completa de Referrals passou com **210 testes, 0 falhas e 1538 assertions** em PostgreSQL 17 descartável; dez testes novos cobrem ordens de eventos, concorrência, rollback por paymentId, estornos, duplicatas, desativação e preservação do Pix. O teste de upgrade preserva todos os campos de uma conversão paga e verifica os índices após a 0007. Admin: **15 testes, 0 falhas**; typecheck dos dois pacotes, lint Referrals e geração sem drift passaram. Logs locais em `.cache/campaign-review/fixes-*.log`.

Runbook e CLAUDE atualizados, incluindo bloqueio durante recriação do índice e limites de rollback. A caixa do deploy anterior foi corrigida com o recibo da execução 41926981112. Esta seção documenta verificação local; a nova publicação é uma etapa separada, registrada pelo workflow de produção da correção. Nenhum cadastro real foi criado.
