# Experiências compactas e modo ampliado

**Goal:** manter cena e ação próximas e permitir concentrar a experiência na tela, sem perder o trabalho da criança.

**Architecture:** um único player e uma única árvore React. A ampliação altera a disposição CSS do console compartilhado por aluno e prévia do admin, sem criar outro controlador ou usar fullscreen nativo. Reutilizar a gestão acessível de modal e de rolagem do UI.

**Tech stack:** React, TypeScript, CSS responsivo por contêiner, Bun tests e QA no navegador.

## Direção aprovada

- Normal: HUD e cena, depois instrução próxima dos controles.
- Ampliado, com espaço: HUD e cena à esquerda; instrução e controles à direita. Cabeçalho com saída sempre acessível. Em bancadas longas, só o painel de ações rola.
- Tela pequena/zoom: adaptar sem encolher texto, esconder controles ou exigir arrasto. A ampliação é opcional.
- Expandir/recolher preserva estado, seleção, progresso e execução; Escape fecha e o foco volta ao gatilho.
- Fichas quebram texto dentro da própria área; a bandeja de disponíveis não ocupa uma terceira coluna igual às áreas de execução. Contador separado do rótulo.
- Não alterar regras de avaliação, palpite, narração, publicação ou simulação.

## Lotes

1. Criar moldura ampliável acessível e regiões visual/ação no console; integrar ao player nos momentos de palpite e experimentação.
2. Ajustar layout por largura disponível e fichas de Uma vez e sempre, mantendo seleção por clique/teclado e arrasto.
3. Cobrir ordenação, estado preservado e responsividade; conferir tipos, lint, testes e navegador em tamanhos representativos.
4. Fazer revisão integral do diff, atualizar documentação do contrato e registrar as verificações. Commit/merge e deploy em staging conforme autorização vigente, sem produção.

## Revisão e evidências locais

- 924 testes do member-shell passaram, incluindo ordem do palpite/experiência, simulações, elencos e legibilidade dos palcos.
- 11 testes Chromium passaram com o player e CSS reais: cinco experiências do piloto, conclusão uma vez/sempre, seleção e progresso preservados, Escape/Tab/foco, fichas em painel de 320px e janelas de 320×568 a 1920×600.
- Typecheck aprovado em member-shell, Kids, Community e Admin. Biome global aprovado (avisos preexistentes fora deste diff); `git diff --check` sem erros.
- A revisão visual encontrou e corrigiu a disputa entre título e botão no cabeçalho estreito. O teste de janela larga e baixa reproduziu o recorte do palco; a correção usa a proporção do viewBox e a altura disponível, sem escala arbitrária nem corte.
- A suíte de navegador foi incorporada ao CI do Kids. Não há mudança de manifesto, critérios de conclusão, narração, API ou banco.
- Em celular/zoom alto, o fluxo continua vertical com saída fixa no cabeçalho. Palcos com comparações e legendas mantêm rolagem quando necessária à leitura; a ampliação não promete ausência de rolagem em qualquer conteúdo e resolução.
