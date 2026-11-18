# Revisão integral da missão do Pinta

Fonte: missão completa fornecida pela usuária em 18/11/2026, nesta conversa.
Base inicial: staging `567b93f95`; atualização integrada em `42b395d93`, incluindo as
correções remotas de mídia Blockly e execução do Estúdio. Implementação local preservada.

## Restrições globais

Evoluir o Pinta existente e preservar sua identidade visual, pixel/vetor e projetos publicados.
Não tocar em Molda Cenários 3D. Trabalhar em worktree isolado; não fazer merge, deploy ou push
em staging nesta revisão. Reutilizar contratos e evitar lógica duplicada. Provar alegações
com execução atual. Sem aprovação entre etapas: a usuária autorizou revisão e correções.

## Requisitos a conferir

| ID | Resultado obrigatório |
|---|---|
| R01 | Trava de clientes antigos nos três caminhos de nuvem; conflitos e recuperação sem corte silencioso |
| R02 | Documento nativo versionado, migração e bytes legados preservados; gravação e leitura seguras |
| R03 | Múltiplas folhas, grupos, ordem, visibilidade, bloqueio, alpha, offset, frente e parallax |
| R04 | Objetos estáveis, tipos, transformação, propriedades tipadas e relações |
| R05 | Referências a sprites, animações, peças e versões de recursos |
| R06 | Histórico por gesto, desfazer/refazer, duplicar, copiar/recortar/colar e seleção múltipla |
| R07 | Usar no Studio, Trazer do Pinta e Jogar meu mapa conservam o cenário estruturado |
| R08 | Dois motores JS renderizam camadas/folhas/frente/animação e executam colisão existente |
| R09 | Blocos consultam objetos, propriedades, início, áreas e portas sem lógica no Pinta |
| R10 | Sincronização de artes/cenas conserva programação, referências e revisões |
| R11 | Python/Pygame lê dados anteriores e atuais; PyDew Valley funciona sem regressão |
| R12 | Terrenos Wang genéricos com centro/bordas/cantos/transições e regras avançadas editáveis |
| R13 | Terrenos em lápis/borracha/balde/linha/retângulo, prévia, vizinhos, semente e undo por gesto |
| R14 | Biblioteca com miniaturas reais, prévia e posicionamento por clique/arrasto, encaixe opcional |
| R15 | Transformação, alinhamento/distribuição e movimentação de vários objetos |
| R16 | Conjuntos vivos, cópias soltas e modelos com propriedades conservam vínculos/posições |
| R17 | Espalhamento de objetos/vegetação: densidade, afastamento e semente |
| R18 | Formas completas, caminhos/patrulha, zonas e colisões personalizadas |
| R19 | Regiões, portas, inícios/inimigos, animação por tile e propriedades de camadas |
| R20 | Níveis Começar/Criar mais/Avançado realmente organizam a mesma oficina com curadoria |
| R21 | Ajuda, erros, cancelamento, teclado, foco, toque e desktop/notebook/celular |
| R22 | Teste com personagem real usa camadas/colisões/portas/perigos sem programar comportamentos autorais |
| R23 | Tiled JSON/TMX/TSX reais: gids/flags, objetos, propriedades, colisões e caminhos relativos |
| R24 | Importação Tiled ortogonal com relatório de perdas; ida e volta em ferramenta real |
| R25 | Phaser offline com licença, mapa real, renderização, camadas, colisão e objetos |
| R26 | Projeto Pygame portátil executável com camadas, objetos e artes |
| R27 | Adaptador Godot validado na versão-alvo; não prometer importação JSON direta |
| R28 | PNG, SVG, backup nativo e ZIP anteriores preservados; imagem não é o documento principal |
| R29 | Mapas grandes/expansíveis, chunks/culling/cache/minimapa e orçamentos medidos |
| R30 | Automapping avançado; isométrico e hexagonal com documento/render/export, sem opções decorativas |
| R31 | Vila e Floresta com 16+ camadas, duas folhas, porta, animação, frente, conjunto e personagem |
| R32 | Dez passos de aceitação: editar/salvar/reabrir/enviar/executar/atualizar/exportar/round-trip/recuperar/conflitar |
| R33 | Arquitetura, guias, compatibilidade, estados implementado/parcial/pendente e evidências distinguem ambientes |

Não considerar a tabela antiga de incrementos como substituta da missão. Um item fora do
recorte anterior continua sendo lacuna desta missão se não existir no código atual.
