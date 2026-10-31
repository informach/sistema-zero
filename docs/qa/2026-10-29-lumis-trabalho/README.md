# Lumis, prévia e colheita no mundo

Conferência local em 29/10/2026. Código em desenvolvimento, sem publicação nem banco remoto.

## Resultado

### Continuação r3: bônus e dois públicos

Após acrescentar a colheita especial e o molde V2, oito casos passaram: Kids e adulto, cada um
no computador e no celular emulado, com Pluma e Búzio. A Pluma foi testada no posto 2, sem
clima liberado, e colheu 8 tomates com humor ótimo; preservou dois canteiros maduros. O Búzio
foi testado no posto 7, com sol e humor ótimo, e colheu 20 tomates, cinco de cada canteiro.
O texto da prévia mostrou o contexto correto. As oito pausas, comparações de registro e
conferências de largura passaram. Nenhum erro de página ou console foi ignorado.

Resultados em [r3/resultado.json](r3/resultado.json), com 16 capturas adjacentes. Exemplo:
[prévia adulta no celular com Búzio](r3/adulto-celular-buzio-previa.png). Esse ensaio usa
conquistas e salvamento locais. Não publica conteúdo nem mede desempenho de aparelho físico.

### Base r2: rendimento sem bônus

Quatro casos reais passaram no Chrome com SwiftShader: computador 1280 × 720 e celular
emulado 390 × 844, com Pluma e Búzio. Cada caso abre o caderno, o mini estúdio, executa a
prévia, guarda a rotina e manda testar no mundo. Durante o trabalho, abre o menu, confere
que a horta não muda enquanto está pausado e retoma.

| Espécie | Capacidade | Tomates colhidos | Canteiros preservados maduros |
| --- | ---: | ---: | ---: |
| Pluma | 8 | 6 | 2 |
| Búzio | 24 | 12 | 0 |

Cada canteiro produz três tomates. A colheita é inteira, sem cortar um alimento para caber.
Os registros completos da prévia e de “Da última vez” no mundo foram iguais. A prévia não
mudou o salvamento. Nenhum erro de página ou console foi ignorado. As quatro conferências
de largura passaram, sem rolagem lateral no diálogo.

- Script: `packages/arquipelago/playground/verificar-lumis-trabalho-browser.ts`.
- Resultado estruturado: [r2/resultado.json](r2/resultado.json).
- [Computador, Pluma, prévia](r2/computador-pluma-previa.png).
- [Computador, Pluma, mundo](r2/computador-pluma-real.png).
- [Computador, Búzio, prévia](r2/computador-buzio-previa.png).
- [Computador, Búzio, mundo](r2/computador-buzio-real.png).
- [Celular, Pluma, prévia](r2/celular-pluma-previa.png).
- [Celular, Pluma, mundo](r2/celular-pluma-real.png).
- [Celular, Búzio, prévia](r2/celular-buzio-previa.png).
- [Celular, Búzio, mundo](r2/celular-buzio-real.png).

## Falha encontrada e corrigida

A tentativa r1 passou nos dois casos de computador e encontrou uma regra CSS que escondia
todos os parágrafos do cabeçalho no celular, inclusive a descrição da espécie. A regra agora
esconde apenas a instrução introdutória. O resultado negativo e a captura permanecem em
`r1/`. A tentativa r2 executou todos os quatro casos depois da correção.

## Limites

O cenário fornece quatro plantas maduras e conquistas de teste pela plataforma local.
Não prova obtenção das conquistas pelo serviço, latência de rede nem desempenho em GPU
ou celular físico. O DPR de 0,5 reduz o custo do renderizador de software. Não é prova de FPS.
As outras 12 espécies têm cobertura das regras puras; esta conferência gráfica exercita os
extremos de carga. Intensidade noturna tem teste com cópia do material real do GLB, sem
alterar o arquivo de arte. A tipagem e a revisão integrada são registradas separadamente.
