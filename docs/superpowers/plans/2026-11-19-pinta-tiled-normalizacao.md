# Execução: Tiled real e atlas parciais

Design: `docs/plans/2026-11-19-pinta-tiled-normalizacao-design.md`.

- [x] Gerar pacotes atuais e reproduzir a diferença no Tiled 1.12.2 real.
- [x] Criar fixture nativa pequena e testes vermelhos de conservação.
- [x] Preservar contagem, regras zero e espaços de GIDs sem cortar novas edições.
- [x] Repetir os dois sentidos de conversão e os consumidores externos.
- [x] Executar gates, revisar orçamento/compatibilidade e registrar o commit.
- [x] Integrar a entrega verificada e atualizar a matriz da etapa 7.

Entrega funcional `1ec5ca769`, reunida com os recibos do runtime f11 e as
correções de QA/CI. Remoto `ad492302a` integrado sem alterar sua implementação
3D. Após o merge: 88 testes Tiled / 873 asserções, tipos completos do Estúdio
com código 0 e Biome em 16.452 arquivos com código 0. Dois relatórios JSON do
remoto precisaram somente de formatação; igualdade dos valores conferida.
O CI completo e o ciclo autenticado continuam sendo verificados separadamente.
