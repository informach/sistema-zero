# Revisão completa do Molda — 17/10/2026

Escopo: diff local da branch staging e arquivos novos desta sessão. Revisados os comandos de malha e seus previews, cortes Livre/Loop cut, seleção de componentes, extrusão por alças, criação de faces/linhas, inset de regiões, flip, medidas, agrupamento, desenho de contornos, preparação de pintura, transferência de camadas, UV automático/visual, permissões, descarte de gestos e interfaces compactas. As alterações anteriores da sessão foram preservadas.

## Achados corrigidos

### P1 — Organizar quadradinhos invalidava uma malha com espelhamento contínuo

O mapeamento tratava as faces geradas como faces independentes, enquanto o formato exige que os cantos espelhados tenham os mesmos UVs e materiais da fonte. O resultado podia ser desenhado, mas falhava em readSceneDocument ao reabrir.

Correção em simplePaintUv.ts: preparar somente a malha fonte, transferir a pintura e atualizar os cantos/material da contraparte pelo pareamento existente. A geometria, os IDs e a relação de espelhamento são preservados. A regressão falhou antes da correção e passou depois; cobre leitura do projeto, idempotência e edição posterior. O cenário escuro de navegador também organiza uma peça com espelhamento contínuo e valida o projeto baixado.

### P2 — Passos inteiros divergiam dos campos após flip com pivô personalizado

A origem do movimento usava comprimentos positivos e ignorava a referência assinada usada pelos campos. Foi reproduzido um passo que terminava em 0,9, em vez de 1.

Correção: measurementReference.ts centraliza a referência de base/centro e os sinais, usada por measurementTransform.ts e SceneViewport.ts. Preserva sinais TRS e a convenção de reflexão X para matrizes afins. Regressão de comando falhou antes e passou depois; testes de alças, movimento do corpo e flip também aprovados.

### P2 — Preparação UV demorava segundos numa malha grande

O teste de sobreposição percorria todos os triângulos anteriores para cada triângulo novo. O profiler apontou aproximadamente 79% do tempo nessa comparação. Foi introduzido um índice espacial para a fase de candidatos; a decisão continua usando o mesmo teste exato, sem arredondar UVs. Triângulos grandes e coordenadas fora da faixa segura usam a comparação completa, garantindo cobertura.

Na fixture de 9.216 faces, com três aquecimentos e dez medições sob o mesmo profiler, a mediana passou de 5.001 ms para 329 ms; p95 de 6.019 ms para 428 ms. SHA-256 do resultado completo permaneceu idêntico nas quatro fixtures de 1, 400, 4.096 e 9.216 faces. A ordem de faces/charts, desempates, aritmética de projeção e IDs não mudaram. O teste diferencial compara o índice com busca exaustiva em casos pequenos, grandes, negativos, extremos e de contato por borda.

### P2 — Botão de organizar ficava parcialmente encoberto no painel compacto

As utilitárias de overflow dos filhos mantinham rolagens internas dentro do painel de cores que já tinha sua própria rolagem. Em 1024×600, o centro do botão ficava encoberto pelo painel.

Correção em SceneInspectorSections.tsx: no painel compacto de pintura, só o contêiner externo controla a rolagem; as seções internas deixam de receber as utilitárias de rolagem. Os testes existentes que detectaram a sobreposição passaram nos quatro tamanhos, no nível básico e com ferramentas liberadas.

### P3 — Quatro campos novos não cumpriam o contrato de formulários

Faltava name no renomear da árvore, destino do grupo, grade da pintura de perto e encaixe nos pixels. Adicionados nomes estáveis. O contrato global de acessibilidade voltou a passar sem alterar suas regras.

### P2 — Escalas pequenas de importação podiam colapsar o mapa

A escolha do eixo de projeção comparava a magnitude do eixo transformado com um limite angular fixo. Uma malha grande com escala 1e-12, equivalente em tamanho físico a uma malha comum, acabava com os UVs colapsados. O eixo é normalizado antes da decisão angular. A regressão falhou antes da correção e compara o mapa inteiro com a geometria equivalente depois dela.

### P3 — Botão de organizar ignorava o bloqueio herdado do grupo

O comando já recusava alterações numa peça bloqueada por seu grupo, mas o botão só considerava o bloqueio próprio da peça. O botão agora usa a editabilidade derivada do contexto. A regressão monta um grupo bloqueado com uma peça cujo bloqueio próprio está desligado, verifica que organizar está desabilitado e que o projeto não muda, e confirma que a peça fora do grupo continua disponível. Os testes dos níveis de acesso também passam.

## Cobertura e referências

Atualizados os cenários que ainda esperavam os antigos campos UV abertos, o seletor livre/0,5 de movimento, o passo padrão de 0,1, o seletor de cor aberto ou um botão Faces sem contexto. Os testes agora percorrem a interface solicitada, mantendo as verificações de história, pixels, geometria e persistência.

As 15 referências visuais foram atualizadas para as mudanças solicitadas de seleção, árvore compacta, flip e pintura. Inspecionadas as composições de mover, pivô, corte, pintura e animação, com os mesmos tokens e proporções; a tolerância de comparação visual não foi ampliada. O Firefox ausente no ambiente foi instalado para executar a matriz completa, sem mudar a configuração dos projetos.

Também substituídos os spreads de grandes seleções no cálculo das dimensões por um percurso dos pontos, evitando depender do limite de argumentos do motor JavaScript.

## Limites preservados

Organizar quadradinhos transfere a pintura com amostragem por pixel; pequenos detalhes podem mudar, e Desfazer restaura os recursos originais. Não há remapeamento silencioso de pinturas existentes. Pinturas animadas e mapas especiais continuam recusados pelo remapeamento simples; faces não planas mantêm a preparação explícita. A grade contínua é garantida entre faces conectadas do mesmo plano, com separações nas quinas.

## Validação final

- Suíte completa: 3.348 testes aprovados, zero falhas (1.095 + 1.153 + 1.100 nos três comandos do pacote).
- Após a última correção numérica: 593 testes de cena aprovados, incluindo a regressão adicional de escala e a comparação dos mapas com os hashes originais.
- Após o ajuste de bloqueio herdado: 33 testes de pintura e acesso aprovados, incluindo a nova regressão de interface.
- Navegadores: 93 cenários aprovados em Chromium, Firefox e WebKit; 4 skips já previstos. Os dois cenários automatizados exclusivos do Chromium são o traço direto 3D e a medição de heap, ignorados nos outros dois navegadores. As ferramentas avançadas novas têm seus cenários completos no projeto Chromium, conforme a configuração existente.
- Typecheck, build do playground, Biome nos 144 arquivos alterados de código/testes e git diff --check aprovados. O UV do navegador foi confirmado novamente após o último ajuste.
- Referências visuais: 15 composições nos temas padrão, rosa e escuro; sem ampliar a tolerância de comparação.

Evidências locais em packages/molda/.cache/full-review-*.log e nos dois perfis de CPU, baseline e optimized. Não ficaram achados críticos conhecidos abertos dentro do escopo revisado. Nenhum commit ou push foi realizado nesta revisão.
