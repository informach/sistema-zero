# Pintura direta para crianças 9+

O usuário travou na pintura e pediu uma experiência mais simples, tomando a aba Paint do Blockbench como referência e mantendo o visual do Sistema Zero. A investigação no playground mostrou as cores prontas escondidas abaixo do seletor HSV, um painel avançado aberto por padrão que reduz a área das cores, e UV/Materiais expostos antes do primeiro traço.

## Direção

A atividade principal é escolher uma cor e desenhar diretamente na peça. Pincel, balde, borracha e pegar cor continuam nomeados no trilho esquerdo. A paleta pronta aparece primeiro à direita. A cor atual tem nome e amostra; criar uma cor personalizada abre o seletor completo quando necessário. As cores usadas aparecem depois do primeiro traço, e favoritos continuam disponíveis. Uma dica curta acompanha a ferramenta e explica como girar a câmera pelo fundo.

O vocabulário vem da oficina de pintura: pincel, tinta, borracha, balde, cor, folha e peça. As cores e tipografia são os tokens da plataforma, com a paleta alegre existente. A característica central continua sendo pintar a própria criação 3D e ver imediatamente a tinta nela. As escolhas substituem três entradas confusas: seletor técnico antes das cores prontas, camadas abertas antes do primeiro traço e configuração de UV como ação de entrada.

A folha de pintura permanece acessível para quem quiser desenhar na imagem aberta. UV e materiais ficam em Mais ferramentas. Camadas, formas e ajustes detalhados ficam recolhidos no desenho direto; abrem no contexto da folha, UV ou de uma camada escolhida explicitamente. O conta-gotas permanece como ferramenta nomeada no trilho, sem um segundo ícone duplicado na paleta. Abrir Pintar não cria um passo de desfazer; a preparação automática acompanha o primeiro traço, como hoje. Não alterar a geometria nem a pintura já salva para simplificar a interface.

## Verificação

No navegador, testar a entrada sem seleção, cores prontas visíveis e clicáveis, o primeiro traço diretamente na peça, balde e borracha, troca de cor, desfazer/refazer e a folha de pintura. Verificar as opções personalizadas/avançadas quando abertas, os temas claro/escuro e a tela pequena. Manter os testes de persistência, cores, limites de face, acessos por nível e histórico do motor de pintura. Executar typecheck, Biome e build.

## Resultado

135 testes de integração, pintura, inventário e acesso por nível passaram. Cinco cenários no Chromium passaram: desenho direto nos temas claro e escuro, paleta em 390 × 844, gesto de câmera fora da peça e pintura na folha com desfazer/refazer e reabertura. O cenário de tela pequena também verifica o retorno do foco ao menu recolhido após fechar Materiais. Typecheck, Biome dos arquivos alterados e build do playground passaram. As capturas locais estão em `packages/molda/.cache/pintura-simples-*.png`.

## Faces fora do plano

O print seguinte revelou uma peça sem imagem cuja preparação detecta faces fora de um plano. A preparação da folha examina todas as faces do material, então até um clique numa face plana pode precisar dessa decisão. O caminho do traço direto lançava um erro genérico sem abrir a escolha já disponível pela seleção da peça, e essa escolha ficava no fim do trilho esquerdo.

O contato agora comunica uma necessidade de preparação tipada ao estado da oficina. A paleta apresenta “Preparar para pintar” junto das cores, com a explicação da divisão em triângulos. A preparação só ocorre após o clique e continua incluída no primeiro traço, com desfazer integral. Pintar outra peça retira o pedido anterior. “Cor de fundo da peça” aplica diretamente a aparência, sem exigir imagem, UV ou divisão de faces. Esse pedido fica recolhido enquanto a ferramenta troca apenas a cor de fundo.

Os testes reproduzem os dois bloqueios antes da correção, confirmam recuperação e histórico, e exercitam a mesma sequência no Chromium com geometria inclinada e contatos reais no 3D. A captura do pedido está em `packages/molda/.cache/pintura-preparar-peca.png`.
