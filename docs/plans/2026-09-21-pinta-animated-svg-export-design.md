# Exportação de animação vetorial em SVG — desenho técnico

## Objetivo

O Pinta deve baixar a animação selecionada de um personagem vetorial como um SVG autônomo. O arquivo deve preservar as poses, o tempo, o `loop` e a preferência por movimento reduzido. Quando houver uma correspondência segura entre formas de quadros diferentes, o exportador deve interpolar posição, rotação, tamanho e opacidade. Quando não houver, deve manter a troca discreta de quadros.

O resultado precisa passar pelo validador de ilustrações de módulos do Admin e funcionar quando a Comunidade Kids o carrega em um `<img>`.

## Decisões de produto

- A criança continua animando quadro a quadro. Esta entrega não cria uma timeline de keyframes.
- O diálogo de exportação oferece “Movimento mais suave”, ligado por padrão, e permite voltar ao resultado “Igual ao editor”.
- A prévia usa o SVG final por uma Blob URL em `<img>`, para mostrar o mesmo documento que será baixado.
- O exportador baixa somente a animação selecionada, como o GIF atual.
- A otimização é conservadora: qualquer dúvida mantém a troca discreta.
- A primeira versão suaviza apenas posição, rotação, tamanho e opacidade. Ela não interpola paths, texto, cor, gradiente, ordem-Z nem aparecimento de formas.
- Texto e figuras rasterizadas embutidas impedem o perfil compatível com módulos. A interface explica a restrição antes do download.
- O Admin aceita até 2 MiB. O Pinta calcula o tamanho do SVG e bloqueia o download compatível quando o arquivo ultrapassa esse teto.

## Identidade entre quadros

Cada forma vetorial pode guardar um `motionId`. O `id` continua identificando uma instância dentro do editor e permanece único por quadro. O `motionId` identifica a mesma forma ao longo dos quadros de uma animação.

- Uma forma nova recebe `id` e `motionId` novos.
- Duplicar um quadro troca o `id` e preserva o `motionId`.
- Duplicar uma forma dentro do mesmo quadro troca os dois identificadores.
- Duplicar uma animação preserva as trilhas dentro da cópia, mas troca todos os `motionId` para que as duas animações não compartilhem identidade.
- Importar ou inserir outro desenho cria novos `motionId`.
- O sanitizer aceita `motionId` válido e omite valores inválidos.
- O campo é opcional para manter backups e assets antigos válidos. Sem identidade estável, o exportador usa o fallback discreto.

## Classificação das formas

O exportador cria uma tabela por `motionId` e só considera uma trilha suave quando existe exatamente uma forma visível com aquele identificador em todos os quadros, no mesmo índice-Z e com o mesmo tipo e estilo.

Uma trilha é estática quando todos os atributos exportáveis são iguais. O SVG emite essa forma uma vez.

Uma trilha é interpolável quando apenas os atributos geométricos permitidos, `rotation` ou `opacity` mudam. A primeira versão cobre:

- `rect`: `x`, `y`, `w`, `h`, `rx`, `rotation` e `opacity`;
- `ellipse`: `cx`, `cy`, `rx`, `ry`, `rotation` e `opacity`;
- `line`: `x1`, `y1`, `x2`, `y2`, `rotation` e `opacity`;
- `image`: fora do perfil de módulos;
- `polygon`, `path` e `text`: somente estáticos; qualquer mudança usa fallback discreto.

As demais formas ficam em grupos de quadro. Esses grupos alternam `visibility` nos mesmos instantes usados pela prévia do Pinta. Uma animação pode, portanto, combinar fundo estático, movimento suave e efeitos quadro a quadro.

## Formato do SVG

O documento contém:

1. `viewBox`, largura e altura do quadro;
2. definições de gradiente com identificadores prefixados;
3. formas estáticas;
4. formas interpoláveis com `<animate>` e `<animateTransform>`;
5. grupos discretos controlados por animações SMIL de `visibility`;
6. uma regra `prefers-reduced-motion` que mostra somente a primeira pose.

Os tempos vêm de `frameDurationsMs`. Os `keyTimes` usam os limites cumulativos de cada quadro. No modo suave, valores geométricos interpolam entre poses; no modo fiel, todas as mudanças usam `calcMode="discrete"`. Uma animação sem repetição termina na última pose; uma animação com repetição usa `repeatCount="indefinite"`.

O gerador remove espaços dispensáveis, arredonda números como o exportador vetorial atual, funde durações de quadros integralmente iguais e prefixa as definições de gradiente por trilha para impedir colisões. O fallback sempre prioriza fidelidade sobre tamanho.

## Interface

O bloco vetorial do diálogo de download ganha:

- “Animação «nome» em SVG”;
- checkbox “Movimento mais suave”, marcado inicialmente;
- prévia do SVG final;
- resumo “N movimentos suavizados” ou “Esta animação permanece quadro a quadro”;
- tamanho final do arquivo;
- mensagens específicas para animação vazia, conteúdo incompatível e arquivo acima de 2 MiB.

Gerar a prévia não altera o asset nem a seleção. O componente revoga a Blob URL antiga ao trocar de animação, modo ou fechar o diálogo.

## Compatibilidade e segurança

O perfil de módulos aceita somente formas que o sanitizer do Admin permite. O exportador não inclui scripts, eventos, URLs externas, fontes embutidas nem data URLs. O teste integrado do Admin gera uma animação Pinta real e submete o resultado a `validateModuleIllustrationSvg`.

O SVG continua útil fora da trilha, mas o botão desta entrega promete compatibilidade com módulos. Por isso, texto e `image` geram um bloqueio explícito em vez de um arquivo que o Admin recusaria ou renderizaria com outra fonte.

## Testes

- Modelo: criação, duplicação de quadro, duplicação de forma, duplicação de animação, sanitizer e round-trip JSON preservam a identidade correta.
- Exportador: forma estática única, interpolação segura, fallback discreto, quadros iguais, easing, `loop`, movimento reduzido, minificação, conteúdo incompatível e limite de tamanho.
- UI: botão apenas para sprite vetorial, animação selecionada, checkbox, prévia por Blob URL, limpeza da URL, download e mensagens de bloqueio.
- Integração: o SVG gerado passa em `validateModuleIllustrationSvg`.
- Navegador: o arquivo anima dentro de `<img>`, respeita redução de movimento e termina na última pose quando `loop` é falso.

## Fora do escopo

- Editor visual de keyframes.
- Morphing de paths e polígonos.
- Interpolação automática de cores ou gradientes.
- Correspondência heurística de formas antigas.
- Exportação de várias animações no mesmo arquivo.
- Alteração do limite de 2 MiB do Admin.
