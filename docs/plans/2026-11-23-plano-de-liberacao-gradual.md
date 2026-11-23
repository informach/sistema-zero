# Plano de liberação gradual das novidades

Registrado em 23/11/2026 para execução aos poucos. A LG01 está em execução; as demais etapas seguem os estados do quadro. Este registro permite retomar cada frente separadamente.

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
| LG01 | Primeira versão com correções e melhorias prontas | 1 | Contratos, migrações e aplicativos compatíveis | Em execução: candidata isolada, implantação pendente |
| LG02 | Qualificação do aquecimento da verificação no executor real | 1 | Corrigir a vida compartilhada do contêiner e repetir as provas | Não qualificada: falha entre abas reproduzida; excluída da LG01 |
| LG03 | Publicação gradual das aulas | 1, em paralelo | Vídeos, atividades, materiais e Jornada conferidos | Pendente |
| LG04 | Fluxo regional completo do Pinta até a conta e o Mural | 2 | Integração do cliente com armazenamento e publicação compatíveis | Pendente |
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
- [ ] Validar os percursos afetados com o perfil real da criança, incluindo falhas e mensagens de recuperação.
- [ ] Implantar a versão compatível e registrar o resultado observado em produção.

**LG02** qualifica o aquecimento e a reutilização do contêiner em staging com o executor real.

- [x] Medir a primeira verificação e as seguintes no executor real, com jogos sintéticos; [resultados e limites da prova](../qa/2026-11-23-lg02-executor-real.md).
- [ ] Concluir as provas de duas abas do perfil, aquecimento, execução e limpeza após corrigir a destruição compartilhada. A sobreposição com falha já reproduziu R12; o caminho seguro por pedido passou a contraprova.
- [ ] Conferir isolamento entre perfis, limites de capacidade e comportamento quando o contêiner dorme.
- [x] Decisão desta rodada: excluir aquecimento e reutilização da LG01. Reabrir a decisão após corrigir e qualificar os pontos pendentes.

## Publicação das aulas

**LG03** começa por **Meu primeiro desenho no Pinta** e **Moedas no caminho**, assim que seus materiais estiverem finais. Depois seguem os demais cursos conforme a sequência pedagógica e sua prontidão.

- [ ] Conferir vídeo, instruções, atividade e material de cada aula contra a interface atual.
- [ ] Conferir o papel do curso, o acesso e a apresentação na Jornada.
- [ ] Publicar individualmente e percorrer a aula com um perfil elegível.
- [ ] Reconciliar os títulos dos materiais com os registros do Admin antes de criar ou importar cursos.

Na consulta de 23/11, **A Ilha do Farol** estava em rascunho com 0/3 aulas publicadas; **O Jardim Secreto**, com 0/2; **Meu primeiro desenho no Pinta** e **Moedas no caminho**, com 0/1 cada. **Transformando o vilão em aliado** já estava publicado com 7/7 aulas e não deve ser tratado como uma publicação nova pendente.

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
| 23/11/2026 | Registro | Proposta preservada para execução gradual; etapas pendentes |
| 23/11/2026 | LG01 | Candidata em `release/lg01-melhorias-prontas-20261123`, baseada em `f8910ee05`, com aquecimento removido. [Escopo, dependências, provas e sequência de implantação](../qa/2026-11-23-lg01-melhorias-prontas.md) |
| 23/11/2026 | LG02 | Consulta autenticada ao executor real de staging: `/v1/check/warm` respondeu 404. Aquecimento e reutilização excluídos da candidata; faltam implantação e provas reais de falhas, concorrência e isolamento |
| 23/11/2026 | LG02 | Worker implantado em staging para a prova. Falha em uma aba derrubou outra verificação válida da mesma identidade; identidades diferentes passaram. [Reprodução R12 e contraprovas](../qa/2026-11-23-lg02-executor-real.md). A candidata LG01 passou no mesmo caso com contêineres exclusivos e substituiu o Worker de staging |
| 23/11/2026 | LG01 | Preparadas somente as listas de dependências do build em seis serviços de produção; deployments ativos preservados. Plano Railway atualizado: zero diferenças. CI completo do PR e implantação ainda em acompanhamento |
| 23/11/2026 | LG01 | Sessão QA localizada; host antigo de homologação recusava capacidades do catálogo novo, inclusive ao criar JavaScript. Contrato da candidata aceita a mesma resposta. Staging alinhada a `3664ae334`; implantação canônica restrita aos oito serviços da etapa no run `45251978046` |
| 23/11/2026 | LG03 | Revisados os commits concorrentes `d86ce9eab`, `9a03115e0` e `ca8c490a0`, com 81 testes aprovados. Missão do Jardim, caderno único e correção do operador preservados no trabalho local, fora da candidata congelada da LG01 |
