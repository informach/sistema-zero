# Mira de bolhas do Recife Coral

Pacote da fase3-05, formato `arquipelago-desafios` v1, escopo `ilha`, público `kids`.
O arquivo de entrega é [recife.manifesto.json](recife.manifesto.json).
A importação e a publicação no Admin ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Mira de bolhas | Quadro das Cores | 6 | 20 | 10 |
| Bolha rápida | Desafio do dia | Nenhum | 10 | 5 |
| Dois pontos | Desafio do dia | Nenhum | 10 | 5 |
| Outro alvo | Desafio do dia | Nenhum | 10 | 5 |

Os valores vêm de `MOEDAS_PADRAO_POR_TIPO`. Quadro 6 e ordens 60 a 63 seguem a convenção
do Bosque e da Vila. O quadro deve estar livre quando o pacote for importado. O principal
dá cor, as variações não. `recompensa.atracao` identifica `mira-de-bolhas`, como nos outros
minijogos. `publicar: true` é uma instrução para a futura aplicação do arquivo, não uma
publicação realizada por esta entrega.

## O que se completa

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
oito projetos contra as listas de cursos disponíveis até esse posto: Cadê Todo Mundo,
A Chave do Farol, A Ilha do Farol, O Jardim Secreto, Nave Contra Asteroides, O Jogo do Meu
Jeito e Corre, Dino. Todos os blocos usados pertencem ao nível `iniciante-2d`.
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
bun test packages/studio-runtime/tests/recife-browser.test.ts
bun docs/desafios-do-jogo/recife/conferir-browser.ts
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
