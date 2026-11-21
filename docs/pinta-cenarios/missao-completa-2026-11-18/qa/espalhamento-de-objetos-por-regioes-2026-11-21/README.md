# Espalhamento de objetos por regiões

O núcleo comum de espalhamento usa limites assinados do mapa e preserva a
geometria fracionária, os giros, espelhos, offsets herdados e a distância entre
centros. Conjuntos permanecem vinculados. Não há buffer proporcional ao mundo
de 10.000 × 10.000: o gesto admite até 65.536 amostras antes de deduplicar/ordenar,
e continua sujeito a 512 objetos por camada e aos limites de recursos existentes.
O coletor da oficina também para de acumular ao alcançar o teto.

Cada cópia religa propriedades de objetos nas artes privadas e seus dependentes.
Os IDs dessas versões são derivados do gesto/amostra, de modo que repetir a
prévia produz o mesmo documento. Conflitos, recursos futuros e excesso de
orçamento recusam o gesto inteiro. A oficina mostra o motivo da recusa, sem
criar objetos ou histórico parciais. Componentes, estilos e disposição continuam
os mesmos.

## Achados e correções da revisão

O código anterior ignorava o início assinado do mundo e arredondava os centros.
Além disso, propriedades das peças privadas apontavam para o objeto-modelo.
Os cinco testes iniciais reproduziram essas perdas. O clonador de grafos agora
aceita um provedor determinístico de IDs de recursos, sem duplicar a lógica.

A revisão visual detectou outro problema: o overlay recebia a prévia, mas a arte
era procurada no estado salvo. Um teste real encontrou dois objetos e zero
imagens. `MapObjectArtwork` agora recebe o catálogo do snapshot exibido; o
mesmo teste exige duas imagens reais antes de confirmar. A recusa inicial de
IDs de recursos com `:` também foi corrigida no gerador, mantendo o leitor estrito.

O hook de CPU dos testes de recursos esperava apenas o nome `cpu4x`, enquanto
a rodada combinada usava `cpu-4x`. Quatro casos do lote anterior não estavam
reduzidos, embora os demais casos aplicassem os metadados corretamente. O hook
agora usa os metadados e conserva o nome legado como fallback. Os cinco casos
de recursos desta rodada registram a aplicação de 4×, além dos perfis sem redução.
A retificação está ligada ao relatório anterior; os recibos históricos não foram
reescritos.

## Verificação

- Comparação com `06b442e57`: 48 composições densas produziram o mesmo mapa,
  IDs de objetos e indicador de orçamento, variando densidade, distância, giro,
  espelho e offsets fracionários. Referências privadas são a correção intencional
  verificada separadamente, e não entram nessa prova de igualdade.
- 30 testes direcionados passaram, com 2.747 asserções: geometria, conjuntos,
  recursos encadeados, prévia determinística, travas, orçamentos e recusa na oficina.
- Suíte completa após a correção visual: 2.384 passaram, três controles nativos
  ignorados por padrão, zero falhas e 28.792 asserções.
- Três controles com Pygame real/SDL dummy passaram à parte, com 4.372 asserções.
  Eles verificam os exportadores atuais, não exportação de regiões.
- 27 ensaios de navegador passaram sem retries em desktop, toque emulado e CPU 4×,
  nesta máquina. Cancelamento, imagens da prévia, um desfazer por pincelada,
  refazer e salvar/reabrir conservaram os objetos e seus catálogos privados.
- Tipos completos do Pinta/Estúdio e Biome dos arquivos do lote passaram.

O índice conserva os testes vermelhos, a falha inicial de tipos dos fixtures,
as rodadas intermediárias, o programa de comparação e o módulo histórico usado.
Não foi alegado ganho de desempenho nem homologação em outros aparelhos.

## Integração ainda necessária

O espalhamento por regiões é interno. A oficina e os ensaios de gesto ainda usam
o formato público denso; o codec 8 é verificado no núcleo. Renderização, câmera,
minimapa, demais ferramentas, IO 3 e adaptadores continuam condicionando sua
exposição pública. Não houve merge, implantação, teste com crianças ou aparelhos
físicos adicionais neste lote.
