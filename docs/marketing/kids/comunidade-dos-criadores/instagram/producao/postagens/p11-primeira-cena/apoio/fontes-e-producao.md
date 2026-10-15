# P11 · Uma primeira cena

Produção de 14/10/2026. Oito PNGs em **1080 × 1350**, conforme a [ficha vigente de P11](../../../../postagens/02-p11-a-p20.md#p11). Série **Por trás do jogo**, dor D11, atração. Copy e legenda preservadas integralmente; convite para seguir no último slide. Paleta azul, creme e amarelo; fontes Nunito 600/800.

## Imagens novas

Três imagens produzidas com a ferramenta nativa `image_gen`, destinadas aos slides 1, 2 e 6. [Prompts completos](prompts.json) e [origem dos arquivos](imagens-geradas.json).

- Slide 1: menino e pai fictícios conversam sobre um mapa desenhado, na cozinha. O mapa é uma ideia imaginada, com vila, castelo, caverna e dragão; não representa um mapa completo disponível em um curso.
- Slide 2: nova cena com as mesmas pessoas. A [captura real do Estúdio vazio](02-estudio-vazio.png) foi fornecida ao gerador para compor a tela do monitor. A fotografia não é um registro de aluno ou atendimento; a referência da interface foi conferida na imagem final.
- Slide 6: folha com duas listas, mãos e lápis. Uma única cena na primeira coluna; outras ideias na segunda. Texto manuscrito conferido visualmente. As ideias de castelo e personagens são sugestões de planejamento, não etapas anunciadas do exemplo.

## Demonstração real

Fonte: `vilaDoDragaoExample`, em `packages/studio/src/official-extensions/game-2d-advanced/examples/vilaDoDragaoExample.ts`. Foi executado o exemplo atual no runtime do Jogo 2D Avançado, em navegador local isolado. [Código original gerado](vila-original.js), [código usado para captura](vila-captura.js) e [estados registrados](capturas-verificadas.json).

O percurso foi feito pelo teclado, sem acrescentar a chave ou acionar a batalha artificialmente:

1. Iniciar a aventura e ouvir as duas falas da abertura.
2. Capturar a fala **O dragão roubou o ouro. Tome a chave e entre na caverna ao sul!**, ainda sem a chave.
3. Encerrar a conversa. A regra de atualização verifica `missao-pronta` e a ausência da chave; entrega o item, marca a missão aceita e cria a porta.
4. Andar até o caminho para o sul, chegar diante da porta e atravessá-la.
5. Na caverna, aproximar-se do dragão e pressionar espaço para abrir a batalha.

Foram conferidos o item recebido, a mudança de mapa, a posição diante da porta, o estado de batalha e as ações do menu: atacar, golpe especial, defender, poção e fuga. A captura não testa a vitória, que não é necessária à narrativa deste carrossel.

Na captura da fala, um ajuste **somente na cópia de produção** oculta o painel fixo de objetivo, que ficava por trás do balão. A fala nativa, seu texto, o cenário e as regras continuam iguais. O ajuste fica registrado em `vila-captura.js`. O relógio do navegador foi controlado para esperar o texto terminar. Nenhum personagem, porta ou texto do jogo foi reconstruído por IA.

O enquadramento usa o que a versão atual do exemplo de fato renderiza: herói azul, ferreiro simples, cenário de formas, porta amarela e batalha. Não se inventou arte mais elaborada para atribuí-la ao exemplo. As capturas brutas têm 1920 × 1280; os SVGs da montagem apenas recortam e ampliam essas imagens. A observação antiga da ficha sobre câmera não foi usada para fabricar uma vista diferente.

## Recortes e leitura

- Slide 3: caminho real, herói azul e entrada da caverna. A pequena legenda de cor identifica o herói.
- Slide 4: dois recortes da mesma captura, um para os personagens e outro para a fala completa. A moldura é editorial; o texto dentro dela é da captura.
- Slide 5: dois comandos reais destacados da regra, **Ganhar o item chave** e **Criar a porta**, acompanhados de recortes da mesma entrada antes e depois da conversa. São trechos da regra, não sua montagem completa. [Regra integral](05-bloco-rule.png) e [valores capturados](blocos-capturados.json).
- Slide 7: momento posterior, com o herói diante da porta, antes de atravessá-la.
- Slide 8: batalha nativa e convite para seguir. O menu não é uma imagem inventada de jogo comercial.

## Conferência

[Montagem e igualdade de copy](verificacao.json). [Verificação final](entrega-verificada.json): oito PNGs, dimensões, fonte, links, legenda, integridade das fontes e correspondência do percurso com o exemplo. Inspeção visual das oito artes e dos recortes finais, incluindo a escrita da folha e a fala do ferreiro.

Scripts de produção em `output/instagram/p11-2026-10-14/`. Material produzido localmente, sem publicação ou agendamento. As verificações editoriais e funcionais não medem retenção, aprendizado ou conversão.
