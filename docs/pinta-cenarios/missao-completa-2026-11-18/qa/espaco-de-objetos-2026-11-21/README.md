# Espaço de edição dos objetos — 21/11/2026

Base `88257d7d92eaa7addc3816c1e7e47bb7a57792b6`. Continuação do item 3,
sem ativar formato 8 público, protocolo físico 3 ou leitores novos no Estúdio.

## Implementação e revisão

O SVG regional usava origem zero e exibia objetos negativos no lugar errado.
`objectEditorSpace` centraliza viewBox, mundo, offset herdado, limites locais,
snap e criação estrita. Conserva posições fracionárias no contrato regional e a
ordem das operações/arredondamentos no ramo denso. Não altera classes ou estilos.

Uma caixa sem layout retornava falsamente a posição zero. Agora recusa o ponto e
cancela o gesto inteiro, somente se sua revisão ainda for a atual. A revisão do
lote encontrou outra causa: zoom, anel ou snap mudavam no meio do arrasto sem
invalidar suas coordenadas iniciais. O gesto retém a identidade do editor e seu
contexto geométrico; mudança cancela a própria edição. Eventos que chegam antes
da limpeza do efeito também conferem esse contexto. Revisões externas sobrevivem.

O overlay aceita `AuthorMap` para leitura. A prova regional usa um documento 8
interno sobre um store público denso real e confirma que esse store fica intacto;
não usa cast de asset nem simula suporte de escrita ainda ausente. Recursos,
modelo público, IO e adaptadores continuam no plano antes da promoção.

## Verificação

- Suíte completa: 2.558 aprovados, três controles nativos omitidos pela configuração
  comum, zero falhas e 29.513 asserções em 224 arquivos.
- 69 testes focados, zero falhas e 353 asserções: régua densa, offsets, frações,
  origem assinada, snap negativo, layout inválido e propriedade dos gestos.
- 126 ensaios Chromium do controlador e 33 percursos da oficina, sem retries.
  Desktop, toque emulado e CPU 4× nesta máquina; documentos nativos comparados
  após persistência IndexedDB. Três SVGs regionais conferem posição real e store
  público inalterado. Os conjuntos têm 12 comparações nativas exatas na oficina.
- O módulo anterior real produz 12 falhas esperadas para perda de layout e zoom,
  com seis controles positivos de desfazer aprovados. Não é uma distribuição
  antiga inteira, nem uma nova prova de conflito autenticado entre dispositivos.
- Tipos completos do Pinta e dos arquivos de QA alterados, Biome e diff sem erros.
  O projeto de tipos ampliado está arquivado; não representa nova execução dos
  tipos completos do Estúdio. O último resultado completo está no lote anterior.

A primeira execução de navegador registrou um teste dentro de outro: 105 falhas
de registro e 12 controles aprovados. A estrutura do ensaio foi corrigida e os
recibos foram preservados. O primeiro typecheck ampliado encontrou duas capturas
de variável possivelmente nula no host de QA; uma ligação validada resolveu a
causa, sem cast ou supressão. Nenhuma asserção do produto foi relaxada.

Os controles Pygame e motores externos não foram repetidos neste lote de SVG.
Não houve qualificação de latência/heap, teste com crianças ou outro aparelho
físico. Os perfis emulados não substituem esses testes. Índice, hashes, relatórios,
screenshots e recibos comprimidos acompanham este documento.
