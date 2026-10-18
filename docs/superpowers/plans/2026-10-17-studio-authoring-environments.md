# Autoria de aulas com dois ambientes

Implementar pelo agente principal usando executing-plans, com revisão independente ao fechar o lote. A autorização vigente é continuar sem parar entre lotes; commit/merge só no fechamento integral.

## Contrato

O snapshot determina linguagem/tipo. O manifesto de aprendizagem e o rascunho reconhecem quatro documentos v3 sem convertê-los. A publicação consulta catálogo aprovado pelo servidor e confere release, modo, extensão, lock e curadoria. Dados do projeto nunca aprovam sua própria distribuição. JS v2 permanece aceito nos contratos atuais; formato histórico v1 continua recusado para nova autoria.

Rascunho legível pode guardar ambiente indisponível para recuperação, mas não publicá-lo. Salvar/publicar não executa fontes nem imports. O catálogo recebido da configuração do servidor é verificado no boot; ausência mantém JS v2 e recusa publicação v3 com mensagem explícita. A ativação de uma release Python depende das provas de qualificação restantes e não é implicada por esta alteração.

## Lote

- [x] Manifesto Core aceita as quatro variantes v3, preserva a validação JS v2 e recusa forma/linguagem divergentes.
- [x] Fronteira de rascunho aceita somente documentos correntes; validação de publicação compartilha uma política servidora com catálogo/estado, sem exigir templates JS no Python.
- [x] Verificar modo, curadoria, extensões, template Pro e dependências exatas; conferir hash real de requirements.txt antes de publicar.
- [x] Injetar política na publicação SQL, importação e serviço de blocos; repetir verificação no fluxo transacional existente. Cobrir catálogo ausente, retirado/revogado, dados adulterados, quatro variantes e JS legado.
- [x] Testes de manifesto/domínio/HTTP/SQL pertinentes, Members typecheck e revisão independente. As três lacunas conhecidas de Studio/Shell pertencem aos próximos lotes.

## Continuação do L6

Formulário/admin, seleção e criação, providers dos hosts, grants contextuais e renovação continuam após esta fronteira. Política de autoria não é grant de execução. Cadeias incompatíveis exigem validação entre blocos, além da compatibilidade de retomada já implementada. Atividades Python são o lote próprio; não passar checagens JS por engano.

## Evidência da fronteira de publicação

- Members: 53 testes / 224 asserções (autoria/domínio/HTTP/regressão), `l6-authoring-http-2.log`.
- PostgreSQL com histórico completo: 9 / 52, incluindo publicação das quatro variantes e revogação entre salvar/publicar, sem alterar rascunho/publicado na recusa (`l6-authoring-db-1.log`).
- Members typecheck passou (`l6-members-authoring-typecheck-1.log`), antes da pequena política de dependências compartilhada adicionada ao final. Studio/Shell ainda têm as três lacunas conhecidas de atividades/exportweb/Zappy.
- Review041: um achado médio corrigido e revalidado, nenhum pendente. Hash fornecido pelo documento não comprova resolução de requirements. `python-dependency-policy.ts` agora recusa requisitos efetivos/lock não vazio na publicação e execução, sem impedir rascunho/exportação fonte; comentários/vazio permitidos. Snapshot6/27 e revisão independente confirmam.
- Runtime regressão42 testes passou; guarda de bundle inicialmente reprovou (rota21/20, Código19/18). Agrupamento dos utilitários compartilhados code-observation, python-source-positions e modelPaths corrigiu sem elevar limites. Lista348725B/116103gzip/8arquivos; rota19arquivos; Blocos19/Ponte20/Código18. Prova before/after JSON e `l6-authoring-bundle-after-2.log`. Review do grafo sem novos achados; browser JS3/3 após agrupamento (`l6-authoring-js-bundle-browser-2.log`).

## Próximo lote — cadeias de projetos

- [x] Compartilhar a comparação de ambiente já usada pela retomada; uma cadeia compara linguagem/tipo/release/template, sem comparar fonte/assets/curadoria editáveis.
- [x] Publicação SQL usa o lock de curso já existente e valida os candidatos na mesma transação. Uma reautoria incompatível em cadeia nomeada exige outro nome de cadeia.
- [x] Serviço de blocos usa o mesmo lock de curso para conferir/gravar, preservando a guarda Pinta existente.
- [x] Provar duas publicações concorrentes incompatíveis na mesma cadeia (só uma pode gravar), cadeias/cursos independentes, atualização compatível, rollback e preservação dos vínculos anteriores. Revisão independente após implementação.

### Ajuste necessário do contrato

Comparar apenas blocos ativos permitiria apagar/renomear o último bloco e reutilizar o nome com outro ambiente. `studio_course_chains` registra por curso/nome normalizado uma referência imutável e pequena, sem fontes/assets/grants. A primeira reivindicação consulta referências de blocos atuais/arquivados e baselines; as seguintes usam a chave primária. A transação registra também as cadeias que estão sendo retiradas, antes de sobrescrever o conteúdo. Histórico antigo ambíguo pode ser retirado, registrando ambiente nulo para impedir reutilização incompatível; novos candidatos nunca aceitam ambiente nulo.

Migração0130 criada exclusivamente pelo `bun run db:generate --name studio_course_chains`. Migração0131 gerada para índice de baselines por curso, evitando varrer histórico global na primeira reivindicação. Alterações aditivas, sem converter projetos ou apagar dados. Aplicar antes do novo backend; rollback do código pode manter as tabelas/índices, mas voltar ao escritor antigo perde a garantia de novas reivindicações. A verificação de histórico por primeira reivindicação é parte do protocolo transacional, não uma alteração silenciosa das fontes antigas.

Review042/001 encontrou exclusão do pai (aula/módulo) eliminando a evidência pré-rollout. `preserveStudioChainsForLessons` agora coleta nomes de blocos/baselines e registra sob o lock de curso antes do cascade. SQL real14/85 passou (`l6-authoring-chain-db-2.log`), incluindo duas publicações incompatíveis concorrentes (uma só aceita), atualização fonte compatível, troca recusada preservando rascunho/publicado/binding, exclusão/rename, nomes/cursos independentes e exclusão dos dois pais. Unit/HTTP29/138 passou antes desta última correção; revalidação e typecheck em andamento.

Diagnóstico do primeiro timeout: Bun1.3.11/Windows `expect(promise).rejects.toThrow` travou em BEGIN sem callback após transações repetidas. Repro mínimo independente da aplicação em `.cache/studio-python-l0/bun-postgres-rejects-repro.test.ts`; aguardar o resultado da Promise e depois usar expect passou1/2 em224ms. Os novos testes SQL usam essa sequência e passaram sem elevar seu timeout nem alterar execução do produto. A primeira falha adicional era created_at/updated_at ausentes no fixture da segunda aula, corrigidos conforme schema real.

Fechamento deste lote: `l6-authoring-chain-db-3.log`14/85 passou aplicando0129–0131 pelo migrador real sobre histórico prévio completo, seguido de segunda chamada idempotente. `l6-authoring-chain-regression.log`83/394 passou (inclui importação, conteúdo e restauração); `l6-members-authoring-chain-typecheck-2.log` exit0. Primeiro typecheck só identificou narrowing ausente no novo teste, corrigido sem alterar produto. Review0421/1/0 fechado com revalidação independente, incluindo retirada de histórico ambíguo. Nenhum commit/merge final realizado.

## Próximo lote — descoberta e seleção de ambientes na autoria

- [x] Expor catálogo verificado e curadoria por release em rota de autoria protegida pelo mesmo controle de Admin; configuração ausente oferece apenas JS legado. A resposta é metadado de edição, nunca grant de execução.
- [x] Consumir opções no Admin, com JavaScript padrão, tipo Clássico/Pro independente e criação explícita de novo projeto ao mudar ambiente. Não reinterpretar fonte existente como outra linguagem.
- [ ] Categorização/blocos por linguagem e release; clipboard não transfere IDs JS para Python. Preview e análise usam providers aprovados do host, nunca URLs do snapshot.
- [ ] Provas de autorização, indisponibilidade/revogação, mudança/cancelamento e preservação da autoria JS; review do lote. Grants contextuais de execução são o próximo contrato conjunto dos hosts.

### Seleção/curadoria em validação

Admin consulta metadados via BFF no-store, mantém autoria JS legada quando a consulta falha, oferece apenas releases ativas compatíveis e templates locais aprovados. Trocar ambiente/tipo/modelo cria outra semente após confirmação; cancelar preserva fonte e curadoria. Catálogo indisponível não reinterpreta projeto salvo. A factory preserva assets JS Pro, usa leitor semântico comum; Python nasce sem extensões. Blocos/categorias usam metadados por release e extensões instaladas (Programação separado de Turtle); clipboard exige identidade de ambiente, conteúdo antigo é JS legado. IDs não disponíveis são preservados com aviso, não apagados.

Python ganhou pythonLevel 1/2/3 independente do nível JS, com rótulos já existentes do pacote movidos para contrato compartilhado. Campo segue manifesto/DTO/publicação, baseline imutável, cache, sala e StudioCore; alterar nível altera identidade da baseline. Formulário Python omite nível JS. JSONB existente comporta o campo, sem DDL nova.

Provas: Admin29/151 (l6-authoring-admin-ui-2.log); Studio15/60 (l6-authoring-studio-ui-1.log, avisos act existentes); Members16/120 (l6-authoring-python-level-http-1.log); Shell11/29; SQL live-course5/42 (l6-authoring-python-level-db-2.log). Primeira SQL rodada falhou dois timeouts; teste pool1 isolado passou, trace copiado sem mudar produção passou5/42 e original passou em2.32s. Causa inicial não demonstrada; não declarar corrigida por aumento de timeout nem confundir com prova de desempenho. Trace em packages/members/.cache/live-course-trace.test.ts, logs na cache raiz.

Review043 em andamento. Achado confirmado: revogação recebida enquanto template carrega permitia substituição usando metadados antigos. Régua compartilhada resolveStudioAuthoringSelection agora relê ref do catálogo atual imediatamente antes da troca; teste React3/24 passou incluindo suspensão/revogação/preservação. JsonImportPanel da seleção de blocos remonta ao mudar conjunto de IDs, impedindo candidato validado em catálogo anterior. Revalidação independente pendente.

AdminTSC2 só fixture main.ts inválido (agora script.js) e três gaps Studio conhecidos atividades/exportweb/Zappy. MembersTSC1 só status literal de teste (corrigido as const); repetição pendente. Providers reais de execução/análise e grants contextuais ainda não ligados; este lote não libera execução por metadados.
