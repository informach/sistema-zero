# Seleção, clipboard e templates por regiões

O núcleo de objetos agora admite alinhamento/distribuição como uma operação
atômica: um destino inválido conserva todo o mapa anterior. Colar usa o clonador
comum para objetos e artes incorporadas, preservando referências internas e
versionando também os dependentes indiretos alterados. A oficina densa usa essa
mesma operação, com sua política histórica de coordenadas e os componentes atuais.

No modelo interno por regiões, deltas negativos/fracionários são preservados.
Uma seleção assinada só entra no mapa legado quando a tradução é representável
sem perda. Conflito de recursos, formato futuro ou orçamento excedido recusam
o gesto inteiro. O carimbo das artes conhecidas é atualizado na admissão autoral;
o leitor nativo 8 permanece estrito e nenhum carimbo futuro é rebaixado.

Templates isolam o objeto escolhido, sua ancestralidade e uma base neutra. Um
mundo lógico de 10.000 × 10.000 não é materializado para guardar um objeto.
Geometria girada/fracionária, recursos e propriedades sobrevivem ao codec de
conjuntos 8. Recusas esperadas são tipadas; erros inesperados não são ocultados.

O espelho de clipboard 3 conserva coordenadas assinadas e é recusado inteiro pelo
módulo anterior. Os formatos 1/2 mantêm seus bytes. O parser limita o texto antes
do JSON e recusa metadados desconhecidos, IDs repetidos e geometrias inválidas.
O teste usa localStorage real entre abas, incluindo fechamento e reabertura.
O módulo histórico é uma fixture de fonte com hash; suas dependências são as
atuais. Essa prova é do contrato do clipboard, não de um cliente inteiro antigo.

## Revisão e verificação

- 88 testes direcionados passaram, com 2.981 asserções.
- Suíte completa do Pinta: 2.376 passaram, três controles nativos ignorados por
  padrão, zero falhas e 28.593 asserções.
- Os três controles com Pygame real/SDL dummy passaram à parte, com 4.372 asserções.
  Eles são regressão dos exportadores atuais; não homologam regiões em motores.
- Tipos completos do Pinta e Estúdio passaram; Biome dos arquivos do lote passou.
- 21 ensaios de navegador passaram, sem retries, nesta máquina: desktop, toque
  emulado e CPU 4×. Incluem arte privada encadeada, colagem entre mapas, uma entrada
  de histórico, desfazer/refazer, salvar/reabrir e templates girados. A oficina
  exercitada permanece densa; regiões aparecem apenas na página de QA do clipboard.

O índice conserva reproduções e rodadas intermediárias. Uma falha de reabertura
no novo teste vinha de recarregar antes da conclusão observável de “Voltar”. O
fluxo agora espera a galeria, como os demais testes; não houve mudança artificial
de persistência nem sleeps/retries. Também estão preservados o fixture inicial
não canônico, a falha de tipos e uma invocação incorreta do CLI na raiz.

O novo ensaio de clipboard segue o padrão `*-scenes.flow.ts`, entrando na suíte
normal de CI. Os resultados locais não são uma declaração de CI remota aprovada.

Retificação da revisão seguinte: o perfil chamado `cpu-4x` não ativava o CDP nos
quatro casos do arquivo de recursos, cujo hook esperava `cpu4x`. Os demais três
casos aplicavam o fator pelos metadados. A rodada seguinte corrigiu o hook e
repetiu esses fluxos, registrando o fator aplicado em cada caso. Conferir
`../espalhamento-de-objetos-por-regioes-2026-11-21/`: a rodada histórica acima não deve ser
usada como prova de CPU 4× para aqueles quatro casos.

## Limites da entrega

Formato 8, conjuntos por regiões e clipboard assinado continuam preparação
interna. Espalhamento, render/câmera/minimapa, protocolo físico 3 e adaptadores
precisam ser concluídos antes da promoção pública. Este lote não fecha sozinho
as etapas 1 ou 4, nem o ciclo final Pinta → Estúdio → jogo publicado. Não houve
teste com crianças ou outro aparelho físico, merge ou implantação neste lote.
