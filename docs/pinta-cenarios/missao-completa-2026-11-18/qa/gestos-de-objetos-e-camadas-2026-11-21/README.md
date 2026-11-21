# Gestos de objetos e camadas — 21/11/2026

Base: `301cf566c1de0b3d2fb200388ae9848cc23d7734`. Continuação do item 3.
Formato 8 permanece interno. Sem merge, implantação ou alteração funcional do Molda.

## Correção e revisão

O overlay de objetos escrevia sem conservar a revisão que havia produzido; ao
soltar, registrava uma base antiga no histórico. Cancelamento nativo também era
tratado como confirmação. O range de opacidade tinha o mesmo problema de origem.
Reproduções com os componentes reais encontraram nove falhas nos objetos e seis
na opacidade, incluindo o editor de conjuntos, cancelamento e recusa no meio.

`state/editorGesture.ts` retém base e última revisão sobrevivente. Escrita usa o
`replaceIfCurrent` existente; término e cancelamento conferem a mesma identidade.
Recusa cancela a edição inteira; outra revisão não recebe a restauração da base.
Uma sessão encerrada não pode voltar a escrever ou criar outro desfazer.
Persistência, CAS de autoridade, checkpoints e formatos não foram substituídos.

O overlay usa a sessão ao criar/mover/redimensionar objetos ou editar seus pontos.
O gesto é descartado em Esc, pointercancel, mudança de ferramenta/camada/editor
e desmontagem. A opacidade distingue a propriedade de teclado da propriedade
de ponteiro. O navegador encontrou um keyup intermediário que encerrava o gesto
de ponteiro antes da hora; a reprodução isolada falhou antes da correção e passou
depois. O rascunho de polígono/caminho também retém revisão e camada iniciais:
quatro reproduções impediram adicionar pontos antigos a uma revisão adotada.

Mensagens curtas usam o Toast existente. Nenhum painel, classe ou estilo do
produto mudou. O guia explica cancelamento e desfazer desses movimentos.

## Provas

- 69 testes focados, zero falhas e 354 asserções: componentes reais, desfazer/
  refazer, revisão do mesmo ID, conjunto, recusa, Esc, cancelamento, desmontagem,
  vértices/inserção e rascunhos. Guardas síncronas do store continuam exercitadas.
- 111 ensaios no Chromium, sem retries: mouse, toque nativo emulado e CPU 4×.
  O host de QA usa overlay, painel, fachada, store e IndexedDB reais. Os hashes
  do documento completo, normalizados apenas pelos timestamps de edição,
  coincidem na referência, em RAM e depois de salvar/reabrir.
- 33 percursos do aplicativo completo aprovados: terrenos, teclado, biblioteca,
  level design e conjuntos. A edição de conjunto conserva as quatro comparações
  nativas de apagar/desfazer/refazer/reabrir por perfil, totalizando 12.
- Os dois módulos produtores da base histórica, carregados via `git show` no
  mesmo host, reproduzem 12 falhas de revisão; os 12 controles de desfazer passam.
  São módulos históricos com os demais módulos atuais, não uma distribuição
  antiga completa ou outro aparelho. Relatório vermelho preservado como prova.
- Suíte completa: 2.527 aprovados, três controles nativos omitidos pela configuração
  comum, zero falhas e 29.243 asserções. Os três controles foram executados à parte
  com Pygame real: aprovados, 4.372 asserções. Tipos do Pinta/Estúdio, Biome e
  recibos com hashes estão detalhados no `index.json`.

A primeira rodada de navegador teve 68 aprovações e 13 falhas: quatro mostraram
o keyup intermediário do produto; nove ocorreram porque o ensaio mandava um
segundo touchEnd depois de touchCancel já ter encerrado o contato no CDP. Os
snapshots desses nove já mostravam documento restaurado. O protocolo do ensaio
foi corrigido, mantendo a verificação de dados e o cancelamento nativo real.
A rodada intermediária de 99 casos e a final de 111 estão preservadas.

## Alcance e continuação

As provas atuais usam fixtures locais e uma máquina física. CPU e toque são
emulações; não houve testes com crianças, outros aparelhos, medição de heap ou
qualificação de latência. Os três controles Pygame são regressões do formato
público, não validação externa de regiões. Nenhuma conta ou serviço foi alterado.

Gestos vetoriais/recursos, geometria assinada, câmera, IO 3, adaptadores Scene 4,
ativação pública 8, autorregras/projeções e o ciclo final da Vila e Floresta
continuam no plano. O lote não representa proteção universal de todos os
consumidores do editor, nem conclusão das etapas macro da missão.
