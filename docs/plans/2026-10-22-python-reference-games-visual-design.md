# Pac-Man e Space Arena como programas visuais completos

## Requisito e decisão

Em 22/10/2026 o usuário tornou explícito que os dois jogos, adaptados e melhorados,
devem poder ser construídos integralmente em blocos, Ponte e código. Cada jogo
precisa aparecer nos exemplos Python nas apresentações Blocos e Código. O usuário
autorizou criar/ajustar blocos quando a mudança melhorar o motor de forma geral.
Essa decisão substitui, para os novos exemplos educacionais, a antiga ausência de
compromisso com conversão visual integral dos programas de referência.

Construir um jogo não significa chamar um bloco que executa uma biblioteca com o
jogo escondido. Toda a lógica da partida deve ser representada por blocos Python
editáveis, com valores, condições, coleções, funções e chamadas Turtle normais.
Não pode haver bloco opaco de fonte na projeção dos exemplos.

## Arquitetura escolhida

Cada jogo terá uma implementação educacional em um `main.py` legível, com estado
em listas/dicionários e funções nomeadas. Desenho vetorial original e sons WAV
originais evitam dependência dos GIFs/sons de terceiros. O Python emitido usa
`turtle` oficial e o módulo portátil `sz_audio` já existente; exportação continua
incluindo o módulo desktop e seus requisitos pelo exportador canônico.

As duas entradas de galeria de cada jogo compartilham exatamente os mesmos fontes
e assets, criando projetos Clássicos que começam em Blocos ou Código. Ambos
permitem alternar para Ponte e para os outros modos. Os exemplos Pro existentes
continuam disponíveis. A factory da galeria passa a respeitar kind/mode declarados,
sem modificar a oferta administrativa de Python, o padrão JavaScript, autorização
de criação ou a escrita única após validação e autorização.

Alternativas consideradas: converter os programas originais avançados literalmente
exigiria herança e detalhes pouco úteis para a leitura infantil; embutir um motor
específico de cada jogo esconderia a programação. A implementação educacional
original mantém as mecânicas e explicita as adaptações no README, enquanto o corpus
antigo continua independente para verificar compatibilidade do runtime.

## Comportamentos preservados e melhorias

- Pac-Man: labirinto, paredes, pontos comuns/especiais, sete inimigos, perseguição,
  direção por setas, três vidas, respawn seguro, placar, vitória/derrota, sons,
  pausa e reinício. Temporização e velocidade aparecem como valores editáveis.
- Space Arena: início, impulso/freio/rotação e keyrelease, tiros, inércia, câmera,
  radar, limites, saúde/vidas/placar, pickups e partículas, pausa e reinício.
  Preservar pools de 25 inimigos, 30 mísseis, 20 estrelas, cinco powerups,
  30 partículas de explosão e 20 de exaustão; não reduzir a carga para aprovar QA.
- Um único encadeamento de `ontimer` por jogo; reinício não acumula callbacks.
  Encerramento interrompe áudio e atividade da partida. HUD e desenho do jogo
  possuem propriedade explícita, sem apagar a cena inteira por engano.
- Instruções e controles visíveis em português; fontes simples para explorar cor,
  velocidade e regras, mantendo código Python normal exportável.

## Motor, verificação e fronteiras

Se faltar representação de um construto, o ajuste será em um codec geral com
semântica Python preservada, testes positivos/negativos e regressão existente.
Nenhum ID de bloco ou autorização será acrescentado silenciosamente a uma release
imutável. Uma alteração que exija nova aprovação de host será tratada explicitamente.

Um qualificador reutilizável usa o analisador CPython pinado, exige zero nós opacos,
passa pelo Blockly real, salva/reabre e compara a árvore semântica. Em seguida
renderiza Python, analisa novamente e prova igualdade. Edições reais de campos
(cor/velocidade/coordenada) precisam mudar o código e sobreviver à reabertura.
Falha ou ausência de suporte deve produzir diagnóstico, nunca aprovação parcial.

Os testes de modelo não substituem executar os dois jogos e alternar os três modos
na interface. Provas gráficas serão seriais, com apenas os serviços necessários;
não se exigirá que o usuário feche seus aplicativos. Os resultados novos não
reclassificam recibos históricos nem dão aceite global de produção.
