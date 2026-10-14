# P34 — refação completa das mídias

Produzido em 13/10/2026. Copy vigente integral, com 8 slides e convite final separado. Sem entrada de ManyChat. PNGs 1080 × 1350 (4:5).

## Cenas e identidade

Todas as cenas com pessoas foram geradas novamente com a ferramenta integrada image_gen, usando os retratos autorizados para orientar a fisionomia. Não reutilizam o enquadramento dos vídeos ou das fotos originais. Não são registros históricos das situações narradas. As telas fotografadas foram orientadas por referências reais da plataforma. As comparações de jogo e os recortes dos blocos são capturas diretas do runtime e do Blockly oficiais.

As falas são da copy aprovada, sem criar um novo depoimento para acompanhar a cena. A origem das cenas está também no texto alternativo. Não se acrescentou o rodapé “Cena ilustrativa” nem “Demonstração da equipe”.

Arquivo de prompts e referências: [prompts.json](prompts.json). Imagens geradas: [p34-daniel.png](p34-daniel.png), [p34-rafael.png](p34-rafael.png), [p34-pai-filho.png](p34-pai-filho.png), [p34-reclamacao.png](p34-reclamacao.png).

## Capturas e verificação da demonstração

Base: Batalha de Monstrinhos Profissional, Jogo 2D Avançado, em packages/studio/src/official-extensions/game-2d-advanced/examples/batalhaProfissionalExample.ts. Runtime oficial.

Comparação da mesma batalha de Alice, com a mesma ficha de Folhito nível 5 e Faisco nível 5, usando Brasa. A entrada na batalha usa a API pública pkmBattleTrainer com o time original da rival, sem alterar seus atributos. O golpe é escolhido pelo teclado real; a resolução usa o motor original. Aleatoriedade fixada em 0.5 nas duas partidas para manter o mesmo acerto e a mesma variação de dano. O único comando alterado é pkmTypeChart("fogo", "planta", 2) para 1.5.

Capturas do mesmo momento depois de Brasa: batalha-antes-5.png e batalha-depois-5.png. A barra de Folhito fica menor com 2 e maior com 1.5. Nenhuma barra ou mensagem foi desenhada manualmente. O destaque amarelo na tabela é uma marca editorial sobre a primeira linha real, com 1.5; não altera o conteúdo do bloco.

Os blocos foram renderizados com Blockly e as definições oficiais da extensão. Os recortes isolados retiram apenas a moldura da área, preservando o comando real.

Falas literais: Daniel, pai do Rafael, AV11, trecho 25,26–30,22 s do vídeo autorizado; a frase do filho citada por Daniel está em 28,58–30,22 s. O quadro aos 12 s serviu somente como referência de fisionomia. O relato do Rafael vem do depoimento da oferta do Desafio do Primeiro Jogo. O slide 7 não tem imagem da batalha nem atribui esse jogo ao aluno.

O novo retrato do Daniel usa como referência de tela packages/funnel/public/img/comunidade-dos-criadores/tela-jornada@2x.webp. A marca antiga não foi mantida. Não há áudio sintético nem alteração dos vídeos originais.

## Montagem e conferência

Layout nativo em HTML/CSS; Nunito 800/600, azul #194bd7, creme #fffcf4 e amarelo #ffdb56. A montagem editável está dois níveis acima. Os PNGs finais foram exportados no Chrome, sem copiar o texto sobre imagens antigas.

Verificações: contagem e dimensões dos PNGs; copy extraída da ficha comparada integralmente com os parágrafos da arte; legenda integral; carregamento das imagens/fontes; limites dos elementos; inspeção de prévias e slides de comparação. [Relatório de layout](verificacao-layout.json).

Scripts de produção e cópia das artes anteriores: output/instagram/refazer-3-2026-10-13 no workspace. O código da plataforma e os depoimentos originais não foram alterados.

Nenhuma publicação, agendamento ou automação foi executada.
