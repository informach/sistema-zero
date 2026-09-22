# Correção da experiência “Uma vez e sempre”

## Objetivo

Fazer a primeira experiência do Dia 1 ensinar somente a diferença entre uma ação que acontece no
começo e outra que continua acontecendo, sem antecipar “quadro” nem contradizer a separação entre
criar e desenhar ensinada mais tarde.

## Decisões

- A nave já faz parte do simulador. A experiência não oferece “Criar a nave”.
- As duas fichas são “Ligar a nave” e “Mover a nave um pouquinho”. A primeira mostra a nave saindo
  do estado desligado e o motor ficando ativo uma única vez, sem afirmar que criar também desenha;
  a segunda mostra a repetição pelo deslocamento e pelo contador.
- O preset declara quais fichas comprovam cada meta. O motor deixa de supor que `paint`, `create` e
  `move` são sempre as fichas pedagógicas. Essa configuração mantém os outros usos da cena sem
  duplicar o motor.
- O manifesto declara o elenco completo do piloto: nave e asteroide. O palco não inventa papéis
  ausentes — isso poderia mudar o cenário derivado de outros presets — e a linha de chão só existe
  em cenários que realmente têm chão.
- A cena oferece somente avanço manual. O controle chama cada avanço de “passo”, pois a criança
  aprende o termo “quadro” apenas na seção 7. “Tempo” e “Mais devagar” saem desta cena.
- A atividade apresenta e executa a mesma sequência: ligar a nave em `Ao iniciar`, mover a nave em
  `Enquanto estiver rodando` e, somente depois de configurar as duas áreas, avançar cinco passos
  para comparar os contadores. O botão “Avançar 1 passo” fica abaixo das caixas de configuração,
  porque ele executa a montagem em vez de fazer parte dela.
- A criança toca ou focaliza uma ficha e escolhe a área de destino na própria bancada. O arrasto no
  computador continua como atalho, mas não há uma segunda grade permanente com os mesmos controles.
- A instrução manda usar “Voltar ao começo” antes de testar outra organização. Assim, uma ficha
  colocada em `Ao iniciar` depois do primeiro passo não parece defeituosa.
- A atividade não tem palpite nem pergunta final. As três descobertas já comprovam o conceito, e o
  quiz dedicado da seção 12 faz a avaliação.
- O validador de estado recusa tanto áreas desconhecidas quanto contadores negativos. A condição
  deixa de depender de uma associação incorreta entre dois `if` consecutivos.

## Ajuste da seção 3

O bloco `Preparar o jogo em tela cheia` já nasce com largura 800 e altura 480. O vídeo não manda
redigitar esses valores. Ele aproxima os campos e explica: 800 é a medida de um lado ao outro; 480
é a medida de cima para baixo. A criança confere os valores e escolhe apenas a cor escura do fundo.
O critério estrutural continua exigindo 800 × 480.

## Conteúdo e documentação

O manifesto, a proposta pedagógica e o roteiro de gravação ficam alinhados. O vídeo conceitual da
seção 2 apresenta as duas áreas — arrumação no começo e motor em repetição — antes da experiência.
As descrições antigas que citam três fichas, “Pintar o fundo”, “Criar a nave”, palpite ou pergunta
final no piloto são substituídas pelo novo desenho.

## Verificação

- Testes do motor provam um disparo no começo, um disparo por passo no motor, reinício obrigatório e
  rejeição de estado inválido.
- Testes do palco provam céu estrelado, nave e asteroide, ausência de cacto e linha de chão, nave
  ligada visível, interação única, botão de passo depois das caixas e ausência dos controles de
  tempo contínuo.
- A validação dos manifestos e os testes de deriva conferem o preset e os textos da aula.
- Typecheck, Biome e as suítes afetadas fecham o lote antes do commit em `staging`.
