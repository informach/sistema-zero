# Lote 231 — a ponte do Estúdio enxerga a geração seguinte

Estado: implementado, revisado e verificado, 10/09/2026.
Fases 3, 5 e 8. A capacidade `sceneWorkshop` continua desligada e o formato público, 1.

## O problema

`listGalleryForStudio` e `exportAssetForStudio` só olhavam o inventário v1. Uma criação
promovida sumiria do "Trazer do Molda": a criança acabaria de modelar e o Estúdio não
enxergaria o trabalho dela. E, mesmo se enxergasse, o exportador v1 funde tudo numa
malha só, perdendo hierarquia, clipes e a pintura animada dos lotes 225 a 227.

## Decisões

- **A lista soma as duas gerações**, ordenada como sempre: para o Estúdio, uma criação
  promovida continua sendo a mesma criação.
- **A geração seguinte sai pelo `encodeSceneGlb`**, no worker, com `animatedPaint` ligado:
  a hierarquia, os clipes e a folha inteira que o runtime avançado sabe tocar.
- **A geração seguinte responde DEPOIS na exportação**: quem não está no v1 é procurado
  nela. Assim uma criação ainda não promovida continua saindo pelo caminho de sempre.
- **Perdas seguem o contrato desta ponte, não o do painel.** O "Trazer do Molda" é uma
  escolha do Estúdio, sem tela de confirmação; o relatório detalhado continua no
  "Exportar GLB" da oficina, onde a criança escolhe.
- **"Baixar tudo" diz o que ficou de fora.** O pacote é da geração v1; a nova tem o
  "Baixar projeto" próprio. Uma cópia de segurança que a criança acha completa e não é
  seria pior do que o aviso. Incluir a geração nova no pacote é o próximo lote.

## Provas

- A criação promovida aparece na lista ao lado de uma textura v1, e sai como `model3d`
  com nome de arquivo certo, prefixo de GLB válido, **mais de um nó** (o v1 funde num só)
  e `extras.molda` com a identidade e a versão do documento.
- Id que não existe em nenhuma das gerações continua devolvendo `not-found`.
- O aviso do "Baixar tudo" aparece com a contagem exata e o "pronto" não aparece junto.
- Molda integral **2.832/0**, 381 arquivos; kids **619/0**; tipos dos dois e Biome passaram.
- Cinco avisos `act` do editor ANTIGO, os mesmos de sempre; nenhuma correção alegada.

## Limites

- A VOLTA da ponte (reenviar ao Estúdio depois de salvar) ainda não existe na oficina
  nova: o aviso "a sincronização com o Estúdio ainda não está ligada aqui" continua certo.
- "Baixar tudo" ainda não empacota a geração seguinte.
- Sem homologação do Estúdio real com uma criação promovida: o roundtrip completo em
  navegador, com o jogo tocando a pintura animada, continua gate de homologação.
