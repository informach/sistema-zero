# Lote 230 — a nuvem ciente das duas gerações, e os leitores compatíveis

Estado: implementado, revisado e verificado, 10/09/2026.
Fases 1 e 3. Este é o **passo de LEITORES do rollout**: o cliente passa a saber abrir a
geração seguinte, e nada ainda a escreve na nuvem. O escritor vem depois, e só depois
de este commit estar implantado.

## O problema

Promover uma criação tira o registro do inventário v1 e coloca no da geração seguinte. O
espelho da nuvem do kids só conhecia o inventário v1, e daí saíam dois estragos:

1. A criação promovida **desapareceria da lista local** que a reconciliação compara com a
   nuvem. Uma criação presente lá e ausente aqui é uma criação que este aparelho apagou.
   **A promoção apagaria o backup da criança.**
2. Nada da geração seguinte subiria: o trabalho continuaria no aparelho e pararia de subir.

Dois espelhos separados seriam pior: o espelho v1 veria a promoção como exclusão e o novo
veria como criação, e os dois brigariam pelo mesmo id na nuvem.

## Decisões

- **UM espelho, ciente das duas gerações.** Toda a máquina de fila, lápides, base vencida
  e conflito continua a mesma; o que mudou é que ela passa por um único ponto de despacho.
- **Capacidade declarada = capacidade real.** `MOLDA_MAX_READ_VERSION` virou 2, mas o
  espelho só declara 2 quando a fonte da geração seguinte está ligada; sem ela continua 1
  e a criação remota nova vai para a recuperação, como antes. Prometer ler e não conseguir
  seria pior do que recusar.
- **O leitor v1 continua recusando a v2.** `MOLDA_V1_MAX_READ_VERSION` é o registro do
  leitor v1 e segue em 1: o `never` do despacho continua cobrando um parser para cada
  versão que entrar ali. Ler v2 é trabalho do leitor de cena, não do sanitize.
- **A cirurgia no documento fica no Molda.** O host move JSON e carimbos; renomear ao
  descer e criar a cópia de conflito são operações da fonte da geração, que conhece o
  formato. Nada de o host editar JSON que não sabe validar.
- **Nada é lido sem validação estrita.** `inspect` existe para o host obter nome e carimbo
  de um download sem gravar e sem confiar num JSON cru.

## Um defeito real encontrado pela integração

`loadAll()` iniciava a reconciliação com a lista **v1 apenas**. Com a geração seguinte
ligada, uma criação promovida ficaria de fora dessa lista e a reconciliação decidiria
sobre ela como se tivesse sumido do aparelho. Corrigido: a reconciliação recebe as duas
gerações; o `loadAll` continua devolvendo o que a API v1 dele promete.

## Implementação

- Molda: `createMoldaSceneCloudSource` (listar, ler, conferir, gravar com renomeação,
  copiar e apagar, tudo sob o leitor estrito da cena e a trava por revisão) e
  `sceneCloudSummary`, o único lugar que marca a geração num resumo.
- Kids: `MoldaSceneCloudSourceLike` espelhado, opção `sceneSource`, e o objeto `documents`
  com `read`/`parse`/`write`/`copy`/`remove` — o único ponto de despacho por geração.
  A geração seguinte responde primeiro: depois da promoção, é ela quem tem a criação.
- `molda-client.tsx` liga a fonte sempre. Sem criações da geração nova, a lista extra é
  vazia e nada muda; com elas, a promoção já nasce coberta.

## Provas

- Molda, com IndexedDB real: o que sobe é o documento inteiro com pixels em base64;
  gravar o que desceu compara o carimbo autoral E a revisão; JSON quebrado, id trocado e
  formato futuro nunca viram gravação; apagar exige o carimbo corrente; a cópia de
  conflito nasce com id, nome e carimbo novos sem tocar a original; renomear ao descer
  não custa uma segunda gravação.
- Kids: a criação promovida continua na lista e **a nuvem não recebe exclusão nenhuma**;
  a criação da geração seguinte sobe com `formatVersion: 2` e a miniatura dela; a que
  desce entra no inventário da geração seguinte e não no v1; e **sem a fonte ligada** a
  remota nova continua indo para a recuperação.
- Molda integral **2.829/0**, 381 arquivos, zero avisos act; kids **619/0**; tipos dos
  dois, Biome e build do Kids (10,0 s) passaram.

## Limites e a ordem que falta

- **Este commit precisa estar em produção antes de qualquer escritor da geração nova.**
  É o passo de leitores: implantar depois seria expor documentos que clientes antigos não
  sabem ler.
- A capacidade `sceneWorkshop` continua desligada, então nada escreve v2 na nuvem ainda.
- Não homologa nuvem real: os testes usam nuvem e banco falsos e um IndexedDB de teste.
  Dois perfis, dois aparelhos e conflito real continuam gate de staging.
