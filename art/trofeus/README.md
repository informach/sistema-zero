# Troféus do Sistema Zero

Os oito troféus são a única arte anterior preservada na migração Morada. Os identificadores de conquista não mudam. A estante passa a ser uma peça Morada, com slots próprios.

`items` e `thumbs` são as fontes autorais usadas por `scripts/morada/migrar.ts`, que prepara os arquivos endereçados por conteúdo no armazenamento privado junto das outras peças. Não há cópias nas pastas públicas das comunidades.

O gerador `trofeus.py` usa as primitivas de Blender de `lib_q.py`. Para regerar um troféu com Blender Python: `ROOM_OUT=<pasta de saída> python -c "import trofeus; trofeus.trofeu_primeiro_jogo()"`. Regere a miniatura ao alterar a arte e rode a importação Morada novamente.
