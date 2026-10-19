# Montagem visual de ossos no Molda

## Decisão aprovada

Em 19/10/2026, o usuário pediu uma montagem visual e guiada para crianças de 9+ e
escolheu **marcar os pontos diretamente no modelo**. Fluxo apresentado:
**Montar os ossos → Ligar à peça → Experimentar o movimento**. Manter o estilo
do Molda e recolher os pesos e a manutenção dos vínculos.

## Interação

- A área Ossos e pesos abre um guia compacto no painel direito, mantendo o 3D
  com espaço para trabalhar. As camadas continuam disponíveis.
- Selecionar uma peça, iniciar a montagem e tocar nas articulações em sequência.
  Linhas ligam os pontos e a ordem fica explícita no painel. Pelo menos dois
  pontos; três permitem uma dobra como começo → cotovelo → ponta.
- Começar pela vista frontal e pelo plano central da espessura da peça. Atalhos
  Frente/Lado/Cima explicam por qual lado montar; não exigir coordenadas.
- Corrigir um ponto pelo painel e marcar novamente; retirar o último ponto ou
  cancelar sem editar a criação. A câmera continua permitindo enquadrar e ampliar.
- Ligar à peça prepara a malha, cria a hierarquia e sugere os pesos. Divisões
  nas articulações internas dão pontos para dobrar; preservar UV, pintura e forma
  em repouso. Se uma face não permitir essa divisão, explicar a recusa sem
  aplicar parte da operação.
- Experimentar permite escolher um osso e dobrar para os lados com um controle
  visual. A deformação aparece no 3D; uma ação volta à posição inicial.
- Usar montagem confirma uma única operação, incluindo preparação, ossos e
  pesos. A experiência não grava uma animação nem uma pose de teste.
- Ajustes avançados preservam o vínculo manual com apoios existentes, o pincel
  de forças e a edição de pesos. Peças já vinculadas nunca recebem outro vínculo
  automaticamente; podem seguir para Animar ou abrir os controles existentes.

## Arquitetura e integridade

1. Domínio para preparar uma cadeia a partir de posições mundiais, sob o pai
   original da peça. Não reparentear nem deslocar a peça. Matriz inversa do pai
   mantém importações com rotação, escala desigual ou reflexão.
2. Preparação da malha por comandos existentes, com cópia quando compartilhada,
   validação de limites e preservação da pintura. Recusar peça travada ou já
   vinculada. Usar o worker existente para a sugestão de pesos.
3. Sessão de montagem independente da persistência. Fonte, store, revisão,
   seleção, acesso e contexto pertencem ao rascunho; alterações externas
   invalidam cálculos e confirmações antigas. Cancelar aborta o worker.
4. Entrada e guias específicos no viewport para marcar os pontos sem trocar a
   seleção da peça. A prévia de deformação usa a cópia derivada do documento;
   autosave e miniatura continuam lendo somente o documento confirmado.
5. Painel guiado compartilhando componentes/tokens existentes. Números e
   configurações de vínculo permanecem em Ajustes avançados.

## Plano de implementação

1. Implementar e verificar preparação, pesos e deformação de teste no domínio.
2. Implementar sessão cancelável e integrá-la ao guardião de prévias da oficina.
3. Integrar marcação e guias no 3D, incluindo câmera e tamanho em pixels dos pontos.
4. Implementar os três passos no painel; recolher os controles antigos.
5. Verificar a autoria real em navegador e as operações de desfazer/refazer,
   cancelamento, pintura, hierarquia, importações e exportação GLB.

## Verificação

Testes de domínio, propriedade de sessão e regressão de vínculos existentes;
fluxo completo em Chromium e Firefox; conferência visual do painel em tamanhos
de tela usuais; vocabulário infantil, TypeScript, lint e build do playground.
Não publicar nem alterar projetos existentes ao abrir a ferramenta.
