# Molda: um pixel por unidade

Decisões confirmadas pelo usuário: somente projetos novos; ao aumentar uma peça pintada,
a grade aumenta, sem esticar os pixels. Projetos existentes conservam sua resolução e pintura.

## Comportamento

- Novos projetos nativos usam densidade 1. A leitura e a migração de projetos antigos mantêm
  sua densidade anterior, inclusive o padrão legado 4.
- Faces planas com medidas inteiras têm o mesmo número de pixels que unidades de mundo.
  Atlas podem ter margens e tamanho maior que a área efetivamente usada pela face.
- Redimensionar recalcula a área UV e copia pixels, sem ampliar o desenho. O canto superior
  esquerdo de cada ilha serve de referência; reduzir recorta, e Desfazer restaura a pintura.
- Mover e girar preservam os recursos de pintura. Escala de grupos considera o tamanho no
  mundo; animações continuam usando os mapas estáticos do modelo.
- A orientação das ilhas editadas à mão é preservada. O empacotamento pode mudar quando a
  ilha cresce. Curvas usam uma métrica média, pois não admitem mapa plano sem distorção.
- Recursos compartilhados são isolados antes de alterar sua UV ou pixels. Camadas, alfa e
  identidades exclusivas são preservados. Mapas de aparência e pinturas animadas precisam
  ser tratados juntos; falhas de capacidade recusam a operação inteira.

## Implementação e verificação

1. Aceitar densidade 1 e usá-la exclusivamente na criação nativa nova.
2. Alinhar a origem dos mapas métricos para medidas ímpares não ganharem pixels extras.
3. Medir a superfície em unidades de mundo no espaço UV; ajustar ilhas, empacotar sem
   reduzir e copiar pixels em escala 1:1. Integrar às medidas e às alças de tamanho.
4. Preparar os modelos prontos novos na mesma escala, transferindo sua pintura inicial.
5. Cobrir medidas ímpares, escala não uniforme e de grupos, orientação UV, alfa, camadas,
   isolamento de cópias, cancelamento/desfazer e compatibilidade com projetos antigos.
6. Executar testes do Molda, tipos, lint, build e fluxos relevantes no navegador local.

Alternativas consideradas: manter 4 pixels por unidade continuaria contradizendo o pincel;
converter projetos existentes poderia destruir detalhes. Ambas foram descartadas conforme
as escolhas do usuário. Não é necessário acrescentar parâmetros à interface infantil.

## Notas da implementação

- A densidade 1 identifica os projetos novos. A fábrica e o leitor legados continuam com
  padrão 4; abrir, importar ou salvar um projeto antigo não dispara conversão.
- Modelos prontos recém-criados recebem a nova escala uma única vez, com transferência da
  arte inicial. O redimensionamento posterior copia os pixels sem interpolação.
- A métrica de cada ilha é calculada nas direções UV existentes. A raiz positiva da matriz
  métrica ajusta o tamanho preservando a orientação da ilha; superfícies curvas usam média
  ponderada pela área UV. Formas continuam paramétricas e mantêm seus controles de detalhe.
- A origem e a extensão de cada mapa consideram medidas ímpares e fracionadas. Uma face
  com largura 1,1 cobre um pixel inteiro e parte do próximo, sem comprimir os dois em 1,1.
- O mapa cresce a partir do canto superior esquerdo de cada ilha. Seus pixels são copiados
  apenas nas áreas cobertas pelas faces, preservando cores, alfa e camadas escondidas.
- As faces geradas por espelho contínuo reutilizam as UVs invertidas da fonte. Não recebem
  uma segunda área independente no atlas ao redimensionar.
- Mapas de cor, relevo e brilho com dimensões iguais são ajustados juntos. Pintura animada,
  mapas com dimensões diferentes ou UV sem área recusam o redimensionamento com orientação
  de correção; não esticam nem descartam pixels silenciosamente. O orçamento também recusa
  a transação inteira. Desfazer recupera o estado anterior, inclusive os pixels recortados.

## Correção da entrada pela galeria

Os prints de 19/10 revelaram um caminho que a primeira validação não cobria: `NewAssetDialog`
chamava a criação legada com densidade 4 explícita. Alterar `createSceneProject` não alcançava
essa entrada. Um teste começando em **Criar novo → Criar modelo** reproduziu a falha: esperava
1 e recebia 4 no projeto baixado.

O padrão agora é compartilhado pelo host nativo, criação rápida da galeria, formulário de
configuração e criação sem densidade explícita no store. O leitor e a fábrica legados mantêm
4. Escolhas explícitas de densidade, projetos existentes, importações e a arte dos modelos
prontos da galeria permanecem preservados. A configuração inicial passa a explicar pixels por
unidade, com opção 1:1 selecionada; não promete uma configuração posterior inexistente.

Verificação: 87 testes de integração/domínio, 16 de vocabulário, 8 fluxos de navegador em
Chrome/Firefox, tipos, lint e build. O fluxo de navegador confere a caixa inicial de tamanho
2, pintura de um único pixel, caixa de 16, configuração explícita com mais detalhes e desfazer.
