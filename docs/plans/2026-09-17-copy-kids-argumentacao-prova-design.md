# Copy kids: argumentação, prova e continuidade

Status: aprovada para implementação em 17/09/2026.

## Problema encontrado

A revisão anterior acertou a direção, mas reduziu a argumentação principal a uma ressalva curta sobre limites. As referências externas ficaram como rótulos genéricos. Assim, a página não conduz a conversa que o responsável precisa fazer antes de enxergar o Desafio ou a Comunidade como uma escolha educativa e concreta.

O áudio reforça uma fronteira importante: a copy não tenta convencer ninguém de que tela é boa. Ela parte da vida real de uma criança a partir de 9 anos, para quem tecnologia já aparece na escola, nas pesquisas, na comunicação, no lazer e no mundo em que vai viver. A família continua responsável por limites e equilíbrio. Dentro dessa realidade, a proposta mostra uma experiência em que a criança usa tecnologia para criar, testar e concluir algo dela.

## Decisão de copy

Cada oferta terá uma conversa em quatro movimentos, sem transformar a página em um artigo ou em uma advertência sobre telas:

1. Acolher a preocupação legítima de quem cuida de uma criança, sem fazer dela a headline da página.
2. Nomear a realidade: a tecnologia já participa da infância, da escola e da vida social. A educação precisa preparar a criança para participar desse mundo com repertório, não fingir que ele não existe.
3. Preservar o papel da família: sono, movimento, brincadeiras, convivência e regras continuam protegidos pelo adulto.
4. Tornar a criação concreta: em vez de só entrar em universos prontos, a criança aprende como uma ideia ganha regras, personagens, testes, ajustes e uma versão que pode mostrar.

O Desafio usa essa tese para apresentar uma primeira criação curta e guiada. A Comunidade usa a mesma tese para explicar continuidade, ferramentas e a progressão pela Carreira do Criador.

## Prova externa, com precisão

As fontes não entram como endosso ao Sistema Zero e nem como uma lista de logos. Cada uma traz uma consequência legível para a conversa:

- A American Academy of Pediatrics recomenda que mídia e infância não sejam reduzidas a um número de horas. A experiência depende de conteúdo, contexto, interação, desenho da tecnologia e do espaço que ela ocupa em relação a sono, brincadeira e movimento.
- A UNICEF define alfabetização digital como conhecimentos, habilidades e atitudes para que crianças participem com segurança e autonomia de uma vida cada vez mais digital, na escola, no trabalho e na vida.
- A Sociedade Brasileira de Pediatria reconhece benefícios e riscos. Ela pede conteúdo adequado, acompanhamento ativo de adultos e regras claras, sem substituir atividades importantes da infância.

A página só atribui às fontes o que elas efetivamente afirmam. Não promete efeito clínico, desempenho escolar ou mudança de comportamento.

## Auditoria de outras seções

Além da seção de tecnologia, a implementação revisa as seções que sustentam a promessa para evitar rupturas de tom:

| Área | Ajuste |
| --- | --- |
| Hero e faixa inicial | Confirmar que apresentam oportunidade de criação, sem abrir uma discussão defensiva sobre tela. |
| Contraste jogador e criador | Mostrar escolhas observáveis durante o projeto, sem diminuir jogos ou a diversão de jogar. |
| Benefícios e demonstração | Ligar cada benefício ao que a criança faz na plataforma, em linguagem de família. |
| Papel dos pais e suporte | Reforçar presença, organização e celebração, sem tratar o responsável como professor ou técnico. |
| CTAs, checkout e obrigado | Manter decisão e próximos passos claros, sem reiniciar a tese ou prometer resultados externos. |
| FAQ | Ajustar somente respostas que contrariem a tese ou deixem objeções importantes sem resposta. |

## Arquivos e proteção contra regressão

- `packages/funnel/src/components/funnel/oferta/DesafioOfertaBody.astro`
- `packages/funnel/src/components/funnel/oferta/ComunidadeOfertaBody.astro`
- `packages/funnel/tests/unit/desafio-offer-copy.test.ts`
- `packages/funnel/tests/unit/comunidade-offer-copy.test.ts`

Os testes vão guardar as três atribuições específicas, o tom de conversa e as frases que não podem voltar. A revisão manual procura travessões, jargão, falsas promessas, comparações artificiais e linguagem que trate a criança apenas como consumidora passiva.

## Verificação

Executar os testes unitários de copy, a verificação de vocabulário, `bun run typecheck`, `bun run check` e `bun run build` no pacote `@sistemazero/funnel`. Conferir o diff para garantir que não entram mudanças locais de outros trabalhos.
