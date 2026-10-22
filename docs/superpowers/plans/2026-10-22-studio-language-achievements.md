# Estúdio Completo: conquista por linguagem

**Regra confirmada:** projetos livres JavaScript exigem ao menos um bloco JavaScript conhecido conquistado; projetos livres Python exigem ao menos um bloco Python conhecido conquistado. Vale para Clássico e Pro. Pro também exige o produto Estúdio Completo e a capacidade Pro. A equipe conserva sua prévia autorizada; suporte permanece sem escrita. Não conceder blocos, extensões ou capacidade por causa do posto.

**Arquitetura:** identificar a linguagem pelos catálogos canônicos, nunca pelo prefixo. A união de conquistas atuais e congeladas continua pertencendo a Members. Separar oferta de criação da autorização de operação: esconder uma opção não substitui revalidação no servidor. Python conserva exatamente a homologação da release, o currículo Classic/dependências e as extensões por owner já existentes.

## Auditoria da base a4c98c705

- Python já aplica conquista conhecida em Classic/Pro (`AuthorizeFreeRuntimeService`); código Pro permite uma conquista sem exigir toda a paleta Classic. Instalação Turtle não concede sua extensão: precisa owner conquistado e release aprovada.
- JS não tinha requisito independente por linguagem: `hasPalette` aceita qualquer linguagem, e `FreeStudioAccessService` pulava currículo em `existing-pro/javascript`.
- Kids `resolveStudioProAccess` exige produto/capacidade/perfil, sem conquistas; Adult Pro usa `creative-tools` com a paleta genérica. Builder JS tem caminhos próprios e comandos retomados sem revisão-base no payload.
- `ProjectList`/`NewProjectModal` ofertam JS incondicionalmente. Discovery Python tem `legacyJavaScript: true`; isso descreve o writer existente, não pode ser interpretado como direito de autoria JS.

## Lotes propostos / ownership

1. **Catálogo compartilhado:** helper puro exportado pelo Studio para identificar conquista JS/Python usando `SERVER_BLOCK_CATALOG` e `isPythonCourseBlock`. Testar conhecido, outra linguagem, desconhecido e união. Não importar o catálogo inteiro no client: SSR envia direitos simples.
2. **Members (coordenar ownership):** `free-studio-access.service.ts`, discovery em `authorize-free-runtime.service.ts`, Builder/ports de autorização e testes unit/HTTP. Revalidar JS Pro por identidade, produto, capacidade e conquista. Comandos retomados usam a linguagem da revisão persistida; cleanup não pode ficar bloqueado por perda de direito. Não usar payload arbitrário como prova de linguagem.
3. **Contrato discovery e UI:** Core `authoring-catalog.ts`, Studio `freeProjectOptions`, `ProjectList`, `NewProjectModal` e galeria quando necessário. Direito JS explícito separado do suporte ao writer. Python-only não oferta criar JS nem por handler atrasado. Preservar templates, grants e criação JS para quem possui JS. Não alterar criação de aulas/oficinas/Admin/playground.
4. **SSR e BFF livres:** member-shell `studio-unlocks`, FullStudio, handlers livres Pro/Builder; Community `creative-tools` e rota de dependências; Kids `studio-pro-access`, página Pro e dependências. Centralizar reconhecimento de conquistas, consultar união atual no servidor e falhar fechado em consulta indisponível. Preservar os guards de produto, jornada, perfil, sessão e aprovação já existentes.
5. **Cópias privadas:** importação JSON e remix JS reconsultam `studioFreeOptions` antes de persistir. Não inspecionam o código para exigir cada bloco, nem alteram uploads genéricos ou reprodução pública. O schema exige `canCreateJavaScript`; `legacyJavaScript` continua descrevendo o writer, sem conferir direito.

Não alterar publicação/jogo público, contexto de aula ou oficina, roteiro/pedagogia, reward metadata, dados de alunos ou Workers. A investigação deve distinguir uma operação livre de um build contextual antes de aplicar o gate.

## Provas

- JS-only oferece/autoriza JS e recusa Python; Python-only faz o inverso. Unknown/prefixo sozinho não autoriza nada. Preview autorizado continua completo.
- Uma conquista conhecida + produto + Pro autoriza Pro da linguagem; sem produto, sem Pro, outra audiência/perfil ou suporte continuam negados.
- Classic Python mantém dependências completas; uma conquista Python de núcleo não passa a conceder Turtle.
- Reconsulta no servidor captura alteração de elegibilidade e não depende do botão. União durável preserva conquista depois da remoção do currículo.
- CLI/testes locais leves antes de revisão; sem provider writes, browser, build, TSC pesado ou commit neste lote. Registrar comandos e resultados reais.

## Estado

O experimento Pro sem conquista foi abandonado antes de implantação, restaurando somente seus 14 arquivos à base a4c98c705. Diff e RED foram preservados privadamente. Regra Python mantida verificada: 72 testes / 454 asserções passaram, incluindo caso explícito de uma conquista Python + produto + Pro e negativas.

O lote de catálogo compartilhado, schema, SSR, criação/importação/remix, dependências Pro e Zappy foi implementado e congelado para revisão local. `hasStudioLanguageAchievement` usa os catálogos canônicos; o client recebe booleanos. A criação JS reconsulta o servidor sem cache, e a UI preserva o escopo/cancelamento durante a espera. Python-only inicia o modal em Python, sem opção JS. A autorização de Builder/serviços Members pertence ao lote coordenado separado; este registro não afirma implantação ou aceite remoto.

Provas locais em 22/10/2026, seriais, sem browser/serviços:

- Studio `bun test src/core/courseLanguageAccess.test.ts src/core/freeProjectOptions.test.ts src/components/projects/NewProjectModal.test.tsx src/components/projects/ImportButton.test.tsx src/projects/ProjectList.creationScope.test.tsx`: 24 testes/133 asserções; a suite isolada de persistência executou mais 22 testes/108 asserções. Cobre recusa, revogação durante leitura, zero gravações e sucesso autorizado.
- Member-shell `bun test tests/studio-javascript-creation.test.ts tests/studio-unlocks.test.ts tests/studio-tier.test.ts tests/studio-python-remix.test.ts tests/studio-zappy.test.ts tests/studio-zappy-python.test.ts`: 155 testes/703 asserções. O contrato antigo que dispensava currículo no Pro foi substituído por leitura obrigatória; indisponível retorna 503 e conquista conhecida permite o positivo.
- Kids `bun test tests/studio-pro-access.test.ts tests/studio-python-remix.test.tsx`: 23 testes/126 asserções. Inclui remix JS revogado, nenhum persist/navegação, e remixes Python Classic/Pro existentes.
- Studio `bun test src/projects/KitGallery.offer.test.tsx`: 5 testes/14 asserções. Adult `bun test tests/showcase-card-no-runtime.test.tsx`: 2 testes/26 asserções, preservando reprodução pública sem carregar runtime na listagem.
- Biome: 37 arquivos próprios, exit 0. TSC completo, revisão integrada e implantação continuam com o coordenador; não foram executados por este lote.

Revisão posterior da importação: dois testes causais com fixtures Python Classic/Pro v3 falharam (nenhuma chamada ao validador), comprovando discriminação incorreta pelo writer JS v2 e precheck de Pro exigindo `files`. `ImportButton` passou a usar a versão suportada; `looksLikeStudioProject` reconhece `tree` apenas no discriminante Python Pro v3, igual a `copyDocument`. Sem ampliar o parser ou ignorar sua validação. Recorte final `ImportButton.test.tsx`: 11 testes/71 asserções verdes, incluindo documento antigo forjando linguagem Python; Biome dos três arquivos exit 0. O lote passa a ter 38 arquivos próprios de código/testes.

Revisão independente identificou que a página Pro é compartilhada por JS/Python: exigir JS antes de ler o documento negava Python-only. O resolver agora exige a escolha explícita `language`: a página usa `any`, o endpoint de dependências usa `javascript`. A abertura local Pro recebe autorização após carregar o documento real, antes de montar o editor: no Estúdio livre, JS reconsulta o servidor; Python conserva a autoridade própria `useFreeStudioRuntime`. Nenhuma query ou nome de arquivo define a linguagem. A liberação de abertura é idempotente, inclusive recusa/cancelamento. Focos finais: Kids resolver 11 testes/34 asserções, loader 7 testes/27 asserções, Biome dos sete arquivos exit 0. Total de ownership: 41 arquivos de código/testes; hosts contextuais sem `freeRuntime` permanecem sem esse gate.

O review também identificou que a importação livre Python não tinha preflight antes da persistência. O FullStudio agora sempre entrega uma porta de importação pelo hook existente, inclusive quando a oferta está desabilitada: nessa situação a porta recusa. O hook reconsulta opções e reutiliza `authorizePythonPrivateCopy`; não acrescenta inspeção de blocos da fonte. Recusa, revogação e perfil obsoleto impedem a chamada de persistência e preservam o arquivo. Genéricos Admin/aula sem a porta conservam seu contexto. Recorte final ImportButton: 12 testes/82 asserções. Private-copy + wrapper de hook isolado: 16 testes/61 asserções; subprocesso encerrou com exit 0. Biome dos sete arquivos e `git diff --check`: exit 0. Total de ownership: 42 arquivos de código/testes.

O review final separou a autorização de importação da prontidão de execução:
`authorizePythonImport` vincula o documento refinado por hash canônico à decisão
atual de edição. Assim, rascunhos válidos e requirements em edição podem ser
importados sem fabricar lock ou resolver o rascunho. Remix/exemplos continuam
usando o snapshot executável; Run continua recusando aqueles estados até o
aluno concluí-los. Duas negativas causais foram preservadas antes da correção.

Verificação integrada do coordenador em 22/10:

- Members: 52 testes/470 asserções, quatro arquivos unit/HTTP, sem falhas.
- Member-shell: 200 testes/874 asserções, nove arquivos, sem falhas. Após a
  última correção da importação, recorte próprio de remix/hook: 18/77, sem falhas.
- Studio: 27 testes/150 asserções, cinco arquivos, sem falhas; o wrapper executou
  22 casos/108 asserções em processo isolado. Não somar wrapper e casos internos
  como provas independentes da mesma execução.
- PostgreSQL 18 dedicado e migrations reais: primeira execução 13/1 por uma
  conta de teste previamente marcada como excluída. O novo teste passou a ter
  conta própria; repetição 14/0/85. O container próprio foi parado ao final.
- Biome dos 61 arquivos de código/testes: exit 0. Review independente de
  UI/servidor e da última correção de importação sem novos achados confirmados.
- TSC completo do Studio com heap de 2 GiB encerrou por falta de heap; não há
  resultado de tipagem completa deste lote. Browser hospedado e CI do novo
  commit também não estão comprovados por esses testes locais.

A abertura de trabalho JavaScript Classic existente permanece no comportamento
anterior; este lote não transforma a execução local em uma nova barreira de
conquistas. Criação/cópias novas e operações Pro sensíveis usam as regras acima.
