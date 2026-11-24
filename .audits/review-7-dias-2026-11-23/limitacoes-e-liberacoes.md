# Funcionalidades, limitações e liberações — levantamento ampliado

**LG02 entregue em produção em 24/11/2026:** fonte `0180e39fd`, sete serviços saudáveis, Worker `99386c58` e imagem qualificada. Aquecimento e reutilização saem da lista de liberações pendentes: R12 foi corrigido e a matriz real passou, incluindo falhas, duas abas, capacidade e suspensão. A limitação permanece em capacidade, expiração e tempo dos objetivos; Python continua fora do aquecimento. [Recibo vigente](../../docs/qa/2026-11-24-lg02-aquecimento-seguro.md), [inventário incremental](inventory-lg02-followup.json).

**Liberação posterior confirmada:** a outra frente publicou **A Ilha do Farol**, com 3/3 aulas em Kids e Adultos. A consulta somente de leitura de produção foi feita às 00:08 UTC de 24/11 (21:08 de 23/11 em São Paulo), no Members `8d87bbff8`. Esse ajuste de 32 falas já integra a LG01. Jardim, Pinta e Moedas seguem em rascunho. A publicação do curso não foi executada por esta revisão.

**LG01 entregue em produção em 24/11/2026:** sete serviços saudáveis em `538ae843b`, runtime e imagem qualificados, CI e onda canônica concluídos. Miniaturas, tela cheia, ajuda na recuperação do Pinta, atualização do Mural e correções R13/R14/R15 estão na versão publicada. Os quatro percursos desktop/toque, 76 testes UI, tipos e aceite de menu/24 miniaturas passaram; os limites do aceite manual estão documentados. O aquecimento ficou fora desse corte e foi entregue depois pela LG02. [Recibo da entrega](lg01-production-release.json).

Levantamento de 23/11/2026, atualizado após a implantação de 24/11, incluindo o que entrou depois do início da auditoria.

**Resultado da primeira etapa:** a LG01 inclui a main concorrente e as correções R13/R14/R15. As miniaturas dos 24 modelos foram conferidas na prévia Admin; criação e reabertura passaram no perfil infantil. Aquecimento e reutilização ficaram fora daquele corte porque a prova real reproduziu interferência entre abas (R12). A LG02 corrigiu propriedade/limpeza e repetiu a qualificação antes de liberar. Os inventários iniciais permanecem preservados. [Registro LG01](../../docs/qa/2026-11-23-lg01-melhorias-prontas.md), [reprodução inicial](../../docs/qa/2026-11-23-lg02-executor-real.md) e [fechamento LG02](../../docs/qa/2026-11-24-lg02-aquecimento-seguro.md).

## Escopo ampliado

- Início preservado da janela original: 16/11/2026, 13:28:01 de São Paulo.
- HEAD ampliado: `f8910ee0547cba79a8dc38cc45ffa2a6efb66e5e` (23/11/2026, 15:16:47).
- **1.479 commits e 9.009 arquivos no diff acumulado**: 25 commits adicionais e 136 arquivos tocados desde o primeiro corte. Nem todos esses arquivos são novos; há documentação, testes, arte e a própria auditoria.
- As correções locais R10/R11 também integram o trabalho. R9, já verificada na árvore de trabalho, foi incorporada pelo commit final acima durante o fechamento.
- [Inventário ampliado](inventory-expanded.json), [histórico ampliado](commits-expanded.tsv), [evidência de configuração e deploy](release-access-evidence.json).

As condições abaixo foram conferidas no código atual. A configuração de produção foi consultada por ferramentas de leitura do Railway, sem alterar variáveis, acessos ou deployments. Os valores das variáveis existentes estão ocultos pelo conector; sua **presença ou ausência** é verificável. Não inferi valores dos campos ocultos. Para os cursos, a CLI autorizada do Railway executou uma consulta no Members em transação PostgreSQL **read only**, sem ler alunos/contas ou imprimir credenciais. [Resultado dos cursos](production-course-status.json), [consulta reproduzível](read-production-course-status.mjs).

## O que entrou depois da primeira coleta

| Entrega adicional | Efeito para a criança | Condições e limites |
| --- | --- | --- |
| Miniaturas dos modelos 3D no seletor dos blocos e na aba Modelos 3D | Escolher o personagem/objeto pela imagem em vez de só pelo nome e pelo ícone | Exige WebGL 2 e arquivo que o leitor consiga abrir; a imagem é estática, de 96 px. Há fallback para o ícone e cache de até 64 miniaturas |
| Pedido de ajuda na recuperação do Pinta, ligado ao host, gateway, Members, recados e Admin | Tocar em **Preciso de ajuda**, receber confirmação e continuar a conversa com a equipe nos recados, sem depender de uma aula | É pedido de atendimento, não restauração automática. Os desenhos não são anexados automaticamente; permanecem no aparelho. Exige migração 0176 e deploy compatível dos serviços |
| Aquecimento da verificação dos objetivos | Prepara o executor JavaScript/Pro antes do clique em Verificar | **Liberado na LG02.** Não abrange Python; primeira visita, expiração e capacidade ainda podem exigir uma máquina nova |
| Reutilização do contêiner de verificação por criança | Evita uma nova subida completa do contêiner em cada clique | **Liberada na LG02.** Posse exclusiva e limpeza confirmada; sobreposição usa recursos distintos. Cache limitado a 10 gerais/2 para navegação 3D, com expiração de cinco minutos |
| Aquecimento ligado ao cartão da aula e às rotas dos apps | Preparação automática enquanto a criança trabalha na parte | **Liberado na LG02.** Aba visível, intervalo de três minutos nas edições e mesmos controles de sessão, perfil, revisão e acesso. O 202 aceita preparação assíncrona; não garante máquina já pronta |
| Apelido infantil editável e rolagem do quarto | A criança pode ajustar seu apelido; o quarto conserva a rolagem dentro da lista de itens | **Em staging, fora da LG02 de produção.** Apelido com 2–40 caracteres, sem unicidade obrigatória, preservando nome do certificado. Se renovar a sessão falhar, o menu pode conservar o apelido anterior até a renovação normal, de até 15 minutos |
| Materiais do Jardim e concorrência da geração de voz | Prepara a missão, o caderno, as capas e vozes dos materiais que serão publicados | **Em staging, promoção própria na LG03.** O Admin limita cada geração a quatro frases simultâneas; o serviço de voz continua sujeito às cotas do provedor. Publicação dos materiais e aulas permanece pendente |
| Proposta e seis protótipos do Construtor, PR #287 | Prepara jogos 2D/3D com telas e reinício prontos, deixando as regras para a autoria da criança; há 81 combinações visuais 2D | **Rascunho, fora de staging/produção.** R17 da reprodução Windows foi corrigido. Faltam aceite na interface/WebGL, artes 3D definitivas, avaliação de toque/aparelhos e reautoria/publicação das aulas. Os dois iniciais são intencionalmente incompletos; importar exige acesso ao kit 2D/3D correspondente |
| Versão única do runtime Python: distribuição no R2 e catálogo do Worker de staging | Prepara uma versão coerente das bibliotecas e leitores novos | Upload/qualificação local não equivalem a ativação em produção. O recibo declara `activationQualified: false`; a promoção é uma etapa própria |
| Ajustes dos roteiros de A Ilha do Farol e O Jardim Secreto | Instrução explícita para retirar a pergunta inicial que já vem dentro do bloco **não**, evitando um passo confuso | A revisão do roteiro só chega ao aluno quando o conteúdo correspondente for publicado |
| Botão do palco entra e sai da tela cheia | O mesmo botão permite voltar ao editor; sair pelo Esc também atualiza seu ícone e rótulo. Vale no clássico e na prévia Python | Depende da API de tela cheia do navegador. É correção de interface, sem flag ou lista especial de alunos |
| Esperas dos testes do Pinta com comparação booleana | Reduz memória/tempo do teste quando um elemento ainda não desapareceu | É melhoria do gate de qualidade, não nova funcionalidade para a criança |
| Correções do review original e de tipos | Editor e verificações mais confiáveis | Incorporadas ao levantamento; não contadas como novas funcionalidades independentes |

## O que está efetivamente pendente de liberação

| Funcionalidade | Situação confirmada | O que falta para o aluno ter acesso |
| --- | --- | --- |
| **Molda Cenários 3D** | O código acompanha a versão implantada da LG01, mas Members continua sem `CENARIOS_MODO`, cujo padrão é `desligado` | Qualificar e abrir gradualmente na LG06. `equipe` abre somente para o time; crianças exigem `lista` ou `aberto`, acesso ao produto Molda e faixas adequadas da Jornada |
| **Ferramenta Regiões do Molda Cenários** | `CENARIOS_REGIOES` está ausente no Members de produção; o padrão do código é falso | Além de abrir a oficina, habilitar esse controle. A faixa de ferramentas da Jornada também precisa permitir `jogo.regioes` |
| **Prévia clássica isolada do Studio** | `STUDIO_CLASSIC_SHELL_ENABLED` continua ausente em Community Kids e Community de produção após a LG01 | Qualificar runtime/hosts e origens permitidas na LG07 antes de habilitar `STUDIO_CLASSIC_SHELL_ENABLED=1`. A prévia atual continua sendo o caminho sem essa opção |
| **Galeria de exemplos grandes e página de medida** | A tela exige papel privilegiado por código; `STUDIO_EXAMPLES_ORIGIN` está ausente nos dois apps de produção | Para a equipe: publicar artefatos e configurar a origem. Para crianças: uma decisão de produto e mudança deliberada da regra de autorização. Definir a origem, sozinho, não abre a galeria ao aluno |
| **Nova distribuição Python e capacidades que dependem dela** | O novo catálogo foi apontado em staging; os recibos não certificam ativação em produção. Há serviço Python já configurado em produção, portanto não se deve descrever todo Python como indisponível | Promover e conferir a distribuição exata, catálogo e autorizações do Members, Worker/serviços e CSP/origens dos aplicativos, conforme o plano de promoção |
| **Arquipélago V2 / nova Faísca no jogo integrado** | O relatório da frente e o ponto de entrada do jogo distinguem o mundo integrado V1 da demonstração V2 em `/macro` | Concluir a integração/estreia do V2 no jogo usado pela criança. Não é uma simples flag de acesso do Molda |
| **Novas aulas Faísca ainda pendentes** | Na consulta posterior, O Jardim Secreto, Meu primeiro desenho no Pinta e Moedas no caminho continuam em rascunho. A Ilha do Farol já está publicada, 3/3 em Kids e Adultos | Publicar os cursos restantes após conferir vídeos, materiais, correspondência com os roteiros e regras da Jornada. Para a Ilha publicada, continuam valendo as regras normais de acesso e Jornada |

Fontes principais: [modos de cenários](../../packages/members/src/infrastructure/config/env.ts), [acesso ao produto e faixas](../../packages/members/src/application/cenarios/cenarios.service.ts), [habilitação da prévia isolada](../../packages/core/src/studio/classic-shell.ts), [galeria por papel](<../../packages/community-kids/src/app/(app)/estudio/page.tsx>), [origem dos exemplos](../../packages/member-shell/src/server/studio-example-files.ts), [qualificação Python](../../docs/plans/evidencias/2026-11-23-python-versao-unica/qualificacao.json), [distinção V1/V2](../../docs/plans/2026-11-16-cenarios-reforma/relatorio-final-2026-11-20.md).

## Limitações que exigem integração ou evolução do produto

Estas não se resolvem apenas autorizando uma conta ou alterando uma variável.

| Funcionalidade | Limitação atual | Consequência prática |
| --- | --- | --- |
| **Materiais regionais novos do Pinta dentro do Studio** | Existe composição privada/local para qualificação. O caminho legado de snapshots da nuvem e de publicação recusa referências regionais; o modo privado retira a sincronização em nuvem | Não anunciar jogos regionais como disponíveis de ponta a ponta ao aluno, com salvamento na conta e publicação no Mural. O escritor selado e sua adoção precisam ser integrados/qualificados no cliente |
| **Escritor selado do Studio** | Há contratos, rotas de backend e leitor. O produtor comum `buildStudioCloudSnapshot` ainda escreve o manifesto legado de partes | A existência das rotas não significa que todo projeto já usa o escritor novo. Leitura, escrita, adoção e retorno de versão precisam acompanhar a mesma entrega |
| **Regras/projeções novas do Pinta** | O host da conta anuncia teto nativo 8. Documentos de regras/projeções nativos 9 / nuvem 8 ficam além desse teto; o modo local de qualificação é separado | Não basta expor um botão: a fila e o gravador da conta precisam admitir e preservar o novo formato, com seus leitores e destinos |
| **Mundo gigante dentro de um bloco de aula do Pinta** | O bloco da aula continua usando armazenamento/formato legado e recusa o documento regional | A opção de criar mundo gigante da oficina livre não passa automaticamente a existir dentro das aulas antigas |
| **Galeria pessoal / Trazer do Pinta** | A API pública `exportAssetForStudio` usa a captura legada, enquanto a oficina regional possui captura e download próprios | Nem todos os caminhos de reaproveitamento têm a mesma cobertura. A integração do material regional no Studio continua sendo uma frente própria |
| **Mundos de 2 km e aparelhos mais simples** | Há medidas reais na RTX 3050 e um perfil de CPU reduzida na mesma GPU; isso não é a mesma prova que um notebook com GPU integrada ou um celular. Há tetos de documento, projeto e malha | O exemplo demonstra a capacidade de construir o mundo, não desempenho garantido em qualquer aparelho ou número ilimitado de objetos |

Fontes: [barreira da nuvem/publicação](../../packages/core/src/studio/pinta-regional-reference.ts), [produtor dos snapshots](../../packages/member-shell/src/lib/studio-cloud.ts), [composição privada](../../packages/studio/src/studio/StudioCore.tsx), [teto do host Pinta](../../packages/member-shell/src/components/creator/pinta-client.tsx), [testes do bloco de aula](../../packages/pinta/src/components/workshopRegionsUi.test.tsx), [medidas de mundos grandes](../../docs/estudio-evolucao/evidencias/mundos-2km-2026-11-23/README.md).

### Precisão sobre os mapas regionais do Pinta

O download regional **já está implementado**: a janela focal captura uma revisão confirmada e oferece `.pinta.json` e pacotes Tiled, Phaser, Pygame e Godot. Portanto, não é correto descrever toda a exportação regional como ausente.

O modo focal é a edição leve: lápis, borracha, linha, retângulo, consulta/movimento e leitura dos trechos visíveis. O botão **Avançado** abre o editor completo e carrega o inventário completo. A diferença é de custo e de modo de edição, não prova de que todas as ferramentas avançadas ainda precisam ser criadas.

As restrições que permanecem relevantes são o bloco de aula legado, os caminhos de integração com o Studio e os formatos futuros que o gravador da conta ainda não anuncia.

Fontes: [download da janela focal](../../packages/pinta/src/components/editor/FocalEditorScreen.tsx), [formatos de download](../../packages/pinta/src/components/export/WorkshopMapDownload.tsx), [quatro destinos](../../packages/pinta/src/components/export/SceneExportButtons.tsx), [abertura do Avançado](../../packages/pinta/src/components/PintaApp.tsx), [interface regional completa](../../packages/pinta/src/components/editor/RegionMapWorkspace.tsx).

## Limites do funcionamento atual, sem fila especial de liberação

| Funcionalidade | Limite ou regra | É acesso pendente? |
| --- | --- | --- |
| Histórico do Pro | Até 50 versões ou 20 MiB por projeto, com descarte das mais antigas. Local ao aparelho/navegador e ao conteúdo dos arquivos; materiais têm ciclo separado. Desligado por padrão na aula | Não. São regras de retenção e curadoria; para ter histórico em nuvem, seria outra funcionalidade |
| Execução leve do Pro | Somente quando o projeto pode ser montado no navegador de forma equivalente ao build. Os demais seguem ao compilador hospedado | Não. É seleção técnica automática, não falta de permissão para rodar o projeto |
| Investigar / Desempenho / Meus testes | Recursos variam com linguagem, motor, projeto e capacidades do host. Programa sem tela não tem FPS; pausar, inspecionar e testar não equivalem a um debugger universal | Não há evidência de uma homologação global extra. As capacidades e a curadoria da aula continuam valendo |
| Pedido de ajuda do Pinta | Uma conversa por perfil; até 20 edições e 40 desenhos por pedido. Não envia bytes dos desenhos. Acima do teto ou quando necessário, a alternativa é baixar os arquivos para a equipe | Não exige lista especial; precisa do deploy. A resposta da equipe e a recuperação são etapas posteriores |
| Miniaturas 3D | WebGL 2, leitura válida do modelo, desenho estático pequeno e cache de 64 entradas. Falha usa o ícone | Não exige flag/lista. Precisa chegar no build publicado |
| Tela cheia do palco | O botão agora entra e sai; o navegador precisa oferecer a API de tela cheia e permitir a ação | Sem nova liberação de público; precisa do build publicado |
| Aquecimento da verificação | Não atende o executor Python. A reutilização atual falhou na prova real com duas abas da mesma identidade: a limpeza de uma falha derruba a outra execução. Também há suspensão após cinco minutos e limites de capacidade | Excluído da LG01. Exige correção e qualificação de concorrência, limpeza, suspensão e capacidade antes do deploy coordenado; não é liberação individual de crianças |
| Gravação causal do Pinta | No código atual vale para todos os perfis elegíveis, sem a antiga flag/lista. Exige conta válida, versões compatíveis e migrações. Conflito não significa mesclar automaticamente toda edição | A antiga lista de homologação não é mais uma pendência. O rollout técnico permanece necessário |
| Última gravação que falha na janela focal | Sair pode preservar a versão anteriormente confirmada e descartar a última mudança não gravada, com aviso. O armazenamento não inventa um sucesso | É uma condição de falha operacional, não uma restrição de acesso |
| Atualização no Mural | Atualiza o post associado ao mesmo projeto, preservando a publicação; não transforma todo envio histórico ou outro projeto em atualização daquele post | Sem flag especial nova; depende de Hub, Members e apps compatíveis |
| Identidade pública | Apelido público; nome completo confirmado pelo responsável para o uso privado/certificado. Perfis antigos podem precisar dessa confirmação | É uma ação do responsável, não liberação pela equipe de desenvolvimento |
| Compra/presente de curso | Feita pelo responsável. Perfil infantil ativo não opera checkout; produto/assinatura e regras de presente continuam condicionando acesso | É regra permanente de autorização e de oferta, não recurso inacabado |

Fontes complementares: [histórico](../../packages/studio/src/state/proProjectHistory.ts), [recursos desativados na aula](../../packages/studio/src/studio/lessonFeatures.ts), [execução leve](../../packages/studio/src/modes/pro/lightProRuntime.ts), [limites da ajuda](../../packages/core/src/creations/pinta-recovery-help.ts), [envio e recados](../../packages/member-shell/src/lib/pinta-recovery-help.ts), [ciclo do contêiner](../../packages/studio-runtime/src/check-container.ts), [aquecimento na aula](../../packages/member-shell/src/components/studio/section-project-check.tsx).

## Situação observada em produção

Após a LG01, os sete serviços estão saudáveis no commit `538ae843b7534239a715a1d0a6c2a9d32d54604d`, sem operação de deploy pendente. Os IDs completos e as provas de saúde estão no [recibo de produção](lg01-production-release.json).

| Serviço | Deployment (prefixo) | Estado |
| --- | --- | --- |
| Members | `f5ec1e52` | Saudável |
| Auth | `00960558` | Saudável |
| Hub | `562ce470` | Saudável |
| Gateway | `7670213d` | Saudável |
| Admin | `46fd8878` | Saudável |
| Community | `8a7762c7` | Saudável |
| Kids | `940cf0c2` | Saudável |

A pendência ampla de deploy identificada na coleta inicial foi atendida pela LG01; a LG02 entregou o aquecimento depois de sua qualificação. Isso não habilita os controles especiais nem conclui as integrações regionais acima. A fonte implantada é `0180e39fd`, o Worker é `99386c58`, e as duas aplicações usam a imagem qualificada. Catálogo Python `2c53c74…`, cursos e controles foram preservados. Cenários/Regiões, prévia isolada e origem da galeria de exemplos permanecem desabilitados em produção; a nova distribuição Python continua na LG08. [Provas posteriores ao deploy](../../docs/qa/2026-11-24-lg02-evidence/production-release.json).

### Publicação dos cursos confirmada no banco

Consulta após a implantação às 03:16 UTC de 24/11 (00:16 de São Paulo), por título/slug nos dois públicos. O estado de publicação dos cursos não arquivados permaneceu igual ao observado antes da onda. A tabela abaixo resume os resultados; [evidência atual](lg01-production-content-after.json) e [fotografia inicial preservada](production-course-status.json).

| Curso em produção | Estado do curso | Aulas publicadas/total | O que falta |
| --- | --- | --- | --- |
| A Ilha do Farol | **Publicada em Kids e Adultos** | **3/3 em cada público** | Já publicada por outra frente; acesso segue as regras normais da Jornada |
| O Jardim Secreto | Rascunho | 0/2 | Finalizar/conferir conteúdo e publicar |
| Meu primeiro desenho no Pinta | Rascunho | 0/1 | Finalizar/conferir conteúdo e publicar |
| Moedas no caminho | Rascunho | 0/1 | Finalizar/conferir conteúdo e publicar |
| A porta fica aberta por um tempo | Rascunho | 0/1 | Finalizar/conferir conteúdo e publicar |
| A sequência dos símbolos | Rascunho | 0/1 | Finalizar/conferir conteúdo e publicar |
| Duas peças para abrir | Rascunho | 0/1 | Finalizar/conferir conteúdo e publicar |
| Transformando o vilão em aliado (pais) | **Publicado** | **7/7** | Já não é uma pendência de publicação do curso; isso não comprova que cada revisão local de material já foi aplicada |

Os títulos **O baú dos símbolos**, **O segredo da cabana**, **A ponte apressada** e **Como ajudar seu filho autista nas frustrações** não foram localizados com esses nomes na busca por título/slug. É necessário reconciliar importação, título anterior ou vínculo do material antes de afirmar sua publicação. Não converti uma busca por nomes em prova de inexistência absoluta.

Os cursos Kids em rascunho consultados estão sem `career_slot`; a publicação também precisa conferir seu papel e modo de apresentação na Jornada, sem presumir que todos sejam cursos-base. Não consultei o catálogo ativo completo de todos os Workers externos; a ativação da distribuição Python específica continua uma pendência de confirmação/promoção própria.

## Revisão e verificação adicionais

A ampliação leu os fluxos novos de autorização, mensagem, migração, aquecimento e ciclo do contêiner. Foram repetidas as seleções afetadas:

| Seleção | Resultado |
| --- | --- |
| Runtime: check, capacidade e contratos | 39 passaram; [log](expanded-runtime.log) |
| Members: ajuda, objetivos e adaptador do executor | 40 passaram; [log](expanded-members.log) |
| Member-shell: ajuda, rotas e cartão dos objetivos | 17 passaram; [log](expanded-shell.log) |
| Core, Admin, gateway e Palco | 125 passaram; [log](expanded-edges-exact.log) |
| Ajuda na composição HTTP real do Members e PostgreSQL | 2 passaram; migração, deduplicação e recusas sem gravação; [log](expanded-help-db.log) |
| Miniaturas, incluindo a regressão nova | 16 passaram; [log](thumbnail-content-green.log) |
| Botão de tela cheia | 3 passaram: entrar/sair pelo botão, Esc e outro elemento em tela cheia; [log](expanded-fullscreen.log) |
| Esperas do Pinta nos três arquivos alterados | 231 passaram, sem falhas; [log](expanded-pinta-waits.log) |
| Imagem real do executor e comando de aquecimento | Imagem reconstruída; Chromium abriu/fechou como usuário 1000, sem rede; [build](expanded-runtime-image.log) |

A primeira seleção de Core/Admin/gateway/Palco encontrou uma cópia antiga de teste na pasta `output` por causa do filtro de caminhos do Bun. A seleção foi refeita com caminhos exatos `./packages/...`, que executou os quatro arquivos esperados e passou. Não foi um defeito de produto.

**R10 — miniatura desatualizada:** reproduzi o caso de dois modelos de mesmo id, tamanho e últimos bytes, mas conteúdo diferente. O cache devolvia a miniatura anterior. A chave passou a usar todo o conteúdo, conservando o limite de 64 entradas. [Antes](thumbnail-content-red.log), [depois](thumbnail-content-green.log).

**R11 — fixture do aquecimento não compilava:** a simulação de ausência do aluno omitia `viewerId`, embora o contrato aceite `string | null`, sem `undefined`. A fixture agora usa `null`, preservando a recusa de aquecimento sem aluno. A prova da interface passou. [Teste](expanded-shell-fixture-green.log).

Studio, runtime e Members passaram na primeira rodada de tipos da ampliação; Member-shell apontou R11, que foi corrigido e reexecutado com sucesso. [Rodada original](expanded-types-first.log), [reexecução do Member-shell](expanded-shell-types.log), [saída da reexecução](expanded-shell-types.exit). Essa rodada de tipos corresponde às entregas até `0a89ef2e3` e às correções R10/R11; os dois commits posteriores de tela cheia/esperas foram revistos e tiveram regressões próprias. O [consolidado adicional](expanded-verification.json) registra as seleções aprovadas, os quatro pacotes de tipos e o aquecimento na imagem Docker. Não tratei a soma como testes distintos dos executados na primeira etapa.

A medição Cloudflare ainda faltava na ampliação inicial e foi realizada na LG02: dez amostras alternadas por caminho, medianas de 7.682,5 ms com máquina nova e 3.497 ms com reutilização, em HTML pequeno. A matriz real de falhas e concorrência passou. Isso não mede carga/p95 nem garante esse tempo para jogos grandes; o 3D da sessão infantil final levou 36,4 s. [Método, resultados e limites](../../docs/qa/2026-11-24-lg02-aquecimento-seguro.md).

Na coleta inicial não houve liberação nem deploy. As entregas posteriores autorizadas de LG01/LG02 estão registradas acima; as demais liberações continuam em suas etapas próprias.
