# Etapa 5: ferramentas profissionais autorais

A missão autoriza decisões técnicas e execução contínua, sem aprovação entre etapas.
Esta etapa reutiliza a oficina e os contratos existentes. Não altera Molda/3D.

## Auditoria inicial

Formas, pontos editáveis, caminhos, zonas, papéis infantis, portas por propriedade,
colisões autorais, animações, propriedades tipadas, grupos, frente e parallax já
têm documento e interface. Os consumidores compartilhados e a física foram
ampliados nos lotes anteriores. Falta repetir a autoria profissional como fluxo
de navegador e conferir todos os dados resultantes nos consumidores.

O primeiro defeito encontrado fica em `MapLibraryPanel`: guardar um modelo usa
`selected.width/height` sem a caixa transformada. Uma arte girada pode sair dos
limites do conjunto. A origem e os offsets herdados precisam entrar uma só vez.

## Decisão

Reutilizar `objectBounds` e `createMapSet` em uma operação pura de modelo de objeto.
O recorte inclui a caixa visual e a âncora, alinhado para fora à grade; preserva
grupos necessários, propriedades, colisão, arte/animação e recursos versionados.
Conjunto aninhado ou dimensão além do orçamento é recusado antes de salvar.
O painel conserva o botão e as mensagens existentes.

Corrigir só o cálculo dentro do componente deixaria lógica geométrica difícil
de testar e duplicada. Criar outro tipo de template exigiria migração e novos
adaptadores sem necessidade: o conjunto atual já representa a definição vinculada.
O recorte comum de uma seleção continua com seu significado atual.

## Verificação

Reproduzir o corte pela interface atual antes da correção. Testar a operação pura
com giros, espelhos, pontos/polilinhas, offsets, recursos e orçamento. Executar a
interface e o navegador com reabertura e reutilização. Depois ensaiar autoria de
caminhos/zonas/portas/propriedades/camadas e execução, corrigindo lacunas reais.
Não confundir metadados exportados com comportamento programado no Pinta.
