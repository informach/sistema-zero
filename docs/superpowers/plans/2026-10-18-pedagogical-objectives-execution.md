# Execução dos objetivos pedagógicos por parte

Situação em 20/10/2026: contratos, autoria privada por parte e fluxo produtivo de salvar/executar/publicar estão implementados; a prova nativa r7 fechou8/8cenários Chrome/Edge. Cinco manifestos piloto, dez bindings e quatorze snapshots foram atualizados, mas os objetivos dos pilotos ainda são estruturais. A família de direção por comportamento e a revisão curricular mais ampla continuam abertas. Esses conteúdos não foram ativados remotamente por esta frente.

O próximo recorte aprovado é Farol Dia1/parte andar: quatro direções, liberdade de cor/arte/posição/magnitude e recusa de zero, sentido oposto ou movimento automático já existente. O desenho usa quatro contextos, com observação sem tecla e gesto no próprio contexto; nenhuma igualdade de posição entre execuções. Sua implementação será isolada da composição Python atual. Tipos/imagem/HTTP/SQL e integração desse novo recorte ainda não foram executados.

Base isolada histórica: `6f4efe553`, branch `feat/pedagogical-objectives`, worktree `C:/Users/tocha/projects/sistema-zero-pedagogy`. O fechamento posterior no worktree integrado está registrado ao final deste documento. Os recibos de um lote não qualificam automaticamente uma composição posterior.

O responsável aprovou o desenho e os lotes em 18/10/2026. A proposta e o P0 revisados permanecem no worktree principal em `docs/superpowers/plans/2026-10-18-pedagogical-objectives/`. Não modificar fontes do worktree Python nem reservar a migration0137 da jornada.

## Lotes

- [x] L1: contrato e resolvedor puros, diagnóstico agregado, allowlists públicas e provas de privacidade/contexto.
- [x] Review L1, correções, testes focados e tipagem antes de L2.
- [x] L2: comandos com CAS, snapshots imutáveis, limites agregados, hashes/migração operacional e import/export.
- [x] Review L2 e correções antes de L3, no recorte registrado abaixo.
- [x] L3: UI por parte, Testar agora e identidade estável da cópia de trabalho; salvar/executar/publicar comprovados no r7.
- [x] Review L3 e correções de reconciliação, editor e publicação, com os limites dos respectivos recibos.
- [ ] L4: pilotos Cadê/Farol — manifestos e exemplos estruturais feitos; direção real, equivalências e contraexemplos comportamentais ainda pendentes.
- [ ] Review completo, correções e integração pelo responsável; sem commit/push nesta frente.

## Preparação

`bun install --frozen-lockfile` concluiu em 75,58 s, com 2.837 pacotes, Bun 1.3.11 (af24e281). Nenhum lockfile ou manifesto foi alterado. `createRequire` no Node 24 confirmou que Members, Admin e Studio resolvem Core no próprio worktree.

Uma sondagem inicial de resolução com Bun e paths relativos disparou assert interno do Bun (`cannot resolve DirInfo for non-absolute path`). Isso não é falha do projeto nem invalida a instalação. A sondagem correta usou createRequire com caminho absoluto no Node, sem junction de node_modules de outro worktree.

## L1 em andamento

Fontes novas isoladas:

- `core/studio/authoring-project.ts`: extrai o guard existente, preservando os formatos de autoria JavaScript v2 e documentos v3.
- `core/learning/studio-project-examples.ts`: registro v1, limites, referências próprias, leitura segura e resolução por parte, com ausência distinta de erro.
- `core/learning/objective-entry-report.ts`: diagnóstico agregado de obrigatórios; não concede progresso nem conclui a parte.
- Mapeadores de completion e conteúdo Studio: allowlists, incluindo campos aninhados conhecidos.

RED de privacidade executado antes da correção: `bun test packages/core/tests/project-objectives.test.ts packages/members/tests/unit/studio-public-content.test.ts`, 9 passaram / 2 falharam / 21 asserts em 397 ms. O log `.cache/pedagogical-p0/privacy-red-1.log` reproduz a exposição de campos privados pelos spreads antigos.

As correções tiveram GREEN focado e Core/Members TSC concluídos após as janelas coordenadas com o responsável. Nenhum build ou SQL foi executado nesta frente.

L1 não liga persistência nem publica exemplos. O campo global antigo permanece temporariamente enquanto o lote2 implementa a conversão e remove escritores/leitores; nenhum fallback novo foi adicionado ao resolvedor canônico.

## Review independente L1 e remediação

O review encontrou duas fronteiras de entrada que precisam ser fechadas antes do GREEN:

- Um snapshot JavaScript v2 com `kind` desconhecido passava pelo guard de autoria. O guard agora preserva Classic v2 legítimo e exige árvore/modelo conhecido para Pro; não converte o formato.
- Os escritores antigos de bloco não têm o protocolo por parte. Receber o novo campo explicitamente precisa produzir erro, em vez de persistir um registro parcial ou removê-lo na normalização. Uma edição comum preserva o registro anterior lido sob lock/CAS e recusa ambiente incompatível; a importação normal continua recusando o campo até o lote 2 instalar o mapeamento de chaves.

O gate puro não percorre nem serializa projetos sem registro. Quando há registro, copia e valida o agregado uma vez por bloco; verificar suas associações com partes não repete a cópia de snapshots.

JavaScript v2 sem runtime e documento v3 com release fixada não têm equivalência implícita. A validação dos exemplos deve usar a continuidade canônica do Studio, a mesma adotada pelo ensaio autorizado. O uso do registro não muda o formato padrão do editor.

Os novos testes cobrem identidade própria, duas versões do mesmo projeto, referências ausentes, erro versus ausência, limites UTF-8, contextos de parte/ambiente, getters, allowlists aninhadas e preservação dos escritores antigos.

O rereview independente das remediações não confirmou novos achados no recorte L1. A qualificação focada seguinte concluiu:

- Contrato/privacidade: 42 passaram, 0 falharam, 109 assertions, 1,194 s.
- HTTP em memória (objetivos e importação): 19 passaram, 0 falharam, 107 assertions, 3,67 s. Inclui acesso legítimo sem fonte privada, outra conta sem acesso e importação omitindo um registro já existente.
- Biome final: 23 arquivos, nenhum diagnóstico, sem alteração adicional.
- Nenhum lockfile ou manifesto de dependência alterado.

O recibo `.cache/pedagogical-p0/l1-focused-receipt.json` guarda comandos, logs e SHA-256 do checkpoint focado dos 23 arquivos TypeScript. Os testes HTTP usam o aplicativo real com portas em memória; não qualificam persistência PostgreSQL, migração, UI ou protocolo de importação novo.

Na janela de tipagem seguinte, Core TSC encontrou dois acessos a uma fixture `unknown` no teste de cópia destacada. O teste passou a manter uma referência local tipada ao projeto original, sem casts, e o Core TSC repetido concluiu com exit 0 (`core-tsc-2.log`).

Members TSC inicialmente concluiu com exit 2 e um diagnóstico no teste do escritor: o retorno do helper preservador era declarado somente como `T`, enquanto o matcher compara também o campo privado opcional que ele acrescenta. A assinatura passou a explicitar `T & { projectExamples?: unknown }`, sem cast ou mudança de runtime. O diagnóstico integral permanece em `members-tsc-1.log`.

Após essa correção, os dois arquivos afetados passaram novamente: 18 testes, 62 assertions, nenhuma falha. Biome dos 23 arquivos continuou sem diagnóstico. Members TSC repetido concluiu com **exit 0 em 277,90 s**, sem saída de diagnóstico. Uma amostra leve do processo mostrou compilação ativa (196,39 s de CPU acumulados aos 225,68 s), sem concorrência de processos pesados nesta frente. A duração, isoladamente, não atribui custo ao novo contrato.

O checkpoint final está em `.cache/pedagogical-p0/l1-final-receipt.json`, com hashes renovados e os resultados anteriores preservados. Os compiladores bem-sucedidos não emitiram texto; `Tee-Object` não criou arquivos nessa condição, portanto logs explícitos de zero bytes foram criados após a conclusão e esse fato foi registrado. `.cache/pedagogical-p0/l1-qualified-source/` preserva uma cópia dos 23 arquivos qualificados antes das edições do lote 2; o patch dos arquivos já rastreados também está guardado. Nenhum commit, merge, push ou alteração de dependência foi feito.

## Preparação concreta do lote 2

O comando novo entra na união existente de alterações do rascunho, sob `expectedRevision` e `operationId`; não cria outro sistema de CAS. Seus alvos são `blockId`, `sectionId` e papel (`entry` ou `solution`). As ações são guardar snapshot com `exampleId` novo, associar snapshot existente do mesmo registro e remover associação. Alterar snapshot publicado pelo mesmo ID é recusado. Retentativa da mesma operação usa a idempotência já existente do repositório.

O resolvedor do comando recebe o documento canônico atual, verifica que a parte ainda existe e usa aquele workspace, preserva as demais associações e remove somente snapshots sem referências no documento atual. Histórico e desfazer continuam sendo documentos completos independentes. Toda alteração passa pelo teto agregado antes da gravação. Mover partes continua transmitindo apenas a estrutura.

O reducer otimista do Admin e o reducer persistido devem compartilhar essa semântica. Preservar exemplos apenas no repositório enquanto o `block` local substitui o conteúdo inteiro faria os exemplos desaparecerem da tela até recarregar, pois a confirmação do PATCH retorna somente revisão/data. Uma alteração comum de bloco deve preservar a referência privada local; o payload comum não retransmite o registro. A validação limitada ocorre na fronteira de gravação, evitando copiar/validar 2 MiB repetidamente por seção ou por reducer local.

A fila do Admin não pode agrupar todos os comandos novos apenas por `type`: comandos de partes e papéis diferentes seriam perdidos. A primeira implementação manterá os comandos por parte como operações distintas, preservando também a ordem entre guardar e reutilizar um exemplo. O editor mantém uma cópia de trabalho estável; o ID imutável do snapshot não se torna chave React nem identidade do projeto a cada gravação.

Na importação, o registro presente é a fonte da verdade; vazio é diferente de ausente. Ausência no modo de preservar conserva exemplos compatíveis; substituir remove o que não veio. A exportação precisa calcular chaves de partes antes de projetar as associações, e a importação precisa convertê-las para os IDs efetivos antes do gate final. Limites devem medir o envelope real de importação, sem usar o validador final de manifesto para salvar rascunhos incompletos.

O inventário de escritores inclui também `cloneCourseTree`: copiar o conteúdo bruto enquanto as partes ganham novos IDs deixaria associações órfãs. A clonagem precisa remapear essas associações explicitamente no mesmo protocolo, preservando os snapshots privados e sem usar IDs internos do projeto como identidade de exemplo.

Hashes de progresso dos blocos devem excluir o novo registro privado. Fingerprints de concorrência/publicação continuam incluindo-o. A conversão do campo global antigo precisa tratar publicado, rascunho e desfazer sob locks e registrar os hashes anteriores/posteriores. Não há DDL reservado para esta frente e não haverá fallback permanente para o campo global depois da conversão.

Também há uma fronteira de desempenho a qualificar antes de liberar o registro: `DrizzleCourseRepository.findLessonWithContent` atende várias rotas do aluno e hoje carrega o JSON inteiro do bloco, inclusive autoria privada removida depois pela view. Uma projeção pública no banco deve evitar o transporte/deserialização dos snapshots sem retirar a leitura completa de `publishedSnapshot` e do Admin. O inventário de callers precisa vir antes da alteração; mudar o default sem distinguir essas leituras perderia gabaritos ao restaurar uma aula. O gate agregado também deve interromper a leitura assim que o orçamento da aula estiver ultrapassado, sem acumular cópias de outros snapshots já desnecessários para recusar a escrita.

Leituras privadas confirmadas nesse inventário: `LessonAdminService.getContent`, `publishedSnapshot`, `LearningService.assertPublishable` (inspeciona os exemplos com os critérios), operações de migração e `scripts/rebase-lesson-draft-revisions.ts`. A gravação publicada de `LearningService.saveStructure` também precisa do gate de associações no repositório, sob lock, para que trocar um workspace ou excluir uma parte não deixe referências inválidas. O caminho `draft.change` sozinho não cobre esse escritor.

## Gate pedagógico dos pilotos: direção não é qualquer mudança

O contrato atual de execução captura valor inicial e final para `behavior`; `changed` prova apenas diferença. Uma comparação com valor absoluto fixa indevidamente a posição do gabarito, e `script` recebe uma fotografia posterior. Nenhuma dessas opções deve ser apresentada como prova geral de subir/descer com liberdade de velocidade e posição.

Antes de converter um objetivo direcional, o desenho precisa observar o efeito relativo em janela controlada do cenário e dos inputs, com tratamento de bounce, reset, wrap e tempo. A convenção pertence ao motor: em coordenadas de tela JavaScript, Y diminuindo sobe; no Turtle a convenção do mundo é outra. `y -= velocidadePositiva` pode cumprir a mesma intenção que somar uma velocidade negativa. Magnitudes diferentes continuam válidas quando produzem o efeito pedido. Ausência de movimento, movimento contrário e zero devem falhar somente quando contradizem esse objetivo.

A matriz do piloto precisa conter essas alternativas e contraexemplos. Se o harness não consegue distinguir o efeito com confiança, o objetivo continua **não qualificado para correção comportamental** até a lacuna ser resolvida. Não mascarar a falta de observação com `usesBlock`, não inventar igualdade de aparência/velocidade e não converter os 364 critérios automaticamente.

## Lote 2: checkpoint de fonte para review — ainda não qualificado

As edições abaixo estão no checkout pedagógico isolado. **Nenhum teste, Biome, TSC, build, SQL, navegador ou comando de migração deste lote foi executado.** A evidência GREEN anterior pertence ao snapshot L1 preservado; não se estende automaticamente ao L2.

- Comando `studio-example` no protocolo de rascunho existente: guardar snapshot novo, reutilizar referência local e limpar papel. O reducer local e o persistido compartilham a mesma função. A fila preserva ordem e captura bytes separados do projeto mutável do editor; operação inválida não entra na fila.
- Estrutura não transmite projetos. Reorder preserva referências; remoção/retargeting poda somente o documento resultante. Restore parcial não adivinha associação por título; publicado e desfazer conservam documentos independentes. O escritor publicado de estrutura recusa associações inválidas sob lock, em vez de apagá-las sem preview.
- Importação remapeia sectionKey para IDs reais antes da validação. Ausente/preservar conserva exemplos compatíveis; presente completo ou vazio é autoritativo; substituir/ausente remove. Reutilizar ID com bytes diferentes é recusado. Preview nomeia associações substituídas/removidas.
- Projeção portátil é única para exportação e preflight de rascunho incompleto. Conta o envelope real UTF-8 de importação, incluindo modo, CAS e operação, com teto de 2 MiB. O arquivo-fonte local tem orçamento distinto de 16 MiB para formatação; testes preparados incluem JSON válido formatado acima do corte antigo. A exportação usa forma compacta se a indentação exceder o leitor, sem aumentar o teto de rede.
- Leitura pública do Estúdio é uma allowlist na origem PostgreSQL, com fronteiras aninhadas explícitas para galeria/vitrine. `findLessonWithContent` é público por padrão; Admin, publicação, snapshot/restauração e operações de migração/revisão pedem conteúdo privado explicitamente. A leitura de workspace de oficina também usa a projeção pública. O mapper de aplicação continua como defesa adicional.
- Hash pedagógico exclui o registro privado; hashes de concorrência/publicação o incluem. Clonagem remapeia associações para IDs das partes clonadas. Excluir a última associação permite uma troca explícita para galeria sem aprisionar um registro vazio; uma edição comum do mesmo Estúdio continua preservando o registro, inclusive vazio.
- Conversor explícito de arquivo v5 global → v5/registro v1, sem fallback no importador normal. O planejador operacional trata publicado, rascunho e desfazer, mantém `contentRevision`, distingue baseline reconhecida de conflito real e gera IDs próprios estáveis por conteúdo/contexto. A ferramenta operacional exige backup durável em diretório novo antes de aplicar, preserva o ledger e renova a revisão do rascunho para que clientes antigos recarreguem. Gabaritos em blocos arquivados exigem revisão individual; a ferramenta não inventa suas associações históricas. **Não houve inventário ou aplicação em banco.**
- O guard de publicação passou a resolver a solução da própria parte, sem ler o global. O relatório agregado separa inicial real, checkpoint opcional e solução, mantendo o inicial canônico como baseline de ideias. Pré-requisitos já prontos não viram erros; todos os obrigatórios estruturalmente prontos geram diagnóstico de autoria, sem concluir vídeo/quiz/entrega. Execução ainda pendente produz diagnóstico inconclusivo. Solução estrutural obrigatória falsa e solução ausente para execução obrigatória continuam recusadas. O relatório tem suporte de domínio; sua apresentação destacada e os testes canceláveis pertencem ao L3.

Foram preparados testes causais de comandos, captura de retry, importação presente/ausente/vazia, conversor, migração/hash/progresso, restore sem associação inventada e diagnóstico agregado. As provas PostgreSQL preparadas exercitam o ledger/CAS real e medem bytes retornados pela expressão SQL com um registro privado de aproximadamente 900 kB; não são microbenchmarks e ainda não foram executadas.

### Pontos explícitos para review e próximo lote

1. Conferir tipos/normalização após novos campos opacos recusados, política de extras na publicação, fronteira getter/JSON, limites agregados/rede e semântica do mapa seção→key→ID.
2. Conferir migração: correspondência exata de hashes antes/depois, revisão do draft, documento de desfazer, backup durável, recusa de conflito/orfandade/tamanho e idempotência. Nenhum DDL foi criado ou reservado.
3. Qualificar SQL público versus leitura privada e os callers, sem substituir a referência canônica do ensaio por um checkpoint. A implementação evita carregar os snapshots no driver nas rotas comuns.
4. UI por parte, remoção do editor global, Testar agora com revisão/contexto capturados e descarte de resultado obsoleto, preview de restore e piloto Cadê/Farol permanecem pendentes. O branch intermediário não é liberável antes do cutover e dos gates.
5. A clonagem já possuía um problema independente: recria IDs de anexos sem remapear todas as referências de arquivo/ebook. O fake antigo também não clona estruturas; ele não qualifica o protocolo novo. Essas limitações precisam de decisão/review próprio antes de declarar a clonagem integralmente pronta; não foram ocultadas como resultados positivos.

Próxima janela, depois do review de fonte e autorização de CPU: Biome dos arquivos alterados, testes focados Core/Studio/Members/Admin, TSC em sequência e provas SQL em banco descartável. Cada falha precisa de recibo e correção antes de avançar à UI. Os 37 manifestos/roteiros/geradores continuam sem alteração.

### Primeiro review L2 e remediações escritas (ainda sem gates)

O review independente confirmou quatro fronteiras: leitura de IR atrasado com `bridgeCodeAhead`, captura mutável de comandos reutilizar/limpar, ausência da política de catálogo/curadoria/dependências nos exemplos v3 e falta de orçamento agregado em escritores publicados legados. O responsável também apontou que `file.sync()` sozinho não sustentava a alegação de backup durável.

As correções escritas para rereview são:

- Captura de todos os comandos `studio-example`, com regressões que alteram alvo/papel/ID no objeto do caller depois de enqueue. Não clonar comandos comuns a cada tecla.
- Solução ainda sincronizando gera erro transitório de autoria. Inicial/checkpoint ficam inconclusivos; baseline inicial ainda sincronizando não serve como prova de ideia nova. Não registrar falso true/false a partir do IR antigo.
- Inicial e exemplos passam por um helper único de configuração, com a mesma `StudioAuthoringPolicy.assert` e curadoria do bloco. Sem grants novos e sem converter JS v2. Teste preparado usa política real/inércia de catálogo, extensão não aprovada e requirements incompatível de um exemplo Python v3.
- Gate publicado central com consulta pequena de presença antes de carregar JSON. Cobertura de create/update de blocos, metadados de aula, estrutura, clone e alteração do slug do curso; este último confere também draft/previous. A política é propagada pelos adapters e transações do composition root. Provas PostgreSQL preparadas verificam rollback de alteração individual válida que estouraria `initial + examples`, sucesso de alteração que cabe e recusa de crescimento em bloco não Studio.
- Apply operacional explicitamente restrito a Linux com filesystem que aceite fsync de diretório. Antes de qualquer update há sincronização do diretório pai, arquivo, entrada do backup e recibo preparado, com verificação de SHA-256. Ambientes incompatíveis falham fechado; dry-run permanece possível no Windows. Recibo committed só é gravado depois da confirmação da transação. Resultado sem confirmação após tentativa de escrita é indeterminado; falha de recibo depois do commit confirmado é distinta de rollback. Dry-run informa hashes dos três documentos para confrontar o alvo preparado na retomada. Testes de filesystem Linux e recusa em outras plataformas foram preparados, não executados.

A fixture de objetivos do aluno passou ao registro válido, e o teste de preservação de progresso usa o protocolo canônico de draft/publicação. O fake de publicação deixou de invocar o escritor legado para reproduzir callbacks de quiz; dispara somente a invalidação de quiz pertinente, como o adapter SQL. Isso não qualifica atomicidade nem idempotência SQL em memória.

O primeiro snapshot de review continua preservado em `.cache/pedagogical-p0/l2-review-1/receipt.json`. As remediações exigem novo rereview e gates; nenhuma aprovação L2 foi alegada. A qualificação do filesystem Linux e do script operacional em banco descartável permanece pendente, sem aplicação ou inventário remoto.

### Rereview L2 e primeira qualificação focada

O rereview independente do snapshot `l2-review-2` conferiu as quatro remediações e o protocolo de backup, sem novo bloqueio concreto no recorte de fonte. Essa conclusão não era prova de execução. A janela seguinte executou os gates focados, registrados em `.cache/pedagogical-p0/l2-focused-receipt.json`, com hashes dos 61 arquivos do checkpoint.

Resultado: Biome de 60 arquivos TypeScript limpo; Core 62/62, Studio 35/35, Members unitários 24 aprovados e um caso Linux ignorado nesta máquina Windows, HTTP 20/20 e Admin 13/13. São 154 testes aprovados e um ignorado, sem falhas finais. O caso ignorado não qualifica durabilidade em Linux.

O primeiro HTTP deixou recibo vermelho com 18 aprovações e duas falhas. Uma prova causal isolada mostrou que a fixture de prática, agora corretamente dona do bloco na estrutura, omitia `purpose: experiment`: o contrato existente interpretava o Estúdio como entrega fora da parte final. Corrigiu-se somente a configuração da fixture; o contrato de produção e as asserções de preservação de progresso/publicação permaneceram. O segundo HTTP passou integralmente. Os logs vermelhos e a prova causal foram preservados.

Depois do rereview houve formatação/importação ordenada pelo Biome, três optional chains equivalentes e essa correção de fixture; nenhuma mudança semântica de produção. Permanecem pendentes TSC completo dos quatro pacotes afetados, prova PostgreSQL de CAS/projeção/orçamento e ensaio operacional Linux com falha de confirmação/crash. A etapa L3 continua necessária antes de liberar esta frente: o branch intermediário ainda contém a UI global antiga.

### Gates de tipos L2 e correções de contrato tipado

A sequência completa passou: Core TSC (5,05 s na última execução), Studio TSC (156,72 s), Members TSC (115,90 s na última execução) e Admin TSC (148,54 s), todos com exit 0 e os configs reais dos pacotes, usando Node 24.22 e o compilador local. Studio manteve o teto de heap de 8 GiB já definido pelo pacote. Nenhuma checagem foi removida e nenhuma dependência mudou.

O primeiro Core TSC encontrou a promessa incorreta de que o conversor devolvia o conteúdo genérico original, embora removesse `solutionProject` e adicionasse o registro. O contrato de saída agora mapeia as propriedades do conteúdo preservando uniões e assinaturas de índice, exclui o campo aposentado e explicita o registro privado. O primeiro Members TSC também mostrou uma inferência incompleta na fixture de importação; a fixture agora valida o projeto com o guard real e conserva a referência local do registro com `satisfies`, sem casts para silenciar o compilador. Os diagnósticos vermelhos estão preservados.

A repetição afetada de conversor, planejador da migração e HTTP de importação passou 18/18 após esses ajustes. Biome voltou a conferir os 60 arquivos sem avisos nem alterações. Os callers de conversão estão em Core e Members; não há caller desse contrato no Studio. Os recibos distinguem a checagem Studio anterior ao ajuste exclusivamente tipado, o Core/Members que o verificaram e o Admin posterior.

As provas PostgreSQL/Linux/CLI operacional permanecem pendentes; a CPU foi liberada para a frente principal antes de iniciar qualquer uma delas. Um plano de janela e um proxy de falhas de protocolo PostgreSQL somente de QA foram preparados em cache, ainda sem execução. O proxy recusa banco fora de `sz_aulas_qa_pedagogy_*` e não registra SQL, credenciais ou dados de linhas.

### PostgreSQL real e helper Linux — escopos qualificados e limites

A segunda execução do banco descartável passou os dois casos novos: 2 aprovações, 22 asserções e 35 casos fora do filtro, em 12,22 s incluindo o upgrade histórico real. O caso de CAS/ledger levou 1,078 s; o caso da projeção/limite agregado levou 2,187 s. Banco preservado: `sz_aulas_qa_pedagogy_l2_1792372304020_882a0ef2`. Recibo/log imutáveis desse resultado: `.cache/pedagogical-p0/l2-postgres-green-2.receipt.json` e `l2-postgres-green-2.log`.

A primeira execução teve timeout de 30 s em um matcher de rejeição. A prova mínima separou o mecanismo: o mesmo adapter conclui save/replay/rejeições/leitura com await/catch; dentro de Bun Test, o matcher `.rejects.toThrow()` deixava a transação em `idle in transaction / ClientRead / begin`, sem lock wait, enquanto o heartbeat continuava. A captura explícita passou no mesmo Bun Test e confirmou classe/código de conflito, classe/código/mensagem de reuso estrangeiro, revisão e documento finais intactos. Somente as três asserções do caso SQL foram substituídas por captura explícita, com verificações mais precisas. Produção e timeout de 30 s ficaram iguais. Essa mudança de teste ainda precisa entrar no próximo Biome/TSC/recibo de fonte.

Houve uma falha na gestão do artefato: o runner original usava um caminho fixo e sobrescreveu o raw log vermelho no segundo run. O resultado integral continua no histórico da tool/session `87014`; `.cache/pedagogical-p0/l2-postgres-red-1.transcript.log` é explicitamente uma transcrição resumida desse resultado, não o raw log original. As reproduções mínimas vermelhas e a observação SQL foram preservadas em arquivos separados. O runner foi corrigido para criar paths imutáveis por banco/run, mantendo apenas um ponteiro para a execução mais recente.

O helper de backup foi executado de verdade em Bun 1.3.11, imagem `oven/bun@sha256:0733e50325078969732ebe3b15ce4c4be5082f18c4ac1a0f0ca4839c2e4e42a7`, container próprio `sz-pedagogy-l2-fsync-2` e volume próprio `sz-pedagogy-l2-durability`. Resultado: um teste Linux aprovado, o caso exclusivo de plataforma não Linux ignorado, cinco asserções, 2,58 s. O teste conferiu fsync de diretórios/arquivo, hash exato, recusa de sobrescrita e de caminho fora do diretório. O primeiro comando Docker não tinha `bun` explícito, resolveu o utilitário Unix `test` e executou zero testes; seu recibo foi marcado inválido para qualificação, apesar do exit 0. Só `fsync-2` conta como evidência de Linux.

Isso não qualifica perda física de energia em todo provedor nem o script operacional. CLI real, dry-run/apply/retomada e falhas antes/depois do COMMIT continuam pendentes. O próximo ambiente usará dependências Linux do mesmo lock frozen em volume separado, sem presumir portabilidade das junctions Windows e sem alterar node_modules/manifests/lock do host.

### CLI real: RED/GREEN de retomada e falhas controladas

A CLI foi executada em Linux com o mesmo Bun 1.3.11 pinado e uma instalação frozen própria de 536 pacotes (16 s), sem reutilizar junctions Windows. SHA-256 do lock original e do lock Linux antes/depois: `fc4d058709b2fe5bef7f7c9f8707df8983746eea16008353c4d67b16a26745a7`. Kernel observado: Linux 6.6.87.2-microsoft-standard-WSL2 x86_64. Os fontes do host foram montados somente para leitura; código/dependências de execução ficaram no volume próprio `sz-pedagogy-l2-linux-workspace`, e os backups no volume próprio `sz-pedagogy-l2-durability`.

Cada cenário de falha criou um banco `sz_aulas_qa_pedagogy_op_*` próprio, com uma única aula alvo, para não confundir o COMMIT de outra fixture com o alvo da prova. O seed contém três snapshots de autoria diferentes com o mesmo Project.id, progresso/objetivos já verificados, conclusão, entrega atual e anterior do aluno e operação de ledger. Um observador independente lê os hashes dos documentos e o estado protegido antes/depois; o proxy apenas encaminha o protocolo PostgreSQL real e controla a interrupção, sem substituir driver, adapter ou resposta do servidor.

A primeira CLI dry-run produziu o RED esperado: `pending` não mostrava os hashes de draft/previous exigidos na instrução de retomada, embora já os calculasse. A correção de produção acrescentou somente `observed` ao retorno `pending`, como aprovado. O GREEN comparou todos os hashes/revisão observados com a leitura independente e verificou que nenhuma escrita ocorreu. Sentinelas de fonte privada, IDs do aluno/conta e credenciais não aparecem nos diagnósticos.

Onze probes operacionais ficaram GREEN:

- Dry-run pending, apply real e dry-run current idempotente.
- Processo interrompido após backup/prepared e antes da primeira gravação: documento de autoria anterior intacto, sem recibo committed; dry-run de recuperação e apply em diretório novo passaram.
- Processo interrompido com updates executados, antes do COMMIT: estado anterior intacto após encerramento da sessão; dry-run de recuperação e apply em diretório novo passaram.
- COMMIT enviado ao PostgreSQL; proxy recebeu CommandComplete COMMIT e ReadyForQuery, suprimiu a resposta ao cliente e fechou a conexão. A CLI retornou exit 1, `indeterminate`, estágio `writing`, sem alegar rollback. A leitura independente encontrou exatamente o alvo dos três documentos no prepared; o dry-run posterior retornou current com os mesmos hashes.

Em todos os cenários, progresso, conclusão, entrega atual/anterior, ledger, estrutura e identidade/revisão pedagógica ficaram intactos. Backup/prepared foram conferidos por bytes e SHA-256, e uma nova leitura dos arquivos originais após a retomada confirmou que nenhum foi sobrescrito. O apply bem-sucedido conferiu também committed e renovou a revisão do draft. A prova não representa desligamento físico do host/armazenamento nem universaliza a durabilidade para qualquer filesystem.

Duas provas adicionais passaram: a CLI completa no Windows recusou apply sem criar o diretório nem modificar dados; e o clone real Kids→Adult remapeou IDs de aula/bloco/parte e associações privadas, preservando os bytes dos exemplos e a origem, com projeção pública sem registro/IDs privados. Este clone era de aula sem anexos; não qualifica o defeito de remapeamento de anexos preexistente.

Members TSC voltou a passar após os dois últimos deltas (captura explícita dos erros no teste SQL e `observed` em pending): exit 0, 120,57 s. Biome desses arquivos: limpo, sem alterações. Nenhum processo pesado continuou aberto ao liberar o host. O próximo gate é rereview das diferenças finais e das provas; L3 e os pilotos continuam pendentes.

### Fechamento L2 e L3A

O rereview final L2 conferiu os 82 hashes de fontes/QA/recibos e a causalidade das provas, sem novo bloqueio concreto no escopo declarado. O responsável aceitou L2 com seus limites explícitos; isso não torna o branch intermediário liberável enquanto o editor global antigo e os pilotos permanecem.

L3A implementou o diagnóstico Testar agora por parte com inicial canônico, checkpoint apenas diagnóstico e solução privada. Ausência, erro, pendência e sincronização inconclusiva não se tornam falso; todos os objetivos já verdadeiros no inicial geram aviso agregado. Captura de contexto/revisão e AbortController descartam resultados obsoletos mesmo quando o transporte ignora cancelamento. O recibo `l3a-final.receipt.json` conserva 35 testes/144 asserções, Biome limpo e Admin TSC exit 0, com rereview independente de 21 hashes. Isso não acrescenta correção de Python nem qualifica a UI nativa.

### L3B: motor, owner/store e manager; ligação React ainda bloqueada

O motor conserva uma operação enviada com ID/corpo/revisão congelados e limita o coalescing a saves consecutivos ainda não enviados do mesmo bloco/parte/papel. Writer local confirma a cópia integral por epoch e identidade das operações. Restore arquiva e confirma tombstone antes de ler servidor; erro não vira saved. Handoff conserva resultado remoto desconhecido e bloqueia callbacks obsoletos, com captura integral separada da confirmação de disco.

Owner exige Web Locks antes de load. Store v2 faz fence não cooperativo dos writers v1, arquiva recoveries legadas sem apagar primário e valida estrutura antes do upgrade. Promessas de leitura/escrita/archive terminam somente em eventos terminais de transação, não em request success/error. As provas nativas de produção passaram seis cenários em Chrome e seis em Edge, com contextos e origem QA próprios. Os recibos distinguem a primeira falha de observação do harness e os reruns corrigidos; não são prova do SDK/Admin integrado.

O manager persistente conserva um alvo ativo e apenas o pedido futuro mais recente. Após capture/seal pode retirar recurso sem perder bytes diante de quota; falha anterior conserva o recurso. Rereviews fecharam perda de recovery não adotada, falso sucesso de flush interrompido em todos os caminhos observados e corrida ABA na aquisição. Checkpoint `l3b-manager-checkpoint.receipt.json`: 26 hashes, 59 testes/283 asserções, Admin TSC exit 0 em 13,572 s. Essas provas usam Session/Core reais com portas de memória; não qualificam React/SDK/IDB/HTTP em conjunto.

O recorte React novo ainda está desconectado do layout/rota/hook. Seu teste reproduziu dois gates incorretos de escrita após conflito (3 pass/2 fail); a correção assina Session e respeita canEdit sem desmontar o recurso, depois passou 5 testes/36 asserções. O hook v1 permanece ativo até um corte completo, sem fallback permanente.

Antes desse corte, há bloqueadores explícitos: retomada para corrigir formulário após captura falha anterior ao seal; controles de recuperação fora da região inert; scope de autor/saída autenticada; captura de resultados Vimeo/voz que concluam durante handoff; SDKs reais, buffers de formulários e contagem de recursos. A proposta v7/v7.1 está em review. A primeira versão supunha incorretamente timeout da API; fonte confirmou que não há, e a premissa foi retirada. O RED `l3b-transport-retirement-red.log` prova que a continuação local de flush ainda espera ACK retido mesmo depois da retirada local. Não é aprovado aumentar timeout nem chamar abort de rollback.

Nenhum dos 37 manifestos, roteiros ou geradores foi alterado. A matriz de pilotos Cadê/Farol existe apenas em cache, com alternativas válidas/contraexemplos e lacunas reais do harness. UI por parte, corte do gabarito global, gates L3C e pilotos continuam obrigatórios antes de integrar/liberar a frente.

### L3B: primeiro sublote de transporte cancelável

V7.1 recebeu review independente sem bloqueio novo de desenho. A implementação cria AbortController por tentativa e interrompe a continuação local por signal, mantendo observada a resposta tardia. Handoff aposenta geração antes de abortar e conserva A como resultado desconhecido com ID/corpo/revisão originais. A abertura que já tentava replay também pode interromper sua espera local sem apagar recovery não adotada. A factory propaga os sinais ao fetch; GET recebe opção signal e o handler não adota corpo nem redireciona um 401 cancelado. Calls sem signal preservam o contrato existente.

O RED na barreira terminal local passou de 0/1 para 1/6 asserções. Um teste complementar interrompe replay retido durante abertura e confirma A integral/canEdit false. As regressões leves passaram 75 testes/352 asserções em 861 ms, em 12 arquivos; Biome de 11 arquivos limpo após formatação. Fonte/evidências foram copiadas com 20 hashes para `l3b-transport-review-1792380728174/receipt.json`, aguardando rereview e Admin TSC.

Precisão do escopo: cancelamento retira transporte/continuação local, não garante encerrar handler/SQL remoto. Ledger/CAS continua resolvendo A. Os testes de API usam respostas controladas e não substituem HTTP/navegador reais. O primeiro probe que aguardava flush indefinidamente foi encerrado apenas no PID próprio verificado; seu log sem resultado não conta como teste funcional. O RED final registra o estado antes de liberar ACK e só depois faz a asserção, sem sleeps ou aumento de timeout. Resume anterior ao seal, escopo de ator, produtores externos e corte da UI ainda não foram implementados neste sublote.

O rereview encontrou um caminho restante: interromper abertura enquanto persist(first) aguardava disco, antes de haver controller, ainda deixava iniciar PATCH depois. O RED observou um envio indevido; a correção marca a abertura interrompida e aposenta a geração inclusive antes do envio. Flush confere pós-persist e send recusa o opening interrompido. O GREEN observou zero envios e A preservada; a prova adicional no manager só abre B depois de confirmar a cópia de A. A leitura do corpo no teste API agora usa barreira bodyStarted, sem depender de microtask presumida.

Rereview final conferiu 25/25 hashes sem novo achado concreto. Regressões: 77 testes/360 asserções em 715 ms. Admin TSC do delta: exit 0, log vazio, 34,996 s. Recibo final com fontes/evidências imutáveis: `l3b-transport-review-1792381150702/final.receipt.json`. Esse fechamento qualifica o sublote de transporte por fonte, modelo e tipos; mantém explicitamente pendentes HTTP/COMMIT nativo, resume pré-seal, ator e o restante do corte L3B.

### Retomar a correção antes de seal

Session/factory agora oferecem capability resume somente para handoff atual não selado. A retomada espera apenas o running local já interrompido, conserva A/C e erros, cria outra geração, invalida a capability antiga e reaproveita o autosave canônico de um segundo. Finally de flush confere identidade da promise. O wrapper owned só libera seu cache depois da retomada concluir. Pós-seal continua irreversível: confirmar, retirar e abrir owner novo.

O RED inicial 0/3 mostra ausência da API, não é apresentado como reprodução causal de defeito existente. Os casos before/after-commit preservam o envelope de A e a captura válida C; recovery A não adotada continua recusando C. As fixtures de transporte agora devolvem a promise deferred diretamente e os casos de ACK tardio aguardam essa porta após liberar a resposta: flush local interrompido já não é uma barreira de resposta remota. Rereview do recorte conferiu 11/11 hashes sem achado novo, com 81 testes/386 asserções em 1,068 s; tipos ainda pendentes naquele checkpoint.

Manager/React serializam preparar sementes → concluir resume → nova geração de montagem → exigir registro de captura dessa geração. Cleanup antigo não retira registro novo. Alvo C que chega durante preparação continua futuro; owner/recursos de A permanecem até a transição segura. O formulário não remonta, enquanto o Resource genérico remonta intencionalmente com máximo de um ativo. O link principal de retorno aciona a intervenção; Ctrl/meta não alteram a aba original. Falha de sementes conserva owner/recurso e permite retry.

O rereview de `l3b-resume-manager-review-1792381814927/receipt.json` conferiu 15/15 hashes sem achado novo. São 85 testes/420 asserções em 737 ms. Os cenários do manager foram adicionados depois da implementação em rascunho, portanto não são alegados como RED causal anterior. Resource é componente genérico, não prova do SDK; navegação Next real, sementes/latecallbacks reais, controles de recuperação, ator e cutover permanecem pendentes. O TSC combinado desse recorte ainda não foi executado.

Em fonte desconectada, a região de recuperação já foi separada da edição inert por portal com container fixo no frame do owner. A prova React de sete casos confere que controles continuam alcançáveis no conflito e ficam suspensos durante handoff; não qualifica browser/Next reais. O hook/rota/layout antigos continuam sem alteração até fechar captura integral e escopo autenticado.

No checkpoint anterior ficaram preparados `prepare-native-transport.ts`, `native-transport-entry.ts` e `run-native-transport.mjs`. Na janela posterior os três casos passaram em Chrome e em Edge: GET/PATCH com 401 retido e corpo retido, solicitação efetivamente recebida, AbortError local e response-close antes de writableEnded. Servidor/origem/contextos QA próprios foram fechados. O gate usa API produtiva e fetch real, sem atribuir cancelamento a rollback ou COMMIT. Admin TSC combinado terminou exit 0, log vazio, 18,073 s. Rereview conferiu 36 hashes (23 fontes e 13 evidências), bundle e cópias de build, sem novo achado concreto; recibo `l3b-resume-final-review-1792382215995/receipt.json`. Continua sendo fechamento parcial: não qualifica Session/factory/SDK/Next/IDB integrados, ator, produtores nem cutover.

### Captura do produtor Vimeo

O registry agora conserva uma cópia completa do resultado antes de chamar a apresentação; o provisional após TUS também é recuperável enquanto o Vimeo transcodifica. Identidade monotônica e worker por tentativa impedem confusão após substituir/remover/recriar bloco. A captura recusa File ainda não hospedado sem abortar transferência. Quando pode capturar, aborta o request real de status, invalida gerações e impede um primeiro poll ainda não iniciado; 401/corpo tardios não redirecionam nem mudam a cópia. Retomada explícita consulta só status do vídeo hospedado, sem novo ticket/TUS. Exceção síncrona/rejeição assíncrona da apresentação não interrompe o produtor; fica observada e visível.

Novos testes: 10 casos/54 asserções; regressões do wrapper/vídeo/API: 10 casos/22 asserções, além do subprocesso isolado. RED inicial 0/4: três casos registram API de captura ausente, o quarto reproduz reciclagem de requestId; testes adicionais pós-implementação não são apresentados como causais anteriores. Dois runs combinados falharam porque o fixture legado criava origem about:blank, incompatível com a asserção de redirect /login. Os logs vermelhos foram preservados e apenas a origem HTTP do teste foi corrigida. Biome limpo; Admin TSC exit 0, log vazio, 18,170 s. Rereview independente conferiu 13/13 hashes sem novo bloqueio no recorte.

Este fechamento é do produtor encapsulado pelo registry, não de todos os callers diretos do hook. Incorporação explícita no editor/plannedVideos, registro da captura no host, Session/SDK/Next/IDB, TUS/Vimeo nativo e ator permanecem gates separados. O desenho de renovação segura de sessão foi separado por orientação do root: remover refresh silencioso do owner sem alternativa imporia login a cada access token (~15 minutos). Nenhuma fonte Auth global foi alterada e o cutover segue bloqueado até o desenho/validação dessa experiência.

O sublote seguinte introduz receipt por entrega, ainda sem conectá-lo ao callback do editor. Confirmação é vinculada ao objeto exato (provisional e final compartilham videoId/job, mas têm entregas diferentes); confirmação velha/removida/pós-freeze não consome nova entrega. O File hospedado continua reconhecido, enquanto a captura devolve só resultados ainda não incorporados. Não inferir incorporação pela ausência de exceção: Session.enqueue agora retorna o boolean real de aceitação. O teste com subscriber síncrono mostra block aplicado e planned-videos recusado pelo handoff; o resultado real do produtor permanece pendente e a capability recompõe duração/legendas/planejamento.

São 45 testes/237 asserções em 694 ms, Biome limpo e snapshot `l3b-video-receipt-review-2/receipt.json`, aguardando rereview/tipos do delta. RED da aceitação: 0/1 por retorno undefined; os demais testes de receipt foram adicionados após fonte e não são apresentados como causais anteriores. Receipt sozinho não protege autoria posterior: substituições editoriais precisam aposentar o job. Import atual apenas chama load depois de aplicar e mantém jobs; sua intervenção/supersessão é gate antes da ligação com o editor. A barreira de formulário React também continua explícita: setter aceito não implica closure de captura já renderizada. O desenho v9 propõe um único working buffer, sem segundo banco nem serialização por tecla, para fechar essa fronteira antes do cutover.

O rereview desse snapshot encontrou receipt antigo que voltava a confirmar após freeze→resume sem entrega nova. RED observou true indevido; epoch em freeze e retomada manteve a recusa no GREEN. Prova complementar reproduziu rejeição antiga de apresentação pintando erro na geração nova; continuadores failed/succeeded também passaram a conferir epoch, job e tentativa. Resultado final: 47 testes/243 asserções em 580 ms, Biome limpo, Admin TSC exit 0/log vazio/15,507 s. Rereview final conferiu 15/15 hashes sem novo achado; `l3b-video-receipt-review-3/receipt.json`. Isso fecha receipt/aceitação no recorte, preservando todos os gates de integração acima.

O experimento Auth usou apenas servidor loopback com cookie QA HttpOnly e contextos próprios Chrome/Edge, sem conta/token real. Ambos reproduziram sobrescrita indevida A→loginB→cookieA tardio (RED esperado), e observaram B preservado nos quatro casos de cancelamento/serialização/fechamento de aba. O run final `native-auth-cookie-1792384703235/receipt.json` não usa o response-close observado no servidor para liberar loginB: é observação posterior. Isso investiga primitivas do desenho, sem qualificar Next/gateway/Auth/HTTP2/legacy; não há fonte Auth global alterada. O documento de inventário separado explicita que o wrapper de interrupção LOCAL da Session não pode ser tomado como barreira terminal de cookies.

### V9: buffer canônico isolado dos formulários

O slot cria instância por abertura e renew aposenta setters anteriores preservando bytes próprios. Snapshot readonly é publicado antes dos subscribers; a captura lê os dados aceitos mesmo antes do commit DOM. Atualizador reentrante/autoridade alterada não substitui intenção posterior. Objetos externos são copiados antes de congelar; ramos já próprios são compartilhados, evitando percorrer o projeto inteiro por tecla.

Review encontrou Symbol ignorado pelo percurso e getters executáveis na cópia. O RED preservado reproduziu três falhas (7pass/3fail/123ms). A remediação lê apenas descritores de dados, recusa Symbol/accessors/campos ocultos sem executar getters e revalida o slot após a cópia. WeakSet privado reconhece somente cópias próprias; shallow-frozen externo continua sendo copiado com seus filhos. Os testes incluem abertura B durante Proxy de A, getter aninhado e payload retido por widget.

Primeiro TSC encontrou dois erros locais (15,672s): descritor possivelmente ausente e mapped type readonly aplicado duas vezes. Guard explícito e wrapper tipado que usa o mesmo copiador corrigiram ambos sem casts/deps. Resultado final: 13 testes/56 asserções (288ms), Biome3 limpo, Admin TSC exit0/log vazio/8,327s. Rereview final conferiu11/11 hashes sem novo achado; recibo `l3b-form-buffer-review-2/receipt.json` e cópias preservadas.

Esse fechamento qualifica o componente isolado e a observação React anterior ao commit. O editor atual ainda usa blockForm/attForm em useState; custo com BlockForm/SDK grandes, entrega real de produtores, captura de recursos, Next/IDB/duas páginas/ator e Auth/cutover continuam pendentes. O plano v10 em cache descreve a adaptação sem manter dois estados canônicos ou recorrer a seed quando o recurso não pode ser capturado.

### V10A: modelo puro dos formulários reais

Tipos/defaults/construtor/validações de bloco/quiz/materiais agora têm uma única implementação em `lib/lesson-block-form.ts`. Factory/default da atividade estão em `lib/learning-form-defaults.ts`; LearningBuilder reexporta os mesmos valores para os consumidores existentes. Editor e builders importam o modelo sem manter cópias. Essa extração removeu cerca de 400 linhas de dados/construção do cliente e não conectou o buffer/provider nem alterou Auth.

As regressões existentes passaram: autoria/conformidade/material 24/24, 157 asserções/2,51 s; LearningBuilder 18/18, 62 asserções/3,86 s. Admin TSC exit0/log vazio/11,955 s; Biome 9 arquivos exit0 com um warning de `<img>` preexistente, markup inalterado. Não há RED causal alegado para mover lógica já existente. Rereview conferiu 18/18 hashes e comparou buildContent/helpers/validateBlock integralmente com HEAD (iguais após normalização LF/export da validação); demais trechos/defaults e migração dos consumidores também conferidos. Não há ciclo/React no modelo. Recibo `l3b-form-model-review-1/receipt.json`; fontes/evidências preservadas.

O desenho v10 também explicitou um bloqueio real antes de cutover: import pode fazer COMMIT e perder ACK. O resultado desconhecido precisa manter envelope durável/IDs/corpo/contexto e produtores suspensos, sem novo inspect/ID nem retomada automática de A. O backend atual recalcula preview e só reconhece replay na revisão vigente; retry universal não está qualificado. Esse contrato de intervenção/storage/reconciliação continua sublote pendente, separado da extração qualificada. Merge de vídeo deve partir do snapshot atual do formulário, preservando poster ainda não emitido à Session, e não copiar conteúdo antigo do domínio.

### V10B: candidato de conteúdo do formulário real

O adapter isolado `lesson-form-content.ts` usa a abertura exata de BlockForm e o construtor canônico. Exige recurso explícito vinculado àquela abertura, recusa seed fallback e gabarito global inferido, copia campos só na serialização e não valida publicação nem chama seal. Os recursos Studio ainda são passados por referência: o owner futuro é responsável por snapshot estável/preparado e transação Session; esse módulo não prova SDK/resourceEpoch/autorização.

Um RED causal reproduziu capturador retido de formulário fechado serializando conteúdo antigo após reabrir o mesmo bloco: 5 testes passaram e 1 falhou. A consulta isCurrent, que verifica identidade sem conceder escrita, e os guards antes/depois do adapter fecharam a corrida. A abertura atual permanece legível para captura explícita com gestos normais suspensos.

Gates finais: 44 testes/233 asserções em 4,43 s, incluindo buffer/React/autoria/conformidade/materiais; Biome 3 arquivos exit0; Admin TSC exit0/log vazio/10,927 s. Review independente conferiu 7 hashes sem novo achado; os dois artefatos de tipos foram acrescentados depois, sem mudança de fonte. Recibo `l3b-form-content-review-1/receipt.json`. Não há caller produtivo desse adapter; Vimeo/receipt/Session ainda não foram ligados ao formulário, e SDK/Next/IDB/ator/Auth/cutover seguem pendentes.

### V10C: apresentação normal de Vimeo sobre buffer/Session atuais (review pendente)

O helper isolado atualiza o snapshot vigente do formulário antes de construir conteúdo, revalida relevância por receipt/epoch/job e exige boolean real para os dois comandos. planned-videos parte da leitura fresca; outro formulário não recebe os dados. Não há caller produtivo nem integração de captura/resume/SDK/Next/IDB/ator/Auth. Foco7/34 em781ms e regressões12/29 em2,08s incluem subprocessos sem dupla contagem. O primeiro diagnóstico falhou somente por cleanup repetindo beginHandoff; guardou-se a capability do próprio harness, sem alterar produção/expectativas/timeout. O primeiro TSC encontrou duas expectativas com ID opcional, corrigidas usando o ID capturado do job já validado, sem casts. Admin TSC final exit0/log vazio/11,552s, Biome limpo. Snapshot l3b-video-form-review-2 conserva os negativos e o delta. Design/fonte ainda aguardam o reviewer após prioridade direta do root, portanto este checkpoint não está qualificado por review independente.

### V10D0: observação do slot de formulários (isolado, review pendente)

Por autorização explícita do root, o slot passou a expor getCurrent/subscribe estáveis para ser a única fonte de abertura na UI futura. Active muda antes dos subscribers; open/close/renew reentrantes não transferem autoridade de A para B nem reativam setters do mesmo target após renew. O consumidor React isolado usa useSyncExternalStore para slot e campos, sem estado espelho. Nenhuma UI produtiva/caller/Auth/C foi alterada.

RED0/6 por API ausente é contrato novo, sem alegação de defeito funcional prévio. GREEN27/118 em2,70s; foco pós-Biome7/42 em278ms; Biome3exit0. Admin TSC D0exit0/log vazio/16,821s. Recibo l3b-form-slot-review-2 preserva fontes e evidências; o reviewer está na fila após a prioridade de proveniência do root. Formulário de anexos real, produtor File e restantes gates de cutover continuam pendentes.

Review D0: conferidos12/12 hashes, sem regressão concreta no primitivo; publicação da identidade ocorre antes dos subscribers e open/close/renew reentrantes conservam os fences. Essa revisão leu fonte/evidências e não executou gates. Limites preservados: não qualifica formulário produtivo, SDK/Next/Auth/import/cutover. Fonte D0 permanece igual ao snapshot2.

Rereview V10C snapshot3 concluído:23/23 hashes conferidos, P2 pós-segundo enqueue fechado por leitura fresca dos efeitos relevantes sem reenfileirar/igualdade editorial. RED8/5 e GREEN13/60 + controle de poster/instructions/regressões12/29 conferidos por fonte/logs. Nenhum novo bloqueio concreto nesse delta. Admin TSC atual da remediação permanece pendente de janela; o tipo histórico não é gate atual. Recibo review-result.json separado conserva o snapshot já lido. Caller/SDK/Auth/import/cutover continuam fora do escopo.

### D1A: controller de arquivo isolado (review/tipos pendentes)

Após o desenho D1 ter as três fronteiras fechadas em review, o controller puro foi escrito sem conectar FileUploader/Auth/UI. Conserva File ou resultado hospedado, receipt/epoch, barreira síncrona de captura, reapresentação sem reupload e tentativa nova para retry de transporte. Cancel/replace aposentam identidade antes de abortar. Drain espera promises dos ports, com reserva antes de executar adapter; não declara rollback remoto. UploadedFile é importado só como tipo.

Primeiro draft foi seguido de testes9/58: sem alegação de RED anterior à feature. Review próprio produziu RED real do cancel antigo sobrescrevendo B em observer de abort (0/1/38ms) e do drain antes do registro de work (0/1/50ms); corrigidos, logs preservados. Ausência de API drain (0/1/45ms) é contrato novo, distinguido dos defeitos. Final12/66/40ms e Biome2exit0. Snapshot l3b-file-controller-review-1 com15hashes está congelado para leitura independente; Admin TSC atual também pendente. Ports são deferred; XHR/rede real/progresso/límites e os três consumidores continuam gates, assim como SDK/Next/IDB/ator/Auth/import/cutover. Nenhum serviço/processo pesado foi iniciado.

D1A review encontrou reserva tardia antes de pending: RED0/1/46ms confirmou drain prematuro. Reserva foi movida antes da publicação em select/resume e a closure revalida início, encerrando sem rede se a seleção congelou/sumiu. File permanece retomável. Final14/76/48ms e Biome2exit0. Rereview2 conferiu19/19 hashes, sem novo achado; reviewer não executou gates. Recibo l3b-file-controller-review-2 e review-result separado. Admin TSC atual C+D1A continua pendente. Inventário leve posterior observou1293MiB disponíveis e nenhum provável tsc/build/profile Node/Bun pelo filtro; não se presumiu host livre nem se encerraram serviços de terceiros para forçar o gate.

### Integração produtiva e pilotos, 19/10/2026

A base desta worktree foi conciliada com 3190d9e08 por fast-forward sem conflito. O checkpoint `.cache/pedagogical-p0/base-3190-checkpoint` conserva patch e cópia dos 119 arquivos de trabalho anteriores; todos os hashes permaneceram iguais. D1A foi estacionado fora de src/tests em `.cache/pedagogical-p0/parked-d1a`, por orientação do root: anexos e cutover amplo não são dependências deste piloto.

C+D0 passaram a ter caller produtivo em LessonEditor: slot canônico do formulário, setter vinculado à abertura, captura que lê o buffer atual e receiveVideo usando o helper com receipt/estado fresco. Widgets mutáveis recebem cópias pontuais; branches grandes inalterados não são clonados por campo escalar. O primeiro TSC pós-base encontrou cinco fronteiras readonly de widgets, corrigidas sem casts; esse diagnóstico foi preservado. O TSC atual do lote inteiro ainda está pendente da janela Hub.

O consumidor principal `section-project-examples.tsx` foi ligado à autoria da parte. Cria/edita entrada e solução, salva snapshots por comando canônico com UUID próprio, reutiliza/remove vínculos, conserva initial e uma working copy estável. Captura do SDK é registrada no fluxo real de revisar/publicar. A aceitação é boolean explícito; erro mantém o editor. O campo global antigo deixou a UI. A área de exemplo fica fora do fieldset desabilitado de autoria para permitir leitura/exportação/fechamento explícito em conflito. Autoridade de captura continua sendo papel + Session.canEdit; busy não é tratada como perda de autorização para terminar um flush.

Foco atual: 18/18, 136 asserts, 5,73s (`pedagogical-consumer-focused-4.log`). Inclui dez cenários do editor completo e captura da solução antes de revisar/publicar durante busy. Fronteiras HTTP/storage/SDK desse fixture são controladas: não é prova de Next/SDK nativo/Auth/IDB/COMMIT. Os negativos anteriores do cenário novo (rótulo Definir avanço e ausência do callback no consumidor novo) foram preservados; não são apresentados como RED anterior a uma feature ainda inexistente. Review independente atual está pendente porque o reviewer implementa Hub/Gateway por atribuição do root.

Os geradores de Cadê e Farol foram executados e atualizaram cinco manifestos com dez bindings de partes e quatorze snapshots locais aos blocos. Farol tem estados transitórios distintos: movimento sem borda; coleta sem memória; memória sem aviso; senão com então vazio. IR, Blockly e código vêm da mesma factory. O primeiro agregado (35pass/36fail) detectou IDs de exemplo escritos como apelidos; corrigidos nos geradores para UUIDs estáveis independentes de Project.id. Chaves portáveis continuam apenas nas partes. Negativo preservado em `pilots-focused-1.log`.

Atual final dos pilotos: 71/71, 1.124 asserts, 2,61s; 37/37 manifestos válidos/zero avisos; 37 roteiros/203clipes válidos; vocabulário7/7/67asserts. Os cinco roteiros e propostas receberam notas de equipe alinhadas aos manifestos, preservando falas gravadas e âncoras. ESPEC-MANIFESTO e Diretrizes passaram a descrever registro por parte e liberdade coerente. Não há afirmação de gravação/importação remota/ensaio infantil.

Os objetivos dos pilotos continuam estruturais nesta etapa. Há alternativas válidas de cor e velocidades positivas 0,5/2/8/25 na matriz; a família direcional por observação real ainda falta e zero/oposto NÃO são declarados cobertos por usesBlock. Não foram convertidos 364 checks. O rótulo de soma em Cadê A2 foi corrigido para o que a regra realmente confere. Isso altera completion e, no contrato atual, a revisão de uma parte ainda não concluída; marcos concluídos continuam preservados. Nenhum hash global foi alterado para esconder o delta e nenhum conteúdo remoto foi aplicado.

Checkpoint atual consolidado: Admin TSC pós3190 encerrou exit0/log0/15,192s; não é reaproveitamento do gate anterior à conciliação. A fonte compilada ficou estável durante o processo. Snapshot `.cache/pedagogical-p0/productive-consumer-pilots-review-1/receipt.json` discrimina40fontes/conteúdos e11evidências, separando dependências L1/L2/L3A já qualificadas. Review independente deste novo consumidor ainda pendente.

A prova leve `pilots-revision-proof-1.json` executou contra a base3190 e o fingerprint real do Members: os cinco blocos preservam o mesmo fingerprint público e as identidades de blocos/partes; os envelopes de importação reais medem184922–826346bytes, abaixo de2MiB. Único delta de completion é o label de CadêA2, confirmado sem alteração semântica da regra; não foi alterado o hash global. Essa prova não substitui importação em DB nem ensaio de aluno.


### Fechamento do consumidor e prova nativa, 19/10/2026

O campo global StudioSolutionField e seu estado de formulário foram removidos. A autoria usa somente os exemplos privados por parte; conteúdo legado com solutionProject exige o conversor explícito, sem fallback silencioso. Os focados do consumidor/limpeza passaram (42 testes/334 asserções, sem contar novamente subprocessos) e o Admin TSC pós-conciliação encerrou com exit0/log vazio. O review independente verificou 62 hashes e encontrou uma falha real de reconciliação: após aceitar a versão do servidor com os mesmos IDs, um callback do SDK antigo ainda podia salvar a cópia local. O RED reproduziu essa sobrescrita; geração síncrona de intervenção e remount apenas nessa intervenção a impediram. GREEN11/103, Admin TSC exit0/log vazio/143,987s, rereview sem novo achado. O draftRevision de cada autosave não vira chave React.

Na cadeia nativa r3 (Next/Turbopack, SDK, Members, Gateway e PostgreSQL reais), abrir e salvar o exemplo Python funcionou, mas renovar a autorização após autosave desmontou o Monaco. A correção preserva o mesmo PythonClassicWorkspace e o editor de fonte enquanto retira imediatamente o Blockly sem autorização corrente; nenhuma permissão/paleta antiga é guardada. O RED controlado observou node desconectado; GREEN3/22 e regressões15/208, Biome limpo e Studio TSC completo exit0/log vazio/137,559s. A distribuição de runtime é D, fixada por SHA; sua memória/desempenho continuam não qualificados.

A repetição nativa r4 manteve o mesmo script e confirmou, no Chrome, os dois primeiros cenários: exemplo salvo no registro correto; código, Project.id da working copy e node Monaco preservados quando revisão e autorização mudaram. A execução seguinte ficou bloqueada. O trace demonstrou que o Next de QA não recebeu STUDIO_PYTHON_FRAME_ORIGINS e sua CSP recusou o iframe aprovado. O helper produtivo já existe e não foi alterado. A repetição r5 está preparada somente com a origem retornada pelo probe validado e com abertura do Console pelo menu real; nenhuma política ampla ou bypass foi adicionado.

r1/r2 preservam falhas de fixture/harness (modo inválido; ausência do gesto Salvar); r3 preserva o defeito produtivo de remount; r4 preserva a omissão de configuração QA. Nenhum desses runs qualifica execução Python/publicação/Edge. Logs, traces, bancos próprios e fontes dos scripts foram mantidos, e cada execução restaurou os bytes originais de next.config.ts e encerrou seus serviços. A prova nativa final e o review do delta do SDK ainda precisam encerrar antes da incorporação. Família direcional por observação real continua pendente; os pilotos estruturais não a substituem.


O review do SDK encontrou seleção incorreta de README/configuração na recuperação do modo Blocos: activeFile controlado voltava ao entrypoint porque só aceitava .py. RED0/1 mostrou README.txt esperado/main.py recebido. O caminho agora aceita outros tipos apenas quando a recuperação por fonte está realmente exibida; com blocos autorizados, a seleção continua limitada aos arquivos Python e nenhum Monaco oculto é montado. GREEN4/27, regressões15/208, Biome limpo. A revisão independente da Jornada leu a versão corrigida sem novo achado; o TSC específico atualizado está em curso.

r5, já com a origem CSP correta, chegou a Programa concluído, mas a espera do harness pelo rótulo literal Executar falhou: autorun troca esse mesmo controle público para Reiniciar. O gesto passou a aceitar os dois estados reais. r6 confirmou três cenários reais Chrome, inclusive o código editado produzindo stdout esperado e a continuidade do Monaco durante renovação de revisão/lease. Publicação202 preservou no PostgreSQL o inicial, a fonte exata e o Project.id da working copy, mas desmontou o editor. A causa era publish→load→status loading→Spinner no lugar da estrutura.

A publicação agora usa o LessonDraft canônico retornado pelo próprio ACK. A confirmação captura a geração do owner, a revisão e o documento esperado antes do wire; resposta de owner/revisão antiga ou aula incorreta não substitui trabalho atual. Alteração concorrente mantém fila/bytes locais e mostra conflito explícito; nenhuma resposta obsoleta vira sucesso. A revisão aprovada precisa renovar a autorização corrente do SDK, preservando sua working copy. Não há cache de permissão nem alteração Auth/BFF.

RED DOM4 reproduziu node.isConnected=false após publicação; os três runs anteriores tinham uma fixture sem purpose experiment e foram preservados como falhas de preparação, não como prova do remount. O GREEN do editor completo é12/120. A pedido do review root, portas retidas exercitaram C em send, C aguardando persistência e C sem resposta: CAS legítimo recusa R1 depois da publicação; transporte desconhecido permanece pendente/erro e repete o mesmo comando até o conflito definitivo. Persistência retida revelou um wire novo indevido após conflito já conhecido (RED2pass/1fail,1envio vs0); fence pós-persist o impede sem perder C. GREEN38/204 e regressões24/117; Admin TSC atual exit0/log0/8,612s com quatro SHAs preservados. Studio TSC atual e r7 nativo Chrome/Edge ainda precisam concluir.


Fechamento nativo r7:8/8 cenários Chrome/Edge com Next/Turbopack, SDK, Members, Gateway, PostgreSQL e runtime Python D reais. Ambos salvaram a solução privada, conservaram o mesmo node Monaco, código e Project.id da working copy durante autosave/renovação de revisão, executaram o código editado com stdout esperado e publicaram202 sem perder inicial/fonte/working copy/editor. A autorização200 da revisão canônica publicada também foi observada. Zero pageerrors; cinco hashes produtivos antes/depois iguais. Fontes/scripts, screenshots, traces e banco próprio foram preservados. next.config.ts restaurado byte-a-byte; todos os serviços próprios encerrados e portas47861–47865 livres.

Studio TSC atualizado: a primeira execução encontrou apenas dois acessos a files possivelmente ausente no fixture union classic|pro. Guard explícito do kind real corrigiu o teste sem casts nem enfraquecer expectativas. Wrapper isolado voltou a passar; formatter ajustou CRLF/guard. Studio TSC final exit0/log vazio/134,567s, quatro SHAs preservados, TS5.9.3/Node24. Admin TSC atual permanece exit0/log vazio/8,612s após o fence de publicação. Esses gates não qualificam a correção BYOB/memória do worktree Python principal, que é uma frente separada.

O inventário de incorporação separa138 caminhos do lote coeso (53 contrato/servidor,58 Admin+dependências/testes,23 pilotos/geradores/documentos,4 SDK) dos10 arquivos de owner/provider/IDB sem caller produtivo e do D1A estacionado em cache. Os53 caminhos de contrato/servidor conferem, byte-a-byte por SHA, com os snapshots já qualificados L2/L3A. O pacote atual ainda passa por review final e não foi commitado/mesclado/publicado por esta frente. Não encerra a revolução pedagógica: os objetivos dos pilotos seguem estruturais; observação real de direção, rejeição de zero/oposto e implementações equivalentes continuam pendentes. Python/Pensa/grading e cutover Auth/owner/IDB não fazem parte deste checkpoint.
