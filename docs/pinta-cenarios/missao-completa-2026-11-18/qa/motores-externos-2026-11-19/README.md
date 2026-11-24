# Tiled, Phaser, Pygame e Godot reais

Ensaios locais de 19/11/2026, base `8cc4c8e7a`, após integrar a etapa 6 de
staging `87261f880`. Os logs e imagens nesta pasta vieram de pacotes gerados
pelo código corrigido. `checksums.json` registra os bytes originais das 21
evidências copiadas. Não contém conta, perfil de navegador ou autenticação.

## Correção encontrada no motor externo

No adaptador anterior, Tiled 1.12.2 completou o atlas da Vila de 28 para 32
peças e omitiu a regra Wang inteiramente zero. Importar não emitia aviso,
mas a comparação da cena inteira falhava. Quatro testes vermelhos reproduzem
a perda usando saídas nativas pequenas (`tiled-red.log`). A fixture em
`src/export/tiled/__fixtures__/tiled-normalized/` conserva entrada, imagens,
saídas nativas e hashes. Os metadados propostos foram colocados na entrada
antes da geração dessa fixture; as saídas do programa não foram editadas.

O exportador reserva a capacidade física dos atlas nos GIDs. Os metadados de
origem permitem restaurar a contagem autoral e as regras zero omitidas, sem
recortar nenhuma edição nova. Imagem alterada, uso da peça extra, propriedades,
animações, colisões e conjuntos não colocados preservam a capacidade física.
Uma regra Wang nova tem prioridade. Metadados inválidos são recusados.

Os hashes são sequenciais, com imagens limitadas pelo contrato existente.
A procura por referências percorre as células uma vez, sem copiar seus
buffers. O teste com 32 camadas e 2.097.152 células passou. Não foram ampliados
os limites; atlas com capacidade física acima de 256 são recusados no destino
Tiled. Não há mudança do formato nativo, da interface ou dos jogos publicados.

## Resultados

| Ensaio | Resultado observado |
|---|---|
| Suíte completa do Pinta | 2.216 aprovados, zero falhas/omissões; 27.004 asserções; 191 arquivos; 282,58 s |
| Foco na conversão | 101 aprovados, 1.016 asserções; inclui 24 casos novos |
| Tipos Pinta | código 0 |
| Scripts Pinta / galeria Pygame | 27 aprovados, 1.279 asserções; inclui regressão PyDew Valley |
| Biome do repositório | 16.422 arquivos, código 0; 303 avisos e 244 informações preexistentes |
| Tiled 1.12.2 | 4 pacotes, 5 mapas, 10 conversões nativas JSON/TMX; cena inteira igual e zero avisos |
| Phaser 3.90.0 | 10 aprovados, zero retries/omissões; desktop e toque emulado; 30,2 s |
| Pygame-ce 2.5.8 | PNG estruturado e pacote com pixels iguais, 18 camadas, duas folhas e portas de ida/volta; referências e quatro tempos de animação conferidos |
| Godot 4.7.2 | Vila e recursos com GPU; contornos e plataformas headless; quatro processos com código 0 |
| Godot: contornos/plataformas | 16 sondas de contorno; 58 verificações de plataformas, 16 casos geométricos |
| Comando oficial ampliado | `--exigir-tiled --exigir-pygame --exigir-godot`, código 0, quatro conversões adicionais da Vila/Cabana |

O Tiled abriu e reexportou arquivos JSON, TMX e folhas TSX reais. Os quatro
pacotes cobrem Vila/Cabana, recursos, contornos e arte. `tiled-native.json`
registra SHA-256 de cada saída. A versão do executável Windows vem do metadado
PE e do `tiledversion` exportado: o executável GUI não imprimiu `--version`.
SHA-256 do Tiled: `f6da55b3f236b600a46f522eeffcac8281251c8eda21255e401d6b186461a97a`.

Godot utilizou OpenGL 3.3, NVIDIA 610.88 e RTX 3050 desta máquina. A Vila
verificou pixels do personagem, água animada e primeiro plano, além de objetos,
IDs, propriedades, transformação, movimento, colisões e portas. Recursos
verificaram pixels vermelho/verde/azul/azul em 0/300/600/10000 ms. As imagens
foram inspecionadas. O Pygame usou SDL dummy e superfícies reais de software.

## Reprodução

Configure `PYTHON` com Python e pygame-ce, `TILED` com Tiled e `GODOT` com Godot:

```powershell
bun packages/pinta/scripts/homologacao/check.ts --exigir-tiled --exigir-pygame --exigir-godot
bun packages/pinta/scripts/homologacao/generate.ts .tmp/pinta-externos/vila
bun packages/pinta/scripts/homologacao/resources.ts .tmp/pinta-externos/resources
bun packages/pinta/scripts/homologacao/physics.ts .tmp/pinta-externos/physics --objects
bun packages/pinta/scripts/homologacao/platforms.ts .tmp/pinta-externos/platforms
```

O primeiro comando cria e remove somente sua pasta temporária. Nos demais
pacotes, execute `tiled --export-map json mapa.tmx saida.json` e
`tiled --export-map tmx mapa.json saida.tmx` em cada pasta `mapas/mapa-N`,
preservando as folhas e imagens relativas. A comparação usada foi
`verifyTiledPackage(pasta, ['saida.json', 'saida.tmx'])`; ela exige igualdade
integral e ausência de avisos. O script `verify-tiled.ts` sozinho não inicia
o programa Tiled.

No diretório `packages/studio`, execute a CLI Node do Playwright com
`test --config playwright.pinta.config.ts phaser-scenes.flow.ts`.
Para GPU Godot, importe primeiro o projeto (`--headless --editor --import`),
depois execute `test-godot.gd` ou `test-resource-godot.gd` no projeto gerado.
As sondas físicas são `qa-physics.gd` e `qa-platforms.gd` geradas nos pacotes.

## Falhas de preparação e limites da evidência

Uma primeira execução completa reprovou o registro arquitetural do novo
leitor de células. O importador foi incluído na lista revisada com sua
justificativa e uso de `cellTile`; a varredura não foi enfraquecida. A suíte
completa foi repetida e passou.

O primeiro lançamento Godot sem importar recursos falhou ao carregar PNGs.
A preparação foi corrigida para executar a importação normal do motor. Uma
segunda tentativa passou no jogo, mas o wrapper esperava `falhas=0` em vez
do literal real `falhas=false`. O wrapper foi corrigido e os quatro projetos
foram repetidos. Não foram removidas asserções ou alterado o adaptador Godot.

Esses testes exercitam programas externos reais nesta máquina. Toque é
emulado; não houve aparelho físico adicional, participante infantil ou
validação com leitor de tela. A etapa 0b autenticada, o rollout entre versões
e a etapa 8 continuam separadas. Isso não declara suporte a todo mapa do Tiled.

Contratos consultados: [JSON do Tiled](https://doc.mapeditor.org/en/stable/reference/json-map-format/),
[TMX/TSX](https://doc.mapeditor.org/en/stable/reference/tmx-map-format/),
[CanvasItem Godot 4.7](https://docs.godotengine.org/en/4.7/classes/class_canvasitem.html)
e [desenho 2D](https://docs.godotengine.org/en/4.7/tutorials/2d/custom_drawing_in_2d.html).
