# Cinco quadros da Ilha das Nuvens

Conferência local de 30/10/2026 sobre `6461f19c0` e L03 em edição. Sem implantação,
importação no Admin ou acesso a banco remoto.

Os quadros aplicam limites de reserva, faixa de luz, ocupação, consumo de dois recursos e retirada de uma lista. No quinto, o Para cada vem montado com corpo vazio. Falta somar e destruir a flor da vez, sem contar a colheita novamente.

## Evidências

- Vale e Nuvens, juntos: 38 testes de fontes/contrato/HTTP em memória, 6.665 asserções,
  sem falhas. Os 72 projetos dos dois públicos passam pela ida e volta Blockly com arquivos
  idênticos (2 testes, 144 asserções). Os quatro desafios Kids antigos de cada ilha permanecem
  integralmente iguais ao JSON de HEAD.
- Executor inicial das duas ilhas: 8 testes aprovados e 2 negativos reais de autoria. O
  diagnóstico encontrou a observação errada `flores.length` e a suposição de que opacidade
  padrão viria como um campo numérico, quando o motor deixa o campo ausente.
- Após correção: os 2 quadros afetados passaram, 60 asserções, 8 cenários em 25,27 s. O grupo
  é observado por `flores.items.length`; os ninhos têm opacidade inicial 100 explícita. As
  regras de coleta e os negativos não foram enfraquecidos. São 42 cenários distintos entre
  as duas ilhas, 21 nesta, com iniciais, gabaritos e erros causais.
- Visual: 10 casos nesta ilha, 1280 × 844 e 390 × 844, teclado/toque CDP, ação e reinício
  reais. Nenhum recurso externo, erro de página/console ou rolagem lateral. Navegador fechado.
- A primeira tipagem encontrou `quadro` possivelmente nulo num teste. O ensaio agora recusa
  explicitamente um complementar sem número antes de começar. A tipagem final de cada pasta
  terminou com exit 0. Biome conferiu os 28 arquivos TS/MJS afetados, sem ajustes pendentes.

## Capturas

| Quadro | Computador | Celular emulado |
| --- | --- | --- |
| Reserva de água | [Abrir](r1/quadro-1-computador.png) | [Abrir](r1/quadro-1-celular.png) |
| Luz na medida | [Abrir](r1/quadro-2-computador.png) | [Abrir](r1/quadro-2-celular.png) |
| Canteiros livres | [Abrir](r1/quadro-3-computador.png) | [Abrir](r1/quadro-3-celular.png) |
| Dois recursos | [Abrir](r1/quadro-4-computador.png) | [Abrir](r1/quadro-4-celular.png) |
| Colheita da lista | [Abrir](r1/quadro-5-computador.png) | [Abrir](r1/quadro-5-celular.png) |

[Resultado visual](r1/resultado.json). Comandos no
[README do conteúdo](../../desafios-do-jogo/nuvens/README.md).

A mediação do laço preparado precisa ser conferida na publicação, pois seu bloco ainda não
consta nos cursos locais. Os testes não concedem blocos. Celular físico, desempenho de GPU,
fluxo autenticado pelo Quadro das Cores e implantação continuam no aceite integrado.
