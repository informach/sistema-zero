# Operação, destinos e primeiro ciclo

04/10/2026. Fonte de produto: **versão local**, por orientação explícita do usuário. A publicação está em andamento; conferir os destinos após a conclusão, antes de aplicar os links no Instagram. Não é necessário esperar o deploy para produzir os materiais.

## Destinos canônicos

| Código | Função | URL alvo |
| --- | --- | --- |
| L0 | Bio e visão de entrada | `https://sistemazero.com.br/` |
| L1 | Como aprende | `https://sistemazero.com.br/como-funciona/#como-aprende` |
| L2 | Continuidade, criação e ferramentas | `https://sistemazero.com.br/como-funciona/#criar-mais` |
| L3 | Orientação durante o percurso | `https://sistemazero.com.br/como-funciona/#orientacao` |
| L4 | Rotina em família | `https://sistemazero.com.br/como-funciona/#na-rotina` |
| L5 | Planos da Comunidade | `https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta#planos` |
| L6 | Primeiro passo pelo Desafio | `https://sistemazero.com.br/kids/desafio-primeiro-jogo/quiz` |
| L7 | Orientação da Comunidade | `https://sistemazero.com.br/kids/comunidade-dos-criadores/quiz` |

Os IDs de L1 a L4 estão em `packages/funnel/src/pages/como-funciona.astro`; `#planos` pertence à oferta. **Não usar as antigas âncoras da página longa diretamente na raiz. Não existe `#recursos`.** O conteúdo dos recursos está dentro de `#criar-mais`.

Na raiz local, os três caminhos são: **Ver como meu filho aprende**, **Encontrar um primeiro passo para meu filho** e **Conhecer a Comunidade e os planos**. O segundo leva a L6. L7 continua uma opção dentro da apresentação da Comunidade; não confundir os dois quizzes nem descrever respostas como diagnóstico pedagógico.

## Links prontos

UTMs desta rodada: `utm_source=instagram`, `utm_medium=organic_social`, `utm_campaign=comunidade_202610`. O identificador da peça entra em `utm_content`. **Query antes do fragmento `#`.** Sem nome, e-mail ou dados da criança nos links.

| Uso | Link para copiar |
| --- | --- |
| Bio | `https://sistemazero.com.br/?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=bio` |
| S01 · Comece | `https://sistemazero.com.br/como-funciona/?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s01_comece#como-aprende` |
| S02 · Na prática | `https://sistemazero.com.br/como-funciona/?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s02_pratica#como-aprende` |
| S03 · Criações | `https://sistemazero.com.br/como-funciona/?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s03_criacoes#criar-mais` |
| S04 · Orientação | `https://sistemazero.com.br/como-funciona/?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s04_orientacao#orientacao` |
| S05 · Família | `https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s05_familia#planos` |
| S09 · Jornada | `https://sistemazero.com.br/como-funciona/?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s09_jornada#criar-mais` |
| S12 · Planos | `https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta?utm_source=instagram&utm_medium=organic_social&utm_campaign=comunidade_202610&utm_content=s12_planos#planos` |

Os demais stories têm enquete, caixa ou observação como ação principal. Não acrescentar link comercial em toda tela. Nos posts, “link na bio” remete ao link comum L0: ele não identifica sozinho qual post levou à visita.

## Aplicação em ordem

1. Conferir a página local que será publicada, a bio proposta e a correspondência dos três caminhos de entrada.
2. Após o deploy, abrir bio, Como funciona e planos num celular, conferir conteúdo e rolagem das âncoras. Verificar navegação de um quiz sem enviar cadastro nem realizar compra de teste em produção por este procedimento.
3. Conferir nome, bio e link no perfil. No fechamento público de 04/10, nome e bio já coincidiam com a recomendação; o agente não realizou a alteração. Conferir o URL completo com UTMs no campo da conta. Verificar que os comentários/caixas usados no calendário aceitam as interações desejadas; a auditoria histórica encontrou comentários limitados. Se a restrição persistir, usar enquete do story como alternativa a pedir comentário no Reel.
4. Produzir e revisar F01 a F03 e S01 a S03. Fixar os posts depois de publicados. Guardar URL/ID real, data e versão do material.
5. Montar os cinco destaques com S01 a S05. Conferir ordem e legibilidade.
6. Prosseguir com os lotes do calendário, registrando tempo de produção e perguntas reais recebidas.

Cada peça é um rascunho até haver arquivo final e revisão em celular. Datas são proposta editorial, não estado de agendamento.

## Conversas e respostas úteis

Não enviar prospecção automática. Estas respostas podem ser usadas pela equipe ao atender uma pergunta recebida:

**“Como meu filho recebe orientação?”**

> A orientação faz parte do percurso. As aulas organizam as etapas, os exemplos e os testes; a criança encontra instruções e caminhos de consulta enquanto cria. O Clube, as ferramentas liberadas e a equipe complementam esse apoio. Na página Como funciona mostramos o papel de cada parte.

**“As aulas são ao vivo?”**

> As aulas são gravadas e conectadas às atividades da plataforma. Seu filho pode acompanhar a explicação, experimentar, rever um trecho e continuar a construção. A família escolhe o horário. Para conversar com a equipe, envia a dúvida pela plataforma; a resposta pode chegar em outro momento.

**“Todas as ferramentas aparecem no começo?”**

> Os cursos orientam o uso dos recursos da atividade. A Jornada mostra as condições para liberar ferramentas de criação. Alguns recursos de inteligência artificial também dependem de disponibilidade e créditos. Você pode conferir esse percurso antes de contratar.

**“Preciso saber programar?”**

> O percurso orienta a criança na atividade. A participação do responsável pode começar por organizar o acesso, conhecer os passos e pedir que ela mostre o que construiu. O apoio necessário varia; a plataforma oferece caminhos para consultar orientações e pedir ajuda.

**“Qual é o preço?”**

> Os planos e as condições estão nesta página: https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta#planos

Na conversa real, complementar com o valor vigente, período de cobrança, renovação e acesso. A auditoria registra as referências locais; evitar manter valores em respostas automáticas sem atualização.

## Registro semanal no fluxo existente

Usar o app de marketing para conteúdo, checklist, assets e publicações. Registrar resultados no fluxo existente, sem criar um publicador ou CRM paralelo.

Campos mínimos por peça: ID editorial; URL/ID publicado; versão; formato; data/fuso; duração ou número de slides; alcance; salvamentos; compartilhamentos; retenção disponível; respostas pertinentes; toques no link; sessões com UTM; compras atribuídas quando disponíveis; tempo de produção; decisão.

Registrar **ausente** quando o dado não está acessível. Métricas de sete dias para cada post; fechamento em 06/11. A implementação local de [medição do funil](../../../medicao-funil.md) precisa receber dados reais após a publicação para sustentar análise. Nenhum ganho de alcance, conversão ou aprendizagem foi demonstrado por esta revisão.

## Checklist da peça final

- A abertura mostra uma decisão, uma ação ou uma situação concreta.
- A fala corresponde à captura e à disponibilidade dos recursos.
- O acompanhamento aparece como didática e ecossistema de orientação; o canal de contato da equipe é explicado no contexto apropriado.
- Zappy de diálogos da aula e assistente de inteligência artificial têm papéis distintos.
- Materiais preparados, demonstrações da equipe e casos de alunos estão identificados corretamente.
- Legendas de vídeo, contraste, capa, som e recorte foram vistos no celular.
- Há um próximo passo principal, com destino correto.
- Responsável, assets e checklist estão completos antes da aprovação.

Não houve mudança de perfil, publicação, agendamento, cadastro no app ou gasto de mídia nesta entrega.
