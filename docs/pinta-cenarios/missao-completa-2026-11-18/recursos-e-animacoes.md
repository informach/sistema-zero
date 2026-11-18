# Recursos e animações de objetos

O documento nativo 6 acrescenta versões autocontidas de artes e a escolha de uma animação de
sprite por objeto. Os documentos anteriores mantêm seu formato quando não usam esses dados.
Os controles usam os botões, painéis, cores e tipografia já existentes no Pinta.

## Autoria e retenção

Um objeto acompanha a arte da biblioteca por padrão. **Guardar esta versão** cria uma cópia
imutável dentro do mapa, com ID próprio, origem e instante de captura. **Guardar a versão mais
recente** cria outra cópia e troca apenas a referência do objeto escolhido. **Acompanhar o desenho
da biblioteca** reconecta explicitamente o objeto ao original. Apagar o original não apaga a cópia.

As peças das camadas também podem ser fixadas em uma única operação. Tamanho e estilo precisam
continuar compatíveis ao atualizar ou reconectar. Uma camada trancada impede a operação inteira.
O catálogo entra no desfazer/refazer. Sua remoção exige a ação **Tirar versões que não uso**;
referências tipadas entre versões também contam como uso.

O orçamento é de 32 versões e 8 MiB de dados em memória por mapa. Compressão não aumenta esse
teto. O histórico conta a mesma cópia compartilhada uma vez entre os snapshots. Copiar/importar
um mapa gera IDs independentes para seu catálogo e religa os objetos; importar sprites também
religa os IDs de animações. Soltar um conjunto materializa seu catálogo sem resolver ambiguidades
pela ordem de chegada.

Copiar ou recortar objetos leva somente as versões alcançáveis pelos objetos escolhidos e
por suas propriedades. Colar em outro mapa incorpora objetos e catálogo na mesma entrada do
histórico, ou recusa a operação inteira se não couber. A área de transferência usa versão 2
para esses dados; leitores antigos recusam seu conteúdo completo. Os limites próprios das
aulas também conferem folhas de peças dentro do catálogo.

Mapas autocontidos não dependem da presença dos originais na biblioteca, inclusive para
encaixe, redimensionamento e PNG portátil. O ensaio de uma folha de 48 pixels verifica o
encaixe após copiar e colar, além da volta dos dados depois de fechar e reabrir.

## Cena executável

A cena compartilhada 2 transporta atlas, dimensões de quadro, IDs e nomes das animações, tempos,
repetição e proveniência das versões usadas. Recursos referenciados apenas por propriedades
também entram no fechamento. A cena 1 continua aceita com seu comportamento anterior; campos
novos dentro de uma cena 1 são recusados.

A prévia usa o relógio existente do Pinta. O compositor, o player JavaScript compartilhado por
Jogo 2D, Avançado e Phaser, o módulo Python compartilhado pelo Estúdio e pelo pacote portátil,
e o adaptador Godot recortam o quadro escolhido. Sem repetição, prendem o último quadro.
O player JavaScript inicia o relógio da cena 2 ao criar/trocar o mapa. A cena 1 mantém seu relógio.

Tiled JSON e TMX/TSX levam animações reais de peças, com tempos inteiros em milissegundos,
além dos metadados precisos do Pinta para a volta editável. O Tiled repete animações; a diferença
para sequências sem repetição é registrada em `COMPATIBILIDADE-TILED.txt`. A definição externa
foi consultada na [documentação oficial do formato JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/).

## Segurança e publicação

O checkpoint local declara a capacidade mínima do conteúdo: 5 para o protocolo de autoridade
anterior, 6 para os novos dados. A publicação do leitor 6 não torna ilegíveis os mapas que
continuam cabendo no leitor 5. A revisão UUID permanece a identidade de gravação.

Nativo 6 exige nuvem 5. O primeiro lote de publicação lê nuvem 5 e ainda declara 4 ao escrever.
O produtor recusa enviar um documento 6 com declaração 4, mantendo seu checkpoint local e sem
avançar a marca de sincronia. Essa verificação também existe nos rascunhos das aulas.
Somente depois de publicar e verificar o leitor em staging será habilitado o gravador 5.
Rollback do gravador deve voltar para esse leitor, nunca rebaixar a versão dos documentos.

## Evidências e alcance

- Testes de núcleo: catálogos, orçamentos, versões, histórico, importação e round-trip de cenas.
- Navegador local: seleção por mouse/toque, pixels reais da animação, fixação, undo/redo e reabertura.
- Phaser 3.90.0 no Chromium: pixels vermelho, verde e azul da versão fixada e retenção do último quadro.
- Pygame-ce 2.5.8 / Python 3.13.17: os mesmos quatro samples de pixels no pacote portátil.
- Godot 4.7.2: importação real, seleção de quadros e renderização OpenGL na RTX 3050 desta máquina.
- Tiled 1.12.2: abertura pelo exportador de linha de comando e reexportação JSON do pacote real.

Essas provas não substituem o ciclo autenticado completo de atualização no Estúdio nem encerram
as etapas posteriores do plano. A conta de staging foi disponibilizada pelo usuário. Conforme
seu ajuste de escopo, a homologação de aparelhos usa esta máquina, toque e CPU simulados;
não se declara uso em outros aparelhos físicos nem teste com crianças.
