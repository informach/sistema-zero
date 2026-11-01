# Copiar um curso pronto do Kids para o adulto

O comando cria o curso adulto ausente ou atualiza o existente, a pedido da equipe. Não mantém sincronização automática. A origem precisa estar publicada e com todas as aulas ativas publicadas. O curso e as aulas do adulto ficam publicados ao final da transação.

## Conteúdo e identidade

São copiados título, subtítulo, descrição, capa, módulos, resumo e animação do módulo, aulas, blocos, partes, objetivos privados, exemplos, materiais, PDFs, configurações de progressão, vídeos e lista de blocos concedidos. As instruções dos vídeos planejados também permanecem disponíveis na autoria.

O adulto mantém seu ID, slug e audiência. Aulas são reconhecidas pelo mapa de proveniência ou, na primeira operação, pelo slug. IDs existentes são preservados. Na primeira cópia, módulos, blocos, partes e anexos correspondentes são reconhecidos pela posição; depois, `metadata.contentMirror` conserva o mapa mesmo se a ordem mudar.

A grade de origem substitui integralmente a grade ativa adulta. Módulos e aulas excedentes são arquivados, os blocos dessas aulas também, e as aulas deixam de ser publicadas. Saem da navegação, da autoria normal e dos números da grade atual, mas seus registros de progresso, conclusões e entregas permanecem. Se uma aula voltar, o mapa ou o mesmo slug recupera sua identidade. Aulas novas ficam pendentes para quem ainda não as fez. O percentual pode mudar para refletir a nova grade; o histórico não é zerado. O plano explicita as retiradas em `retirements`.

Os dados de alunos não são copiados, removidos nem reatribuídos. O publicador canônico continua responsável pelas revisões de conteúdo e pela invalidação de tentativas de quiz quando a pergunta muda. A posição exclusiva do Kids não é transferida para a jornada adulta. Metadados antigos de um modelo vazio, como a lista antiga de aulas planejadas, são substituídos pelos da origem. As referências dessa lista são remapeadas quando ela existe na origem.

A URL comercial troca apenas o segmento inicial `/kids/` por `/pro/`, preservando o restante e a query. Se o Kids não tiver URL, conserva a URL adulta existente. Outro formato de URL é recusado para não inventar o destino comercial.

Os arquivos continuam compartilhados por referência, incluindo PDFs privados no R2. Não são baixados e reenviados. O catálogo de mídia e o curso são lidos **no mesmo ambiente**: Kids de staging vai para adulto de staging; Kids de produção vai para adulto de produção. Não transportar um plano entre ambientes.

## Vídeos, voz e conteúdo do tutor

Antes de escrever no Members, o operador consulta o Vimeo com as credenciais do Admin do ambiente e exige `available` em todos os vídeos. As falas vêm da mesma função `falasDaAula` usada pelo botão de voz do Admin, incluindo diálogos, experiências e quiz. `gerarVozes` reaproveita os MP3s existentes no cache oficial do R2 e só sintetiza os que faltam. O operador também confere a entrega HTTP dos áudios. Falha ou falta de voz impede a aplicação, sem substituir o áudio por uma promessa de geração posterior.

Extratos didáticos válidos e atuais do tutor são reaproveitados por meio do repositório canônico de conhecimento, com referências e revisões adultas. Não se copiam conversas de alunos. Transcrição ou PDF marcado para o tutor sem fonte pronta e atual impede a publicação e reverte a operação inteira. O índice antigo do destino é substituído na mesma transação. Um índice perdido pode ser reparado sem republicar o curso; `verify` é somente leitura e também confere o conhecimento, não apenas os arquivos.

O programa é sempre copiado da versão publicada. Um rascunho diferente bloqueia a operação, exceto pela data interna `initialProject.updatedAt` do Estúdio, que pode mudar ao abrir o editor. Essa exceção não alcança código, arquivos, exemplos, blocos ou falas. A data copiada continua sendo a publicada.

## Pelo Admin e pelo trabalho durável

A operação habitual passa a ser **Mais ações → Publicar e atualizar no adulto**, na lista de cursos Kids. Ela prepara a mídia e o material do Zappy no próprio ambiente, mostra a prévia e publica depois da aprovação explícita. Curso ausente é criado. Ver `publicar-cursos.md` para promoção entre ambientes, configuração, retomada e operador do mesmo serviço.

Os extratos também podem ser preparados a partir do material publicado quando o índice da origem não existe. A aplicação instala as fontes e os trechos do destino na mesma transação do curso. O operador direto abaixo mantém a conferência do índice de origem e serve para intervenções e auditorias que já usam seus recibos privados.

Planos antigos precisam ser preparados novamente após a adoção do hash canônico desta funcionalidade. Não reutilizar `prepared.json` de uma versão anterior do sincronizador.

## Execução do operador direto

A regra pura fica em `members/src/domain/course-publication/course-sync.ts`, o executor transacional em `members/src/infrastructure/persistence/drizzle/course-sync.ts` e a adaptação Railway em `members/scripts/course-audience-sync/run.ts`. O executor recebe o parser canônico e a política da composição. O comando empacota a mesma regra local, mantendo os publicadores e a política nos módulos implantados. A aplicação não deve executar o comando ou abrir um shell para publicar.

Requisitos: Bun, Railway CLI autenticada com SSH e acesso aos serviços `members` e `admin` do projeto. A migration Members `0145_archive-course-curriculum.sql` e os repositórios com arquivamento precisam estar implantados antes de executar esta versão do operador contra um ambiente remoto. A alteração só acrescenta duas colunas nullable e não arquiva dados por conta própria. No Windows, o operador usa a instalação npm da CLI sob `%APPDATA%`. As credenciais do banco, Vimeo, ElevenLabs e R2 permanecem nos processos remotos dos serviços. Não editar `.env` nem copiar tokens para argumentos.

Execute na raiz do repositório. Informe o UUID da conta administrativa responsável pela operação e um diretório novo sob `.cache/course-audience-sync/`.

```powershell
bun scripts/release/sync-course-audiences.ts prepare staging cade-todo-mundo cade-todo-mundo-adulto .cache/course-audience-sync/minha-copia-staging UUID_ADMIN
```

Leia o resumo e confira `prepared.json`, especialmente a identidade dos cursos, a URL comercial e o número de aulas. O diretório contém `backup.json`, hashes, plano e logs privados com o conteúdo autoral. Não commitá-los. A preparação pode gerar áudios ausentes no R2, mas não altera os cursos.

```powershell
bun scripts/release/sync-course-audiences.ts apply staging cade-todo-mundo cade-todo-mundo-adulto .cache/course-audience-sync/minha-copia-staging UUID_ADMIN
bun scripts/release/sync-course-audiences.ts verify staging cade-todo-mundo cade-todo-mundo-adulto .cache/course-audience-sync/minha-copia-staging UUID_ADMIN
```

Depois, repita **prepare, apply e verify** com `production`, outro diretório e o UUID administrativo de produção. Para outro curso, troque os dois slugs. Não é necessário implantar um endpoint novo para executar o operador: ele transporta o código operacional por SSH e carrega os publicadores e a política do Estúdio diretamente dos arquivos implantados no Members. O gerador de áudio é empacotado a partir do código oficial do Admin.

O backup deve corresponder ao inventário do plano. Mudança na árvore, no código operacional ou no plano recusa a aplicação. O conferimento de mídia vale por 30 minutos. As travas dos cursos e das aulas, a comparação do plano e a publicação das aulas acontecem na mesma transação. Um erro desfaz a cópia inteira. Uma nova preparação de conteúdo já equivalente retorna `changed: false`; a aplicação correspondente não republica as aulas, mas pode reparar um índice do Zappy perdido. Se o índice também estiver equivalente, não escreve nada. Não reutilizar diretórios de evidência para novas tentativas.

## Verificação local

```powershell
bun test packages/members/tests/unit/course-audience-sync.test.ts packages/members/tests/unit/course-audience-bundle.test.ts packages/admin/tests/voz-zappy.test.ts
```

O teste de banco em `packages/members/tests/db/course-audience-sync.test.ts` exige `COURSE_SYNC_TEST_DATABASE_URL` com host `localhost` ou `127.0.0.1` e banco `sistemazero_course_sync_test`. Migra esse Postgres descartável e cobre publicação, progresso preservado, cópia de conhecimento, repetição, plano concorrente, mídia vencida e rollback após erro em uma aula posterior. Nunca usar um banco de staging ou produção nesse teste.
