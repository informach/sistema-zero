# Molda: direção de arte e full review da reestruturação

15/10/2026 · Revisão do commit `6cf992f0` (oficina Modelar/Pintar/Animar) · Crianças de 9–12 anos no computador

Esta revisão olhou a reestruturação de 14/10 por dois lados: o **código** (três revisões independentes, uma por região da oficina) e o **visual**, como direção de arte, comparando a oficina com os cinco prints de referência e com a identidade das outras ferramentas da plataforma (Pinta, Estúdio, galerias). Antes: [entrega](2026-10-14-molda-usabilidade-entrega.md) e [revisão completa](2026-10-14-molda-usabilidade-full-review.md).

## 1. Diagnóstico visual

A estrutura dos prints estava certa (ferramentas à esquerda, palco no centro, peças e ajustes à direita, linha do tempo embaixo), mas a pele não. A oficina parecia um protótipo funcional ao lado do Pinta e das galerias:

| O que se via | Por que incomodava |
|---|---|
| Trilho como uma pilha de blocos cinza; a ferramenta ativa competia com eles | A hierarquia some: nada diz "esta é a escolhida" com folga |
| "Meus projetos" em pílula, nome com o caractere ✎, "Salvar" em verde solto | Diferente da barra do Pinta e dos prints (seta quadrada, lápis, selo menta "Salvo") |
| Faixa de cima, 3D e faixa de baixo com três fundos diferentes | O palco parecia três camadas empilhadas |
| "Olhar" como texto solto; zoom em dois botões separados | Controles sem casa, sem agrupamento |
| Dica num cartão branco igual aos controles | Orientação e comando com o mesmo peso |
| Lista de peças em cartões altos com "Peça" embaixo | Seis peças já pediam rolagem; o painel ficava pesado |
| "Lado · X" sem a cor do eixo; − e + em texto | A criança não liga o vermelho da alça ao "lado" do painel |
| Contorno azul da seleção sobre a peça azul padrão | A peça escolhida quase não se distinguia |
| Alças do three.js em vermelho/verde/azul puros | O único elemento com cara de "padrão de biblioteca" |
| Detalhes recolhidos em blocos cinza | Pareciam botões desligados |
| Transporte com ▶, ↤ e ‹ em texto; régua como barra de progresso grossa | Linguagem de formulário, não de linha do tempo |
| 390 px: cabeçalho e "Enquadrar" cortados, "Tamanh/o" quebrado; 820 px: painel cortado com vazio embaixo | Responsivo quebrado justamente nos tablets |

Capturas: antes [Modelar](img/2026-10-15-molda-direcao-de-arte/antes-modelar-duas-1440.png), [Pintar](img/2026-10-15-molda-direcao-de-arte/antes-pintar-1440.png), [Animar](img/2026-10-15-molda-direcao-de-arte/antes-animar-movimento-1440.png), [celular](img/2026-10-15-molda-direcao-de-arte/antes-modelar-390x844.png), [tablet em pé](img/2026-10-15-molda-direcao-de-arte/antes-modelar-820x1180.png).

## 2. Direção de arte aplicada

Princípio: **a mesma régua das telas-modelo da plataforma** (paleta do Pen, Nunito/Baloo 2, pílulas, controles de 40/44 px, cantos de 12/16 px, `--sz-tool-*`) e **a composição dos prints**. Nada novo de identidade foi inventado; o que existia passou a ser usado com consistência.

### Cabeçalho
- Seta de voltar no quadrado quieto (igual ao Pinta), com "Meus projetos" como nome acessível e `title`.
- Cubo do Molda + nome + lápis de verdade; o nome cede com reticências e nunca empurra as abas.
- Selo de salvamento em pílula: **menta "Salvo"**, neutra "Salvando", âmbar **"Pose por marcar"** (uma pose ainda não marcada não pode aparecer como salva) e vermelha **"Não salvou"**, que nunca encolhe para só o ícone. O erro agora é anunciado numa região viva sempre montada (antes ficava dentro de um menu fechado).
- Ajuda no mesmo quadrado quieto de desfazer/refazer; "Trazer arquivo 3D" vira só o ícone abaixo de 1280 px.

### Trilho da esquerda
- Ladrilhos **quietos em repouso**; só a ferramenta ativa ganha o acento cheio, com uma sombra curta.
- Rótulos de seção em caixa alta ("FERRAMENTAS", "ADICIONAR", "PINCEL"), como o "PRÉVIA" do Pinta, cabendo inteiros de 80 a 104 px.
- Formas em **ladrilhos tingidos** na cor de cada uma (caixa azul, rampa rosa, cilindro laranja, bola verde, apoio roxo), como as peças prontas dos prints.
- Pintar: as teclas reais (P, G, E, I) no canto dos ladrilhos, só com mouse; espessura em **três bolinhas** num segmentado (as palavras ocupavam 144 px); "Espelhar" como ladrilho de ligar no roxo do Molda.
- "Mais ferramentas", "Mais pincéis" e "Ferramentas que vêm por aí" como ladrilhos tracejados com seta, sem quebrar palavras.

### Palco
- **Uma superfície só**: as faixas de cima e de baixo dividem o clarão do 3D.
- Grupos flutuantes em **cartões brancos**: grade e ajustes à esquerda; Olhar (com o olho, tingido enquanto ligado), Vista e Enquadrar à direita.
- **Dica na pílula escura** (a âncora navy da casa) com a lâmpada amarela, centralizada no pé do palco, como nos prints. Botões que moram nela herdam o tema escuro.
- Zoom num cartão único com ícones; **legenda dos eixos** (X lado, Y altura, Z frente e fundo) a partir de 1280 px.
- Contorno da seleção em **âmbar** (o ouro da casa) e alças com as **mesmas cores dos selos** do painel.

### Painel da direita
- O título "Peças e propriedades" saiu da tela (continua como nome da região e alvo de foco do host); o painel ganhou respiro de 12 px.
- **Árvore compacta**: ícone de linha na cor da forma (pasta para grupo), nome, olho e cadeado; escolhida com fundo tingido e contorno azul. Contador de peças ao lado de "PEÇAS E GRUPOS".
- Cartão da peça: nome em Baloo, **selo do tipo** ("Caixa", "Grupo") e **"Duplicar" / "Apagar"** com nome (apagar em vermelho claro).
- Linhas de eixo com o **selo colorido da letra**, o nome como a criança diz ("lado", "altura") e passos − / + com ícone.
- "Colocar no chão" e "Colocar em cima" como dois cartões iguais lado a lado.
- Detalhes recolhidos viram **linhas com seta** (`.mld-disclosure`), não blocos cinza.
- Acabamento em três pílulas com a bolinha de cada brilho; "Sua cor" com a amostra grande, estrela de favorita e "+ Nova cor" tracejado.
- Abas do painel compacto (Peças/Ajustar, Movimentos/Peças/Pose) no mesmo segmentado em pílula das abas de cima.

### Linha do tempo
- Transporte dos prints: voltar ao início, pose anterior, **Reproduzir redondo no acento**, "Próxima pose →", tempo grande ("**2 s** de 2 s") e **Marcar pose em amarelo** à direita, a ação que a aba existe para fazer.
- Régua fina com marcas no lugar exato de cada tempo e a bolinha com anel branco; linhas de peça mais leves.
- Faixa vazia (sem movimento) com ícone e o caminho: "no painel à direita".

### Responsivo
- **390 px**: cabeçalho em três linhas sem corte, abas ocupando a largura, grupos do palco só com ícones, rótulos do trilho inteiros, dica visível na faixa dela.
- **820 × 1180**: o painel ocupa o que sobra abaixo do palco (antes, 420 px fixos cortavam "Colocar no chão" e deixavam um vazio).
- **1024 × 600** e **1172 px com o menu do Kids**: conferidos sem sobreposição; o botão de movimento pronto quebra em duas linhas em vez de cortar.

Depois: [Modelar](img/2026-10-15-molda-direcao-de-arte/depois-modelar-duas-1440.png), [Pintar](img/2026-10-15-molda-direcao-de-arte/depois-pintar-1440.png), [Animar](img/2026-10-15-molda-direcao-de-arte/depois-animar-movimento-1440.png), [Animar 1024](img/2026-10-15-molda-direcao-de-arte/depois-animar-1024x600.png), [celular](img/2026-10-15-molda-direcao-de-arte/depois-modelar-390x844.png), [tablet em pé](img/2026-10-15-molda-direcao-de-arte/depois-modelar-820x1180.png), [nível básico com o chrome do host](img/2026-10-15-molda-direcao-de-arte/depois-host-basico-1172.png).

## 3. Full review do código: achados corrigidos

Cada correção de domínio tem teste que **falha sem a correção** (conferido revertendo só o arquivo corrigido).

| # | Achado | Consequência para a criança | Correção |
|---|---|---|---|
| 1 | Formulários de animação comparavam `source === document`; depois da miniatura, `asset !== content` | Gravar/remover chave, duração, Repetir e copiar pose recusavam com "A criação mudou" | `sameSceneContent` nos cinco pontos |
| 2 | "Continuar a pose" não reconferia a revisão | Um rascunho velho era mesclado na criação editada depois | A oferta some quando o conteúdo muda e `restore()` recusa revisão diferente (teste) |
| 3 | Gesto recusado (peça travada) marcava a pose inteira como inválida | Marcar pose desligado e "Marcar" da decisão sem efeito | `refusal` separado de `error`: o recado aparece e a pose continua marcável (teste) |
| 4 | Desfazer todo o rascunho deixava só Refazer | Desfazer travado no Animar, sem voltar ao histórico confirmado | Rascunho responde só com passos para desfazer; senão, o histórico do projeto (barra e atalho) |
| 5 | Ctrl+Z no meio de um arrasto desfazia duas vezes | Perdia também o gesto anterior | No arrasto, Desfazer só cancela o arrasto (teste) |
| 6 | Novo movimento e "Usar movimento" montavam do `content` | Miniatura da galeria sumia ou ficava velha | `keepSceneThumb` |
| 7 | Forma nova só andava num eixo a partir da origem | Ao lado de uma peça erguida e afastada, nascia no chão, longe | Alinha base e centro com a referência (teste) |
| 8 | Arrastar o seletor nativo de cor empurrava cada passo em "Recentes" | As cores usadas sumiam da lista | Cor entra em "Recentes" no `change` nativo (teste) |
| 9 | Pegar cor num texel transparente devolvia tinta invisível | O Pincel passava a apagar | Amostra transparente mantém a tinta; o resto ganha alfa cheio (teste) |
| 10 | Prévia de movimento pronto "Modelo inteiro" criava grupo novo a cada prévia | A câmera pulava | Só peças novas pedem enquadramento |
| 11 | Mover escolhia peça travada | Toque engolido, sem mover nem girar a câmera | Peça travada fica fora do alvo de Mover |
| 12 | Arrasto deixava ±1e-15 no eixo que não se move | Ruído gravado na altura | O eixo da normal do plano é zerado |
| 13 | Olhar terminava mesmo com a troca de ferramenta segurada pela prévia | "Continuar ajustando" voltava sem Olhar e sem a ferramenta | Quem encerra é a oficina, quando a troca acontece |
| 14 | Caixa deitada de lado era recusada como apoio inclinado | "Colocar em cima" falhava num topo reto | Qualquer eixo de pé na caixa; no cilindro, só a altura (teste) |
| 15 | Prévia de "Colocar em cima" sobrevivia a desfazer, apagar e adicionar | O palco mostrava uma criação que não existia | A preparação termina quando o conteúdo muda |
| 16 | Apagar e Desagrupar sumiam com o próprio botão | Foco no `<body>`: Ctrl+Z e Delete paravam | O foco vai para o palco |
| 17 | "Editar malha" abria por baixo de uma prévia de pivô/divisão | Dois contextos misturados | Passa pela mesma decisão de prévia |
| 18 | "Escolha uma peça para pintar." era um alerta vermelho que atravessava as abas | Erro falso no Modelar e no Animar | Recado limpo na troca de aba; a dica do palco já pede a escolha |
| 19 | Olhar continuava depois de adicionar uma forma | O arrasto na peça nova girava a câmera | Adicionar encerra o Olhar |
| 20 | Pivô ficava ativo com várias peças | Cartão com botões desligados e sem motivo | Volta a Escolher com uma peça só |
| 21 | Esc numa prévia de pivô/divisão abria a decisão | Esc não cancelava | Esc é o Cancelar da barra da prévia |
| 22 | "Modelos prontos" clicável enquanto "Modelo" gravava | A criança era puxada para a oficina no meio da escolha | Desligado enquanto grava |
| 23 | Olho/cadeado trocavam o nome junto com `aria-pressed` | Leitor de tela lia ao contrário | Nome fixo, estado no `aria-pressed` e no `title` |
| 24 | Movimento pronto repetido gerava nomes iguais | "Pular", "Pular" na lista | "Pular", "Pular 2" (teste) |
| 25 | Seta de grupo da árvore invisível (`px-4` do botão base vencia o `px-0`) | Grupos não recolhiam | Botão próprio com o ícone |

## 4. O que ficou para depois

Registrado pelos revisores, fora desta entrega por exigir decisão de produto ou trabalho maior:

- **Animar**: "Marcar pose · 2 peças"; marcadores "Início"/"Fim do movimento"; "Mostrar todas as peças"; trocar de preset na prévia sem perguntar; "Modelo inteiro" avisar peças ocultas.
- **Pintar**: conversão indexada → RGBA silenciosa com a paleta cheia; prévia da nova cor de fundo numa peça já pintada; cursor de tamanho/cor do pincel na imagem; "Quadradinhos".
- **Modelar**: "Colocar em cima" no toque aplica sem prévia; arrasto em ângulo rasante não sugere outra vista; no corte, clique no fundo ainda marca ponto.
- **Casca**: renomear durante a preparação da tinta perde o alvo; o nome mostrado não é o normalizado que será gravado; "Começar vazio" no Criar novo.
- **Código morto**: o ramo `id === null` do `SceneWorkshopHost` (início, restaurar, lista) e o editor de modelo legado como fallback em `MoldaApp.open`.
- **Visual**: alças com o desenho próprio dos prints (bolinhas nas pontas) e o seletor de cor completo dentro do painel.

## 5. Verificação

- **3.105 testes do Molda passaram, sem falhas**, nas três partições: 1.079 (import/workers/export), 963 (cenas/componentes) e 1.063 (demais domínios), incluindo os 8 testes novos. Numa rodada, dois testes do editor de céu (que esta mudança não toca) falharam e passaram isolados e na repetição da partição inteira: intermitência registrada, não escondida.
- **90 testes do Kids** ligados ao Molda (cliente, nuvem, conformidade, guia da tarefa, acesso por nível e vocabulário).
- `tsc --noEmit` e Biome limpos em todos os arquivos tocados.
- **21 cenários E2E no Chromium passaram** (`e2e/`): criação, montagem, pintura real, pose composta, recuperação, pivô, divisão e os testes de layout de 1366 a 390 px. Firefox e WebKit não foram rodados nesta sessão.
- Capturas reais no Chromium em 1440 × 900, 1366 × 768, 1172 × 820 (com o chrome do host), 1024 × 600, 820 × 1180 e 390 × 844, nos níveis básico e completo, sem erros de página.

Limite: é uma revisão técnica e visual. Se a criança de 9–12 anos entende a oficina sem ajuda continua dependendo de observação com esse público.
