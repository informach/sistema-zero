# LG01 — candidata às melhorias prontas

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

A leitura das versões efetivamente implantadas revelou valores diferentes dos arquivos de configuração:

| Ambiente | Worker anterior | Catálogo efetivamente implantado antes da operação |
| --- | --- | --- |
| Staging | `6276e3b7-98a4-4a1c-a40d-172d5b0f6b17` | `f69814b9412125e9bb8f8f33aea2b682cf1e7dfdeb59f593c2067466ce140553` |
| Produção | `1fb3fff1-053c-4199-b936-a5bd5c63f206` | `0c4482cff070b0dc1ea7d452db87d588116ef22b69fe40605fab16e99f2cb069` |

Durante a qualificação do executor, o deploy inicial de staging usou o valor declarado `05294b0…`, promovendo também aquele catálogo. Essa alteração foi desfeita explicitamente: o Worker LG01 de staging está agora em `7b13b14a-18d0-4e80-a2b6-f2fb8512c6ed`, com o catálogo remoto anterior `f69814b…`, mesma implementação segura por pedido e sem recompilar/trocar a imagem. O deploy usou `--containers-rollout none` e override explícito da variável. O recibo está em `.cache/lg01/worker-staging-compatible-catalog.log` no checkout isolado.

**Correção do diagnóstico:** o catálogo anunciado em `/api/studio/free-options` vem da política do Members, não do Worker. Portanto, a restauração acima não resolve a recusa do host antigo de staging. A política já carregada no Members `f8910ee05` é `9fbc43bc…`, com `2026-11-23-pinta-regioes-1` ativa; o host antigo `21b467bd6` não a entende. A solução da LG01 para a criação JavaScript é alinhar os aplicativos leitores com a versão validada, sem escrita direta ou concessão de acesso.

Em produção, a política realmente carregada no Members `3d7c53253` é `022e5b54…`, com `2026-10-25-integrated-games-2` ativa, enquanto o Worker antigo só contém `2026-10-22-visual-games-3` ativa. Essa divergência já existia antes desta operação. Não afirmar que Python está integralmente qualificado nem ativar a distribuição nova para resolver isso incidentalmente. A conciliação das autoridades, serviços e destinos continua na LG08. O catálogo remoto antigo de produção foi baixado somente para leitura pelo seu endereço imutável em R2, teve o SHA-256 conferido e foi aceito pelo carregador atual. Uma implantação do Worker LG01 deve preservar explicitamente esse valor, em vez de assumir o valor `2c53c74…` declarado no arquivo.

Nova entrada concorrente em origin/staging: merge `b1220ea67`, posterior ao corte LG01, mantém `3664ae334` como pai e acrescenta somente o teto de 32 vozes de cena do Zappy (`a4beb3872`) e a correção de espera do operador de cursos (`143640eb4`, equivalente à já revisada `ca8c490a0`). O aumento de 12 para 32 cobre as 19 falas da Ilha e conserva o teto próprio do quiz; deve acompanhar a publicação LG03 e seus leitores. Não altera a candidata congelada nem cancela a onda LG01 já solicitada. O CI automático dessa nova entrada estava pendente atrás da onda serializada de staging na consulta. O registro local adicional `4d702c86e` informa vídeos finais da Ilha em staging e promoção ainda bloqueada; é evidência de outra execução, não prova de publicação em produção feita pela LG01. A aba de curso já em uso foi preservada; o aceite LG01 usa uma segunda aba própria.

Essas duas alterações concorrentes passaram também 41 testes (126 expectativas) de voz de cena/quiz e ambiente/composição do operador de publicação, no checkout isolado exato `b1220ea67`, com instalação própria pelo lockfile. Log: `.audits/review-7-dias-2026-11-23/after-lg01-zappy.log`. Não houve execução do operador contra dados hospedados por esta revisão.
