# Modelo e operações de regiões — 21/11/2026

O TilemapAsset/TilemapLayer existente aceita o tipo de células como parâmetro,
mantendo Int16Array como padrão. Não há outro editor ou cópia do modelo de objetos,
grupos e recursos. RegionTilemapAsset é uma preparação em memória, excluída de
PintaAsset e dos escritores atuais. O máximo aceito pelo editor continua 7.

Operações puras convertem explicitamente o mapa denso, expandem a extensão sem
mover dados/objetos, editam um gesto e conservam os demais buffers. A conversão
admite o mapa inteiro antes de alocar chunks; o orçamento ocupado é compartilhado
entre camadas. Recusas são atômicas e a expansão nunca recorta silenciosamente.

Sete novos testes cobrem referências, grupos, propriedades de portas, origens
negativas, histórico por compartilhamento, bloqueios herdados e o limite global
de 2.048 chunks, incluindo liberação e criação de região no mesmo gesto.
Passaram 46 testes focados no lote final, tipos completos de Pinta/Estúdio e lint.
O primeiro runner parou por nome de log já existente. O seguinte revelou apenas
duas asserções de identidade entre uniões de camadas de células diferentes; elas
foram tipadas pelos grupos/objetos efetivamente comparados, sem cast. Os recibos
iniciais e a falha de tipos permanecem registrados; o lote final passou nos quatro
controles restantes. O comparador anterior prova que os dois módulos preexistentes
emitem exatamente os mesmos bytes JavaScript sem comentários. O módulo novo de
operações é consumido apenas pelos seus testes, enquanto a integração prossegue.

Isto não comprova schema 8 de arquivo, persistência 3, autoria esparsa no navegador,
cena 4, novo runtime, desempenho ou exportação externa. Esses itens continuam
pendentes no plano. A suíte e os doze ensaios do commit d106 são evidência daquele
lote; não são apresentados como uma nova homologação de regiões pela interface.
