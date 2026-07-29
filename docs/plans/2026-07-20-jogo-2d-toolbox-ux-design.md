# Jogo 2D — design da revisão de UX da toolbox

Data: 2026-07-20

## Objetivo

Simplificar a descoberta e a leitura dos blocos da extensão Jogo 2D sem reduzir
a paleta. A toolbox deve ser organizada por assunto; as áreas estruturais do
projeto continuam com os nomes `⚙️ Ao iniciar`, `⚡ Quando acontecer` e
`🔁 Enquanto estiver rodando`.

## Decisões aprovadas

### Categorias por assunto

Remover da toolbox as subcategorias baseadas em área/sintaxe:

- `⚡ Quando acontecer`;
- `🔁 Enquanto estiver rodando`;
- `❓ Perguntas`.

Distribuir seus blocos em:

- `🎛️ Controles`: evento de tecla, evento de clique/toque e pergunta de tecla
  pressionada;
- `💥 Colisões`: evento de contato entre sprites, pergunta de contato, colisões
  retangular/circular e varredura de colisões entre grupos;
- `⏱️ Tempo e repetição`: a cada quadro, a cada N quadros, a cada N segundos,
  recarga e tempo de vida.

Blocos especializados continuam perto do assunto principal: colisão com mapa em
`Mapa`, tiro inimigo em `Inimigos` e colisão do kit espacial em `Kit espaço`.

### Linguagem dos blocos

Reservar `Quando...` para eventos verdadeiros:

- `Quando apertar a tecla...`;
- `Quando clicar/tocar...`;
- `Quando o sprite ... começar a encostar no sprite ...`.

Varreduras contínuas usam `Para cada...` e não carregam instrução de área:

- `Para cada colisão entre um sprite do grupo ... e um sprite do grupo ...`;
- `Para cada tiro ... que acertar o sprite ...`;
- `Para cada sprite ... do grupo ... que colidir com o sprite ...`.

Configuração de animação não usa `Quando`:

- `Animação do sprite ... no estado ...`;
- `Animação dos inimigos do tipo ... no estado ...`.

Nenhuma face de bloco deve conter `Dentro de “A cada quadro”`. Local de uso,
ordem e exemplos pertencem aos tooltips, ao manual e às aulas.

### Cadência

`A cada N quadros` entra na toolbox com uma sombra `sz_val_number` de valor 30.
A sombra deve sobreviver a Blockly → IR → Blockly, assim como a sombra de `A cada
N segundos`.

### Preparação do jogo e acessibilidade

Os dois blocos de preparação mantêm o argumento de descrição, com o rótulo curto:

`objetivo e controles [texto]`

O texto continua alimentando `aria-label`, `aria-describedby` e os anúncios de
cena. A explicação sobre leitores de tela permanece no tooltip, no manual e nas
aulas, não na face do bloco.

O canvas continua focável para teclado. O outline externo padrão do navegador é
substituído por um indicador discreto e interno somente em `:focus-visible`; foco
por ponteiro não deve acrescentar contorno visual.

## Compatibilidade

- Nenhum tipo de bloco, campo, nó IR, helper ou assinatura gerada muda.
- Projetos existentes continuam abrindo sem migração.
- A alteração de categorias afeta apenas descoberta na toolbox.
- A alteração de `message0/message1` afeta apenas apresentação.
- Os 190 blocos permanecem disponíveis; o bloco legado continua oculto.

## Verificação

- inventário da toolbox sem tipos ausentes ou duplicados;
- categorias estruturais ausentes da toolbox e áreas estruturais inalteradas;
- rótulos sem `Dentro de “A cada quadro”`;
- `Quando` restrito aos eventos aprovados;
- sombra 30 presente no flyout e preservada no round-trip;
- descrição acessível ainda ligada ao canvas;
- foco por ponteiro sem outline externo e foco por teclado com indicação interna;
- auditoria de todos os blocos, testes de campos, typecheck, Biome e exemplos no
  Chromium.

## Plano de implementação

1. Reorganizar `SUBCATS` e desacoplar a toolbox de
   `GAME_TWO_D_LIFECYCLE_TOOLBOX`.
2. Ajustar os rótulos aprovados sem alterar campos ou tipos.
3. Adicionar a sombra numérica de `A cada N quadros` e sua restauração.
4. Simplificar o rótulo da descrição nos blocos de preparação.
5. Injetar o estilo de foco do canvas de forma idempotente no runtime.
6. Atualizar documentação/testes que ainda tratam as áreas como categorias da
   toolbox.
7. Executar verificações direcionadas e regressão do pacote.

