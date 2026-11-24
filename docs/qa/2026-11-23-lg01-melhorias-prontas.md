# LG01 — candidata às melhorias prontas

**Estado atual da execução:** candidata `9a8a1a9f20e76106abbf4cb4c632bc9c0d6ac53e`, incluindo a main concorrente e as correções R13/R14. CI do PR `45281893853` aprovado nos 13 jobs, tentativa 1; plano Railway `45281894080` aprovado com zero mudanças. A onda explícita de staging `45281918669` ainda conclui a checagem de tipos antes de implantar. Produção ainda não implantada por esta execução. As seções abaixo preservam a sequência e os resultados de cada corte anterior.

Execução autorizada em 23/11/2026. A candidata parte de `f8910ee0547cba79a8dc38cc45ffa2a6efb66e5e`, em um checkout próprio na branch `release/lg01-melhorias-prontas-20261123`. Produção consultada nesta execução: Members e Kids em `3d7c532535a5474ce358709d00b78d6a7f23ce1a`.

## Entrega e dependências

| Entrega | O que a criança recebe | Pontas que precisam acompanhar |
| --- | --- | --- |
| Correções da revisão | Recuperação e verificação mais confiáveis | Código e contratos da [revisão](../../.audits/review-7-dias-2026-11-23/relatorio.md) |
| Miniaturas 3D | Escolha visual do modelo na biblioteca e no seletor do bloco | Studio nos dois apps; cache considera todo o conteúdo do arquivo |
| Tela cheia | O mesmo botão amplia o jogo e devolve ao editor | Studio clássico e prévia Python |
| Ajuda na recuperação do Pinta | Pedido de ajuda ligado aos recados do perfil, com confirmação e recuperação preservada em falha | Pinta, core, member-shell, Gateway, Members, Admin e telas dos recados; migration Members `0176` |
| Atualização do Mural | Melhorar o jogo mantendo a publicação e seu link; selo Atualizado | Studio, member-shell, Hub e runtime de versões; migration Hub `0024` |

A candidata conserva a árvore integrada revisada e suas dependências; não é um cherry-pick de quatro componentes isolados. A ajuda depende da recuperação causal e do armazenamento da conta do Pinta. A atualização do jogo depende do serviço de versões. O diff contra main inclui essas integrações e os leitores de compatibilidade: não deve ser apresentado como se contivesse somente os quatro elementos visuais.

Os controles de Molda Cenários, regiões, galeria da equipe e prévia isolada mantêm a configuração de produção. A configuração declarada só acrescenta esses valores ao staging. O catálogo Python de produção deve preservar o valor efetivamente implantado, conferido abaixo; o valor declarado no arquivo não comprova o estado remoto. Publicação de aulas, liberação das integrações regionais no Studio e estreia do Arquipélago V2 continuam nas respectivas etapas do [plano](../plans/2026-11-23-plano-de-liberacao-gradual.md).

## Aquecimento fora desta candidata

Foram revertidos nesta branch os commits `0a89ef2e3`, `935c58cab` e `95c7cb4ab`. A verificação volta a usar um contêiner por pedido, destruído ao final. Não há aquecimento ao abrir a aula nem reutilização compartilhada pelo perfil. A staging original conserva o trabalho para a qualificação LG02.

Consulta autenticada feita de dentro do Members de staging ao executor real: `POST /v1/check/warm` retornou **404**, em 273 ms, às 18:39:42 UTC de 23/11. [Recibo sem segredos](lg01-20261123/executor-readiness.json). Essa resposta não prova latência nem segurança do recurso: falta implantar runtime/imagem e qualificar primeira execução, repetições, falhas, limpeza, duas abas do mesmo perfil, isolamento, capacidade e suspensão. O aquecimento não está aprovado para produção.

## Verificação desta candidata

Provas executadas no checkout da candidata, com dependências do lockfile e sem usar `node_modules` da staging:

- 45 testes do Studio: cache e apresentação de miniaturas, tela cheia, erros e ciclo de vida de Meus testes, atualização da publicação.
- 157 testes de contratos e fronteiras: runtime, objetivos, configuração do Gateway, recados do Admin e palco.
- 153 testes de serviços e adaptadores: Mural, pedido de ajuda, publicação, autorização e execução. O wrapper de UI deve ser executado na pasta de member-shell; nessa execução separada passou.
- 47 testes da UI do Pinta: galeria, confirmação de ajuda, falha e persistência injetada.
- PostgreSQL real: 2 testes HTTP da ajuda do Pinta e 2 da identidade/atualização do post no Hub, sem banco de produção.
- Build de produção do playground e 3 percursos em Chrome: botão de tela cheia nos dois sentidos, miniatura WebGL do GLB com ossos e espelhos após upload/reabertura, importação dos três formatos do Molda e preservação do vínculo.
- Tipos de 11 pacotes sem erros: Studio (incluindo o novo E2E), core, studio-runtime, Gateway, Members, Hub, member-shell, palco, Kids, Community e Admin.
- Imagem Linux `sistemazero-studio-runtime:lg01` construída; smoke de imagem, objetivos dos kits e templates reais passaram com UID 1000 e sem rede. O perfil da imagem foi conferido antes do build.
- `bun run ci --max-diagnostics=0`: 18.045 arquivos, zero erros; 309 avisos e 297 informações preexistentes. 62 testes das regras de promoção e do workflow de produção passaram.

O teste visual mede o enquadramento pela extensão dos pixels opacos. Uma primeira expectativa de área pintada foi descartada: o GLB de contrato tem peças finas e espelhadas, e a área da silhueta não mede sua escala. O teste final exige imagem carregada, desenho não vazio, extensão superior a 65 dos 96 px e preservação após reabrir. [Captura do navegador](lg01-20261123/miniatura-modelo.png).

Os testes locais não representam uma navegação autenticada no deployment atualizado de produção. A aceitação nesse ambiente, a implantação e os gates remotos continuam pendentes até registro explícito abaixo.

O primeiro CI do PR apontou a formatação do recibo JSON, corrigida, e falhou antes dos testes históricos do Pinta por `shallow.lock`. O log registrou um fetch automático do Playwright para a base do PR que excedeu o prazo do coletor de metadados. O checkout do Chromium passa a incluir profundidade 2: os pais do merge já contêm a base, evitando aquele fetch durante a suíte e preservando os metadados e todas as provas históricas. Não foram removidos locks, testes ou gates.

## Ordem da implantação e aceite

1. Exigir CI do PR e `railway-config-plan` verdes no mesmo SHA. O workflow de produção também exige os nove jobs da tentativa de CI; não usar push direto em main nem deploy avulso para contornar esses gates.
2. Qualificar e implantar a imagem/Worker compatíveis do runtime desta candidata, preservando o catálogo Python de produção. Confirmar a versão de publicações e a verificação corrigida.
3. Aplicar a onda canônica Members/Auth e implantar Hub, Gateway, Admin, Community e Kids no mesmo release. Usar as migrações versionadas completas, não executar apenas `0176`/`0024` manualmente. A rotina de rollout estabelece as barreiras e a ordem dos aplicativos.
4. Com perfil QA infantil elegível, conferir miniaturas, tela cheia, reabertura do projeto e atualização do próprio jogo no Mural. Confirmar que o post e o link se mantêm e que outro perfil não o atualiza.
5. Para ajuda, usar somente perfil e desenhos QA com recuperação retida; conferir conversa, confirmação e comportamento offline. Não gerar pedidos de suporte em nome de crianças reais para testar.
6. Conferir saúde e SHA dos serviços, leitores ativos e flags preservadas. Registrar deployments, horários e resultados. Só então marcar LG01 concluída.

O retorno deve usar a versão compatível anterior por onda, preservando dados já gravados e as barreiras do rollout. Não apagar o valor novo do enum, colunas, desenhos, versões ou posts para tentar desfazer uma implantação. Uma versão anterior de leitor/escritor só pode voltar após comprovar sua compatibilidade com os formatos já emitidos.

## Estado

Candidata e verificações locais concluídas; [PR #283](https://github.com/informach/sistema-zero/pull/283) em rascunho durante a qualificação remota. O plano Railway da primeira tentativa passou. A nova tentativa precisa validar o SHA com as correções de CI. Implantação e aceite no deployment atualizado de produção ainda não realizados por esta execução. LG02 pendente de implantação e qualificação do executor real.

## Acompanhamento operacional posterior

- A segunda tentativa de `railway-config-plan`, run `45245000878`, foi refeita no mesmo SHA `3664ae334` depois da preparação operacional das seis listas de `watchPatterns`. O plano ficou com **zero mudanças**, ambiente de produção correto e sem operações destrutivas. Os seis deployments ativos foram comparados antes/depois e mantiveram seus IDs, estado online e nenhuma operação pendente. [Recibo](../../.audits/review-7-dias-2026-11-23/lg01-watchpatterns-preparation.json).
- O Worker de staging recebeu a candidata LG01, versão `29dac658-1fa6-4aa2-8778-e887cd8d2d1d`. A prova real de falha sobreposta entre abas passou para o projeto válido; o aquecimento continua excluído. [Achado R12 e contraprovas](2026-11-23-lg02-executor-real.md).
- A paleta do Pinta passou também a prova com duas composições HTTP reais, usando como predecessor a árvore de produção `3d7c53253`: 2 testes, 43 expectativas; as escritas antigas foram recusadas após a adoção, preservando a leitura.
- A prova adicional do **escritor selado futuro do Studio** contra esse mesmo predecessor falhou na primeira recusa de leitor: a árvore antiga responde 200 onde o contrato novo exige 409 sem negociação. O teste não foi enfraquecido nem contado como aprovado. O cliente público da LG01 anuncia o leitor, mas não chama o escritor interno selado nem adota os projetos nesse formato; essa adoção permanece na LG04. A LG01 fornece a etapa de leitores compatíveis que deve preceder aquela ativação. Não qualificar `3d7c53253` como retorno seguro após uma futura adoção selada apenas porque a paleta do Pinta passou.
- A pilha local completa foi tentada pelo launcher canônico. O PostgreSQL portátil foi baixado com hash conferido e inicializado, mas o Windows recusou a abertura de `127.0.0.1:55432`: a porta pertence à faixa reservada `55430–55529`. Nenhuma regra de segurança ou reserva foi alterada. Os testes HTTP com PostgreSQL Docker em `15439` e os percursos do playground continuam válidos em seus escopos; não substituem a sessão infantil no aplicativo completo. Foi solicitada a identificação de um perfil QA de homologação para esse aceite.

Até este registro, CI completo do PR ainda em execução e produção ainda na versão anterior. O plano não marca LG01 concluída antes da implantação e do aceite.

## Alinhamento da homologação e entradas concorrentes

A sessão infantil indicada foi localizada e sua vinculação à conta confirmada por consulta somente de leitura, retornando apenas um booleano. Nenhuma senha foi solicitada ou registrada. A tentativa de criar `QA LG01 2026-11-23` revelou que o host de staging ainda estava em `21b467bd6`: ele recusa as capacidades Python novas presentes na resposta de `/api/studio/free-options`, e essa recusa também impede a criação JavaScript. A mesma resposta foi validada contra o contrato exato daquele commit (recusada) e contra o da candidata (aceita). Não foi feita uma gravação direta para contornar a recusa da interface.

Staging foi avançada por fast-forward para `3664ae334`. O workflow canônico foi solicitado com CSV explícito `auth,members,hub,api-gateway,admin,community,community-kids,palco-gravacao`, run `45251978046`. O run automático do mesmo push (`45251875558`) e o run anterior obsoleto (`45238397148`) foram cancelados, preservando a seleção dessa onda e todos os gates do workflow. O aceite nas telas deve ser retomado quando os aplicativos desse SHA estiverem implantados.

Três commits locais surgiram durante o preparo e foram preservados, sem sobrescrever o trabalho concorrente:

- `d86ce9eab`: O Jardim Secreto vira missão do posto; o vídeo orienta o desafio e aponta cursos-base, sem montar o jogo pela criança.
- `9a03115e0`: o caderno Passo a passo aparece uma única vez, no final da Aula 1.
- `ca8c490a0`: o operador de publicação aguarda `prepare`, `view` ou `command` antes de fechar a conexão no `finally`.

São materiais e operação de publicação de cursos, pertencentes à LG03. Foram revisados os deltas e executados 81 testes de missão, Jardim, padrão Faísca e composição/ambiente da publicação, sem falhas. O operador de publicação não foi invocado contra um ambiente hospedado por esta execução. Esses commits locais não alteram o SHA congelado da candidata LG01 e precisam ser integrados na retomada da LG03.

## CI qualificado e configuração efetiva dos runtimes

O CI completo do PR, run `45245000574`, tentativa 1, terminou com sucesso no SHA `3664ae3347a6e8c55ce0b20a11b7d3f2873f0654`: 13 jobs aprovados, inclusive os nove exigidos pelo controlador de produção. O PR #283 foi retirado do estado de rascunho. O segundo CI canônico, run `45251978046`, continua sendo a barreira anterior à onda de homologação; às 20:25 UTC executava a verificação de tipos de todos os pacotes, sem falhas nos demais jobs.

A leitura inicial do histórico tomou indevidamente a primeira entrada como a atual. A listagem veio em ordem cronológica; o estado anterior correto foi recuperado ordenando por `created_on` e lendo a versão de 100% do deployment mais recente:

| Ambiente | Worker anterior | Catálogo efetivamente implantado antes da operação |
| --- | --- | --- |
| Staging | `c523b815-32a8-4717-a9cf-0335635b8b21` | `05294b0e0df2ed0a128bde227a927c7f88fef3db784baf59368ae0246ee22ead` |
| Produção | `3e1f67fb-f26a-4188-aa87-47d7a6dc80c5` | `2c53c74ce96be00412438117a39bbcf82af763c6c99be3783beaa6317a00b57d` |

Os valores anteriores corretos coincidem com os declarados no arquivo. Na leitura equivocada, foi implantado temporariamente em staging o catálogo obsoleto `f69814b…` no Worker `7b13b14a…`. O erro foi detectado ao confrontar a hipótese de divergência com os endpoints públicos reais e corrigido imediatamente. O Worker atual de staging é `96d176d0-4055-4f1a-9b35-3cf5338f3a76`, com o catálogo efetivo anterior correto `05294b0…` e a mesma implementação/imagem segura por pedido. O restabelecimento usou `--containers-rollout none`, sem alterar a imagem, com recibo `.cache/lg01/worker-staging-restored-actual-catalog.log`. Produção não foi alterada durante essa correção. Não usar os arquivos locais antigos `production-worker-before-version.json` e `prior-staging-worker-version.json` como se descrevessem a versão ativa; representam entradas históricas antigas da listagem.

O catálogo anunciado em `/api/studio/free-options` vem da política do Members, não do Worker. A política já carregada no Members `f8910ee05` é `9fbc43bc…`, com `2026-11-23-pinta-regioes-1` ativa; o host antigo `21b467bd6` não a entende. A solução da LG01 para a criação JavaScript é alinhar os aplicativos leitores com a versão validada, sem escrita direta ou concessão de acesso.

Em produção, a política carregada no Members `3d7c53253` é `022e5b54…`, com `2026-10-25-integrated-games-2` ativa. O Worker efetivamente ativo também atende essa release: a checagem pública `HEAD /v1/runtime-deployments/0d27adb3…` retornou 200. A afirmação anterior de divergência de produção estava errada e fica substituída por esta leitura. O artefato correto `2c53c74…` foi baixado somente para leitura pelo endereço imutável em R2 para conferir o SHA-256 e o carregador atual. A LG01 preservará esse catálogo; a promoção da distribuição nova permanece na LG08.

Após a restauração, às 20:46:56 UTC, os quatro probes públicos de metadados retornaram 200: releases anterior/atual do Members em produção e anterior/atual em staging. São provas de catálogo e marcadores no armazenamento real, não uma qualificação completa da nova distribuição Python. [Recibo com histórico ordenado e hashes conferidos](../../.audits/review-7-dias-2026-11-23/lg01-runtime-effective-config.json).

Nova entrada concorrente em origin/staging: merge `b1220ea67`, posterior ao corte LG01, mantém `3664ae334` como pai e acrescenta somente o teto de 32 vozes de cena do Zappy (`a4beb3872`) e a correção de espera do operador de cursos (`143640eb4`, equivalente à já revisada `ca8c490a0`). O aumento de 12 para 32 cobre as 19 falas da Ilha e conserva o teto próprio do quiz; deve acompanhar a publicação LG03 e seus leitores. Não altera a candidata congelada nem cancela a onda LG01 já solicitada. O CI automático dessa nova entrada estava pendente atrás da onda serializada de staging na consulta. O registro local adicional `4d702c86e` informa vídeos finais da Ilha em staging e promoção ainda bloqueada; é evidência de outra execução, não prova de publicação em produção feita pela LG01. A aba de curso já em uso foi preservada; o aceite LG01 usa uma segunda aba própria.

Essas duas alterações concorrentes passaram também 41 testes (126 expectativas) de voz de cena/quiz e ambiente/composição do operador de publicação, no checkout isolado exato `b1220ea67`, com instalação própria pelo lockfile. Log: `.audits/review-7-dias-2026-11-23/after-lg01-zappy.log`. Não houve execução do operador contra dados hospedados por esta revisão.

## Onda canônica de homologação

O segundo CI, run `45251978046`, concluiu todos os 13 jobs de verificação com sucesso às 20:41 UTC. O job de implantação `137998816441` passou baseline, CORS, SSH somente de leitura, plano/aplicação de configuração e a barreira Members/Auth/Jornada. Os aplicativos foram solicitados em paralelo às 20:48 UTC, no SHA congelado `3664ae334` (confirmado também nos metadados de build de Kids e Hub).

Estado observado às 20:59 UTC, ainda anterior ao aceite das interfaces:

| Serviço | Deployment | Estado |
| --- | --- | --- |
| Members | `589a798f-ae07-4e05-a6f5-0a0448b983f4` | Sucesso, saudável |
| Auth | `bd60386c-5398-4c14-b75e-8f82df49b274` | Sucesso, saudável |
| Hub | `6111614e-aaf6-4ec2-b387-b25e885a3d16` | Sucesso, saudável |
| Gateway | `4afff360-8608-4bd0-b961-5558b1659bfb` | Sucesso, saudável |
| Palco | `645313d5-8b0a-4c96-9834-c730b004db69` | Sucesso, saudável |
| Kids | `0079670f-91a0-48a8-8b80-f80eec264bec` | Construção em andamento |
| Community | `e41bd0f4-d247-4ed0-bcd2-f7d8e87dd1d1` | Construção em andamento |
| Admin | `b8981c6e-28dc-483f-88a6-1b044fc76575` | Construção em andamento |

Produção permanece na versão anterior até concluir a qualificação de homologação. Os estados intermediários desta seção não marcam LG01 concluída.

### Resultado da primeira onda e aceite infantil

O run `45251978046` terminou com **sucesso**: os oito deployments da tabela estão saudáveis, inclusive Kids, Community e Admin. No perfil infantil indicado, a criação JavaScript voltou a funcionar pela UI atualizada. Foi criado somente o projeto privado `QA LG01 — miniaturas e tela cheia`, item `01M853GQKW3CVQARHT02G4Y88B`. Upload, commit e consulta da lista retornaram 200. Após recarregar a página, ele apareceu entre os sete projetos e reabriu com o estado Salvo; a revisão na conta é 1, formato 2, 533 bytes. Os seis projetos anteriores e os dois desenhos visíveis do Pinta foram preservados. [Recibo sem credenciais](../../.audits/review-7-dias-2026-11-23/lg01-child-session-qa.json).

O Chrome compartilhado recusou a chamada nativa de fullscreen com `TypeError: not granted`. A mesma chamada falhou numa página mínima de controle fora do Studio, com documento visível, focado e fullscreen habilitado. O servidor de controle, restrito a loopback, e sua aba foram encerrados. Não modificar permissões nem o código do produto para encobrir essa restrição do navegador. O fluxo de entrar/sair passou no Chrome real do playground e no CI, mas não foi aprovado manualmente nesta sessão compartilhada.

Esse perfil apresenta somente Jogo 2D em Mais blocos. Não foram concedidos direitos para forçar a miniatura. A identificação posterior fornecida pelo usuário permitiu localizar uma sessão Admin já aberta; o aceite visual 3D foi feito na prévia de aula dessa sessão, conforme o registro abaixo. Upload/miniatura WebGL/reabertura permanecem aprovados no teste real de Chrome e no CI, com seu escopo explícito.

A galeria do Pinta abriu normalmente e não tinha aviso de recuperação retida. O POST sintético inválido sem a prova da sessão foi recusado com 409 SESSION_CHANGED; repetido com a prova normal do documento, retornou 400 VALIDATION_ERROR, antes de qualquer envio ao Members. Isso comprova a rota e suas recusas no host atualizado; não é um pedido de ajuda real. Ajuda e atualização/identidade do Mural continuam aprovadas nas quatro provas HTTP com PostgreSQL real. Nenhum recado de suporte ou post compartilhado foi criado por esta conta QA.

### Integração da main que avançou durante o aceite

Às 20:51:51 UTC, outra execução integrou o PR #284, main `8d87bbff8`, com o teto de 32 falas e o operador de cursos já revisados nesta execução. Foi necessário incorporar a main para que a futura árvore promovida continue igual à árvore aprovada pelo CI. A candidata agora é `40dd49db7265c33d36b6f82ce9130382f46bef28`, com a mesma árvore de `b1220ea67`: somente aqueles dois arquivos diferem de `3664ae334`. Os 41 testes direcionados foram repetidos com sucesso e o perfil da imagem continua válido.

Novos gates obrigatórios: CI do PR `45266872791`, plano Railway `45266872643` e onda canônica explícita de staging `45266896659`, com os mesmos oito serviços. O plano já passou com zero mudanças e a mesma árvore `.railway/` `0bec132654ae9d0b8630a2d10e62f5fbc9e4bf13`. Os runs automáticos `45255319315` e `45266840035` foram cancelados antes de iniciar deployments para preservar esta seleção. A primeira homologação aprovada não substitui os gates no novo SHA. Produção segue sem implantação desta LG01 até a qualificação final.

### Aceite visual 3D e correção R13

A sessão Admin indicada pelo usuário já estava autenticada. Foi usada a prévia local **Conferir livremente** da aula **Uma ilha com profundidade**, parte **Faça o personagem andar**. Não houve impersonação, alteração de acesso, transferência de credenciais ou modificação do progresso infantil. Os 24 modelos GLB da biblioteca carregaram miniaturas de 96 × 96 px; todos tiveram desenho não vazio e extensão visível entre 80 e 82 px. A inspeção visual confirmou modelos reconhecíveis. Os 138 pedidos fetch/XHR examinados não continham gravações POST/PUT/PATCH/DELETE em `/api/`. A prévia foi encerrada e a preferência de comunidade original, Adultos, restaurada. Nenhum código de acesso por e-mail foi enviado.

Essa navegação encontrou **R13: menu incorporado abre fora da janela**. Com o gatilho a 800,5 px em uma janela de 936 px, o painel abria em 844,5 px e terminava em 1.252,44 px; Modelos 3D ficava fora da área visível. O componente agora mede o painel e abre acima do gatilho quando falta espaço abaixo, acompanhando seu tamanho e preservando foco, rolagem e a folha móvel.

Correção `a5d684728a511f6e8c45f877f572166b1e1453f1`: regressão unitária reproduziu o erro antes da alteração (borda inferior 1.092 px para limite de 760 px) e passou depois. Foram aprovados os seis testes do menu, 19 expectativas, tipos completos do Studio e Biome dos três arquivos. O build de produção passou três percursos no Chrome: tela cheia, menu incorporado na borda inferior abrindo Modelos 3D, e upload/miniatura/reabertura de GLB. Logs `lg01-menu-red-unit.log`, `lg01-menu-green-unit.log`, `lg01-menu-typecheck.log` e `lg01-menu-browser.log` na pasta da auditoria.

O CI completo de `40dd49db7` terminou com sucesso nos 13 jobs; seu staging foi cancelado antes de qualquer passo de implantação, pois a correção R13 exige outro SHA final. O PR #283 voltou a rascunho durante essa qualificação. A candidata final passa a `a5d684728…`, incluindo a main concorrente e R13. Gates: CI do PR `45279034681`, plano Railway `45279034397` e onda canônica explícita de staging `45279089312`, com os oito serviços já definidos. O run automático `45279020778` foi cancelado antes dos passos de implantação. Produção continua sem implantação desta execução até a aprovação desses gates.

### R14 — gesto do Pinta após deslocamento do papel

O CI `45279034681` encontrou um defeito adicional no percurso de toque do Pinta: os conjuntos salvos tinham um objeto a mais que a prévia. O trace registra uma resposta de sincronização com o Studio entre o movimento e a liberação do ponteiro. A reprodução mínima desloca o papel 32 px nesse intervalo: sem mover o ponteiro, o `pointerup` calculava uma casa na linha anterior e a acrescentava ao gesto. A regressão falhou com exatamente esse objeto extra, chave `30:0`, antes da correção.

O gesto agora conserva a posição do último evento de entrada. Ao soltar sem nova posição, confirma o resultado já mostrado; quando o ponto final mudou, ainda incorpora essa posição, mesmo sem um último `pointermove`. As recusas por edição externa, captura perdida, limites e ponto fora da área continuam nos respectivos caminhos existentes. A prova não foi enfraquecida nem recebeu espera fixa ou repetição automática.

O mesmo mecanismo foi reproduzido no arrasto da biblioteca: ao soltar sem mover, o objeto era gravado em y=48 em vez dos 64 exibidos. Esse caminho também conserva o último resultado mostrado quando a entrada não mudou, mantendo as recusas do host e da área de destino. Passaram 76 testes da UI (1.226 expectativas), incluindo as duas regressões e a contraprova do ponto final novo. Os quatro percursos de produção no Chromium passaram: espalhamento e biblioteca, em desktop e toque, agora com deslocamento determinístico do papel durante a prévia. Os tipos do Pinta passaram; os do Studio e a nova qualificação remota precisam terminar antes da promoção. Logs `lg01-scatter-layout-red.log`, `lg01-library-layout-red.log`, `lg01-scatter-library-green.log` e `lg01-scatter-library-browser.log` na auditoria.

A onda `45279089312` foi cancelada antes dos passos de implantação. O plano de `a5d684728` passou com zero mudanças; o CI desse SHA não qualifica a versão sem R14. O Worker de staging foi alinhado ao código `a5d684728`, versão `6406c751-d850-4e2c-b433-7f75a2b5337d`, preservando a imagem anterior e o catálogo `05294b0…`; o diretório do runtime não mudou desde a candidata `3664ae334`. Produção permanece intacta.

Os tipos finais do Pinta e do Studio concluíram com saída 0 após as duas correções. R14 foi incorporado em `9a8a1a9f20e76106abbf4cb4c632bc9c0d6ac53e`, sem alterações adicionais no runtime. O CI automático `45281870815` foi cancelado antes dos passos de implantação; a onda `45281918669` mantém o CSV explícito dos oito serviços. O PR #283 permanece em rascunho até essa qualificação. Os recibos desta etapa estão preservados também na branch `docs/lg01-acompanhamento-20261123`.

### Qualificação do PR final

O run `45281893853`, tentativa 1, terminou com sucesso às 23:42:26 UTC de 23/11: os 13 jobs passaram no SHA final `9a8a1a9f2`, incluindo os nove exigidos pelo controlador, na mesma tentativa. Também passaram `ten-thousand-blocks`, o preflight SSH somente de leitura e o plano Railway final `45281894080`, com zero mudanças, ambiente de produção correto e árvore `.railway/` `0bec132654ae9d0b8630a2d10e62f5fbc9e4bf13`. Na conferência às 23:58 UTC, main continuava em `8d87bbff8` e staging em `9a8a1a9f2`.

A onda `45281918669` tem seus 12 jobs complementares aprovados e ainda executa a checagem global de tipos, iniciada às 23:28:39 UTC. Nenhum job de implantação começou nessa consulta. O PR não foi integrado e produção não recebeu esta versão até esse registro.

### Nova onda e publicação concorrente da Ilha

O CI canônico de staging concluiu os 13 jobs com sucesso e iniciou o job `138109872500` às 00:04 UTC de 24/11 (21:04 de 23/11 em São Paulo). A onda começou pelo Members `c639c887-8591-43e9-bbaa-cc38dd7ad458` e passou para Auth `3e914ffa-8ac9-43bd-ab65-8bcc72d38166`. A consulta prévia encontrou deployments concorrentes de Members/Admin no SHA `b1220ea67`, com as duas mudanças já revistas e incorporadas; o fluxo canônico captura esses predecessores sem reverter código necessário.

Uma guarda de identidade da consulta de cursos recusou o SHA antigo de produção antes de acessar o banco. A leitura mínima seguinte confirmou que outra execução já havia implantado Members `8d87bbff8`, deployment `365d0e34-97e1-4fa0-9af3-0cd76281ee18`, às 23:21 UTC. Admin `c92745cd-8803-47c3-a045-8e4aa640d7e4` e Kids `06fa9bb4-20b7-4527-9794-85e2670aabca` também receberam deployments saudáveis nessa frente. Produção estava sem operações pendentes na conferência.

Repetida com a identidade atual correta, a transação somente de leitura confirmou **A Ilha do Farol publicada, 3/3 aulas**, tanto no slug Kids `jornada-faisca-base-3d` quanto no adulto `jornada-faisca-base-3d-adulto`. As atualizações registradas são 23:35:44 e 23:37:26 UTC de 23/11. Jardim permanece 0/2; Pinta e Moedas, 0/1. Não houve execução do publicador ou alteração de aulas por esta LG01. O estado inicial de cursos em rascunho fica preservado como histórico, e o plano/matriz passam a distinguir essa publicação já realizada das restantes.

O predecessor real de Members para o próximo smoke de produção passa a ser `8d87bbff8`, não `3d7c53253`. A candidata `9a8a1a9f2` já incorpora essa main e preserva o ajuste de 32 falas. O Arquipélago API anterior está saudável, deployment `47c779a9-cb21-4567-a4a4-fe4e143f120e`; sua estreia V2 continua fora da seleção LG01.
