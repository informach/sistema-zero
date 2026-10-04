# Entrada do funil e orientação: retomada de 03/10/2026

Implementação local concluída a partir do plano aprovado na sessão interrompida. A entrada apresenta aprendizagem pela criação de jogos, da primeira experiência às próprias ideias. A explicação dos apoios cobre a estrutura das atividades, tutoriais, ferramentas, comunidade e equipe.

## Comportamento entregue

- A raiz usa o título “Seu filho aprende criando jogos, da primeira experiência às próprias ideias.” e explica o percurso: jogar, experimentar, programar e avançar para os próprios projetos.
- Os três acessos da raiz são, nesta ordem, **Ver como meu filho aprende**, **Encontrar um primeiro passo para meu filho** e **Conhecer a Comunidade e os planos**. Levam a `/como-funciona/`, ao quiz do Desafio e à oferta da Comunidade.
- `/como-funciona/#orientacao` apresenta seis apoios com capturas reais ampliáveis: entender e experimentar na aula, consultar Como fazer, organizar uma ideia no Pensa, investigar um ajuste com Zappy, trocar referências no Mural/Clube e conversar com a equipe.
- Pensa e Zappy mostram as condições junto de cada ferramenta: posto Inventor, requisitos da Jornada, disponibilidade do serviço e créditos de IA. O atendimento da equipe permanece descrito como mensagens com possível espera.
- O quiz da Comunidade aparece junto da apresentação da assinatura. FAQ, resumo comercial e abertura da oferta padrão seguem a mesma direção.
- A atribuição continua sanitizada; os identificadores `bio-como-funciona` e `bio-comunidade` mantêm seus destinos. `bio-desafio-quiz` identifica o novo destino do Desafio. HTML da raiz e de Como funciona continua com `Cache-Control: no-store`.

A retomada conferiu as alterações existentes, finalizou a revisão e a formatação, ajustou o teste de metadados para conferir a fonte da descrição sem depender de letra inicial minúscula, e sincronizou os documentos da entrada e das quatro ofertas que compartilham a explicação de ajuda. A sigla IA foi explicada na apresentação do apoio, e o alinhamento óptico dos ícones segue o padrão dos títulos do funil.

## Evidências visuais

- [Entrada no celular, 390 px](evidencias/entrada-revisada-390-2026-10-03.png).
- [Entrada no desktop, 1440 px](evidencias/entrada-revisada-1440-2026-10-03.png).
- [Orientação no celular, 390 px](evidencias/orientacao-revisada-390-2026-10-03.png).
- [Orientação no desktop, 1440 px](evidencias/orientacao-revisada-1440-2026-10-03.png).

Capturas do navegador Chromium local. A barra de desenvolvimento foi ocultada nas capturas; nos recortes da seção, o cabeçalho fixo e o controle flutuante de privacidade foram ocultados apenas durante a captura para não sobrepor o conteúdo. O funcionamento desses elementos na página permanece igual.

## Verificação desta retomada

| Verificação | Resultado |
| --- | --- |
| `bun test` no funnel | 459 passaram, zero falhas; um teste de integração PostgreSQL ignorado por falta da configuração específica |
| `bun run typecheck` | 278 arquivos, zero erros ou warnings; um hint preexistente de variável `quizUrl` não usada em `resultado.astro` |
| `bun run check` | Zero erros; quatro avisos preexistentes de especificidade em `comunidade-quiz.css` |
| `bun run build` | Build concluído |
| Linter Light Copy sobre a copy pública alterada | Zero ocorrências mecânicas, além da revisão editorial contra a oferta e o inventário |
| Larguras 360, 390, 768 e 1440 px | Sem rolagem horizontal; seis apoios e duas condições de IA presentes; imagens decodificadas |
| Estrutura das páginas | Um H1 no conteúdo, sem IDs duplicados, âncoras quebradas ou imagens sem atributo alt |
| Navegação | Ordem e destinos dos três botões conferidos; UTMs, evento e cupom conservados; parâmetro de e-mail descartado |
| Teclado | Botão principal, expansão de recursos e FAQ funcionam; zoom fecha com Escape e devolve o foco ao link |
| Ampliações | 19 arquivos distintos responderam HTTP 200; nova imagem de Como fazer abre no diálogo |
| JavaScript desativado | Navegação com atribuição, recursos e FAQ funcionam; imagem abre em outra aba |
| Console nas páginas verificadas | Zero erros de execução de página |
| Destinos locais | Como funciona, quizzes do Desafio e da Comunidade, oferta da Comunidade e páginas legais responderam HTTP 200 |

**Limitação do catálogo local:** `/kids/desafio-primeiro-jogo/oferta` respondeu HTTP 503, com `offer.contract_mismatch` / `offer_unavailable` para o slug local `desafio-primeiro-jogo`. A mesma limitação já constava do registro anterior. O quiz usado pelo novo botão responde HTTP 200. Esta retomada não alterou catálogo, variáveis de oferta ou contratos para corrigir esse ambiente.

Revisão editorial e verificação funcional concluídas. Não houve teste de conversão, nova execução completa dos quizzes, contratação ou publicação. Preços, checkout, perfis e roteamento das ofertas foram preservados, assim como o trabalho de métricas que já estava no workspace.
