# Prévia: substituir somente por um documento completo

## Problema comprovado

Na retomada da `staging`, a galeria continuava falhando no Chromium Linux
da CI `44611610377`. O caso estreito de **Desvie dos blocos** também foi
reproduzido no Windows com Chromium completo. O iframe anunciava um
`srcdoc` de 319.937 caracteres, mas seu documento real continha apenas
`<html lang="pt-BR"><head></head><body></body></html>`.

Uma captura dos atributos e navegações mostrou a sequência
**54 → 319.889 → 54 → 319.937 caracteres**. Os 54 caracteres são o
documento parado. A preparação assíncrona de recursos durante a
estabilização do código enviava esse documento entre duas revisões
executáveis. O Chromium podia concluir mostrando a revisão vazia.
Repetir sem trace também falhou (três casos); trocar a identidade do
iframe inicial não resolveu. Essa tentativa foi retirada.

## Correção

Foi reaproveitado o documento já confirmado de `PreviewIframe`. Durante
a preparação de recursos da próxima revisão do mesmo projeto, ele
permanece no iframe até o substituto estar completo. Não há novo sistema
de filas, polling de recuperação, aumento de prazo ou acréscimo ao HTML
executável. Parar, trocar projeto/permissão e pausar por orçamento
continuam instalando o documento parado.

A barra agora usa a mesma condição de preparação do documento, incluindo
fonte e estado salvo. Sem execução automática, fica em estado parado com
Rodar disponível. `aria-busy` informa a espera por recursos. Não houve
alteração de estilos, blocos, categorias ou caminhos dos cursos.

## Evidência e limites

- Teste com carregamento real de fonte retardado: vermelho antes, verde
  depois; preserva o documento anterior e permite Parar durante a espera.
  O teste envolve o carregador real; não inventa o resultado do recurso.
- Família de prévia e player: **108 testes, 551 asserções, zero falhas**.
- TypeScript do pacote: `tsc --noEmit` terminou com código 0 e sem
  diagnósticos. O guarda de carregamento/bundle passou com 53 asserções;
  nenhum orçamento foi aumentado. Biome dos quatro arquivos de código passou.
- Novo contrato de navegador: observa a galeria real, Blockly/Ponte e as
  duas revisões executáveis em 390 e 1.280 px. Contra o build anterior à
  correção, os dois casos falharam com `[54,319889,54,319937]`. No build
  corrigido, **seis casos passaram**, três repetições por largura, sem retries.
- A captura após a correção mostrou **54 → 319.889 → 319.937**, sem
  documento vazio intermediário, e a tela inicial do jogo apareceu.
- Casca isolada no Chromium: **dois casos passaram**, funcionamento e
  resposta durante CPU ocupada, incluindo Parar e nova execução.
- Cursos no navegador, com os gestos reais: aula 1 de Cadê (28 s) e dia 1
  do Farol (1,4 min) passaram, sem regravar referências. Isso não cobre
  todas as aulas nem as ações da página real do Members.
- Galeria estreita com interação completa: **cinco aprovações e uma falha**
  em seis repetições. A falha foi um timeout em `keyboard.press`, depois
  da verificação do primeiro frame. Essa rodada não está verde; a falha
  de entrada continua aberta, sem aumento do timeout.

São ensaios locais Windows, não homologação de aparelhos físicos ou
garantia para todos os navegadores. A CI anterior passou nos dois jobs
de contratos e nos recortes de Firefox, WebKit e Chromium Windows;
os três recortes Chromium Linux falharam. Esses resultados antecedem a
correção deste documento e não aprovam sua revisão.

Artefatos locais: `packages/studio/.cache/mission/preview-font-transition-red.txt`,
`preview-resource-final-family.txt`, `resource-transition-before-contract*`,
`resource-transition-contract*`, `narrow-resource-commit*` e
`resource-shell-regression*`. O novo contrato entra na suíte Chromium
Linux e explicitamente no recorte Windows do workflow da missão.

```powershell
cd packages/studio
bun test src/components/preview src/studio/StudioProjectPlayer.test.tsx
bunx --no-install playwright test e2e/preview-resource-transition.spec.ts --project=chromium --retries=0 --trace=retain-on-failure
```

## Estado global

A suíte geral anterior a este incremento passou em **900 arquivos e
164 grupos isolados: 11.859 testes e 363.819 asserções**, sem falhas.
Ela não substitui a homologação da revisão nova. A missão permanece
aberta: montagem inicial incremental, ativação do isolamento no host,
execução efetivamente isolada no WebKit, Verificar/Enviar/Concluir no
Members, Pro em escala, depuração, profiler, testes autorais e streaming
de jogos extensos ainda exigem implementação ou homologação adicional.
