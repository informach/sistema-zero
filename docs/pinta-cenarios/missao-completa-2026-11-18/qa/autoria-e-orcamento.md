# Autoria ampliada e orçamento de memória

Lote da etapa 1, em 18/11/2026. Não encerra a missão inteira.

## Causa e correção

O cache aceitava `max(32 MiB, conjunto visível)` e fixava todos os blocos usados na mesma
pintura. O limite configurado não limitava a memória. Uma tela com muitas camadas podia
reter centenas de MiB em canvases, antes de contar histórico e dados autorais.

O teto agora é fixo. Blocos já desenhados podem ceder o canvas ao próximo bloco; o consumidor
usa a imagem imediatamente. A liberação reduz o canvas a 1 × 1, inclusive no motor não DOM
de testes. O editor libera o cache ao desmontar. Blocos vazios continuam sem canvas, e as
animações invalidam somente os blocos afetados quando cabem no cache. Se um consumidor
configurar orçamento inferior a um bloco, um único canvas de trabalho permite desenhar:
o limite físico RGBA nesse caso é `max(orçamento, tamanho de um bloco)`.

A autoria permite 256 × 256 células, 32 camadas e 256 peças. O formato não foi ampliado:
continua limitado a 2.097.152 células (4 MiB de índices). Crescer, adicionar camadas e soltar
conjuntos também verificam o orçamento total. A identificação de formato continua baseada
nos limites legados fixos de 128 × 128, 8 camadas e 64 peças: os novos limites de autoria não
rebaixam o carimbo de mapas modernos.

A aula tem orçamento HTTP próprio, menor: 128 × 128, 8 camadas e 64 peças. A operação que
ultrapassaria esse limite é recusada antes de mudar documento, histórico ou autosave. Uma
transação com recursos ligados também é recusada por inteiro. A Toast existente explica o
limite, e a seleção continua válida. Backend e editor têm teste de conformidade desses valores.

## Provas executadas

- `bun run typecheck` no Pinta: passou.
- `bun run typecheck` no Estúdio, incluindo o novo harness: passou.
- `PYTHON=<pygame-ce local> bun test src scripts`: **2.079 passaram**, zero falhas e zero
  skips, 24.353 asserções, 237,57 s. Log: [pinta-testes.log](pinta-testes.log).
- `bun test tests/unit/pinta-block.test.ts` no Members: **12 passaram**, zero falhas.
- `bun run check` no Pinta: passou, com os mesmos cinco avisos preexistentes.
- Interface real do Pinta: autoria de 32 camadas, recusa da 33ª, desfazer/refazer,
  salvar, voltar, recarregar e comparar as camadas reabertas. Desktop e Pixel 7 emulado:
  **2 passaram**. O ensaio usa o mesmo editor, componentes e estilos existentes.
- Suíte Pinta/Phaser completa: **6 passaram**, incluindo Vila, autoria e execução portátil
  em desktop e toque. O teste espera a galeria aparecer após “Voltar” antes de recarregar:
  o retorno conclui o flush assíncrono, e a reabertura compara dados efetivamente gravados.
- Regressão da autoridade offline com IndexedDB real: **5 passaram**, cobrindo cliente antigo,
  duas abas modernas, lápide, quota/aborto atômico, recuperação no editor e galeria de 500 sprites.
- Cache com 4 camadas × 12 blocos, orçamento de apenas 2 blocos: todas as posições
  esperadas têm o pixel vermelho; retenção fica em 2 MiB e apenas dois canvases são alocados.
- Chromium 148 real nesta máquina: mapa 256 × 256 × 32 com índices sem corridas repetidas,
  256 peças de 48 × 48, três pinturas completas com leitura de pixels, IndexedDB real,
  comparação de todas as células após reabrir, edição e nova confirmação da célula salva.
  Desktop, toque emulado e CPU 4× mais lenta: **3 passaram**.

## Medições do mapa extremo

| Condição | Cache RGBA | Gravar | Reabrir | Editar e gravar | Pintura completa |
|---|---:|---:|---:|---:|---:|
| Desktop | 27 MiB | 286 ms | 350 ms | 387 ms | 457–504 ms |
| Pixel 7 emulado | 27 MiB | 272 ms | 336 ms | 375 ms | 474–498 ms |
| CPU 4× mais lenta | 27 MiB | 1.826 ms | 2.374 ms | 2.570 ms | 3.291–4.283 ms |

Os 64 blocos visíveis exigiriam **576 MiB** na política anterior. Agora três canvases
somam 27 MiB e são reciclados. O JSON de transporte desse mapa extremo ocupa 11.188.227
caracteres: não cabe no limite HTTP de aula, nem no contrato atual de cena do Estúdio.
Essa evidência mantém necessários os próximos lotes de transporte e persistência por chunks.
Não se aumentou o limite desses destinos para esconder a diferença.

Relatórios completos: [desktop](orcamento-desktop.json), [toque emulado](orcamento-touch.json)
e [CPU reduzida](orcamento-cpu-4x.json). O tempo de pintura demonstra que falta otimizar
o caso extremo na etapa 8; não comprova fluidez em hardware de entrada. Os índices são
periódicos, adversariais para RLE, e não constituem teste de entropia aleatória máxima.

## Ambiente autenticado

Foi validado login real de staging com a conta fornecida pelo usuário, autorização temporária
deste navegador e entrada na área infantil e no Pinta. Credenciais, cookies e identificadores
privados permanecem em arquivos ignorados locais. A autorização de aparelho expira no fim do
dia. O ciclo completo autenticado Pinta → Estúdio ainda precisa ser exercitado com os lotes
seguintes, sem confundir a aplicação publicada em staging com esta branch local.

Ensaio de importação no staging publicado: o backup versão 4 da Vila foi recusado com
“A versão deste backup não é compatível com esta versão do Pinta”. Não houve upload do
mapa. O CI de `4fe2aac0f` foi cancelado e o de `8392175a9` falhou; o de `37cf1eada` estava
em execução na consulta. O deploy corrente ainda não comprova os recursos locais desta entrega.
Não se cancelou nem reiniciou pipeline de outra sessão.

O usuário informou que só esta máquina está disponível e autorizou simulações. Toque e CPU
reduzida são simulações, sem afirmar uso de outro aparelho físico ou teste com crianças.
