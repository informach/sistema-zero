# Seeds da plataforma para produção

> Histórico do lote de 22/10. Atualização de 26/10: a nova Jornada foi ativada nos dois
> ambientes e o Clube adulto foi definido/criado com Geral e Recados da equipe.
> Ver [Jornada](../../qa/2026-10-26-creator-journey-activation.md) e
> [Clube adulto](../../qa/2026-10-26-adult-club-seed.md). A pendência do Clube descrita abaixo
> registra o estado anterior; o seed atual já inclui sua definição.

**Objetivo:** popular configurações comerciais e jornadas com fontes aprovadas, sem recriar alunos, conquistas, matrículas ou conteúdo pedagógico.

**Arquitetura:** manter um operador por domínio, com `plan`/`status` antes de `apply`; aproveitar serviços e repositórios existentes. Criar apenas registros ausentes. Diferenças em registros já autorados são relatadas e preservadas. Não criar um framework genérico de seed.

**Stack:** scripts TypeScript/Bun existentes, serviços de aplicação e Drizzle/Postgres; bootstrap Kids canônico do release.

## Inventário e lacunas comprovadas

| Domínio | Fonte atual | Lacuna / decisão |
|---|---|---|
| Catálogo | `packages/catalog/scripts/seed.ts` | Preços, slugs, fulfillment e status aprovados já existem. O script escreve imediatamente, cria várias ofertas **ativas** e reconcilia alguns produtos existentes. Extrair essas definições sem reinterpretar valores; planejamento deve listar preços, status, itens e referências de curso. Aplicação somente de ausentes, sem atualizar produtos/ofertas do Admin. |
| Deploy Catalog | `packages/catalog/package.json` (`db:deploy`) | Executa migrations **e seed** automaticamente. Separar seed explícito de deploy, em coordenação com o responsável pela implantação; não deixar criação de ofertas ativas escondida no preDeploy. |
| Jornada adulta | `packages/members/scripts/seed-adult-journey.ts`, `src/application/adult-journey/adult-journey-seed{,-once,-args}.ts` | Já há plano e `seedIfAbsent` transacional. Boot aplica plano **parcial** quando há cursos iniciais; saída zero de `--once` também pode significar skip/erro. Relatório deve distinguir política existente, ausência de cursos, parcial e completa. Reusar seed-once, sem `--force`, sem alterar versão já publicada. |
| Jornada Kids | `packages/members/scripts/bootstrap-kids-journey.ts`, `scripts/release/kids-journey-bootstrap.mjs` | Usar somente initialize/capture/baseline/publish do coordenador existente. Preservar preparação e política publicada. Ordem Members → initialize → Auth novo e antigos retirados → captura → publicação → apps pertence à frente de rollout, fora deste lote. |
| Hub | `packages/hub/scripts/seed-community-spaces.ts` | Hoje contém somente Kids e reescreve acesso/teaser existentes; `SEED_PUBLIC` abre acesso. Novo operador não usa esse atalho nem altera configuração existente; reporta diferenças. Adult Mural tem slug aprovado `mural-dos-criadores-adulto` e chave `adult-mural-dos-criadores`. Ainda falta localizar/aprovar definição completa do Clube adulto e seus canais; não inventar slug/permissões. |
| Cursos / recompensas | Admin e fluxo de conclusão de cursos/oficinas | Não seedear curso Python, roteiro, objetivos, publicação, conclusão ou grants. A concessão real usa `studioUnlockBlocks` e o fluxo de conclusão existente. Configuração comercial não comprova que `courseRef` tem conteúdo publicado. |

## Lotes e ownership proposto

1. **Catálogo:** `packages/catalog/scripts/seed.ts`, novo módulo de definições/plano específico em `packages/catalog/scripts/`, testes focados em `packages/catalog/tests/`, documentação local. Mudança de `db:deploy` somente coordenada com dono do release. Plano inspecionável antes de qualquer conexão de escrita; aplicação revalida estado e preserva concorrência/alterações do Admin. Ofertas ativas devem aparecer explicitamente no plano revisado; não trocar seus status silenciosamente.
2. **Hub:** `packages/hub/scripts/seed-community-spaces.ts`, módulo específico de definições/plano e testes focados. Preservar espaços/canais existentes integralmente, inclusive acesso e nomes. Inserir faltantes somente com definições aprovadas; falha explícita em conflito de identidade/audiência. Não tratar o slug Kids como espaço adulto.
3. **Adult:** CLI/relatório específico reaproveitando `buildAdultJourneySeed` e `seedIfAbsent`. Expor política vigente e estágios faltantes antes de apply. Política parcial existente permanece intacta e é reportada para autoria posterior. Não alterar serviço de jornada, pedagogia ou resetar `adult_journey_reached`.
4. **Kids:** documentação/comando de status do coordenador canônico apenas; nenhum SQL paralelo ou novo controller neste ownership.

O contrato adotado é `plan` (default), `status` e `apply`, com argumentos estritos. A regra final confirmada exige ao menos uma conquista conhecida da linguagem escolhida, JavaScript ou Python, também no Pro, além do produto Estúdio Completo e da capacidade Pro. Estes seeds não concedem blocos nem criam curso Python para fabricar elegibilidade; o Clássico conserva a exigência de currículo aprovado com dependências completas.

## Provas exigidas

- Plan/status não escrevem; argumentos desconhecidos e pedidos de force/reseed não se convertem em apply.
- Banco vazio: plano identifica registros exatos, incluindo ofertas ativas e cursos referenciados; apply cria apenas o planejado por serviços de domínio.
- Segunda execução não cria duplicatas. Registro alterado pelo Admin permanece byte a byte igual; drift aparece no relatório. Mudança concorrente não é sobrescrita.
- Adult sem cursos, parcial, completo e já configurado produzem estados distintos; seed-once preserva política, conquistas e versão existente.
- Hub preserva canais/acessos existentes e não aceita abrir comunidade por `SEED_PUBLIC` no caminho de produção.
- Relatório não contém credenciais, connection strings, dados pessoais ou estado de alunos. Nenhuma aplicação real durante testes; testes leves com os adapters de teste existentes.

## Sequência operacional posterior

Migrations e barreira Kids canônica → leitura `status`/`plan` de cada domínio → revisão das ofertas ativas, cursoRef e lacunas adultas → apply específico autorizado → novo status e recibo sanitizado. A criação de oferta não concede produto a usuários nem prova checkout, conteúdo publicado ou jornada completa. Não executar seeds destrutivos/de desenvolvimento (`seed-course`, fixtures de QA) em produção.

## Implementação e operação

- Catálogo: `catalog-seed-definitions.ts` contém os 19 produtos e 12 ofertas extraídos dos payloads literais do seed anterior, cujo SHA-256 é `4f2b8694a02b1c570a5a041d3abf3b4b80585d54ce24ffb22bee270cea8f4e8f`. Nenhum preço/status/fulfillment foi reinterpretado. `catalog-seed-plan.ts` compara por SKU+slug e code+slug; cria pelos serviços de domínio existentes; não chama update. Referências nas definições são SKUs, resolvidos para IDs apenas na aplicação. Uma nova promessa comercial dependente de produto divergente fica bloqueada para revisão no Admin.
- Hub: `community-seed-plan.ts` conserva as duas definições Kids e acrescenta exatamente o Mural adulto aprovado de `scripts/local-studio-stack/curriculum.ts:ensureAdultMural`, com defaults da API Admin: pré-moderação adulta false, acesso pela chave plena, canal `parede` staff_only, ordem append. O Clube adulto permanece pendente; não há slug/permissão inventado. A inserção de canal compara e bloqueia a linha do servidor numa transação para não herdar configuração alterada durante a operação. Índices únicos e `ON CONFLICT DO NOTHING` preservam inserções concorrentes.
- Adult: `seed-adult-journey-production.ts` usa `adult-journey-production-seed.ts`, `buildAdultJourneySeed` e `runAdultJourneySeedOnce`/`seedIfAbsent`. Não chama configure/force. O relatório distingue ausência de cursos, plano parcial, completo e política existente; mostra etapas ausentes do template sem declarar que uma política customizada do Admin é inválida. `apply --allow-partial` é a opção explícita para o plano parcial. O boot canônico continua com sua política existente; este operador não impede uma inicialização feita pelo boot.
- Deploy: `catalog db:deploy` executa somente migrations. O setup local passa `apply` explicitamente a Catálogo e Hub. Nenhum outro deploy passa a criar ofertas silenciosamente.

No container, o diretório é a raiz do monorepo. Com serviço e ambiente já selecionados pelo operador e variáveis próprias desse serviço, executar:

```text
bun packages/catalog/scripts/seed.ts plan
bun packages/catalog/scripts/seed.ts status
bun packages/catalog/scripts/seed.ts apply

bun packages/hub/scripts/seed-community-spaces.ts plan
bun packages/hub/scripts/seed-community-spaces.ts status
bun packages/hub/scripts/seed-community-spaces.ts apply

bun packages/members/scripts/seed-adult-journey-production.ts plan
bun packages/members/scripts/seed-adult-journey-production.ts status
bun packages/members/scripts/seed-adult-journey-production.ts apply
# Somente se o plano parcial foi explicitamente aceito:
bun packages/members/scripts/seed-adult-journey-production.ts apply --allow-partial
```

Os relatórios JSON incluem definições canônicas e nomes dos campos divergentes; não serializam erros do driver, credenciais, connection strings nem estado de alunos. Catálogo e Hub podem ter aplicação parcial por falha: `created`, `failures` e o estado após a tentativa mostram isso, e uma nova execução cria apenas os ainda ausentes. `incomplete` retorna exit 1. Hub usa `defined-scope-complete` para o conjunto aprovado, mantendo `pendingDefinitions` visível; isso não afirma conclusão do Clube adulto. Adult retorna exit 1 para falha, ausência de cursos ou parcial sem a opção explícita. Reconsultar `status` após aplicar.

Não houve aplicação em ambiente real, implantação ou prova de checkout neste lote. Os testes locais exercitam serviços reais de Catálogo, o seed-once adulto, portas in-memory, conflitos de identidade, corrida de criação, preservação de configurações, erros sanitizados e argumentos estritos: 31 testes e 184 assertions.

O gate PostgreSQL isolado foi executado em 22/10/2026, com autorização do responsável pelo release: bancos novos `catalog_seed_review` e `hub_seed_review`, somente no contêiner local identificado antes do start, porta `127.0.0.1:55449`. As migrations canônicas foram aplicadas somente nesses bancos; o banco Members existente permaneceu intocado. Catálogo passou 1 teste/14 assertions, comprovando plan/status sem escrita, criação 19/12, idempotência e preservação de alterações comerciais. Hub passou 2 testes/16 assertions, incluindo inserções concorrentes protegidas pelo índice único, mudança do servidor antes da inserção do canal recusada pela transação, herança de acesso e preservação do Admin. O contêiner foi parado e o estado confirmado ao final. Recibo privado sanitizado: `.cache/python-reference-games/seed-db-review-r2.json`; a tentativa r1 recusada antes do start também foi preservada.

Os testes SQL são opt-in, aceitam somente o banco local isolado de seu domínio e exigem banco vazio; não usam `DATABASE_URL` da aplicação. As variáveis específicas são `CATALOG_SEED_TEST_DATABASE_URL` e `HUB_SEED_TEST_DATABASE_URL`. Tipagem focada de scripts/testes Catalog, Hub e Adult passou com Node 24.22, heap 1536 MiB, configurações herdadas sem afrouxar strict. Isso não substitui o plano/status do ambiente de implantação nem o aceite do fluxo comercial.
