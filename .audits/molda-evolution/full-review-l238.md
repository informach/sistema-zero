# Lote 238 — full review de tudo o que esta sessão implementou

Estado: revisado, corrigido e verificado, 10/09/2026.
Escopo: o diff autorado por mim, `57dec75d..HEAD` (91 arquivos, +4234), ou seja os lotes
225 a 237 mais os cinco commits que trouxeram os 224 lotes anteriores para a `staging`.

## Como foi feito

Seis revisores independentes, só de leitura, um por frente: contrato e produtor da pintura
animada; consumidor no runtime do Estúdio; espelho da nuvem das duas gerações; integração e
roteamento no app; ponte com o Estúdio, backup e chanfro; qualidade dos testes e e2e. Em
paralelo, sondas minhas sobre a ponte do Estúdio.

Saíram **cerca de quarenta achados**. A regra da casa vale para todos: *achado confirmado
por script ou teste ANTES de corrigir; cada item tem regressão*. Nada aqui foi corrigido
por leitura só — cada correção abaixo tem uma execução vermelha antes e verde depois.

## Corrigidos, com regressão (15)

| # | O que estava errado | O que a criança vivia |
| --- | --- | --- |
| 1 | `exportSceneForStudio` aceitava criação **vazia** | o Estúdio recebia um modelo de 164 bytes; o caminho v1 recusa com `empty` |
| 2 | a ponte **ignorava os tetos do Estúdio**, conferia só bytes | 60 malhas num teto de 48 atravessavam, enquanto o painel da oficina dizia "precisa de ajustes" |
| 3 | criação promovida listada **duas vezes** | dois cartões idênticos, chave React repetida, duas vagas por página |
| 4 | apagar na geração seguinte **não virava lápide** | a exclusão voltava atrás no outro aparelho, e não dava para apagar de novo |
| 5 | salvar na oficina **não enfileirava subida** | o backup da conta ficava até 20 min velho, dependente de uma volta à galeria |
| 6 | a ponte relia o **perfil corrente** depois dos awaits | tablet compartilhado: a criação de uma criança ia para o Estúdio da outra |
| 7 | recusa de fotografar **apagava a foto** | isolar uma peça e mexer nela tirava o retrato do cartão |
| 8 | falha da ponte era **muda** na oficina nova | o jogo ficava com o modelo velho, sem recado |
| 9 | **"Jogar de novo" não rebobinava** a pintura animada | uma pintura de uma vez só já nascia travada no último quadro, para sempre |
| 10 | renomear na geração seguinte podia escrever **carimbo menor** | o rename voltava atrás na sincronia seguinte |
| 11 | a miniatura v2 ia **crua** para a reserva da nuvem | no dia em que os tetos divergirem, toda subida v2 leva 4xx |
| 12 | "Baixar tudo" chamava de **completo** um pacote sem as promovidas | o único backup da criança mentindo para ela |
| 13 | **Cancelar** não interrompia a leitura dos projetos | botão parado e contador congelado na fase mais cara |
| 14 | o relatório de destino dizia **"não contém movimentos"** para pintura animada | dois parágrafos depois de o destino ter dito o contrário; ela não usaria o Jogo 3D Avançado |
| 15 | a fixture da pintura animada **não tinha guarda de deriva** | produtor e cópia congelada podiam divergir com as duas suítes verdes |

Detalhe das causas que valem memória:

- **4 e 5 têm a MESMA raiz**: a galeria e a oficina falam direto com a persistência de cena,
  então nem autosave, nem renomear, nem duplicar, nem apagar passavam pelo espelho da
  nuvem — e `save`/`remove` do espelho eram os únicos lugares que enfileiravam. A correção
  é uma só: o espelho passou a **ouvir o canal de commits** da geração seguinte
  (`MoldaSceneCloudSource.subscribe` agora leva `{id, revision, status}`), e despacha
  `enqueue` ou `enqueueRemove`. Promover sozinho continua sem gerar HTTP, porque a marca já
  é aquele `updatedAt` — isso também virou teste.
- **6** foi o achado mais grave por natureza: a sonda mostrou a exportação devolvendo
  `nave-do-bento.glb` quando o pedido era do perfil da Ana. `useStudioResync` prende a conta
  ANTES da fila de propósito; o caminho da geração seguinte jogava fora esse vínculo.
- **7** era o contrário do que a própria docstring de `renderThumb` promete. `null` é
  RECUSA, não "sem foto"; `?? undefined` transformava a recusa em valor.

## Investigado e descartado (1)

`listGalleryForStudio` rejeita inteiro quando o inventário da geração seguinte falha,
enquanto a galeria segura o erro. Uma sonda reproduziu a rejeição, mas **as duas gerações
vivem no mesmo banco** e o inventário v1 é lido primeiro: elas falham juntas, e o erro na
modal do Estúdio é honesto. Um registro v2 corrompido já é tolerado item a item. Não é
defeito, e por isso não foi "corrigido" com um `catch` que esconderia uma lista parcial.

O outro lado dessa decisão virou a correção 12: onde o `catch` JÁ existia (a galeria), ele
escondia um backup incompleto. Agora a falha fica registrada em `sceneUnavailable` e o
"Baixar tudo" recusa em vez de anunciar um pacote completo que não é.

## Em aberto, com o motivo (registrados no plano)

Ranqueados. Nenhum deles bloqueia o que já está pronto, e nenhum é regressão do que existia.

1. **Download cruzado entre gerações trava em silêncio.** `documents.write` despacha pela
   geração do BLOB que desceu; `documents.remove` despacha pela geração DONA local. Um
   aparelho com a criação já promovida recebendo um blob v1 de outro aparelho lança
   `MoldaUnsupportedVersionError`, vira `console.warn` e re-baixa para sempre. Exige decidir
   se o espelho converte ou recusa com aviso de recuperação — decisão de produto.
2. **Perda silenciosa na ponte do Estúdio.** O v1 é tudo-ou-recusa e leva peça escondida;
   a geração seguinte grava com `allowLosses` e some com peça escondida, face descartada e
   geometria solta, sem aviso — enquanto o "Exportar GLB" da própria oficina exige aceite
   para as mesmas perdas. A ponte é PULL do Estúdio e não tem canal de aceite. O comentário
   do código foi corrigido para dizer isso; a escolha entre recusar, avisar ou manter é dela.
3. **`documents.read` pode lançar fora do `try` do reconciliador**, e um registro v2
   ilegível aborta a fase de descida inteira daquela passada, em silêncio.
4. **`SceneWorkshopHost` é lazy sem fronteira de erro**: um chunk trocado por deploy com a
   aba aberta derruba a árvore inteira, e o `React.lazy` guarda a rejeição. O editor antigo
   tem `DeferredEditor` com "Tentar de novo" e "Voltar para a galeria".
5. **A foto pode sair na POSE da sessão**, enquadrada pelos limites de repouso, e trocar a
   foto substitui o objeto do documento, o que cancela pose pendente e para a reprodução.
6. **Custo**: todo reenvio serializa e reparseia o documento inteiro (`sceneToJson` →
   `JSON.parse` → `readSceneDocument` → clone do worker), sem cache e sem cancelamento; e
   "Baixar tudo" segura todos os projetos em memória antes de comprimir.
7. **Orçamento de pixels do destino Estúdio** é alcançável com um projeto legal cujo GLB
   portátil tem 8 kB, e a mensagem que a criança vê é a string crua do codificador, fora do
   `COPY`.
8. **`KHR_texture_transform` sai em `extensionsUsed` e não em `extensionsRequired`**: um
   programa que ignore a extensão pinta um mosaico de todos os quadros em cada face, e nem
   o arquivo nem a dica declaram isso.
9. **UV fora de `[0,1]` com a folha inteira** amostra a célula vizinha, sem aviso.
10. **Chanfro em várias quinas**: quinas vizinhas só são recusadas na última passada, depois
    de reindexar a malha inteira por quina. Uma varredura de pontos compartilhados antes da
    primeira passada dá a mesma recusa em O(N).
11. **Sem teto no tamanho da sequência** do flipbook no runtime do Estúdio (o produtor
    limita a 256; o consumidor aceita qualquer GLB).
12. **Qualidade de testes**: uma lista de asserções que não podem falhar (marcador da
    oficina que aparece também no erro; ZIP que nunca é aberto; comutatividade provada por
    contagem de faces; `expect` decorativo em volta de `getByRole`). Três das piores já
    foram corrigidas nesta rodada; o resto está listado no plano.

## Portões

Molda **2.850/0** em 381 arquivos, **zero avisos act**, tipos e Biome · Estúdio Jogo 3D
Avançado **481/0** e tipos · kids **623/0**, tipos e build.

Uma nota sobre a leitura desses números, porque ela custou tempo aqui: a primeira integral
depois das correções deu **3 falhas**, e nenhuma era regressão. Duas eram as fixtures
gravadas do Estúdio, que o campo novo `stats.animatedPaints` mudou de verdade — regeradas
depois de eu conferir que **os bytes do GLB continuam idênticos**. A terceira foi o teste do
worker bbmodel, sensível a TEMPO, que passa sozinho: eu estava rodando a suíte do Estúdio e
o build do Kids ao mesmo tempo. Contenção, a armadilha que o próprio repo já registra.

## Limites deste review

Seis revisores de leitura não substituem execução: tudo o que eles apontaram foi conferido
por sonda ou teste antes de virar correção, e o que não deu para confirmar ficou na lista
aberta em vez de virar mudança especulativa. Nada aqui foi homologado em aparelho físico
nem com uma criança, e o navegador real cobre a suíte e2e, não estas correções uma a uma.
