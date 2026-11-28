# Famílias e Escolas: plano de implementação

> Plano aprovado pela Helena em 28/11/2026. O estado de cada lote fica em [CONTROLE.md](CONTROLE.md); como retomar, em [LEIA-PRIMEIRO.md](LEIA-PRIMEIRO.md).
> Mudou alguma decisão durante a implementação? Registre em CONTROLE.md (seção Decisões) e corrija aqui.


## 1. Contexto

A proposta "Famílias e Escolas" foi aprovada no Canvas (https://claude.ai/artifact/6NZdjAZCjLGGB5CMMcJFfS, versão 3.0, 12 pranchas e 41 telas). Ela põe por cima da plataforma atual uma camada de instituições (escolas, clínicas e projetos parceiros), com três degraus: a escola paga a sala de aula, a família paga o plano pelo código (R$ 69,90) ou o plano normal (R$ 97), e vale sempre o maior, sem somar.

O pedido: implementar tudo em lotes seguidos até o fim, com revisão entre os lotes, full review no final e um controle sempre atualizado. O registro tem de ficar no repositório com detalhe suficiente para outra sessão, em outro computador, continuar sozinha.

## 2. O registro no repositório

Hoje a especificação, o Canvas e os levantamentos do código só existem na pasta temporária e na conversa desta sessão. A memória do Claude também é só desta máquina. O Lote 0 leva tudo para o repositório, em `docs/familias-e-escolas/`:

| Arquivo | O que tem |
|---|---|
| `LEIA-PRIMEIRO.md` | Como retomar: ordem de leitura, regras de trabalho desta frente, comandos, e o que é regra só desta máquina. |
| `CONTROLE.md` | O estado: quadro dos lotes, tarefas feitas e pendentes, ressalvas, próximo passo exato. |
| `PLANO.md` | Este plano inteiro: arquitetura e os lotes com tarefas, arquivos, peças a reaproveitar e critério de pronto. |
| `REGRAS-DE-NEGOCIO.md` | As 15 regras aprovadas e as regras adotadas onde a especificação não fecha. |
| `LEVANTAMENTO-DO-CODIGO.md` | O que o código faz hoje, com arquivo e linha, e as armadilhas de cada pacote. |
| `especificacao/` | Os 53 textos do Canvas (12 pranchas e 41 telas). |
| `canvas/` | A fonte do Canvas e os geradores, para republicar se precisar. |

**Push no fim de cada lote.** É o que faz o registro e o código chegarem ao outro computador. Isso muda o costume desta frente (até aqui, só commit local) e segue as regras da casa:
- quem dá o push confere tudo o que sobe, inclusive commits de outras sessões (hoje a staging local tem 18 commits à frente da remota);
- confere e empurra o mesmo sha: `alvo=$(git rev-parse staging)`, conferir `git log origin/staging..$alvo`, testes focados, e `git push origin $alvo:refs/heads/staging`;
- o push publica no ambiente de staging e roda as migrations de lá. O CI roda o typecheck que esta sessão não roda, e o resultado entra no controle.

O Lote 0 sobe sozinho, logo no começo (só documentos).

`CONTROLE.md` é atualizado a cada tarefa concluída, e não só no fim do lote. Formato:
- **Como retomar:** lote atual, próximo passo exato, comandos de verificação, o que está sem commit.
- **Quadro dos lotes:** a fazer, em andamento, revisado, commit feito, push feito, CI verde.
- **Tarefas de cada lote,** uma por linha.
- **Ressalvas de cada lote:** typecheck pendente (pacotes), teste de banco pulado, tela não conferida, regra adotada.
- **O que depende da Helena** e **o que fica fora do código** (aulas a gravar, os três documentos para o advogado, conversas com as instituições, validação pedagógica dos códigos da BNCC).

## 3. Regras de negócio aprovadas (resumo)

1. Três degraus. A família paga só o maior em que entrou, sem somar. Nunca dois planos.
2. **Escola paga:** R$ 39,90 por aluno ao mês com 50 ou mais em contrato anual, R$ 49,90 abaixo disso e para a parceira que paga vagas. O aluno tem aulas e tarefas (na escola e em casa), ferramentas só dentro das aulas, mural da escola e cursos para pais.
3. **Plano pelo código:** R$ 69,90 ao mês no cartão, ou 6 meses por R$ 399 no Pix, para até 2 crianças. Acrescenta Estúdio, Pinta, Pensa e Molda livres e o acompanhamento da instituição. Não tem Arquipélago, ranking geral, Mural nem Clube dos Criadores.
4. **Plano normal:** R$ 97 ao mês (R$ 970 ao ano), até 2 crianças, com tudo.
5. Cada criança além de duas: perfil extra, R$ 39,90 ao mês.
6. Nada é cancelado nem cobrado sem a família pedir. Trocar de plano só a pedido.
7. Quem pagou adiantado segue até o fim, sem devolução depois dos 7 dias.
8. Cursos para pais incluídos sempre que o Sistema Zero recebe.
9. A oferta do plano só aparece para os pais (área dos pais, tela do bilhete, tela do código).
10. Cada escola e cada instituição tem o seu mural, sem misturar. Na clínica o mural começa desligado e cada família autoriza.
11. Ranking geral só no R$ 97. O da escola começa desligado e mostra os primeiros lugares e a posição da própria criança. Clínica não tem ranking.
12. A criança ligada a uma escola segue a regra de IA do ano escolar em qualquer aparelho: desligada até o 5º ano, ligada pelo professor na aula do 6º ao 9º, decidida pela gestão no ensino médio.
13. Cadastro: a planilha traz o e-mail do responsável, a conta da família é criada ou encontrada na importação, a criança só aparece para a família depois do bilhete, nenhum perfil muda de dono, e perfis não são somados.
14. Quem trabalha na instituição e é pai usa uma conta só. Os dois apps não compartilham sessão.
15. Vocabulário: plano combinado, plano da família, vaga, bilhete, crachá do aluno, conjunto de aulas, primeiro acesso, código da escola.

O texto completo está em `especificacao/Contas.txt`, `Ofertas.txt`, `Plataforma.txt` e `Protecao.txt`.

## 4. Arquitetura

### Serviço novo `packages/institutions`
- Schema próprio no Postgres (`institutions`), journal próprio de migrations, molde em `packages/referrals`.
- **Por que um serviço:** a especificação pede que o próprio banco recuse a leitura de outra instituição. Todos os serviços migram e rodam com a mesma conexão, então a aplicação é dona das tabelas, e dono ignora a regra de isolamento. Num schema à parte dá para criar um papel sem posse, só com permissão ali. Dentro do `members` (175 migrations, repositórios que usam o banco direto), um repositório esquecido furaria o isolamento em silêncio.
- **Isolamento:** todas as tabelas têm `institution_id` e política de linha. A migration cria um papel `NOLOGIN` sem posse e `ALTER DEFAULT PRIVILEGES`. Um único ajudante abre toda transação com `SET LOCAL ROLE` e `set_config('app.institution_id', id, true)` (precedente em `packages/members/src/infrastructure/persistence/drizzle/pinta-causal-leases.ts:27`). A política usa `nullif(current_setting('app.institution_id', true), '')::uuid`. Nenhuma chamada HTTP dentro da transação.
- **Tabelas previstas:** `institutions`, `institution_codes`, `invitations`, `classes`, `class_members`, `students`, `import_batches`, `import_rows`, `tickets`, `seats`, `assignments`, `assignment_recipients`, `assignment_results`, `threads`, `messages`, `contracts`, `charges`, `staff_entries`.
- **Borda:** módulo opcional, no molde de `packages/api-gateway/src/infrastructure/config/arquipelago-routes.ts`. Sem a variável do serviço, a borda fica idêntica à de hoje. As variáveis dele nunca entram em `PROD_REQUIRED_SECRETS` (`api-gateway/.../env.ts:52-71`).

### `auth`
- Tabela nova `institution_links`: quem (conta do adulto ou perfil do aluno), instituição, tipo da instituição, papel (gestão, professor, coordenação, profissional, aluno), ano escolar, estado, início e fim.
- O papel global continua com os 4 valores de hoje (`packages/auth/src/domain/user/user.role.ts:6-30`).
- Os vínculos são lidos na renovação da sessão (`application/refresh/refresh.service.ts:71-116`), entram no token (`infrastructure/security/jose-token-issuer.ts:32-125`) e viram cabeçalho de identidade na borda (`header-rules.ts:60-91`, `claims-user-resolver.ts`). Tirar o acesso vale em até 15 minutos.
- Tabelas novas para o computador da instituição e o crachá (as de hoje exigem a conta da família, `schema.ts:403-470`).
- Rotas internas novas: criar o perfil do aluno, gravar e encerrar vínculo, checar o vínculo na hora.

### `members`
Chaves dos pais por criança, regra de IA empurrada pela escola, tempo de uso, soma das habilidades, conjuntos de aulas, número de perfis, travas do degrau, rota interna de liberação e rota interna de leitura das evidências.

### `core`
Lista de papéis (`core/src/identity/index.ts`), contratos das instituições (`core/src/institutions`), habilidades e códigos da BNCC (`core/src/skills`), e o resolvedor do degrau da família.

### Demais
`hub` (mural por instituição, moderação local, retorno e recurso), `catalog`, `funnel` e `payments` (plano pelo código, perfil extra, grupo de planos, troca de plano, página do código), `community` (área das instituições), `community-kids` (área de quem aprende e área dos pais), `admin` (grupo Instituições).

## 5. Regras de entrega

Ciclo de cada lote:
1. Ler o lote em `PLANO.md` e marcar "em andamento" no controle.
2. Ler o `CLAUDE.md` de cada pacote do lote antes de editar.
3. Implementar, com os testes junto, marcando cada tarefa no controle.
4. Rodar os testes de cada pacote mexido, um por vez, com o sandbox desligado. Depois `bun run ci` (nunca num pipe).
5. Revisar o diff do lote com o skill `code-review` em `high`. O revisor só lê, não mexe na árvore.
6. Corrigir e rodar de novo.
7. Conferir no navegador as telas do lote contra o Canvas. O que não der vira ressalva.
8. Fechar o controle do lote, commit e push.

Regras fixas:
- **Commit** na `staging`, sem PR. Mensagem `feat(familias-escolas): lote N, <resumo>`. Antes: conferir o ramo (`git rev-parse --abbrev-ref HEAD`), `git add` por caminho, `git diff --cached --name-only` só com o lote, `git commit -F msg -- <caminhos>`. Nunca `git add -A`, `stash`, `checkout --` nem `reset` na árvore: outras sessões trabalham nela.
- **Só entra no commit o que funciona inteiro.**
- **Typecheck:** não roda nesta máquina (regra desta máquina, por pouca memória). Fica com o CI depois do push. Nunca `bun x tsc`.
- **Uma coisa pesada por vez.** Testes passam sem `.env`.
- **Migration:** `db:generate` na hora do lote, conferindo no `_journal.json` que o carimbo `when` é maior que o último. Sem `ALTER TYPE`: vocabulário novo em texto com CHECK. No `auth`, sem índice novo em tabela existente. `FORCE ROW LEVEL SECURITY` em migration escrita à mão.
- **Rota nova:** entra em `gateway.config.ts` e no teste `tests/unit/route-registry.test.ts`. Se a criança ou os pais usam, entra em `kids-access-policy.ts` (lista de permissão; segmento `admin` ou `internal` é sempre negado).
- **Variável nova:** em `.railway/variables.ts`, e criada no painel antes do deploy.
- **Cursos gravados** (Cadê, Chave, Ilha do Farol) não podem quebrar. Campo novo no manifesto é sempre opcional.
- **Texto de tela** em português, seguindo os guias de cada app e o vocabulário da regra 15.
- **Staging e produção:** a sessão implanta e configura a staging (Railway pela CLI e pelos MCPs). Produção, nada até a Helena decidir a promoção (seção 8).

## 6. Lotes

Cada lote traz: objetivo, tarefas, arquivos principais, peças a reaproveitar, cuidados e pronto quando.

### Lote 0: preparação e registro
- Criar `docs/familias-e-escolas/` com os sete itens da seção 2. `PLANO.md` é este plano; `LEVANTAMENTO-DO-CODIGO.md` são os quatro levantamentos desta sessão, completos.
- Copiar `fe-texto/` para `especificacao/` e `fe-canvas/` e `fe-scripts/` para `canvas/`.
- Atualizar a memória local com o ponteiro para o controle.
- **Pronto quando:** commit e push feitos, e uma sessão nova consegue dizer o próximo passo lendo só `LEIA-PRIMEIRO.md` e `CONTROLE.md`.

### Fase 1: a casa em ordem

**Lote 1: papéis em um lugar só** (core, api-gateway)
- Hoje a lista está repetida em cerca de 90 arquivos e em 150 blocos `roles:` do `gateway.config.ts`, que não valida o texto (erro de digitação passa calado).
- Tarefas: exportar a lista e os grupos (`equipe`, `admins`) de `packages/core/src/identity/index.ts`; `core/src/staff/index.ts:92-96` passa a importar dali; o `gateway.config.ts` usa as constantes; teste que falha se aparecer lista literal nova na borda.
- Os outros arquivos trocam quando o lote do pacote chegar. Trocar 90 arquivos sem typecheck é risco alto para ganho pequeno.
- **Pronto quando:** os testes do core e da borda passam (`config.test.ts`, `route-registry.test.ts`) e nenhuma rota mudou de regra.

**Lote 2: chaves dos pais e interruptor da IA** (members, api-gateway, member-shell, community-kids)
- Hoje não existe botão para desligar. A IA entra por três portas: `/members/ai-usage/consume` (por conta, sem perfil, com falha aberta em `member-shell/src/server/ai-quota.ts:29-52`), `/members/internal/zappy/questions` e `/members/internal/studio-ai/usage`.
- Tarefas:
  1. Tabela nova `parent_controls` no members (perfil, conta, IA de conversa, sequência, limite diário, quem mudou). Não usar `profile_preferences`, que a criança edita.
  2. Política única `aiChatAllowed(perfil)`, com falha fechada, já prevendo a regra da escola (lote 26).
  3. Aplicar nas três portas: `application/ai-usage/consume-ai-usage.service.ts` (passa a receber o perfil), `studio-ai-usage.service.ts` e `interfaces/http/routes/pensa.routes.ts:81-111`. No BFF, `member-shell/src/routes/studio.ts:681-710` passa a conferir também no Kids.
  4. Rotas dos pais para ler e gravar, e o interruptor na página do filho.
- **Pronto quando:** desligar na área dos pais recusa Zappy, Pensa e descrição do jogo, e a criança vê o motivo em texto simples.

**Lote 3: sequência sem perda, conversas e aviso** (members, member-shell, community-kids)
- Tarefas: tirar a venda do protetor (`domain/gamification/coins.ts:33`, rota `streak-freeze/buy` em `members.routes.ts:708`) e devolver as moedas dos protetores guardados; a sequência vira contador simples em `domain/gamification/gamification.ts:117-147`; chave dos pais para desligar; lista de com quem cada filho conversa, lida de `teacher_threads`; aviso para a criança de que os pais acompanham.
- **Pronto quando:** perder um dia não tira nada, não há botão de comprar protetor, e a área dos pais lista as conversas.

**Lote 4: tempo de uso com limite**, tela B12 (members, api-gateway, member-shell, community-kids)
- Hoje nada é gravado. Modelo pronto: `packages/arquipelago-api/src/domain/sessao-de-tempo.ts`, `intervalo-de-tempo.ts`, a tabela `eventos_tempo` e o BFF `member-shell/src/routes/arquipelago.ts`.
- Tarefas: tabela de eventos por perfil e dia; rota de batimento chamada pelo layout Kids; leitura e limite na área dos pais; ao bater o limite, a área da criança avisa e fecha.
- **Pronto quando:** a tela B12 mostra o tempo do dia e da semana, e o limite vale.

**Lote 5: habilidades no manifesto** (core, members, admin)
- Tarefas: as seis habilidades e os códigos da BNCC em `core/src/skills`; campo `skills` opcional na seção (`core/src/learning/index.ts:81-98`), no objetivo (`section-progression.ts:87-100`) e na questão (`manifest-quiz.ts`); validador do core; mapeamento em `members/src/application/learning/learning-import.service.ts:302-334` (caminho do `teacherNotes`); `learning.dtos.ts:1018-1106` (campo não declarado some em silêncio; o objetivo Python usa `additionalProperties:false`).
- A vista da criança não recebe o campo. A sincronização Kids para adulto copia a seção inteira (`course-sync.ts:306-327`).
- **Pronto quando:** reimportar Cadê, Chave e Ilha do Farol não muda nada, e um manifesto com `skills` guarda a marcação depois de reimportado.

**Lote 6: soma por criança e habilidades da semana**, telas B5 e B6 (members, member-shell, community-kids, admin)
- Tarefas: soma lida de `lesson_evidence` e `quiz_attempts` (que já congelam a definição); novo item no `GetChildrenStatsService` (`application/children-stats/get-children-stats.service.ts:172-220`); bloco na área dos pais e no e-mail semanal; tela do Mapa em Conteúdo, no Admin.
- **Pronto quando:** as habilidades da semana aparecem para uma criança com evidências, e somem sem erro para quem não tem.

**Lote 7: moderação com retorno e recurso** (hub, admin, member-shell)
- Tarefas: estado e resposta da denúncia em `packages/hub/src/application/moderation/report.service.ts`; aviso para quem denunciou; pedido de recurso de quem publicou; fila no Admin.
- **Pronto quando:** quem denuncia vê o desfecho, e quem teve o post removido consegue pedir revisão.

**Lote 8: promessa nova nas páginas** (funnel)
- Só texto: "aprender a pensar criando jogos", seguindo os guias do funil e a prancha `especificacao/Main.txt`. Nunca "curso em preparação".
- **Pronto quando:** os guardas de copy do funil passam.

### Fase 2: instituições, com a primeira parceira

**Lote 9: serviço `institutions`, isolamento e bateria** (pacote novo, api-gateway, `.railway`, CI)
- Tarefas:
  1. Pacote no molde de `packages/referrals`: `package.json`, `Dockerfile`, `drizzle.config.ts` (tabela de migrations própria), `schema.ts` com `pgSchema`, `composition-root.ts`, `CLAUDE.md`.
  2. Papel sem posse, políticas de linha e o ajudante de transação (seção 4).
  3. Tabelas `institutions`, `institution_codes`, `invitations`, `staff_entries`.
  4. Borda: módulo opcional com as rotas, o consumidor HMAC e o token interno.
  5. `.railway/services/institutions.json`, `.railway/variables.ts`, `.railway/railway.ts`, `production-sources.ts`, e os pontos do `ci.yml` (lista de serviços, redeploy quando o core muda, passo de testes de banco).
  6. Bateria de isolamento em `tests/db`: usuário da instituição B tenta ler e gravar na A, rota por rota.
- **Cuidado:** no local e no CI o usuário do banco é superusuário, que ignora o isolamento. O teste só prova algo com o `SET LOCAL ROLE`.
- **Pronto quando:** a bateria passa em banco de verdade, e a borda sem a variável do serviço tem as mesmas rotas de antes.

**Lote 10: vínculos, claim e cabeçalho** (auth, core, api-gateway, member-shell)
- Tarefas: tabela `institution_links`; leitura na renovação; claim nova e `toClaims`; cabeçalho novo em `IDENTITY_HEADERS` (a borda remove o que vier do navegador); `member-shell/src/server/session.ts:96-121` passa a expor os vínculos; rotas internas de gravar, encerrar e checar na hora; campo de motivo no "entrar como" (`impersonation.policy.ts`, `create-impersonation-token.service.ts`).
- **Cuidado:** claim nova que não passa pelo `toClaims` e pelo resolver da borda faz o usuário não ser resolvido. O token da criança não leva e-mail nem nome.
- **Pronto quando:** uma pessoa com vínculo recebe o cabeçalho, uma sem vínculo não, e encerrar o vínculo some na renovação seguinte.

**Lote 11: Admin, grupo Instituições**, telas A1 e A8 (admin, institutions, auth)
- Tarefas: grupo novo em `admin/src/app/admin/nav.ts` (o tipo do id hoje aceita só três grupos, `:55`); criar o espaço; convidar pessoas (reaproveita `CreatePasswordTokenService`, convite de 14 dias); lista de pessoas com papel e situação; entrar no espaço com motivo.
- Molde de página com BFF: `admin/src/app/api/admin/referrals/origins/route.ts`.
- **Pronto quando:** a equipe cria uma instituição, convida um profissional, e ele aceita com a conta que já tem ou cria uma.

**Lote 12: degrau da família e travas** (core, members, arquipelago-api, hub)
- Hoje o Arquipélago e o ranking não têm chave própria: qualquer matrícula ativa do público entra (`gamification.repository.ts:120-129`, coortes em `:1136`, `:1203`, `:1426`, `:1472-1484`, `:1812`; `arquipelago-api/src/domain/acesso.ts:22-34`). E quem tem a chave-mestra Kids publica no Mural dos Criadores (`hub/.../showcase.service.ts:438-462`).
- Tarefas: resolvedor no core que devolve o degrau a partir das matrículas; **trava negativa**: Arquipélago, ranking geral e Mural dos Criadores fecham só para quem tem apenas acesso de instituição (`sourceId` começando por `institution:`) ou só o plano pelo código.
- **Cuidado:** matrículas antigas não ganham chave nova sozinhas, por isso a trava é negativa. O motivo de bloqueio do Arquipélago é contrato do jogo compilado (`arquipelago-contracts`).
- **Pronto quando:** um teste percorre todos os tipos de matrícula de hoje e prova que nenhum perde acesso.

**Lote 13: catálogo e compra** (catalog, members, funnel, member-shell)
- Tarefas:
  1. Combo do plano pelo código em `catalog/scripts/catalog-seed-definitions.ts` (molde da Comunidade em `:158-199`): chave-mestra Kids como principal, mais Estúdio, Pensa, Pinta e Molda, sem Mural e sem Clube.
  2. Duas ofertas ligadas por `altOffer`: mensal (assinatura, R$ 69,90, `maxProfiles: 2`) e 6 meses (compra única, prazo fixo, R$ 399, só Pix). Campo novo na oferta para limitar o meio de pagamento. `pageSellable` desligado.
  3. Perfil extra: assinatura de R$ 39,90 com campo novo que **soma** uma criança (`members/.../get-profile-allowance.service.ts:45-62` hoje usa o máximo).
  4. Trava por **grupo de planos** no lugar de produto: `funnel/src/server/member-commerce-store.ts:86-94` e `member-shell/src/lib/commerce-eligibility.ts:33-49`.
  5. Acertar `member-shell/src/components/commerce/commerce-copy.ts:27-90`, que hoje escreve "a cada null meses" numa oferta de compra única.
- **Pronto quando:** não dá para ter dois planos na mesma conta, e `profile-allowance.test.ts` continua travando o limite da Comunidade.

**Lote 14: página do código e inscrição**, telas B1, B3, B4 e E1 (funnel, institutions, auth, member-shell)
- Tarefas: página pública `funnel/src/pages/codigo/[codigo].astro` (molde `pages/cupom/[codigo].ts`), com limite de tentativas em `lib/rate-limit-paths.ts`; quem tem conta entra, quem não tem cria ali; origem nova no mini checkout (`core/src/commerce/index.ts:67-80`, `commerceOriginKey` e `store.recover` no funil, `originConfig` em `member-shell/src/routes/commerce.ts:109-183`); a oferta só é vendida com código válido de instituição ativa; ao pagar, grava o vínculo da criança.
- **Pronto quando:** uma família nova entra pelo código, paga no Pix ou no cartão e chega à tela B4.

**Lote 15: Conta e Planos**, telas B8 e B9 (member-shell, community-kids, payments)
- Tarefas: em Conta, de onde vem o acesso de cada filho, o preço do código e o botão do bilhete ou código; tela Planos com os três degraus; troca a pedido; perfil extra.
- **Troca de plano:** abre a assinatura nova com `firstChargeAmountInCents` (mínimo R$ 3, `payments/.../create-subscription.service.ts:131-137`) e só então encerra a antiga. Origem nova de cancelamento em `cancellation-record.ts`.
- **Cuidado:** cancelar corta a cobrança na Efí na hora, e o acesso segue até o fim do ciclo. Não existe início agendado. "Minhas compras" não muda de nome.
- **Pronto quando:** as três trocas (código para R$ 97, R$ 97 para código, cancelar) funcionam sem cobrança dobrada.

**Lote 16: cortesia e contagem**, tela E6 (institutions, members, api-gateway)
- Tarefas: contar as famílias pagantes por instituição; a cada 20, uma cortesia que a instituição indica; liberação pela rota `grant-manual` no modo oferta, que já existe (`members/.../webhooks.routes.ts:170-249`), com `sourceId` `institution:<id>:cortesia:<perfil>` e o serviço novo entre os consumidores permitidos na borda (`gateway.config.ts:3504-3516`).
- **Pronto quando:** a instituição vê quantas famílias pagam (nunca quem paga o quê) e indica o bolsista.

**Lote 17: mural da instituição**, tela C4 (hub, member-shell, community-kids)
- Tarefas: o mural vira marca do espaço, no lugar da lista em variável de ambiente (`hub/.../env.ts:103-131`); acesso pelo vínculo; conferir o acesso também na publicação Kids (`showcase.service.ts:483-513`); o BFF e as páginas recebem o mural em vez do nome fixo (`member-shell/src/routes/hub.ts:71`, `routes/studio.ts:326`, `core/src/creations/community-access.ts:1-4`, página do Kids); "trocar de mural" move o post (hoje a chave do projeto não inclui o mural, `showcase.service.ts:351-385`); professor e gestão tiram do ar no espaço deles; publicar ali conta para a Jornada.
- **Pronto quando:** a criança de uma instituição não vê o mural de outra, e um jogo fica em um mural só.

**Lote 18: conjuntos de aulas e motor de tarefa e plano** (members, institutions, admin)
- Tarefas: conjuntos (grupos de aulas de um curso) no Admin, em Conteúdo; rota interna no members que devolve as evidências de vários perfis de uma vez; no `institutions`, tarefa e plano sobre o mesmo motor (conjunto, destinatários, início, prazo e nota opcionais); resultado gravado no fim do prazo, com três fatos separados: fez as aulas, cumpriu os objetivos, fez no prazo.
- **Cuidado:** nada disso mexe em XP, posto ou conquistas.
- **Pronto quando:** um plano criado para uma criança mostra o andamento lido das evidências.

**Lote 19: área das instituições**, telas D6, E2 a E5 e B10 (community, funnel, institutions)
- Tarefas: página "escolher a área" antes do login (os dois apps não compartilham sessão); menu por vínculo em `community/src/components/community/nav.ts`; rotas novas em `protectedPrefixes` do `community/src/proxy.ts`; coordenação, painel do profissional, plano combinado, ficha da criança; do lado dos pais, o que a clínica vê (B10).
- **Cuidado:** os alunos adultos continuam entrando com tudo o que têm. A plataforma não guarda anotação clínica.
- **Pronto quando:** a profissional vê só as crianças dela, e o aluno adulto não vê nada novo.

**Lote 20: recados da instituição**, telas B11, C6 e D5 (institutions, member-shell, community, community-kids)
- Tarefas: conversas da instituição nas tabelas `threads` e `messages`; o profissional fala com a família, nunca com a criança; a gestão pode abrir conversas, com registro.
- **Pronto quando:** as três telas trocam mensagens, e uma instituição não lê a outra (entra na bateria).

**Lote 21: computador da instituição e crachá**, telas A4 e C1 (auth, institutions, community-kids)
- Tarefas: tabelas novas de computador e crachá; limite de tentativas por computador (hoje é por IP, `study-access.service.ts:116-133`, o que derrubaria um laboratório inteiro); só entra aluno daquela instituição; sem área dos pais e sem compra; Sair confirma o salvamento na nuvem e só então limpa; sai sozinho depois de 10 minutos.
- Reaproveitar: `StudyAccessService.redeem/enter`, `createStudyCode`, `normalizeStudyCode`.
- **Pronto quando:** o crachá entra num computador autorizado e é recusado em outro.

**Lote 22: curso para educadores e visualizador de projetos**, tela D1 (members, community)
- Tarefas: tipo de curso que a assinatura adulta não abre e o vínculo libera; concluir a formação de mediador libera as turmas; visualizador de entregas na área das instituições (hoje só no Admin, rotas em `members/.../content.routes.ts:382-425`).
- **Pronto quando:** um assinante adulto sem vínculo não vê a formação.

**Lote 23: site, clínicas e parceiras** (funnel)
- Entrada "Para clínicas e projetos educativos" e a página das instituições parceiras, com os textos das pranchas `Clinica.txt` e `Main.txt`.

### Fase 3: a escola no contraturno

**Lote 24: turmas, sala do professor e recados por turma**, tela D2 (institutions, community, members)
- Tabelas `classes` e `class_members`; sala do professor; uma caixa de recados por turma e o recado para a turma inteira.

**Lote 25: tarefas com prazo e resultado**, telas D3, D4, C2, C3 e C5 (institutions, community, community-kids)
- Tarefa para a turma sobre o motor do lote 18; a tarefa no Início da criança; resultado por aluno. No espaço da escola o menu é mais curto, sem "Criar" e sem a palavra Kids.

**Lote 26: IA por ano escolar e botão do professor**, tela A10 (institutions, members)
- O `institutions` empurra a regra para a chave por criança do members (lote 2), por rota interna. Até o 5º ano desligada; do 6º ao 9º o professor liga durante a aula, com validade; no ensino médio a gestão decide. Aluno sem o primeiro acesso da família não usa a conversa.

**Lote 27: gestão da escola e entrada Para escolas**, telas A2, A6 e B7 (institutions, community, funnel)
- Primeiros passos, computadores, crachás, pessoas, e o que a escola vê, mostrado aos pais.

### Fase 4: a grade

**Lote 28: cadastro do aluno**, telas A3, A5 e B2 (auth, institutions, member-shell, community-kids)
- Tarefas: importação da planilha (nome, turma, nascimento, e-mail do responsável); conta criada ou encontrada por `ensure-buyer` (`auth/.../ensure-buyer.service.ts:38-77`), com a rota ganhando lista de consumidores permitidos; rota interna para criar o perfil do aluno (hoje só existe `POST /auth/profiles` com sessão da conta, `profiles.routes.ts:134-159`), fora do teto de perfis; bilhete de uso único; primeiro acesso com código e data de nascimento; escolha do perfil que segue; conta provisória; aviso por e-mail à família que já é cliente.
- **Pronto quando:** os três casos funcionam (família nova, família que já é cliente, planilha sem e-mail), e a criança não aparece para ninguém antes do bilhete.

**Lote 29: vagas pagas pela instituição** (members, institutions, auth)
- Tarefas: rota interna nova no members para liberar `all_kids_courses` com prazo (o serviço já aceita, `grant-manual-entitlement.service.ts:387-420`, mas nenhuma rota entre serviços chega lá), com `sourceId` `institution:<id>:<perfil>`; número de perfis como união; cobertura do plano por criança; 30 dias de acesso depois do fim; apagamento em 90 dias.
- **Cuidado:** a liberação da escola contribui com zero perfis no cálculo. Os lembretes de vencimento não alcançam `institution:` (`renewal-reminder.repository.ts`), conferir de novo.

**Lote 30: contrato da grade e cobrança**, tela A7 (institutions, admin)
- Contrato, alunos ativos no dia 1º, lançamento mensal, registro do Pix e do número da nota emitida à mão. A nota fiscal do sistema continua só para CPF.

**Lote 31: relatório da BNCC, nota opcional e programa próprio**, tela A9 (institutions, members, community)

**Lote 32: ranking da escola**, tela C7 (members, institutions, community-kids)
- Coorte por instituição em `gamification.repository.ts`; começa desligado; mostra os primeiros lugares e a posição da própria criança.

### Lote final
Full review: `code-review` em `high` sobre o diff inteiro da frente, um revisor independente sem contexto, a bateria de isolamento completa, e o controle fechado com a lista do que vai para a produção e em que ordem.

## 7. Regras adotadas onde a especificação não fecha

Cada uma entra em `REGRAS-DE-NEGOCIO.md` e no controle, para a Helena ver e mudar se quiser.
- **Quem o plano cobre:** até 2 crianças, mais os perfis extras. Com mais perfis que lugares, entram primeiro os criados pela família e depois os que vieram da escola. Quem fica de fora tem só o acesso da escola. Nada é removido.
- **Conta provisória** (planilha sem e-mail): endereço sintético em domínio reservado, marcado, que nunca recebe e-mail.
- **"Só aparece depois do bilhete":** estado novo no vínculo do aluno.
- **Segmento do mural:** tirado do ano escolar por tabela fixa.
- **Troca de quem pagou adiantado:** o pedido fica guardado e o link chega no fim do período pago.
- **Cortesia:** validade mensal, renovada enquanto houver 20 pagantes.
- **"Durante a aula":** a permissão do professor vale 50 minutos, e ele pode desligar antes.
- **Crachá:** código curto com QR, válido no ano letivo, com 10 tentativas por computador a cada 10 minutos.
- **Protetores de sequência já comprados:** as moedas voltam para a criança.

## 8. Staging e produção

- **A staging é da sessão** (decisão da Helena, 28/11/2026): implantar tudo na staging, inclusive criar e configurar no Railway o serviço `institutions`, as variáveis e o que mais for preciso, pela CLI e pelos MCPs do Railway. Conferir no banco da staging que o usuário da aplicação respeita o isolamento (`rolsuper`, `rolbypassrls`) também é da sessão.
- **Produção: nada por enquanto.** A promoção só acontece depois de tudo muito bem testado na staging, quando a Helena decidir.

## 9. Verificação

- **Por lote:** `bun run --filter @sistemazero/<pacote> test` em cada pacote mexido, um por vez, e `bun run ci`.
- **Banco de verdade:** `tests/db` e a bateria de isolamento rodam num banco local descartável, com a variável `*_TEST_DATABASE_URL` do pacote. Teste pulado não prova o SQL: sem banco, o lote fica com a ressalva.
- **Navegador:** as telas de cada lote contra `especificacao/Tela-*.txt` e o Canvas.
- **Depois do push:** o CI (testes, typecheck, e2e). Vermelho é consertado antes do lote seguinte.
- **Provas de não regressão:** lote 5 (Cadê, Chave e Ilha do Farol reimportados sem diferença), lote 12 (nenhuma matrícula de hoje perde acesso), lote 13 (limite de perfis da Comunidade), lote 9 (borda idêntica sem o serviço).
