# Recife: replantar corais, aquário em casa e o mapa, fase3-03

**Objetivo:** três interações curtas no Recife Coral, sem castigo: replantar os corais da lagoa,
o aquário da casa ligado a eles e o mapa do arquipélago na mesa da Maré.
**Arquitetura:** regras puras em `sistemas/`, desenho e interativos montados pelo `RecifeVivo`
(só com a ilha ativa), o aquário no painel e no modelo dos objetos da casa, o mapa num painel.
Usa só a arte que já existe: `recife-props.glb` (os quatro corais soltos), `aquario.glb` (quatro
peixes e o clipe `nadar`) e a âncora `mapa` (a mesa de mapas, com o cavalete e o mapa do
arquipélago, `arte/ilhas/README.md`). Nenhum `.glb` nem gerador muda.

## Decisões

### Os corais

- **Quatro pontos, um por tipo de coral** do `recife-props.glb`: galho, cérebro, leque e tubo,
  os quatro tipos que crescem em volta da lagoa ("lagoa com corais de quatro tipos",
  `arte/ilhas/README.md`). Ficam na beira rasa da lagoa, a 85% dos raios da água (4,2 × 3,6
  em volta de `LAGOA`), entre as algas (ângulos 0°, 78°, 182° e 250°). O fundo ali fica a uns
  0,27 abaixo da água: a criança chega com o pé na água rasa, sem nadar. A areia seca alcançável
  a pé fica a menos de 0,65 de cada ponto (medido na grade de 25 cm do `col-terreno`).
- **Antes:** o coral está desbotado (o desenho `coral-<tipo>-desbotado` do `recife-props.glb`:
  o mesmo coral em branco de osso, com cacos caídos em volta), como o cinza das ilhas que esperam
  cor. **Replantar** (E ou Usar, alcance 1,6): a muda viva nasce pequena e cresce até o tamanho
  dos corais pequenos da lagoa em 1,2 s. Com menos movimento, do menu ou do aparelho, muda na hora. A
  pausa congela o crescimento. Não há muda como item, nem ordem, nem prazo: cada ponto é um gesto.
- Os corais replantados são pequenos (escala 0,8), como os corais pequenos da lagoa, que não
  colidem. Nenhum colisor novo.
- **Salvamento: V13**, o próximo número livre (a V12 é do Vale, fase4-02). `recife.corais`, um
  número de 0 a 15, um bit por ponto, na mesma coleção dos achados do Recife. `migrarDaV12`
  começa em 0. São 12 bytes no pior caso (`,"corais":15`).
- **A folga dos 64 KB:** com a V12 (o Vale) e as marcas do Recife no máximo, o pior caso tinha 64
  bytes de folga, e o teste não contava o Vale nem o Recife preenchidos. O teste passa a
  preencher os dois e os corais. Com a V13 sobram 52 bytes. Por isso não se ganha espaço em outro
  lugar agora; a próxima versão precisa achar espaço antes (fica escrito no `CLAUDE.md` do
  contrato). Medido depois de pronto: 48 bytes de folga, com o Vale, o Recife e os corais no
  máximo.

### O aquário

- O `aquario` já está no catálogo ("Pedido do Recife Coral."). **Chega como projeto azul com o
  primeiro coral replantado** (`ganharProjetos`, a mesma fala de sempre do Zappy).
- **Um peixe por coral replantado:** o `aquario.glb` tem `peixe-1` a `peixe-4`; o peixe N aparece
  quando o ponto N está replantado. As bolhas ficam sempre. O clipe `nadar` toca no objeto posto
  em casa (holograma ou completo), parado com a pausa e com menos movimento.
- **"Ver o aquário"** abre o painel do objeto com "Peixes no aquário: N de 4." e, para cada coral,
  se o peixe já veio ou onde replantar. Na casa de um irmão (visita) o aquário aparece com os
  quatro peixes, porque a visita não traz os corais dele.

### O mapa

- **A mesa de mapas da Maré** (âncora `mapa`): "Ver o mapa do arquipélago" (alcance 2,0) abre um
  painel com as oito ilhas desenhadas na posição do anel do contrato (`ILHAS`, `angulo`), a sua
  ilha no meio com o Farol. As abertas pela jornada aparecem coloridas, as fechadas em cinza, com
  o que as abre pela voz do jogo (posto no Kids, etapa no adulto). O Recife diz "Você está
  aqui". Só olhar: nada é gravado.

## Pedidos de arte (feitos na conferência, 29/10/2026)

1. Âncoras `coral-muda-1` a `coral-muda-4` no `recife.glb` (`ancoras_das_mudas` em
   `arte/ilhas/recife.py`), nos mesmos quatro pontos de antes, com a altura do fundo da bacia ali
   (0,774). O jogo lê as âncoras (`lugaresDasMudas` em `mundo/corais-do-recife.tsx`); sem alguma,
   não monta corais.
2. Os corais desbotados de verdade no `recife-props.glb`: `coral-galho-desbotado`,
   `coral-cerebro-desbotado`, `coral-leque-desbotado` e `coral-tubo-desbotado`, o mesmo desenho
   do vivo nos materiais `coralDesbotado` e `coralDesbotadoSombra` (um pouco mais baixos e com
   cacos na areia). O código não pinta mais nada.

## Etapas

- [x] Contrato: `SalvamentoV13` com `recife.corais`, `migrarDaV12`, testes de migração e o pior
  caso com o Vale, o Recife e os corais no máximo; serviço acompanhando a versão.
- [x] Regras puras: `sistemas/corais-do-recife.ts` (pontos, replantar, contar, falas, peixes do
  aquário), `sistemas/mapa.ts` (as ilhas no papel e o estado de cada uma) e o aquário em
  `ganharProjetos`.
- [x] Mundo: `mundo/corais-do-recife.tsx` (carga privada do `recife-props.glb`, os quatro corais,
  o crescer, o interativo) e a mesa de mapas no `RecifeVivo`; o aquário com peixes e `nadar` em
  `mundo/objetos-da-casa.tsx`.
- [x] Interface: o painel do aquário e o painel do mapa (`interface/mapa.tsx`).
- [x] Testes: regras, migração, pior caso e a grade de andar até cada ponto e até a mesa.
- [x] Navegador: `playground/verificar-recife-browser.ts` replanta, abre o mapa e confere o
  aquário, no computador e no celular emulado.
- [x] Documentação: `docs/arquipelago-regras.md` (fase3-03), `CLAUDE.md` do jogo e do contrato.

## Resultado (29/10/2026)

- Contrato 124 testes, serviço (unidade e integração) 230, jogo inteiro 924 (1 pulado).
- Navegador: `verificar-recife-browser.ts` aprovado no computador e no celular emulado, com o
  Chrome local e o SwiftShader: replanta o coral galho da areia seca, confere o salvamento
  (`recife.corais` 1 e o projeto azul do aquário), abre o mapa na mesa da Maré (o Recife com
  "Você está aqui.", o Pico com "Abre em Mestre dos Jogos.") e fecha. Numa primeira rodada, a
  conferência antiga da câmera dentro da caverna falhou uma vez no celular; as duas rodadas
  seguintes passaram inteiras. Prints em `docs/qa/2026-10-29-recife-corais/`.
- O painel do aquário só aparece com o objeto posto em casa; no navegador ficou conferido o
  projeto azul chegando, e o painel e os peixes, nos testes das regras.
- Typecheck: não rodado nesta sessão (a dona deixou os typechecks com uma sessão só).
