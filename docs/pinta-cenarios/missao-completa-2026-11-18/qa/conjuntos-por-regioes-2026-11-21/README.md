# Conjuntos e objetos no modelo interno por regiões

O contrato interno agora inclui RegionMapSetAsset e um codec nativo 8 estrito
para conjuntos. A captura usa o leitor comum, admite um recorte de até 256 × 256
casas e conserva células transformadas, propriedades e vínculos. O mundo de
10.000 × 10.000 não vira um buffer denso; apenas o pequeno recorte tem um buffer
temporário, dentro do orçamento anterior de índices.

Posicionar uma definição continua criando uma instância vinculada. Separá-la
produz cópias independentes, com recursos/propriedades religados pelo mesmo
clonador do núcleo. No modelo por regiões, a árvore de grupos, suas propriedades,
locks, opacidade, parallax e deslocamentos são conservados. Giros ortogonais e
espelhos usam transformações exatas, mantendo posições fracionárias e negativas.
Os chunks de saída são admitidos no orçamento global; excesso de armazenamento
ou de 65.536 células ocupadas no gesto conserva o mapa e a instância originais.

A inserção e atualização de objetos compartilham o leitor estrito do formato 8:
geometria inválida é recusada inteira, sem arredondar para zero. IDs duplicados
entre camadas são recusados. O caminho denso conserva sua normalização histórica.
Um conjunto de regiões não é separado silenciosamente num mapa legado.

## Achados corrigidos na revisão

A separação densa perdia o parallax herdado dos grupos e da camada dona. A função
extraída de `9a4b06828` reproduziu fatores 1/1 onde se esperavam 0,4/0,5. A correção
mantém esses fatores e recusa uma composição que não cabe no formato.

Outro defeito permitia editar fator 16, mas o leitor o cortava para 4 ao reabrir.
O limite efetivo existente, 4, passou a ter uma única constante e a admissão da
edição foi alinhada a ele. O teste reproduziu a divergência antes da correção.
A oficina agora mostra o valor admitido no commit do campo e o conserva na
reabertura; os componentes e estilos não foram alterados.

## Verificação

- 85 testes direcionados passaram, com 369 asserções e zero falhas.
- Suíte completa do Pinta: 2.366 passaram, três controles nativos ignorados por
  padrão e zero falhas, com 28.542 asserções.
- Os três controles de exportação com Pygame real/SDL dummy passaram à parte,
  com 4.372 asserções. Não são homologação externa de regiões.
- Tipos completos do Pinta e Estúdio e Biome dos dez arquivos passaram.
- Quinze ensaios de navegador passaram em desktop, toque emulado e CPU 4×,
  incluindo o campo de distância, salvar/reabrir, conjuntos girados/vinculados,
  histórico, propriedades e arte privada. Sem retries. Esses ensaios verificam
  a oficina pública densa e sua regressão, não uma interface de regiões já ativada.

O índice preserva as reproduções, as duas primeiras falhas de tipos, o achado
de parallax e as rodadas finais. Somente esta máquina foi utilizada.

## Integração ainda necessária

Os tipos e codecs novos continuam internos, fora da união pública da galeria.
Ainda faltam seleção/clipboard e templates de objetos por regiões, geometria,
render/câmera/minimapa, protocolo físico 3 e os adaptadores externos. O núcleo
deste lote não fecha sozinho as etapas 1 ou 4. A promoção do escritor de formato
8/nuvem 7 permanece condicionada aos leitores e aos fluxos completos.
