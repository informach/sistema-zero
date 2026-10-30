# Amizade e diário no navegador local

Conferência de desenvolvimento de L02 e parte de L06. Ainda não é aceite da entrega integral,
teste de banco remoto, implantação ou medição de desempenho em aparelho físico.

## Ações realizadas

O verificador `packages/arquipelago/playground/verificar-amizade-browser.ts` abre o jogo local
com salvamento V17 e amizade 170. Usa o gesto E no computador e Usar no celular, conversa,
entrega um presente preferido, entrega o pedido diário, fecha e recarrega. Confere 230 pontos,
pedido entregue, inventário conservado e ausência de nova recompensa no mesmo dia. Nas três
ilhas com página por amizade, abre o diário e confere o texto completo. Maré conserva a página
do navio, sem duplicação de conquista.

| Tentativa | Casos | Resultado | Evidência |
| --- | --- | --- | --- |
| Iriê r1 | Kids e adulto, computador e celular | 4 positivos | `irie-r1/resultado.json` e 8 PNG |
| Maré r1 | Kids, computador e celular | 2 positivos | `mare-r1/resultado.json` e 2 PNG |
| Floco r1 | Kids, computador e celular | 2 positivos | `floco-r1/resultado.json` e 4 PNG |
| Jade r1 | Kids, computador e celular | 2 positivos | `jade-r1/resultado.json` e 4 PNG |

Chrome headless com SwiftShader, 1280 × 720 e 390 × 844, escala de pixel 0,5 para esta máquina.
Os erros de página e de console são verificados sem filtro genérico. A posição inicial e a
amizade são fixtures explícitas: esta prova não simula vários dias de jogo nem a caminhada
inteira desde a ilha central. O navegador e o servidor próprios são encerrados ao terminar.

## Testes locais relacionados

- Contratos após V17: 145 testes, 2.054 asserções, sem falha. Incluem versões antigas, teto
  UTF-8 e recusa de dados inválidos. A suíte cresceu depois com o lote dos Lumis.
- Regras novas de amizade: 22 testes, 230 asserções, sem falha.
- HTTP do salvamento: 38 testes, 130 asserções, sem falha, com persistência local em memória.
- Suíte do jogo após amizade: 1.104 testes passaram, 1 teste de banco ficou explicitamente
  reservado ao Postgres descartável, sem falha. Não contar esse caso como executado.
- Tipagem dos contratos e jogo passou nessa composição. Nova composição será conferida
  novamente antes da revisão final do programa.

Os prints são evidência dos casos acima, não substituem a revisão final de todos os lotes.

Revisão posterior do texto: Vale e Nuvens passaram a usar as frases originais dos cartões
interativos da proposta. As capturas r1 antecedem esse ajuste editorial; o fluxo não mudou.
O teste puro das frases e da entrega passou com 22 casos e 232 asserções. A conferência gráfica
da composição final ainda não é coberta por essas capturas históricas.
