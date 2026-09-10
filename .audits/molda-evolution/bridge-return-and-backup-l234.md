# Lote 234 — a volta da ponte e o backup da geração seguinte

Estado: implementado, revisado e verificado, 10/09/2026. Fases 5, 8 e 9.
As duas últimas pendências que a virada do lote 233 deixava visíveis para a criança.

## A volta da ponte

O editor antigo reenvia a criação ao Estúdio depois de salvar. A oficina nova não, e por
isso o aviso "a sincronização com o Estúdio ainda não está ligada aqui" continuava certo.

- `useStudioResync` deixou de conhecer formato: recebe a exportação da geração dona da
  criação. O editor antigo passa a dele; a oficina passa `exportAssetForStudio(id)`, que
  relê o disco pela geração certa. Debounce, ordem, saída ao esconder a aba e ao fechar a
  criação continuam sendo os mesmos, um código só.
- O aviso de oficina em desenvolvimento passou a depender da ponte existir. Sem ela é o
  host interno e o aviso é verdade; com ela a oficina é o editor da criança e o aviso
  mentiria.

### Um defeito real, achado pela prova

`exportAssetForStudio` procurava a criação no inventário v1 e, se essa leitura LANÇASSE,
a exceção subia e a geração seguinte nunca era consultada — justamente a que tem a
criação promovida. O reenvio ficava mudo. Agora uma falha no inventário v1 não impede a
geração seguinte de responder.

## O backup

"Baixar tudo" empacotava só a geração v1 e apenas avisava o que ficava de fora. Agora a
criação da geração seguinte entra em `projetos/<nome>.molda.json`, o MESMO arquivo do
"Baixar projeto" da oficina, que volta pelo "Trazer uma cópia do Molda".

- **O envelope antigo não muda de forma.** `galeria.molda.json` continua sendo a lista v1
  e nada mais. Mexer nele para caber um documento de outra geração arriscaria o backup
  que já funciona, e o arquivo nativo já é a porta de entrada da oficina.
- O LEIA-ME explica a pasta nova e por onde trazer de volta.
- O aviso não sumiu: ele passou a significar o que sobrou de fato, uma criação da geração
  nova que não pôde ser lida na hora do pacote.

## Provas

- Salvar na oficina reenvia ao Estúdio; abrir não reenvia nada; fechar a criação com um
  reenvio pendente drena a fila na hora, e o que chega é `model3d` com o id certo.
- O pacote leva `projetos/nave-2.molda.json` ao lado de `modelos/nave.glb`: **duas
  criações com o mesmo nome, uma de cada geração, não se sobrescrevem**. O envelope v1
  continua com só a criação v1, e o arquivo nativo volta pelo leitor de projeto.
- Molda integral **2.835/0**, 381 arquivos, zero avisos act; kids **619/0**; tipos dos
  dois, Biome, build do Kids e **14/14 e2e em Chromium real**.

## Limites

- O reenvio só atualiza uma criação que JÁ está na biblioteca do Estúdio: a guarda do
  `getPersonalAsset` é a regra do host e não mudou. Trazer pela primeira vez continua
  sendo a decisão explícita do "Trazer do Molda".
- Sem homologação do roundtrip com o Estúdio real em navegador.
