# Lote 233 — a virada pública, e o que a tornou reversível

Estado: implementado, revisado e verificado, 10/09/2026. Fases 1 e 3.
Rollout descrito em `docs/plans/2026-09-10-molda-rollout.md`. **Nada foi implantado aqui.**

## Uma correção ao que o plano dizia

O plano falava em virar `MOLDA_DOCUMENT_WRITE_VERSION` para 2. Conferido nos chamadores:
esse número é o carimbo do escritor **v1**, e `assertMoldaDocumentWritable` é usado só por
`assetJson`, `guardedWrite`, `memoryPersistence` e `persistence` — todos caminhos v1.
Virá-lo para 2 faria toda gravação v1 lançar. Documento v1 é v1 para sempre; quem escreve
o formato novo é a persistência de cena, que nunca passa por esse portão.

A virada, portanto, não é uma constante: é a capacidade do host. Um sinal só, num lugar só.

## O que tornou desligar seguro

A primeira versão da capacidade governava o ACESSO: com ela desligada, a criação da
geração seguinte sumia da galeria. Isso torna a volta atrás destrutiva — a criança teria
trabalho promovido preso num editor que não sabe lê-lo.

Agora a capacidade governa só a **promoção**:

- Criação já na geração seguinte: listada e aberta na oficina, **sempre**.
- Modelo antigo: só vai para a oficina com a capacidade ligada, porque abrir por lá promove.
- Textura e céu: nos editores deles, em qualquer caso.

Desligar passa a ser uma linha e não perde nada.

## Um defeito de robustez que a mudança expôs

Com a fonte da geração seguinte sempre ligada, uma falha ao listar o inventário dela
derrubava a galeria INTEIRA — 17 provas reprovaram de uma vez, todas mostrando "Tentar de
novo" no lugar da lista. As duas gerações vivem no mesmo banco e na prática falham juntas
(e aí o erro de carga já cobre), mas o contrário não pode acontecer: um inventário que
talvez nem exista ainda não pode apagar a galeria da criança. Agora a listagem da geração
seguinte falha sozinha, sem levar a v1 junto.

## Provas

- Sem a capacidade, o modelo antigo **não é promovido**: abre no editor de sempre e o
  registro v1 continua no lugar dele, conferido no disco.
- Sem a capacidade, o que **já foi promovido continua listado e abrindo** na oficina.
- Com a capacidade, o modelo antigo promove ao abrir (lote 228) e a nuvem acompanha
  (lote 230).
- Molda integral **2.833/0**, 381 arquivos, zero avisos act; kids **619/0**; tipos dos
  dois, Biome, build do Kids (5,1 s, 59 páginas) e **14 de 14 e2e em Chromium real**.

## Limites

- **Implantar é decisão e ação da dona.** A ordem está no documento de rollout: leitores
  antes do escritor, com os dois podendo ir juntos ao custo de um intervalo em que uma
  aba aberta de antes veria a criação promovida como ilegível até recarregar.
- Nada aqui homologa tablet físico, toque real ou compreensão de uma criança.
- A volta da ponte (reenviar ao Estúdio ao salvar) e o "Baixar tudo" da geração nova
  continuam abertos; o "Baixar tudo" já diz o que deixa de fora.
