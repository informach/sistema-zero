# Contornos de colisão autorais

O mapa registra quais objetos impedem a passagem. O Pinta não recebe código de
comportamento: o Estúdio e os adaptadores executam a colisão. A oficina conserva
seus componentes, cores, palco e organização atuais.

## Documento e compatibilidade

| Fronteira | Contrato novo | Legado |
| --- | --- | --- |
| Documento / backup | Schema e envelope 7 | Número calculado pelo conteúdo; sem promoção geral |
| Objeto | `collision: true`, ausente quando desligado | Formas anteriores permanecem sem barreira implícita |
| Mapa | `physics: 'precise'`, adoção explícita | Sem opção nem barreiras novas, cena 1/2 conserva sua física |
| Cena compartilhada | Versão 3 | Cenas 1/2 conservam a interpretação anterior nos motores JS |
| PNG com dados | Versão 4 | Versões 1/2/3 continuam aceitas; receitas antigas não mudam |
| Runtime Python | `pinta-scene-physics-v1` | O leitor de mundos anterior não satisfaz essa capacidade |
| Nuvem | Leitura 6; escrita ainda 4 | Documento 7 exige declaração mínima 6; autosave local permanece protegido |

Uma definição de conjunto também pode exigir a cena 3. Não basta conferir o
schema do mapa principal: o exportador considera as definições efetivamente
referenciadas. O catálogo de versões de arte mantém suas regras anteriores.

A reprodução com os quatro módulos leitores congelados em `dd4f0959c` demonstra
por que o número precisa subir: forçar schema 6 faz aquele sanitizador retirar a
opção e as marcas de colisão. Com o carimbo 7, ele recusa documento e backup. Seu
leitor de nuvem também recusa a declaração 6. Os demais helpers dessa reprodução
são atuais; ela não substitui um cliente implantado nem o ciclo autenticado.

## Geometria e movimento

`pinta-scene-geometry.ts` contém a consulta comum do corpo inteiro contra peças e
objetos. Elipses são analíticas; polígonos podem ser côncavos; polilinhas permanecem
abertas. Um ponto bloqueia o corpo que contém sua posição. Encostar sem penetrar é
permitido, com margem numérica interna. Espelhar a imagem do objeto não espelha seu
contorno; a transformação do conjunto aplica a base afim canônica ao filho.

Grupos e deslocamentos fracionários são respeitados. Camadas escondidas não
barram; opacidade zero continua permitindo uma barreira invisível. Filhos que
ultrapassam o retângulo nominal do conjunto não são recortados. A consulta visita
as células candidatas pela transformação inversa do corpo, sem achatar outra grade
de sólidos. Plataformas de mão única não são promovidas a sólidos.

A resolução contínua separa os eixos e consulta o retângulo percorrido inteiro.
Encontrar a primeira barreira requer uma busca limitada, sem passos proporcionais
à velocidade ou à espessura do obstáculo. A solicitação é limitada pelo tamanho do
mundo; entradas não finitas são recusadas. Um corpo inicialmente sobreposto pode
sair para uma posição livre; o editor não o teleporta para uma posição inventada.

O JavaScript portátil incorpora as funções geradas do Core, evitando outra cópia
manual da geometria. Os dois motores do Estúdio preservam sua caixa de personagem,
gravidade e plataformas existentes. O Phaser corrige apenas a posição do corpo:
o `postUpdate` do Arcade aplica o deslocamento ao desenho depois, conforme o
[contrato da versão 3.90.0](https://github.com/phaserjs/phaser/blob/v3.90.0/src/physics/arcade/Body.js#L1128).

Pygame e Godot possuem adaptadores com os mesmos casos de referência. No Godot,
a consulta transforma o corpo para o espaço local do objeto/camada; a elipse não
é substituída por um retângulo nem por um círculo escalado da física nativa. A
interface usada está documentada no
[Node2D 4.7](https://github.com/godotengine/godot-docs/blob/4.7/classes/class_node2d.rst)
e em [Geometry2D](https://github.com/godotengine/godot-docs/blob/4.7/classes/class_geometry2d.rst).

## Uso

1. Escolha uma camada de objetos e desenhe a forma ou selecione um objeto existente.
2. Em **Criar mais** ou **Avançado**, marque **Impede o personagem de passar**.
3. Use **Testar com personagem**, salve e envie o cenário ao Estúdio.
4. Para adotar contornos precisos nas peças/conjuntos de um mapa sem barreiras de
   objeto, ative **Usar os contornos exatos do cenário**, em Avançado.

Uma opção já usada continua visível nos níveis iniciais. Se objetos/conjuntos
exigem o leitor preciso, a opção geral aparece ligada e explica por que está
indisponível. Retirar uma marca usa a mesma operação de histórico das demais
propriedades: desfazer/refazer e copiar conservam os dados.

No Estúdio JS, o bloco de colisão do cenário consome o documento completo. Em
Python, `mapa.bloqueado(corpo)` consulta um `pygame.Rect`/`FRect`, e
`objeto.colisao` informa a marca autoral. Há um bloco para a consulta. A API antiga
`mapa.solidos()` continua retornando retângulos de peças para os programas que a
usam; ela não é a consulta de curvas. O exemplo do pacote portátil usa
`Mundo.mover(dx, dy)` para resolver o movimento contínuo.

O pacote Tiled conserva as formas e uma propriedade booleana `pinta:collision`.
Se o mesmo objeto tem imagem e contorno curvo, o contorno continua autoral e a
imagem vira uma representação derivada em camada própria: um tile object do Tiled
não pode ser também uma elipse/polígono. A reimportação recompõe o objeto único.
Giros com escala desigual que cisalham uma imagem continuam sendo recusados pelo
exportador Tiled com relatório explícito; não se entrega uma imagem deformada
incorretamente. Pygame/Godot conservam o documento completo nesses casos.
O Tiled é um editor: essa propriedade não cria automaticamente a física de qualquer
motor externo. Os pacotes Phaser/Pygame/Godot incluem seus adaptadores; o Godot não
depende de uma promessa de importar qualquer JSON do Tiled diretamente.

## Bytes, publicação e orçamento

O PNG capturado precisa corresponder ao hash, às dimensões, à receita e à versão
dos dados comprimidos. PNG 4 sem marcador 4 é recusado. Uma cena 3 não pode viajar
como dados 2/3, nem um mundo 3 esconder um destino 4. Cópias históricas sem marcador
continuam aceitas, sem regravação automática de jogos antigos.

A validação descomprime em fluxo, com entrada de 1 KiB por operação, teto acumulado
de 16 MiB decodificados para raiz/destinos e profundidade máxima 64. Ela cede o
controle durante documentos grandes. Esse é um orçamento dos dados decodificados,
não uma medição ou teto da memória total do navegador. O decodificador é lazy, fora
da carga inicial da galeria. Não se usa a opção `out` que pode truncar em silêncio
na [biblioteca fflate](https://github.com/101arrowz/fflate/blob/v0.8.3/docs/interfaces/InflateOptions.md).

Na publicação Python, o BFF captura as capacidades exigidas antes de qualquer
espera e antes de remover proveniência privada. A revisão só é admitida se o
runtime fixado e confiável tiver todas elas. A recusa conserva a publicação anterior.
Nenhum campo fornecido pelo navegador concede uma capacidade ao runtime.

O novo código permanece no chunk lazy de cenário. Medição local: 443.979 caracteres
no motor básico e 432.327 no avançado; gzip 128.414 e 130.290 bytes. Os motores sem
cenário continuam com 420.434 e 408.733 caracteres. Tetos iniciais da galeria e
tetos dos motores sem cenário não foram ampliados. A medição de compilação Bun é
separada do ensaio de execução no Chrome.

As [evidências](qa/colisoes-autorais/README.md) distinguem provas locais, motores
nativos, navegador, simulações e limitações restantes. O rollout da escrita de
nuvem e a aprovação do artefato publicado continuam vinculados à homologação de
staging; gerar uma distribuição local não a publica.
