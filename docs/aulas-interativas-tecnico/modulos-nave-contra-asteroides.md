# Nave Contra Asteroides — produção do Construtor

Revisão de 24/11/2026. Esta versão substitui as instruções editoriais anteriores que começavam com projeto vazio, construíam as telas e o reset, usavam meta 26 e intervalo de 40 quadros. As nove identidades das aulas foram conservadas. A produção está preparada para revisão; não afirma gravação, uso de serviço de voz, importação no Admin ou publicação.

## Referência de cadastro

Título, descrições de catálogo, públicos, slugs, posto, pré-requisitos, módulos, ordem, capa, material e duração estimada estão em [modulos.md do curso](../aulas-interativas/construtor/nave-contra-asteroides/modulos.md). O [mapa-de-aulas.md](../aulas-interativas/construtor/nave-contra-asteroides/mapa-de-aulas.md) enumera cada parte e sua conquista.

Nave é o curso da trilha 2D do segundo posto, Construtor(a), anterior a Patrulha Espacial. A Jornada publicada continua sendo a autoridade para acesso e promoção. O seed preserva os cursos existentes por slug e público; esta revisão não cria UUIDs alternativos de curso nem altera direitos. No curso Kids, preservar `nave-contra-asteroides`; o cadastro adulto correlato mantém `nave-contra-asteroides-adulto`. A produção de falas e avatares desta entrega é Kids. Não foi criado novo certificado; conservar a política já existente no cadastro.

## Decisão pedagógica aplicada

O inicial traz a nave, o cenário, as três telas e o fluxo de Enter/reinício. A guarda de `jogando` do laço principal vem vazia. O aluno constrói movimento, grupos de tiros e asteroides, evento de disparo, relógio de nascimento, colisões, pontos, vidas e condições de resultado. Quando cria o evento e o relógio, aplica a guarda já conhecida. A condição seleciona a tela pronta; a construção de layout das telas, gerenciamento de estado e reset desde o zero fica para a progressão posterior.

| Já preparado | Construído no curso | Testado sem reconstruir |
| --- | --- | --- |
| Palco 800×480, cenário, nave e sua caixa de contato | Setas laterais e limite | Abertura e Enter |
| Áreas e desenho básico | Espaço, grupo, nascimento, origem, movimento, desenho e limpeza dos lasers | Guardas da partida |
| Três telas, Enter e reinício | Grupo/relógio de asteroides e queda | Reinício limpo após os resultados |
| Guarda vazia de `jogando` no laço | Colisão do par, efeitos, pontos, vida/dano/proteção | Mesma mecânica nas diferentes imagens |
| Doze imagens incorporadas | Meta, comparação de vitória e prioridade de derrota | Telas prontas respondendo às condições construídas |

A aparência é a decisão livre: três opções de nave, cenário, asteroide e laser, combináveis nos seletores nativos. O curso não cobra uma imagem específica nem exige que a criança troque a imagem de que gostou. Meta, vidas, dificuldade e colisão não são campos de personalização. O programa continua com vinte acertos, três vidas, uma pedra a cada 1,5 segundo, um laser por toque e proteção de sessenta quadros. Uma pedra que escapa sem bater não tira vida nem soma ponto.

A partida encerra com uma única decisão: primeiro, vidas esgotadas → `derrota`; no `senão`, pontos ≥ meta → `vitoria`. Depois do resultado, as guardas interrompem as ações da partida. Enter chama o reinício preparado e volta à abertura; outro Enter começa a nova rodada.

## Fonte e derivados

| Responsabilidade | Arquivo |
| --- | --- |
| Configuração e export do curso | [qa/construtor-2d.ts](qa/construtor-2d.ts), `config2D` |
| Falas completas, personagens, Na tela, passos e testes | [qa/construtor-2d-conteudo.ts](qa/construtor-2d-conteudo.ts) |
| Bancadas e descobertas nativas | [qa/construtor-2d-experiencias.json](qa/construtor-2d-experiencias.json) |
| Progressão de 26 snapshots a partir do inicial aprovado | [qa/construtor-2d-projetos.ts](qa/construtor-2d-projetos.ts) |
| Objetivos oficiais por conquista | [qa/construtor-2d-criterios.ts](qa/construtor-2d-criterios.ts) |
| Geração comum com validação oficial | [qa/gerar-construtor-bases.ts](qa/gerar-construtor-bases.ts), [qa/construtor-base-gerador.ts](qa/construtor-base-gerador.ts) |
| Livro e diagramas dos blocos reais | [recursos/construtor-base](recursos/construtor-base/README.md) |
| Arquivos da revisão | [pasta do curso](../aulas-interativas/construtor/nave-contra-asteroides/README.md) |

Os derivados incluem nove propostas, nove roteiros de gravação, nove manifestos, nove masters ElevenLabs integrais, nove arquivos de criança e nove índices de edição. O master mantém a fala inteira; o arquivo Debinha/Dedé contém os parágrafos literais que serão substituídos na edição. Debinha participa das aulas ímpares e Dedé das pares. O Zappy permanece texto da página e não entra como terceira voz do áudio.

Há 53 partes, cinquenta vídeos planejados, quinze experiências, três quizzes de três questões e nove entregas. Os quizzes ficam em seções próprias, com Zappy e quiz, sem vídeo ou Estúdio. Cada montagem verifica a conquista da parte; a entrega da aula reúne a conferência e o envio. A última aula entrega antes do fechamento de compartilhamento, que é opcional.

A distribuição final atende à proposta aprovada: a primeira aula já entrega nave pilotável e limitada à tela, com o material somente na Parte 2. A segunda constrói o nascimento e a origem do laser ainda parado; a terceira constrói voo e retirada. A revisão de tiros/intervalos acontece na quarta aula, depois da experiência de surgimento. As nove identidades são preservadas, com a mudança semântica das três primeiras documentada no cadastro. Essa divisão evita concentrar onze partes numa aula de disparo e conserva uma ideia por montagem.

O Passo a passo do projeto usa as mesmas ações e testes da fonte editorial, com figuras geradas dos snapshots nativos. O mapa do aluno segue a construção por partes. Capa e galeria usam as artes aprovadas; não dependem de imagens externas para o jogo funcionar.

## Entradas e soluções

Os snapshots progressivos preservam doze SVGs incorporados e blocos reais do Estúdio. Não há `rawJS`. A entrada inicial é o arquivo aprovado, sem regra de movimento, tiro, relógio, pontos, vida ou resultado antecipada. As etapas isolam as mudanças: laser parado → origem lida da nave → voo → limpeza; retirada do par → efeitos → pontos; vidas preparadas → colisão → dano; vitória → derrota com resultado único.

As etapas de aparência e de conferência do início podem satisfazer os critérios desde a entrada. Isso é intencional e está explicado em `entryMayPass`: o objetivo é escolher ou conservar a arte e testar o que já foi construído. As entregas que retomam uma conquista também declaram esse motivo. Não se adicionou mudança artificial só para exigir um clique de verificação.

A abertura de todos os progressivos conserva a frase literal do inicial aprovado sobre vinte acertos. O completo de referência usa a variável `meta` na mesma apresentação. Essa diferença evita ler uma variável antes de criá-la e evita transformar a revisão em aula de edição das telas. A aparência e as regras finais são equivalentes; os arquivos aprovados em `prototipos-base` permanecem intactos. A entrega final atualiza apenas a descrição acessível para o texto do completo aprovado, com orientação explícita na fala e no livro.

## Experiências e critérios

As bancadas vêm do catálogo nativo já usado pelo Nave/Faísca. A do intervalo usa o preset retrocompatível `pedra-segundos`: 0,5 / 1 / 1,5 / 2 segundos. A da meta usa `vinte-acertos`, meta 20, início 17. Os defaults históricos foram conservados para outras aulas; essas duas bancadas usam os valores da missão atual em vez do intervalo histórico de quarenta quadros ou da meta 26.

O vídeo apresenta a ideia e a ligação com o jogo e convida a investigar. Os controles e as descobertas ficam na experiência guiada por Zappy. Não se simula uma parametrização inexistente por meio do texto. Os critérios do projeto usam os tipos oficiais de estrutura e execução. Valores lidos por execução apontam para dados reais, como `nave.x` e `tiros.items.length`.

As verificações de estrutura conferem escopo, encaixe e nomes. A presença de um bloco não é apresentada como prova completa de comportamento. O QA de runtime testa as mudanças entre etapas, inclusive tiro parado, origem, voo e retirada, colisão antes de pontos, vidas antes de dano, proteção, ambos os resultados e reinício. As [26 etapas passaram em 176 grupos de verificações](qa/relatorios/construtor-base-runtime-2d.json), no motor oficial com Canvas2D real. Os [147 objetivos cumulativos de execução](qa/relatorios/construtor-base-objetivos-2d.json) também passaram, com observações escalares, checkpoints desde o passo zero, estabilização de 250 ms, codec e avaliador oficiais. Os critérios finais conservam os sistemas anteriores; mutações que os removem ou alteram regras são recusadas.

As [quinze bancadas passaram com suas 39 metas](qa/relatorios/construtor-2d-experiencias.json). O ensaio abre as atividades da própria fonte editorial, confere que nenhuma começa concluída ou com descobertas e percorre ações públicas da sessão oficial até a conclusão. O intervalo de 1,5 segundo produz duas pedras em três segundos; a comparação maior ou igual vence em vinte, e maior que precisa de vinte e um. O runner reproduzível está em [construtor-2d-experiencias.ts](recursos/construtor-base/construtor-2d-experiencias.ts).

## Produção e gravação

Os gestos de Na tela seguem a [ESPEC-ROTEIRO](ESPEC-ROTEIRO.md), com categorias completas e idempotentes, rótulos visíveis, destino antes de buscar o bloco e a sequência de testar → corrigir se necessário → verificar → avançar. `enviar projeto` representa a abertura e confirmação do envio no palco de gravação.

Dois campos `vy` têm um zero igual ao de `vx`. O seletor textual do palco não distingue esses dois zeros pelo nome interno do socket. As notas de edição localizam o último número, depois de `vy`, e pedem captura manual precisa desse campo, sem inventar um verbo automatizado. A cor é um quadrado visual: a edição abre esse quadrado com captura precisa e usa o campo nativo `Cor em hexadecimal`, seguido de `OK`; não trata o código HEX como texto visível do bloco. Jogadas dependentes do sorteio — alinhar, acertar, deixar colidir, chegar aos resultados — também têm direção de captura de uma partida real. Essas notas técnicas não aparecem no texto infantil nem nas falas do ElevenLabs; a criança recebe a localização concreta de cada campo e os passos completos do seletor de cor.

A gravação não foi executada nesta revisão. `plannedVideo` permanece planejado. Não gerar voz paga, importar manifestos, mudar cadastro adulto, publicar conteúdo ou reemitir certificados como efeito do gerador local.

A revisão cruzada da autoria conferiu rótulos e defaults nativos, destinos, leitura da posição da nave, sinal das velocidades, guardas, colisões e prioridade dos resultados. Os textos foram corrigidos na fonte antes de regenerar. O reconhecimento estático de um gesto não comprova sua resolução na interface: o Verificar plano do palco e a captura final ainda precisam do ensaio de produção.

## Conferência e referências

Executar o gerador comum, a validação de manifestos/roteiros e o runtime do curso antes de integrar uma nova revisão. Os geradores antigos do Nave encaminham para a fonte atual, para impedir que uma execução posterior recoloque o curso de projeto vazio. O documento histórico foi substituído por esta orientação corrente; sua versão anterior permanece no histórico do Git.

Referências que sustentam a revisão:

- [Jornada do Criador no commit de estudo](https://github.com/informach/sistema-zero/blob/e085f7456a0ca76e139c4420fd38a7698191e688/docs/jornada-do-criador.md).
- [Identidades, públicos e publicação do seed](https://github.com/informach/sistema-zero/blob/e085f7456a0ca76e139c4420fd38a7698191e688/docs/jornada-criador-seed.md).
- [Diretrizes pedagógicas](https://github.com/informach/sistema-zero/blob/e085f7456a0ca76e139c4420fd38a7698191e688/docs/aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md).
- [Contrato de roteiro e gestos](https://github.com/informach/sistema-zero/blob/e085f7456a0ca76e139c4420fd38a7698191e688/docs/aulas-interativas-tecnico/ESPEC-ROTEIRO.md).
- [Referências aprovadas em JSON](https://github.com/informach/sistema-zero/tree/3a7fb2c2edda8d461e1d8fdc64bfd80bc6138795/docs/aulas-interativas/construtor/prototipos-base/2d).
