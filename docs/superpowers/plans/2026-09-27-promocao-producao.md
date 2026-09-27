# Promoção segura para produção — plano de implementação e execução

> Para execução por agentes: usar a skill disponível `executing-plans`, seguindo as tarefas e seus critérios de saída. Este arquivo é planejamento; não dispara deploy nem autoriza uma mutação remota por si só.

**Objetivo:** promover a plataforma preservando cursos legados, jogos, histórico e acessos, com conversão verificável e aviso temporário por visita.

**Arquitetura:** preparar o schema numa release A compatível com produção; na release B, implantar os novos contratos em ordem, converter os dados sob bloqueio de escritas e reabrir após validação. Tratar a virada comercial como onda coordenada e a substituição dos cursos como trabalho editorial gradual.

**Stack:** Bun/TypeScript, PostgreSQL/Drizzle, Railway, GitHub Actions, Next.js, Cloudflare R2 e Workers.

**Especificação e evidências:** [diagnóstico de 27/09/2026](../../plans/2026-09-27-promocao-producao-design.md). Ler este documento junto com a especificação; os números abaixo são baselines observados, não constantes para novas execuções.

**Correções autorizadas em 27/09:** conversor habilitado e testado para produção; runbook reescrito; CORS público e configuração/CORS de anexos do Admin aplicados em produção. Admin reiniciado no mesmo SHA `5734facb` (deployment `c94f7607-8de0-4359-af92-1cc70e190247`). Certificado Fiscal excluído desta rodada. A promoção completa e a conversão dos jogos não foram executadas. Evidências e sequência vigente no [runbook](../../runbooks/promocao-producao-aulas-2026-09-19.md).

## Restrições gerais

- Quiz separado da seção principal é permitido, conforme confirmação do usuário.
- Cursos atuais continuam publicados; não copiar cursos/banco de staging por cima de produção.
- Aviso uma vez por visita, sempre dispensável, até terminar a reformulação dos cursos.
- Manter IDs, autoria, links, recursos, notas, direitos e progresso. Não recriar registros excluídos nem apagar trabalho concorrente.
- Não editar migrations SQL já aplicadas, reescrever timestamps ou apagar journal para fazê-lo coincidir com staging.
- Não executar `db:push`, seed de cursos, `desafio:reorganize` ou importação massiva de cursos nesta virada.
- PR para main com CI verde e merge commit; artefato e SHA fixados por onda.
- Dados brutos/backup em armazenamento privado; apenas resumos sem PII no repositório.
- Fazer backup de banco **e** objetos R2, testar recuperação e preservar até o fim da janela de acompanhamento.
- Não executar `services=all` nesta promoção. Não acionar o workflow `CI` manualmente em main: o dispatch também pode deployar staging.

## Entregas e ordem

1. Preparação operacional e correções de infraestrutura.
2. Release A do banco e contrato de compatibilidade comprovado.
3. Conversor com destino produção e cobertura atualizada.
4. Modal e conteúdo mínimo de Como fazer.
5. Ensaio completo em cópia isolada.
6. Execução ordenada A → B → conversão → validação → reabertura.
7. Onda comercial e acompanhamento, conforme decisão operacional.

O usuário autorizou a subida completa, incluindo o trabalho em andamento no estado atual, e a publicação adicional de Cadê Todo Mundo?. A autorização não dispensa CI, backups, restauração e verificações. Não é necessária nova confirmação para executar as etapas já autorizadas.

## Tarefa 1 — Tornar a promoção controlável

**Arquivos:** `.github/workflows/deploy-production.yml`, `docs/ambientes-e-fluxo.md`, `docs/runbooks/promocao-producao-aulas-2026-09-19.md`; criar `scripts/release/manifest.ts` e `scripts/release/manifest.test.ts` se o workflow ainda não produzir as mesmas evidências diretamente.

**Entrada:** SHA de main, SHA candidato, deployments efetivamente ativos e journal de cada contexto.

**Saída:** manifesto por onda com ambiente, SHA esperado, serviços selecionados, deployment IDs anteriores/novos, migrations esperadas, checks, horários e localização dos backups. Sem segredos.

- [x] Atualizar o runbook antigo para apontar para este plano e remover a orientação obsoleta de restaurar a antiga `0091_sai_o_apoio_das_secoes`.
- [x] Acrescentar ao workflow input `expected_sha` e recusar execução se não corresponder à main resolvida. Durante a janela, congelar novos merges em main. O input foi implementado e testado.
- [x] Fazer cada onda aguardar `SUCCESS`, conferir SHA e `/readyz`; `SKIPPED`, ausência de deployment ou timeout não contam como serviço atualizado.
- [x] Impedir `all` no caminho específico desta promoção ou usar exclusivamente CSV por etapa. O mapa associativo do workflow atual não define uma ordem de dependências.
- [x] Enumerar os gatilhos automáticos reais do Railway. O documento antigo menciona Admin/Funnel/Community; não presumir que só esses estão ativos. Guardar configuração anterior para restaurá-la.
- [ ] Verificar que Helpdesk/Helpdesk App e serviços não participantes não são rebaixados na release A.
- [ ] Registrar autorização da janela, condutor, pessoa que valida os smokes, pessoa com acesso ao backup e prazo máximo de parada. Definir duração a partir do ensaio, com margem, sem prometer zero indisponibilidade.

Critério de saída: um teste com SHA divergente não faz chamada de deploy; um serviço com SHA incorreto falha; o manifesto relaciona exatamente os serviços selecionados.

## Tarefa 2 — Preparar a release A e a barreira de manutenção

**Arquivos:** branch preparatória baseada em `origin/main`; artefatos `packages/members/src/infrastructure/persistence/drizzle/migrations/0076_*.sql` até `0090_*.sql`, snapshots correspondentes e `meta/_journal.json`; teste de journal; fixtures de upgrade em `packages/members/tests/db/learning-migrations.test.ts` ou novo `release-upgrade.test.ts`.

**Barreira implementada:** `scripts/release/start.mjs` em Members, Hub, Admin, Community e Kids, com `RELEASE_MAINTENANCE_MODE=off|full`. Em `full`, o processo responde 503 e não importa a aplicação, cobrindo também rotas diretas e trabalhos de fundo. Members A usa `RELEASE_SCHEMA_STAGE=hold` na primeira onda; após fechar os cinco serviços, drenar uploads e fazer o backup final, `apply` executa as migrations A. B usa o preDeploy normal. Não há bypass público de QA. Pagamentos continuam recebendo callbacks e persistindo entregas para os consumidores pausados.

**Entrada:** produção na `0075`, aplicação antiga e inventário atual.

**Saída:** candidato A que aplica somente `0076`–`0090` e continua atendendo o contrato antigo; bloqueio temporário testado para a transição B.

- [x] Criar branch de A a partir de main e transportar **os artefatos históricos**, mantendo aplicação antiga compatível. A não deve conter o código novo que exige `journey_role`, tabelas de ajuda ou a coluna de caderno da `0091`.
- [ ] Conferir cada SQL `0076`–`0090`. A `0079` elimina `practice_sessions` criada pela `0076`, ausente na produção observada; provar que não há dados reais nela no banco de partida. Não descrever toda a sequência genericamente como “apenas aditiva”.
- [ ] Testar schema `0075` → `0090` com aplicação antiga: abrir aula, quiz, entrega e livro, comparar IDs/conclusões e validar escritas permitidas. Na janela real, manter autoria congelada desde o backfill de estruturas até o fim de B para não deixar a estrutura recém-criada obsoleta.
- [ ] Adicionar verificação do **SQL efetivo e fronteira da release**, não apenas de um nome antigo. Na A, `support_block_ids` deve continuar existindo e Livro 3D ainda deve manter a URL antiga. Na B, permitir os drops somente depois de confirmada a retirada dos consumidores incompatíveis.
- [x] Ensaiar A → B com o migrator usado no preDeploy e commits reais entre etapas. Não cortar arbitrariamente uma transação em statements diferentes dos que serão usados na execução.
- [x] Implementar configuração temporária `RELEASE_MAINTENANCE_MODE=off|full` com escopo explícito às rotas que alteram tabelas/objetos inventariados. Em `full`, bloquear também a leitura de aulas e jogos durante a troca incompatível. Responder 503/`Retry-After` com tela curta e preservação do trabalho local.
- [ ] Cobrir autosave, upload/reserva/confirmação de criação, submissão, publicar/remixar no mural, edição/publicação de aulas, exclusão de conta e limpeza R2. Bloquear também chamadas diretas de abas antigas; não confiar em esconder UI.
- [ ] Preservar pagamentos, callbacks e outboxes não relacionados ao lote. Se uma entrega de evento puder alterar uma tabela inventariada, aceitar o evento e adiar seu processamento em fila durável, sem descartar nem duplicar o grant. A pausa do cron de criações deve afetar só produção; o Worker atende também staging.
- [ ] Definir acesso de QA por identidade autenticada e allowlist de operação, caso necessário para validar antes de reabrir. Não usar parâmetro público, header não autenticado ou URL obscura como bypass.
- [ ] Testar saída da manutenção, retomada de jobs, refresh de sessão e reenvio sem duplicar entregas/compra/conclusão.

Critério de saída: A é um artefato testado independentemente, mantém os livros e o contrato antigo, e uma aba antiga não consegue alterar o corpus quando o bloqueio está ativo. Caso A não passe essa prova, corrigir A antes da promoção, sem cortar a segurança da B.

## Tarefa 3 — Habilitar o lote Studio de produção

**Modificar:** `packages/studio/scripts/project-migrations/{railway,capture,plan,engine,cli,drafts}.ts`, `packages/studio/scripts/project-migrations/README.md`, `packages/studio/src/project-migrations/batch.test.ts`; criar `packages/studio/scripts/project-migrations/target.ts` e seu teste.

**Contrato implementado em `target.ts`:**

```ts
type MigrationEnvironment = 'staging' | 'production'
type MigrationTarget = {
  project: string // conferido contra a allowlist fixa
  environment: MigrationEnvironment
  environmentId: string
  buckets: { ugc: string; private: string }
}
```

Os dois destinos devem vir de uma allowlist fixa e comparada com as variáveis remotas:

| Ambiente | ID | UGC | Privado |
|---|---|---|---|
| staging | `f634cff6-aafb-4804-8b69-172fad4e946e` | `testes-ugc` | `testes-privado` |
| production | `19c212a5-85c0-493c-9630-a7a0569e8412` | `comunidade-sistema-zero-ugc` | `comunidade-sistema-zero-privado` |

- [x] Exigir `--environment` explícito e gravar destino completo no corpus/plano. Recusar corpus de outro ambiente/projeto, bucket inesperado ou SHA divergente. Manter as verificações de formato, hashes, ETags e comparação integral de registros.
- [x] Fazer `capture` distinguir schema antigo de schema pronto. O lote aplicável exige as tabelas/colunas e o registro da `0098` da release B; um diagnóstico pré-A não pode fingir que tabelas ausentes foram inventariadas com sucesso.
- [x] Incluir `lesson_drafts.previous_document` no inventário e transformação. Compartilhar o fingerprint com Members, incluindo revisões compatíveis de cadernos e critérios, sem esconder conflitos reais.
- [ ] Conferir fontes históricas (`lesson_evidence`, snapshots de critérios e contextos do professor): preservar notas/proveniência e provar que qualquer visualização executável passa pelo leitor histórico. Não converter texto livre como se fosse código.
- [x] Preservar `play_id`, chave `studio/play/<id>.json`, posts, autoria, moderação, curtidas e jogadas. Recusar snapshot ausente, asset corrompido e programa com conversão ambígua; tratar individualmente antes do lote.
- [x] Testar fixtures com criações em partes, galerias de entrega, versões anteriores, rascunho/desfazer, grants e configurações de blocos. O inventário final real continua na janela, após o schema B.
- [ ] Fazer simulação interromper após backup, após gravação de objetos e durante promoção; repetir aplicação/rollback e provar idempotência e recusa de escrita concorrente.
- [x] Manter no operador backup privado de linhas, objetos e diário de recuperação. `studio-migration-backups/<sourceHash>/` permanece fora dos prefixos de cleanup/quota; os backups reais serão criados na execução autorizada do lote.
- [x] Guardar hash do plano validado e exigir igualdade com o plano reconstruído na aplicação. Alteração de candidato exige novo ensaio.

Rodar no diretório `packages/studio`:

```powershell
bun test src/project-migrations
```

CLI **implementada e testada** nesta rodada. `preflight` é somente leitura; produção ainda em `0075` é recusada com diagnóstico. Não avançar se falhar:

```powershell
bun scripts/project-migrations/cli.ts preflight --environment production
bun scripts/project-migrations/cli.ts capture --environment production --directory ../../.cache/jogo-2d/producao-final
bun scripts/project-migrations/cli.ts plan --environment production --directory ../../.cache/jogo-2d/producao-final
bun scripts/project-migrations/cli.ts simulate --environment production --directory ../../.cache/jogo-2d/producao-final
bun scripts/project-migrations/cli.ts check-remote --environment production --directory ../../.cache/jogo-2d/producao-final
```

`apply` e `rollback` usarão o mesmo destino/diretório e `--candidate` com o SHA completo registrado da release B. Exibir esse comando já preenchido no pacote de execução. Não publicar uma sequência com SHA fictício.

Critério de saída: relatório sem pendências, simulação/recuperação aprovadas, formatos e assets preservados e zero troca cruzada entre ambientes. O smoke dos arquivos reais desta investigação é evidência inicial, não substitui esse ensaio completo.

## Tarefa 4 — Configuração, mídia e dependências operacionais

**Fontes:** `packages/admin/scripts/r2-cors-public.ts`, `r2-cors-public-check.ts`, `student-app-origins.ts`; `packages/fiscal/src/infrastructure/certificate/a1-certificate.ts`; `.env.example` dos serviços; `packages/studio-runtime/README.md`; configuração Railway/Cloudflare.

- [ ] Renovar/configurar certificado A1 nos ambientes que o usam. Validar data e cadeia sem imprimir chave/senha. Redeployar Fiscal isoladamente e comprovar inicialização saudável e tratamento correto da fila.
- [x] Configurar CORS do bucket público de produção preservando regras externas; instalar o probe e comprovar GET/HEAD nas origens oficiais Kids/Comunidade. O comando `r2-cors-public.ts --check` **ainda escreve um objeto temporário de prova**; não o classificar como auditoria remota somente leitura.
- [x] Configurar e ativar `R2_UGC_BUCKET=comunidade-sistema-zero-ugc` no Admin, incluindo suas origens em GET/HEAD do UGC e mantendo uploads Kids/Community. URLs assinadas verificadas a partir do Admin ativo.
- [ ] Validar a jornada autenticada de anexos após autorização do Hub na nova interface durante a homologação da release B.
- [ ] Conferir buckets privados, CDN, imagens, `.riv`, WASM servido pelo app, fontes, SVG, vídeos Vimeo/YouTube, PDFs e marca d'água na origem de produção.
- [ ] Conferir runtime Pro, igualdade dos segredos, build remoto e preview isolado. Conferir cron de limpeza e proteção dos backups de migração. Os Workers não exigem publicação pelo diff auditado.
- [ ] Configurar `FUNNEL_INTERNAL_TOKEN` no Members, igual ao do Funnel, se a integração comportamental entrar nesta onda. Conferir `FUNNEL_URL` e evitar chamadas cruzadas para staging.
- [ ] Preparar ElevenLabs no Admin caso a equipe use geração de voz na operação inicial; distinguir essa ferramenta editorial dos arquivos de áudio já prontos.
- [ ] Conferir cron/outboxes, modelos/chaves de IA usados por Zappy/Pensa, refresh/JWKS, HMAC entre serviços e Sentry por release. Preservar separação entre homologação e produção.

Após a configuração e instalação autorizadas, este check é somente leitura e pode rodar localmente:

```powershell
$env:R2_PUBLIC_URL = 'https://cdn.sistemazero.com.br'
$env:R2_CORS_PROBE_ORIGIN = 'https://kids.sistemazero.com.br'
bun run --filter @sistemazero/admin r2:cors:public:check
```

Critério de saída: certificado válido; prova CDN 200 com origem esperada; Admin lê anexos autorizados; runtime e cron funcionam; nenhuma configuração aponta acidentalmente para staging.

## Tarefa 5 — Modal temporário e Como fazer

**Criar:** `packages/community-kids/src/components/kids/platform-renovation-notice.tsx`, `packages/community-kids/src/lib/platform-renovation-visit.ts`, `packages/community-kids/tests/platform-renovation-notice.test.tsx`, `packages/community-kids/tests/platform-renovation-visit.test.ts`.

**Modificar:** `packages/community-kids/src/app/(app)/layout.tsx`, `src/components/kids/child-guide.tsx`, `src/components/kids/celebration-watcher.tsx`, `.env.example` e pontos reais de entrada/saída do perfil, incluindo `src/app/perfis/perfis-client.tsx`. Usar o Dialog existente, sem criar outra biblioteca de modais.

**Interfaces propostas:**

```ts
type RenovationNoticeConfig = {
  enabled: boolean
  campaignId: 'platform-renovation-2026-09'
}
type RenovationNoticeState = 'checking' | 'open' | 'dismissed' | 'disabled'
// O provider expõe este estado para adiar ChildGuide/CelebrationWatcher.
// O ciclo de visita é do navegador/perfil; não trafega token de autenticação.
```

- [ ] Implementar o texto da especificação com X, Escape, botão de continuar e link `/como-fazer`.
- [ ] Ler `KIDS_REFORM_NOTICE_ENABLED` no servidor e passar apenas a configuração pública ao provider no layout autenticado. Flag desligada não monta overlay nem bloqueia outros modais.
- [ ] Guardar dispensa por campanha/perfil em `sessionStorage`, com fallback em memória. Limpar a marca na entrada/saída efetiva do perfil; não limpar em cada mudança de rota nem em refresh de token.
- [ ] Testar visita nova, navegação, reload, nova aba, reentrada no mesmo perfil, troca entre duas crianças, logout/login, storage indisponível e atualização da flag.
- [x] Coordenar a fila visual com onboarding e celebrações. O aviso não pode aparecer sobre outro modal nem impedir uma aula após fechar.
- [ ] Testar em celular/tablet/desktop, teclado, leitor de tela, zoom e redução de movimento. O X precisa permanecer visível com texto longo/rolagem.
- [ ] Validar `docs/como-fazer/como-fazer.json`, revisar o lote a publicar e importar por slug após a `0097`. Publicar tutoriais essenciais de navegação, aula, Estúdio e mural antes de ligar o link do modal. Importar não equivale a publicar.
- [ ] Confirmar acesso à ajuda por perfil gratuito/visitante sem liberar ferramentas pagas e sem mensagem comercial dirigida à criança.

Comandos existentes, depois da implementação dos arquivos propostos:

```powershell
bun docs/como-fazer/validar.ts
bun run --filter @sistemazero/community-kids test
bun run --filter @sistemazero/community-kids typecheck
```

Critério de saída: fecha e deixa estudar, aparece uma vez por visita, não grava dispensa permanente e não leva para biblioteca vazia/404. O controle de desativação está documentado.

## Tarefa 6 — Ensaio de release sobre cópia isolada

**Dados:** snapshot recente do banco de produção e cópias privadas dos objetos referenciados. Ambiente separado de staging habitual; workers de envio, pagamento, emissão e cleanup desativados na cópia. Restaurar produção no staging compartilhado não é o procedimento recomendado.

- [ ] Restaurar o backup num banco isolado e demonstrar que ele abre. Registrar ponto temporal, tamanho, checksum e duração de restore. Configurar credenciais/buckets exclusivos antes de ligar qualquer app.
- [ ] Medir `0075` → A (`0090`) com os mesmos comandos do preDeploy; validar app antigo, locks e duração. Registrar exceções reais do journal de staging separadamente.
- [ ] Aplicar B (`0091`–`0098`) com a semântica real do runner. Validar sete livros/anexos, estruturas, critérios, histórico, novos campos e readiness.
- [ ] Executar dry-run/apply/dry-run de materiais, revisão dos hashes de rascunho e converter completo, na ordem da janela abaixo. Nenhuma transformação pode publicar um curso de staging por acidente.
- [ ] Provar aplicação interrompida/retomada e recuperação do lote. Testar rollback antes de novas edições e recusa após uma edição legítima concorrente.
- [ ] Repetir captura/plano após conversão: zero documentos pendentes e zero alterações novas esperadas. Explicar registros excluídos sem blob, sem tratá-los como arquivos desaparecidos.
- [ ] Executar a matriz de QA abaixo no candidato. Registrar as 37 aulas e os 13 jogos individualmente em relatório privado; o conjunto é pequeno o suficiente para validar todos.
- [ ] Medir a janela inteira, definir a margem operacional e confirmar que o restore cabe no prazo acordado. Nova mudança em código, migração ou conversor invalida a parte correspondente do ensaio.

Os testes de banco existentes usam `LEARNING_QA_DATABASE_URL` com banco descartável `sz_aulas_qa_*` e fazem limpeza de schema. **Nunca apontá-los para produção, staging ou para a única cópia do backup.** A suíte existente parte de `0077`; acrescentar cenário com a partida real `0075` e fronteira A/B.

## Janela de produção — roteiro após concluir as tarefas anteriores

### Preparação imediata

- [ ] Confirmar todos os gates, autorização da janela, responsáveis e manifesto com SHAs A/B. Reconsultar contagens, schema/journals, estado dos serviços e gatilhos.
- [ ] Suspender auto-deploys relevantes antes dos merges. Congelar main durante cada onda.
- [ ] Ativar bloqueio de autoria/escritas e drenar requisições/uploads em voo; conferir `pending_revision`. Pausar cleanup de produção e jobs que mutam as fontes capturadas.
- [ ] Fazer backup consistente de banco e objetos R2; guardar registros/objetos afetados antes das transformações. Os arquivos da investigação de 27/09 não substituem esse backup recente.

### Release A — preparar Members

- [ ] Promover o candidato A por PR/merge commit e implantar **somente Members A**, mais a barreira previamente ensaiada se ainda não estiver disponível. Ordem da barreira deve preceder o início dos backfills.
- [ ] Conferir journal até `0090`, marca `1789814248293`, presença de `support_block_ids`, estruturas das 37 aulas, livros ainda com URL antiga e saúde do app antigo.
- [ ] Conferir que `materials` existe no enum, mas não executar backfill usando o código antigo que não conhece esse bloco. Preservar congelamento de autoria.
- [ ] Registrar go/no-go de A. Não prosseguir com migration faltante, locks sem convergência ou diferença de dados não explicada.

### Release B — trocar contratos e aplicações

- [ ] Ativar manutenção completa das aulas/jogos antes de transformar livros. Impedir público e clientes antigos de ler contratos intermediários; processamento de pagamentos deve continuar íntegro.
- [ ] Promover o candidato B testado por PR/merge commit. SHA exato fica fixo no manifesto e nos comandos.
- [ ] Implantar Catalog/Auth/Payments/Messaging conforme dependências aprovadas. Catalog prepara política de acesso; Messaging prepara templates. Conferir efeitos dos seeds e impedir mensagens externas de QA.
- [ ] Implantar **Members B** e conferir journal até `0098` (`1790433246068` no candidato auditado). Só depois implantar **Hub e Referrals**, que consomem novos comportamentos de Members, e então **Gateway**.
- [ ] Depois de APIs prontas, implantar **Admin, Community e Kids** no SHA B. Bibliotecas Studio/Pinta/Pensa/Molda/Core/Member Shell/UI entram pelos consumidores; não têm deployment próprio.
- [ ] Implantar Marketing/Marketing App e outros consumidores alterados pela release conforme manifesto. Não incluir Fiscal antes de resolver certificado. Não rebaixar Helpdesk já atualizado.
- [ ] Confirmar novo SHA de Members/Kids antes da conversão. Os frontends podem estar implantados e ainda permanecer fechados ao público.

### Backfills e lote de jogos

No contêiner **Members B**, diretório `/app/packages/members`:

```bash
bun run materials:backfill
# Inspecionar o relatório antes de aplicar.
bun run materials:backfill -- --apply
bun run materials:backfill
```

- [ ] Materiais: último dry-run sem criações pendentes ou aulas sem seção; todos os anexos acessíveis. Não tratar mensagem de “sem seção” como sucesso.
- [ ] Rascunhos: produção originalmente não tinha essa tabela; registrar qualquer novo rascunho surgido e conferir a base pelo contrato compartilhado de `published-lesson-revisions.ts`. O conversor preserva bases atuais/compatíveis e conserva conflitos reais. **Não executar automaticamente `drafts:rebase-revisions` nesta B:** ele é um reparo histórico de `supportBlockIds` e sua montagem de blocos/anexos não acompanha Livro 3D/caderno. Se aparecer uma base histórica inesperada, analisar o registro e ensaiar um reparo específico com comparação exata antes de aplicá-lo.
- [ ] Capturar corpus final com o conversor atualizado, já no schema B e com escritas bloqueadas; planejar, simular, conferir remoto e revisar relatório.
- [ ] Aplicar exatamente o plano/`sourceHash` validado, com SHA B. Preservar diário em caso de falha; não recapturar por cima de aplicação parcial.
- [ ] Capturar novamente em **diretório novo**; plano deve não ter alterações nem falhas. Conferir também rascunhos/desfazer e visualizadores históricos.
- [ ] Comparar antes/depois: todos os jogos do mural continuam com os mesmos `play_id`, posts, autoria e moderação. Nenhum projeto excluído reaparece; nenhum progresso/resultado/XP é zerado ou concedido novamente. Contabilizar os aumentos intencionais de revisões, versões de curso, blocos de materiais, anexos e evidências no relatório; não exigir que esses totais permaneçam iguais ao baseline.
- [ ] Publicar tutoriais revisados do Como fazer e habilitar flag do modal. Publicar somente o curso adicional Cadê Todo Mundo?, autorizado pelo usuário, preservando os cursos existentes.

### Validar, reabrir e acompanhar

- [ ] Executar smokes privados no deployment real: aula antiga, quiz, entrega, salvar/reabrir/remixar, mural, materiais, ajuda e modal. Em seguida verificar rotas públicas conforme a janela permitir.
- [ ] Reabrir acessos de forma controlada; acompanhar erros/conflitos e uma pequena rodada de perfis de teste antes de considerar encerrada a janela.
- [ ] Retomar jobs pausados e verificar que backups estão excluídos da limpeza.
- [ ] Reativar os auto-deploys documentados, apontando para main, depois de a operação estar estável. Não reativar um gatilho que possa publicar Funnel antes da decisão comercial.
- [ ] Registrar término, duração, deployments e eventuais exceções. Manter acompanhamento imediato, no primeiro dia e no dia seguinte.

## Onda comercial

Seguir [Desafio: homologação, virada e rollback](../../runbooks/desafio-primeiro-jogo-virada.md). Recomendação é fazê-la como etapa própria; o responsável decide a inclusão na mesma janela antes do pacote final de execução.

- [ ] Confirmar oferta nova, preço, cupom, prazo de acesso e templates; preservar contratos históricos vitalícios.
- [ ] Confirmar novo contrato de Funnel/Members/Catalog, tokens internos e concessões dos novos convites, inclusive Mural visitante após expiração.
- [ ] Publicar Funnel atual apenas com a troca de oferta coordenada. Enquanto a env antiga permanecer, o código novo responde 503 no Desafio por design.
- [ ] Se adiada, manter Funnel antigo e homologar sua compatibilidade com os backends novos; não trocar apenas a env ou apenas a copy.
- [ ] Validar Pix/cartão/boleto, assinatura, duplicata de webhook, cancelamento, reembolso, expiração e comprador vitalício. Compras/envios reais só no escopo expressamente aprovado para a janela.

## Matriz obrigatória de QA

| Área | Casos e condição de aprovação |
|---|---|
| Login e perfis | senha/OTP, refresh, logout, troca/reentrada de criança, isolamento entre irmãos, impersonação e retorno à conta |
| Cursos legados | todas as 37 aulas; principal + quiz quando existente; mesmas aulas/IDs; concluída não reabre como pendente; retomada do vídeo; nenhuma recompensa duplicada |
| Contratos especiais | aula `coming_soon`, certificado, ebook/material, adulto, quiz reprovado/aprovado, entrega já revisada e ainda pendente |
| Arquivos | 7 anexos existentes e livros vinculados; download com marca d'água, vídeo permitido, arquivo ausente tratado sem vazamento do original |
| Estúdio | abrir/salvar/reabrir, Blocos/Ponte/Código, assets/som, prévia, nuvem/em partes, arquivo exportado antigo, IndexedDB antigo/offline e conflito de aba antiga |
| Mural | todos os 13 snapshots convertidos; controles, colisão, pontuação, áudio e reinício conforme cada jogo; celular/touch; link público; fazer minha versão e remixar; autoria/curtidas/jogadas preservadas; post oculto permanece indisponível |
| Atividades do professor | 8 blocos convertidos; iniciar, enviar, revisar, abrir as 41 entregas e suas 19 versões anteriores; não substituir projeto entregue pelo projeto atual da nuvem |
| Histórico | evidências e contexto do professor continuam legíveis/executáveis pelo leitor compatível; notas, datas e identidade preservadas |
| Pinta/Pensa/Molda | abrir dados existentes, salvar sem perda, integração com Estúdio, import/export de assets, plano em equipe, permissões e separação entre perfis |
| Jornada e acessos | posições/recompensas/extra, blocos já liberados, curso avulso, acesso gratuito, assinatura ativa/vencida, presente e Mural visitante somente com capacidades permitidas |
| Admin | ler/revisar/publicar aula de teste, rascunho, desfazer, conflito real mantido, anexos autorizados, mídia e tutoriais |
| Como fazer/modal | ajuda publicada e buscável; uma aparição por visita; X/Escape/continuar; link; nova visita; coexistência com celebração/onboarding; flag desligada |
| Infraestrutura | SHA certo, readyz, CORS/CDN/Rive/WASM, runtime Pro, cron, HMAC/JWKS, Sentry, filas/outboxes e Fiscal com certificado válido |
| Comercial | matriz do runbook do Desafio; nenhuma matrícula histórica encurtada; pagamentos pendentes mantêm seu contrato |

As verificações de conversão podem cobrir todos os registros automaticamente; jogabilidade requer observar comportamento. Um JSON válido e um healthcheck 200 não aprovam um jogo.

## Critérios de parada

- Qualquer migration não aplicada, hash/schema inesperado, coluna/enum ausente, falha de healthcheck ou SHA errado.
- Conversor com pendência, asset ausente/corrompido, reserva em voo, divergência de ETag/CAS, plano reconstruído diferente ou diário de aplicação indefinido.
- Perda/duplicação de conteúdo, conclusão, nota, acesso, link ou recurso; livro invisível; jogo que não abre/funciona; escrita antiga sobrescrevendo formato novo.
- Falha no isolamento entre famílias, vazamento de arquivo privado ou remoção por cleanup durante a janela.
- Certificado inválido ao promover Fiscal; CORS necessário não comprovado; novo Funnel apontando para oferta incompatível.

Se um gate falhar, manter a manutenção do fluxo afetado, não avançar a próxima onda e acionar a estratégia correspondente abaixo.

## Recuperação por ponto da operação

| Ponto | Recuperação |
|---|---|
| Antes de A | Cancelar janela, restaurar gatilhos/jobs e retirar bloqueio sem alterar dados |
| A aplicada, B não iniciada | Manter schema expandido e aplicação antiga, cuja compatibilidade foi provada; não fazer downgrade de schema. Conferir estrutura se autoria voltar a ser liberada antes de reagendar B |
| B aplicada, conversão não começou | Preferir correção adiante sob manutenção. Não apontar front antigo para `ebook.attachmentId`. Rollback antigo exige recuperação específica do contrato de livros/linhas afetadas e validação conjunta do código |
| Lote parcialmente aplicado | Usar o mesmo plano/diário para retomar; ou rollback operacional com CAS. Objetos novos, backups e promoção de linhas precisam ser reconciliados pelo motor |
| Lote completo, sem novas edições | Rollback do lote cria novas revisões e restaura conteúdo original; o leitor histórico do app atual permite abri-lo. Isso não reverte `0093` nem todo o schema |
| Público já escreveu no formato novo | Não sobrescrever edições novas. Corrigir adiante ou recuperar individualmente com conflito explícito; rollback global por snapshot só com plano de reconciliação dos dados posteriores |
| Onda comercial falhou | Pausar novas vendas da oferta afetada e preservar cobranças pendentes/grants; seguir rollback específico do Desafio |

O Postgres é compartilhado com pagamentos. Restaurar o banco inteiro depois de reabrir descartaria transações de outros serviços; não é o rollback padrão. O ensaio precisa produzir uma recuperação seletiva verificável e preservar o backup completo como último recurso.

## Critério de conclusão da promoção

- [ ] SHAs e journals conferidos por serviço/contexto e manifesto anexado em local privado.
- [ ] Corpus final convertido sem pendências; prova de nova captura sem mudanças inesperadas.
- [ ] Cursos, jogos, submissões e histórico preservados e matriz obrigatória aprovada.
- [ ] Como fazer publicado e modal funcionando conforme a decisão de visita.
- [ ] Manutenção retirada, jobs/gatilhos restabelecidos e monitoramento sem regressão material.
- [ ] Responsável confirmou o estado da onda comercial e o calendário posterior de troca dos cursos.
- [ ] Backups/diários retidos e procedimento de recuperação acessível à equipe.

O planejamento termina com esses critérios definidos. A promoção só termina quando forem comprovados na execução.
