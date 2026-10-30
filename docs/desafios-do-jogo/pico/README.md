# Quadros e fase de plataforma do Pico Gelado

Revisão C01b1 de 30/10/2026: [inventário por atividade](../repertorio-local.md) e
[fontes por bloco](../repertorio-local.json). Intenção editorial não comprova concessão de
blocos. As lacunas de fontes obrigatórias continuam explícitas; não usar opcionais como
repertório universal nem contar estruturas prontas como aprendizagem.

Pacote da fase3-10 e complemento L03, formato `arquipelago-desafios` v1, escopo `ilha`.
Arquivos: [Kids](pico.manifesto.json) e [adulto](pico-adulto.manifesto.json). Plano e decisões:
[2026-10-29-pico-fase-de-plataforma.md](../../superpowers/plans/2026-10-29-pico-fase-de-plataforma.md).
A importação e a publicação no Admin ficam para outra etapa.

| Desafio | Tipo | Quadro | Moedas | Extra |
| --- | --- | --- | --- | --- |
| Pulo com apoio | Quadro das Cores | 1 | 20 | 10 |
| Freio no gelo | Quadro das Cores | 2 | 20 | 10 |
| Floco recolhido | Quadro das Cores | 3 | 20 | 10 |
| Mochila de neve | Quadro das Cores | 4 | 20 | 10 |
| Passagem segura | Quadro das Cores | 5 | 20 | 10 |
| Fase de plataforma | Quadro das Cores | 6 | 20 | 10 |
| Pulo alto | Desafio do dia | Nenhum | 10 | 5 |
| Floco de neve | Desafio do dia | Nenhum | 10 | 5 |
| Quedas | Desafio do dia | Nenhum | 10 | 5 |

Os valores vêm de `MOEDAS_PADRAO_POR_TIPO`. Quadro 6 e ordens 60 a 63 seguem a convenção do
Bosque, da Vila e do Recife. O quadro deve estar livre quando o pacote for importado. O principal
dá cor, as variações não. `recompensa.atracao` é `fase-de-plataforma`. Todos os itens Kids e
adultos usam `publicar: false` após C01b1, sem alterar publicações remotas. Cada complementar
indica a própria atração pelo slug. Público e publicação são separados.

## Os cinco complementares

Reaplicam o repertório de blocos já aprendido até Inventor. Não exigem um bloco novo por entrar
no Mestre e não são uma substituição dos cursos Python. O serviço continua conferindo as
conquistas individuais. O cenário, a gravidade, o chão e o desenho já vêm prontos; só o evento
indicado é completado. Enter é o extra de nova rodada.

| Quadro | Evento | Comportamento avaliado |
| --- | --- | --- |
| Pulo com apoio | Espaço | Subir, impedir outro pulo no ar e liberar após pousar |
| Freio no gelo | Espaço | Parar estado e velocidade sem reiniciar nem deslocar |
| Floco recolhido | Contato | Coletar, esconder e contar uma vez, somente após tocar |
| Mochila de neve | Esquerda e direita | Aceitar cargas de 1 ou 2 até o peso 4, sem aceitar parte |
| Passagem segura | Espaço | Esperar a neve ceder e atravessar uma única vez |

A arte reutiliza os SVGs do principal. O pulo ensina -10 como exemplo, mas a verificação não
exige essa força: um pulo menor coerente também passa. O solo preparado está em y 300 para o
pinguim, e sua correção usa a diferença até o solo, sem teleporte por borda. O contador de
neve diminui de 120 a zero por atualização, não representa segundos. O tempo de 2,4 s do
ensaio dá margem à liberação a 60 atualizações por segundo.

## O que se completa no principal

Cenário de neve, o pinguim, os dois blocos de gelo com o buraco, a água, a bandeira, os botões e
o Recomeçar estão prontos. No principal, a pessoa completa:

- o laço: aplicar a gravidade, andar com as setas, aplicar a velocidade, manter na tela e, para
  cada gelo que o pinguim encostar vindo de cima, colocá-lo de pé no topo e marcar `noChao`;
- o Pular: velocidade y -12, só com `noChao` verdadeiro (nada de pular no ar);
- a água: cair nela devolve o pinguim ao começo;
- a bandeira: encostar nela marca `chegou` e mostra o recado de fim, uma vez só.

As variações começam com o jogo funcionando e mudam somente uma regra principal:

- Pulo alto: um gelo flutuante com a bandeira em cima; o Pular passa de -9 para -13.
- Floco de neve: completar o contato com o floco já desenhado (`pegouFloco`, esconder, somar um).
- Quedas: somar um em `quedas` no contato com a água, que já devolve ao começo.

O extra, separado da regra principal, é a seta para cima também pular, só no gelo.

## Blocos e arte

`ilhas.ts` abre o Pico em `elite`, Mestre dos Jogos, cuja recompensa de blocos é
`intermediario-2d`. O teste do contrato confere os dezoito projetos por público contra a união das listas de
blocos dos cursos dos postos até o Mestre, lidas das pastas de `docs/aulas-interativas`
(Faísca, Construtor, Inventor, Explorador e Mestre). O teste da pasta confere que nenhum bloco
passa de `intermediario-2d`; o único acima do `iniciante-2d` é a conta usada no pouso.
Não há `blocosManuais`, objetos JavaScript, HTML, CSS ou Canvas nos blocos.

O pulo não usa o kit do dino: ele pousa só no chão do palco e desenharia um dinossauro no lugar do
pinguim. Pousar no gelo é a regra que a criança monta, e vale também para o gelo flutuante.

Os SVGs em `projetos.ts` desenham o céu com as montanhas, a água, o pinguim de gorro, o gelo,
a bandeira, o floco e os botões. Não há imagem externa, modelo novo ou dependência do Blender.

## Medidas

Palco de 640 × 480. O pinguim mede 44 × 48, começa em (40, 300), cai e fica de pé em y 368. O
primeiro gelo vai de x 0 a 230, o segundo de 320 a 640, os dois com o topo em y 416; o buraco
tem 90. A água começa em y 462. A bandeira fica em (572, 336); no pulo alto, em (470, 190), em
cima do gelo flutuante (380, 270, 150 × 24). O floco fica em (46, 236). Andar: 2 por quadro nas
setas mais a velocidade aplicada, medido no executor em cerca de 0,29 por ms. Pulo: -12 (alto,
-13; o fraco do inicial, -9), gravidade padrão do mundo, 0,6.

Os objetivos não dependem do instante exato: pousar é conferido por `noChao`, a volta da água pelo
recado e por estar perto do começo, e cada objetivo tem um ponto que só passa com a regra pronta
(por isso o inicial reprova todos). Cada desafio cabe no orçamento de 40 s.

## Gerar e conferir

Edite as fontes e regenere o JSON:

```powershell
bun docs/desafios-do-jogo/pico/gerar-manifesto.ts
bun test docs/desafios-do-jogo/pico/pico.test.ts packages/arquipelago-contracts/tests/manifesto-do-pico.test.ts
cd packages/studio; bun test src/blockly/__tests__/picoManifest.test.ts; cd ../..
bun test packages/arquipelago-api/tests/integration/manifestos.test.ts
$env:SZ_CHECK_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
bun test packages/studio-runtime/tests/pico-browser.test.ts packages/studio-runtime/tests/quadros-pico-browser.test.ts
bun docs/desafios-do-jogo/pico/conferir-browser.ts
bun docs/desafios-do-jogo/pico/conferir-quadros-browser.ts
node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/pico/tsconfig.json
```

O teste do executor real fica ignorado sem `SZ_CHECK_CHROMIUM`. Ele usa `check-objectives.mjs`, o
runtime oficial e o julgador do core: cada objetivo passa no gabarito e falha no inicial, e os
casos incorretos (sem gravidade, sem pouso, setas paradas, pulo no ar, água sem volta, bandeira sem
marca, pulo antigo, floco sem contato, floco contado de novo, quedas sem contar, quedas em dobro e
seta sem ação nas quatro versões) também reprovam. A conferência visual prepara a página com Bun e
controla o Chrome com Node e SwiftShader, sem servidor da plataforma, credenciais ou banco.

Relatório e prints: [conferência do Pico](../../qa/2026-10-29-pico-manifesto.md). Celular físico
continua pendente. Nenhum desafio foi cadastrado e nenhum progresso foi alterado.

Complemento L03: [testes e capturas dos cinco quadros](../../qa/2026-10-30-quadros-pico/README.md).
