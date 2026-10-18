# Proposta — pintura e mapa UV do Molda

Data: 17/10/2026. Estado: proposta aprovada e implementada localmente. Ver [implementação e validação](./2026-10-17-molda-pintura-uv-implementacao.md).

Preferência confirmada pelo usuário: folha à esquerda, modelo 3D ao lado e opção de ampliar.

## Recomendação

Reunir **Folha de pintura** e **Mapa da pintura** em um único painel, acessível diretamente na barra de Pintar. Dentro dele, a criança alterna entre **Pintar** e **Ajustar mapa**. O mapa deixa de aparecer em “Mais ferramentas”.

O fluxo principal continua sendo escolher uma cor e pintar no modelo. Abrir a folha ajuda a desenhar detalhes; ajustar o mapa é uma escolha explícita dentro desse mesmo espaço.

## O que a referência ensina

O Blockbench distingue Box UV e UV por face. Em malhas, cada face guarda coordenadas UV associadas aos seus vértices: os pontos do mapa correspondem aos cantos da face, mas editar esses pontos não altera a geometria 3D. O editor oferece arraste de pontos e alças para transformar a seleção, além de zoom, navegação e enquadramento da seleção. Fonte: [implementação oficial do editor UV](https://github.com/JannisX11/blockbench/blob/master/js/uv/uv.js).

O painel UV também serve para pintar a textura no modo Paint, usando as ferramentas de pintura. A documentação apresenta ainda uma visualização ampliada do editor. Essa proximidade entre folha, mapa e modelo é a referência mais útil para o Molda. Fonte: [guia oficial, painéis de Edit e Paint](https://blockbench.net/wiki/guides/blockbench-overview-tips/).

A geração de textura é outra operação: o código organiza regiões e calcula coordenadas; também contém caminhos para transportar a pintura existente ao reorganizar o mapa. Portanto, ampliar a visualização, editar coordenadas e reorganizar a textura precisam ter efeitos claramente distintos. Fonte: [gerador oficial de texturas](https://github.com/JannisX11/blockbench/blob/master/js/texturing/texture_generator.js).

## Diagnóstico do Molda atual

- `SceneWorkspaceAreas` abre “Mais ferramentas” com um `details` dentro da barra. O conteúdo aumenta a altura da linha flexível, e os botões vizinhos esticam. A captura atual mostra botões com aproximadamente 100 px de altura.
- `SceneWorkspacePanel` coloca o mapa em um painel com formulário e rolagem. No desktop ele disputa espaço com o 3D e o inspetor; abaixo de 1200 px passa para baixo do modelo.
- `SceneUvCanvas` enquadra o mapa automaticamente, mas não oferece zoom nem navegação. `ScenePaintCanvas` também não oferece esses controles.
- Abrir folha ou UV expande automaticamente “Camadas e ferramentas de pintura” no inspetor. Uma tarefa simples revela configurações de outra área.
- Seleção, instruções e ações ocupam várias linhas antes e depois do mapa. O recurso central recebe menos espaço que seus controles.

## Alternativas consideradas

| Arranjo | Benefício | Limitação |
| --- | --- | --- |
| **Folha à esquerda e 3D ao lado, com ampliar** | Permite entender imediatamente onde o desenho aparece no objeto | Exige divisão ajustável e adaptação em telas menores |
| Folha ocupando toda a área central | Máximo espaço para detalhes | Esconde o resultado no 3D enquanto a criança desenha |
| Manter folha e mapa separados e reduzir botões | Mudança menor | Mantém dois caminhos para a mesma textura e duplica navegação |

Recomendação: primeira alternativa no desktop, com a segunda disponível pelo botão Ampliar. Em telas estreitas, alternar Folha/Modelo no mesmo espaço, preservando seleção e zoom.

## Organização proposta

```text
Cabeçalho existente: projeto · Modelar / Pintar / Animar · salvar
─────────────────────────────────────────────────────────────────
Barra de Pintar: [Folha de pintura]                   [Opções ⋯]
─────────────────────────────────────────────────────────────────
Ferramentas │ Folha de pintura     │ Modelo 3D       │ Cores
            │ [Pintar|Ajustar mapa]│                 │
            │                     │                 │ Peças
            │ textura e contornos │ resultado       │ e grupos
            │ em área ampliável   │ em tempo real   │
            │                     │                 │
            │ [−][zoom][+][Ajustar]│                 │
```

A folha começa com cerca de 35–40% da área disponível entre ferramentas e inspetor. Um divisor permite mudar essa proporção. O mapa ocupa o espaço restante do painel, sem uma coluna de botões abaixo. O inspetor mantém cores e organização das peças; configurações técnicas não abrem junto com a folha.

**Ampliar** faz a folha ocupar a área de trabalho central. **Restaurar** recupera a divisão anterior. Isso muda apenas a apresentação, sem alterar tamanho da textura, UV ou pintura.

## Zoom e navegação

- Controles visíveis: **−**, indicação de zoom, **+** e **Ajustar**. “Ver seleção” fica disponível quando há uma seleção; Ampliar fica no cabeçalho do painel.
- Roda do mouse aproxima o ponto sob o cursor; gesto de pinça amplia em telas de toque. Mão visível e Espaço + arraste deslocam a visualização. Navegar não inicia um traço nem move pontos.
- Ao ampliar, usar desenho sem suavização e uma grade que acompanha os pixels reais. Em ampliações apropriadas, um pixel ocupa um número inteiro de pixels da tela; o modo Ajustar pode usar escala fracionária para mostrar a folha toda.
- Contornos e alças mantêm espessura e tamanho de interação na tela. Não ficam minúsculos ao afastar nem enormes ao aproximar.
- Trocar Pintar/Ajustar mapa conserva posição e zoom. Enquadrar toda a folha acontece por ação explícita, não a cada ajuste de um ponto.

## Dois modos, sem formulário no caminho

| Modo | O que aparece | O que o gesto faz |
| --- | --- | --- |
| **Pintar** | Textura, contornos discretos e cursor do pincel | Usa pincel, balde, borracha e conta-gotas já escolhidos na lateral |
| **Ajustar mapa** | Região selecionada, pontos e alças | Arrasta ponto, move região, redimensiona pelas alças; ações de girar 90° e espelhar ficam agrupadas |

Em Ajustar mapa, clicar no 3D escolhe a face correspondente; a seleção também aparece na folha. A pintura fica suspensa nesse modo. Acionar o pincel volta para Pintar. Assim, um mesmo arraste não pode pintar e alterar o mapa.

**Encaixar nos pixels** começa ligado. Redimensionar mantém proporção por padrão, com cadeado visual. Selecionar uma região conectada do mapa usa uma ação curta “Parte inteira”; seleção individual continua disponível. Não confundir essa região UV com o comando de faces coplanares do modelo.

Campos U/V, escala numérica, projeção e empacotamento ficam em **Ajustes avançados** locais, fechados. Os controles básicos usam ícone e nome curto; opções secundárias têm nome acessível e dica explicativa. Um arraste gera uma etapa de Desfazer; Esc cancela o gesto.

**Organizar mapa** fica nesse painel, em posição secundária. Em peças novas, o preparo automático usa a densidade de pixels existente. Em peças já pintadas, reorganizar deve transferir a pintura e permitir desfazer. Mover UV manualmente muda onde a textura aparece; uma instrução curta explica isso durante o ajuste.

Zoom não corrige distorções de um UV ruim. Quadradinhos semelhantes entre faces dependem do mapeamento; continuidade através de curvas e costuras exige tratamento próprio. A interface não deve prometer alinhamento perfeito apenas por ligar a grade.

## Barra superior e identidade visual

Aplicar um padrão compartilhado às barras de Pintar, Modelar e Animar: uma linha com altura de referência de **52 px**, controles alinhados ao centro, alvos de pelo menos **44 px** e sem esticar botões conforme o conteúdo de menus. Em telas menores, ações secundárias passam para o menu; os grupos não quebram em várias linhas.

“Mais ferramentas” vira **Opções**, em menu flutuante ancorado, dentro do tema do Molda e acima dos painéis. Abrir o menu não empurra o 3D. Ações contextuais ficam junto ao conteúdo que controlam, em vez de adicionar faixas altas acima do modelo.

Reutilizar fontes herdadas da plataforma, ícones existentes e tokens `mld-surface`, `mld-text`, `mld-muted`, `mld-border` e `mld-accent`, inclusive nos temas rosa e escuro. Evitar botões contornados em todas as ações: usar agrupamentos discretos, separadores e destaque apenas para a ferramenta ativa. Compactar o espaço vazio, preservando legibilidade e alvos de clique.

## Exemplo para uma criança

1. Escolhe o caminhão, uma cor e o pincel de 1 px.
2. Pinta no modelo ou abre **Folha de pintura** para desenhar um detalhe.
3. Clica numa face do caminhão e usa **Ver seleção** para aproximar sua região na folha.
4. Se precisar ajustar o encaixe, escolhe **Ajustar mapa** e arrasta os pontos.
5. Volta a **Pintar**, mantendo o mesmo enquadramento.

Nenhuma dessas etapas exige preencher coordenadas ou parâmetros de projeção.

## Critérios para avaliar a implementação futura

- Folha e mapa têm uma entrada direta e compartilham visualização; UV não aparece em Opções.
- Abrir menus não altera a altura da barra nem diminui a área do modelo.
- Zoom mantém o ponto sob o cursor; pintar e mover pontos continuam precisos após zoom e deslocamento.
- Pixels permanecem nítidos; grade, imagem e pontos coincidem, inclusive em texturas retangulares.
- Pintar na folha e no 3D usa a mesma cor, ferramenta, camada e histórico.
- Ampliar, fechar e trocar de modo não alteram o documento nem perdem o enquadramento da sessão.
- O modo básico não mostra campos UV numéricos nem expande configurações técnicas à direita.
- Preservar permissões: ver/pintar a folha e editar UV continuam respeitando suas capacidades separadas, mesmo compartilhando o painel.
- Conferir 1440×900, 1280×720 e 1024×600, temas existentes, teclado e toque, sem painéis cobrindo controles.

## Sequência sugerida

Primeiro corrigir o padrão das barras e menus. Depois unificar folha/mapa com zoom, deslocamento e seleção sincronizada. Por último, organizar as alças e ações contextuais e retirar controles duplicados. Essa sequência resolve a estrutura que provoca o excesso de altura antes de polir os botões.
