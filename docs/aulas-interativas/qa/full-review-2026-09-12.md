# Full review — experiências v6 e 13 aulas do Corre Dino

Revisão do trabalho consolidado em `5ef348f8`, incluindo os contratos herdados de `c3f79880`. O repositório estava limpo no início desta revisão. As correções estão no diretório de trabalho; não houve publicação de aulas, upload de mídia ou alteração dos roteiros originais.

**Resultado:** foram encontrados e corrigidos oito problemas. O mais grave estava na aula 9: a referência de projeto verificava colisão uma única vez, na área de eventos, e o jogo não terminava ao bater. Os testes anteriores de sintaxe e estrutura não detectavam isso. A revisão acrescentou execução dos projetos no motor Jogo 2D.

## Achados e correções

| Prioridade | Achado reproduzido | Consequência | Correção |
| --- | --- | --- | --- |
| P1 | Aula 9 colocava `sz_g2d_on_sprite_group_overlap` em Quando acontecer | A verificação ocorria antes de existirem cactos; a partida continuava após a batida | Restaurada a montagem do original: dentro do então de Se jogando, a cada quadro, antes da faxina. Roteiro, manifesto e referências das aulas 9–13 corrigidos |
| P2 | Aula 11 aceitava e exemplificava o HUD fora de Se jogando | O placar aparecia no menu, contrariando a gravação; a referência também usava posição/tamanho diferentes | Critério exige o ramo jogando; referência usa x 12, y 30 e tamanho 24. Fala e montagem alinhadas ao original |
| P2 | Aulas 5 e 7 conferiam presença sem todas as relações de ordem necessárias | Cactos ou toda a partida podiam ficar cobertos pela floresta mesmo com aprovação | Acrescentada ordem dentro de encaixes específicos, reutilizando o avaliador comum. Critérios preservam fundo antes da partida e gravidade → controle → desenho → atualização/desenho dos cactos |
| P2 | Aula 12 aceitava dois blocos de criação: um com x correto, outro com VX correto | Critérios separados aprovavam um projeto que não montava a fórmula completa em um único cacto | Quantidade global de criação limitada a uma, também preservada na aula 13 e nas construções da aula 12 |
| P2 | O controlador juntava vários comandos de avanço antes de salvar | A observação vista com 3 cactos podia reaparecer com 30; servidor e tela representavam sequências diferentes | Comandos preservados na ordem e granularidade originais, mantendo segmentos limitados a 100 e a identidade de repetição de requisições |
| P2 | API recusava `blockType: ""` em encaixes internos, embora o editor criasse esse estado | O professor podia perder o salvamento enquanto escolhia uma peça | Rascunhos internos seguem o mesmo contrato do objetivo principal; critérios incompletos continuam barrados pelas verificações editoriais de publicação |
| P2 | API normalizava uma exigência com profundidade maior que quatro removendo a parte mais profunda | Um critério importado podia ser enfraquecido silenciosamente | Propriedade proibida declarada explicitamente no último nível; entrada excessiva retorna 422 |
| P3 | Professor podia escolher destaque Comparação em cenas sem esse painel | A escolha não produzia a visualização prometida | Opção oferecida apenas nas quatro cenas que têm comparação visual; configurações antigas incompatíveis recebem aviso para escolher Palco ou Controles |

Os sete primeiros achados foram cobertos por testes que falharam antes da correção correspondente e passaram depois. A restrição de Comparação foi identificada cruzando as opções de autoria com a renderização do aluno. Não foi criado um novo painel de comparação para as demais cenas.

Também foi corrigida a documentação de conclusão: depois de completar um experimento, os controles encerram a investigação. As comparações guardadas podem ser consultadas. Não se promete reabrir livremente o experimento concluído. Demonstrações continuam permitindo rever o roteiro.

## Cobertura das 13 aulas

Foram conferidos os 13 hashes dos originais, 88 mapas de clipes, 128 seções, critérios de autoria e projetos finais independentes. As 17 demonstrações em vídeo permanecem separadas dos 14 experimentos nativos.

| Aula | Relação pedagógica e técnica conferida | Evidência ou limite |
| --- | --- | --- |
| 1 | Preparar, descrever e criar antes de desenhar; x à direita e y para baixo | Critérios de construção e programa inicial; leitor de tela e coordenadas dependem dos clipes a produzir |
| 2 | Quadro, limpeza, floresta e desenho; retirada da borda | Programa executado e montagem com floresta após o Dino rejeitada |
| 3 | Gravidade separada de impulso; controle antes do desenho | Modelo nativo e projeto executados; os números da simulação não são apresentados como a física exata do Estúdio |
| 4 | Entrada de teclado versus acontecimento de pulo | Missão de som, retirada do evento provisório e execução do projeto; áudio físico não foi ouvido neste review |
| 5 | Nascimento periódico versus atualização por quadro; posição externa e velocidade negativa | Criação no relógio e programa executados; cactos desenhados antes do fundo agora são rejeitados |
| 6 | Fora da tela versus fora da memória; retirada do instrumento | Missão de população, critérios e programa executados; mantida retirada do medidor na aula 6 conforme o corpo do original |
| 7 | Condição de jogo protege quadro e relógio, preservando o fundo | Menu permanece sem cactos; ordem dentro dos ramos conferida |
| 8 | Ramos exclusivos e entrada por tecla/toque | Início por Enter exercitado; montagem do evento e dica conferidas |
| 9 | Colisão contínua, referência local ao cacto, efeitos e reinício | Colisão real e retorno a inicio após reinício exercitados; erro anterior corrigido |
| 10 | Desenho versus área de colisão | Missão de comparação, escala 80%, retirada do contorno e colisão/reinício executados |
| 11 | Memória, leitura da variável, tempo e frase composta | HUD ausente no menu inicial, pontos durante jogo e perda/reinício executados; contraste depende de inspeção da mídia/jogo final |
| 12 | Sortear posição e velocidade em entradas distintas | Programa executado; troca de entradas e dois nascimentos dividindo a fórmula rejeitados |
| 13 | Base de velocidade, limite com `>` e variação dos novos cactos | Após perda/reinício, início por toque e mais de 30 segundos simulados: novos cactos recebem −6, −7, −8, −9 e −10, sem ultrapassar a faixa; pontos continuam crescendo |

No teste prolongado da aula 13, os obstáculos são retirados pelo harness após cada quadro para isolar o relógio de dificuldade. Colisão e reinício são testados antes desse trecho. O teste não pretende representar uma criança sobrevivendo por 30 segundos.

## Verificação do software

**136 testes selecionados passaram, com zero falhas:**

- 56: catálogo, autoria, verificação do Estúdio, 13 projetos executados e 11 erros plausíveis de montagem.
- 52: core, progressão, modos de experiência, controlador, foco de mídia e formulários/ensaio do professor.
- 19: integração HTTP de aprendizagem, importação e critérios. Repositórios em memória.
- 9: interface de experimentação, demonstração e interações por controles acessíveis.

O teste do formulário também configura a nova exigência de ordem em um bloco dentro do então. O teste HTTP preserva essa exigência aninhada. A profundidade e a quantidade continuam limitadas; critérios antigos sem os novos campos permanecem válidos.

A revisão da persistência percorreu validação de comandos por missão/modo, checkpoints criados pelo servidor, comparação de sequência, hash de requisição, repetição idempotente e preservação de progresso mais recente durante o registro de uma tentativa. O repositório Drizzle serializa as gravações por proprietário antes de comparar a sequência. A execução real dessa concorrência no PostgreSQL permanece uma etapa não verificada nesta sessão.

As checagens de tipos de core, members, admin, studio e member-shell passaram. O comando deve ser executado no diretório do pacote (`bun run typecheck`); a primeira tentativa com `bunx --no-install tsc` na raiz não encontrou o binário e não conta como verificação.

## Interface e desempenho

A prévia local usa os componentes reais de aluno e professor, sem conta ou API de produção. As 14 cenas foram abertas em Chrome isolado, em 390 × 844 e com movimento reduzido: nenhuma apresentou erro de JavaScript, alerta ou rolagem horizontal. O experimento de colisão foi concluído pelo teclado, com comparação guardada e registro na prévia; os controles encerraram corretamente. Evidência: [captura em celular](full-review-evidencias/hitbox-mobile.png).

Na mesma largura, o professor alternou para demonstração, e o aluno concluiu as duas etapas usando Um passo e Próxima etapa. A conclusão foi registrada sem nenhum slider de manipulação; Rever desde o começo permaneceu disponível. Evidência: [demonstração em celular](full-review-evidencias/demonstracao-mobile.png).

Isso é um smoke test das cenas, não uma inspeção de todos os estados, uma auditoria completa com leitor de tela ou um percurso autenticado das 128 seções. O navegador integrado estava indisponível; foi usada uma instância local isolada. Duas tentativas de selecionar o modo usando correspondência exata do texto do label excederam o tempo; a inspeção do DOM mostrou que o label também contém os textos das opções, e a seleção foi feita pelo ID observado.

O [benchmark local](v6-runtime-benchmark.json) executou 10 mil comandos em cada um de três modelos. P95 por transição: aproximadamente 0,008 ms em impulso, 0,053 ms em nascimento e 0,007 ms em colisão; maior checkpoint medido: 8.512 bytes. Não mede renderização, disco, rede ou celular real. Preservar os avanços aumenta a quantidade de comandos enviados em relação à compactação anterior; o envio continua segmentado. Uma fila offline muito longa ainda precisa ser transmitida ao reconectar.

## Limites antes da entrega às crianças

- Os 88 clipes são planos de edição: faltam os vídeos, conferência dos timecodes, recortes, complementos e vinculação. Não foi avaliada a qualidade final de imagem, ritmo ou narração.
- Os manifestos reutilizam um Estúdio existente. É necessário conferir, no ambiente de revisão, extensão Jogo 2D, blocos liberados, identificadores e continuidade entre as aulas. Esta sessão não importou nem publicou em produção.
- Critérios estruturais verificam os requisitos declarados da seção. Eles não provam ausência de qualquer outro código incorreto, preservação de todos os requisitos das aulas anteriores, legibilidade, qualidade do som ou toda a jogabilidade. O professor ainda confere a entrega e o comportamento descrito nos roteiros.
- Banco descartável e percurso autenticado não foram executados. A integração HTTP com repositórios em memória não substitui isso.
- O ritmo de 8 a 12 seções por aula, a quantidade de leitura e o interesse das crianças precisam de observação com alunos. Não há evidência de aprendizagem ou engajamento medida nesta revisão.

## Como reproduzir

Na raiz, passar a pasta dos originais aos dois validadores:

```powershell
bun docs/aulas-interativas/qa/validar-revisao-completa.ts 'CAMINHO_DOS_ROTEIROS'
bun docs/aulas-interativas/qa/validar-revisao-aula-01.ts 'CAMINHO_DOS_ROTEIROS'
bun docs/aulas-interativas/qa/experience-benchmark.ts
```

Os projetos são executados por `packages/studio/src/blockly/__tests__/correDinoEditorial.test.ts`, a partir de `packages/studio`, para carregar o ambiente de testes do Blockly. Os demais arquivos de regressão estão em core/tests/project-relationships, member-shell/tests/experience-controller, members/tests/integration/project-pattern-schema e admin/tests/project-pattern-editor.

O gerador continua sendo a fonte dos manifestos e roteiros. Ao regenerar, aplicar o formatador do repositório aos JSONs para manter o diff legível. Os originais permanecem íntegros e são conferidos por hash.
