# Desafio do Primeiro Jogo — homologação, virada e rollback

Este runbook transforma a implementação em uma liberação verificável. Execute primeiro em
**staging** e guarde as evidências sem nome, e-mail, telefone, CPF ou dados da criança. A aprovação
técnica local não substitui a compra nos provedores de homologação nem autoriza uma virada em
produção.

Runbook complementar: [operação de eventos](desafio-primeiro-jogo-eventos.md).

## Resultado esperado

- público compra `desafio-primeiro-jogo-30-dias` por R$ 67;
- participante de evento usa cupom fixo de R$ 30 e paga R$ 37;
- os 30 dias começam em `paidAt`, inclusive em Pix e boleto;
- a cobrança, o grant e a interface usam o snapshot aceito no checkout;
- `desafio-primeiro-jogo` continua cadastrado como vitalício;
- assinaturas mensais e anuais da Comunidade não são alteradas;
- uma assinatura válida da Comunidade prevalece sobre o vencimento do Desafio.

O funil declara em código a promessa `one_time + fixed + 30 days`. Se a env apontar para uma oferta
vitalícia, incompleta ou indisponível, a página e a cobrança respondem 503 e registram
`offer.contract_mismatch`/`checkout.offer_contract_mismatch`. Essa trava evita vender uma promessa
diferente da copy.

## Responsáveis e evidências

Antes de começar, registre fora deste repositório:

| Papel | Responsabilidade |
|---|---|
| Condutor | executa o roteiro e anota horário/commit |
| Revisor | confere cada evidência e dá o go/no-go |
| Suporte | acompanha grants, ativações e mensagens |
| Rollback | possui acesso ao Railway, Catálogo e Pagamentos |

Use IDs técnicos: commit, deployment, `payment_id`, código de cupom e `event_code`. Não copie PII
para tickets, documentos ou logs.

## 1. Pré-requisitos

- [ ] CI verde no commit candidato.
- [ ] Backup/snapshot do Postgres do ambiente confirmado.
- [ ] `FUNNEL_INTERNAL_TOKEN` idêntico no Funnel e Members, com ao menos 16 caracteres.
- [ ] `FUNNEL_URL` no Members aponta para o Funnel do mesmo ambiente.
- [ ] `KIDS_COMMUNITY_URL` no Funnel aponta para a plataforma Kids do mesmo ambiente.
- [ ] `FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES` continua na oferta mensal atual.
- [ ] O curso `desafio-primeiro-jogo` está publicado e abre para um perfil Kids de teste.
- [ ] O suporte conhece o procedimento de estorno + revogação manual.
- [ ] Há uma janela curta disponível para a troca da oferta em produção.

## 2. Ordem de implantação em staging

As migrations são aditivas e forward-only. Não faça downgrade de schema no rollback.

1. Implantar **Catalog**. O `preDeploy` roda migrations `0005` a `0007` e o seed idempotente cria
   `desafio-primeiro-jogo-30-dias` em `draft` sem modificar a oferta vitalícia.
2. Implantar **Auth** para expor o estado de ativação consumido pela régua comportamental.
3. Implantar **Messaging** com os templates `challenge-*`.
4. Implantar **Members**, incluindo migration `0087` e a integração opcional com o Funnel.
5. Implantar **Admin** e conferir política de acesso, validade do cupom e gestão da matrícula.
6. Implantar **community-kids** para mostrar a validade e os estados de acesso.
7. Implantar **Funnel**, incluindo migrations `0015` e `0016`. Enquanto a env ainda apontar para a
   oferta vitalícia, a trava de contrato deve responder 503 no Desafio.
8. Ativar `desafio-primeiro-jogo-30-dias` no Catálogo.
9. Alterar `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO` para
   `desafio-primeiro-jogo-30-dias` e reiniciar/reimplantar somente o Funnel.
10. Aguardar `/readyz` ficar saudável e abrir a oferta em janela anônima.

Não altere preço ou política da oferta histórica. Não mude as envs da Comunidade.

## 3. Consultas de segurança antes da compra

Execute no Postgres do ambiente. As consultas são somente leitura.

### 3.1 Distribuição e coerência das ofertas

```sql
SELECT pricing_mode, access_mode, access_duration_unit, count(*) AS offers
FROM catalog.offers
GROUP BY pricing_mode, access_mode, access_duration_unit
ORDER BY pricing_mode, access_mode, access_duration_unit;

SELECT count(*) AS incoherent_offers
FROM catalog.offers
WHERE NOT (
  (pricing_mode = 'one_time' AND access_mode IN ('lifetime', 'fixed'))
  OR (pricing_mode = 'subscription' AND access_mode = 'billing_cycle')
)
OR (
  access_mode = 'fixed'
  AND NOT (
    (status <> 'active' AND access_duration_value IS NULL AND access_duration_unit IS NULL)
    OR (access_duration_value > 0 AND access_duration_unit IS NOT NULL)
  )
)
OR (
  access_mode <> 'fixed'
  AND (access_duration_value IS NOT NULL OR access_duration_unit IS NOT NULL)
);
```

Esperado: `incoherent_offers = 0`.

### 3.2 Os dois contratos do Desafio

```sql
SELECT slug, status, price_cents, pricing_mode, access_mode,
       access_duration_value, access_duration_unit
FROM catalog.offers
WHERE slug IN ('desafio-primeiro-jogo', 'desafio-primeiro-jogo-30-dias')
ORDER BY slug;
```

Esperado:

- histórica: `3700`, `one_time`, `lifetime`, duração nula;
- nova: `6700`, `one_time`, `fixed`, `30`, `days`; ativa somente após a decisão de virada.

Confira também que nenhuma outra oferta antiga de compra única foi reclassificada:

```sql
SELECT slug, pricing_mode, access_mode, access_duration_value, access_duration_unit
FROM catalog.offers
WHERE slug <> 'desafio-primeiro-jogo-30-dias'
  AND pricing_mode = 'one_time'
  AND access_mode <> 'lifetime';

SELECT slug, pricing_mode, access_mode
FROM catalog.offers
WHERE pricing_mode = 'subscription'
  AND access_mode <> 'billing_cycle';
```

As duas consultas devem retornar zero linhas, salvo outra oferta temporária criada
deliberadamente e registrada no change log.

### 3.3 Cupom do evento

Substitua `CODIGO_DO_EVENTO` pelo código real.

```sql
SELECT c.code, c.status, c.type, c.amount_off_cents, c.applies_to_all,
       c.max_redemptions, c.times_redeemed, c.valid_from, c.valid_until,
       count(co.offer_id) AS scoped_offers,
       bool_and(o.slug = 'desafio-primeiro-jogo-30-dias') AS only_expected_offer
FROM catalog.coupons c
LEFT JOIN catalog.coupon_offers co ON co.coupon_id = c.id
LEFT JOIN catalog.offers o ON o.id = co.offer_id
WHERE c.code = 'CODIGO_DO_EVENTO'
GROUP BY c.id;
```

Esperado: ativo, `fixed`, `3000`, `applies_to_all = false`, uma oferta no escopo e
`only_expected_offer = true`.

### 3.4 Linha de base dos compradores vitalícios

Rode antes e depois das migrations e guarde apenas os totais:

```sql
SELECT count(*) AS paid_entitlements,
       count(*) FILTER (WHERE expires_at IS NULL) AS lifetime,
       count(*) FILTER (WHERE expires_at IS NOT NULL) AS with_expiry,
       max(updated_at) AS last_update
FROM members.entitlements
WHERE source_kind = 'payment'
  AND snapshot ->> 'offerSlug' = 'desafio-primeiro-jogo';
```

Os totais e `last_update` devem permanecer iguais na ausência de uma compra concorrente. Investigue
qualquer matrícula histórica com validade; não a altere automaticamente.

## 4. Matriz de homologação

Use contas e documentos autorizados para sandbox. Cada linha precisa de evidência da oferta,
checkout, cobrança, grant e tela do aluno.

| Cenário | Meio | Cupom | Cobrança esperada | Acesso esperado |
|---|---|---|---:|---|
| Público | Cartão | Não | R$ 67 | 30 dias desde `paidAt` |
| Evento | Cartão | Sim | R$ 37 | 30 dias desde `paidAt` |
| Público | Pix | Não | R$ 67 | começa somente na aprovação |
| Evento | Pix | Sim | R$ 37 | começa somente na aprovação |
| Evento | Boleto | Sim | R$ 37 | começa quando o boleto confirmar |
| Cupom expirado | Qualquer | Sim | nenhuma cobrança | mensagem explícita, sem fallback silencioso |
| Comprador vitalício | — | — | — | continua sem data final |
| Assinante da Comunidade | — | — | — | continua enquanto a assinatura estiver ativa |
| Oferta editada após boleto | Boleto | opcional | snapshot original | preço e prazo originais |
| Webhook duplicado | qualquer | opcional | uma cobrança lógica | uma matrícula por produto, mesma validade |

Em cada compra, confirme:

1. página e checkout mostram o mesmo preço e “30 dias desde a aprovação”;
2. cupom inválido ou expirado não é removido silenciosamente;
3. `paidAt` permanece nulo enquanto Pix/boleto estiver pendente;
4. pagamento aprovado registra welcome, grant e validade;
5. a área Kids mostra a data final;
6. recarregar/reentregar o webhook não duplica a matrícula;
7. o filtro de `event_code` mostra o percurso e separa R$ 67 de R$ 37;
8. outra matrícula válida da Comunidade impede perda de acesso e avisos de expiração.

## 5. Prova pós-compra sem PII

Substitua o UUID e execute depois da aprovação:

```sql
SELECT lp.payment_id,
       p.method,
       p.status,
       p.amount_in_cents,
       l.paid_at,
       l.members_granted_at,
       lp.coupon_code,
       lp.offer_snapshot ->> 'offerSlug' AS offer_slug,
       lp.offer_snapshot ->> 'accessMode' AS access_mode,
       lp.offer_snapshot ->> 'accessDurationValue' AS duration_value,
       lp.offer_snapshot ->> 'accessDurationUnit' AS duration_unit,
       lp.offer_snapshot ->> 'chargedPriceCents' AS charged_price_cents,
       count(e.id) AS entitlements,
       min(e.granted_at) AS granted_at,
       min(e.expires_at) AS expires_at,
       bool_and(e.granted_at = l.paid_at) AS starts_at_approval,
       bool_and(e.expires_at = e.granted_at + interval '30 days') AS exact_thirty_days
FROM funil.lead_payments lp
JOIN funil.leads l ON l.id = lp.lead_id
JOIN payments.payments p ON p.id = lp.payment_id
LEFT JOIN members.entitlements e
  ON e.source_kind = 'payment' AND e.source_id = lp.payment_id::text
WHERE lp.payment_id = '<PAYMENT_UUID>'::uuid
GROUP BY lp.payment_id, p.method, p.status, p.amount_in_cents, l.paid_at,
         l.members_granted_at, lp.coupon_code, lp.offer_snapshot;
```

Esperado: snapshot `fixed/30/days`, R$ 67 ou R$ 37, `paidAt = grantedAt`, todas as matrículas
geradas pela compra com exatamente 30 dias e `members_granted_at` preenchido.

Prove a idempotência:

```sql
SELECT idempotency_key, count(*)
FROM members.entitlements
WHERE source_kind = 'payment' AND source_id = '<PAYMENT_UUID>'
GROUP BY idempotency_key
HAVING count(*) > 1;
```

Esperado: zero linhas.

## 6. Go/no-go para produção

Só avance se todos forem verdadeiros:

- [ ] toda a matriz obrigatória passou em staging;
- [ ] consultas de coerência retornaram os valores esperados;
- [ ] nenhum comprador vitalício mudou;
- [ ] cartão, Pix e boleto congelaram o contrato correto;
- [ ] cupom está restrito à oferta nova;
- [ ] página, checkout, obrigado, welcome e área Kids concordam sobre 30 dias;
- [ ] mensagens não duplicam e não chegam a quem tem acesso mais forte;
- [ ] relatório do evento conta leads únicos e não expõe PII;
- [ ] a trava de contrato foi exercitada apontando staging temporariamente para a oferta vitalícia;
- [ ] revisor aprovou as evidências e o responsável por rollback está disponível.

Qualquer falha é **no-go**. Não compense divergência de contrato ajustando texto manualmente.

## 7. Virada em produção

1. Registrar commit, horário inicial e baseline das consultas.
2. Implantar Catalog, Auth, Messaging, Members, Admin e community-kids; confirmar `/readyz`.
3. Deixar a oferta nova em `draft` e as envs da Comunidade intocadas.
4. Implantar o Funnel candidato. Com a env vitalícia antiga, o Desafio deve ficar bloqueado por 503;
   isso cria uma janela de manutenção segura, sem nova venda sob promessa divergente.
5. Ativar `desafio-primeiro-jogo-30-dias`.
6. Trocar somente `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO` para o novo slug e reimplantar/reiniciar
   o Funnel.
7. Confirmar `/readyz`, depois abrir oferta e checkout em janela anônima sem cupom e com o cupom de
   produção.
8. Fazer uma compra real autorizada de baixo risco e executar a prova pós-compra.
9. Confirmar que `desafio-primeiro-jogo` continua cadastrado como vitalício. Ele pode ficar ativo ou
   pausado conforme a política operacional, mas nunca deve ser excluído ou convertido.
10. Monitorar cada compra sentinela até o estado terminal esperado; boleto só inicia o acesso quando
    a confirmação assíncrona realmente chegar.

## 8. Monitoramento inicial

Pagamento aprovado sem grant:

```sql
SELECT id, payment_id, paid_at, members_granted_at, offer_ref
FROM funil.leads
WHERE paid_at IS NOT NULL
  AND members_granted_at IS NULL
  AND offer_ref = 'desafio-primeiro-jogo-30-dias'
ORDER BY paid_at DESC;
```

Preço e cupom efetivamente congelados:

```sql
SELECT offer_snapshot ->> 'chargedPriceCents' AS charged_price_cents,
       coupon_code,
       count(*) AS payments
FROM funil.lead_payments
WHERE offer_snapshot ->> 'offerSlug' = 'desafio-primeiro-jogo-30-dias'
GROUP BY charged_price_cents, coupon_code
ORDER BY charged_price_cents, coupon_code;
```

Observe também erros `offer.contract_mismatch`, `checkout.offer_contract_mismatch`, falhas de
grant, redeem de cupom, welcome e envio `challenge-*`. Pesquise logs por padrões de CPF, e-mail e
telefone; qualquer PII fora dos armazenamentos previstos é incidente.

## 9. Rollback seguro

O objetivo é parar novas vendas sem reescrever contratos já aceitos.

1. Pausar `desafio-primeiro-jogo-30-dias`. Isso bloqueia novas cotações e cobranças.
2. Confirmar que pagamentos já aprovados continuam com grant; pagamentos pendentes conservam o
   snapshot e precisam ser acompanhados até confirmação ou expiração.
3. Se a decisão for voltar temporariamente ao vitalício, restaure
   `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO=desafio-primeiro-jogo` **e reverta o deployment do Funnel
   para a copy vitalícia na mesma janela**. Com o código novo e a env antiga, a trava responde 503
   de propósito.
4. Não reverta migrations aditivas.
5. Não apague `offer_snapshot`, pagamentos, eventos ou matrículas.
6. Não transforme compradores de 30 dias em vitalícios, nem encurte uma matrícula concedida.
7. Não altere assinaturas da Comunidade.
8. Registre a causa, os payment IDs afetados e o critério para reabrir.

Se apenas o cupom falhar, desative o cupom e mantenha a oferta pública de R$ 67; não é necessário
trocar a oferta. Se a entrega falhar, pause a oferta nova antes de qualquer investigação.

## Registro de encerramento

- Commit liberado:
- Deployments de staging:
- `event_code` de homologação:
- Payment IDs de teste:
- Consultas anexadas:
- Revisor e horário do go/no-go:
- Deployments de produção:
- Compra sentinela:
- Incidentes/rollback:
