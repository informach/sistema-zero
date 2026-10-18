# Execução contextual do Estúdio — L6

Implementar a seção 9 da proposta aprovada. Autorização vigente permite continuar entre lotes; revisão independente ao fechar cada fronteira. Não ativar releases de produção nem publicar durante a implementação.

## Decisão

O documento descreve o projeto; não concede acesso. Cada operação servidora resolve ator e contexto novamente. Uma resposta de capacidades pode alimentar a interface por prazo curto, mas nunca substitui a verificação servidora de uma chamada subsequente. Evitar bearer grants reutilizáveis sem revogação. Operações já concluídas no navegador não têm revogação retroativa dos bytes.

O catálogo fixado e aprovado pelo host define linguagem, release, extensões, dependências e compatibilidade. A autorização contextual define quais operações aquele ator pode realizar naquele projeto. A decisão inclui identidade do projeto/candidato, baseline/revisão quando existente e prazo de validade; o host descarta respostas atrasadas após mudança de projeto/contexto. URLs de distribuição vêm da configuração servidora, nunca do snapshot.

### Candidato compacto e análise inerte

`StudioRuntimeSubject` contém somente identidade, ambiente, modo, extensões, modelo e configuração Python/requirements. A autorização NÃO transporta fontes, assets, IR nem cache visual e NÃO afirma que o servidor validou o conteúdo executável. `revision` identifica o snapshot que o executor calcula e confere antes de executar; o Members a vincula à decisão, juntamente com `subjectSha256` calculado pelo servidor. Nenhuma operação servidora posterior pode aceitar essa resposta como bearer grant. O serviço que de fato recebe/executa código precisa verificar seu snapshot real e reautorizar o contexto.

Esta separação corrige review044/001: a primeira implementação reaproveitava o limite de upload/live e recusava uma cadeia válida de55blocos/39KB por profundidade, ou mídia válida maior que2MB de JSON. Não elevar limites nem remover caches do documento: não enviar o documento para uma decisão que não precisa dele. A prova independente com os mesmos materiais passou HTTP200 com corpo<2500bytes, sem afetar armazenamento.

Análise não instala dependências nem executa a fonte. Ela aceita requirements em edição/lock ainda desatualizado, mas só devolve edit/export-source. Execução, REPL e publicação continuam verificando conteúdo real de requirements, hash/lock e ausência de pacotes externos não oferecidos. Correção044/002 revalidada com comentário e declaração de requests; analyze200, executar/REPL/publicar recusados.

## Fronteiras de implementação

- [ ] Compartilhar a verificação do catálogo/projeto entre publicação e execução, mantendo propósito e ciclo de vida distintos. Release retirada pode sustentar projetos existentes; revogada não executa. Nenhum instalador/terminal ausente é anunciado como disponível.
- [ ] Aula gravada: autorização fresca via acesso já existente, vínculo confirmado e baseline original; conferir ambiente e identidade do candidato. Pro contextual não consulta nem concede desbloqueio de Pro livre.
- [ ] Admin: papel ativo, revisão do rascunho e bloco atuais; prévia de autoria ainda não publicada tem contexto explícito. Não aceitar uma revisão arbitrária do cliente como prova.
- [ ] Sala/assistência: usar transação/autorização existentes, ocorrência, workspace, revisão e lease/epoch atuais. Continuação fora da oficina verifica direito canônico atual.
- [ ] Livre: produto/perfil atual e propriedade do projeto; público: publicação visível/revisão fixada, sem exigir login e sem conceder edição.
- [ ] Resolver distribuição e conectar registry, análise e LSP nos hosts. Cancelamento/expiração/revogação preservam buffers e encerram recursos. LSP/REPL do servidor permanecem isolados e reautorizados; fechar sessão própria continua permitido após perda de acesso.
- [ ] Provas HTTP/domínio/SQL/navegador pertinentes, regressão JS, bundle e revisão independente. Medir carga real depois da integração, sem tratar testes unitários como prova de desempenho.

## Fronteira implementada em 17/10

Política de compatibilidade compartilhada em Members domain/studio/project-policy, com publicação separada de runtime-policy. Hosts são configuração de deploy STUDIO_RUNTIME_HOSTS_JSON: origem segura + release exata, caminho content-addressed derivado; ausência não anuncia executor. Nenhuma release/distribuição de produção foi ativada. Resposta leva catálogo restrito à release, blockIds qualificados e IDs de extensões permitidas, não só as já instaladas. JS v2 segue seus executores existentes.

POST studio-runtime na aula gravada relê OpenLessonStudioService, exige binding confirmado/baseline original e identidade local canônica do perfil/bloco, não grava vínculo e não concede Pro livre/publicação/terminal/instalação. Gateway ganhou rota explícita studio-runtime e a rota studio-context que faltava; ambas JWT ativo e encaminhamento interno. BFF adulto/Kids usa corpo limitado e schema estrito, preserva erros e no-store. Ainda não há conexão do editor/registry nem LSP a este endpoint.

Evidência: Members20/170 l6-runtime-authorization-5.log; Gateway43/210; Shell27 testes na segunda rodada BFF/identity/seed (primeira encontrou tratamento incorreto de InvalidJsonBodyError, corrigido pela classe real do leitor). Review044 encerrado com dois achados corrigidos e nenhuma pendência; revalidação independente21/201. TSC Members3 sessão52419 terminou com exit0; rodada2 tinha apenas readonly catálogo vs resposta wire, agora fronteira serializável usa o schema da resposta para validar/copiar. Não confundir com conclusão de L6.

## Conexão do host em andamento

Factory `studio/lesson-runtime` verifica decisão, ator/contexto/baseline, digest do candidato, revisão real do snapshot, catálogo e distribuição fixados. Não envia código/assets. O controller autoriza antes de carregar o provedor/criar frame e confere novamente o dono após awaits; Parar/troca de projeto impedem início atrasado. Comandos usam a revisão da sessão. Autorizações por documento têm prazo monotônico e respostas antigas não restauram grants após recusa mais recente. Não são credenciais servidoras.

`useLessonRuntime` conecta o baseline confirmado ao editor da aula gravada, com carregamento sob demanda apenas Python, cancelamento e tentativa explícita preservando o seed. Prova React usa hook/factory/apiSend reais e substitui apenas fetch: JS/sem vínculo/offline não solicitam Python; troca de baseline descarta resposta atrasada; retry/unmount preservam fonte e invalidam acesso. Shell3/25 `l6-runtime-lesson-hook-2.log`; factory/controller12/87 `l6-runtime-context-adapter-2.log`. Happy DOM é dependência de desenvolvimento do Shell, na mesma versão já usada pelo Studio/Admin. Não são provas de navegador/desempenho.

Review045 encerrado2/2/0: URL de análise derivada para analysis.html no prefixo aprovado; sinal de autoridade do ambiente encerra imediatamente executor/parser após recusa contextual ou desmontagem. Donos não aceitam eventos/commits tardios e instância revogada não pode reautorizar; retry cria outra preservando o seed. Revalidação independente7/56; Studio23/142; hook4/34 (com BFF6/45).

Navegador Chrome/Edge:4/4 passaram `l6-runtime-lesson-browser-3.log`. Hook, factory, serviço/policy, parser e runtime CPython/Turtle reais; acesso/baseline são fixtures controladas. Prova clássica e Pro: análise AST, desenho, captura400×300, revisão do snapshot nos comandos, REPL somente Pro, recusa encerra ambos frames e preserva fonte. Não qualifica autenticação/gateway/SQL ponta a ponta, nem jogos completos ou carga. Primeira rodada montou fixture React fora do pacote (resolução recusada, fixture movida para Studio/e2e-runtime); segunda tinha duas expectativas incorretas (REPL clássico e print como resultado de expressão), corrigidas sem alterar produto.

TSC Shell44234exit2: dois erros no spy fetch/Bun.preconnect corrigidos; permanecem três lacunas funcionais conhecidas activity/useActivityRunner, ExportDialog web e ZappyPanel, tratadas nos respectivos lotes, sem casts/suppressions. Nova verificação pendente. LSP contextual/outros hosts ainda pendentes.

Bundle: guarda identificou21arquivos no modo Ponte; o pequeno contrato python-learning partilhado passou a integrar o grupo de contratos do editor. Limites inalterados. Repetição Bun teve timeout20s e outra caiu com Illegal instruction em rolldown-binding; não declarar esse teste verde. Medição independente via Vite/Node24 passou limites reais: inicial348745B/111475gzip/8arquivos; rota19, Blocos19/Ponte20/Código18 (`l6-runtime-context-bundle-node.json`). Script independente na cache; gzip Node não deve ser comparado diretamente ao compressor Bun. Prova JS de inicialização/execução no build em andamento.

## Admin — autoria e ensaio, lote em validação

Contexto explícito `authoring` vincula usuário, aula, revisão atual de rascunho, bloco opcional e propósito. Autoria permite testar troca de ambiente antes de salvar; ensaio exige continuidade com o projeto salvo e usa sua curadoria. Serviço Members e rota exata gateway/BFF exigem equipe ativa, recusam suporte e releases não ativas. Sem grants a Pro livre, publicação, terminal ou instalação. `useStudioAuthoringRuntime` conecta o editor inicial e a prévia; fonte editada conserva o ambiente, troca de ator/revisão/ambiente cancela. Factory genérica `contextual-runtime` é compartilhada com wrapper da aula; negatividades045 preservadas.

Evidências: Members9/98 (`l6-authoring-runtime-3.log`), Admin16/120 (`l6-authoring-admin-3.log`), Gateway44/213, regressão Shell6/45 e Studio23/142. Um timeout na criação de modelos ocorreu na rodada concorrente com TSC; isolado2/25 e repetição sem TSC16/120 passaram sem alterar limites. MembersTSC2exit0 antes da projeção de rascunho; AdminTSC1 ainda em curso. ShellTSC44635 confirmou apenas as três lacunas funcionais já conhecidas (atividade, export web, Zappy). JS browser3/3 `l6-runtime-context-js-browser-1.log` passou.

Review046 encontrou duas causas: prévia com seed antigo/revisão nova e autorização usando leitura materializadora/full-content. Correções: sessão da prévia conserva origem e projeto; revisão diferente pausa execução e edição, oferece backup e abertura explícita do rascunho atual. Ensaio guarda revisão junto do workspace e invalida conclusão estrutural quando o projeto muda. Servidor usa `readStudioRuntimeContext`: um SELECT com projeção JSON de revisão/ambiente/curadoria, sem materializar draft nem bloquear curso; não transfere código/assets ao serviço. Teste React2/18 e PostgreSQL com migrações reais1/7 passaram (`l6-authoring-preview-1.log`, `l6-authoring-draft-sql-1.log`). Revisão independente de correções pendente.

Prova de navegador preparada em `e2e-python-editor/authoring-runtime.spec.ts`: StudioEmbed real, autoria/ensaio × Clássico/Pro × Chrome/Edge, serviço/policy reais com armazenamento/ator controlados. Ainda não executada. Não qualifica login/gateway/SQL completo nem desempenho de aula ao vivo.

Review046 fechado2/2/0 após revalidação independente1/23 da prévia/ensaio (inclui remontagem) e consulta projetada sem escritas. Suite SQL completa15/92; regressão HTTP23/138; prévia/ensaio7/59. AdminTSC1exit2: guard de fixture Classic ausente corrigido, demais erros são as três lacunas funcionais conhecidas. Browser rodadas1/2 falharam por fixture/seletores (saída na fonte não é console; Console oculto no Ponte deve ser aberto pelo menu). Após correção, cenário Clássico/autoria Chrome passou1/1 em18,2s; rodada4 com8cenários em curso. Nenhum produto alterado para acomodar seletores.

## Casos negativos obrigatórios

Ator/conta alheios, bloco fechado ou despublicado, vínculo ausente, baseline antiga/adulterada, candidato em outro ambiente, release revogada/ausente, template/extensão/dependência não aprovada, perda de papel, lease expirado/epoch anterior, resposta atrasada e retomada sem direito atual. Recusas não gravam projeto nem mudam vínculo/curadoria. Servidor não executa fontes para verificar autorização.

## Próxima fronteira — salas ao vivo

Atualização após rodada6: Admin navegador8/8 Chrome/Edge passou (`l6-authoring-browser-6.log`), incluindo Pro/Clássico e autoria/ensaio. Rodada4 teve7/8, com Edge Pro/ensaio excedendo5s preparandoPython após edição; isolada5 e completa6 passaram, mas variabilidade de desempenho segue aberta. Não alterar limiares nem considerar isto qualificação p95. Instrumentação agora persiste runtime-timing.json. Console Python vazio passou a orientar `print` (testes existentes3/4). Review046 fechado2/2/0; Members/AdminTSC pós-projeção ainda pendentes.

Reusar `LiveWorkspaceService.existingAccess`/`assertWriter`, sem cópia da política da sala. O contexto fixa workspace, dispositivo, writerEpoch e encontro/bloco quando aberto em aula; continuação da biblioteca segue o direito canônico vigente já resolvido pelo serviço. Autorização deve revalidar revisão persistida, vínculo original do bloco e curadoria servidora, além da revisão SHA do snapshot local. Observar não concede execução nem REPL; ajuda aceita pertence à professora/dispositivo/epoch atuais, com presença e supervisão conferidas.

Não usar o caminho de commit para uma consulta: a transação existente lê projeto completo e renova/persiste metadados. Criar projeção de leitura consistente do workspace + ambiente, binding/curadoria e agregado da sala, sem fontes/assets e sem revisão/lease nova. Conferir fence de exclusão, grant revogado, encontro movido/encerrado e ajuda devolvida. Consulta ao produto para continuação não deve ocorrer segurando locks.

No host, a autoridade dura por ator/workspace/encontro/dispositivo/epoch. Autosave avança revisão persistida sem reiniciar CPython a cada alteração: capturar revisão atual por operação e validar resposta contra aquela captura, nunca contra uma ref que já mudou. Troca de escritor/contexto encerra frames imediatamente; resposta atrasada não restaura permissão. O projeto e o journal local continuam sob o mecanismo existente. BFF adulto/Kids/admin mantém corpo limitado, envelope de recusa e no-store; não abrir rota genérica permissiva. Provas: serviços/HTTP, SQL real, handoff/lease/epoch, cancelamento React, duas pessoas/dispositivos no browser e regressão JavaScript.

## Sala ao vivo — servidor revisado, host em qualificação

### Observação Python (ajuste confirmado na prova integrada)

Browser7 Chrome: continuação Classic e handoff Pro passaram; professora observando Classic não abre blocos/Ponte porque o host só fornecia ambiente ao escritor. A análise sintática é necessária para visualizar o código, mas não deve conceder edit/execute/REPL. Não confiar em IR/cache recebido como substituto da análise.

Implementar autorização de analyze por direito de leitura já existente em LiveWorkspaceService; reusar a projeção consistente e vínculo/curadoria. Escritor válido mantém suas capacidades; observador recebe capacidades vazias e apenas decisão analyze. A política recebe autorização interna explícita para análise de leitura, sem acrescentar permissões fictícias ao catálogo e sem aceitar essa opção no corpo HTTP. Execute/REPL continuam exigindo assertWriter, lease, presença e epoch. Expiração da decisão de leitura:30s, independente da lease de outra pessoa; revogação/fence/contexto continuam verificados. Biblioteca continua apenas para aluno/conta originais.

Host distingue autoria de observação no ciclo de vida. Observador solicita somente analyze e confere workspace/epoch antes/depois; autoria continua na fila de commits. Troca de autoridade aborta o ambiente antigo imediatamente, preserva ordem de aplicação/journal e recria ambiente de observação quando aplicável. Um poll sem mudança não cancela o analisador do observador. Não carregar CPython de execução nem criar iframe de jogo para quem observa. Qualificar blocos reais (>0), código e read-only, passagem e devolução, recusas execute/REPL, fonte preservada; Chrome/Edge e regressão JS. LSP nativo continua etapa distinta.

Contexto live separa identidade/epoch da revisão persistida por operação. `runtimeContext` reusa existingAccess/assertWriter, recusa conta/dispositivo/epoch/revisão/ambiente/bloco alheios, mantém curadoria da baseline original. Continuação consulta produto fora da conexão e relê o snapshot depois. `readRuntimeContext` usa transação read-only/repeatable read, metadados sem fontes/assets, fence de exclusão, encontro explícito pela leitura compacta `loadLiveRoom`; biblioteca mantém política preexistente sem curadoria de aula, apenas para aluno proprietário. Autorização não renova lease nem cria binding, e decisão vence no máximo junto da lease. Pro contextual não desbloqueia criação livre.

Rota exata Members/gateway `POST /members/live/workspaces/:id/runtime` e BFF compartilhado adulto/Kids/professora com schema estrito, limite2MB, no-store, recusa suporte/compressão. `useLiveStudioRuntime`/transport conectados ao LiveBlockWorkspace: enfileira autorização junto dos commits, confere resposta contra revisão capturada, mantém ambiente por fonte/autosave/renovação; mudança de escritor e prazo de lease encerram autoridade sem descartar fonte. Observador ainda não solicita parser/runtime; qualificar renderização dos blocos no browser antes de encerrar host.

Evidências: Members49/301 (`l6-live-runtime-2.log`), SQL6/35 (`l6-live-runtime-sql-4.log`) em schema real completo, Shell15/105 (`l6-live-host-3.log`), Gateway45/214. SQL provou leitura sem esperar FOR UPDATE da gravação e sem devolver mídia/escrever lease. O preparo de fixtures esparsas tentava recriar view de DB migrado com ordem histórica diferente; agora reconhece `drizzle.members_migrations` e deixa o schema real sob autoridade das migrações. Rodadas SQL1/2 falharam nesse preparo; rodada3 encontrou expectativa de defaults legados (projeção omite valores ausentes; continuidade aplica os defaults). Sem alteração da política de produto para satisfazer essas expectativas.

Review0471/1/0 fechado: professora em ajuda ativa podia omitir contexto e obter decisão sem curadoria como biblioteca. Corrigido por exigir dono/aluno/conta original no contexto nulo. Revalidação independente nas3operações, retorno de autoria e biblioteca legítima após acknowledgeReturn, nenhuma escrita nas recusas (`review047-revalidate.ts`). MembersTSC1/2 encontrou somente tipos de fixtures (draft discriminante e lessonId nullable); corrigidos, rodada3 em curso. Ainda faltam TSC Shell/Admin atualizado, navegador duas pessoas e qualificações de desempenho. Não declarar L6 completo.
