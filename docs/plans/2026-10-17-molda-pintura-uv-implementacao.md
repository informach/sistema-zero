# Molda — folha de pintura e mapa UV

Estado: implementação local concluída e validada.

Referência aprovada: [proposta de interface](./2026-10-17-molda-pintura-uv-interface-proposta.md).

## Interface entregue

- Entrada direta **Folha de pintura** na barra de Pintar. Dentro dela, **Pintar** e **Ajustar mapa** compartilham a navegação. UV não aparece no menu Opções.
- Folha à esquerda do 3D no desktop, divisor ajustável por mouse ou teclado e botão Ampliar/Restaurar. Em telas estreitas, Ver modelo/Ver folha alternam o conteúdo central.
- Zoom por botões, roda e pinça, deslocamento pela mão ou Espaço + arraste, Ajustar e Ver seleção. A câmera permanece ao trocar de modo ou fechar e reabrir a folha; redimensionar o painel mantém seu centro de interesse.
- Pintura com as ferramentas, cores, camadas e histórico existentes. Abrir a folha conserva o alvo explícito escolhido em Materiais, inclusive mapas de detalhe e quadros de animação.
- Pontos e alças de tamanho no mapa; encaixe nos pixels, proporção, girar 90° e espelhar. Os alvos das alças mantêm seu tamanho na tela durante o zoom.
- Seleção, organização e configurações numéricas ficam em menus locais. Os controles técnicos à direita não se expandem por abrir a folha.
- Barras de áreas com 52 px, botões compactos com alvos de 44 px e menus flutuantes dentro do tema do Molda. A variante compacta não altera o tamanho padrão dos demais botões.

## Precisão e interação

O mapa usa um bitmap com as dimensões originais da textura. A grade corresponde aos texels reais e os contornos têm espessura compensada pelo zoom. As faces são agrupadas em poucos caminhos SVG, evitando criar um elemento DOM por face em malhas densas.

Navegar cancela um gesto de pintura ou UV em andamento. Um ajuste confirmado gera uma etapa de Desfazer; Esc cancela o gesto. Na folha, Enter pinta ou confirma pelo teclado e Espaço fica reservado à navegação; as instruções acessíveis e os testes foram atualizados para esse contexto.

Pontos e regiões fora da textura continuam recebendo clique, inclusive após girar um mapa retangular. A seleção de uma superfície nativa, como a tampa do cilindro, é traduzida para suas faces no UV. Arrastos da visualização usam uma origem fixa e a posição final de soltura, incluindo no Safari.

Abrir a área não converte primitivas nem cria histórico. As capacidades de pintar a folha e editar UV continuam separadas. Organização automática utiliza o comando existente, com transferência da pintura e Desfazer.

## Validação

Suíte principal: **3.354 testes passaram** — 1.095 de importação/exportação, 1.159 de cena/componentes e 1.100 de contratos, acessibilidade, estado e demais módulos. Verificação de tipos, build do playground, Biome e `git diff --check` passaram.

A regressão no navegador verifica pintura real de um pixel após zoom e deslocamento, coordenadas sob o cursor, seleção, ajuste de pontos, escala pelas alças, cancelamento, Desfazer, persistência do enquadramento, ampliação e divisão do painel. Inclui temas claro/escuro e resoluções 1440, 1280, 1024 e 390 px. Uma imagem de 17×9 pixels é comparada byte a byte com a composição original para verificar ausência de reamostragem. A pinça é exercitada no Chromium.

A suíte UV foi incluída também nos projetos Firefox e WebKit. A execução integral inicial teve 102 cenários aprovados, quatro exclusões existentes e duas falhas: uma captura visual e a amostra final do deslocamento no Safari. Após as correções e conferências, a **matriz final de pintura/UV passou nos 18 cenários**, distribuídos entre Chromium, Firefox e WebKit, incluindo os dois temas. A tampa do cilindro e o arraste de um ponto fora da textura tiveram regressões reproduzidas antes das correções e aprovadas depois.

As referências visuais foram atualizadas para a barra aprovada, preservando os limiares de comparação. Uma captura do tema padrão apresentou diferença de 108 pixels, restrita a textos na inspeção do diff; a repetição isolada das cinco composições passou sem alteração de código, imagens esperadas ou limiares.

Capturas da interface: [claro](./references/2026-10-17-molda-pintura-uv/uv-claro.png), [escuro](./references/2026-10-17-molda-pintura-uv/uv-escuro.png), [folha ampliada](./references/2026-10-17-molda-pintura-uv/folha-ampliada.png) e [celular](./references/2026-10-17-molda-pintura-uv/celular.png).

Playground: http://127.0.0.1:5198/?nivel=god. Alterações locais, sem commit ou push nesta etapa.
