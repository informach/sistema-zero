# Comunidade dos Criadores: análise profunda da oferta e proposta de argumentação (v2)

Data: 30/09/2026. Status: proposta para aprovação. Substitui, se aprovada, a argumentação de `2026-09-29-comunidade-criadores-argumentacao-proposta.md` implementada em 30/09.

Cadernos de pesquisa desta análise, no mesmo diretório:
- `2026-09-30-comunidade-criadores-pesquisa-avatares.md` (dados brasileiros 2024–2026, linguagem de pais, segmentos, quem decide, sazonalidade)
- `2026-09-30-comunidade-criadores-pesquisa-mercado.md` (concorrentes, preços, padrões de argumentação, reclamações públicas)
- `2026-09-30-comunidade-criadores-pesquisa-evidencia-e-copy.md` (autoridade curricular, evidência científica, objeção da IA, padrões de copy, frameworks)

Limitação de método, válida para os três cadernos: o proxy de saída do ambiente de pesquisa bloqueou os sites primários (sites de concorrentes, Reclame Aqui, Cetic.br, SBP, gov.br, periódicos). Os dados externos vieram de trechos indexados pelo buscador. Cada dado traz URL, data de acesso e uma marca de força; preços e citações de terceiros estão marcados para conferência antes de qualquer uso público. Nenhum número foi inferido.

## Sumário

1. Resumo executivo
2. O que foi analisado e como
3. Diagnóstico da copy atual, bloco a bloco
4. A cadeia de raciocínio de 29/09, avaliada
5. O funil ao redor da oferta
6. Avatares: quem compra, o que sente, o que teme
7. Mercado: contra o que a página compete
8. Argumentação: principal, secundárias e o que fica de fora
9. A nova página: estrutura e copy completa dos 15 blocos
10. Variantes: pós-Desafio e headline B
11. Correções e alinhamentos no restante do funil
12. Prova a produzir
13. Validação
14. Implementação: arquivos, testes e ordem

## 1. Resumo executivo

A página atual é honesta e bem escrita frase a frase, e não convence. Ela descreve o produto em vez de defender uma tese. Isso fere o método da própria casa (Light Copy, regras 9 e 12: "argumente a causa" e "venda o Decorado") e a regra do prompt de marketing ("o produto nunca aparece no começo"). O resultado é uma sequência de 19 blocos corretos que não constrói tensão, não nomeia a situação real da família, não explica por que as outras saídas falham, não ancora o preço em nada e guarda a prova mais forte (a história de Helena, Júlio e André) para o bloco 17.

A causa é histórica. Em dois meses a oferta teve quatro teses: "talento e hiperfoco" (julho a setembro), "parte do tempo de tela vira criação" (17/09, de manhã), "tecnologia faz parte da infância" (17/09, à noite) e "desenvolver as próprias ideias" (30/09). Cada revisão corrigiu um exagero real e cortou junto o argumento. O time já tinha visto o padrão em 17/09 ("reduziu a argumentação principal a uma ressalva curta"). A proposta de 29/09 diagnosticou bem o que não dizer e foi implementada pela metade: ordem dos blocos, CTAs, demonstração real, aviso de lançamento e retirada das estrelas ficaram de fora.

A proposta desta análise: manter tudo o que é verdadeiro e retomar a espinha argumentativa.

- Argumento principal: **"Ele já joga. Aqui ele aprende a criar os próprios jogos, e continua."** É a conversa que já acontece na cabeça da mãe, é a posição do fundador (tornar produtivo o tempo que já existe, sem defender tela) e é o que o produto entrega hoje: um jogo publicado com link na primeira semana e um caminho depois dele.
- Como o frame "consumidor vira criador" está saturado no mercado, ele entra como premissa. A diferença vem do mecanismo (um caminho na ordem certa, uma pessoa que olha o que a criança fez, um lugar para mostrar) e da prova (a família que fez isso em casa, as primeiras crianças, jogos publicados).
- Dez argumentos secundários, cada um ligado a uma objeção real e a uma evidência: continuidade, pessoa de verdade, jogo com link, segurança por desenho, cabe nos combinados de tela, papel do pai em três gestos, preço transparente sem fidelidade, origem familiar, IA, e "por que agora" (computação obrigatória nas escolas em 2026).
- A página cai de 19 para 15 blocos, sem repetir entregáveis, com a dor de volta (nomeada e explicada), a origem antecipada, uma tabela de comparação com o gratuito e com a escola de programação, e um bloco de valor com âncoras honestas.
- Duas variantes: uma headline B para teste e uma versão de entrada para quem vem do Desafio.

Fora da copy, a análise do funil encontrou nove problemas que valem correção independente da proposta, entre eles a ponte Desafio → Comunidade quebrada (os e-mails de conclusão e expiração apontam para uma URL que dá 404), termos de uso que descrevem outro produto, e um aviso de renovação prometido na página e implementado só para o anual via Pix.

## 2. O que foi analisado e como

Dentro do repositório: a página atual (`packages/funnel/src/components/funnel/oferta/ComunidadeOfertaBody.astro`), o módulo do funil (`src/funnels/comunidade-dos-criadores/`), a página do Desafio, a bio da raiz, o pré-checkout, o checkout e o obrigado, os testes que travam a copy (`tests/unit/comunidade-offer-copy.test.ts`, `comunidade-funnel.test.ts`, `copy-vocabulario.test.ts`, `copy-jornada.test.ts`), o método de copy da casa (`packages/marketing/src/domain/copy/light-copy-rules.ts`), o catálogo e as entregas (`packages/catalog/scripts/seed.ts`, `docs/jornada-do-criador.md`, `docs/gamificacao.md`), os e-mails do ciclo do Desafio (`packages/messaging/scripts/seed-templates.ts`), o roteiro do vídeo do certificado, os quatro documentos de direção editorial de 16 e 17/09 (com a transcrição do áudio do fundador), a proposta e o caderno de 29/09, o plano de 30/09, a versão de agosto da página (commit `6476ffad`) e a linha do tempo de commits reconstruída pela API do GitHub. O quiz do Desafio (7 perguntas, 4 perfis) foi lido como a única coleta de dados de pais que a casa já faz.

Fora do repositório: três pesquisas dirigidas (avatares, mercado, evidência e copy), documentadas nos cadernos. Não houve entrevista com famílias nem acesso a dados de produção; o que existe de produção vem do diagnóstico de 27/09 (`2026-09-27-promocao-producao-design.md`: 110 aulas concluídas, 41 entregas, 13 jogos no Mural, com a versão de agosto da página no ar).

## 3. Diagnóstico da copy atual, bloco a bloco

Critérios: (a) o bloco defende um ponto ou só descreve; (b) obedece às 12 regras do Light Copy; (c) serve à decisão do pai; (d) é verdadeiro frente ao catálogo de hoje.

| Bloco | O que há | Veredito |
|---|---|---|
| Topo fixo | "R$ 97/mês · Quero assinar" | Correto. |
| 01 Hero | H1 "Seu filho pode aprender a transformar as próprias ideias em jogos." Lead explica projetos guiados, escolhas, testes, "o professor orienta pelas atividades enviadas e pelos Recados". Três bullets. CTA "Quero ver meu filho criando". | O H1 é um benefício abstrato com modal ("pode aprender"). O lead viola a regra "o produto nunca aparece no começo" e usa jargão sem definir ("Recados"). Não há promessa concreta nem diferença. O CTA é bom. |
| Faixa de confiança | Moderação, navegador, "criado por uma família que começou com os filhos" | Correta. A terceira frase é o melhor ativo da marca e fica subaproveitada. |
| 02 "Dor" | "Por trás de um jogo funcionando, há decisões que seu filho pode aprender a tomar." Três parágrafos sobre decidir, testar e mostrar. Tese: "Ver o próprio jogo funcionando dá sentido às tentativas." Experimento da velocidade. | Não há dor. É a explicação do processo antes de o pai ter um motivo para se importar. O experimento da velocidade é bom e vai para o bloco de demonstração. |
| 03 Virada | "Ele pode gostar de jogos e ainda não saber como criar o primeiro." Projetos guiados, elementos preparados, papel do pai no primeiro acesso. | Elo verdadeiro e útil (o começo vem com ajuda), mas sem a causa que o antecede. Vira parte do bloco "o que ele vai fazer". |
| 04 Paliativo | "Depois da primeira criação, a criança precisa saber o que fazer em seguida." Três cartões sobre continuidade. | Pressupõe que o leitor já fez o Desafio. Para quem chega frio, é o segundo bloco seguido sem tensão. O argumento de continuidade é forte e pertence ao mecanismo. |
| 05 Prova social | Rafael, Débora e André, cinco estrelas cada, "já testaram a plataforma". | Relatos reais e concretos (regra 11 atendida). As estrelas contradizem a proposta de 29/09 e a regra "sem avaliação real, sem estrela". Falta contexto de lançamento ("as primeiras crianças"). |
| 06 CTA | "O primeiro jogo pode ser uma conquista. A Comunidade mostra o caminho depois dele." | "Pode ser" enfraquece. Mantém a função. |
| 07 Método e Jornada | Z.E.R.O., oito postos "como as faixas do judô", "toda a plataforma faz parte da assinatura". Balão do Dedé. | Conteúdo certo, função errada: é apresentado como catálogo, quando é a resposta ao medo número um ("vai largar"). |
| 08 O que desenvolve | Seis cartões de ações observáveis. Tese: pergunte o que ele mudou. | Honesto, genérico. Sem ligação com o que o pai vai ver em casa. Condensado em "o que você vai ver e ouvir". |
| 09 Por dentro | Sete capturas reais com legendas. | Bom e tangível. Mantido, fundido ao mecanismo. |
| 10 Para quem é | Lista "é pra você / ainda não é" | Bom. Mantido. Eyebrow "Honestidade antes da assinatura" soa autoelogio; trocado. |
| 11 Entregáveis | Seis cartões | Repete o bloco 9. Cortado; a lista final vira a única. |
| 12 "Três experiências" | Kit de Criação Livre (as mesmas 4 ferramentas), Desafio do Mês, Mundo do Criador | Bônus sem âncora e com o miolo do produto reembalado. Cortado; itens absorvidos pelo mecanismo. |
| Rotina | "Uma parte do tempo de tela que vocês já permitem pode virar um momento de criação." | Boa resposta à objeção, solta no meio da página. Vai para o bloco de objeções. |
| IA | "A IA pode explicar, sugerir, ajudar a investigar. Seu filho também precisa experimentar." Tese: "A Comunidade também usa IA como apoio." | A tese reabre a dúvida em vez de fechá-la. Reescrita com os três argumentos e a regra real do Zappy (nunca monta pelo aluno). |
| 13 Valor e planos | "A Comunidade completa, com opção mensal ou anual." Três comparadores internos. Cartões de plano com economia de R$ 367. | Sem âncora externa, sem custo por dia, sem custo de esperar, sem razão do preço. Os cartões de plano são bons. |
| 14 O que muda numa casa | Três perguntas para o pai fazer. Balão da Debinha. | Muito bom (future pacing honesto). Mantido, dentro de "o que você vai ver e ouvir" e no fechamento. |
| 15 Suporte | "Você pode acompanhar sem saber programar." Professor, Clube, área do responsável. | Bom. Vai para objeções (papel do pai). |
| 16 Garantia | 7 dias, cancelamento, aviso antes de renovar. | Correto, exceto a promessa de aviso antes de toda renovação (ver seção 5). |
| 17 Autoridade | Helena, Júlio, André, credenciais, hiperfoco dentro dos marcadores. | A prova mais forte da página, na posição 17 de 19. Sobe: versão curta no bloco 4, completa no bloco 13. |
| 18 FAQ | 13 perguntas | Cobertura boa. A primeira resposta começa por "Nenhuma plataforma pode garantir o interesse de toda criança": anti-venda antes do argumento. Reordenado e reescrito. |
| 19 Oferta final | "O primeiro jogo mostra que ele consegue. A Comunidade mostra o que ele pode criar depois." Lista de 9 itens. CTA. | Framing de pós-Desafio para quem pode nunca ter feito o Desafio. Quarta listagem de entregáveis. Fechamento reescrito com a cena do orgulho. |

Contagem de repetições na página atual: entregáveis em 4 blocos (9, 11, 12, 19), as quatro ferramentas em 3, "tudo incluído / sem compra extra" em 5 frases. Modais "pode/podem/possibilidade/oportunidade" em 50 ocorrências no texto público (contagem de "pode", "podem", "possibilidade" e "oportunidade" fora do CSS).

Checagem contra as 12 regras do Light Copy: 1 (travessão) ok; 2 (exclamação) ok; 3 (pergunta no gancho) ok; 4 ("não é X, é Y") ok; 5 (promessa vaga) falha no hero e no valor; 6 ("mesmo que"/"sem precisar") ok; 7 (português) ok; 8 (lero-lero) falha em "muitas escolhas em prática", "um lugar que cresce junto"; 9 (sem tese) falha na página inteira, nenhuma causa é enunciada; 10 (sigla sem explicação) falha em Recados, Pinta, Pensa, Molda, Faísca no hero e no bloco 7; 11 (depoimento) ok; 12 (só o Quadro) falha nos blocos 7, 9, 11, 12 e 13.

## 4. A cadeia de raciocínio de 29/09, avaliada

A proposta de 29/09 enunciou sete elos: (1) seu filho tem ideias, jogos são uma porta; (2) uma ideia precisa de decisões; (3) ao construir, a criança escolhe, testa e ajusta; (4) o começo exige apoio; (5) a Comunidade organiza o percurso; (6) os pais observam; (7) a assinatura vale pelo acesso continuado.

O que funciona: o elo 3 → 4 ("exaltar o processo sem explicar como a criança atravessa cria ansiedade") é uma observação certa e foi implementado no bloco 3. A tabela "o que a criança pratica e o que o pai observa" é o melhor material da proposta e a página quase não a usou.

O que falta:
1. **Uma premissa compartilhada antes da promessa.** A cadeia começa no elo 1 falando da criança. O pai chega com uma situação (horas de jogo, briga por limite, sensação de que "só consome"). Sem nomear essa situação, "desenvolver ideias" chega como um benefício genérico, igual ao de qualquer atividade educativa. A própria proposta admite a fragilidade: "precisa de exemplos para não virar uma promessa abstrata".
2. **Uma causa.** Nenhum elo explica por que jogar não deixa nada da criança, nem por que as alternativas comuns (limitar, empurrar outro hobby, deixar solto no Roblox Studio) falham. Sem causa, o mecanismo (Jornada, Recados, Mural) aparece como lista de recursos, e não como a resposta a um problema com nome.
3. **Um contraste.** Não há comparação com o gratuito nem com a escola de programação, só uma resposta curta no FAQ. Sem contraste, R$ 97 não tem referência e a proposta corretamente proibiu inventar preço avulso de cada recurso; o que ela não fez foi buscar as âncoras externas honestas que existem.
4. **Uma ordem de prova.** A proposta pediu origem antes dos planos, demonstração real e aviso de lançamento. A implementação manteve a ordem antiga.

A direção de 29/09 acertou ao excluir QI, culpa e promessa clínica, e ao delimitar autoria e IA. Esta proposta mantém essas exclusões integralmente.

## 5. O funil ao redor da oferta

Nove pontos, em ordem de impacto na venda:

1. **Ponte Desafio → Comunidade quebrada.** Os e-mails `challenge-completed` ("O primeiro jogo ficou pronto! E agora?") e `challenge-expired` apontam para `/kids/comunidade-do-criador/oferta`, no singular, que responde 404, e chamam o produto de "Comunidade do Criador". Arquivos: `packages/members/src/application/challenge-lifecycle/send-challenge-lifecycle.service.ts:161`, `send-renewal-reminders.service.ts:186`, `packages/messaging/scripts/seed-templates.ts:556` e `:579`. Os testes `renewal-reminder.test.ts:302` e `challenge-lifecycle.test.ts:157` fixam a URL errada. Além do link, o e-mail não argumenta: "Se quiser continuar criando... conheça a Comunidade" (proposta de texto na seção 11).
2. **Termos de uso de outro produto.** `/kids/termos` (`packages/funnel/src/content/legal-kids.ts`) descreve só o Desafio e afirma "O pagamento é único, não cria assinatura". O checkout e o rodapé da Comunidade apontam para ele.
3. **Aviso de renovação prometido e não entregue.** Página, FAQ e obrigado dizem "aviso por e-mail antes de toda renovação". O `renewal-reminder` só existe para o anual pago via Pix; a assinatura recorrente no cartão não recebe aviso. Ou se implementa o aviso para o cartão, ou a copy passa a dizer "renovação controlada pela área do responsável". A copy proposta usa a segunda formulação até a primeira existir.
4. **E-mail de cobrança recusada** leva a `${KIDS_COMMUNITY_URL}/compras`; a rota no app kids é `/perfis`.
5. **Promessa acima do catálogo.** Em produção há três cursos kids publicados. O posto Inventor, que libera Pensa e Zappy, exige nove cursos concluídos e publicados; Explorador de Mundos, que libera Molda, mais ainda. A página vende "quatro ferramentas incluídas" e "oito postos" sem dizer que a maior parte está por vir. A tela de produto bloqueado no app diz à criança "Assim que você entrar, fica tudo liberado", o contrário da liberação gradual. A copy proposta declara o lançamento e distingue "hoje" de "conforme entram".
6. **A oferta do Desafio vende o curso antigo.** A página fala em "nave em cinco etapas" e o botão da bio em "cinco dias"; o curso novo é "A Chave do Farol", em três dias. O depoimento do Rafael descreve a nave. Quem chega à Comunidade pelo Desafio encontra duas descrições diferentes do mesmo produto.
7. **Inconsistências pequenas que corroem confiança:** faixa etária 9–14 (Comunidade), a partir de 9 (Desafio), 8–15 (Cadê Todo Mundo?), 8–13 (`packages/community-kids/CLAUDE.md`); a fala da Débora diz "no terceiro dia" numa página e "no último dia" na outra; André é identificado como filho dos criadores só na Comunidade; cinco estrelas sem avaliações.
8. **Benefícios reais que a página não conta:** quem cancela mantém o Mural de visitante (os jogos dele continuam acessíveis); o resumo semanal aos pais às sextas existe no código (ativação em produção a confirmar); certificados por curso com QR de validação.
9. **Ninguém argumenta ao longo do funil.** A bio da raiz tem a frase mais afiada de todo o sistema ("Ele já joga. Falta descobrir que dá pra criar.") e ninguém a desenvolve; o vídeo do certificado descreve a Comunidade com honestidade e sem razão para o pai; a oferta do Desafio cita a Comunidade só no FAQ, sem link; a `/bolsa` cita e não linka. As teses do Desafio ("Seu filho já usa tecnologia todos os dias") e da Comunidade ("transformar as próprias ideias") são diferentes, embora um leve ao outro.

## 6. Avatares: quem compra, o que sente, o que teme

Fonte completa: `2026-09-30-comunidade-criadores-pesquisa-avatares.md`. Os números abaixo vêm de pesquisas públicas brasileiras de 2024 a 2026 (TIC Kids Online Brasil 2024 e 2025, SBP, Instituto Locomotiva, B2Mamy/Hibou), lidas por trechos indexados e marcadas para conferência no caderno.

### 6.1 Quem decide e quem usa

- **Quem paga é, na maioria dos lares, a mãe.** 83% das mães decidem sozinhas ou participam ativamente das compras da família, inclusive tecnologia ("O PIB das Mães", B2Mamy/Hibou, 2026); em 81% dos lares a criança influencia a compra. Leitura para o funil: a criança inicia ("quero criar jogo"), a mãe decide e paga, o pai (sobretudo se é de tecnologia) valida a qualidade. A página precisa falar com a mãe no hero e na dor, e ter um bloco que o pai técnico respeite (mecanismo, comparação, o que a criança realmente faz).
- **A criança de 9 a 14 vive dentro dos jogos e do YouTube.** TIC Kids 2025: jogos online em 42% aos 9–10 anos, 62% aos 11–12 e 75% aos 13–14; o YouTube é a plataforma mais usada diariamente na faixa de 9 a 12 (70% e 71%). Roblox (68%) e Minecraft (57%) são os jogos mais citados pela Geração Alfa; o Brasil é o segundo maior mercado do Roblox em usuários diários. 65% dos 9–17 já usaram IA generativa, 21% para criar conteúdo. Apenas 29% assistem a tutoriais de "como fazer o que gostam": a maioria consome.
- **A mãe vive uma distância entre o que acha que deveria fazer e o que faz.** 82% dos pais acham que devem controlar telas (Locomotiva); 24% restringem o tempo, 44% conversam sobre o que o filho faz online, 37% têm regras de celular (TIC Kids 2024/2025). Metade dos adultos aprende segurança digital com os próprios filhos. Entre as crianças, 24% tentaram usar menos e não conseguiram; 15% deixaram de comer ou dormir por causa da internet. Essa distância é culpa silenciosa, e a copy não pode explorá-la com acusação. Pode reconhecê-la e oferecer uma saída praticável.
- **O medo tem endereço: Roblox.** Polícia Civil do RJ investigando crimes dentro do jogo (jan/2026), ofício do MPF-SP, investigação do Núcleo sobre indução de crianças a atos sexuais por recompensas, "Revolta do Roblox" contra o ECA Digital (jan/2026). As perguntas que os pais fazem em fóruns: "O que fazer quando seu filho só quer saber de jogos online?", "Meus filhos estão obcecados com um jogo online chamado Roblox. O que devo fazer?" (Quora BR).
- **O marco legal mudou em 2026.** O ECA Digital (Lei 15.211/2025, em vigor desde 17/03/2026) exige conta de menor vinculada ao responsável, supervisão parental, verificação de idade, e proíbe loot box e rolagem infinita em produtos infantojuvenis. A Comunidade já nasce nesse desenho (o responsável compra e cria o perfil da criança). Isso vira argumento de confiança, sem prometer "conformidade" como selo.
- **A pediatria define o enquadramento.** SBP: 6 a 10 anos, 1 a 2 horas por dia com supervisão; 11 a 18, 2 a 3 horas; qualidade do conteúdo importa tanto quanto a quantidade. AAP 2026: qualidade, contexto e conversa em vez de limites rígidos. Isso permite dizer "cabe dentro dos combinados que vocês já têm" sem dizer que tela criativa não conta como tela.
- **Autoridade curricular.** Computação passa a ser obrigatória nas redes públicas e privadas a partir de 2026 (Resolução CNE/CEB 2/2025, sobre a base da Resolução 1/2022: pensamento computacional, mundo digital, cultura digital), e a pesquisa oficial TIC Educação 2024 reconhece "distância considerável" entre a norma e a sala de aula. Serve como "por que agora" discreto, nunca como "sua escola não ensina".

### 6.2 Os quatro segmentos, em ordem de prioridade para a página

| Segmento | Situação e gatilho | Dor principal | Desejo | Medo ao comprar | O que convence |
|---|---|---|---|---|---|
| (a) O filho já pede para criar | Mexe sozinho em Roblox Studio, Scratch ou Minecraft; trava; pergunta "como faz um jogo?"; viu um youtuber criador | "Não sei ajudar"; tutoriais soltos e em inglês; ambiente do Roblox | Ver o filho terminar e publicar algo; mostrar para a família | "Vai enjoar em duas semanas"; "tem de graça no YouTube" | Jogo publicado com link; caminho visível; uma pessoa que responde; sem fidelidade; história do André |
| (b) "Só quer saber de jogo" | Briga recorrente por limite; boletim; matéria de polícia sobre Roblox; férias | Medo de vício, culpa, sensação de perder o controle | "Que pelo menos ele aprenda algo"; trocar horas passivas por criação; regra com começo e fim | "É mais uma tela"; "vai virar desculpa para ficar mais no computador"; "vai desistir e eu fico pagando" | Enquadramento SBP; atividade com começo e fim; comunidade moderada; contraste com Roblox (sem chat aberto, sem compra dentro); garantia e cancelamento |
| (c) Criança que se aprofunda muito em um assunto (famílias atípicas) | Terapeuta ou escola sugere "usar o interesse"; recusa de atividades presenciais; aula ao vivo sobrecarrega | Isolamento; professor sem paciência ou que troca; rigidez nas transições | Ambiente previsível, no ritmo dela; adulto que entende; conquista que o primo joga | "Mais uma coisa que ele abandona"; comunidade tóxica; exigência de câmera; preço somado às terapias | A história do André contada com contexto; assíncrono, sem videochamada; postos curtos e previsíveis; moderação. Nunca "indicado para autistas" nem promessa terapêutica |
| (d) Pai ou mãe de tecnologia | O filho pergunta "como você faz jogo?"; tentou ensinar e desistiu por tempo | "Sei programar, não sei ensinar criança" | Trilha progressiva, feedback de outro adulto, portfólio | "Muito básico"; "eu faria de graça"; ceticismo com marketing de escola | Mecanismo aberto (postos, o que abre em cada um), critério de revisão, jogos publicados, credencial de Helena e Júlio |

A evidência sobre interesses intensos (revisão de 20 estudos em *Review of Educational Research*, 2016) diz que partir do interesse da criança aumenta engajamento e aprendizagem. A mesma literatura alerta que intensidade muito alta se associa a dificuldade de parar. Por isso a página fala com o segmento (c) pela história do André e pela estrutura (começo, fim, postos curtos), e nunca por diagnóstico. A guarda de vocabulário do repositório ("hiperfoco" só dentro da história) continua correta.

### 6.3 Dores, desejos e objeções, na linguagem dos pais

Dores (vocabulário observado): "só quer saber de jogo", "obcecado", "viciado", "briga", "limite", "vira a noite jogando", "não se concentra na aula mas joga horas", "preso em um único interesse", "o perigo do Roblox".

Desejos: "criar o próprio jogo", "transformar o tempo de tela em aprendizado", "dar um propósito", "que pelo menos aprenda", "mostrar pros primos", "continua amando Roblox, mas agora cria os próprios jogos" (depoimento em site de concorrente, a conferir).

Objeções ao pagar (as 32 reclamações públicas da categoria, no caderno de mercado): cobrança após cancelamento e multa de fidelidade; professor ausente, trocado ou despreparado ("1 hora de aula, 15 minutos ensinando"); promessa não cumprida (turma pequena que vira 10, curso que não existe); aula experimental que não acontece; "as crianças só fazem copia e cola"; pressão de venda; "tem de graça"; "conteúdo raso para 14 anos"; "vai desistir"; "mais uma tela"; "não sei ajudar"; "é seguro conversar com outras crianças?".

Gatilhos: "seu filho já te pediu pra baixar um joguinho", férias de julho e dezembro/janeiro (colônias tech já vendem nessas janelas), notícia de polícia sobre Roblox, vídeo do Felca, Dia das Crianças (a TIC Kids sai na mesma quinzena de outubro).

### 6.4 O que a casa já tem e não usou

O quiz do Desafio (`packages/funnel/src/funnels/desafio-primeiro-jogo/content.ts`) pergunta ao pai o que ele gostaria de ver (P6: "me chamar para mostrar algo que criou" / "pensar, testar e resolver problemas" / "começar e terminar um projeto próprio" / "entender como a tecnologia funciona") e o que o faria decidir (P7: "projeto curto com chegada clara" / "começo que não exija experiência" / "acompanhar sem saber programar" / "investimento pequeno antes de algo maior"). As respostas reais estão no `/admin` do funil (abas Perfis e Performance). É a única pesquisa de cliente que existe, e a distribuição dessas respostas deve calibrar a ordem dos argumentos secundários antes de publicar.

## 7. Mercado: contra o que a página compete

Fonte completa: `2026-09-30-comunidade-criadores-pesquisa-mercado.md`, com URL e data por dado. Os preços das escolas vêm de fontes terceiras (nenhuma publica preço) e precisam ser conferidos por telefone em duas ou três unidades antes de aparecer na página.

### 7.1 O que existe

| Alternativa | Formato | Preço (referência) | Contrato | O que entrega | O que falta |
|---|---|---|---|---|---|
| Escolas de programação (SuperGeeks, Ctrl+Play, Happy, CodeBuddy, CódigoKid) | 1 aula semanal de 1h a 1h30, presencial ou ao vivo, turmas de 6 a 8 | R$ 250 a 400 por mês + matrícula e material (fontes terceiras; histórico de R$ 240 a 350) | Semestral ou anual, "parcelas fixas e sucessivas", multa de 20% relatada | Professor presente, turma, projetos em aula | Preço escondido atrás de "aula experimental + proposta"; horário fixo; professor que troca; reclamações de cobrança pós-cancelamento |
| Kodland (escola online internacional) | Ao vivo, turmas prometidas de 3 a 4 e relatadas até 16 | ≈ R$ 51 por aula; 40 aulas ≈ R$ 2.040 (relato de pai) | Módulos de 4 aulas; taxa de cancelamento de 18% | Professor ao vivo | Turma maior que a prometida; 18% de multa; "15 minutos ensinando" |
| Planet Code (plataforma brasileira) | Vídeos gravados de Scratch, sem tutor | R$ 99 por mês ou R$ 588 por ano | Nenhum | Aulas no ritmo da criança | Ninguém olha o que a criança fez; sem comunidade; sem publicação |
| Infoprodutos (Programação For Kids, Udemy) | Gravado, avulso | R$ 39,90 a 89,90 por curso | Nenhum | Barato, começa hoje | Sem continuidade, sem pessoa, sem lugar para mostrar |
| Plataformas globais (Tynker, CodeMonkey, Kodable) | Gravado, gamificado | US$ 7 a 25 por mês; US$ 120 a 180 por ano | Nenhum | Currículo grande | Em inglês; sem professor; comunidade aberta ou inexistente |
| Gratuitos (Scratch, Code.org, Roblox Studio, YouTube) | Ferramenta ou tutorial | R$ 0 | Nenhum | A ferramenta em si; Scratch tem comunidade aberta | Sem caminho na ordem certa; sem pessoa; Roblox Studio em inglês e para 13+; comunidade aberta |

Posição de preço: R$ 97 por mês fica abaixo da metade de uma escola, ao lado do Planet Code (que não tem professor nem comunidade) e acima do infoproduto avulso. R$ 797 por ano equivale a R$ 66,42 por mês, entre o anual e o mensal do Planet Code. Ninguém no mercado usa custo por dia nem compara com outras atividades da criança (inglês R$ 250 a 700, futebol de clube R$ 170 a 300, natação R$ 80 a 300, Kumon R$ 200 a 400 por disciplina).

### 7.2 O que todo mundo diz e o que ninguém diz

Saturado (aparece em todas as escolas): "de consumidor a criador" (SuperGeeks: "aprendem a criar com tecnologia, e não só consumir"; Happy: "consumidor e criador de tecnologia"; Programação For Kids: "Seu filho usa tecnologia ou cria com ela?"); "profissão do futuro" e "bons empregos"; "raciocínio lógico, criatividade e autonomia"; "inglês de brinde"; "1ª e maior escola" com números de alunos e unidades; aula experimental gratuita (que gera as reclamações de pressão de venda e de aula que não acontece). Quase não há depoimento de criança mostrando o que criou.

Aberto (ninguém ocupa): preço na página, sem proposta por WhatsApp; sem contrato de fidelidade e sem multa; professor real sem horário fixo; jogo publicado com link para a família; comunidade moderada em português para a faixa etária; ritmo próprio; autoria identificável ("feito por uma família de desenvolvedores" contra "50 mil alunos" anônimos); "tempo de tela com propósito" (só em blogs, nunca em headline); âncora por dia e comparação com outras atividades.

Cada reclamação recorrente da categoria vira uma garantia concreta na copy: cobrança pós-cancelamento → "cancele pela sua área, em um clique, e o acesso vale até o fim do período pago"; professor que troca → "quem responde é [nome], e continua sendo"; "copia e cola" → "cada curso termina com a versão dela, publicada"; aula experimental que não acontece → "o preço está aqui, e a garantia é de 7 dias com o produto inteiro"; turma que cresce → "não existe turma: é o ritmo dela".

## 8. Argumentação: principal, secundárias e o que fica de fora

### 8.1 Restrições que a argumentação respeita

Do áudio do fundador (16/09, transcrito em `2026-09-16-desafio-primeiro-jogo-30-dias-design.md`): "se eu tentar convencer os pais de que o uso de tela é bom, eu vou perder"; "antes disso, você tem que concordar que o uso de telas não é legal"; "já que a gente não tem como fugir desse vilão, vamos tirar proveito e tornar produtivo o tempo a que ela já tem acesso". Do Light Copy: sem travessão, sem exclamação, sem pergunta na primeira frase, sem "não é X, é Y", promessa com dado, tese com causa, vender o Decorado, depoimento só com resultado. Das guardas: "hiperfoco" só dentro da história do André, "Jornada" é nome próprio, "carreira" nunca, título principal sem "tela", "hiperfoco" ou "inteligência artificial". Da direção de 29/09, mantida: sem QI, sem culpa, sem terapia, sem notas, sem profissão garantida, sem escassez inventada, autoria representada com precisão (projetos guiados, elementos preparados).

### 8.2 O argumento principal

**Ele já joga. Aqui ele aprende a criar os próprios jogos, e continua.**

Por que este, e não os dois anteriores:

1. **É a conversa que já acontece na cabeça de quem compra.** Os pais dizem "só quer saber de jogo" e "quero que ele crie o próprio jogo"; o melhor depoimento do mercado inteiro é "meu filho continua amando Roblox, mas agora cria os próprios jogos". Eugene Schwartz: quando o público é consciente do problema e não da solução, a headline fala do problema e do desejo, e o mecanismo entra depois. "Desenvolver as próprias ideias" (30/09) fala da solução em abstrato; "tecnologia faz parte da infância" (17/09) fala de uma constatação.
2. **É a posição do fundador, sem defender tela e sem discutir horas.** "Tornar produtivo o tempo que já existe" é exatamente "ele já joga; aqui ele cria". A palavra "tela" não entra na headline; a quantidade não é a tese; o reconhecimento da preocupação entra no bloco de dor, como o áudio pede.
3. **É observável em casa.** A mãe distingue o filho jogando do filho montando, testando e publicando. O pai técnico reconhece atividade real (decidir, testar, corrigir, terminar). A tabela "o que ele pratica e o que você vê" de 29/09 encontra aqui seu lugar.
4. **Contém o Decorado.** A consequência emocional é o dia em que ele chama a família para jogar um jogo com o nome dele. Débora: "no terceiro dia chamei a minha mãe pra ver o meu jogo"; Rafael: "peguei o link e mandei pro meu amigo jogar"; André: "eu já jogava um monte, agora eu faço os meus jogos".
5. **É verdadeiro e entregue hoje.** O Desafio publica um jogo com link em dias; 13 jogos estavam no Mural em 27/09; o fluxo dos Recados existe de ponta a ponta (auditoria de 11/09).

O frame "consumidor vira criador" está saturado, e por isso não é a diferença. Ele é a premissa. A diferença, e o que sustenta o "e continua", é o mecanismo: um caminho na ordem certa (Jornada), uma pessoa que olha o que a criança fez (Recados), um lugar para mostrar (Mural) e uma turma segura (Clube). E a prova: a família que fez isso em casa com o próprio filho, as primeiras crianças, jogos publicados com link.

### 8.3 A cadeia de raciocínio da página

Cada elo é uma seção. Cada seção tem premissa, causa, evidência e conclusão, e termina apontando para a seguinte.

1. **Realidade compartilhada.** Seu filho cresce dentro dos jogos. Você mantém os limites e sabe que tirar a tecnologia não é realista. (Acolhe a preocupação; não a julga.)
2. **A dor, com a causa.** As horas de jogo terminam e não deixam nada que seja dele. Causa: o jogo foi feito para ser jogado até o fim, com fases prontas e recompensas; ele domina um mundo que outra pessoa construiu. Limitar as horas muda a quantidade; o que acontece dentro das horas é outra decisão.
3. **A alavanca.** O interesse que preocupa é a melhor porta de entrada, porque a criança quer estar ali. Criar um jogo exige decidir, testar, corrigir e terminar: o pensamento que a mãe queria ver aparece porque a criança quer chegar ao final. Evidência: motivação intrínseca (autonomia, competência, vínculo; Deci e Ryan) e o caso real do André.
4. **Por que as saídas comuns não pegam.** Limitar muda a quantidade. Empurrar outro hobby não parte do interesse: as pesquisas de abandono em esporte e música apontam sempre os mesmos motivos (deixou de ser divertido, não se sente capaz, não vê progresso, pressão), com pico entre 12 e 14 anos. Deixar solto no Roblox Studio, no Scratch ou no YouTube dá a ferramenta sem caminho, sem pessoa e sem lugar para mostrar; cursos gravados sem acompanhamento concluem pouquíssimo (cerca de 3% nos MOOCs). Conclusão: falta caminho, pessoa e lugar.
5. **A promessa concreta.** Primeira semana: um jogo publicado com link. Depois: um projeto por vez, uma pessoa olhando o que ele envia, a Jornada mostrando o próximo passo. Você passa a ver o que ele pensa e decide.
6. **O mecanismo como resposta ao medo de largar.** Jornada de oito postos "como as faixas do judô"; Método Z.E.R.O.; Recados com nome de quem responde; Mural com link e contador de jogadas; Clube moderado; Desafio do Mês. Declarado como lançamento: o que existe hoje e o que abre conforme entra.
7. **A prova.** Helena e Júlio (desenvolvedores há mais de dez anos), a história do André, as três primeiras crianças com contexto, capturas reais, jogos publicados com link e idade, números de produção autorizados, uma aula real em vídeo.
8. **Por que aqui e não o gratuito ou a escola.** Tabela honesta com caminho, pessoa, publicação, comunidade, horário, contrato e preço.
9. **Objeções na ordem do medo.** Vai largar; é mais tela; não sei ajudar; é seguro; a IA faz por ele; o Scratch é grátis; sem aula ao vivo aprende.
10. **Valor e decisão.** Âncoras honestas, razão do preço, condições claras, a cena do orgulho e o menor próximo passo.

### 8.4 Argumentos secundários

| # | Argumento | Papel na página | Objeção que responde | Evidência que o sustenta |
|---|---|---|---|---|
| S1 | Continuidade: depois do primeiro jogo tem o próximo | Bloco 7; principal para quem vem do Desafio | "Vai largar como largou o judô" | Jornada desenhada contra cada causa de abandono (resultado visível curto, escolha da criança, feedback, turma); Desafio do Mês; novos cursos incluídos |
| S2 | Uma pessoa de verdade olha o que ele faz | Blocos 1, 7, 11 | "Vai ficar sozinho na tela"; "professor que troca" | Fluxo dos Recados verificado; feedback específico sobre a tarefa é dos fatores com melhor evidência em educação (d = 0,48 em 435 estudos); MOOCs sem acompanhamento ≈ 3% de conclusão |
| S3 | Um jogo de verdade, com link, para a família | Blocos 1, 6, 8, 15 | "Ele vai ter algo para mostrar?" | Mural com link, QR e contador; 13 jogos publicados; relatos das crianças |
| S4 | Seguro por desenho | Blocos 2, 11 | "É seguro? Com quem ele fala?" | Conta vinculada ao responsável, Clube pré-moderado, perfil público desligado, sem chat aberto, sem compra dentro, sem loot box; ECA Digital em vigor |
| S5 | Cabe nos combinados que vocês já têm | Bloco 11 | "Isso vai aumentar a tela?" | SBP e AAP distinguem o que a criança faz na tela; atividade com começo e fim; a família segue com os limites |
| S6 | Seu papel cabe em três gestos | Bloco 11 | "Eu não entendo de tecnologia" | Primeiro acesso, combinar horário, pedir para mostrar; três perguntas prontas; a participação do adulto melhora o resultado (co-uso) |
| S7 | Preço transparente, sem fidelidade, sem multa | Bloco 12 | "E se eu pagar e ele parar?"; "quanto custa de verdade?" | R$ 97 = R$ 3,23 por dia; menos da metade de uma escola; até 2 perfis; anual R$ 66,42 por mês; 7 dias de garantia; cancelamento pela área do responsável; Mural de visitante mantido |
| S8 | Feito por uma família que viveu isso | Blocos 2, 4, 13 | "Quem são vocês?" | Credenciais, a história do André, a voz do Zappy é dele |
| S9 | Entender continua valendo na era da IA | Bloco 11 | "A IA já escreve código" | Quem entende pede a coisa certa e percebe o erro; a IA da plataforma nunca monta pelo aluno (`zappy-ai.ts`); PNAS 2025: IA sem salvaguardas melhora a tarefa de hoje e piora a prova de amanhã, com orientação de professor não há dano |
| S10 | Por que agora | FAQ ou bloco 9 | "Isso é urgente?" | Computação obrigatória nas redes a partir de 2026; "distância considerável" entre norma e escola (TIC Educação 2024). Formulação: "a escola vai cobrar; a maioria ainda está em transição" |

### 8.5 O que fica de fora, e por quê

Queda de QI (a evidência não sustenta a causalidade); "profissão do futuro" (resultado distante e saturado); notas e comportamento na escola (sem prova); "terapia" e "indicado para autistas ou TDAH" (promessa clínica e uso de diagnóstico como segmento); "talento escondido" e "vício" (rótulos que o áudio e a revisão de agosto já retiraram); estrelas sem avaliação; contagem regressiva ou vagas limitadas sem lastro real. Se um dia a capacidade de revisão humana impuser um limite de famílias, esse limite pode ser dito, com o número.

## 9. A nova página: estrutura e copy completa dos 15 blocos

Convenções: a copy abaixo é a versão para tráfego morno e frio (bio do Instagram, presente do embaixador, anúncio). A variante para quem vem do Desafio está na seção 10. Textos entre colchetes são decisões ou dados a confirmar antes de publicar; nada entre colchetes vai para a página. Os balões dos personagens (Zappy, Dedé, Debinha) falam com a criança e ficam onde estão hoje. Nomes de recursos (Recados, Mural, Clube, Estúdio, Pinta, Pensa, Molda) só aparecem depois de definidos, e a definição vem junto da primeira menção.

Ordem e função de cada bloco:

| # | Bloco | Função na cadeia |
|---|---|---|
| 1 | Hero | Promessa, mecanismo em uma linha, prova mínima, CTA |
| 2 | Faixa de confiança | Três fatos verificáveis para quem chega desconfiado |
| 3 | A dor com a causa | Nomear a situação e explicar por que ela acontece |
| 4 | A alavanca | O interesse como porta de entrada; o caso do André em quatro linhas |
| 5 | Por que as saídas comuns não pegam | Descartar as alternativas pelo ponto exato em que falham |
| 6 | O que ele vai fazer | Promessa concreta no tempo; demonstração; o que o pai vai ver e ouvir |
| 7 | Como a Comunidade sustenta a continuidade | O mecanismo como resposta ao medo de largar; capturas reais |
| 8 | As primeiras crianças | Prova de produto, com contexto de lançamento |
| 9 | Por que aqui | Comparação honesta com o gratuito e com a escola |
| 10 | Para quem é | Qualificar e desqualificar |
| 11 | O que você pode estar pensando | Objeções na ordem do medo |
| 12 | Planos e valor | Âncoras honestas, razão do preço, condições |
| 13 | Quem faz | História completa de Helena, Júlio e André |
| 14 | Perguntas | FAQ reordenado |
| 15 | O que fica | Cena, menor próximo passo, CTA, termos |

### Bloco 1 · Hero (`#hero`)

Eyebrow: "Para crianças de 9 a 14 anos que gostam de jogos e tecnologia"

H1: **Seu filho já joga. Aqui ele aprende a criar os próprios jogos.**

Lead: "Na Comunidade dos Criadores, crianças de 9 a 14 anos transformam as próprias ideias em jogos de verdade. As aulas guiam uma etapa por vez, uma pessoa de verdade acompanha o que elas enviam, e cada jogo publicado ganha um link para a família jogar. Terminou o primeiro, a Jornada do Criador mostra o próximo."

Três bullets:
- "Na primeira semana, um jogo publicado com link, feito por ele"
- "Cada atividade enviada é lida por uma pessoa, que responde dentro da plataforma"
- "R$ 97 por mês para até duas crianças, sem fidelidade, com 7 dias de garantia"

CTA: "Quero ver meu filho criando" (rola até `#planos`)

Selos: "Acesso após a aprovação · Garantia de 7 dias · Cancele quando quiser"

Balão do Zappy (para a criança, mantido): "Oi, sou o Zappy. Aqui você começa com um jogo e libera novos projetos e ferramentas conforme avança. Quando publicar, pode mandar o link para a família inteira jogar. Chama seu pai, sua mãe ou seu responsável para ver isto com você."

Nota: a imagem do hero deve ser uma criança real ou uma captura real do jogo publicado, e não só a ilustração. Se houver o vídeo da seção 12, ele entra aqui como ação secundária: "Ver uma aula por dentro".

### Bloco 2 · Faixa de confiança (`.stats-band`)

- "Feito por dois desenvolvedores que começaram com o próprio filho"
- "Conta da criança vinculada ao responsável, Clube moderado, sem chat aberto"
- "Abre no navegador, sem instalar nada, sem contrato de fidelidade"

### Bloco 3 · A dor com a causa (`#dor`)

Eyebrow: "O que você vê da porta do quarto"

H2: **Ele passa horas dentro do jogo. Quando desliga, não sobra nada que seja dele.**

Texto:

"Você já parou na porta do quarto e ficou olhando seu filho jogar. O corpo inclinado para a frente, os olhos fixos na tela, uma concentração que você gostaria de ver na hora da lição. Ali dentro ele domina um mundo inteiro."

"O que pesa vem depois. O jogo acaba, o computador desliga e o dia termina como começou. Ele conhece cada canto de um mundo que outra pessoa construiu, e nada daquilo tem o nome dele."

"Isso acontece por um motivo simples. O jogo foi feito para ser jogado até o fim, com fases, recompensas e um próximo desafio sempre pronto. Construir é outra atividade, e o jogo não abre essa porta. Ele oferece o que foi decidido por outra pessoa. O que ele não oferece é a chance de decidir uma regra, testar e ver a própria ideia funcionando."

"Limitar as horas continua importante, e a família continua no comando disso. Só que o limite muda a quantidade. O que acontece dentro das horas que ficam é outra decisão, e é dela que esta página trata."

Tese: "A pergunta que vale a pena fazer é o que seu filho está aprendendo a fazer com o tempo de tela que ele já tem."

Nota: a ilustração atual (criança concentrada) serve. O texto recupera a cena verdadeira da versão de agosto e retira "vício", "engenharia de atenção", "talento" e qualquer promessa.

### Bloco 4 · A alavanca (`#virada`)

Eyebrow: "O interesse já existe"

H2: **O mesmo interesse que te preocupa é a melhor porta de entrada para ele aprender a criar.**

Texto:

"Criança que ama jogos quer entender como um jogo é feito. Ela já imaginou uma fase diferente, um personagem com um poder novo, uma regra que mudaria tudo. Essa vontade é o ponto de partida, e ela não precisa ser inventada por um curso."

"Para uma ideia dessas virar um jogo que funciona, ela precisa decidir o que acontece primeiro, montar a regra, testar, ver dar errado, corrigir e terminar. É exatamente o tipo de pensamento que você gostaria de ver, e ele aparece porque a criança quer chegar ao final do próprio jogo."

"Foi assim com o André, nosso filho. Aos 7 anos, quase todo o interesse dele terminava no jogar. Quando começamos a criar jogos juntos, ele passou a nos chamar para testar as regras dele e a explicar cada escolha. Hoje, aos 12, é ele quem dá voz ao Zappy dentro da plataforma. A história inteira está mais abaixo."

Tese: "Quando a criança escolhe o que criar e vê que consegue, a vontade de continuar vem de dentro. É isso que uma atividade imposta não consegue produzir."

Nota: este trecho não usa os termos clínicos; eles ficam apenas na história completa do bloco 13, dentro dos marcadores.

### Bloco 5 · Por que as saídas comuns não pegam (`#saidas`)

Eyebrow: "Você provavelmente já tentou"

H2: **Três saídas comuns, e o ponto em que cada uma falha**

Cartão 1, "Limitar o tempo": "Diminui as horas e costuma render briga. O que acontece dentro do jogo continua igual, e ele volta para o mesmo lugar assim que pode. O limite é necessário; sozinho, ele não muda o que a criança faz."

Cartão 2, "Empurrar outro hobby": "Esporte, música, um curso escolhido pelos pais. Quando a atividade não parte do interesse da criança, ela vai de má vontade, aguenta um ou dois meses e larga. As pesquisas sobre abandono em esporte e música apontam sempre os mesmos motivos: deixou de ser divertido, ela não se sente capaz, não vê progresso. O pico do abandono fica entre 12 e 14 anos."

Cartão 3, "Deixar solto no Roblox Studio, no Scratch ou no YouTube": "A ferramenta é boa e é gratuita. O que falta é um caminho na ordem certa, alguém que olhe o que ela fez quando trava e um lugar seguro para mostrar. Muita criança para nos cenários e nos personagens e volta a só jogar. Cursos gravados sem ninguém acompanhando terminam com pouquíssima gente concluindo."

Tese: "O que faz o interesse virar criação é a soma de três coisas: um caminho, uma pessoa e um lugar para mostrar. É isso que a Comunidade organiza."

### Bloco 6 · O que ele vai fazer (`#pratica`)

Eyebrow: "Como fica na prática"

H2: **Na primeira semana, um jogo publicado. Depois, um projeto de cada vez.**

Linha do tempo (três etapas):

- "Primeira semana: o Desafio do Primeiro Jogo. Em aulas guiadas de uma etapa por vez, ele monta as regras de um jogo com cenário e personagens já preparados, publica com link e QR code e manda para a família jogar."
- "Primeiro mês: os cursos seguintes. Ele altera regras, cria a própria versão de um jogo e envia as atividades para revisão. Cada curso concluído e publicado sobe um posto na Jornada do Criador."
- "Depois: novos cursos e ferramentas abrem conforme ele avança, de Faísca até Lenda. A plataforma está em lançamento. Os cursos de hoje e todos os que entrarem fazem parte da assinatura, e a Jornada mostra o que vem em seguida."

Demonstração (mantida da página atual): "Uma mudança pequena: ele quer que o personagem corra mais rápido. Ele faz uma previsão, escolhe uma velocidade e imagina o que vai acontecer. Coloca a ideia à prova, roda o jogo e observa. Decide o que ajustar, testa outro valor e compara. Agora tem uma razão para explicar a escolha."

"O que você vai ver e ouvir em casa":
- "Um link no grupo da família e o contador de jogadas subindo."
- "Ele explicando por que a regra é assim e o que muda se trocar."
- "Uma tentativa que deu errado e a seguinte que deu certo."
- "Uma dúvida enviada e a resposta de uma pessoa dentro da plataforma."

Tese: "Pergunte o que ele mudou e peça para mostrar no jogo. A explicação dele é a sua janela para o que ele está entendendo."

Nota: [CONFIRMAR o curso do Desafio em produção no momento da publicação: o antigo, com a nave, ou A Chave do Farol, com três aulas. O texto acima vale para os dois.]

### Bloco 7 · Como a Comunidade sustenta a continuidade (`#metodo`)

Eyebrow: "Por que ele continua depois do primeiro jogo"

H2: **Um caminho, uma pessoa e um lugar para mostrar, no mesmo acesso**

Sub: "Cada parte abaixo responde a um motivo pelo qual as crianças largam: falta de próximo passo, falta de alguém que olhe, falta de público."

Cartões com as capturas reais (as sete imagens atuais):

- Jornada do Criador (`print-jornada`): "Oito postos, de Faísca a Lenda, como as faixas do judô. Cada curso concluído e publicado faz a Jornada andar e libera o próximo curso e a ferramenta certa para aquele momento. A criança sempre sabe onde está e o que vem depois."
- As aulas (`print-aula`): "Explicação e prática na mesma tela. Ele aprende uma ideia, monta no Estúdio, que é o editor de jogos por blocos, dentro da própria aula, e vê o resultado no jogo."
- Os Recados (`print-recados`): "É a caixa de mensagens da criança com o professor. As atividades enviadas são lidas por uma pessoa, que responde ali dentro e conversa com ela sobre o projeto. [CONFIRMAR e publicar: quem responde e em quanto tempo. Proposta: 'Hoje quem lê e responde somos nós, Helena e Júlio, em até dois dias úteis.']"
- O Mural dos Criadores (`print-mural`): "A vitrine dos jogos publicados. Cada um ganha link e QR code, tem contador de jogadas e o botão de fazer a própria versão."
- O Clube dos Criadores (`print-clube`): "O espaço da turma, só para crianças da faixa atendida. As conversas passam por moderação antes de aparecer. Ele mostra o que fez e vê o que os outros estão criando."
- A oficina (`print-oficina`): "Estúdio para montar, Pinta para desenhar em 2D, Pensa para planejar e Molda para modelar em 3D. Cada uma abre no posto em que a criança já consegue aproveitar: Estúdio e Pinta em Construtor, Pensa em Inventor, Molda em Explorador de Mundos."
- Meu Espaço (`print-espaco`): "Avatar, quarto, sequência e conquistas guardam a história dele na plataforma. Todo mês, o Desafio do Mês traz um tema novo com uma prateleira própria no Mural."

Método Z.E.R.O. (mantido, mais curto): "Nos projetos mais livres, a criança segue o Método Z.E.R.O.: Zerar a bagunça (organizar a ideia na Carta da Ideia), Enxergar o jogo (nome, cores, telas), Rodar as missões (uma parte de cada vez, com atividades enviadas para revisão) e O grande lançamento (caçar os bugs e publicar com link). Terminou o O, volta ao Z com um jogo mais ambicioso."

Tese: "Tudo isso faz parte da assinatura, sem compra extra por dentro. A liberação segue a Jornada para cada coisa chegar quando ele consegue usar, e a plataforma cresce com os cursos que entram."

Balão do Dedé (mantido).

### Bloco 8 · As primeiras crianças (`#prova`)

Eyebrow: "Quem já testou"

H2: **Três crianças, três primeiros jogos**

Sub: "Rafael, Débora e André testaram a plataforma antes do lançamento. As falas são deles."

Os três relatos, sem estrelas:
- Rafael, "publicou o primeiro jogo": "Fiz uma nave que atira nos asteroides e marca ponto. No fim eu peguei o link e mandei pro meu amigo jogar."
- Débora, "publicou o primeiro jogo": "Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No terceiro dia chamei a minha mãe pra ver o meu jogo."
- André, "filho dos criadores da plataforma": "Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior."

[A PRODUZIR, ver seção 12: um vídeo de 60 a 90 segundos de uma aula real com uma escolha da criança e o resultado; dois ou três jogos publicados com link e a idade de quem fez, com autorização; e, se autorizado, uma linha de números reais: "Até (data), (N) jogos publicados e (N) aulas concluídas pelas primeiras famílias."]

Nota: a fala da Débora precisa ser a mesma nas duas páginas ("terceiro dia" ou "último dia"; confirmar com ela). O vínculo do André aparece nas duas páginas.

### Bloco 9 · Por que aqui e não o gratuito ou a escola (`#comparacao`)

Eyebrow: "Comparando com o que existe"

H2: **O que muda entre a ferramenta gratuita, a escola de programação e a Comunidade**

Tabela:

| | Ferramenta gratuita (Scratch, Roblox Studio, YouTube) | Escola de programação (presencial ou ao vivo) | Comunidade dos Criadores |
|---|---|---|---|
| Caminho na ordem certa | Não | Sim | Sim |
| Alguém olha o que a criança fez | Não | Sim, uma aula por semana | Sim, em cada atividade enviada |
| Jogo publicado com link para a família | Depende, em comunidade aberta | Raramente | Sim, com link e QR code |
| Turma | Comunidade aberta, muitas vezes em inglês | Turma de 6 a 8 | Clube moderado, em português, só da faixa etária |
| Horário | Livre | Fixo, uma vez por semana | Livre, no ritmo dela |
| Contrato | Nenhum | Semestral ou anual, com multa | Nenhum. Cancele quando quiser |
| Preço por mês | R$ 0 | [CONFERIR] R$ 250 a 400, mais matrícula e material | R$ 97, para até duas crianças |

Tese: "Se a sua família aprende bem com material gratuito, siga por ele. A Comunidade existe para quem quer o caminho pronto, uma pessoa acompanhando e um lugar seguro para mostrar, por menos da metade de uma escola de programação."

Nota: os valores das escolas vêm de fontes terceiras; confirmar por telefone em duas ou três unidades da sua região antes de publicar e guardar a data.

### Bloco 10 · Para quem é (`#paraquem`)

Eyebrow: "Antes de assinar"

H2: **Veja se a Comunidade combina com o seu filho**

"É para você se pelo menos um destes for verdade": manter os quatro itens atuais (9 a 14 anos com curiosidade de criar; adora mexer no computador e nas telas; já cria coisas no computador; você gostaria de acompanhar algo que ele está aprendendo a criar, além das partidas de que já gosta).

"Ainda não é para você se": manter os quatro itens atuais (menos de 9 anos; nenhum interesse por jogos ou tecnologia; reforço escolar; aulas ao vivo individuais em horário marcado).

Tese (mantida): "A Comunidade combina melhor com a criança que demonstra interesse por jogos e tecnologia e está pronta para experimentar o papel de quem também cria."

### Bloco 11 · O que você pode estar pensando (`#objecoes`)

Eyebrow: "Antes de decidir"

H2: **As seis dúvidas que costumam aparecer aqui**

"Se ele começar e largar." "A Jornada foi desenhada para isso: cada curso termina com um jogo publicado, uma pessoa responde o que ele envia, e todo mês entra um tema novo. Se preferir conhecer o ritmo antes de escolher o ano, comece pelo mensal. Nos primeiros 7 dias há reembolso. Depois, você cancela pela sua área quando quiser, e os jogos publicados continuam acessíveis no Mural."

"Sobre o tempo de tela." "Uma parte do tempo de tela que vocês já permitem pode virar um momento de criação, com começo e fim combinados. A Sociedade Brasileira de Pediatria e a Academia Americana de Pediatria distinguem o que a criança faz na tela, e não só quanto tempo passa nela. A família continua definindo os limites, e a Comunidade cabe dentro deles."

"Seu papel cabe em três gestos." "Ajudar no primeiro acesso, combinar o horário e pedir para ele mostrar o que fez. As aulas apresentam os comandos, e as dúvidas do projeto vão para os Recados. Três perguntas bastam para acompanhar: por que você escolheu essa regra, como resolveu essa parte, o que quer tentar agora."

"Sobre segurança." "A conta da criança é vinculada à sua. O Clube é só para crianças da faixa atendida, e cada mensagem passa por moderação antes de aparecer. O perfil público começa desligado. Não existe chat aberto, compra dentro da plataforma nem caixa de recompensa. É o desenho que o ECA Digital, em vigor desde março de 2026, passou a exigir das plataformas infantis."

"Sobre a inteligência artificial." "A IA já escreve código, e vai escrever cada vez mais. Quem entende como um jogo é feito consegue pedir a coisa certa, ler o que a IA devolve e perceber quando está errado. Na plataforma, o Zappy explica e dá pistas, e nunca monta pelo aluno. A pesquisa mais citada sobre IA na escola, publicada na PNAS em 2025, mostra o motivo: quando a IA entrega a resposta, o aluno rende menos depois; quando há orientação de professor, isso não acontece."

"Sem aula ao vivo, ele aprende de verdade." "A aula ao vivo prende a criança a um horário e a um professor que pode trocar. Aqui ela segue no próprio ritmo, e o que ela envia é lido por uma pessoa que responde dentro da plataforma. A explicação, a prática e o teste acontecem no mesmo projeto."

Tese: "Cada resposta acima descreve algo que existe hoje na plataforma. O que ainda está por vir aparece como 'em breve', e não como promessa."

### Bloco 12 · Planos e valor (`#valor`, `#planos`)

Eyebrow: "Quanto custa e o que está incluído"

H2: **R$ 97 por mês. Menos de R$ 3,30 por dia, para até duas crianças.**

Sub: "Uma escola de programação cobra entre R$ 250 e R$ 400 por mês por uma aula semanal, com matrícula, material e contrato de fidelidade [CONFERIR antes de publicar]. Aqui o acesso é diário, no ritmo da criança, com uma pessoa acompanhando e sem contrato."

O que a assinatura inclui (lista única da página):
- "Todos os cursos de hoje e os que entrarem, liberados pela Jornada do Criador"
- "Revisão das atividades enviadas e resposta nos Recados"
- "Mural com link e QR code para cada jogo publicado"
- "Clube dos Criadores, moderado, e o Desafio do Mês"
- "Estúdio, Pinta, Pensa e Molda, cada um no posto certo"
- "Até 2 perfis de criança, cada um com o próprio progresso"

Cartões de plano (mantidos, com as condições ajustadas):
- Mensal, R$ 97 por mês: "Para conhecer o ritmo da plataforma. Renovação automática no cartão. Cancele quando quiser pela sua área; o acesso vale até o fim do período pago." Botão: "Começar no plano mensal".
- Anual, R$ 797 por ano (destaque "Economize R$ 367 no ano"): "12 meses no mensal sairiam por R$ 1.164. Equivale a R$ 66,42 por mês. Pix à vista ou cartão." Botão: "Começar no plano anual".

Linha abaixo dos planos: "Garantia de 7 dias · Renovação controlada pela sua área de responsável · Até 2 perfis de criança"

Tese: "Por que R$ 97: porque cada atividade enviada é lida por uma pessoa e o caminho inteiro já está pronto. O preço fica aqui na página, sem aula experimental de venda e sem proposta por WhatsApp."

Nota: "aviso por e-mail antes de toda renovação" só volta à página quando existir para o cartão (seção 11, item 3).

### Bloco 13 · Quem faz (`#autoridade`)

Eyebrow: "Quem está por trás"

H2: **A Comunidade começou com uma pergunta dentro da nossa própria casa.**

Texto (o atual, dentro dos marcadores `historia-andre`, com dois ajustes): manter os parágrafos sobre a formação, o Banco do Brasil, o André aos 7 anos, o equilíbrio e a mudança observada. Acrescentar, depois de "Foi dessa experiência que nasceu a Comunidade dos Criadores": "Hoje o André tem 12 anos e é a voz do Zappy nas aulas. Somos nós que escrevemos os cursos, lemos o que as crianças enviam e respondemos nos Recados. [CONFIRMAR a segunda frase.]"

Nota: os termos clínicos permanecem só aqui, entre os marcadores, como hoje. A foto da família fica.

### Bloco 14 · Perguntas (`#faq`)

Ordem e textos:

1. "E se meu filho começar e perder o interesse?" "A Jornada foi feita para segurar a continuidade: cada curso termina com um jogo publicado, uma pessoa responde o que ele envia e todo mês entra um tema novo. Se quiser conhecer o ritmo antes de escolher o ano, comece pelo mensal. Nos primeiros 7 dias há reembolso; depois, você cancela pela sua área quando quiser."
2. "Meu filho já joga bastante. Como a Comunidade se encaixa na rotina?" (manter a resposta atual)
3. "Ele nunca fez nada de tecnologia além de jogar. Consegue mesmo?" (manter)
4. "Meu filho tem 9 anos. É cedo demais?" (manter)
5. "Eu não entendo nada de tecnologia. Vou conseguir ajudar?" (manter)
6. "É seguro meu filho conversar com outras crianças ali dentro?" "Sim. O Clube é só para crianças da faixa atendida e cada mensagem passa por moderação antes de aparecer. O perfil público começa desligado, e você administra os perfis pela sua área. A plataforma segue o ECA Digital e as regras de proteção de dados de crianças."
7. "O Scratch é gratuito. Por que assinar a Comunidade?" "Dá para aprender muito com o Scratch. O que a Comunidade acrescenta é o caminho na ordem certa, uma pessoa que lê o que a criança envia e um lugar moderado para publicar e mostrar. Se a sua família avança bem sozinha com o gratuito, siga por ele."
8. "A inteligência artificial já escreve código. Ainda vale a pena?" "Vale mais. Quem entende como um jogo é feito consegue pedir a coisa certa à IA e perceber quando ela erra. Aqui o Zappy explica e dá pistas, e nunca monta pelo aluno."
9. "Sem aula ao vivo com professor na frente, meu filho aprende de verdade?" "Ele segue no próprio ritmo, e o que envia é lido por uma pessoa que responde nos Recados. Explicação, prática e teste acontecem no mesmo projeto, sem horário fixo e sem professor que troca."
10. "Se está tudo incluído, por que algumas ferramentas aparecem fechadas?" (manter)
11. "Meu filho já fez o Desafio do Primeiro Jogo. Precisa fazer novamente?" (manter)
12. "Posso cadastrar irmãos?" (manter)
13. "Como faço para cancelar se não der certo?" "Nos primeiros 7 dias, peça o reembolso. Depois, desative a próxima renovação pela sua área de responsável; o acesso continua até o fim do período já pago, e os jogos publicados seguem acessíveis no Mural."
14. "Preciso instalar ou comprar algum programa?" (manter)
15. "A escola vai cobrar isso?" "A partir de 2026, computação passa a ser obrigatória nas redes públicas e privadas, com três eixos definidos pelo Conselho Nacional de Educação. A pesquisa oficial mais recente reconhece uma distância considerável entre a norma e a sala de aula. A Comunidade não substitui a escola; ela dá à criança um lugar para praticar o que a norma pede."

### Bloco 15 · O que fica (`#final`)

Eyebrow: "O que fica"

H2: **O dia em que ele te chama para jogar um jogo que ele mesmo fez.**

Texto: "Imagine seu filho mandando um link no grupo da família, explicando a regra que inventou e olhando o contador de jogadas subir. Esse dia costuma chegar na primeira semana. O que a Comunidade oferece é o caminho que vem depois dele: um projeto de cada vez, com alguém acompanhando, até ele estar criando coisas que hoje só imagina."

Lista curta: "Todos os cursos, de hoje e os que entrarem · Uma pessoa lendo o que ele envia · Um link para cada jogo publicado · Clube moderado e Desafio do Mês · Até 2 perfis · 7 dias de garantia"

CTA: "Quero que meu filho faça parte da Comunidade"

Linha de preço: "Anual R$ 797 (equivale a R$ 66,42 por mês) · ou mensal R$ 97 por mês · Garantia de 7 dias"

Tese: "O próximo passo é pequeno: abrir a primeira aula com ele nesta semana."

Termos (mantidos): "Ao assinar, você concorda com os termos de uso e a política de privacidade, feitos com atenção especial à proteção de dados de crianças. O acesso da criança é vinculado à sua conta de responsável."

Barra fixa do celular (mantida): "R$ 97/mês · anual R$ 797 · Assinar".

## 10. Variantes

### 10.1 Entrada para quem vem do Desafio

Quem chega pelo e-mail de conclusão, pelo vídeo do certificado ou pela tela de produto bloqueado no app já sentiu a dor e já viu o primeiro jogo. Para esse tráfego, a página recebe um parâmetro na URL (proposta: `?origem=desafio`, anexado pelos três pontos de origem) e troca o hero, pula os blocos 3 e 5 e abre em continuidade. O restante é o mesmo.

Eyebrow: "Para quem já publicou o primeiro jogo"

H1: **O primeiro jogo ficou pronto. Agora vem o caminho inteiro.**

Lead: "Seu filho já provou que consegue montar, testar e publicar. A Comunidade dos Criadores é a continuação: novos cursos, a Jornada do Criador, uma pessoa lendo o que ele envia e o Mural para cada jogo novo. O progresso do Desafio continua de onde parou."

Bullets: "Ele segue do ponto em que está, sem refazer nada" · "Cada curso concluído sobe um posto e libera o próximo" · "Até 2 perfis, 7 dias de garantia, cancele quando quiser"

CTA: "Quero que ele continue criando"

Bloco 4 nessa variante fica com o parágrafo do André e a tese; os blocos 6 a 15 permanecem.

### 10.2 Headline B, para teste

H1: **O dia em que seu filho te chama para jogar um jogo que ele mesmo fez.**

Lead: "Na Comunidade dos Criadores, crianças de 9 a 14 anos que já amam jogos aprendem a criar os delas: aulas guiadas, uma pessoa acompanhando o que elas enviam e um link para a família jogar. Terminou o primeiro, a Jornada do Criador mostra o próximo."

Hipótese: A entra pela conversa que já existe (o filho que joga); B entra pela cena do orgulho. Com tráfego suficiente, distribuir ao acaso e medir cliques em `#planos`, `abriu_checkout` e `pagamento_confirmado` por variante; sem tráfego, testar em entrevista (seção 13). Não declarar vencedor com poucas vendas.

## 11. Correções e alinhamentos no restante do funil

Em ordem de impacto. Os itens 1 a 4 são correções de bug e independem desta proposta.

1. **Link e nome nos e-mails do ciclo do Desafio.** Trocar `/kids/comunidade-do-criador/oferta` por `/kids/comunidade-dos-criadores/oferta?origem=desafio` em `send-challenge-lifecycle.service.ts:161` e `send-renewal-reminders.service.ts:186`, corrigir "Comunidade do Criador" para "Comunidade dos Criadores" em `seed-templates.ts:556` e `:579`, e ajustar os testes `renewal-reminder.test.ts:302` e `challenge-lifecycle.test.ts:157`. Reescrever o corpo do e-mail de conclusão como argumento:

   Assunto: "O primeiro jogo ficou pronto. E agora?"
   "Olá, {{nome}}. {{crianca}} concluiu o Desafio do Primeiro Jogo: montou as regras, testou e publicou um jogo com link. Vale celebrar, e vale jogar com a família hoje. O que costuma acontecer depois é a pergunta 'e agora?'. A Comunidade dos Criadores é a resposta: novos cursos, uma pessoa lendo o que ele envia e um posto novo a cada projeto concluído. O progresso continua de onde parou. Conheça os planos e as condições na página, sem compromisso." Botão: "Ver o caminho depois do primeiro jogo".

2. **Termos de uso.** Criar a seção da assinatura em `legal-kids.ts` (renovação, cancelamento, garantia, perfis) ou uma página própria; o checkout e o rodapé da Comunidade passam a apontar para ela.
3. **Aviso de renovação.** Implementar o lembrete para o cartão recorrente (o `renewal-reminder` já existe para o anual via Pix) ou manter a copy sem essa promessa, como na seção 9.
4. **Rota do e-mail de cobrança recusada:** `/perfis` no lugar de `/compras`.
5. **Vídeo do certificado do Desafio** (`docs/aulas-interativas/aulas/desafio-certificado.roteiro.md`): a narração para o responsável ganha a mesma cadeia em 30 segundos: "Ele acabou de provar que consegue. O que costuma acontecer depois é a criança querer o próximo, e é aí que a maioria trava, porque falta caminho, alguém para olhar e um lugar para mostrar. A Comunidade organiza os três. O link abaixo leva à página, fora da plataforma dele, com os planos e as condições."
6. **Bio da raiz (`/`)**: manter "Ele já joga. Falta descobrir que dá pra criar." como frase-mãe do funil; corrigir "5 dias" no botão do Desafio; no botão da Comunidade, trocar "A assinatura da plataforma inteira de criar jogos" por "Depois do primeiro jogo: o caminho inteiro, com uma pessoa acompanhando".
7. **Oferta do Desafio**: alinhar o hero à mesma tese ("Seu filho já joga. Em três dias, ele publica o primeiro jogo que é dele."), atualizar para o curso em produção (nave ou Farol), incluir um link para a Comunidade no FAQ e no fechamento, e unificar a fala da Débora e o vínculo do André.
8. **Faixa etária**: decidir uma (proposta: "a partir de 9 anos", com "até 14" só onde a moderação do Clube exige) e aplicar em página, app e cursos gratuitos.
9. **Tela de produto bloqueado no app kids**: trocar "Assim que você entrar, fica tudo liberado" por "Com a assinatura, você começa pelos cursos e libera as ferramentas conforme avança na Jornada".
10. **Pré-checkout, checkout e obrigado**: manter os textos atuais; no obrigado, acrescentar o Mural de visitante e o resumo semanal aos pais quando estiver confirmado em produção.

## 12. Prova a produzir

Em ordem de valor por esforço:

1. **Dois ou três jogos publicados com link e a idade de quem fez**, com autorização dos responsáveis. É a prova que nenhum concorrente entrega e cabe no hero e no bloco 8.
2. **Um vídeo de 60 a 90 segundos de uma aula real**: a criança faz uma escolha (a velocidade, uma regra), testa, algo dá errado, ela ajusta, funciona. Sem encenar transformação. Entra no hero como "Ver uma aula por dentro".
3. **Uma revisão real nos Recados**, com a dúvida da criança e a resposta, anonimizada. Prova o argumento S2 melhor do que qualquer frase.
4. **A frase pública sobre quem responde e em quanto tempo.** Sem ela, "uma pessoa de verdade" fica abstrato.
5. **Números reais de produção**, se autorizados: jogos publicados, aulas concluídas, famílias. Atualizar mensalmente; depois de 90 dias, publicar continuidade (crianças que avançaram de posto).
6. **Uma fala de mãe ou pai das primeiras famílias**, com resultado concreto e prazo, quando existir. Até lá, argumento vale mais do que depoimento inventado, como a página já reconhece.

## 13. Validação

Antes de publicar:
- Puxar do `/admin` a distribuição das respostas P6 (desejo) e P7 (barreira) do quiz do Desafio e das vendas por origem. Se "ver meu filho me chamar para mostrar" dominar, a headline B ganha peso; se "investimento pequeno antes de algo maior" dominar, o plano mensal e a garantia sobem na página.
- Conversar com 8 a 12 responsáveis fora da família (as três situações de entrada da proposta de 29/09), mostrando as duas headlines em ordem alternada e uma aula, e perguntando o que acham que o filho faria, o que parece difícil e o que faltou para decidir.
- Observar duas ou três crianças de idades diferentes numa atividade curta, com autorização, registrando bloqueios e pedidos de ajuda.

Depois de publicar:
- Medir por variante e por origem (`utm_*`, `?origem=desafio`): `viu_pagina_vendas`, cliques em `#planos`, `abriu_checkout`, `pagamento_confirmado`.
- Medir continuidade: primeiro projeto iniciado, primeira atividade enviada, primeiro posto conquistado, cancelamentos e motivos. Cliques medem curiosidade; a continuidade diz se a expectativa criada pela página bate com a experiência.
- Rever a copy se a compra vier por leitura errada (por exemplo, aula particular ao vivo), ainda que a conversão pareça boa.

## 14. Implementação: arquivos, testes e ordem

Fase 1 (esta entrega): este documento e os três cadernos em `docs/plans/`, sem alteração de código.

Fase 2, após aprovação:
1. `packages/funnel/src/components/funnel/oferta/ComunidadeOfertaBody.astro`: reescrever os blocos conforme a seção 9, fundindo 7, 9, 11 e 12 atuais em um, removendo estrelas, movendo a origem curta para o bloco 4, adicionando a tabela de comparação e a variante pós-Desafio (leitura de `?origem=desafio` na rota `oferta.astro`, repassada por prop).
2. `packages/funnel/src/funnels/comunidade-dos-criadores/content.ts` e `index.ts`: `seoTitle`, `seoDescription`, `landing.h1` e `subtitulo` espelhando o hero novo; obrigado sem a promessa de aviso antes de toda renovação até ela existir.
3. `packages/funnel/tests/unit/comunidade-offer-copy.test.ts`: reescrever as guardas para a nova tese (H1 obrigatório novo; frases obrigatórias: "Ele passa horas dentro do jogo", "um caminho, uma pessoa e um lugar para mostrar", "Cancele quando quiser", "sem compra extra por dentro", "Estúdio e Pinta em Construtor", "Pensa em Inventor", "Molda em Explorador de Mundos", os três relatos; frases proibidas mantidas: "maior talento dele", "Preguiça e vício", "Risco zero pra você", "Sessão de terapia", "Adiar tem um custo", títulos Resiliência e Autoestima, `<s>R$ 388</s>`; e novas: "★", "aviso por e-mail antes de toda renovação" enquanto não existir, "fica tudo liberado"). `comunidade-funnel.test.ts`: ajustar `seoTitle`/`seoDescription`. `copy-vocabulario.test.ts` e `copy-jornada.test.ts` seguem inalterados e devem passar.
4. Correções de funil da seção 11, itens 1 a 4, em `packages/members`, `packages/messaging` e `packages/funnel/src/content/legal-kids.ts`, com seus testes.
5. Verificação: `bun test`, `bun run typecheck`, `bun run check` e `bun run build` em `packages/funnel`; testes dos pacotes tocados; leitura da página em desktop e celular; `git diff --check`.
