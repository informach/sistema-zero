# Espalhamento de peças por regiões e revisão das transformações

O scatterTiles existente utiliza agora a edição comum em lote, com origem
assinada, orçamento de trabalho e admissão global de chunks. Não clona uma grade
do tamanho do mundo. Mesma semente, densidade, escolhas e flags produzem as mesmas
células no mapa denso e no modelo esparso; os snapshots anteriores permanecem intactos.
Coordenadas fracionárias, índices inválidos e excesso de trabalho recusam o gesto
inteiro. Listas de peças com repetição continuam aceitas, sob orçamento próprio.

## Achados corrigidos na revisão

O adaptador do pincel não passava ao espalhamento os bits da peça transformada.
O teste novo reproduziu a perda do espelho antes da correção. O adaptador agora
encaminha os flags do carimbo selecionado; lápis, linha, retângulo e balde foram
verificados nas oito combinações quadradas. A interface conserva seus componentes,
textos e estilos. Nenhuma opção de regiões foi exposta.

Outro ajuste evita usar o teto de peças distintas como teto da lista de escolhas:
repetições nessa lista já eram admitidas. O limite de trabalho continua explícito,
e a validação de cada índice segue o teto de 256 peças do formato atual.

scatter.ts saiu da lista de acesso cru porque já não indexa nem percorre buffers
diretamente. A guarda continua conferindo toda a lista e rejeitando acessos novos.

## Verificação

- 22 testes focados passaram, 470 asserções, incluindo snapshots, locks herdados,
  costuras negativas, teto global, inválidos e a integração com o pincel.
- Suíte completa: 2.349 passaram, zero falhas; três controles nativos ignorados
  por padrão passaram à parte com Pygame real/SDL dummy (4.372 asserções).
- Tipos completos do Pinta e Biome dos seis arquivos passaram.
- Nove ensaios de navegador passaram sem retries: desktop, toque emulado e CPU 4×.
  O cenário novo verifica densidade, duas escolhas, alteração/restauração da semente,
  um desfazer por gesto, refazer e espelhamento efetivamente guardado nas células.
  Os ensaios anteriores de terrenos e bosque também foram repetidos.

O índice preserva as duas reproduções vermelhas, a rodada anterior ao achado
dos flags e a rodada final. A formatação foi corrigida no diretório da raiz após
uma invocação com caminhos relativos ao pacote; isso não alterou código funcional.

## O que este lote não fecha

O modelo esparso continua interno. Ainda faltam conjuntos, operações de objetos,
geometria, render e persistência 3, suas mensagens e os novos adaptadores. A proteção
do núcleo não substitui a admissão de trabalho antes da expansão de carimbos na
oficina futura; essa integração permanece no plano antes de ativar o formato 8.
Não se declara desempenho em mapas grandes, outro aparelho físico ou validação
por crianças. O rollback publicado B → A → B continua aguardando qualificação.
