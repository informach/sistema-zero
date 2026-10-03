# Página inicial: implementação de 03/10/2026

**Atualização posterior aprovada:** a apresentação completa descrita abaixo foi movida para `/como-funciona/`. A raiz é uma entrada com avatar, posicionamento e três acessos: Como funciona, quiz do Desafio e planos da Comunidade. Como funciona ganhou a seção de orientação durante a criação. Veja [a retomada e a validação dessa revisão](posicionamento-entrada-2026-10-03.md). A medição foi implementada no painel, com prints e mapas de cliques. Veja [a implementação vigente e a ativação](../../../medicao-funil.md). O restante deste documento registra a primeira entrega.

Implementada localmente na rota `/`, após aprovação da [proposta de copy](copy-home-2026-10-03.md). A raiz continua sendo o endereço usado na bio. Publicação em produção não realizada nesta etapa.

## O que a página apresenta

1. Promessa principal e print da explicação com a experiência ao lado.
2. Cinco passos ilustrados: conhecer e jogar o projeto, experimentar um conceito, programar a regra, continuar a construção e avançar para novas criações.
3. Integração entre desenho no Pinta e uso no Estúdio; Mural, Clube e desafio mensal como continuidade.
4. Recursos expansíveis: criar e organizar, consultar e pedir ajuda, guardar e mostrar, acompanhar o percurso.
5. Rotina com aulas gravadas, possibilidade de rever e ajuda por mensagens; apresentação de Helena e Júlio.
6. Comunidade e planos como destino principal; quiz como orientação opcional; sete dúvidas frequentes; Desafio como alternativa complementar.

As liberações pela Jornada e o acesso durante a assinatura aparecem junto dos recursos. A ajuda humana é descrita como resposta por mensagens, em outro momento.

## Design e imagens

Reutilizados os tokens kids, Nunito, Baloo 2, barra navy, botões com degrau, cartões, cores dos capítulos e molduras de tela das páginas de oferta. Layout responsivo próprio da raiz, com estilos limitados a `.cdc-home`.

Foram utilizados assets existentes de aula, jogo pronto, reação desligada e ligada, programação, contador, Jornada, integração Pinta–Estúdio, Mural, Pensa, Recados, publicação, acompanhamento da família e pausa, além da foto dos fundadores e do Zappy. Nenhuma captura de produto foi inventada.

As imagens abrem ampliadas ao toque ou clique. Escape, botão de fechar e clique no fundo fecham o diálogo; o foco retorna ao link. Sem JavaScript, os links abrem a imagem em outra aba. A demonstração é por prints; não há player nem botão de vídeo sem gravação disponível.

Evidências da prévia:

- [Abertura no desktop](evidencias/home-desktop-2026-10-03.png).
- [Abertura no celular](evidencias/home-mobile-2026-10-03.png).
- [Convite para os planos e orientação pelo quiz](evidencias/home-planos-2026-10-03.png).

## Navegação e origem

- B01 rola até a explicação do percurso; B05 expande os recursos.
- B02, B04, B06 e o botão do cabeçalho abrem `/kids/comunidade-dos-criadores/oferta`.
- B07 abre `/kids/comunidade-dos-criadores/quiz`.
- B08 abre `/kids/desafio-primeiro-jogo/oferta`.
- Rodapé reutilizado, com os links legais existentes.

UTMs, código de evento e cupom aceitos pelo sanitizador existente seguem nos links comerciais. Uma visita direta não recebe origem presumida. A página continua SSR e envia `Cache-Control: no-store`, pois os links variam conforme a origem recebida. O título segue o padrão do site, “Comunidade dos Criadores | Sistema Zero”, e o compartilhamento usa a imagem existente da oferta.

Os identificadores `data-home-cta` tornam os controles identificáveis, mas **não são coleta de cliques**. O endpoint atual exige lead e aceita eventos comerciais específicos; não foi criado lead pela visita à raiz nem um sistema paralelo de analytics. Não há relatório de cliques anônimos desta implementação.

## Arquivos principais

- `packages/funnel/src/pages/index.astro`: composição da página.
- `packages/funnel/src/content/home-comunidade.ts`: passos, recursos e dúvidas.
- `packages/funnel/src/styles/comunidade-home.css`: composição visual responsiva.
- `packages/funnel/src/components/funnel/oferta/ComunidadeImageZoom.astro`: ampliação compartilhada com as ofertas; lógica extraída do body existente.
- `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/visuals.ts`: entrada para o print do jogo pronto.
- `packages/funnel/src/lib/lead-attribution.ts`: encaminhamento sanitizado da origem.
- `packages/funnel/tests/unit/lead-attribution-links.test.ts`: quatro testes da navegação com atribuição.

Sem alteração de banco, checkout, contratos de oferta ou área dos alunos. A mudança no body da oferta se limita a reutilizar a ampliação compartilhada.

## Validação

| Verificação | Resultado |
| --- | --- |
| `bun test` no pacote funnel | 420 testes passaram, 42 arquivos, zero falhas |
| `bun run typecheck` | 227 arquivos, zero erros, avisos ou sugestões |
| `bun run check` | Zero erros; quatro avisos preexistentes de especificidade em `comunidade-quiz.css` |
| Biome nos oito arquivos de implementação | Sem erros ou avisos |
| `bun run build` após o ajuste de contraste | Compilação concluída |
| `git diff --check` | Sem erros de whitespace |
| Larguras 375, 390, 768 e 1440 px | Sem rolagem horizontal |
| Imagens renderizadas e ampliações | 20 imagens decodificadas; 16 destinos de ampliação retornaram HTTP 200 |
| Estrutura | Um H1, nenhum ID duplicado, nenhuma âncora quebrada e nenhuma imagem sem atributo alt |
| Teclado | Recursos e FAQ abrem; zoom fecha com Escape e devolve foco; foco do quiz visível |
| Sem JavaScript | Links com atribuição, recursos, FAQ e imagem em nova aba funcionam |
| Oferta existente da Comunidade | HTTP 200 local; ampliação abre e fecha após a extração do componente |
| Destinos locais | Comunidade, quiz, termos e privacidade retornaram HTTP 200 |

A inspeção visual encontrou e corrigiu o título do cartão branco do quiz herdando texto branco da seção navy. O anel de foco do botão desse cartão também foi ajustado para manter contraste.

Após a revisão do usuário, os títulos e os ícones das perguntas frequentes receberam o mesmo espaçamento lateral das respostas: `1.5rem` em cada lado, no desktop e no celular.

**Diferença do ambiente local:** a oferta do Desafio retornou HTTP 503, com registro `offer_unavailable` no catálogo local. O mesmo endereço público foi reconferido e respondeu HTTP 200. O destino do botão foi mantido. Esta entrega não alterou catálogo ou disponibilidade do Desafio.

Para a prévia, o servidor foi iniciado com `bun --env-file=.env run dev` no pacote funnel, em `http://localhost:4321/`. Não foram realizados compra, submissão de formulário, nova execução completa do quiz ou deploy nesta etapa.
