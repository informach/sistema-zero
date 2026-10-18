# Molda — giro livre do mapa UV

Continuação da direção visual aprovada para a folha de pintura: manipular o mapa diretamente, com poucos controles e o mesmo estilo da plataforma, para crianças de 9+.

O formulário avançado já aceita ângulos, mas a folha mostrava somente o atalho de 90°. A interação principal passa a ter uma alça circular acima do centro da seleção. Arrastar gira as faces UV escolhidas em torno de seu centro; o ângulo aparece durante a prévia. Shift encaixa em passos de 15°. O botão de 90° continua disponível. Não há novos campos numéricos na interface principal.

O giro é calculado em pixels da textura para manter a forma em imagens retangulares. Navegação, troca de editor, revisão, seleção ou dimensões da textura cancelam a prévia. Esc, perda de foco, captura cancelada e ocultação da página também cancelam. Soltar confirma uma única edição reversível; nenhum pixel, vértice 3D ou face não selecionada é alterado.

A alça mantém alvo de 44 px durante o zoom e usa os tokens existentes. Pelo teclado, setas ajustam em 1°; Shift usa 15°. Enter confirma e Esc cancela.

Verificação: matemática de rotação de texturas retangulares e identidade em voltas completas; integração de prévia, cancelamento e troca de dono; navegador com arrasto de 37°, cancelamento, encaixe em 30° e Desfazer, mantendo geometria e pintura originais. Os cenários de UV existentes continuam cobrindo giro de 90°, alças de tamanho, zoom e movimento de pontos.

Validação local concluída em 18/10/2026: 22 testes dos módulos afetados passaram, assim como os seis cenários de UV nos temas claro/escuro em Chromium, Firefox e WebKit. Uma repetição dos três cenários escuros confirmou o arrasto de 397°, atravessando uma volta completa. Typecheck, build do playground, Biome nos dez arquivos alterados de código e `git diff --check` passaram. Logs em `packages/molda/.cache/free-uv-*.log`. Disponível no playground local.
