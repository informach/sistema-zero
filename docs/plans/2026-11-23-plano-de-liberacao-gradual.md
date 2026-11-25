# Plano de liberação gradual das novidades

Registrado em 23/11/2026 para execução aos poucos. LG01 e LG02 foram concluídas em produção em 24/11; as demais etapas seguem os estados do quadro. Este registro permite retomar cada frente separadamente.

A prioridade é entregar à criança fluxos completos: criar, guardar, voltar depois e continuar usando o projeto nos destinos oferecidos. As melhorias prontas e a publicação de aulas podem avançar enquanto as integrações maiores são concluídas.

## Base do plano

- [Levantamento ampliado de funcionalidades, limitações e liberações](../../.audits/review-7-dias-2026-11-23/limitacoes-e-liberacoes.md).
- [Relatório da revisão e correções](../../.audits/review-7-dias-2026-11-23/relatorio.md).
- [Consulta de publicação dos cursos em produção](../../.audits/review-7-dias-2026-11-23/production-course-status.json).
- [Proposta de auditoria dos tetos e dos aparelhos reais](2026-11-23-auditoria-dos-tetos-proposta.md), para coordenar os jogos de referência e as medições sem duplicar o trabalho.

Os estados de produção citados pertencem ao levantamento de 23/11. Ao retomar uma etapa, conferir o código e a configuração vigentes antes de decidir o que ainda falta.

## Ordem e acompanhamento

| ID | Frente | Prioridade | Dependência principal | Estado |
| --- | --- | --- | --- | --- |
| LG01 | Primeira versão com correções e melhorias prontas | 1 | Contratos, migrações e aplicativos compatíveis | Concluída em produção em 24/11: sete serviços saudáveis, runtime/imagem qualificados, CI e provas finais aprovados. Aquecimento excluído |
| LG02 | Qualificação do aquecimento da verificação no executor real | 1 | Corrigir a vida compartilhada do contêiner e repetir as provas | Concluída em produção em 24/11: sete serviços em `0180e39fd`, Worker/imagem qualificados, CI, staging e aceite infantil aprovados. [Recibo e limites](../qa/2026-11-24-lg02-aquecimento-seguro.md) |
| LG03 | Publicação gradual das aulas | 1, em paralelo | Vídeos, atividades, materiais e Jornada conferidos | Parcial: A Ilha do Farol publicada por outra frente, 3/3 aulas em Kids e Adultos; demais cursos pendentes |
| LG04 | Fluxo regional completo do Pinta até a conta e o Mural | 2 | Integração do cliente com armazenamento e publicação compatíveis | Em qualificação: conta, abertura fria e primeira publicação aprovadas em staging; correção R2 da atualização do mesmo link em validação. Produção pendente. [Plano](2026-11-24-lg04-pinta-estudio-conta-mural.md) |
| LG05 | Regras e projeções novas do Pinta | 2 | Gravador, fila e leitores admitindo o formato novo | Pendente |
| LG06 | Abertura gradual do Molda Cenários | 3 | Oficina implantada, produto e faixas da Jornada conferidos | Pendente |
| LG07 | Habilitação da prévia isolada do Studio | 3 | Runtime e origens permitidas configurados | Pendente |
| LG08 | Promoção da nova distribuição Python | 3 | Qualificação e configuração coerentes em todas as pontas | Pendente |
| LG09 | Aparelhos reais e exemplos grandes para alunos | 4 | Fluxos completos e jogos de referência disponíveis | Pendente |
| LG10 | Integração e estreia do Arquipélago V2 | 4 | Mundo integrado e preservação dos dados existentes | Pendente |

LG01 e LG03 podem avançar sem esperar LG04, LG05 ou LG10. LG02 só entra na versão pública após sua qualificação. As liberações LG06, LG07 e LG08 devem ser feitas separadamente, para acompanhar o efeito de cada mudança.

## Primeira versão com melhorias prontas

**LG01** reúne as correções da revisão, miniaturas dos modelos 3D, botão que entra e sai da tela cheia, pedido de ajuda na recuperação do Pinta e atualização da publicação do mesmo jogo no Mural.

- [x] Conferir os commits, contratos e migrações que precisam acompanhar cada entrega.
- [x] Validar criação e reabertura no perfil infantil indicado, menu e miniaturas na prévia Admin e demais percursos/falhas nas provas automatizadas, com os limites descritos no recibo de aceite.
- [x] Implantar a versão compatível e registrar o resultado observado em produção.

Resultado: `538ae843b7534239a715a1d0a6c2a9d32d54604d`, sete serviços saudáveis, Worker e imagem qualificados, catálogo Python anterior preservado. O CI passou nos 13 jobs; rotas públicas, executor e preservação dos cursos passaram após a implantação. [Entrega e escopo do aceite](../qa/2026-11-23-lg01-melhorias-prontas.md), [recibo de produção](../../.audits/review-7-dias-2026-11-23/lg01-production-release.json). Na sessão compartilhada, fullscreen foi recusado pelo próprio navegador e passou nos testes reais de Chrome/CI; ajuda e Mural positivos foram verificados com PostgreSQL de teste, sem enviar recados ou posts reais.

**LG02** qualifica o aquecimento e a reutilização do contêiner em staging com o executor real.

- [x] Medir a primeira verificação e as seguintes no executor real, com jogos sintéticos; [resultados e limites da prova](../qa/2026-11-23-lg02-executor-real.md).
- [x] Concluir as provas de duas abas do perfil, aquecimento, execução e limpeza após corrigir a destruição compartilhada. A reserva SQLite com posse exclusiva passou os casos de falha na máquina reutilizável e preservou a outra aba.
- [x] Conferir isolamento entre perfis, limites de capacidade e comportamento quando o contêiner dorme.
- [x] Decisão de 23/11: excluir aquecimento e reutilização da LG01. Os pontos foram corrigidos e a qualificação hospedada passou em 24/11.
- [x] Concluir o CI da fonte final, repetir aquecimento/verificação e recusas nos aplicativos atualizados de staging e promover pelo fluxo canônico.

Resultado: PR #286, fonte `0180e39fd`, onda `45409371184`, sete serviços saudáveis e Worker `99386c58`. A imagem exata passou 66 cenários; a matriz hospedada cobriu falhas entre abas, capacidade, suspensão, Pro e navegação 3D. Duas abas autenticadas aprovaram 6/6 e 5/5 objetivos, sem prêmio duplicado. Main foi integrado normalmente em staging, preservando Jardim, vozes, apelido e quarto. Permanecem os limites de capacidade, cache de cinco minutos e duração dos objetivos; Python fica fora do aquecimento. [Fechamento e provas](../qa/2026-11-24-lg02-aquecimento-seguro.md).

Entradas posteriores ao plano: o apelido infantil editável e a correção de rolagem do quarto estão em staging, com revisão, tipos e aceite visual aprovados. A promoção será feita em versão própria, preservando os limites de identidade e as permissões do responsável; esses itens não entraram na LG02 de produção.

## Publicação das aulas

**LG03** começa por **Meu primeiro desenho no Pinta** e **Moedas no caminho**, assim que seus materiais estiverem finais. Depois seguem os demais cursos conforme a sequência pedagógica e sua prontidão.

- [ ] Conferir vídeo, instruções, atividade e material de cada aula contra a interface atual.
- [ ] Promover separadamente os materiais/cadastro do Jardim e o ajuste de concorrência da geração de voz já presentes em staging, conferindo retomada e respostas 429 do provedor.
- [ ] Conferir o papel do curso, o acesso e a apresentação na Jornada.
- [ ] Publicar individualmente e percorrer a aula com um perfil elegível.
- [ ] Reconciliar os títulos dos materiais com os registros do Admin antes de criar ou importar cursos.

Na primeira consulta de 23/11, **A Ilha do Farol** estava em rascunho com 0/3 aulas publicadas; **O Jardim Secreto**, com 0/2; **Meu primeiro desenho no Pinta** e **Moedas no caminho**, com 0/1 cada. Uma nova leitura de produção às 00:08 UTC de 24/11 (21:08 de 23/11 em São Paulo) confirmou **A Ilha do Farol publicada com 3/3 aulas em Kids e Adultos**, por outra frente. Members, Admin e Kids receberam o ajuste de 32 falas em `8d87bbff8`, já incorporado à LG01. Jardim, Pinta e Moedas continuam em rascunho. **Transformando o vilão em aliado** já estava publicado com 7/7 aulas e não é uma publicação nova desta etapa.

A proposta posterior do Construtor está no PR #287, em rascunho, com seis protótipos nativos e apoio de telas/reinício preparado. Sua receita Windows foi corrigida em `61de040ee`, preservando os projetos. Esse currículo segue revisão própria: importar e avaliar na interface/WebGL, concluir artes 3D e avaliação de aparelhos, fechar a matriz pedagógica e só então reescrever/publicar roteiros, manifestos e materiais. A prioridade dos cursos já listados na LG03 permanece. [Revisão e limites dos protótipos](../qa/2026-11-24-lg02-aquecimento-seguro.md).

## Integrações regionais do Pinta

**LG04** é a principal pendência técnica para oferecer materiais regionais no Studio com salvamento na conta e publicação.

- [ ] Integrar a captura e a biblioteca regional aos caminhos públicos do Studio.
- [ ] Concluir o uso do escritor compatível no cliente, incluindo adoção e leitura dos projetos anteriores.
- [ ] Comprovar o percurso: criar → importar → editar → salvar na conta → fechar → reabrir em outro aparelho → publicar → atualizar a publicação → jogar.
- [ ] Exercitar interrupção, trabalho offline, conflito entre abas e recuperação sem perda de referências.
- [ ] Conferir separadamente a compatibilidade dos blocos de aula legados.

**LG05** libera regras e projeções novas apenas quando o gravador, a fila, os leitores e os destinos preservarem os novos documentos. Elevar o teto anunciado do formato depende dessa integração.

O download regional já existe. A janela focal oferece edição leve; Avançado abre o editor completo. Esses caminhos devem ser preservados durante a evolução da integração.

## Liberações controladas

**LG06 — Molda Cenários:** abrir primeiro para a equipe, depois para uma lista pequena de crianças e, após acompanhar o uso, para o público elegível. Conferir produto Molda e faixas da Jornada. A ferramenta Regiões tem seu próprio controle e deve ter sua liberação acompanhada separadamente.

**LG07 — Prévia isolada:** implantar runtime e origens permitidas, validar os navegadores atendidos e habilitar o recurso em uma etapa própria. Acompanhar execução, erros e comportamento do editor; manter uma forma de retornar ao caminho anterior.

**LG08 — Python:** fechar a qualificação pendente e promover a mesma distribuição qualificada. Conferir Worker, serviços, catálogo, autorizações e origens/CSP dos aplicativos, preservando os projetos existentes e seus runtimes.

Para cada liberação:

- [ ] Registrar a configuração anterior e a configuração aplicada.
- [ ] Validar o percurso principal e as recusas com os perfis envolvidos.
- [ ] Acompanhar o uso antes de ampliar o público.
- [ ] Registrar a verificação e a forma de retorno à configuração anterior.

## Mundos grandes e Arquipélago V2

**LG09** usa os jogos de referência da auditoria dos tetos. Medir em notebook com GPU integrada e nos aparelhos móveis que serão atendidos. As medidas na RTX 3050 e o perfil de CPU reduzida não substituem esses aparelhos. Ajustar detalhe, distância e tamanho apenas quando as medidas indicarem a necessidade.

A galeria de exemplos grandes permanece para a equipe até a seleção de exemplos adequados a cada etapa da Jornada, com o percurso de criação, armazenamento e publicação comprovado.

**LG10** trata o Arquipélago V2 como uma entrega própria: concluir sua integração com o jogo usado pela criança e comprovar a preservação de progresso, casa e itens antes da estreia.

## Limites que podem ser mantidos

- Histórico local do Pro com até 50 versões ou 20 MiB por projeto, com comunicação clara de que é local e de quais conteúdos cobre.
- Cache de 64 miniaturas e uso do ícone quando não houver WebGL ou leitura válida do modelo.
- Compilação hospedada para os projetos que não forem compatíveis com a montagem local.
- Suspensão do contêiner após cinco minutos, sujeita aos resultados das medições de custo e latência.
- Compra pelo responsável e ferramentas compatíveis com as faixas da Jornada.

Histórico em nuvem fica como possível evolução conforme a necessidade observada. Os limites de memória, custo e armazenamento devem ser revistos com medidas, sem aumentos gerais antecipados.

## Como retomar cada etapa

Escolher um ID do quadro e registrar seu escopo antes de executar. Ao concluir, atualizar o estado, marcar os critérios atendidos e acrescentar links para os commits, verificações e configuração aplicada. Se uma etapa for dividida, manter a ligação com seu ID original.

| Data | ID | Resultado e evidências |
| --- | --- | --- |
| 24/11/2026 | LG02 | Concluída: PR #286, CI com 13 jobs, plano zero e onda canônica `45409371184` aprovados. Sete serviços em `0180e39fd`, Worker `99386c58`, duas aplicações saudáveis na imagem qualificada. Staging teve 20 serviços e aceite infantil aprovados; main integrado sem mudar seu conteúdo concorrente. Runtime, rotas públicas, catálogo, cursos e controles conferidos após o deploy. [Recibo e limites](../qa/2026-11-24-lg02-aquecimento-seguro.md) |
| 24/11/2026 | LG01 | Concluída: PRs #283/#285 integrados, CI com 13 jobs e plano aprovados, onda canônica `45315948453` concluída. Sete serviços em `538ae843b`, dois contêineres ready, HTTP 200 nas rotas públicas e no executor após o deploy. Cursos preservados; aquecimento permanece na LG02 |
| 23/11/2026 | Registro | Proposta preservada para execução gradual; etapas pendentes |
| 23/11/2026 | LG01 | Push reexecutado com 13 checks aprovados e PR #283 integrado normalmente. R15: índice vazio do GitHub impede o controlador de localizar o PR válido; correção isolada no PR #285, com 113 testes e prova readonly real aprovados, em qualificação remota |
| 23/11/2026 | LG01 | CI do PR, plano vazio e onda canônica aprovados; oito serviços no SHA final, menu e 24 miniaturas conferidos, projeto infantil reaberto salvo. O cancelamento da rodada automática deixou sete checks obrigatórios cancelados; reexecução integral solicitada, sem alterar proteção |
| 23/11/2026 | LG03 | Confirmada publicação concorrente de A Ilha do Farol: 3/3 aulas em Kids e Adultos. Leitura de produção, sem executar o publicador nem alterar conteúdo pela LG01. Os demais minicursos seguem em rascunho |
| 23/11/2026 | LG01 | R14 reproduzido e corrigido: gestos do Pinta conservam a prévia após deslocamento do papel. 76 testes UI e quatro percursos desktop/toque aprovados, tipos Pinta/Studio sem erros. Nova candidata `9a8a1a9f2` em CI e homologação |
| 23/11/2026 | LG01 | Miniaturas dos 24 modelos conferidas na prévia Admin autenticada. Defeito R13 no menu incorporado corrigido em `a5d684728`, com testes de regressão e navegador. Nova rodada final de CI, plano e staging em andamento; produção ainda pendente |
| 23/11/2026 | LG01 | Candidata em `release/lg01-melhorias-prontas-20261123`, baseada em `f8910ee05`, com aquecimento removido. [Escopo, dependências, provas e sequência de implantação](../qa/2026-11-23-lg01-melhorias-prontas.md) |
| 23/11/2026 | LG02 | Consulta autenticada ao executor real de staging: `/v1/check/warm` respondeu 404. Aquecimento e reutilização excluídos da candidata; faltam implantação e provas reais de falhas, concorrência e isolamento |
| 23/11/2026 | LG02 | Worker implantado em staging para a prova. Falha em uma aba derrubou outra verificação válida da mesma identidade; identidades diferentes passaram. [Reprodução R12 e contraprovas](../qa/2026-11-23-lg02-executor-real.md). A candidata LG01 passou no mesmo caso com contêineres exclusivos e substituiu o Worker de staging |
| 23/11/2026 | LG01 | Preparadas somente as listas de dependências do build em seis serviços de produção; deployments ativos preservados. Plano Railway atualizado: zero diferenças. CI completo do PR e implantação ainda em acompanhamento |
| 23/11/2026 | LG01 | Sessão QA localizada; host antigo de homologação recusava capacidades do catálogo novo, inclusive ao criar JavaScript. Contrato da candidata aceita a mesma resposta. Staging alinhada a `3664ae334`; implantação canônica restrita aos oito serviços da etapa no run `45251978046` |
| 23/11/2026 | LG03 | Revisados os commits concorrentes `d86ce9eab`, `9a03115e0` e `ca8c490a0`, com 81 testes aprovados. Missão do Jardim, caderno único e correção do operador preservados no trabalho local, fora da candidata congelada da LG01 |
