# Nave Contra Asteroides

Curso da trilha **2D do posto Construtor**, depois do Faísca e antes de Patrulha Espacial. A revisão de 24/11/2026 reúne **9 aulas, 53 partes, 15 experiências, 3 quizzes e 26 projetos progressivos**. Ela preserva o slug `nave-contra-asteroides`, as nove identidades de aula e a cadeia de continuidade do projeto.

A nave, o cenário, as telas de início/vitória/derrota, o Enter e o reinício já chegam preparados. A criança constrói movimento, disparos, asteroides, colisões, pontos, vidas e as condições que escolhem o resultado. Usa a guarda conhecida de `jogando` ao criar novos eventos e o relógio; testa o começo e o reinício, sem reconstruir essa arquitetura. A construção completa a partir de um projeto sem blocos fica para o Inventor.

As escolhas livres mudam **somente aparência**. O projeto inclui três imagens de nave, três cenários, três asteroides e três lasers, todos incorporados ao JSON. A meta continua em vinte acertos, a nave começa com três vidas e uma pedra nasce a cada 1,5 segundo. As variações preservam os tamanhos, a colisão e as regras.

## Materiais do curso

| Material | Arquivo |
| --- | --- |
| Cadastro, descrições, módulos, pré-requisitos e ordem | [Módulos e cadastro](modulos.md) |
| Mapa de todas as partes | [Mapa de aulas](mapa-de-aulas.md) |
| Passo a passo para a criança | [PDF](passo-a-passo-do-projeto.pdf) e [texto de referência](passo-a-passo.md) |
| Capa com as artes aprovadas | [capa.jpg](capa.jpg) |
| Começo preparado, para importar no Estúdio | [Projeto inicial](projeto-inicial.szproject.json) |
| Jogo completo do curso, para importar no Estúdio | [Projeto final](projeto-final.szproject.json) |
| Entrada e solução de cada conquista | [26 projetos progressivos](projetos/) |
| Nomes dos blocos, categorias e primeira montagem | [Inventário de blocos](blocos-usados.md) e [inventário técnico](blocos-usados.json) |
| Tipos liberados no Estúdio das aulas | [blocos.json](blocos.json) |
| Falas, passos, testes e partes em formato estruturado | [curso-autoria.json](curso-autoria.json) |
| Experiências e falas internas do Zappy | [zappy-etapas.json](zappy-etapas.json) |
| Resultado das verificações editoriais | [validacao-autoria.json](validacao-autoria.json) |

O jogo usa teclado: setas esquerda/direita para mover, um toque em Espaço por laser e Enter para começar. Depois de um resultado, Enter retorna à abertura; outro Enter inicia uma nova partida. Um asteroide que escapa sem bater não tira vida. As doze imagens viajam dentro de cada projeto, sem depender de uma biblioteca remota de artes.

## Aulas e produção

O conteúdo de cada aula registra objetivo, entrada, saída e decisões de montagem. O roteiro contém fala integral, direção de tela e tabela de substituições dos personagens. O master ElevenLabs conserva a aula inteira na voz da professora. Na edição Kids, as frases exatas indicadas são substituídas pela Debinha nas aulas ímpares e pelo Dedé nas pares; o restante do master continua igual. O `.edicao.json` fornece clipe, personagem, ocorrência e âncoras para essa montagem.

| Aula | Conteúdo | Roteiro | Manifesto | Master |
| --- | --- | --- | --- | --- |
| 1. Prepare o voo da sua nave | [Abrir](nave-contra-asteroides-primeira-nave.md) | [Abrir](nave-contra-asteroides-primeira-nave.roteiro.md) | [JSON](nave-contra-asteroides-primeira-nave.manifesto.json) | [TXT](nave-contra-asteroides-primeira-nave.elevenlabs.txt) |
| 2. Faça o laser nascer na nave | [Abrir](nave-contra-asteroides-dia-1.md) | [Abrir](nave-contra-asteroides-dia-1.roteiro.md) | [JSON](nave-contra-asteroides-dia-1.manifesto.json) | [TXT](nave-contra-asteroides-dia-1.elevenlabs.txt) |
| 3. Faça os lasers voar e sair do jogo | [Abrir](nave-contra-asteroides-dia-2.md) | [Abrir](nave-contra-asteroides-dia-2.roteiro.md) | [JSON](nave-contra-asteroides-dia-2.manifesto.json) | [TXT](nave-contra-asteroides-dia-2.elevenlabs.txt) |
| 4. Faça os asteroides cair | [Abrir](nave-contra-asteroides-chuva-de-asteroides.md) | [Abrir](nave-contra-asteroides-chuva-de-asteroides.roteiro.md) | [JSON](nave-contra-asteroides-chuva-de-asteroides.manifesto.json) | [TXT](nave-contra-asteroides-chuva-de-asteroides.elevenlabs.txt) |
| 5. Faça o tiro acertar o asteroide | [Abrir](nave-contra-asteroides-dia-3.md) | [Abrir](nave-contra-asteroides-dia-3.roteiro.md) | [JSON](nave-contra-asteroides-dia-3.manifesto.json) | [TXT](nave-contra-asteroides-dia-3.elevenlabs.txt) |
| 6. Conte os acertos | [Abrir](nave-contra-asteroides-pontos.md) | [Abrir](nave-contra-asteroides-pontos.roteiro.md) | [JSON](nave-contra-asteroides-pontos.manifesto.json) | [TXT](nave-contra-asteroides-pontos.elevenlabs.txt) |
| 7. Dê três vidas à nave | [Abrir](nave-contra-asteroides-dia-4.md) | [Abrir](nave-contra-asteroides-dia-4.roteiro.md) | [JSON](nave-contra-asteroides-dia-4.manifesto.json) | [TXT](nave-contra-asteroides-dia-4.elevenlabs.txt) |
| 8. Confira o início e escolha o visual | [Abrir](nave-contra-asteroides-comecar-partida.md) | [Abrir](nave-contra-asteroides-comecar-partida.roteiro.md) | [JSON](nave-contra-asteroides-comecar-partida.manifesto.json) | [TXT](nave-contra-asteroides-comecar-partida.elevenlabs.txt) |
| 9. Termine e recomece a partida | [Abrir](nave-contra-asteroides-dia-5.md) | [Abrir](nave-contra-asteroides-dia-5.roteiro.md) | [JSON](nave-contra-asteroides-dia-5.manifesto.json) | [TXT](nave-contra-asteroides-dia-5.elevenlabs.txt) |

Os arquivos de personagem usam o mesmo prefixo da aula e o sufixo `.debinha.elevenlabs.txt` ou `.dede.elevenlabs.txt`. Cada aula tem também seu `.edicao.json`. Eles são gerados junto com o master; não editar somente um derivado.

## Sequência e conclusão

As construções avançam em conquistas observáveis: a primeira aula já termina com movimento e bordas; na segunda, o laser nasce na nave ainda parado, e na terceira aprende a voar e sair do grupo. A colisão retira o par antes de ganhar efeito e ponto; as vidas aparecem antes de receber dano; a vitória funciona antes de ser organizada com a derrota. As experiências apresentam o conceito antes de aplicá-lo no jogo. Os quizzes retomam decisões e previsões nas aulas 4, 6 e 9, depois das experiências correspondentes.

Há um envio por aula. Nas partes intermediárias, a criança verifica a montagem e continua no mesmo projeto. Na última aula, o envio final vem antes do convite opcional de publicar no Mural. Publicar não é requisito para concluir. Conservar a política de certificado e o cadastro existentes; esta revisão não cria certificado nem promessa de promoção ao próximo posto. A promoção continua seguindo a [Jornada do Criador](../../../jornada-do-criador.md).

## Autoria, revisão e aplicação

A fonte única está em [construtor-2d-conteudo.ts](../../../aulas-interativas-tecnico/qa/construtor-2d-conteudo.ts), com [configuração](../../../aulas-interativas-tecnico/qa/construtor-2d.ts), [projetos](../../../aulas-interativas-tecnico/qa/construtor-2d-projetos.ts), [critérios](../../../aulas-interativas-tecnico/qa/construtor-2d-criterios.ts) e [experiências](../../../aulas-interativas-tecnico/qa/construtor-2d-experiencias.json). A [orientação técnica](../../../aulas-interativas-tecnico/modulos-nave-contra-asteroides.md) reúne contratos, validação, limitações da captura e comandos de reprodução.

Os protótipos aprovados permanecem em [prototipos-base/2d](../prototipos-base/2d/). A solução do curso mantém as mesmas regras e artes; conserva a abertura literal do inicial, para não ensinar a remontar as telas ou exigir a variável `meta` antes de sua aula. Os exemplos progressivos são versões de apoio e não substituem silenciosamente a criação da criança.

Esta pasta contém produção local preparada para revisão. Os `plannedVideo` ainda precisam de voz, gravação, edição e conferência. O PDF deve ser anexado na parte de material da primeira aula. Os novos presets das bancadas de intervalo e meta devem acompanhar o aplicativo antes de usar os manifestos. Resolver curso e aulas existentes por identidade e preservar histórico, progresso e entregas. Não houve importação no Admin, publicação nem geração paga de voz nesta produção.

Para o contexto da evolução Faísca → Construtor → Inventor, consulte a [proposta dos cursos base](../proposta-cursos-base-2026-11-24.md). A autoria desta pasta substitui os roteiros anteriores de Nave; as referências antigas não orientam a montagem atual de telas nem escolhas de dificuldade.
