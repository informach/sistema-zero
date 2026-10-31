# Cinco quadros complementares do Recife

Conferência local de 30/10/2026, base Git `6461f19c0` com o lote L03 em edição.
Os manifestos não foram importados no Admin e nenhum banco remoto foi acessado.

## Conteúdo e provas

Os quadros 1 a 5 completam as ações descritas no README da pasta Recife. Kids e adulto têm
manifestos separados. Os quatro desafios Kids anteriores foram comparados semanticamente com
`git show HEAD:docs/desafios-do-jogo/recife/recife.manifesto.json`: permaneceram idênticos.

- Fonte, contrato e HTTP em memória: determinismo, repertório real até Inventor, importação,
  exportação e reimportação por público. Sem blocos concedidos manualmente.
- Blockly: 36 projetos dos dois públicos abrem e geram exatamente os mesmos arquivos.
- Executor oficial: 5 testes, 165 asserções, 23 cenários, todos aprovados em 83,11 s. Cada
  gabarito aprova seus três objetivos; cada inicial reprova todos. Os demais cenários recusam
  falta de reinício, direção fixa, capacidade excedida, cesta não esvaziada, cuidado duplicado,
  disparo em voo, chave não consumida e abertura sem chave. Zero casos ignorados.
- Visual: 10 casos, computador 1280 × 844 e celular emulado 390 × 844, teclado e toque CDP.
  Cada caso executa a ação, verifica o estado, captura a tela e reinicia. Sem rolagem horizontal,
  erro de página/console ou recurso externo. Contextos e navegador encerrados.

## Capturas

| Quadro | Computador | Celular emulado |
| --- | --- | --- |
| Corrente | [Abrir](r1/quadro-1-computador.png) | [Abrir](r1/quadro-1-celular.png) |
| Conchas | [Abrir](r1/quadro-2-computador.png) | [Abrir](r1/quadro-2-celular.png) |
| Corais | [Abrir](r1/quadro-3-computador.png) | [Abrir](r1/quadro-3-celular.png) |
| Bolha | [Abrir](r1/quadro-4-computador.png) | [Abrir](r1/quadro-4-celular.png) |
| Chave | [Abrir](r1/quadro-5-computador.png) | [Abrir](r1/quadro-5-celular.png) |

[Resultado visual](r1/resultado.json). Os comandos reproduzíveis estão no
[README do conteúdo](../../desafios-do-jogo/recife/README.md).

## Falhas corrigidas e limites

A primeira autoria usava posicionamento absoluto fora da lista de blocos ensinados. Foi
substituído por velocidade, movimento e leitura de posição já ensinados. A primeira conta
com incremento negativo foi normalizada para subtração, conforme o Blockly. O ensaio flagrou
um formato incorreto de velocidade numérica no IR, corrigido para expressão numérica. Não foi
alterada a permissão do motor nem enfraquecido o schema para aceitar esses erros.

O teste local de repertório inicialmente omitia os cursos Cadê Todo Mundo e Ilha do Farol,
que já eram conferidos pelo contrato; agora também os lê. A aritmética foi vinculada ao
repertório do Dino, concluído antes da abertura do Recife. Opacidade não exige uma conquista
nova no Explorador. Logs negativos preservados no cache local.

Celular físico, desempenho em GPU real, abertura pelo Quadro das Cores com aluno autenticado,
importação/publicação e implantação permanecem fora desta prova. O navegador usa a prévia real
do Estúdio e a execução oficial local, sem sessão da plataforma.
