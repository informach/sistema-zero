# Arquipélago: geografia macro e primeira conexão

Direção fornecida pela dona em 15/11/2026, complementada pela decisão de que o jogo só está disponível para administradores: não desenvolver migração de contas nem compatibilidade com a geografia compacta.

## Primeiro marco

Blockout executável, com o controlador, câmera, toque, avatar Cute Characters e física reais do jogo. Sete territórios nos centros e envelopes do plano-mestre; terreno orgânico com relevo; oceano comum; seis conexões radiais declaradas; primeira ponte jogável entre Faísca e Bosque. O blockout é a ferramenta de construção e medição da nova geografia, antes de ligar conteúdo narrativo e serviços.

Fonte: C:/Users/tocha/Downloads/plano_macro_arquipelago_vagalume.md. As dimensões são hipóteses ajustáveis, não tamanhos aprovados por testes com pessoas.

## Identidade das interfaces

Decisão da dona em 15/11: preservar a identidade visual e o estilo atuais das experiências adulta e Kids. A organização, os fluxos e os componentes podem mudar para atender ao novo jogo, mantendo a linguagem visual de cada público. A troca das artes do mundo não autoriza um redesenho da marca das interfaces. O painel de medição do playground é uma ferramenta interna; não substitui o HUD do produto.

## Arquitetura

- Uma declaração de geografia fornece centros, contornos, distritos, chegadas e conexões. Coordenadas das atividades são locais à ilha; conversão global fica na fronteira do mundo.
- Setores de 80 m. Terreno distante simplificado permanece visível; terreno próximo usa a mesma função de altura em uma grade de detalhe, com colisores apenas nos setores próximos. Não ampliar os modelos compactos.
- A ponte usa âncoras calculadas no contorno e módulos com largura de 5 m. Quebrada e reconstruindo não oferecem piso no vão; aberta tem colisão contínua. Reconstrução termina antes de conceder acesso.
- O mundo macro usa escala 1 e as regras de movimento já derivadas dos clipes do avatar. O controlador e a câmera recebem a referência espacial da cena; não duplicar sua implementação.
- O oceano de teste é único, compartilhado, com fundo e linha d'água coerentes com o nado. O shader definitivo é uma entrega posterior.
- A ferramenta de blockout guarda somente a própria posição local e o estado de ensaio da ponte em uma chave própria. Não lê nem altera contas, inventários ou salvamentos remotos. O estado de ensaio não concede Núcleos nem conclusão narrativa.

## Alternativas consideradas

1. Geografia declarativa e setores desde o blockout: escolhida, porque terreno e atividade deixam de depender da posição global.
2. Sete modelos grandes completos: custo de memória e colisão cresce com toda a ilha; não atende ao objetivo.
3. Escalar a geografia compacta: mantém percursos e distribuição inadequados ao avatar nativo; não atende à direção fornecida.

## Aceite local

1. Sete territórios reconhecíveis e separados; mapa respeita seus centros e dimensões.
2. Avatar nativo, caminhada, corrida, pulo, toque e câmera reais.
3. Faísca e Bosque exploráveis; seis distritos da Faísca marcados para medir percursos, sem decoração final.
4. Primeira ponte partida bloqueia a travessia pelo piso; reconstruída permite ir e voltar sem frestas ou descarregamento sob o jogador.
5. Bordas dos setores coincidem; descarregamento libera geometria; contadores mostram setores e custo de desenho.
6. Posição guardada como ilha e posição local; reabrir retoma em chão seguro da mesma geografia. Falha de armazenamento fica visível.
7. Testes das regras, compilação, tipos e conferência no navegador. Emulação não certifica celular físico.

## Fora deste marco

Missões, migração, protocolo de Núcleos no servidor, arte definitiva, decoração das sete ilhas, Morada reposicionada e oceano definitivo. O próximo trabalho conecta o novo conteúdo aos sistemas preservados, depois de validar a geografia com o personagem real.
