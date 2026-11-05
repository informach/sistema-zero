# Comissão por plano e anual de R$ 970 — 05/11/2026

Kids e Adulto: assinatura mensal R$ 97; anual R$ 970 (equivalente a R$ 80,83/mês,
economia de R$ 194 sobre 12 mensalidades, dois meses). O Catálogo é a fonte dos preços
de venda; o funil consulta suas ofertas e deriva a economia. Seeds e reservas editoriais
usam o mesmo preço. Documentos históricos anteriores a esta decisão conservam os valores antigos.

No Admin → Embaixadores → Campanhas de presente, uma nova comissão sugere **R$ 30 pela
assinatura mensal e R$ 80 pela anual**. O operador pode ajustar ambos conforme o acordo.
O vínculo não habilita comissão automaticamente. O bônus é pago uma única vez pela aquisição,
após a garantia e buffer existentes (180 horas), por Pix manual; renovações não geram outro bônus.
Duplicar mantém a comissão desligada e sugere novamente os padrões. Após a implementação,
o operador autorizou cadastrar Vivianne Lima e a campanha da clínica Laopa em produção.

Indicações diretas usam `DEFAULT_REFERRAL_BONUS` do Core como padrão dos ambientes:
`BONUS_AMOUNT_CENTS=3000` e `BONUS_ANNUAL_AMOUNT_CENTS=8000`. O Referrals captura esses
valores no resgate em `bonusAmounts`; retomar não regrava o acordo. Campanhas capturam
os dois valores em `campaignReferral`, sob os locks existentes. Se o anual estiver ausente/nulo,
vale o acordo fixo antigo para ambos os planos. Os painéis mostram os valores recebidos do
servidor e as condições específicas da campanha prevalecem. Novos campos financeiros são privados.

A seleção é pelo ciclo da oferta (`billingIntervalMonths` 1 ou 12), não pelo preço ou desconto.
Ciclo desconhecido com comissão por plano retorna erro retomável sem inserir conversão.
A unicidade por resgate/pagamento, estornos e liberação após garantia continuam valendo.

## Publicação e verificação

1. Conferir em leitura os dois slugs anuais, BRL, ciclo 12 e preço atual 79700. Se houver preço
   personalizado, investigar antes da publicação: a migração o preserva.
2. Referrals: aplicar `0008_commission-by-plan.sql`, gerada pelo Drizzle. Duas colunas anuláveis e
   um CHECK; sem alteração de resgates/comissões existentes. O ALTER requer lock breve; conferir
   tamanho das tabelas e transações longas antes. Não há backfill nem índice a reconstruir.
3. Catálogo: aplicar `0011_community-annual-970.sql` pelo migrador. UPDATE idempotente limitado
   aos dois slugs, BRL, ciclo 12 e preço 79700; preço 97000, versão +1 e `updated_at` atualizado.
   Apenas duas linhas esperadas. Um preço de comparação inferior ao novo preço é limpo; valores
   de comparação válidos são preservados. Compras e assinaturas existentes não são recalculadas.
4. Publicar backends antes de Admin, Funil e Kids pela onda canônica de produção, após PR/CI
   e plano da mesma versão. Conferir ofertas, páginas públicas, saúde e SHA dos serviços.

## Reversão

Preferir correção em nova versão. Reverter o binário antigo do Referrals depois de novos
resgates por plano pode pagar o valor fixo errado: suspender processamento e reconciliar antes.
Não remover snapshots nem colunas. Para reverter preço, usar nova migração restrita ou edição
auditada no Admin; não reexecutar seed nem reescrever o histórico de migrações. Atualizar o
funil junto para manter as reservas editoriais coerentes. Pagamentos anteriores ficam intactos.
