# Revisão completa — presentes e compras dentro da plataforma

Data: 19/11/2026. Escopo: implementação local descrita no desenho e no plano de comércio na plataforma. Não inclui o trabalho paralelo de Studio/Molda nem os pedidos anteriores de mídia, disco ou sincronização de staging.

**Situação após a correção de 19/11/2026:** os seis achados foram tratados na implementação local. A descrição abaixo conserva as reproduções e o diagnóstico da revisão inicial; as linhas indicadas são históricas e mudaram com as correções.

| Achado | Correção aplicada | Evidência principal |
| --- | --- | --- |
| R01 / P1 | Plano financeiro imutável com commit anterior ao despacho; replay não recota nem altera corpo/chave. Recibo parcial também é reconciliado. | Testes nativos de resposta perdida/preço alterado e recibo parcial; PostgreSQL real confirma corpo byte a byte após JSONB. |
| R02 / P1 | Reivindicação única por conta/produto e revalidação dentro do lock; segunda oferta adota a compra existente. Assinatura ativa/indisponibilidade não liberam outra cobrança; recompra depende de encerramento e fatos de acesso. | Mensal/anual em paralelo em duas conexões independentes do PostgreSQL; teste Chromium confirma adoção do checkout/origem retornados. |
| R03 / P1 | CEP normalizado validado antes da reserva nativa. Payments sinaliza explicitamente `paymentCreation: not_started` quando comprova ausência de efeito financeiro; somente essa prova e códigos permitidos liberam correção/novo nonce. Erro de validação da resposta ou de fase desconhecida conserva o plano. | DTO HTTP real de Payments, casos de uso reais antes/depois de efeitos externos, rejeição corrigível e ausência da prova no checkout nativo. |
| R04 / P2 | Recuperação própria precede disponibilidade/elegibilidade. Origens autorizadas são lembradas; lista autenticada de operações em Minhas compras permite abrir por ID mesmo sem card/aula. | Catálogo 503 + recuperação/listagem real no PostgreSQL; BFF com bloco removido; recarga e entrada durável no Chromium. |
| R05 / P2 | Inspeção autenticada e execução compartilham busca de vaga/histórico. Recibo próprio traz prazo e possibilidade de retomada; UI prioriza o claim existente. | Serviço + HTTP: campanha encerrada, email alterado, prazo esgotado e conta sem claim; Chromium fecha/reabre e conclui a ativação pendente. |
| R06 / P2 | Migration `0012` e snapshot de Referrals regenerados juntos a partir de `0011`; nova migration `0023` de Funnel gerada pelo schema. | Cadeias aplicadas em PostgreSQL 17 isolado; índice/CHECK conferidos; `db:generate` posterior não produz SQL em ambos os serviços. |

Plano e decisões: `docs/superpowers/plans/2026-11-19-comercio-na-plataforma-correcoes.md`. Operação e ordem de implantação: `docs/operations/comercio-na-plataforma.md`.

A rodada não fez deploy, migration remota, publicação de conteúdo ou cobrança real. As integrações com Efí e webhooks remotos continuam dependendo da homologação habitual. A checagem geral de tipos de Members encontrou erros independentes no trabalho paralelo de Studio (`SymbolNames` × `ReadonlySet`); esses arquivos foram preservados.

## R01 — P1: retomada pode apagar uma cobrança com resultado desconhecido

**Arquivo principal:** `packages/funnel/src/server/member-commerce-charge.ts:137–165`.

O indicador `sentToProvider` começa em `false` em cada execução. Ele só informa se **esta execução** chamou Payments; não informa se a tentativa persistida já foi enviada por uma execução anterior. Entretanto, qualquer erro anterior à chamada desta execução provoca `discardUnsentAttempt()`.

Reprodução confirmada:

1. Uma compra por cartão chega ao provedor e é aprovada; a resposta para o funil se perde antes de o lead receber o pagamento. A reconciliação/webhook ainda não ocorreu.
2. O funil conserva `pendingRequest`, sem `paymentId` no lead, e apresenta `PROCESSING`.
3. O preço muda antes da retomada.
4. `resume` repete a intenção original, mas `startCard` encontra o novo preço e retorna `OFFER_CHANGED` antes de chamar Payments novamente.
5. Como o indicador local continua `false`, o código apaga a intenção **que já havia produzido efeito externo**. A compra volta a `READY`.
6. A pessoa confirma o preço atual e escolhe Pix. O servidor aceita outro pagamento, com outra chave de idempotência, embora o cartão anterior já esteja pago.

Resultado da reprodução: retomada `409`; estado posterior `READY`; segundo pagamento `200`; duas chamadas aceitas pelo provedor simulado, uma `CREDIT_CARD/PAID` e outra `PIX/PENDING`, com chaves distintas. Não depende de adulterar a identidade ou o preço: é a sequência de resposta perdida, reconciliação ainda pendente, atualização da oferta e troca de método.

**Impacto:** possibilidade de dois pagamentos para a mesma compra e perda do vínculo necessário para reconciliar o primeiro resultado.

**Correção proposta:** persistir a fase da tentativa antes do envio e distinguir pedido ainda não despachado de pedido despachado/desconhecido. Uma retomada desconhecida deve reconciliar a chave original com Payments e preservar o contexto comercial original. Não pode ser descartada apenas porque a repetição encontrou preço, disponibilidade ou validação diferentes.

**Regressão necessária:** resposta perdida após criação → mudança de preço → retomada → tentativa por outro método. Exigir que o resultado original seja reconciliado e que não surja outro pagamento enquanto permanecer desconhecido.

## R02 — P1: ofertas diferentes do mesmo produto permitem assinaturas simultâneas

**Arquivos:** `packages/funnel/src/server/member-commerce-store.ts:68,163`; `packages/funnel/src/db/schema.ts:330`; `packages/member-shell/src/routes/commerce.ts:249–260`.

A unicidade é `(account_id, offer_id)`, a preparação trava conta/oferta e a cobrança trava o ID do checkout. A elegibilidade é lida antes dessas operações, fora de uma coordenação por conta/produto. As ofertas mensal e anual de uma mesma comunidade têm IDs e checkouts diferentes.

Reprodução confirmada com os BFFs e handlers reais:

1. A mesma conta abre uma oferta mensal e outra anual do mesmo produto.
2. As duas consultas de elegibilidade retornam ausência de assinatura, antes de qualquer cobrança.
3. As confirmações são enviadas em paralelo.
4. Cada oferta utiliza seu próprio checkout/lock; ambas criam assinatura.

Resultado: respostas `[200, 200]`, duas chamadas de criação de assinatura para a mesma conta/produto. O teste utiliza stores em memória separados por oferta; a leitura do schema e das chaves de lock confirma que o adaptador PostgreSQL também não possui exclusão por conta/produto. Não se trata de uma prova executada em PostgreSQL real.

**Impacto:** cobrança/assinatura duplicada ao confirmar planos diferentes em abas, cards ou aulas distintas.

**Correção proposta:** centralizar uma reivindicação comercial atômica por conta/produto, abrangendo ofertas equivalentes e pagamentos em processamento. Revalidar a existência de intenção/assinatura dentro da seção protegida, antes do efeito externo; apenas acrescentar um lock sem revalidar o estado após adquiri-lo não elimina a leitura obsoleta do BFF. Encaminhar a segunda confirmação à operação existente.

**Regressão necessária:** confirmar mensal e anual simultaneamente, com elegibilidade inicial idêntica, e comprovar no máximo uma assinatura. Exercitar também duas réplicas contra o mesmo PostgreSQL.

## R03 — P1: rejeição definitiva antes de criar pagamento prende o cadastro

**Arquivos:** `packages/funnel/src/server/member-commerce-charge.ts:143–165`; `packages/funnel/src/server/member-commerce.ts:148`; `packages/funnel/src/server/member-commerce-state.ts:55–61`. A validação/normalização envolvida já existe em `checkout.ts:108–115` e `checkout-schema.ts:35–44`.

Toda chamada a Payments marca `sentToProvider = true`, mesmo quando Payments rejeita os dados antes de criar cobrança/assinatura. Nesse caso, o pedido canônico é preservado, o lead não recebe `paymentId`, o estado vira `PROCESSING` e `restart` exige justamente um pagamento que não existe. Novos dados enviados pelo cliente são ignorados em favor do pedido antigo.

Foi confirmado um caso concreto com a validação HTTP real de Payments:

1. Uma assinatura recebe CEP `abc`, que passa pelo `AddressSchema` do funil.
2. `cleanAddress` remove os caracteres e envia CEP vazio.
3. O DTO real `CreateSubscriptionBody` de Payments rejeita o CEP antes de executar a criação; o error handler real converte a validação em `400`.
4. O checkout nativo responde `502` e mantém a intenção em `PROCESSING`.
5. Corrigir o CEP e confirmar novamente repete o endereço inválido; tentar reiniciar retorna `409`.

Resultado: **zero assinaturas criadas**, formulário de correção inacessível e repetição do mesmo corpo incorreto. Uma recusa de cartão que já possui um `paymentId` com status `FAILED` é outro caminho e não é o problema descrito aqui.

**Impacto:** uma entrada inválida recuperável pode bloquear indefinidamente novas tentativas dessa conta/oferta.

**Correção proposta:** retornar e persistir uma classificação explícita de rejeição definitiva sem efeito externo, separada de resultado desconhecido. Permitir corrigir dados e obter novo token/nonce depois de uma rejeição comprovada; preservar/reconciliar tentativas desconhecidas. Validar também o endereço já normalizado antes de despachar. Corrigir somente a validação do CEP não resolve os demais erros definitivos dessa classe.

**Regressão necessária:** DTO real de Payments recusa antes da criação → pessoa corrige os dados → nova tentativa válida, sem replay do corpo rejeitado. Manter simultaneamente a proteção de R01.

## R04 — P2: compra pendente deixa de ser recuperável após pausar a oferta

**Arquivos:** `packages/funnel/src/server/member-commerce.ts:125–146`; `packages/member-shell/src/routes/commerce.ts:105`; `packages/member-shell/src/components/commerce/commerce-panel.tsx:43–48`.

O painel só conserva `checkoutId` em memória. Depois de fechar/recarregar, volta a chamar `inspect` por origem/oferta. O funil só consulta `store.prepare` quando a oferta está disponível; em cards, o BFF bloqueia a origem ainda antes quando `isAvailable` é falso. Assim, a exceção que permite consultar uma compra existente por ID não é suficiente para recuperá-la pela interface.

Reprodução confirmada: iniciar Pix → pausar a oferta → reabrir sem o ID devolve `404`; consultar o ID conhecido continua devolvendo `200/PENDING` com o pagamento existente.

**Impacto:** perde-se na interface o código/status de um pagamento ainda válido quando a venda é pausada ou sua janela se encerra, contrariando a mensagem de que é possível fechar e voltar.

**Correção proposta:** resolver primeiro uma intenção própria existente por conta/oferta, independentemente da disponibilidade para novas vendas. Aplicar disponibilidade, origem publicada e elegibilidade de nova compra ao iniciar uma intenção nova; a leitura/retomada de uma intenção própria deve usar os vínculos persistidos. Oferecer também uma entrada durável para compras pendentes.

**Regressão necessária:** recarga real do navegador após pausar oferta/remover apresentação, preservando leitura do Pix/status e bloqueando uma cobrança nova. Repetir com indisponibilidade transitória do Catálogo.

**Observação verificada, não contada como novo problema:** uma assinatura `PENDING` faz `inspect` encaminhar ao gerenciamento antes de consultar o checkout. É uma proteção deliberada na classificação atual. A futura recuperação da intenção deve distinguir a operação própria iniciada desse bloqueio de uma segunda assinatura, preservando a proteção de R02.

## R05 — P2: campanha encerrada esconde a retomada de presente já iniciado

**Arquivos:** `packages/member-shell/src/components/commerce/commerce-panel.tsx:36,250–277`; `packages/referrals/src/interfaces/http/member-gifts.routes.ts:29–37`.

O `inspect` de presente informa o estado da campanha, mas não o resgate da conta. `giftResult` só existe no estado do componente. Depois de fechar/reabrir, uma campanha encerrada leva ao ramo que informa indisponibilidade e remove o botão de conferir/retomar, mesmo que a pessoa tenha iniciado o resgate validamente antes do encerramento.

A rotina canônica de Referrals permite retomar resgates existentes após encerrar a campanha, mantendo a janela original do presente. A suíte de campanhas contém essa garantia. A nova apresentação não consegue expressá-la.

Reprodução em Chromium, com o componente real e backend simulado: primeiro aceite retorna `processing`; a campanha passa a `ended`; fechar/reabrir mostra apenas indisponibilidade; não há botão de retomada. A segunda chamada direta ao backend ainda conclui a operação existente.

**Impacto:** uma família com resgate interrompido pode perder o caminho de recuperação mesmo dentro do prazo original de acesso.

**Correção proposta:** o `inspect` autenticado deve consultar o resgate da própria conta e devolver estado, vencimento e possibilidade de retomada. O painel deve priorizar essa operação existente sobre a disponibilidade para novos aceites. Não reabrir indiscriminadamente campanhas encerradas para novos resgates.

**Regressão necessária:** claim válido → `processing` → encerramento/pausa da campanha → recarga → concluir a mesma concessão, com a mesma data de vencimento.

## R06 — P2: snapshot de Referrals não representa a migration nova

**Arquivos:** `packages/referrals/src/infrastructure/persistence/drizzle/migrations/meta/0012_snapshot.json`; `packages/referrals/src/infrastructure/persistence/drizzle/migrations/0012_member_gift_slots.sql`.

O SQL de `0012` amplia o CHECK de `gift_slot` e cria `scholarship_redemptions_user_audience_idx`, mas o snapshot `0012` ainda descreve somente `main/parents:%` e não contém o índice novo. `generate --custom` preservou a estrutura anterior. As diferenças de ordem de propriedades nos demais índices/FKs não mudam a estrutura; o problema é a ausência das alterações novas no estado de referência.

Reprodução confirmada, sem banco e sem modificar os arquivos originais: copiar as migrations/meta para `.cache/commerce-review/referrals-generation`, apontar um config temporário para o schema real e executar `drizzle-kit generate`. A migration seguinte gerada contém:

```sql
ALTER TABLE "referrals"."scholarship_redemptions"
  DROP CONSTRAINT "scholarship_redemptions_gift_slot_check";
CREATE INDEX "scholarship_redemptions_user_audience_idx"
  ON "referrals"."scholarship_redemptions" USING btree ("user_id", "audience");
-- Segue a recriação do CHECK que a migration 0012 já ampliou.
```

**Impacto:** uma geração posterior, mesmo sem mudanças de schema, repete o DDL já executado. Depois de aplicar `0012`, o `CREATE INDEX` seguinte conflita com o índice existente e pode interromper um futuro deploy. A ordem atual de aplicação de `0012` não resolve a divergência do snapshot.

**Correção proposta:** antes de publicar esta migration ainda local, regenerar SQL e snapshot coerentes pelo fluxo do Drizzle. No sandbox, a geração regular identificou exatamente o CHECK e o índice esperados; não foi necessário recriar as colunas antigas. Não editar snapshots à mão nem reescrever migrations já aplicadas em ambientes.

**Regressão necessária:** depois da geração correta, uma nova execução de `generate` sem mudança de schema deve informar ausência de alterações e não criar SQL. Validar a cadeia também em um PostgreSQL de homologação.

## Cobertura da revisão

Foram priorizados os novos handlers, store, controlador/painel, formulário, resgate autenticado e regras de elegibilidade. Também foram conferidos os contratos Core/Members/Admin, importação/exportação e conclusão de aulas, configuração do Catálogo, rotas HMAC/JWT do Gateway, classificação de público em Payments, migrations e documentação de rollout. As alterações pequenas foram conferidas por diff; snapshots gerados tiveram estrutura, vínculo e alterações de schema conferidos, sem alegar validação de execução no banco.

Inventário local de 77 arquivos de código/testes/configuração em `.cache/commerce-review/inventory.json`, além de documentação e migrations da entrega. Não é uma auditoria do monorepo inteiro.

Aspectos preservados e verificados:

- Identidade revalidada no servidor; bloqueio de perfis infantis e impersonação; proteção de origem/CSRF.
- Referência da oferta/campanha resolvida no servidor, sem confiar em preço ou destinatário do navegador.
- Preço e versão de termos conferidos antes do pagamento; nenhuma concessão síncrona para lead não pago.
- Idempotência da mesma oferta e proteção da propriedade do checkout; os problemas encontrados envolvem outros estados e ofertas concorrentes.
- Ausência de PAN/CVV no pedido persistido; reutilização da tokenização existente.
- Blocos comerciais fora dos requisitos de conclusão; propagação dos dois tipos nos renderizadores, DTOs e autoria.
- Componentes e tokens visuais existentes, sem identidade nova; problema visual de R05 é de estado/fluxo.

## Verificações executadas nesta revisão

| Verificação | Resultado |
| --- | --- |
| Funnel, suíte completa | 669 passaram; 2 pulados; zero falhas |
| Referrals, suíte completa | 213 passaram; 50 pulados; zero falhas |
| Payments, suíte completa | 436 passaram; 219 pulados; zero falhas |
| Catalog, suíte completa | 163 passaram; 13 pulados; zero falhas |
| Gateway, suíte completa | 327 passaram; 2 pulados; zero falhas |
| Core, autoria, importação/exportação, BFF e elegibilidade | 35 passaram; zero falhas |
| Members: acesso, publicação e curso para pais | 23 passaram; zero falhas |
| Biome, 77 arquivos da entrega | Passou, sem autofix |
| Reproduções adicionais | R01–R06 confirmados conforme descrito acima |
| Build Admin | Passou, incluindo compilação, TypeScript e geração das páginas |
| Build Kids | Passou, incluindo compilação, TypeScript e geração das páginas |
| Build adulto | Passou, incluindo compilação, TypeScript e geração das páginas |

Total das suítes acima: **1.866 testes passaram; 286 foram pulados**. Esses resultados não demonstram ausência dos defeitos reproduzidos. Os testes de banco pulados não foram contados como verificações de PostgreSQL.

Evidências locais:

- `.cache/commerce-review/reproduce.ts` e `reproductions.json`: falha definitiva, resposta perdida/preço, ofertas paralelas, reabertura de oferta pausada e observação sobre assinatura pendente.
- `.cache/commerce-review/rejected-address.ts` e `rejected-address-result.json`: usa DTO/error handler reais de Payments para R03.
- `.cache/commerce-review/gift-ui-browser.mjs`, `gift-ui-result.json` e `pending-gift-ended.png`: componente real em Chromium para R05.
- `.cache/commerce-review/referrals-generation/0013_premium_hex.sql`: DDL redundante gerado na cópia isolada para R06; `referrals-review.config.ts` é o config temporário.
- `.cache/commerce-review/*-tests.log` e `*-build.log`: saídas dos comandos desta rodada.

As dependências externas de cobrança foram simuladas. Nenhuma cobrança real foi realizada. Não foi executada migração em PostgreSQL nesta revisão: a configuração local não oferece o banco esperado acessível. Concorrência em réplicas, migrations e webhooks reais continuam sendo verificações obrigatórias de homologação.

## Ordem recomendada de correção

1. R01 e R03: estabelecer estados duráveis e distinguíveis para preparado, despachado/desconhecido, rejeitado sem efeito e pagamento identificado. Exercitar as duas regressões juntas, pois uma correção não pode reintroduzir o problema oposto.
2. R02: coordenação atômica de intenções equivalentes por conta/produto.
3. R04 e R05: recuperar o estado próprio persistido antes de decidir a disponibilidade de uma nova operação.
4. R06: alinhar SQL/snapshot antes de aplicar as migrations.
5. Executar regressões, testes reais de banco/concorrência e validação integrada em homologação antes de publicar.
