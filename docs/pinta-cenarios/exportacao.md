# Exportação para desenvolvedores

Todos os destinos partem de `exportPintaScene`, que resolve o mapa e seu fechamento visual.
O backup nativo acompanha os projetos para conservar os dados editáveis do Pinta.

| Saída | Como executar/usar |
|---|---|
| `.pinta.json` | **Trazer de volta** na galeria; inclui folhas, arte e conjuntos necessários |
| PNG com dados | `pinta.carregar_mapa('nome')` no Pygame (o módulo `pinta` do Studio); dados versão 1 para mapas antigos, 2 para cenas completas |
| Tiled JSON/TMX + TSX | abrir `mapa.json` ou `mapa.tmx`; imagens e folhas ficam no pacote |
| Phaser | servir a pasta por HTTP e abrir `index.html`; Phaser 3.90.0 e licença incluídos |
| Pygame | instalar `pygame-ce`; executar `python main.py` na pasta extraída |
| Godot | importar `project.godot` e iniciar a cena principal; versão ensaiada: 4.7.2 |

O pacote inclui `maps.json` e `start.json` para a cena inicial e as portas. O Phaser funciona
sem CDN: o JavaScript distribuído tem hash verificado por
`bun packages/pinta/scripts/generate-phaser.ts --check` (ou `bun run check:phaser` em
`packages/pinta`). Não abra pelo protocolo `file:`;
o exemplo carrega JSON e imagens por HTTP.

Os ensaios atuais de Phaser, Pygame e Godot estão no [QA](revisao-2026-11-18/qa.md).
Uma faixa de versões de motor não é considerada homologada por esse ensaio pontual.
Se um conjunto exige cisalhamento de imagens que o Tiled não representa, Pygame/Godot
mantêm o mapa e entregam `COMPATIBILIDADE-TILED.txt` no lugar do suplemento Tiled;
Phaser/Tiled recusam explicitamente. Confira esse relatório ao trocar de ferramenta.

No pacote Tiled, abra `mapas/mapa-N/mapa.json` ou `mapa.tmx`. A importação do Tiled escolhe
um mapa por vez; o `.pinta.json` do pacote restaura todos os mapas e desenhos juntos.
O orçamento de 128 MiB do pacote não aumenta o teto de 32 MiB do backup nativo.

O projeto Pygame contém o módulo de cena, imagens e exemplo de controle. A opção
`python main.py --frames 10 --screenshot captura.png` permite ensaio sem interação.
O script do projeto Godot (`pinta.gd`) cria `TileMapLayer`, `TileSetAtlasSource`, colisão,
animação, arte, áreas, caminhos e personagem a partir do `maps.json`; o parallax usa
`Parallax2D`. A revisão atual importou e executou o projeto no Godot 4.7.2 sem janela,
incluindo física, objetos, referências, animação e portas. A validação visual com GPU e
aparelhos físicos continua pendente: veja o [QA](revisao-2026-11-18/qa.md).

No Studio, use os blocos **Criar cenário do meu desenho**, **Desenhar cenário** (fundo/frente),
**Colidir com cenário**, objetos por tipo/nome, leitura de campo/propriedade, área, porta,
início e tamanho. São 12 blocos compartilhados por Jogo 2D e Jogo 2D Avançado. O exemplo
**A Vila e a Floresta** existe nos dois catálogos. Os blocos antigos continuam achatados.

No Estúdio Python/Pygame, a seleção **Cenário com outros lugares** produz um PNG derivado
com metadados `pinta` versão 3 e receita versão 2 (`map-world`). A raiz contém uma cena
estruturada e até 15 PNGs de destinos com metadados versão 2, sem mundos aninhados. O leitor
`pinta.py` acompanha **Baixar fonte**; o arquivo de arte é o mesmo usado na execução.
O backup `.pinta.json` continua sendo o documento autoral editável.

A distribuição Python declara a capacidade `pinta-map-world-v1`. Um host só oferece a nova
seleção quando o runtime fixado no projeto declara esse leitor; um editor sem host de execução
pode prepará-la para o computador. A execução recusa mundos vinculados em runtimes anteriores,
com mensagem de atualização e preservação do projeto. O marcador não publica nem qualifica
automaticamente uma distribuição. Backup e exportação de fonte continuam independentes disso.

```python
mapa = pinta.carregar_mapa('vila')
x, y = mapa.ponto_inicial()
porta = next(obj for obj in mapa.objetos() if obj.papel == 'door')
destino = mapa.abrir_destino(porta)
if destino is not None:
    mapa = destino
    x, y = mapa.ponto_inicial()
```

O jogo decide quando acionar essa troca. `abrir_lugar(id)` também permite escolher um mapa
do pacote por ID. As portas com referência tipada usam o ID; portas antigas com texto
conservam a resolução por nome. Um destino ausente ou ambíguo é recusado, sem ler um caminho
arbitrário do sistema de arquivos. O carregamento original de um único lugar permanece
disponível em **Mapa com camadas e objetos**, com a receita anterior.

O produtor registra também `output.dataVersion` na derivação: 2 para mapas avançados de
um lugar e 3 para mundos. A receita antiga `map` continua versão 1 e conserva sua identidade;
mapas de dados 1 mantêm os metadados anteriores, sem o campo novo. Cópias históricas não
são regravadas só por abrir. O leitor completo é exigido ao importar/atualizar essas novas
derivações, executar, gerar pacote web ou publicar. Uma recusa conserva o material e o
programa; o exportador desktop leva o `pinta.py` atual e continua disponível.

Antes de publicar, o servidor captura a exigência de leitor sem divulgar a receita ou a
proveniência privadas. A autorização precisa corresponder ao runtime exato. Dados 2/3 não
são publicados com um runtime que não declara suporte; numa atualização recusada, a revisão
pública anterior permanece ativa. [Contrato e provas](missao-completa-2026-11-18/qa/leitores-de-cenarios/README.md).

Os mundos têm orçamento acumulado de células, pixels e JSON; as cotas de material do
projeto também continuam valendo. Veja [contrato e ensaios](missao-completa-2026-11-18/mundos-no-pygame.md).

Para regenerar a referência e os arquivos derivados:

```powershell
bun packages/pinta/scripts/homologacao/generate.ts
bun packages/pinta/scripts/homologacao/studio-assets.ts
bun packages/pinta/scripts/pygame-gallery/generate.ts
bun packages/studio/scripts/gen-pinta-scene-python.ts
bun packages/studio/scripts/gen-python-text-sources.ts
bun packages/studio/scripts/generate-pygame-games.ts
bun packages/studio/scripts/gen-server-examples.ts
```

Para só conferir, sem gravar: `bun run check:homologacao`, `bun run check:pygame-gallery` e
`bun run check:phaser` em `packages/pinta`; `bun scripts/gen-pinta-scene-python.ts --check`,
`bun run check:python-text-sources` e `bun run check:pygame-games` em `packages/studio`.

`generate.ts` grava os pacotes em `output/pinta-cenarios/`, ignorado pelo Git (ou na pasta
passada como argumento). O gerador usa datas e identificadores fixos. `generate-pygame-games.ts`
recodifica os sons `.ogg` com o ffmpeg da máquina; os bytes mudam de uma versão do ffmpeg para
outra, então confira o `git status` antes de guardar o resultado. Depois de alterar PyDew, regenere também a cobertura dos blocos com
`packages/studio/scripts/python/pygame-block-coverage.ts`, usando Python com pygame-ce.

Mapas ortogonais finitos são o domínio comum. Colisão no JavaScript usa a grade física existente;
transformações de instâncias são amostradas nessa grade. Um orçamento recusado gera mensagem,
sem exportar uma versão truncada. A [compatibilidade Tiled](compatibilidade-tiled.md) detalha
o que pode ser convertido e os metadados adicionais.
