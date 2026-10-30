# Quadros e Mira de bolhas do Recife Coral

Pacote da fase3-05 e complemento L03, formato `arquipelago-desafios` v1, escopo `ilha`.
Arquivos separados: [Kids](recife.manifesto.json) e [adulto](recife-adulto.manifesto.json).
A importação e a publicação no Admin ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| A corrente muda | Quadro das Cores | 1 | 20 | 10 |
| Conchas por viagem | Quadro das Cores | 2 | 20 | 10 |
| Dois corais cuidados | Quadro das Cores | 3 | 20 | 10 |
| Uma bolha por vez | Quadro das Cores | 4 | 20 | 10 |
| A chave do navio | Quadro das Cores | 5 | 20 | 10 |
| Mira de bolhas | Quadro das Cores | 6 | 20 | 10 |
| Bolha rápida | Desafio do dia | Nenhum | 10 | 5 |
| Dois pontos | Desafio do dia | Nenhum | 10 | 5 |
| Outro alvo | Desafio do dia | Nenhum | 10 | 5 |

Os valores vêm de `MOEDAS_PADRAO_POR_TIPO`. Quadro 6 e ordens 60 a 63 seguem a convenção
do Bosque e da Vila. O quadro deve estar livre quando o pacote for importado. O principal
dá cor, as variações não. `recompensa.atracao` identifica `mira-de-bolhas`, como nos outros
minijogos. Os complementares usam a própria atração por slug e `publicar: false`.
O principal e as variações Kids preservam a instrução `publicar: true` do arquivo anterior.
Todo o arquivo adulto usa `publicar: false`. Nenhum deles foi importado nesta entrega.

## Os cinco complementares

Cenário, SVGs, controles de toque e laço de desenho estão prontos nos dois projetos. Só os
quatro tipos de evento indicados mudam: Espaço, esquerda, direita e o extra Enter. O inicial
não aprova nenhum dos seus objetivos. Os objetivos verificam ações e estados, sem exigir
cor, desenho ou os parâmetros do movimento fornecido.

| Quadro | Ação | Conhecimento aplicado | Recusa causal |
| --- | --- | --- | --- |
| 1 | Alternar o sentido da corrente | Se/senão e informação | Ficar sempre para a esquerda |
| 2 | Recolher até três e descarregar | Condição e soma | Cesta acima do limite ou entrega duplicada |
| 3 | Cuidar de dois corais uma vez | Escolha e marca individual | Contar o mesmo cuidado ou os dois juntos |
| 4 | Soltar uma bolha e esperar a volta | Estado de voo | Relançar enquanto ela se move |
| 5 | Pegar e consumir a chave | Duas condições e uso único | Abrir sem chave, guardar a chave usada ou repetir |

Cada quadro tem ação principal, condição adicional e extra de reinício. A corrente anda
entre x 40 e 500 com velocidade horizontal de módulo 1. A bolha sobe de y 320 até passar
y 120 e volta com velocidade de módulo 2, usando posição observada, velocidade e movimento
já ensinados. Esses valores pertencem ao cenário pronto; não são exigências do objetivo.
A espera de 4,5 s no ensaio deixa margem para a viagem de cerca de 3,4 s a 60 atualizações.
Não se concede nenhum bloco novo. Opacidade vem do Cadê Todo Mundo e a aritmética do Dino.

## O que se completa no principal

Cenário, imagens, textos, placar, botões e reinício por clique estão prontos. No principal,
a pessoa completa quatro regras: mover a mira horizontalmente, soltar uma bolha para cima,
prender o alvo no contato e contar uma vez. A bolha que erra não pontua; ao sair pelo alto,
libera outra tentativa. Enquanto uma bolha sobe, o botão não pode lançar outra.

O alvo preso fica marcado e a bolha é encaixada ao redor dele. Acertar o mesmo alvo de novo
não aumenta os pontos. O botão Recomeçar permite repetir a rodada.

As variações começam com o jogo funcionando e mudam somente uma regra principal:

- Bolha rápida: velocidade vertical de -5 para -8.
- Dois pontos: cada captura passa a somar 2, preservando a contagem única.
- Outro alvo: completar o contato com `alvoNovo`, já desenhado, usando `novoPreso`.

O extra, separado da regra principal, é Enter recomeçar como o botão já pronto. É uma
aplicação do evento de teclado conhecido. Os objetivos observam o comportamento das regras
que faltam completar. Não premiam a montagem do cenário nem exigem trocar a arte.

## Blocos e arte

`ilhas.ts` abre o Recife em `explorer`, Explorador. Os testes conferem todos os blocos dos
dezoito projetos de cada público contra as listas de cursos disponíveis até esse posto: Cadê Todo Mundo,
A Chave do Farol, A Ilha do Farol, O Jardim Secreto, Nave Contra Asteroides, O Jogo do Meu
Jeito e Corre, Dino. O principal mantém `iniciante-2d`; os complementares também usam
a aritmética de `intermediario-2d` já ensinada no Inventor, antes de entrar no Explorador.
Não há novos `blocosManuais`, objetos JavaScript, HTML, CSS ou Canvas nos blocos.

O teste de cobertura usa as listas versionadas, não concede conquistas. Na importação futura,
a análise do Members continua conferindo o currículo publicado e os blocos de cada pessoa.
Os arquivos de execução são gerados pelo Estúdio a partir do IR e são iguais aos regenerados
pelo Blockly. SVGs em `projetos.ts` desenham água, corais, lançador, bolha, estrela, concha e
botões. Não há imagem externa, modelo novo ou dependência do Blender.

## Medidas e verificações

Palco de 640 × 480, mira inicial em (72, 360), velocidade horizontal 3. A bolha começa
em y 340, alinhada à mira, e sobe com velocidade -5 ou -8. O alvo principal está em
(430, 120); o novo, em (190, 120). Ambos medem 56 × 56, dentro da bolha de 64 × 64.
Os botões ficam à direita da área reservada aos controles de toque.

O teste de lançamento usa uma faixa sem alvo. O teste de captura usa outra tentativa,
evitando exigir que a bolha continue em voo depois de já acertar. A variação rápida observa
movimento, velocidade menor que -5 e captura real, sem depender de um instante exato de contato.
O extra do segundo alvo captura os dois antes de conferir o reinício. Cada objetivo respeita
os limites do executor, incluindo oito checkpoints, e o conjunto cabe no orçamento de 40 s.

## Gerar e conferir

Edite as fontes e regenere o JSON:

```powershell
bun docs/desafios-do-jogo/recife/gerar-manifesto.ts
bun test docs/desafios-do-jogo/recife/recife.test.ts packages/arquipelago-contracts/tests/manifesto-do-recife.test.ts packages/studio/src/blockly/__tests__/recifeManifest.test.ts
bun test packages/arquipelago-api/tests/integration/manifestos.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/recife-browser.test.ts packages/studio-runtime/tests/quadros-recife-browser.test.ts
bun docs/desafios-do-jogo/recife/conferir-browser.ts
bun docs/desafios-do-jogo/recife/conferir-quadros-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/recife/tsconfig.json
```

Em Linux, aponte `SZ_CHECK_CHROMIUM` para o Chromium instalado. O teste nativo fica explicitamente
ignorado quando essa variável não existe. Ele usa `check-objectives.mjs`, runtime oficial e
julgador do core: cada objetivo deve passar no gabarito e falhar no inicial. Objetivo inválido,
lista vazia, erro no jogo ou indisponibilidade do executor são falhas do ensaio, não reprovações
pedagógicas válidas.

Os casos incorretos cobrem mira parada, bolha descendo, contatos ausentes, pontuação repetida,
ponto sem acerto, relançamento em voo, velocidade antiga, valor antigo e Enter sem ação.
O HTTP usa repositório em memória e uma porta Members falsa, separadamente da prova real.
A conferência visual prepara a página com Bun e controla o navegador com Node, sem servidor
da plataforma, credenciais ou banco. Testa teclado e toque emulado, captura e reinício.

Relatório e prints: [conferência do Recife](../../qa/2026-10-29-recife-manifesto.md).
A apresentação em celular físico continua pendente. Nenhum desafio foi cadastrado e nenhum
progresso foi alterado.

Complemento L03: [conferência dos cinco quadros](../../qa/2026-10-30-quadros-recife/README.md).
