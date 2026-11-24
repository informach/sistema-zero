# Admissão de metadados — 21/11/2026

Base: `36c3ab7a826d8f5150ed73e41120e859613548af`. O formato 8 continua
interno; o documento público permanece em 7, físico local 2, cena 3/PNG 4 e
nuvem 6. Nenhum estilo, componente visual ou arquivo funcional 3D foi alterado.

## Problemas reproduzidos e correção

Uma edição com objetos individualmente válidos ultrapassava a soma de texto do
documento e entrava no histórico/autosave. O mesmo acontecia em um consumidor
de uma edição ligada de folha. Além disso, o leitor do conjunto conferia seu
cabeçalho e o mapa separadamente: ambos cabiam isolados, mas o documento total
excedia o limite. As três falhas foram reproduzidas na base anterior.

O store existente agora aceita parametrização interna por documento, conservando
`PintaAsset` como padrão dos consumidores públicos. Antes de chamar o host,
registrar histórico ou agendar persistência, confere os metadados do candidato
e de todo o lote ligado. Uma recusa conserva a revisão e não cria desfazer.
Substituições, fechamento de gesto, estado inicial e recuperação também passam
pelo limite. Não se trata de um segundo editor ou de um store de demonstração.

`RegionMetadataBudgetCache` pertence a cada instância do editor e guarda somente
resumos numéricos em chaves fracas por identidade imutável. Referências repetidas
continuam somadas em cada ocorrência. Profundidade contextual, nós, texto/chaves
e buffers seguem os limites existentes: 500.000 nós, profundidade 64, 8 MiB de
arte binária e 8 Mi unidades UTF-16. Não é cache de entrada mutável ou validação
semântica substituta do codec. As células ficam fora dessa medição e conservam
seu orçamento independente de 4 MiB.

O leitor compartilha a projeção de metadados com o store. Preparação, comparação
do documento inteiro e decodificação de chunks são etapas separadas. Um conjunto
soma também o mapa interno e recusa excesso antes do primeiro `atob`. Não mudou
a política dos formatos 0–7, nem se normalizam campos desconhecidos para caber.

## Provas

- Suíte completa: **2.650 aprovados, zero falhas/omissões**, 34.877 asserções,
  240 arquivos, 177,88 s. Inclui os três controles de Pygame real em vídeo
  `dummy`; não é prova de janela gráfica/GPU ou outro aparelho físico.
- Focados: **55 aprovados**, 472 asserções em sete arquivos. Inclui equivalência
  do medidor com o comparador original sob 236 combinações de limites, reuso de
  resumos, referências repetidas, profundidade, ciclos, accessors, recusa de
  gestos/substituições e desfazer/refazer/persistência de uma edição válida.
- Chromium: **18 ensaios aprovados, sem retry**, com reproduções históricas e
  correções no núcleo real do store/codec,
  em desktop, toque emulado e CPU 4×; três controles da oficina pública com CSS
  completo e reabertura no IndexedDB; 12 percursos locais Pinta–Estúdio.
  Os recibos finais e verificações de tipos/lint ficam em `index.json`.
- Tipos completos do Pinta e do Estúdio, lint dos 13 arquivos de código/QA e
  conferência de whitespace aprovados.

O laboratório regional testa a API real e sua persistência injetada; não simula
suporte público 8 nem declara salvamento regional em IndexedDB. A oficina e a
integração ao Estúdio usam os documentos públicos já suportados. Tempos de
execução dos testes não são benchmark da latência do editor.

## Continuação obrigatória

Esta entrega fecha a admissão global de metadados, não o item macro 1. Ainda
faltam o orçamento JSON com o encoder efetivo, backup/transporte 8, protocolo
físico 3, proteção das dependências com clientes anteriores, cena 4/PNG 5,
adaptadores e promoção pública coordenada. Autorregras, projeções e o ciclo
final completo da Vila/PyDew Valley permanecem no plano. Os tetos existentes
não foram ampliados para aceitar a reprodução.
