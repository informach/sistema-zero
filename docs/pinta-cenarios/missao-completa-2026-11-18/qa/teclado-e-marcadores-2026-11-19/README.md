# Teclado e marcadores: primeiro lote da etapa 6

## Problemas e correções

Três [testes de regressão](commit-red.txt) reproduziram sucesso indevido da guarda
de commit quando o host recusava a edição ou a linhagem já havia sido recuperada,
e perda de seleção ao tentar apagar um objeto recusado. O store informa agora
se aceitou a edição. A guarda repassa o resultado, e remoções de objetos/camadas
preservam a seleção quando recusadas. O editor de conjuntos repassa o resultado
do store externo.

O botão **Pôr um marcador** completa a criação sem ponteiro, usando a lista de
objetos existente, o ponto de inserção compartilhado, snap e operações existentes.
A seleção só muda quando o novo objeto foi aceito. Offset herdado é descontado
uma vez. Camada trancada, curadoria e host continuam limitando a operação.
O encaixe de ponto foi centralizado e compartilhado com o gesto do palco.

## Evidências

- [48 testes focados](commit-green.txt), 208 asserções, após a correção da recusa.
- [90 testes de operações e UI](ui.txt), 1.220 asserções, sem falhas, incluindo
  offset herdado, recusa/bloqueio, conjuntos, desfazer e salvamento real.
- [Três casos nativos](navegadores.json), sem omissão, retry ou instabilidade:
  desktop, perfil de toque e CPU 4× nesta máquina. [Log](navegadores.txt).
  Criar por Tab/Enter, foco visível, campos, papel de início, Esc, desfazer/refazer,
  exportação real e reabertura conservaram o objeto. Não houve overflow horizontal
  do documento, e o botão alcançado por Tab estava dentro do viewport.
- Capturas revisáveis: [desktop](desktop.png), [toque emulado](touch.png),
  [CPU simulada](cpu-4x.png). Identidade visual e componentes existentes conservados.

O fluxo nativo foi formatado pelo Biome depois da primeira execução; os hashes
anexados descrevem a fonte formatada no arquivo. O núcleo não mudou após o ensaio.
Os gates completos e a revisão final foram anexados abaixo, antes do commit de implementação.

## Limites

Os três perfis são simulações no computador disponibilizado, não aparelhos
físicos distintos nem testes com crianças ou leitores de tela reais. A importação
da fixture e a exportação de conferência usam os controles normais com ponteiro;
o trecho de autoria do marcador usa somente teclado após selecionar a camada.
Esta prova não é certificação WCAG nem cobre todas as ferramentas de pintura.
Etapa 6 permanece aberta para essa continuação e revisão de navegação.

## Gates completos do lote

A [suíte completa](pinta-completo.txt) terminou com 2.190 aprovados, zero falhas
e três casos condicionais Pygame omitidos por ausência de `PYTHON` nessa rodada.
Os dois arquivos foram reexecutados com o Python/pygame-ce real disponibilizado:
[18 aprovados, zero omissões, 5.231 asserções](pygame-real.txt), incluindo os três
casos condicionais de desenho afim e colisão. Isso não transforma a primeira
rodada em uma execução sem omissões.

TypeScript [Pinta](pinta-types.txt) e [Estúdio completo](studio-types.txt) saíram
com código zero. O [Biome global](biome.txt) conferiu 16.315 arquivos sem erros.
A versão remota `72652bf49` foi integrada sem conflitos antes desses gates.

## Revisão final antes do commit

A conferência final corrigiu um caso adicional: uma camada inteira deslocada
para fora do mapa criava um ponto invisível. A operação agora recusa com o
recado existente de camada/espaço, sem seleção ou histórico.
[Red](revisao-final/marcador-fora-red.txt) e
[28 operações aprovadas](revisao-final/operacoes-green.txt), incluindo o offset
realmente herdado pelo contrato de reparenting. O TypeScript identificou o
uso incorreto desse contrato no teste; ele foi corrigido e o
[TypeScript Pinta final passou](revisao-final/pinta-types.txt).

A [suíte final](revisao-final/pinta-completo.txt), com Python real habilitado,
teve **2194 aprovados, zero falhas e zero omissões**. Os
[três perfis de navegador foram repetidos](revisao-final/navegadores.json)
após a última correção, sem retry ou instabilidade. Os hashes desta rodada
correspondem à fonte final; as provas anteriores permanecem como histórico.
O TypeScript completo do Estúdio acima antecede apenas essa última guarda
de coordenadas e a correção do teste de reparenting, ambas cobertas pelo
TypeScript Pinta final.
