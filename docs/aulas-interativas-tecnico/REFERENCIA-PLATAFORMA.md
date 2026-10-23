# Referência da plataforma, medida no código

> Direção vigente: fonte e linguagem comuns aos dois públicos; consulte [diretrizes](DIRETRIZES-PEDAGOGICAS.md) e [voz](DIRETRIZES-VOZ-ELEVENLABS.md). Os termos técnicos de schema não são rótulos de tela.

> Onde cada coisa está na plataforma **hoje**, lido direto do `sistema-zero` em 20/09/2026,
> conferido em 06/10/2026 e de novo em 23/10/2026, com a linguagem comum de 21/10/2026: curso →
> módulo → aula → parte nas duas comunidades (Diretrizes Pedagógicas, seção 6). De 06/10 a 21/10 a
> área da criança usou aventura e fase; a unificação de 21/10 voltou para curso, aula e parte.
> Serve a todos os cursos. Toda fala de aula que nomeia um menu, uma tela ou um botão confere aqui.
> Os rótulos do player da aula estão no `COMMON_LESSON_COPY` de
> `packages/member-shell/src/lib/lesson-copy.ts`, o mesmo objeto nas duas comunidades
> (`lesson-copy-kids.ts` e o `lesson-copy.ts` do Kids só o reexportam).
>
> A fonte de cada linha está citada. Quando a plataforma mudar, recomece daqui, não de memória.

## A entrada: criança e responsável (10/10/2026)

Fontes: `packages/community-kids/src/app/(auth)/login/page.tsx` (escolha),
`components/kids/student-entry.tsx` (criança), `app/(auth)/login/login-form.tsx` (responsável),
`app/pais/parents-client.tsx` (Área dos pais), `components/kids/study-device-manager.tsx`
(aparelhos), `components/kids/user-menu.tsx` (menu do avatar), `lib/study-access-client.ts`
(avisos) e `packages/member-shell/src/lib/study-access.ts` (prazos). Ajuda pública:
`app/(auth)/ajuda/entrar/page.tsx`, em **/ajuda/entrar**, que funciona antes de entrar.

A criança entra pelo próprio perfil num navegador que o responsável autorizou. Ela não usa o
e-mail nem a senha dos pais. Cada autorização vale para **um perfil num navegador**: irmãos no
mesmo computador têm uma autorização cada, e escolher um irmão nunca abre o perfil dele sem a
autorização dele. Os perfis, as criações e o progresso de antes continuam guardados.

⚠️ **"Aluno" não aparece nem nos rótulos da entrada** (desde 10/10/2026, antes da produção: a
criança clica em **Eu sou criador(a)** e o responsável em **Ir para a área da criança**). Na fala da
aula e no Como Fazer, quem entra é "você" ou "a criança".
Nunca peça a senha do responsável na fala.

Rótulos marcados com † foram decididos em 10/10/2026 e estão sendo aplicados nas telas por outra
sessão; confira o código antes de gravar uma fala com eles.

| Onde | Rótulos exatos |
| --- | --- |
| Escolha de entrada (`/login`; a raiz sem sessão também mostra esta escolha †) | Título **Quem vai entrar?**; cartões **Eu sou criador(a)** (subtítulo "Entre para continuar seus cursos.") e **Eu sou responsável**; link **Preciso de ajuda para entrar** |
| Entrada da criança, perfis (`/login/aluno`) | Título **Quem vai criar hoje?**; no cartão, **Entrar** ou **Pedir código**, o selo **Último perfil usado** e os avisos **O prazo deste acesso terminou.** e **Acesso encerrado neste aparelho.**; botão **Tenho um código**; links **Voltar** e **Preciso de ajuda** |
| Entrada da criança, código | Títulos **Vamos começar?** ou **Vamos entrar, [nome]?**; campo **Código de acesso** † (era "Código do responsável"); botão **Entrar para criar**; **Voltar aos perfis**. A criança não tem mais "Remover estes perfis do aparelho" †: só a Área dos pais esquece o aparelho |
| Avisos da entrada | **Foram muitas tentativas. Aguarde 10 minutos e tente novamente.**; **Esse código não liberou o acesso. Confira as letras ou peça um novo código ao responsável.**; **Não conseguimos preparar este navegador. Permita os cookies e tente novamente.**; **Este navegador já está sendo usado por outra família. Use outro navegador.** † |
| Entrada do responsável (`/login/responsavel`) | Título **Área dos pais**; **Enviar código**, campo **Código enviado ao seu e-mail** † (os 6 dígitos do e-mail; não é o código da criança), **Entrar**, **Reenviar código**; **Entrar com senha** ou **Entrar com código por e-mail**; **Esqueci minha senha**; **Voltar à escolha de entrada** |
| Área dos pais (`/pais`, com páginas próprias desde 11/10/2026 †) | Barra: **Família**, **Acompanhamento**, **Conta** e **Ajuda**; **Ir para a área da criança** (no celular, **Área da criança**); menu da conta com **Conta e compras**, **Trocar senha** e **Sair**. Na Família: **Precisa da sua atenção**, **Suas crianças** e **Adicionar criança**; no cartão da criança, **Acesso nos aparelhos**, **Ver progresso** e, no menu **⋯**, **Editar perfil**. A página da criança (`/pais/crianca/<id>`) tem as abas **Acesso nos aparelhos** e **Progresso** e a volta **Família**. Acompanhamento: o progresso de cada criança e o interruptor **Receber o resumo da semana por e-mail**. Conta: **Minhas compras** (a assinatura e o **Histórico de compras**), **Ajuda da IA neste mês** e **Senha da conta**. Ajuda (`/pais/ajuda`): **Como preparar o acesso**, **Perguntas frequentes** e **Abrir o atendimento**. `/perfis` com a sessão do responsável leva a `/pais`; `/responsavel` leva ao Acompanhamento e `/responsavel/ajuda`, ao atendimento † |
| Acesso nos aparelhos | **Autorizar aparelho**; **Neste aparelho** ou **Em outro aparelho**; **Nome do aparelho**; **Por quanto tempo?** com **Somente hoje**, **7 dias**, **30 dias** e **90 dias**; **Autorizar este aparelho** ou **Gerar código** (depois, **Gerar outro código**); **Copiar** e **Copiar endereço**; **Conferir se a criança já entrou**; situação **Liberado**, **Vence em breve**, **Vencido** ou **Encerrado**; **Renovar prazo** (**Confirmar novo prazo**) e, no menu **⋯** do aparelho, **Mudar nome** e **Encerrar acesso** |
| Menu do avatar da criança | **Trocar de perfil** (só crianças), **Meu perfil**, **Área dos pais** (encerra a sessão da criança e abre a entrada do responsável), **Sair**, que confirma em **Sair deste aparelho** |

Três armadilhas de fala:

1. **O código vale 10 minutos; o acesso vale o prazo escolhido.** O código serve só para a
   primeira entrada num navegador e libera um navegador só. Depois, a criança volta pelo perfil.
2. **Fechar a página não tira o acesso; Sair → Sair deste aparelho tira.** Depois de sair, o
   perfil precisa de outro código naquele navegador.
3. **Outro navegador, janela anônima ou dados do navegador apagados pedem código novo.** Na fala
   para a criança, diga "limpar os dados do navegador", não "cookies". A legenda do formulário
   dos pais diz "Onde [nome] vai criar?" (era "vai estudar" até 10/10/2026).

## 1. O menu da esquerda da Comunidade Kids

Fonte: `packages/community-kids/src/components/kids/nav.ts`

| Item | Rota | Filhos |
|---|---|---|
| **Início** | `/` | — |
| **Cursos** | `/cursos` | — |
| **Oficinas** | `/oficinas` | nenhum (o item só existe no computador; some da barra do celular) |
| **Criar** | `/criar` | Minhas criações `/criar` · **Estúdio** `/estudio` · **Pinta** `/pinta` · Pensa `/pensa` · Molda `/molda` |
| **Comunidade** | `/comunidade` | Nossa turma · Mural dos Criadores · Clube dos Criadores · Ranking |
| **Meu espaço** | `/perfil` | **Meu perfil** `/perfil` · **Meu avatar** `/meu-avatar` · **Meu quarto** `/quarto` |

Três armadilhas de fala:

1. **O item chama Cursos** desde a unificação de 21/10/2026 (foi Aprender desde 03/10 e Explorar de
   06/10 a 21/10). Ele abre o mapa da Jornada do Criador, com o título **Cursos da Jornada do
   Criador**. Fala escrita antes de 21/10 que mande clicar em Explorar está desatualizada.
2. **Estúdio e Pinta são filhos de Criar.** "No menu da esquerda, clica no Pinta" pula um passo:
   primeiro **Criar**, depois **Pinta**.
3. **Dentro de uma aula ou de uma ferramenta, esse menu começa escondido.**

## 2. O menu começa escondido na aula e na ferramenta

Fontes: `packages/community-kids/src/components/kids/focus-mode.tsx`, `focus-mode-toggle.tsx` e
`docs/plans/2026-09-19-aula-imersiva-design.md` (19/09/2026)

Na página de aula e nas galerias de criação embarcadas (Estúdio, Pinta, Pensa, Molda), a barra
esquerda **recolhe sozinha já no primeiro quadro**, e a lista de aulas da direita também. O que
traz cada uma de volta é uma setinha sem texto na borda da tela; o nome dela, **Mostrar menu** e
**Mostrar lista de aulas**, existe só para o leitor de tela (`focus-mode-toggle.tsx`). Na fala,
diga "a setinha da borda esquerda" ou "a setinha da borda direita". Com um editor
aberto, a ferramenta toma a largura inteira. A escolha **não** fica guardada entre visitas: toda vez
que se entra, começa recolhido. Ao voltar para **Criar**, o menu está aberto de novo.

⚠️ **O botão Mostrar menu não está sempre lá.** A régua é
`navAvailable = onFocus && isTablet && !workspaceActive`, então ele some em três situações: abaixo
de 768 px (a barra esquerda só existe a partir do `md`), fora de aula e de galeria de criação, e
**enquanto um projeto está aberto na ferramenta**, porque o editor toma a largura inteira. Fala do
tipo "clica no Mostrar menu para voltar", dita de dentro do Estúdio com o projeto aberto, manda
procurar um botão que não está na tela.

⚠️ **O que isso obriga na fala.** Nenhuma instrução dada de dentro de uma aula pode começar por "no
menu da esquerda": naquele momento não há menu na tela. Três saídas honestas, nesta ordem de
preferência:

1. **O botão da própria seção**, quando o destino é o Estúdio ou o Pinta. O player desenha
   **Abrir meu Estúdio** ou **Abrir meu Pinta** sempre que a seção declara `externalTool`, e o
   link leva `target="_blank"`: **abre em outra aba**, e a fala precisa dizer isso.
2. **O botão do bloco de ação de plataforma**, quando o destino é o avatar, o quarto ou o perfil
   (seção 4 abaixo). Também abre em outra aba.
3. **A setinha do menu (Mostrar menu)**, quando não é nenhum dos dois, que hoje é só a ida ao mapa
   da Jornada, pelo **Cursos**. A fala manda clicar nela antes de nomear o caminho.

## 3. A cor do perfil, que substituiu o tema

Fontes: `packages/core/src/palette/palette.ts`, `packages/member-shell/src/components/palette-picker.tsx`
Commit: `ebcc74d5 feat(platform): persistir paleta por perfil` (17/09/2026)

Em **Meu espaço › Meu perfil** existe uma fileira de caixinhas de cor. São seis, nesta ordem:

**Azul · Turquesa · Verde · Laranja · Rosa · Roxo**

A cor da casa, de todo o ecossistema, é o **Azul**. Quem nunca escolheu vê o azul sem ter escolhido
nada, e isso é diferente de ter escolhido o azul: o seletor grava sempre uma cor concreta.

⚠️ **Não existe mais tema claro e escuro do lado de fora, nem tema Rosa.** Toda fala que mande
"trocar o tema", "deixar no escuro" ou "escolher o tema rosa" está falando de uma tela que saiu.

⚠️ **Dentro do Estúdio continua havendo um Mudar tema**, que é outra coisa: é o claro e escuro da
ferramenta, e mora no grupo **Estúdio** do menu ⋯ (seção 5). Os dois não se confundem na tela, mas
se confundem fácil na fala.

## 4. As três ações de plataforma da aula

Fontes: `packages/core/src/learning/platform-action.ts`,
`packages/member-shell/src/components/section-platform-action.tsx`,
`packages/members/src/application/learning/platform-action.service.ts`

Uma seção pode pedir uma ação fora da aula. São três, e o bloco desenha **um botão que abre o
destino em outra aba**, mais um botão **Verificar minha ação**:

| Ação | Botão | Abre | Passa quando |
|---|---|---|---|
| `customize-avatar` | **Personalizar o avatar** | `/meu-avatar` | o avatar salvo difere do padrão |
| `customize-room` | **Personalizar o quarto** | `/quarto` | tem item, bicho, tema, parede, chão ou luz trocados |
| `change-theme` | **Escolher a minha cor** | `/perfil` | escolheu **alguma** cor, qualquer uma |

A própria plataforma escreve, na seção: "Vá em Meu perfil, escolha a sua cor e volte aqui para eu
conferir!" e, nas outras duas, "Deixe do seu jeito, salve e volte aqui para eu conferir!"

⚠️ Duas coisas que a fala precisa dizer e costuma esquecer: **abre em outra aba**, então tem que
voltar para a aba da aula; e a conferência **não é automática**, tem que clicar em **Verificar minha
ação**.

⚠️ A régua do `change-theme` é "escolheu uma cor", não "escolheu a cor X". Nenhuma fala pode mandar
escolher uma cor específica como se fosse condição para passar.

## 5. O menu ⋯ do Estúdio

Fontes: `packages/studio/src/components/layout/topbar/menuLayout.ts` e `core/i18n/pt-BR.ts`
Commit: `d91b5a5a fix(studio): full review do menu ⋯ e dos materiais` (18/09/2026)

O botão se chama **Mais opções** e são seis grupos, nesta ordem:

| Grupo | Itens |
|---|---|
| **Editar** | Desfazer · Refazer. **Só em tela estreita**; em tela larga os dois são botões da barra |
| **O meu jogo** | Salvar · **Trazer o que eu enviei** · **Extensões** · Virar profissional |
| **Materiais** | **Imagens** · **Sons** · **Modelos 3D**, três portas para a mesma janela **Materiais do jogo**, cada uma na sua aba |
| **Mostrar** | Console · Terminal · IA |
| **Levar o jogo** | **Baixar o projeto** · Baixar o código · Baixar para publicar |
| **Estúdio** | **Mudar tema** · Meus projetos |

⚠️ **Não existe grupo Arquivo, Exibição, Conta nem Ajuda.** Eram os nomes antigos e aparecem em
material de três cursos.

⚠️ **"Exportar para o Estúdio" virou "Baixar o projeto"**, no grupo **Levar o jogo**. A linha de
apoio dele diz "um arquivo para abrir este mesmo projeto no Estúdio Completo". Os três "Baixar"
moram juntos de propósito, e cada um tem a sua linha de apoio.

⚠️ **Até 18/09/2026 o som e o modelo 3D moravam atrás da palavra "Imagens".** Fala que mande "abrir
Materiais, Imagens" para pegar um som está descrevendo a tela antiga.

## 6. A lista de projetos do Estúdio

Fonte: `packages/studio/src/core/i18n/pt-BR.ts`

O título grande da tela é **Meus Jogos**. Os botões de cima são **Importar** e **Novo projeto**. O
modal traz o campo **Nome do projeto** e os botões **Cancelar** e **Criar e abrir**. No menu ⋯, o
item que volta para cá se chama **Meus projetos**.

## 7. O Pinta

Fontes: `packages/pinta/src/core/copy.ts`, `components/gallery/NewAssetDialog.tsx`

A galeria se chama **Meus desenhos**, e o cartão da frente é **Criar novo**. O assistente tem
**quatro perguntas**, nesta ordem:

1. **Como você quer desenhar?** Pixel art ou Vetor
2. **O que você quer criar?** Personagem, Cenário de fundo, Peças do cenário ou mapa
3. **Qual o tamanho?**
4. **Qual o nome?** Minúsculas e traços, e o botão final é **Começar a desenhar**

O selo da barra é **Guardado na sua conta**. O desenho enviado ao Estúdio chega em **Meus desenhos**.

## 8. Onde as regras de coluna continuam valendo

Fontes: `packages/member-shell/src/lib/lesson-split.ts`, `docs/plans/2026-09-19-aula-imersiva-design.md`

O desenho imersivo de 19/09/2026 diz, com todas as letras, que **nenhum bloco, cópia, cena, áudio ou
regra de conclusão muda**, e que a seção de dois lados continua usando a área inteira com a divisória
e as regras atuais. A regra das duas colunas do `ESPEC-MANIFESTO.md` segue valendo sem emenda.

O que mudou em volta: a aula ganhou um rodapé fixo com **Anterior**, **Preciso de ajuda** e **Próxima
parte**, e na última parte o avanço dá lugar a **Concluir aula**, com os mesmos rótulos na
comunidade adulta desde 21/10/2026 (antes ela dizia **Próxima seção**). Título da aula, título da seção e índice saíram do corpo; no alto
fica **Parte N de M**. Fala que mande "rola até embaixo e clica em continuar" merece conferência.

## 9. Os rótulos da aula nas duas comunidades (21/10/2026; módulo em 23/10/2026)

Fontes: `packages/community-kids/src/lib/lesson-copy.ts` (que reexporta
`packages/member-shell/src/lib/lesson-copy-kids.ts`), `lesson-progress.ts`, `lesson-celebration.tsx`,
`kids-lesson-blocks.tsx`, `recados/page.tsx`, `recados/[threadId]/recado-thread-client.tsx` e
`recados-bell.tsx`; no member-shell, `studio/studio-block.tsx`, `pinta/pinta-block.tsx` e
`lesson-gallery-delivery.tsx`. Na tela e por dentro, curso → módulo → aula → parte (no schema, a
parte é a seção). "Aventura" só descreve a história de um curso; "fase", só um nível real do jogo.
"Mundo" e "unidade" não nomeiam o módulo (Diretrizes Pedagógicas, seção 6).

| Onde | Rótulo |
|---|---|
| Rodapé da aula | **Anterior** · **Preciso de ajuda** · **Próxima parte**; na última parte, **Concluir aula** |
| Comemoração da aula (Kids) | **Aula concluída!** · **Próxima aula** · **Voltar ao curso** |
| Objetivos do projeto no Estúdio da aula | **Objetivos desta parte** · **Verificar esta parte** · **Objetivo cumprido!** |
| Cartão do Estúdio da aula | **Seu projeto no Estúdio** · **Enviar meu projeto**, confirmado em **Enviar** (janela **Enviar o seu projeto?**, campo **Recado (opcional)**) · **Enviar de novo**, confirmado em **Reenviar** · depois do envio, **Projeto enviado!** e, quando a equipe confere, **A equipe já viu o seu projeto.** |
| Pinta da aula | **Enviar meu desenho**, confirmado em **Enviar** (janela **Enviar o seu desenho?**) · **Enviar de novo** · **Desenho enviado!** · **A equipe já viu o seu desenho.** |
| Entrega pela galeria | **Escolher no Pinta** ou **Escolher no Estúdio** · janela **Minhas criações do Pinta** (ou **do Estúdio**) · campo **Recado (opcional)** · **Enviar (1)** · **Recebido!** · **Enviar outra versão** |
| Pedido de ajuda | **Preciso de ajuda** · **Enviar para a equipe** · **Ver conversa** |
| Recados | **Recados da equipe** (no sino, **1 recado novo da equipe**; autor **Equipe**; sem título próprio, **Conversa com a equipe**) · **Voltar à parte: …** (`teacher-lesson-link.tsx`) |
| Ampliação | **Ampliar jogo** ou **Ampliar experiência** · **Voltar à aula** |
| Certificado | **Baixar meu certificado** · **Baixar certificado (PDF)** |
| Material | selo **Baixe**; o título do caderno vem do manifesto: **Passo a passo do projeto: …** |

| Trilha do curso (Kids) | cada módulo aparece como **Módulo N**, e o baú diz **Você terminou o Módulo N** (`course-trail.tsx`, `chest-reward.tsx`; era "Mundo" até 23/10/2026) |

Quem recebe os envios e responde os recados é **a equipe** desde a noite de 06/10/2026 (era "guia"),
nas duas comunidades desde 21/10/2026, e o botão de envio diz o que se envia. Fora da aula, a missão
de envio diz **Envie um projeto** e o painel das tarefas do Pensa continua **Guia do Pensa**.
