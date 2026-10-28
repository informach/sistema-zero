# Padrões de produção do Arquipélago Vagalume

Pedido da dona (27/10/2026): tudo organizado, profissional e de qualidade, como fazem os estúdios
de jogos. Este arquivo é a régua de toda entrega do jogo. O andamento fica na página de
acompanhamento (https://claude.ai/artifact/7SD9EvXFKNotDkuSGb1TW4): cada item de lá é uma entrega,
e ele só é marcado quando passa pela definição de pronto abaixo.

## Definição de pronto (vale para cada item)

1. Funciona no playground (`bun run --filter @sistemazero/arquipelago dev`), do jeito que a criança
   vai usar, no computador e no toque.
2. Regras puras com teste unitário (`src/sistemas/`), sem React nem three.js dentro delas.
3. `bun test`, `tsc --noEmit`, `bun run build` e `biome check` passando.
4. Prints de dia e de noite (e do caso de erro, quando houver) revisados antes de mostrar.
5. Desempenho medido no lugar onde a mudança aparece (ver o orçamento) e anotado no relatório.
6. CLAUDE.md e README da pasta atualizados quando o contrato muda.
7. Revisão do diff inteiro antes do commit; commit com mensagem que diz o que muda para quem joga.
8. Item marcado na página de acompanhamento, com a nota do que ficou de fora, se ficou.

## Arte (Blender por script)

- **Reprodutível:** toda peça sai de um script em `arte/<grupo>/` com `build_all.py`, que confere o
  contrato (nós, animações, materiais, tetos) e falha se algo sair do combinado. Nada é editado à
  mão no GLB.
- **Unidades e origem:** 1 unidade = 1 metro; a origem fica na base da peça (no chão), virada para
  +z (frente); ilhas com a chegada da ponte em +x do modelo.
- **Orçamento por peça:** item pequeno até 4 mil triângulos, bicho e Lumi até 3 mil (bicho de
  colo até 4 mil), morador até 6 mil, ilha completa até 40 mil e 1,5 MB, objeto criado pela
  criança até 5 mil. Exceção só com motivo escrito no README do grupo.
- **Nomes que o jogo lê:** nós e materiais têm nome fixo e documentado (`luz` para o que acende,
  `tampa`, `mao`, `sela`, âncoras como `chegada`, `morador`, `lumi-1`...). Nome de âncora nunca
  repete nome de nó.
- **Colisão autoral:** formas simples e invisíveis com prefixo `col-` no próprio GLB (caixa,
  cilindro; malha só para o terreno). O jogo cria os colisores a partir delas e as esconde no
  render. Colisão nunca é a malha de desenho.
- **Animação:** nomes em português (`parado`, `andar`, `falar`...); todas as animações de um
  personagem mexem os mesmos ossos, para a troca nunca deixar um membro preso; animação que toca
  uma vez é tocada com `LoopOnce` e para no último quadro.

## Mundo e carregamento

- **Três versões de cada ilha:** silhueta leve sempre carregada, ilha completa só quando a criança
  está lá. Na memória ficam a ilha central e no máximo uma ilha completa.
- **Máquina de estados testada:** `longe → carregando → pronta → ativa → descarregando`. A
  pré-carga começa na ponte; a troca da silhueta para a ilha completa é suave (névoa ou fade
  curto), nunca um salto visível; ao sair, tudo é descartado (geometrias, materiais, texturas).
- **Falha contida:** se um modelo não carrega, a versão simples continua no lugar e o jogo segue.

## Física e sensação

- Controlador cinemático do Rapier para o avatar; colisores autorais do mundo; quinas de
  plataforma com chanfro para o avatar não prender.
- O movimento precisa ser gostoso antes de qualquer conteúdo: aceleração e freio curtos, pulo com
  tolerância de borda e de toque antecipado, câmera que não atravessa parede.

## Desempenho

- **Meta:** 60 quadros por segundo no computador e 30 em Chromebook e celular, com modo leve
  automático em aparelho fraco.
- **Medição:** `renderer.info` (chamadas de desenho, triângulos, geometrias, texturas) na ilha
  central e em cada ilha completa, antes e depois de cada mudança grande, e de novo depois de
  descarregar (a memória tem que voltar ao normal).
- **Recursos:** repetição vira instancing; peças estáticas do mesmo material são juntadas; sombras
  só onde ajudam a ler a cena.

## Dados, salvamento e regras

- Conteúdo (pedidos, receitas, moradores, desafios) em dados declarados e validados por Zod, não
  espalhado em componentes.
- Salvamento com versão do formato e migração testada; gravação por revisão (o serviço recusa a
  revisão velha e o jogo adota a guardada). Nada da criança se perde por falha de rede.
- Números de jogo (tempos, preços, distâncias) em constantes nomeadas, nunca soltos no código.

## Texto e acessibilidade

- Texto de tela segue as regras da casa (sem travessão, sem "!", vocabulário do Kids, "o Zappy").
- Controles por teclado e por toque; foco visível nos menus; tamanho de toque de 44 px; respeito
  a reduzir movimento; cor nunca é o único sinal (o cinza das ilhas também muda a névoa e o brilho).

## Organização

- Uma entrega por vez por área de arquivos; trabalhos em paralelo só em pastas diferentes.
- O que a outra sessão cuida (deploy, Railway, gateway, menu e cartão dos pais) não é tocado aqui.
- Cada ajuste anotado na revisão vira item na página de acompanhamento, para não se perder.
