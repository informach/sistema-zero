# Integração de staging 973bebd82 no Estúdio

## Referências e isolamento

Origem anterior integrada: `deb6a3e36`. Novo fetch: `973bebd82`, nove commits adicionais no remoto. Integração exclusivamente em `estudio-missao-completar-20261118`; a referência de segurança `backup-estudio-before-973bebd82-20261119` aponta para `5b7eb0aa7`. Nenhuma escrita em staging/main, produção ou banco de alunos. Pinta/Molda foram consumidos a partir de commits existentes, sem edição autoral nas frentes paralelas.

A diferença inclui outras entregas, como materiais do curso para pais. A revisão aqui se concentra nos contratos e integrações do Estúdio, não afirma revisar cada arquivo dessas entregas alheias.

## Mudanças relevantes revisadas

- Galeria autorizada de cenários Molda com identidade de jogo/espaço/revisão, cancelamento por projeto/perfil, recusa de runtime incompatível, limite explícito e importação atômica pelo store existente. Os componentes usam os controles e tokens visuais do Estúdio. Dados binários de terreno são gerenciados na aba 3D; o store impede remover recursos ainda usados por cenas.
- Carregador canônico Three compartilhado pelos motores; captura os bytes e opções antes do await, confere cancelamento e descarta o resultado caso o cancelamento aconteça antes de retorná-lo. Não cria outro motor ou armazenamento. As guardas de identidade integral e metadados desta branch foram preservadas.
- Pinta: leitura da revisão física, colisões autorais em objetos/conjuntos, movimento varrido por eixo e leitores PNG/portátil consistentes. A geração Python e os contratos de versão/capacidade foram incorporados.
- Host: identidade da pessoa separada do namespace local, fonte autorizada/cancelável e retirada do provedor ao trocar de dono. As 39 provas do hook cobrem a integração com módulos e navegador isolados.

## Conflitos

Os únicos conflitos foram os arquivos gerados `python-playtest.generated.mjs` e `validation-profile.json`. Foram regenerados com `packages/studio-runtime/scripts/validation-profile.ts` a partir das fontes integradas, em vez de escolher um lado do arquivo minificado. O `--check` passou na sequência. Nenhum fonte dos dois lados foi descartado para resolver os conflitos.

## Evidência local atual

- Core geometria/imagem/formato Pinta: **41 testes / 1.024 asserções**, sem falhas.
- Estúdio fonte Molda/leitor PNG/Three/mapa/sincronia de imagem: **45 / 6.340**, sem falhas.
- Diálogo Molda: **26 casos / 100 asserções** no processo isolado, sem falhas.
- Host de bibliotecas: wrapper aprovou os **39 casos** do hook em processo isolado.
- Matriz documental dos cursos: **43 / 192**; projetos reais das aulas no Blockly: **15 / 43**, sem falhas.
- Perfil canônico regenerado e `--check` aprovado; geradores Python/Pinta/transformações conferidos; whitespace sem conflitos residuais.
- YAML do workflow validado. O workflow inclui agora o contrato de formato Pinta e o hook do host, e a qualificação Python inclui os dois novos ensaios físicos 1×/2× em interpretador real. Essas inclusões ainda não equivalem a resultados aprovados.

## Gates ainda em execução ou pendentes

A primeira medição inicial reprovou em 120.435 bytes gzip. A galeria colocava seu vocabulário exclusivo do editor no dicionário compartilhado pela lista. As 28 entradas de cada idioma foram movidas integralmente para `core/i18n/editor`, carregado pelo tradutor completo do Clássico/Pro. Uma comparação com o remoto confirmou os 56 textos originais sem alterações. A regressão nova falhou antes da separação e passou depois: 7 testes / 3.033 asserções. O gate de grafo agora proíbe também esse dicionário na carga inicial. Resultado: **366.205 bytes brutos / 119.332 gzip / dois arquivos / 43 asserções**, tetos mantidos. O diálogo repetido após a separação continuou aprovando os 26 casos / 100 asserções.

Typecheck completo, regressão ampla e fluxos de navegador da revisão integrada precisam ser executados e registrados. Os gates pesados desta integração serão executados também no GitHub, conforme autorização, e continuarão bloqueantes até confirmar o resultado da revisão exata. A CI da correção anterior `5b7eb0aa7` iniciou no run 44509538383; a integração precisa de sua própria execução. Não se declara o merge qualificado integralmente com base somente nos contratos acima.

Os roteiros ad hoc do produtor que leem arquivos de `output/cenarios-reforma/` não foram executados com assets privados. Os testes acima usam fixtures sintéticas versionadas. Homologação visual em todos os motores, streaming de mundos extensos, memória prolongada, host real de verificar/enviar e hardware físico continuam pendentes. A ativação v4 permanece em outro worktree, fora desta integração.
