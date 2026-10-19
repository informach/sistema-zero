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
