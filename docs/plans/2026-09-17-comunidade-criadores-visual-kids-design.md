# Comunidade dos Criadores: alinhamento visual com a plataforma Kids

Status: aprovado em 17/09/2026.

## Objetivo

Alinhar visualmente toda a jornada pública da Comunidade dos Criadores à identidade atual da
Comunidade Kids, sem alterar copy, ordem narrativa, preços, regras comerciais, imagens, links ou
comportamento do checkout.

A captura `Landing — Desafio do Primeiro Jogo.png` é o norte de composição. A implementação atual
da Comunidade Kids é a fonte de verdade para cores, superfícies, bordas, tipografia e relevo.

## Escopo

1. Página de oferta da Comunidade dos Criadores.
2. Pré-checkout compartilhado, com aplicação condicionada ao funil da Comunidade.
3. Checkout compartilhado, preservando os demais funis.
4. Página de obrigado compartilhada, preservando os demais funis.

## Princípio de implementação

Usar um sistema visual Kids adaptado ao funil, sem importar diretamente componentes da aplicação
`community-kids`. Os tokens serão espelhados no tema público para manter a identidade consistente
sem criar acoplamento entre aplicações.

Na oferta bespoke, os estilos permanecem escopados sob `.cdc`. Nas etapas compartilhadas, o tema
kids fornece a fundação e uma classe específica da Comunidade permite os ajustes que não devem
atingir o Desafio do Primeiro Jogo.

## Tokens visuais

- Chão: `#E9EEF6`
- Chão alternativo: `#DDE5F0`
- Cartão: `#FFFFFF`
- Superfície secundária: `#EFF3F9`
- Linha: `#D6DEEA`
- Tinta: `#0F1A33`
- Tinta suave: `#46536E`
- Campo: `#74829F`
- Ação: `#1B5CF3`
- Degrau da ação: `#1343B8`
- Menu: `#121A30`
- Menu secundário: `#1B2540`
- Azul claro: `#6E9BFF`
- Amarelo de recompensa: `#FFC02E`
- Verde: `#0B7A54`
- Roxo: `#6D3BF5`
- Vermelho: `#CF3F36`
- Laranja profundo: `#B55A00`

Baloo 2 continua como fonte de títulos e Nunito como fonte de corpo.

## Linguagem de componentes

- Botões principais azuis com degrau inferior sólido e movimento curto ao pressionar.
- Cartões brancos com borda de 2 px, raio próximo de 16 px e sombra inferior sólida.
- Um único chão por página, com alternância pontual do chão secundário.
- Navy como âncora visual para faixas estratégicas.
- Cores de apoio reservadas a ícones, selos, conquistas e categorias.
- Gradientes decorativos e sombras difusas antigas removidos ou reduzidos.
- Imagens do produto apresentadas em molduras claras e coerentes com os cartões internos.

## Página de oferta

- Topbar clara e compacta, com CTA azul.
- Hero sobre o chão da plataforma, mantendo texto, ilustração e ações atuais.
- Headline em navy, com destaque azul.
- Benefícios e provas convertidos para o sistema de cartões Kids.
- Seções coloridas antigas substituídas por chão, chão alternativo e âncoras navy.
- Blocos de cursos, ferramentas, comunidade e carreira com leitura de produto real.
- Planos com hierarquia mais forte e seleção coerente com os cartões interativos da plataforma.
- FAQ e fechamento no mesmo sistema visual.
- Barra móvel de compra em navy com CTA azul.

## Pré-checkout

- Cartão central branco sobre o chão da plataforma.
- Campos com bordas fortes e foco azul.
- Informações do responsável e resumo organizados em superfícies secundárias.
- CTA azul 3D.
- Nenhuma mudança na coleta, validação ou encaminhamento de dados.

## Checkout

- Formulário e resumo da compra em cartões sólidos.
- Alternador mensal e anual no padrão de cartões selecionáveis.
- Campos, estados de foco, avisos e formas de pagamento alinhados ao tema Kids.
- CTA azul 3D e segurança em superfície discreta.
- Nenhuma mudança em preço, cobrança, catálogo ou integrações.

## Obrigado

- Confirmação apresentada como conquista.
- Próximos passos em cartões brancos.
- Azul para ação e verde para confirmação.
- Conteúdo, condições e links preservados.

## Responsividade e acessibilidade

- Revisar desktop, tablet e celular.
- Manter controles com no mínimo 44 px de altura.
- Garantir foco visível e contraste compatível com a plataforma Kids.
- Respeitar `prefers-reduced-motion`.
- Manter `overflow-x: clip` no wrapper que contém a topbar sticky.
- Evitar corte de conteúdo, rolagem horizontal e cartões comprimidos no celular.

## Lotes e revisão

1. Fundação visual e tokens.
2. Página de oferta.
3. Pré-checkout, checkout e obrigado.
4. Responsividade, acessibilidade e acabamento.

Cada lote terá revisão técnica e visual. A revisão final inclui testes unitários, typecheck, Biome,
build de produção, inspeção em desktop e celular e conferência de que a copy não mudou.
