# Renumeração de peças e revisões pendentes — 21/11/2026

Base: `30b108a9ddb69f18930fda4d7cff4d2211bd71e4`. O documento regional 8
continua interno. Este lote não promove a união pública, o gravador ou o IO 3.

## Problemas reproduzidos e correções

O remapeador anterior percorria somente arrays densos. Num documento regional,
objetos podiam mudar de índice enquanto os chunks conservavam os índices antigos.
O mesmo núcleo agora admite o documento inteiro antes de publicar o resultado,
visita apenas buffers armazenados, conserva flags e compartilha chunks inalterados.
Um chunk esvaziado pela exclusão é retirado. Outras folhas e versões privadas
permanecem intactas. Índice que excederia 255 recusa a operação inteira.

A coleção de mapas ligados agora sobrepõe todas as revisões pendentes à galeria
antes de selecionar os consumidores. Antes, apagar uma arte e fazer outra edição
antes do autosave podia recuperar a arte da versão antiga da galeria: a revisão
pendente já não utilizava a folha e era descartada cedo demais. O agrupador comum
mantém a revisão pendente e recusa todo o lote se um mapa não puder ser remapeado.
Mapas e definições de conjuntos participam do mesmo histórico e persistência.

`commitLinked` devolve a aceitação efetiva já conferida pelo store. A tira só muda
a seleção depois da aceitação; adoção de outra revisão durante a admissão não
aplica a seleção do comando abandonado. Recusa usa o Toast e os estilos atuais.
O grafo de dependentes do Estúdio também aceita os tipos internos de regiões;
proveniência de recursos congelados continua fora das dependências vivas.

## Orçamento e revisão

A manutenção de índices pode visitar os 2.048 chunks/4 MiB já admitidos no
documento. Não usa a extensão lógica como tamanho de buffer nem amplia o limite
de pintura de 65.536 destinos. A primeira passagem admite o orçamento agregado
de todas as camadas antes de ler payloads; o teste usa um getter que lança caso
um payload seja visitado antes dessa admissão. Alterações são locais até a
aceitação do lote completo. Tetos, estilos e formatos públicos permanecem iguais.

Foram revistas a ordem de sobreposição, a seleção de consumidores, a preservação
das versões privadas e folhas distintas, a recusa após candidatos anteriores,
o retorno do store, desfazer/refazer e reabertura. O teste de navegador utiliza
IndexedDB real e os stores/componentes de produção numa página de QA isolada.
Não confundir essa página com homologação visual completa da oficina.

## Evidências

Os recibos compactados e hashes das fontes ficam em `index.json`. A comparação
de interface troca somente o componente `TileStrip` pelo de referência; mantém
o núcleo e o store atuais. Ela isola defeitos do chamador, não executa uma versão
histórica integral do produto. As nove falhas esperadas precisam ser asserções
dos três defeitos, com snapshot anexado, nunca timeout ou erro de preparação.

Nos perfis desktop, toque emulado e CPU 4×: 12 controles do componente atual,
três controles positivos históricos e três provas atuais do núcleo regional.
As nove falhas históricas são reproduções esperadas, não recursos aprovados.
O percurso atual edita duas vezes antes do autosave, desfaz/refaz, salva e abre
outra página no mesmo contexto para ler o banco sem semear novamente os dados.
Confere objeto, mapa e definição reutilizável. O núcleo conserva dois chunks
num mundo lógico de 100 milhões de casas e remapeia o documento de 4 MiB.

Suíte completa local: 2.622 aprovados, três testes nativos Pygame omitidos por
configuração, zero falhas; 29.980 asserções, 234 arquivos, 176,30 s. Os ensaios
Pygame não foram repetidos neste lote e não integram essa aprovação.

Não foram validados neste lote leitores externos novos, dispositivos físicos
adicionais, heap, SLA de oficina, publicação autenticada ou o formato regional
no store público. A ativação depende dos consumidores restantes, IO e adaptadores
do plano principal.
