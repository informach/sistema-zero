# Normalização real do Tiled 1.12.2

`normalized.tmx` e `normalized.tmj` foram gravados pelo executável Windows
do Tiled, a partir de `source.tmj`. Versão, comandos e hashes em `origin.json`.
Os PNGs foram gerados com cinco peças coloridas, uma célula transparente de
preenchimento e uma segunda folha cinza.

A entrada declara cinco peças em três colunas. O Tiled salva seis peças e
omite a regra Wang de oito zeros. O segundo `firstgid` fica em 7, preservando
o espaço físico da folha anterior. A fixture verifica a conservação da cena,
e não apenas a aceitação sintática do XML.

Os metadados propostos `pinta:atlas` e `pinta:emptyTiles` foram colocados na
**entrada** antes da execução do Tiled. As saídas não foram editadas para
acrescentá-los. O teste do exportador também exige esses mesmos dados.
`expected.json` descreve a cena autoral esperada, com caminhos para os PNGs.
