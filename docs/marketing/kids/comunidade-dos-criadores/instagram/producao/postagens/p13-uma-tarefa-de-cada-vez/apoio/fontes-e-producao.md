# P13 · Uma tarefa de cada vez

Produção local em 14/10/2026. Oito slides de 1080 × 1350, proporção 4:5 e perfil sRGB. Primeiro post da semana 12 do calendário comum; série Teste em casa; hipótese de dor D13. Destino: perfil, com convite para seguir.

## Copy e direção

Fonte: [ficha atual do P13](../../../../postagens/02-p11-a-p20.md#p13). Copy e legenda preservadas integralmente; [registro do texto](copy.json) e [conferência](verificacao.json). [Direção visual vigente](../../../../postagens/05-direcao-visual-e-producao.md).

O exemplo escolar organiza uma apresentação sobre um animal em tarefas concretas. Não é uma pesquisa sobre prevalência de dificuldade infantil nem um diagnóstico. O jogo mostra outra situação em que uma sequência de ações precisa funcionar. A peça não promete transferência automática para notas ou desempenho escolar.

## Imagens geradas e montagem

Cinco cenas fotográficas e uma ilustração foram criadas com a ferramenta nativa image_gen.imagegen, sem substituição por CLI. São seis imagens distintas. A menina e a tarefa escolar são fictícias. Não há fotografia ou depoimento de aluno. [Prompts e referências usados](prompts.json). [Origem, arquivos escolhidos e hashes](imagens-geradas.json).

As folhas e bilhetes foram gerados em branco. Os textos foram aplicados em HTML para preservar grafia e legibilidade. A mesma mesa, caderno e mangas conectam o pedido inicial à tarefa concluída. Os esboços de movimento e obstáculo são ilustração editorial, sem imitar interface real.

## Demonstração real do jogo

Base: packages/studio/src/official-extensions/game-2d-advanced/examples/defesaDoReinoExample.ts, exemplo Defesa do Reino. O projeto original foi exportado e executado localmente com o runtime do Estúdio. As regras não foram alteradas. Sem conta autenticada, sem captura de uma aula publicada e sem atribuição a aluno.

A torre escolhe o invasor vivo com maior progresso no caminho e ataca dentro do alcance de 220. A saúde inicial do invasor é 30. Dois tiros de 15 o derrotaram; a recompensa foi de 10 moedas, com o saldo indo de 50 para 60. As chamadas e os estados estão em [capturas-verificadas.json](capturas-verificadas.json). A instrumentação apenas observa chamadas originais e preserva o retorno delas. [Código original exportado](jogo-original.js).

Slide 6: visão ampla com dois invasores visíveis. Slide 7: três momentos da mesma execução, da seleção do invasor à recompensa. Círculos amarelos e rótulos de etapas são editoriais. A seleção do alvo já ocorreu quando o primeiro disparo aparece. O terceiro quadro ocorre depois de dois acertos, sem alegar que um tiro único derrota o invasor.

Os comandos foram renderizados pelo Blockly original do Estúdio com o IR do exemplo: sz_gk_pick_active, sz_gk_launch_towards e sz_gk_td_add_coins. [Registro](blocos-capturados.json). Os dois primeiros aparecem em recortes para leitura; as opções de maior progresso e velocidade 420 continuam presentes nas capturas integrais de apoio. Não foram inventados blocos ou reescritos controles. O terceiro comando aparece inteiro.

## Fontes e entrega

Nunito 600 e 800 reutilizadas da produção anterior. Caveat, fonte manuscrita, baixada do [repositório oficial Google Fonts](https://github.com/google/fonts/tree/main/ofl/caveat), licença [SIL Open Font License](Caveat-OFL.txt). Fotografias e capturas foram compostas no navegador, sem edição de imagem por Python.

- [Prévia](../index.html), [montagem editável](../montagem.html) e [legenda](../legenda.txt).
- [Textos alternativos](../texto-alternativo.txt), com versões curtas de até 100 caracteres e origem descrita.
- [Orientações de publicação](../publicacao.txt), incluindo Rótulo de IA.
- [Verificação final](entrega-verificada.json): dimensões, texto vigente, fontes, arquivos, links e integridade das imagens.

Scripts reproduzíveis em output/instagram/p13-2026-10-14/ na raiz do repositório. Produção local; sem publicação, agendamento, ZIP, commit ou deploy. Próximo carrossel: P50, segundo post da semana 12.
