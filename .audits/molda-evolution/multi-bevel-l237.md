# Lote 237 — chanfro em mais de uma quina

Estado: implementado, revisado e verificado, 10/09/2026. Fase 4.
Uma das duas lacunas que a tabela das fases listava como "chanfro restrito a uma quina e
caminhos abertos".

## Decisões

- **Uma passada por quina, sobre o resultado da anterior.** O chanfro é um corte por
  plano, e cortar reescreve a topologia: fazer as quinas "de uma vez" exigiria um solver
  novo, com todas as guardas do atual reinventadas.
- **A identidade que atravessa é o PAR DE PONTOS, não o id da linha.** Os ids mudam a
  cada corte; os pontos das quinas escolhidas sobrevivem, exceto quando a quina anterior
  consome a seguinte.
- **Quinas que se encostam recusam a ação INTEIRA.** Duas quinas vizinhas compartilham um
  ponto, e chanfrar a primeira apaga a linha da segunda. Aplicar o que der e desistir do
  resto deixaria a peça pela metade num único desfazer; multisseleção é atômica em todo o
  resto do Molda e continua sendo aqui.
- Uma quina só continua entrando pelo caminho de antes, byte a byte: nada do que já
  funcionava mudou de rota.

## Provas

- Duas quinas OPOSTAS do cubo saem na mesma ação: 8 faces, 8 linhas novas, e o sólido
  continua fechado (toda linha com exatamente duas faces, percorridas em sentidos
  opostos). A geometria resultante passa pelo leitor estrito.
- **A ordem não muda o resultado**: chanfrar quinas separadas é comutativo.
- Duas quinas VIZINHAS lançam com a mensagem que explica o porquê, e a malha de entrada
  fica idêntica ao que era antes da tentativa.
- Profundidade zero não muda nada, com uma quina ou com várias.
- Integral **2.839/0**, 381 arquivos, zero avisos act; tipos do Molda e do Kids, Biome e
  build do Kids passaram.

## Limites

- Quinas que se encostam continuam exigindo uma ação por vez. Fazê-las juntas exige
  resolver o encontro dos planos, que é outro problema.
- A outra lacuna da fase 4 continua aberta: os caminhos de tubo aceitam só cadeias
  ABERTAS, e um laço fechado precisa de um gerador que dê a volta. Não foi tentado aqui.
- Sem homologação visual: o que se prova é topologia e invariante, não aparência.
