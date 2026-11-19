# Biblioteca e arrasto: homologação local

Etapa 4a: posicionar artes e conjuntos pelo palco existente, com prévia, grade,
cancelamento e um desfazer por gesto. A biblioteca mantém suas miniaturas e o
Pinta mantém sua identidade visual. Nenhuma dependência ou formato novo.

## Resultados

- Pinta: **2.129 testes aprovados**, zero falhas ou omissões, **23.738 asserções**,
  182 arquivos. Python/Pygame disponível para os casos condicionais.
- Tipos do Pinta e do Estúdio: saída 0.
- Biome global: **16.236 arquivos**, zero erros, 303 avisos e 245 informações.
- Arrasto real: **3 aprovados**, sem omissão ou nova tentativa, em desktop,
  toque emulado Pixel 7 e desktop com CPU 4× mais lenta.
- Regressão dos terrenos depois da correção do painel: **6 aprovados** nos
  mesmos perfis, incluindo criação do modelo e reabertura.
- Suíte completa de cenários Pinta/Phaser: **32 aprovados**, zero falhas,
  omissões ou novas tentativas, em desktop e toque emulado. Inclui importação,
  edição e reabertura da Vila, animações, portas e colisões precisas do pacote real.

O fluxo de biblioteca usa pixel art, arte vetorial e conjunto vinculado reais.
Confere a imagem da prévia, cancelamento nativo do toque/Esc, soltura, um único
desfazer, refazer, vínculo do conjunto, salvamento e comparação depois de reabrir.
Origem e destino precisam estar dentro do viewport; a prévia apenas ter CSS
visível não é aceita como prova de uso real.

## Falhas encontradas e corrigidas

1. A inserção por clique selecionava automaticamente o objeto, mudando o
   comportamento anterior e quebrando o fluxo de animações/versões de arte.
   O clique conserva a seleção anterior; o arrasto seleciona o objeto colocado.
   A regressão de recursos passou novamente, sem mudar o teste esperado.
2. O `details` do desktop criava uma caixa nativa sem limite de altura. A coluna
   media 1.487 px num editor de 660 px; o palco ficava em y negativo ao trazer
   uma miniatura à vista. O teste reforçado reproduziu a falha. A coluna agora é
   filha direta do flex no desktop, e o recolhimento móvel permanece nativo.
3. O gesto agora recusa também coordenadas fora da janela, além do papel e da
   parte visível do palco. Prévia, documento e histórico são separados.

As regressões integradas cobrem ponteiro incorreto, Esc, `pointercancel`, perda
de captura, blur, soltura fora do palco, clique posterior, teclado, grade,
offset herdado, bloqueio e teto de objetos. A prova de recuperação usa o store
real: um conflito durante o flush adota uma cópia, e eventos tardios preservam
essa cópia com o histórico limpo.

## Alcance

Somente esta máquina Windows foi usada. O toque e a CPU são simulados; não houve
telefone físico ou participantes crianças. Os arquivos de teste usam namespace
e artes exclusivos de homologação. O ensaio não comprova ainda o ciclo autenticado
de publicação nem encerra as demais etapas da missão. O pincel de espalhar
objetos/conjuntos continua sendo uma entrega distinta, prevista na etapa 4b.
