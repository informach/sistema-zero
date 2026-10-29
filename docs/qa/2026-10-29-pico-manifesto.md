# Conferência do manifesto Fase de plataforma

Fase3-10 do Pico Gelado. A entrega contém um Quadro das Cores, três desafios do dia e oito
projetos em blocos, iniciais e gabaritos. Nenhum cadastro no Admin foi feito. Plano e decisões:
[2026-10-29-pico-fase-de-plataforma.md](../superpowers/plans/2026-10-29-pico-fase-de-plataforma.md);
pacote: [docs/desafios-do-jogo/pico](../desafios-do-jogo/pico/README.md).

## Evidências

O executor oficial `check-objectives.mjs` rodou no Chrome local, controlado pelo Node, com o
runtime Jogo 2D e o julgador do core. Os 11 objetivos, incluindo os quatro extras, passaram nos
gabaritos e falharam nos iniciais. Quinze cenários incorretos também reprovaram, cada um pelo
motivo esperado:

- Sem gravidade, sem pouso, setas paradas, pulo no ar (o segundo toque subiu o pinguim a y 143),
  água sem volta (ficou em x 296) e bandeira sem marca.
- Pulo antigo (força 9 no pulo alto, y 326 no ponto mais alto), floco sem contato, floco contado
  de novo (2 flocos), quedas sem contar e quedas em dobro.
- A seta para cima sem ação, em cada uma das quatro versões.

O executor rodou três vezes seguidas sem falha. Nenhum objetivo ficou indisponível e nenhuma
regra inválida foi aceita.

| Conferência | Comando na raiz | Resultado |
| --- | --- | --- |
| Fontes | `bun test docs/desafios-do-jogo/pico/pico.test.ts` | 3 aprovados: JSON igual à fonte, IR válido, blocos até `intermediario-2d`, orçamento, uma regra por variação |
| Contrato | `bun test packages/arquipelago-contracts/tests/manifesto-do-pico.test.ts` | 3 aprovados; a suíte do pacote inteira também |
| Blockly | `bun test src/blockly/__tests__/picoManifest.test.ts` em `packages/studio` | Aprovado; oito projetos regenerados iguais. Uma rodada junto com o do Recife estourou o tempo na primeira carga (26 s, máquina ocupada); as três seguintes passaram em menos de 3 s |
| HTTP em memória | `bun test packages/arquipelago-api/tests/integration/manifestos.test.ts` | 18 aprovados; reimportação sem revisões extras |
| Executor real | `SZ_CHECK_CHROMIUM` definido, `bun test packages/studio-runtime/tests/pico-browser.test.ts` | Aprovado, três rodadas |
| Apresentação | `SZ_CHECK_CHROMIUM` definido, `bun docs/desafios-do-jogo/pico/conferir-browser.ts` | Aprovada nos três tamanhos |
| Biome | `bunx biome check` nos arquivos da entrega | Aprovado |
| Tipagem | `tsc` do `tsconfig.json` da pasta | Não rodado nesta sessão: a dona deixou os typechecks com uma sessão só (pouca memória, quatro sessões ao mesmo tempo) |

## O que mudou no caminho

- O primeiro ensaio real reprovou a volta da água no gabarito: a seta ainda estava apertada
  quando o pinguim voltou ao começo, e ele andou mais 4. O objetivo passou a conferir o recado e
  que o pinguim está perto do começo, de pé.
- A chegada à bandeira dependia do ritmo: o pinguim anda cerca de 0,29 por ms no executor (e não
  0,24, a conta por quadro), e 700 ms de seta já o levavam além da beira antes do pulo. Com 500 ms
  ele para em x 184, e a folga para o atraso do clique fica em uns 340 ms.
- O pulo não usa o kit do dino, que pousa só no chão do palco e desenharia um dinossauro no lugar
  do pinguim. O pouso no gelo é a regra que a criança monta.

## Prints e gestos

- [Computador, 1280 × 844](2026-10-29-pico-desafio-computador.png)
- [Celular emulado, 390 × 844](2026-10-29-pico-desafio-celular.png)
- [Janela compacta, 640 × 480](2026-10-29-pico-desafio-compacto.png)

O Chrome rodou sem placa de vídeo (`--use-angle=swiftshader --enable-unsafe-swiftshader`). Em cada
tamanho, o ensaio esperou o pinguim pousar, andou até perto da beira, apertou Pular, seguiu até a
bandeira (o recado "O pinguim chegou à bandeira. A fase terminou."), tirou o print e conferiu o
Recomeçar. No computador usou teclado e mouse; no celular emulado, a seta da tela pelo protocolo
de toque do navegador e toques nos botões. Também conferiu a ausência de rolagem horizontal e de
erros no console ou na página. Requisições externas são bloqueadas e contam como falha.

## Limites e acompanhamento

Celular físico e importação/publicação no Admin ficam para depois. O quadro 6 do Pico precisa
estar livre no momento da importação, e a análise do Members confere o currículo publicado. Não
houve leitura nem escrita em banco, alteração de salvamento, Blender, GLB, código do jogo, .env ou
CI.

Nota para a coleção de acompanhamento:

> fase3-10: manifesto Fase de plataforma do Pico preparado e validado. Um Quadro das Cores, três
> desafios do dia (pulo alto, floco de neve, quedas), extras da seta para cima, oito projetos em
> blocos e SVGs embutidos. Contrato, Blockly, HTTP em memória e executor real conferidos. Prints de
> computador, celular emulado e janela compacta em docs/qa. Importação e publicação no Admin
> pendentes. Nenhum progresso de pessoa alterado.
