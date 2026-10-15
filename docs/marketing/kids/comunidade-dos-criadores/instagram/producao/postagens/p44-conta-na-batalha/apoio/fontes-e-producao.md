# P44 · Uma conta na batalha

Produção de 14/10/2026. Sete PNGs em **1080 × 1350**, seguindo a [ficha vigente de P44](../../../../postagens/10-p41-a-p50.md#p44). Série **Por trás do jogo**, desejo W14. Copy e legenda preservadas integralmente. Paleta azul, creme e amarelo, com Nunito 600/800.

## Cenas de família

Slides 1, 6 e 7: fotografias novas geradas com `image_gen` nativo. A menina, a casa e a atividade são encenadas; não representam aluna identificável ou depoimento. A referência da primeira foto mantém fisionomia, roupa e ambiente nas cenas seguintes, com enquadramentos diferentes.

- Slide 1: conta no papel ao observar a batalha; imagem real do jogo como referência da tela.
- Slide 6: comparação da previsão no papel com a tela de vitória do teste de ataque de dez.
- Slide 7: cálculo antes de testar um protótipo original diferente. A tela usa uma [captura real do Estúdio](07-estudio-prototipo.png) como referência, com o projeto **Duelo das formas**.

O protótipo foi preparado para produção e não tem autoria atribuída à menina. [Fonte do protótipo](prototipo-original.js). As telas integradas nas fotografias são composições do gerador; as provas funcionais são as capturas diretas e os estados registrados. [Prompts completos](prompts.json) e [origem das imagens](imagens-geradas.json).

## Batalha real

Fonte: `batalhaMonstrinhosExample`, em `packages/studio/src/official-extensions/game-2d/examples/clearcode/batalhaMonstrinhos.ts`. Foi usado o **Jogo 2D básico**, com o runtime atual, código gerado pelo Estúdio e a fonte nativa Baloo 2. Não foi usada a versão Profissional.

A versão original tem vida 20, força 4 e dano da Faísca igual à força multiplicada por 2. A cópia comparada muda somente o valor inicial de força para 5. Ambas foram executadas em navegador, usando Enter para iniciar e a tecla 1 para atacar, respeitando a vez do jogador. A aleatoriedade foi fixada em 0,5 para repetir o mesmo contra-ataque do rival. Um relógio controlado permitiu capturar os momentos, sem alterar os intervalos ou as regras do jogo.

Uma função de leitura foi acrescentada à cópia de captura para registrar vida, força, dano, turno, mensagem e vitória. Ela não escreve no estado do jogo. Não houve alteração de código da plataforma, contas ou projetos de alunos.

| Teste | Vida inicial | Após 1 ataque | Após 2 ataques | Após 3 ataques |
| --- | --- | --- | --- | --- |
| Força 4, dano 8 | 20 | 12 | 4, luta continua | 0, vitória |
| Força 5, dano 10 | 20 | 10 | 0, vitória | Não necessário |

[Estados e capturas conferidos](capturas-verificadas.json). [Cópia com força 4](batalha-forca-4.js) e [cópia com força 5](batalha-forca-5.js).

## Montagem visual

- Slide 2: captura completa do começo da batalha, com barras cheias e menu. O selo **20 de vida** é uma anotação editorial.
- Slide 3: recortes reais de Folhito antes, depois do primeiro e depois do segundo ataque de oito. As barras são nativas. Os valores 20, 12 e 4 foram acrescentados à arte a partir do estado registrado, pois o jogo não imprime esses números junto das barras.
- Slide 4: recorte dos blocos nativos do Estúdio e captura do primeiro ataque. Os blocos de força, cálculo do dano e alteração da vida foram isolados para leitura, conservando seus textos, valores e conexões internas. O bloco de criação da força fica separado, como na lógica original. [Blocos capturados](blocos-capturados.json). A mensagem da Faísca permanece dentro da captura; não foi reescrita como copy.
- Slide 5: teste identificado na arte. Recortes reais da vida 20, depois 10 e da tela de vitória após o segundo ataque. O número 0 é anotação editorial baseada no estado registrado; não é uma barra inventada sobre a tela de vitória.

As barras, personagens, comandos e telas de vitória das demonstrações não foram redesenhados por IA. A montagem aplica recortes, números e organização visual. As cenas humanas foram geradas separadamente.

## Entrega e conferência

Cada slide foi conferido visualmente, incluindo a comparação das barras e números, leitura no tamanho de celular e continuidade das cenas. A [verificação da montagem](verificacao.json) compara a copy com a ficha, confere fontes, imagens e limites. A [verificação final](entrega-verificada.json) verifica PNGs, legenda, links locais e resultados de ambas as batalhas.

Scripts reproduzíveis em `output/instagram/p44-2026-10-14/`. A montagem usa fontes e imagens locais guardadas nesta pasta. Revisão editorial e verificação funcional não são teste de conversão. Material produzido; sem publicação, agendamento, commit ou deploy.
