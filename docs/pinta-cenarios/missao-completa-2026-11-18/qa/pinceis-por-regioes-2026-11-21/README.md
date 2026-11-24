# Pincéis e admissão por regiões — 21/11/2026

Base: `83e16c1745c029909af63d818e17875bfd1d2f5c`. Lote do item 3 da retomada.
Formato 8 permanece interno. Nenhum merge, implantação ou alteração funcional do Molda.

## Núcleo e oficina

`mapBrush` aceita o mapa autoral comum, com limites assinados. Linha e retângulo
são admitidos antes de gerar pontos; a linha inteira admitida é recortada depois,
preservando a fase de Bresenham. Carimbos usam a geometria comum de blocos:
257 visitas ao mesmo bloco 16 × 16 geram 256 destinos, em vez de 65.792.

As coleções e o traço têm teto de 65.536 destinos. O traço conserva um conjunto
limitado de destinos relativos à âncora; revisitar não consome o teto novamente,
e crescer à esquerda/em cima mantém essa identidade. O pincel usa a escolha do
começo do gesto. Não há coleção proporcional à extensão vazia do mundo.

O escritor de células, carimbo e espalhamento possuem variantes com resultado
de recusa; as APIs antigas continuam devolvendo o mesmo mapa ao recusar. Balde
reutiliza o coletor limitado comum; terreno continua no seu algoritmo existente.
O resultado distingue gesto vazio/sem mudanças de limite de trabalho,
armazenamento, camada trancada ou entrada inválida. Ponteiro e teclado mostram
mensagens curtas no Toast existente, sem novos painéis, classes ou estilos.

Recusar no meio do traço restaura o documento inteiro produzido pelo próprio
gesto, sem guardar um pedaço ou inventar uma entrada de histórico. Cancelamento,
movimento e soltura tardios conservam uma revisão externa do mesmo ID.

## Escrita condicional e conjuntos

`editorStore.replaceIfCurrent(expected, next)` compara a identidade do snapshot
em RAM, antes da admissão e novamente depois dela. Entrega o snapshot escrito
somente se ele sobreviveu aos assinantes síncronos. O gesto retém esse retorno;
nunca substitui a revisão esperada por uma leitura recente para forçar sua proposta.
Recusa do host também cancela o traço inteiro. O CAS de persistência da issue 026,
seus checkpoints e protocolos não foram substituídos por essa comparação em RAM.

A regressão da oficina detectou que o editor de conjuntos precisava traduzir a
operação. A fachada foi extraída para `state/mapSetEditorStore.ts`, mantendo o
histórico e a persistência externos. Cada revisão externa tem uma identidade de
visão, mesmo quando só o nome muda e o mapa interno é reutilizado. WeakMaps ligam
as visões aos snapshots; não há outra cópia persistida ou outro histórico.
Os testes também conservam o gesto vazio sem desfazer e o cancelamento do crescimento.

## Evidências e revisão

- 101 testes focados aprovados, zero falhas, 1.240 asserções. Incluem entrada
  excessiva recusada pela contagem antes de ler posições, mundo de 100 milhões
  de casas, teto de 2.048 chunks sem alteração parcial, repetição, flags e terrenos.
- Suíte final: 2.469 aprovados, três controles nativos omitidos pela configuração
  comum, zero falhas e 29.081 asserções. Os três controles foram executados
  separadamente com Pygame real: aprovados, 4.372 asserções. São regressões do
  formato público, não validação externa de regiões.
- 18 casos no controlador real, com renderer, store e IndexedDB reais: cancelar,
  mover ou soltar após outra revisão do mesmo ID; recusa de carimbo e do host;
  controle positivo de desfazer. Mouse e toque nativo emulado, CPU 4×. Os hashes
  do documento completo, normalizados apenas pelo timestamp de edição, coincidem
  em RAM, na referência e depois de salvar/reabrir.
- 33 percursos da oficina pública aprovados: terrenos, teclado, biblioteca,
  level design e edição de conjuntos. O caso novo de conjunto apaga por ponteiro,
  desfaz/refaz e reabre, comparando o documento completo quatro vezes, com exceção
  dos timestamps de edição. São 12 comparações nativas nos três perfis.
- Reprodução com o módulo real de `tileGestures.ts` da base histórica, carregado
  pelo servidor de QA via `git show`, mantendo os demais módulos atuais. Os cinco
  cenários corrigidos falham nos três perfis (15 falhas esperadas); desfazer passa
  nos três como controle. A versão atual passa nos mesmos 18 casos. Essa prova é
  do módulo produtor, não de uma distribuição histórica completa ou outro aparelho.
- Tipos completos do Pinta/Estúdio, Biome em 22 fontes e `git diff --check`
  verificados. Fontes e recibos com hashes em `index.json`.

O host do controlador é uma página de QA, sem API de testes no produto; os outros
33 percursos usam o aplicativo existente. Capturas, perfis aplicados, relatórios
e reproduções estão nos recibos. Não houve medição de heap ou qualificação dos
alvos de latência, nem teste com crianças ou outro dispositivo físico.

Dois ajustes dos próprios ensaios estão preservados: a fixture de revisão externa
usava um nome que o formato nativo normaliza; a fixture de conjuntos procurava o
ID anterior à importação, que cria novos IDs e religa o grafo. O ensaio final usa
um nome nativo válido e captura a revisão realmente importada como baseline,
fixando o novo ID nos passos seguintes. Nenhuma comparação de dados foi relaxada.
Uma tentativa do runner Bun expirou antes de servir HTTP; a prova final usa Node,
como o servidor oficial de E2E do pacote. O log dessa tentativa também foi conservado.

## Continuação

Este lote qualifica as ferramentas de pintura e sua ponte com conjuntos. Os
demais gestos de objetos, transformações e controles contínuos ainda serão
revisados com a mesma propriedade de revisão; geometria, seleção, câmera,
recursos, IO 3, Scene 4 e promoção pública 8 continuam no plano. Não representa
conclusão das etapas macro ou da missão completa. Sem alteração de contratos
de nuvem, runtime publicado, formato nativo ou armazenamento neste lote.
