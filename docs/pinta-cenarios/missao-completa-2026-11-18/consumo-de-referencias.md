# Consumo das referências no Estúdio

Complemento da etapa 2a do plano aprovado. Execução sequencial com `executing-plans`.

O contrato da cena já transporta as artes alcançadas por propriedades tipadas. O consumidor
deve permitir usá-las sem depender de uma segunda importação da biblioteca. Não se deve
registrar imagens por IDs globais no motor: dois mapas podem conter versões diferentes.
Também não se deve alterar o retorno legado de `mapObjectProperty`, usado em programas.

A solução acrescenta quatro consultas ao player compartilhado e ao catálogo existente de
blocos de Jogo 2D/Avançado. `mapResourceImage(cenario, id)` retorna o endereço da imagem do
recurso daquele cenário, aceito pelos carregadores atuais. `mapObjectById` resolve uma
referência de objeto, inclusive IDs qualificados de conjuntos. `mapLayerProperty` e
`mapTileProperty` abrem as propriedades tipadas já presentes. Referências ausentes retornam
vazio; zero, falso e texto vazio continuam sendo valores. Consultas não mutam os dados.

Python oferece as mesmas consultas no `Mundo` do módulo portátil e do Estúdio. Phaser recebe
automaticamente o player compartilhado. Godot expõe consultas equivalentes no script gerado.
Imagens relativas continuam relativas ao pacote em exportações externas.

No Python do Estúdio, `pinta.Mapa.recurso_imagem(id)` entrega uma `pygame.Surface` pronta
para `tela.blit(...)`. O módulo portátil expõe o caminho em `Mundo.recurso_imagem(id)` e
`Mundo.imagem(caminho)` carrega a Surface. No Godot, `recurso_imagem(id)` dá o caminho do
recurso e `_texture(caminho)` carrega a textura. IDs de objetos retornados por uma
propriedade resolvem pela mesma API, com identidade estável entre consultas.

Exemplo em JavaScript: `SZGameKit.loadImage('premio',
SZGameKit.mapResourceImage('mapa', SZGameKit.mapObjectProperty(objeto, 'premio')))`. No Jogo
2D, o endereço pode ir diretamente a `loadImage`/`loadSpriteSheet`. As dimensões dos quadros
e as sequências continuam no atlas da cena; essa consulta não transforma um atlas em um
único quadro nem registra nomes globais que misturem versões de mapas diferentes.

Medição do runtime: Jogo 2D 435.572 caracteres, Avançado 423.870; acréscimo de 15.138/15.137
sobre os motores sem cenário. Os tetos totais anteriores de 437.900/426.000 foram mantidos.
O fragmento sob demanda passa de 14.000 para 15.500, com medição e teste. Jogos sem cenário
continuam com 420.434/408.733 caracteres; não recebem essas consultas.

- [x] Testar falha inicial para recursos citados somente por propriedades, isolamento de mapas,
  referências de objetos de conjuntos, zero/falso/vazio e referências inexistentes.
- [x] Implementar no player, contrato e catálogo de blocos; medir o fragmento e os motores.
- [x] Implementar equivalentes Python/Godot e regenerar os artefatos compartilhados.
- [x] Executar testes de blocos, tipos, motores reais e navegador com imagem do recurso.
- [x] Registrar provas e commitar. O ciclo autenticado e a física continuam nas próximas partes
  da etapa 2; este lote não as considera concluídas.

As provas estão em `qa/referencias/`: 150 testes de blocos/motores e 47 de exportação,
quatro ensaios no navegador (desktop/toque), TypeScript completo de Pinta/Estúdio, consulta
real em Pygame, PNG portátil e Godot/OpenGL. PyDew Valley executou 60 quadros com 16 camadas,
349 sólidos e 55 cores. Foi corrigida também a escala dos recortes de artes no leitor Python
de PNGs: teste 2× falha sem a correção e passa com ela. Nenhum desses resultados é atribuído
a dispositivos físicos adicionais ou a staging autenticado.
