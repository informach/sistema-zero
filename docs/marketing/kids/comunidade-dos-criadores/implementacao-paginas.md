# Implementação das quatro ofertas no funil

Data: 01/10/2026. Execução na sessão atual, conforme autorização do responsável.

**Objetivo:** implementar as quatro copies integrais mantendo a identidade da oferta local, os planos e o fluxo de contratação, com imagens provisórias onde faltam capturas.

**Arquitetura:** uma composição Astro compartilhada, conteúdo separado por perfil e respostas factuais comuns. A resolução comercial continua compartilhada com a oferta existente. As imagens têm um manifesto com legenda, natureza e arquivo para permitir substituição posterior.

**Tecnologias:** Astro 6, TypeScript, CSS com os tokens kids existentes e ilhas React já usadas no pré-checkout. Sem novo tema ou biblioteca visual.

**Referências:** [copies](copy/README.md), [roteiro visual](roteiro-visual-e-cobertura.md), [dúvidas e provas](duvidas-e-provas-visuais.md).

## Restrições

- Conservar as receitas de `src/styles/kids-oferta.css`, fontes Baloo 2 e Nunito, paleta, cartões, botões, molduras, faixas e espaçamentos característicos.
- Manter A como padrão; B, C e D são apresentações do mesmo produto.
- Preservar seleção mensal/anual, origem do Desafio, parâmetros de atribuição, garantias e condições da oferta.
- Usar todo o texto revisado; FAQs agrupados com prioridade própria e respostas consistentes.
- Identificar prévias ilustrativas, sem apresentá-las como capturas reais ou resultados de alunos.
- Nenhuma compra, mensagem para terceiros, publicação ou deploy faz parte desta tarefa.

## Etapas

- [x] Separar conteúdo das páginas e respostas comuns em módulos tipados do funil; manter rastreabilidade com os Markdown aprovados.
- [x] Implementar rotas dos perfis e composição compartilhada sem duplicar resolução de catálogo ou checkout.
- [x] Adaptar seções, cartões, faixas e FAQs às receitas existentes; conservar navegação, acessibilidade e barra móvel.
- [x] Montar prévias das telas que faltam e vinculá-las aos argumentos, com manifesto de substituição.
- [x] Atualizar os testes pertinentes de oferta, conteúdo, rotas, imagens e identidade.
- [x] Executar testes do pacote, typecheck, Biome e build; conferir quatro páginas no navegador, em desktop e celular, incluindo FAQ, imagens e seleção de planos.
- [x] Registrar endereços, imagens pendentes e resultados de verificação.

## Áreas do código

- `packages/funnel/src/funnels/comunidade-dos-criadores/`: conteúdo dos perfis, FAQ, metadados e manifesto visual.
- `packages/funnel/src/components/funnel/oferta/`: composição e pequenos componentes de conteúdo/prova visual.
- `packages/funnel/src/pages/[audience]/[produto]/`: entrada padrão e rotas secundárias da oferta.
- `packages/funnel/public/img/comunidade-dos-criadores/`: capturas existentes e novas prévias identificadas.
- `packages/funnel/tests/unit/comunidade-*.test.ts`: regressões relevantes para a nova composição.

## Situação inicial

Os documentos de marketing estavam sem rastreamento no Git ao iniciar. O app ainda usa a copy anterior. Existem imagens locais úteis, mas faltam demonstrações de Estúdio, Pinta em edição, integração, painel familiar, Recados e inteligência artificial. As prévias autorizadas permitem avaliar a composição agora; a captura real será feita na etapa posterior.

## Resultado implementado

As quatro páginas usam o mesmo body, os componentes de seção e imagem, os planos existentes e o pré-checkout compartilhado. O texto aprovado foi preservado: conferência do HTML contra os documentos encontrou todos os 201 blocos da A, 195 da B, 198 da C e 205 da D (títulos, parágrafos, itens e links; valores variáveis tratados pelo catálogo).

| Perfil | Endereço local |
| --- | --- |
| A, padrão | <http://localhost:4321/kids/comunidade-dos-criadores/oferta> |
| B, criação de jogos | <http://localhost:4321/kids/comunidade-dos-criadores/oferta/criacao-de-jogos> |
| C, expressão visual | <http://localhost:4321/kids/comunidade-dos-criadores/oferta/expressao-visual> |
| D, formação tecnológica | <http://localhost:4321/kids/comunidade-dos-criadores/oferta/formacao-tecnologica> |

A entrada `/oferta/tempo-de-tela` redireciona com 301 para a página padrão, preservando a query. Perfis desconhecidos e variantes em outro produto retornam 404. Cada página tem título, descrição e canonical próprios, além de entrada no sitemap. As rotas secundárias recebem o mesmo limite de requisições aplicado às páginas que consultam o catálogo.

A resolução comercial compartilhada fica em `src/server/offer-page.ts`; os erros HTTP retornam nas rotas Astro. Isso conserva o 404 de produto desconhecido e o 503 de contrato indisponível, que um componente de apresentação não pode devolver no lugar da rota.

## Respostas práticas com imagens

Todas as versões apresentam 40 respostas, agrupadas por assunto, com prioridades próprias. São 39 respostas com imagens ou sequências. Reembolso aponta diretamente para os termos e para o canal indicado ali: uma tela de criação não demonstraria essa condição comercial.

Cada imagem pode ser ampliada em outra aba. Os links `#duvida-<id>` abrem a pergunta correspondente. Programação e desenho têm perguntas, respostas e demonstrações separadas; inteligência artificial reúne a explicação de autoria com demonstrações distintas de Pensa e Zappy.

## Capturas e substituições

O [manifesto visual](../../../../packages/funnel/src/funnels/comunidade-dos-criadores/oferta/visuals.ts) é a referência de manutenção. Cada entrada informa arquivo, dimensões, legenda, texto alternativo, natureza e roteiro da captura que deve substituí-la. `FAQ_VISUALS` faz o vínculo com as perguntas; os módulos de cada perfil vinculam as seções.

> **Atualização de 01/10/2026 (tarde): só telas reais.** As 28 prévias SVG descritas na primeira versão deste relatório foram apagadas e substituídas por capturas do kids em staging (perfil de teste Lipe), feitas na mesma data. O que segue descreve o estado atual.

Cada entrada do manifesto tem de uma a três telas (`frames`: arquivo, versão `@2x`, dimensões, texto alternativo e o nome que a própria tela mostra), a legenda e, quando há mais de uma tela, se elas são passos em ordem (`steps`) ou telas da mesma área (`set`). As aulas são do curso **Cadê Todo Mundo?**.

| Área | Demonstrações com tela real |
| --- | --- |
| Aula e aprendizagem | `aula`, `aula-estudio`, `pausa`, `regra` (reação desligada × ligada), `contador`, `aprendizagem` |
| Criação | `estudio`, `preparados`, `pinta`, `pinta-vetor`, `animacao`, `integracao` (Pinta → Trazer do Pinta → Materiais do jogo), `codigo`, `molda` |
| Apoio | `recados` (Preciso de ajuda → Recados), `zappy`, `pensa`, `planejamento` |
| Percurso | `jornada`, `catalogo`, `certificado`, `missoes`, `ferias` |
| Participação | `mural`, `publicacao` (jogo aberto pelo link + cartão do jogo), `clube` (os combinados), `espaco`, `reunida` |
| Continuidade e conta | `salvamento`, `exportacao`, `senha` |

**Sem tela real (não aparecem na página; `PENDING_VISUALS`):** `responsavel`, `privacidade`, `creditos`, `conta`, `compras` e `indicacao` (a Área dos pais pede a senha da conta, e a liberação vale 15 minutos), `perfis` (a conta de teste tem um perfil só) e `conexao` (o editor não mostra um estado de "sem conexão" para fotografar). Para ligar uma delas: capturar com `scripts/captura-telas-kids.ts` e mover a chave para `COMUNIDADE_VISUALS`.

**Para a revisão humana antes de publicar:** o Mural mostra os nomes dos perfis de teste (Lipe, Leninha, André); o menu lateral de algumas telas mostra "∞ moedas", marca de conta da equipe; o cartão do jogo foi cortado no meio do código QR de propósito (inteiro, ele levaria o visitante ao ambiente de teste); o identificador de perfil sobre o vídeo foi ocultado na captura.

A direção de arte da mesma data (capítulos com cor e fundo próprios, abertura em destaque, frases-chave em negrito, tira de passos, faixa "Por dentro da Comunidade", planos e dúvidas redesenhados) está descrita no `CLAUDE.md` do funil, em "Direção de arte das quatro páginas".

## Verificação em 01/10/2026

- `bun test`: 359 testes aprovados.
- `bun run typecheck`: 192 arquivos, sem erros, avisos ou sugestões.
- `bun run check`: formatação e lint do pacote.
- `bun run build`: build de servidor e cliente concluído, com sitemap gerado.
- Navegador: quatro páginas com HTTP 200; títulos e canonicals próprios; 40 perguntas por página; sem âncoras quebradas ou IDs duplicados; 46 URLs distintas de imagens verificadas sem falhas.
- Desktop de 1440 × 1000 e celular de 390 × 844: sem rolagem horizontal; títulos, perguntas e botões dentro da largura disponível. Revisão visual do hero, seções, planos e respostas abertas.
- Interações: perguntas de programação, desenho, ajuda e IA; abertura por link direto; ampliação da imagem; abertura dos dois CTAs no modal e fechamento por Escape; origem do Desafio sem trocar a promessa do perfil.
- Regressão de rotas: oferta No Comando da IA responde 200; produto desconhecido e variantes inválidas, 404; Desafio responde 503 por catálogo indisponível, preservando seu bloqueio de contrato.

**Limites da validação comercial:** o ambiente local não tinha conexão funcional com o banco nem catálogo disponível. Para a inspeção visual no navegador, `/api/leads` e `/api/events` receberam respostas simuladas apenas na sessão de teste; nenhuma alteração foi feita nesses endpoints. A página exibiu os preços de contingência já existentes. O modal abriu, mas a seleção mensal/anual com slugs vivos, persistência de atribuição, pagamento e acesso pós-compra dependem da validação integrada em staging. Não houve compra, envio de mensagens ou deploy.

Para iniciar o dev server com as variáveis locais no runtime Node: `node --env-file=.env ./node_modules/astro/bin/astro.mjs dev --port 4321 --host`, a partir de `packages/funnel`. A ausência de banco pode gerar o overlay do Astro pelo registro automático de lead; isso é uma limitação local anterior à implementação.

## Correção da visualização local, após relato do responsável

A conferência visual anterior não cobria a navegação normal: as chamadas simuladas ocultavam a indisponibilidade do banco. Sem a simulação, `POST /api/leads` retornava 500 e o Astro abria um overlay sobre a oferta.

Diagnóstico confirmado: Docker Desktop desligado; container de desenvolvimento `pg-payments` desconectado da rede `bridge`; banco `sistemazero` com o schema `funil` atualizado somente até a migration 0014. Os outros containers Postgres existentes eram instalações de teste sem as tabelas do funil.

Correção aplicada somente ao ambiente local:

1. Iniciar Docker Desktop e o container existente `pg-payments`, preservando seu volume e os dados.
2. Reconectar o container à rede `bridge`, restabelecendo a porta já configurada `localhost:5433`.
3. Aplicar as migrations existentes 0015 e 0016 com `bun run db:migrate` no pacote do funil. Elas acrescentam `offer_snapshot`, `attribution`, `event_key` e seu índice; nenhum dado foi apagado.

Verificação posterior, sem interceptações nem respostas simuladas: as quatro ofertas retornaram HTTP 200, `/api/leads` respondeu 201/200 e `/api/events` respondeu 201; nenhum overlay e nenhum erro JavaScript observado. A pergunta de IA abriu normalmente. O histórico do banco passou a registrar as 17 migrations existentes.

Esta correção elimina a limitação de banco descrita na verificação inicial. Catálogo, pagamento e acesso pós-compra continuam fora desta verificação de visualização. Para voltar a trabalhar após desligar a máquina, manter Docker Desktop e `pg-payments` ativos, além do servidor do funil.
