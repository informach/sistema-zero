# Promoção da plataforma: diagnóstico e decisões

Data da investigação: **27/09/2026**. Situação: **execução autorizada; candidatos em verificação**.

Este documento registra a investigação em código, GitHub, Railway, Postgres e R2. A execução está no [plano de preparação e subida](../superpowers/plans/2026-09-27-promocao-producao.md). A investigação inicial foi somente leitura. Depois, o usuário autorizou corrigir quatro bloqueios: as atualizações dos itens 1, 2 e 4 e o [runbook](../runbooks/promocao-producao-aulas-2026-09-19.md) registram o código preparado, o CORS aplicado e a configuração ativada no Admin. Não houve conversão de jogos, importação de cursos ou promoção completa.

## Escopo e decisões do produto

- Preservar os cursos de produção durante a reformulação gradual. Não copiar o banco nem o catálogo de aulas de staging por cima de produção.
- Manter uma seção principal com o conteúdo legado. **O usuário confirmou que o quiz pode continuar em uma seção separada.** Não é necessário remover a projeção legada existente.
- Preservar IDs, links, autoria, ordem pedagógica prevista pelo player legado, conclusões, posições de vídeo, tentativas, avaliações, recursos, entregas e direitos adquiridos.
- Converter todas as origens executáveis de jogos: criações, mural, entregas atuais e anteriores, atividades do professor e referências aos blocos liberados.
- Aviso temporário **uma vez por visita**, confirmado pelo usuário: aparece ao entrar na plataforma/perfil, fecha no X e não volta ao trocar de página naquela visita. Continua ativo até terminar a reformulação dos cursos.
- A substituição dos cursos existentes será gradual. O usuário autorizou publicar também o novo curso **Cadê Todo Mundo?**, como adição, sem substituir os quatro cursos existentes.

## Evidências atuais

### Código e serviços

Após `git fetch origin`:

| Referência | SHA | Data |
|---|---|---|
| `origin/main` | `5734facb7f97cd04515f0f0c53aa21980b8f821e` | 07/09/2026 |
| `origin/staging` e checkout auditado | `5bdce5ebbdb87e10937d0b0e60287f90a72befd6` | 26/09/2026 |

Há **577 commits** em staging ainda não presentes em main. A comparação afeta 21 pacotes, incluindo bibliotecas compartilhadas. Produção não está toda no mesmo SHA:

| Serviços de produção | SHA observado |
|---|---|
| Members, Admin, Kids, Community, Funnel | `5734facb` |
| Gateway, Messaging, Referrals | `f49b90a2` |
| Auth, Catalog, Payments, Hub, Fiscal, Marketing, Marketing App | `3773386a` |
| Helpdesk | `5bdce5eb` |
| Helpdesk App, deployment bem-sucedido listado no estado | `edcd9a7e` |

Um deployment mais recente do Helpdesk App aparece como `SKIPPED`; não confundir tentativa com versão ativa. Revalidar deployment ativo e SHA por serviço na execução. Não rebaixar Helpdesk ao publicar a release preparatória.

O [run de CI 36286479986](https://github.com/informach/sistema-zero/actions/runs/36286479986) terminou vermelho **no job de deploy de staging**. O job `ci`, Kids E2E e os jobs Studio E2E Chromium, Firefox e WebKit passaram. O deploy Fiscal falhou na inicialização com certificado vencido. Isto não equivale a afirmar que toda a experiência real de produção já foi homologada.

### Banco de produção, consultado em transações somente leitura

| Contexto | Journal atual | Candidato auditado | Migrations pendentes |
|---|---:|---:|---|
| Members | 76 entradas, até `0075` | 99 entradas, até `0098` | `0076`–`0098`, 23 |
| Catalog | 5, até `0004` | 8, até `0007` | `0005`–`0007`, 3 |
| Hub | 11, até `0010` | 14, até `0013` | `0011`–`0013`, 3 |
| Funnel (`funil`) | 15, até `0014` | 17, até `0016` | `0015`–`0016`, 2 |
| Referrals | 2, até `0001` | 4, até `0003` | `0002`–`0003`, 2 |
| Auth, Payments, Messaging, Fiscal, Marketing, Helpdesk | alinhados ao journal do candidato | sem novas migrations | código/configuração ainda precisam de avaliação |

São **33 migrations pendentes em cinco contextos**. O journal de Members em staging tem **100 entradas**, enquanto o repositório tem 99: há histórico da antiga migration de remoção de `support_block_ids`. Contagem isolada não prova divergência nem equivalência; conferir `created_at`, hash e schema real. Não apagar registros do journal para igualar contagens.

Marcas observadas em produção: Members `1788738340499`, Catalog `1783686273463`, Hub `1787700250169`, Funnel `1783687715038`, Referrals `1788721852338`. Todas precisam ser medidas novamente na janela.

| Dados de produção | Contagem |
|---|---:|
| Cursos publicados | 4 |
| Aulas publicadas | 37 |
| Blocos | 65 |
| Anexos | 7 |
| Conclusões de aulas | 110 |
| Registros de progresso/posição de vídeo | 68 |
| Tentativas de quiz | 55 |
| Entregas do Estúdio | 41 |
| Entregas com `previous_project` | 19 |
| Registros de criações Studio | 21, sendo 14 com arquivo e 7 excluídos |
| Registros de criações Pinta | 32, sendo 30 com arquivo e 2 excluídos |
| Concessões de blocos Studio | 10 |
| Posts do Hub | 15 |
| Jogos do mural com `play_id` e snapshot próprio | 13 |

Não existem ainda `lesson_structures`, `lesson_drafts`, `lesson_section_progress`, `lesson_evidence` e tabelas do Como fazer em produção. Não executar o inventário operacional atual sem antes adaptar seu tratamento de schema/preparar o banco.

Os quatro cursos são `corre-dino` (15 aulas), `desafio-primeiro-jogo` (10), `o-jogo-do-meu-jeito` (9) e `no-comando-da-ia` (3, público adulto). Staging tem outro conjunto de cursos e 16 aulas; seus dados não representam um ensaio da migração dos 37 registros de produção.

### Conversão ensaiada com os arquivos reais, sem gravação remota

Foram lidos diretamente do R2 os **13 snapshots do mural** e **32 objetos UGC** das criações Studio, incluindo partes de assets. A consulta não passou pelo endpoint público de jogar e não incrementou jogadas.

| Origem | Verificados | Conversões/alterações identificadas | Resultado local |
|---|---:|---:|---|
| Snapshots publicados do mural | 13 | 13 | formato atual, IDs e assets preservados, conversão idempotente |
| Criações Studio com `storage_ref` | 14 | 14 | manifesto/partes materializados e conversão válida |
| Entregas atuais | 41 | 41 | conversão válida |
| Versões anteriores das entregas | 19 | 19 | conversão válida |
| Conteúdo dos blocos das aulas | 65 | 8 | transformação de projetos/configurações válida |
| Metadados dos cursos | 4 | 3 | referências de ferramentas convertíveis |
| Concessões de blocos | 10 | 10 | lista de blocos convertível |

Não houve objeto ausente entre os 45 lidos, nem falha de conversão nesse conjunto. Os 7 registros Studio excluídos e sem arquivo não são jogos vivos a recriar. Pinta tem versão própria de formato; não deve receber `format_version=2` apenas porque Studio mudou.

**Limite da prova:** foi exercitado o conversor real sobre os dados capturados, incluindo sua validação e idempotência. Ainda não houve aplicação/rollback do lote de produção, comparação integral após bloqueio de escritas, nem teste de jogabilidade dos 13 jogos no navegador. O corpus é anterior às migrations de aulas e não substitui a captura final.

Os dados brutos e relatórios individuais estão em `.cache/production-readiness-2026-09-27/`, ignorado pelo Git. Contêm projetos privados: não anexar a PR nem expor em artifacts públicos. Relatórios de conversão: `mural-check.json` e `studio-check.json`. Estes arquivos locais não são backup operacional de produção; os backups da execução precisam estar em armazenamento privado durável.

## Achados que condicionam a subida

### 1. Runbook de 19/09 — instruções obsoletas substituídas

O runbook anterior dizia que a primeira release terminaria na `0090` e que a antiga `0091_sai_o_apoio_das_secoes` seria restaurada depois. Seu [conteúdo atualizado](../runbooks/promocao-producao-aulas-2026-09-19.md) removeu essa restauração e passou a refletir os seguintes fatos:

- O journal atual termina em `0098`.
- `0091_mysterious_kate_bishop.sql` adiciona `zappy_student_notebook` **e remove `support_block_ids`**, sob outro nome e timestamp (`1789854211951`).
- O teste `migrations-journal.test.ts` recusa apenas o nome da antiga migration; passa mesmo com esse novo `DROP COLUMN` presente.
- `0093_ebook_attachment_links.sql` troca `content.url` do Livro 3D por `attachmentId`, altera rascunhos e fontes do Zappy. Isso é mudança de contrato de dados, não só criação de colunas.
- `0094` cria `modules.illustration`; `0095` remove essa coluna e passa a `rive_url`.

Em produção atual, a tabela de estruturas ainda nem existe: não seria correto afirmar que o Members `5734facb` já lê `support_block_ids`. O risco concreto é misturar contratos e versões durante a transição, aplicar o runbook obsoleto, ou servir livros transformados ao consumidor antigo. A revisão de compatibilidade deve partir do SHA efetivamente implantado.

**Decisão técnica proposta:** release A com aplicação compatível com produção e migrations Members somente até `0090`; release B com migrations restantes e consumidores novos dentro da janela de manutenção. Preparar A a partir de main, transportando os artefatos históricos de migrations, sem editar SQL já aplicado. Não usar HEAD atual com um journal simplesmente truncado: seu código exige colunas da B. Não restaurar a antiga `0091_sai_o_apoio_das_secoes` no journal atual.

### 2. Conversor operacional — restrição resolvida após a auditoria

Na auditoria inicial, `packages/studio/scripts/project-migrations/{railway,capture,plan,engine,cli}.ts` restringiam ambiente, tipos e buckets a staging. A correção autorizada acrescentou `target.ts`, destino explícito por CLI, verificação de nome/ID/projeto/buckets, plano de formato 2 e vinculação do adaptador de aplicação/rollback ao destino do corpus. O preflight recusa schema anterior à B antes de inventariar, sem gravar no destino.

As duas lacunas de cobertura também foram corrigidas e testadas:

- `lesson_drafts.previous_document`, criado pela `0089`, agora faz parte da transformação e da recuperação do lote.
- `drafts.ts` e `lesson-draft.repository.ts` compartilham `published-lesson-revisions.ts`, preservando as bases compatíveis de livros/cadernos/critérios e conflitos reais. Fixtures conferem também o mapeamento das linhas SQL.

Produção hoje tem zero rascunhos porque a tabela não existe. A captura final continua obrigatória após as migrations B. Suíte do conversor: 55 testes aprovados, incluindo produção, mural, recusa entre ambientes, rascunhos/desfazer e recuperação. Nenhum lote foi aplicado em produção nesta correção.

### 3. Certificado Fiscal vencido nos dois ambientes

O erro de staging informa vencimento em **23/09/2026 às 19:30 UTC (16:30 de Brasília)**. Leitura direta do certificado configurado em produção confirmou a mesma validade. Não foram expostos certificado, senha ou chave privada.

Produção ainda lista o deployment anterior como `SUCCESS`, mas `composition-root.ts` lança erro na inicialização com certificado expirado em `NODE_ENV=production`. Renovar/configurar e validar o Fiscal antes de um redeploy dele. Não contornar a validação nem trocar o ambiente fiscal para simulação. Conferir também a fila de emissão; deployment ativo não demonstra emissão funcionando.

### 4. Infraestrutura de mídia incompleta em produção

**Atualização após a correção autorizada:** os três primeiros achados abaixo foram resolvidos. CORS público e probe instalados; GET/HEAD passaram para Kids/Comunidade e uma amostra existente do CDN. Variável UGC ativa no Admin, regra GET/HEAD acrescentada preservando uploads dos alunos e URLs assinadas confirmadas (HEAD 200, GET parcial 206). Admin redeployado no mesmo SHA de produção, deployment `c94f7607-8de0-4359-af92-1cc70e190247`. Os itens abaixo preservam o diagnóstico inicial; runtime/cron e smoke autenticado da nova interface continuam no plano.

- Bucket público `comunidade-sistema-zero`: leitura de configuração retornou `NoSuchCORSConfiguration`. O novo Rive carrega arquivos diretamente pelo navegador; configurar GET/HEAD nas origens reais.
- A prova pública em `https://cdn.sistemazero.com.br` falhou com **404 no objeto de prova**. Instalar o probe privado de operação no bucket público e executar o check com origem de produção. O 404 isolado não prova falha de CORS; a ausência de regras foi constatada separadamente.
- Admin não tem `R2_UGC_BUCKET` configurado. O bucket UGC também não inclui a origem do Admin nas regras GET/HEAD atuais. Corrigir ambos para moderação/visualização de entregas.
- `STUDIO_PRO_RUNTIME_URL` e `STUDIO_PRO_RUNTIME_TOKEN` existem em Admin e Kids. `CREATION_CLEANUP_CRON_SECRET` existe no Kids. Presença não comprova igualdade dos segredos nem funcionamento; falta o smoke correspondente.
- `ELEVENLABS_API_KEY` está ausente no Admin de produção: bloqueia geração nova de voz, não a reprodução de áudio já publicado. Configurar antes de a equipe depender desse recurso; não bloquear toda a leitura dos cursos por uma ferramenta editorial opcional.
- Runtime Pro e cron de limpeza Cloudflare não mudaram no diff auditado. Merge no Railway não os publica. Conferir configuração/saúde; não redeployar por reflexo.

### 5. A promoção também contém mudança comercial

O novo Funnel promete Desafio de 30 dias e exige oferta correspondente. Produção ainda usa `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO=desafio-primeiro-jogo`, a oferta histórica. Subir o novo Funnel sem a virada retorna 503 intencionalmente.

Members tem `FUNNEL_URL` de produção, mas está sem `FUNNEL_INTERNAL_TOKEN`, necessário à nova integração comportamental. Catalog roda migrations **e seed** no preDeploy; Messaging agora roda migrations **e seed de templates**. Mapear esses efeitos, sem disparar mensagens de teste para famílias reais.

Recomendação: uma onda comercial própria, coordenada pelo [runbook do Desafio](../runbooks/desafio-primeiro-jogo-virada.md). Decidir se ocorre na mesma janela ou logo depois. Caso seja posterior, manter o deployment atual do Funnel e provar sua compatibilidade com os backends novos. Não encurtar acesso vitalício existente nem trocar ofertas comerciais implicitamente como parte da conversão dos jogos.

### 6. Não há mecanismo de manutenção comprovado no código auditado

A busca encontrou documentação mencionando manutenção, mas não um bloqueio operacional pronto para essa virada. Avisar a equipe ou esconder um botão não bloqueia abas antigas, autosave, acesso público a jogos, uploads pré-assinados, exclusão de conta e jobs de limpeza.

Preparar e ensaiar uma barreira temporária que impeça alterações nas origens inventariadas e impeça consumidores antigos de ler dados incompatíveis durante B. Preservar o processamento de pagamentos/webhooks. Pausar somente os jobs que podem alterar/remover objetos do lote, esperar requisições em voo e expiração/conclusão dos uploads reservados. O próprio CAS do conversor continua obrigatório.

## Compatibilidade dos cursos e substituição gradual

`0080_backfill_lesson_sections.sql` cria uma estrutura por aula, com a mesma identidade e os IDs dos blocos ordenados. O player reconhece essa estrutura como legada por meio de `packages/core/src/learning/legacy-layout.ts` e pode apresentar conteúdo principal + quiz separado. Esse comportamento foi aceito pelo usuário e tem testes existentes.

Condições para manter os cursos funcionando:

1. Preservar os 37 IDs e slugs de aulas e os quatro cursos; não executar seeds de curso, reorganizações ou importações de staging durante a virada técnica.
2. Preservar as 110 conclusões, 68 posições e 55 tentativas, com comparação de identidades/conteúdo, não apenas contagem. Aula concluída continua concluída e não gera XP/moedas novamente.
3. Não inventar `account_id` para progresso antigo. O primeiro vídeo conserva o fallback de posição por aula existente em `lesson-sections.tsx`.
4. Converter os sete livros para anexos com `0093`, preservando seus arquivos, vínculo de caderno do Zappy e marca d'água. Os sete livros atuais têm URL não vazia.
5. Rodar `materials:backfill` após o commit da migration que adiciona o enum `materials`. Sem esse passo os anexos antigos podem ficar invisíveis na UI nova. Não criar novas seções para encaixá-los; usar a seção existente.
6. Conferir aulas sem conteúdo, `coming_soon` (11 blocos), certificado (1), videoaula com quiz e atividade híbrida, além do curso adulto.
7. Não aplicar critérios novos retroativamente nem apagar notas, respostas ou histórico do professor. Conteúdo histórico imutável que precise ser executado deve usar o leitor de compatibilidade, com prova de abertura.

Ao substituir um curso posteriormente, preparar uma nova versão editorial, mapear matrículas e percurso, revisar progresso/conquistas e trocar apenas aquele curso após homologação. Não presumir equivalência pedagógica entre a aula antiga e a regravada. Guardar a versão anterior e manter links já compartilhados.

## Modal temporário

### Texto implementado

**Tem novidade por aqui!**

Ouvimos vocês e estamos melhorando a plataforma!

Vamos regravar todos os cursos e trocar as aulas aos poucos. Alguns vídeos ainda mostram a versão antiga, mas você pode continuar estudando.

Na área **Como fazer**, vamos colocar tutoriais para ajudar você a usar as novidades.

Botão: **Continuar**. Link: **Conhecer o Como fazer** (`/como-fazer`). X sempre visível, com nome acessível **Fechar aviso**.

### Comportamento implementado

- Somente para perfil infantil autenticado, em qualquer entrada do layout `(app)`, inclusive link direto para aula/Estúdio. Não mostrar na página pública de jogar nem na área dos responsáveis.
- Uma visita corresponde à sessão da aba no navegador; nova aba/abertura inicia outra visita. Recarregar e navegar internamente não reabrem após fechar. Entrar/trocar/reentrar no perfil inicia uma nova visita daquele perfil. Retomar uma aba restaurada pelo navegador pode preservar `sessionStorage`; documentar e testar esse comportamento, sem usar timeout arbitrário para interromper uma aula.
- Registrar a dispensa em `sessionStorage`, vinculada à campanha e ao perfil, e limpar no fluxo de saída/entrada do perfil. Não usar preferência permanente no banco nem `localStorage` de “não mostrar novamente”. Sem storage disponível, manter fechamento em memória durante a navegação.
- Uma flag server-side, `KIDS_REFORM_NOTICE_ENABLED`, habilita/desabilita o aviso. Identificador de campanha: `platform-renovation-2026-09`. Implementada com valor padrão desligado; ativar em produção após publicar a ajuda. Não expor segredos ou tokens no cliente.
- Usar `@sistemazero/ui/dialog`, com foco preso no modal, Escape, retorno de foco, rolagem em tela pequena e alvo de toque adequado para o X. Sem vídeo, áudio automático, contagem regressiva ou leitura obrigatória.
- Abrir no início da visita. Não aguardar uma ação de edição para interromper trabalho já iniciado.
- Coordenar com `ChildGuide` e `CelebrationWatcher`: um modal por vez. Fechar o aviso libera a próxima experiência; nenhuma comemoração ou onboarding é descartado definitivamente.
- Link de ajuda fecha o aviso antes de navegar. A navegação para Como fazer não o abre de novo naquela visita.
- Desativar a flag quando os cursos forem reformulados; remover código e testes do aviso numa limpeza posterior. Sem data automática que possa vencer antes do trabalho editorial.

### Como fazer precisa de conteúdo, além de código

Staging tem 4 coleções e 24 tutoriais. O arquivo `docs/como-fazer/como-fazer.json` passou pelo validador atual. O import cria/atualiza rascunhos por slug, **não publica**. Importar uma seleção revisada em produção e publicar antes de ativar o link do modal. Pode começar com os tutoriais essenciais e ampliar aos poucos, como solicitado. Não precisa regravar os cursos para publicar esses tutoriais.

## Estratégia recomendada

| Alternativa | Avaliação |
|---|---|
| Preparação + duas releases ordenadas + manutenção na transição incompatível | Recomendada: permite provar o banco preparado antes de entregar o novo contrato e controlar o lote de jogos |
| Aplicar tudo e deployar todos os serviços juntos | Rejeitada: workflow não ordena a produção e transforma livros durante convivência de versões; o conversor já habilitado para produção ainda exige janela, captura final e validação |
| Aguardar a regravação integral dos cursos | Desnecessária: o suporte legado permite reformulação gradual |

O `preDeployCommand` prepara um deployment, mas não é coordenador global dos outros serviços ([Railway](https://docs.railway.com/deployments/pre-deploy-command)). Novos valores de enum só podem ser usados após o commit que os adicionou ([PostgreSQL](https://www.postgresql.org/docs/current/sql-altertype.html)). Por isso `materials:backfill` é uma operação posterior à migration, e `services=all` não organiza esta subida.

## Verificações realizadas e restantes

Realizadas nesta investigação:

- [x] Git remoto atualizado; comparação main/staging e estado do workflow.
- [x] Estado Railway e configurações selecionadas, sem revelar segredos.
- [x] Journals e contagens dos dois bancos em transações somente leitura.
- [x] Conversão local dos 13 jogos do mural, 14 criações com blobs, 60 versões de entregas, conteúdo de aulas, metadados e grants.
- [x] 49 testes de migração Studio passaram na investigação inicial; após as correções, a suíte passou com 55 testes. Rodar em `packages/studio` com seu `bunfig.toml`/preload.
- [x] 3 testes de layout legado e 3 testes do journal Members passaram. O teste nominal do journal tem a lacuna descrita acima.
- [x] Validador dos 24 tutoriais passou; apontou apenas sugestões editoriais de imagens/vídeos.
- [x] Certificado Fiscal e configuração de CORS examinados.
- [x] Após autorização: runbook substituído, CORS público/UGC aplicados, variável do Admin ativada no mesmo SHA e verificada dentro do serviço.
- [x] Após correções: 18 testes de rascunhos/restauração/livros e typechecks de Members e Studio aprovados; script de CORS do Admin também verificado pelo TypeScript.

A primeira chamada de testes Studio pela raiz falhou por não carregar o preload DOM do pacote. Rodando no diretório correto, os 49 passaram; não houve mudança no código para obter esse resultado.

A preparação de A, o modal, a restauração e o ensaio real das migrations/conversor foram concluídos. Continuam pendentes CI dos candidatos, janela real com backups finais e barreira, integrações e smokes de interface. O certificado Fiscal foi excluído pelo usuário; o serviço não será redeployado nesta promoção.
