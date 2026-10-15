# Proposta: a criança entra pelo aparelho autorizado

Análise de 10/10/2026. Proposta aprovada para implementação. Ainda no mesmo dia, antes da produção, a entrada da criança passou de "Eu sou aluno" para **Eu sou criador(a)** e o botão dos pais para **Ir para a área da criança** (a área da criança não fala a língua da escola). A publicação depende da entrega conjunta de Auth, Gateway, Members, Kids e das orientações de acesso.

A prioridade considerada é o uso no mesmo computador. Outros aparelhos são possíveis, mas ocasionais. O objetivo é tirar a dependência diária dos pais sem compartilhar a senha do responsável e sem exigir e-mail da criança.

## Recomendação

O responsável autoriza um computador **para um perfil específico de criança**. A criança usa um código para conectá-lo e, nas próximas visitas, entra pelo próprio perfil. Cada combinação de navegador e perfil tem um prazo e pode ser encerrada separadamente.

O código serve para **conectar**, não para ser digitado em toda aula. Um código já utilizado não conecta outro aparelho.

## Como ficaria para a família

1. Na área dos pais, abrir **Acesso nos aparelhos** dentro do perfil escolhido.
2. Autorizar aquele perfil naquele computador. Se os irmãos compartilham o aparelho, criar uma autorização separada para cada um.
3. Dar um nome ao acesso, como **Computador de casa**, e escolher o prazo.
4. Selecionar **Este computador** ou **Outro computador**, inclusive pelo celular do responsável. No primeiro caso, confirmar em **Liberar este computador**; no segundo, usar **Gerar código**.
5. A criança escolhe **Eu sou criador(a)**, digita o código uma vez e acessa o perfil autorizado.
6. Nas próximas visitas, vê **Continuar como André**. Na troca de perfil, a tela **Quem vai criar hoje?** permite escolher outra criança da família. Uma autorização válida abre o perfil; uma autorização ausente ou vencida leva ao código daquele perfil.

Não é preciso criar outra conta, outro e-mail ou outra senha. O acesso utiliza os perfis existentes e preserva a atribuição do progresso já registrado na plataforma.

O responsável ainda participa da primeira autorização, das renovações e da recuperação quando o navegador perde o acesso. Ele deixa de ser necessário a cada aula.

## Um acesso para cada aparelho e perfil

Exemplo de como o painel poderia aparecer:

| Aparelho | Quem pode estudar | Prazo escolhido | Controle |
| --- | --- | --- | --- |
| Computador de casa | André | 90 dias | Encerrar acesso |
| Computador de casa | Débora | 30 dias | Encerrar acesso |
| Notebook da avó | André | 7 dias | Encerrar acesso |

Encerrar o acesso do André no computador de casa não encerra o da Débora nesse computador, nem o do André no notebook da avó. O painel mostra a validade e o último uso de cada autorização, sem exibir códigos já consumidos.

A unidade de controle é **um perfil + um navegador**. Ver o nome de outro perfil na seleção não concede acesso a ele. Cada entrada confere a autorização específica. Não existe uma autorização infantil genérica para todos os perfis da conta.

Tecnicamente, a conexão pertence ao **navegador**, não ao equipamento físico. Chrome e Edge no mesmo computador são conexões diferentes. Fechar e reabrir o navegador mantém o acesso dentro do prazo; limpar os dados, usar navegação anônima ou trocar de navegador pode exigir uma nova autorização. Não proponho identificar o aparelho por IP ou por características que mudam com atualizações.

## Duas entradas claras na tela de login

A tela inicial pergunta **Como você quer entrar?** e oferece:

- **Eu sou responsável** — “Acesse sua conta para cuidar dos perfis e acompanhar as crianças.” Permite entrar com senha ou código enviado ao e-mail e leva diretamente à área dos pais. Dentro do Kids, essa sessão dá acesso à área adulta, sem abrir uma sessão de aluno ao clicar no perfil que está sendo gerenciado. Se o responsável chegou por um link de compra, recuperação de senha ou ativação da conta, o fluxo preserva um destino válido para esse público.
- **Eu sou criador(a)** — “Entre no seu perfil para continuar suas aventuras.” Em navegador novo, mostra **Digite o código que seu responsável preparou** e **Entrar**. Em navegador já autorizado, oferece continuar no perfil. Na seleção de outra criança, uma autorização válida permite entrar; se ela estiver ausente ou vencida, pede o código correspondente.

Se o aluno abrir diretamente uma fase e já tiver acesso válido, não deve ser obrigado a passar pela escolha de público novamente. Se precisar entrar, o destino da fase é preservado e conferido contra redirecionamentos externos.

Um código infantil nunca é aceito como autenticação do responsável. O código por e-mail da conta adulta, que já existe, deve ter nome e explicação distintos do código de conexão do aluno.

O gerenciamento fica em **Área dos pais → perfil da criança → Acesso nos aparelhos**. Gerar código, renovar prazo ou encerrar acesso exige autenticação do responsável. A criança pode usar e desconectar seu acesso; não pode autorizar novos aparelhos nem aumentar o prazo.

A entrada por senha e a entrada por código de e-mail precisam produzir a mesma sessão adulta válida. O atual portão interno que pede senha será revisto junto com a separação: não faz sentido validar um código de e-mail no login e pedir senha novamente apenas para abrir a área dos pais. Ações sensíveis continuam exigindo autenticação recente conforme a política definida no servidor. Ativação inicial da conta, definição de senha e recuperação também precisam ser conferidas para não deixar um caminho incompatível com o outro.

## Alternância entre aluno e responsável

O menu da criança passa a ter ações distintas:

- **Trocar de perfil:** usa o nome atual desse botão e abre somente a seleção de crianças. Não abre a gestão dos pais.
- **Área dos pais:** é um atalho para o login do responsável. Não reutiliza uma autorização adulta que ficou aberta antes de entregar o computador à criança.
- **Sair:** pede confirmação para encerrar a sessão e a autorização daquele perfil naquele navegador. Explica: “Para entrar de novo neste perfil, você vai precisar de outro código.” Não afeta os irmãos nem aparelhos diferentes. Fechar a página ao terminar uma aula mantém a autorização, dentro do prazo escolhido. O “Sair” da área dos pais encerra a sessão adulta; as autorizações infantis continuam sob o controle de “Acesso nos aparelhos”.

Na área dos pais, **Ir para a área da criança** inicia a escolha da criança. A sessão de responsável termina quando a troca é concluída. O sistema valida a autorização do perfil naquele navegador antes de emitir a sessão infantil. Se ainda não existir, o responsável pode prepará-la na própria área dos pais; a simples escolha de um perfil não cria uma autorização implícita.

| Situação | Resultado esperado |
| --- | --- |
| Responsável entra por senha ou código de e-mail | Abre diretamente a área dos pais |
| Aluno informa um código válido | Conecta aquele navegador ao perfil do código e abre a área da criança |
| Aluno volta no navegador autorizado | Continua no próprio perfil sem novo código |
| André escolhe Débora, com autorização válida para ela nesse navegador | Entra no perfil da Débora usando o prazo e as permissões dela |
| André escolhe Débora, sem autorização válida para ela | Pede o código da Débora; não usa a autorização do André |
| Aluno escolhe “Área dos pais” | Abre o login do responsável |
| Responsável escolhe “Ir para a área da criança” | Confere a autorização da criança, encerra o contexto adulto e abre o infantil |
| Aluno abre diretamente o endereço da área dos pais | Exige login do responsável; a API também recusa o acesso infantil |
| Responsável abre diretamente uma fase no Kids | Orienta a mudança para aluno; a sessão adulta não começa a estudar em nome da criança |

Na troca de perfil, a lista deve pertencer somente à própria família e expor apenas nome, avatar e indicação necessária de acesso. O servidor precisa reconhecer o contexto da família antes de entregá-la. Num navegador novo, ou sem prova válida desse contexto, a tela pede código e não expõe uma lista de crianças. Depois que todas as autorizações expirarem, o aplicativo pode pedir código diretamente. Não se usa e-mail digitado livremente para pesquisar perfis de uma família.

Se a pessoa escolheu Débora, um código do André ou de outra família não pode abrir um perfil diferente silenciosamente. A família e o perfil do código são conferidos no servidor. Dados pessoais e progresso dos outros perfis não acompanham a lista de seleção.

## Interface: telas, aparência e comportamento

O desenho parte de duas situações: o responsável organiza o acesso, muitas vezes pelo celular; a criança volta ao computador para continuar uma atividade. A interface precisa permitir reconhecer o perfil, entender o próximo passo e recuperar um acesso sem interpretar termos técnicos.

### Direção visual

- **Elementos deste produto:** avatar da criança, família, computador de casa, aventuras, continuidade da aula, criação de jogos e acompanhamento dos pais. Esses elementos orientam as telas e os exemplos.
- **Cores existentes:** azul da marca, branco dos cartões, fundo claro, tinta azul-escura, verde de confirmação e amarelo de atenção. Usar os tokens atuais da plataforma e respeitar a paleta escolhida pelo perfil; azul é a referência da entrada sem perfil. Não criar outra paleta para o login. As cores de estado vêm acompanhadas de texto e ícone.
- **Tipografia e formas:** manter Baloo 2 nos títulos, Nunito nos textos, os cartões arredondados e os botões atuais. O login já tem formulário em cartão e painel da marca no computador. Esse conjunto será adaptado às duas entradas; no celular, a tarefa principal vem primeiro.
- **Elemento que conecta as telas:** o mesmo avatar e nome da criança acompanham a escolha, a liberação do aparelho e a confirmação. Na gestão, aparecem junto de “Computador de casa” e da validade. Isso ajuda a perceber a quem cada autorização pertence.
- **Três decisões de composição:** a escolha de público usa dois cartões clicáveis com uma frase cada; a gestão apresenta aparelho e prazo dentro do perfil da criança; a criação do acesso mostra apenas os campos necessários para a opção escolhida. Informações técnicas ficam fora do caminho principal.

O Zappy pode acompanhar uma orientação curta de entrada ou recuperação. A explicação principal continua escrita, e a animação não deve atrasar o formulário, cobrir campos ou disputar atenção com a ação.

Fontes visuais conferidas: `components/kids/auth-split-shell.tsx`, `app/layout.tsx`, `app/globals.css`, `packages/ui/src/styles/theme-kids.css` e os tokens compartilhados da Comunidade. A implementação deve consumir esses componentes e tokens, sem copiar valores de cor para as novas telas.

### 1. Entrada: escolher quem vai usar

Título: **Como você quer entrar?**

Dois cartões com a mesma importância, área inteira clicável, ícone e texto:

| Escolha | Explicação |
| --- | --- |
| **Eu sou criador(a)** | Entre para continuar suas aventuras. |
| **Eu sou responsável** | Cuide dos perfis e do acesso das crianças. |

Um link discreto **Preciso de ajuda para entrar** fica disponível sem login. A escolha de público não deve ter um botão adicional “Avançar”: clicar no cartão já abre a entrada correspondente. Nas telas seguintes, **Voltar** permite corrigir uma escolha feita por engano.

Essa tela atende quem ainda precisa escolher uma entrada. Uma sessão infantil válida continua levando à aula ou à página da criança; uma sessão adulta válida continua na área dos pais. Não acrescentar uma escolha obrigatória a cada visita.

### 2. Entrada dos responsáveis

Título: **Entrada dos responsáveis**. Orientação: **Entre para cuidar dos perfis e dos acessos.**

Reutilizar os campos e os métodos existentes, com opções claras **Senha** e **Código por e-mail**. No modo senha, mostrar e-mail, senha, **Esqueci minha senha** e **Entrar**. No outro modo, mostrar e-mail e **Enviar código**; em seguida, campo do código recebido e **Entrar**. Os formulários usam rótulos visíveis, permitem colar e funcionam com gerenciadores de senha.

O sucesso abre diretamente **Área dos pais**. O cabeçalho mantém esse nome visível, com a identificação do responsável. Clicar no cartão de uma criança abre seu gerenciamento; não inicia uma aula. A navegação adulta reúne perfis, acessos e as funções adultas já existentes, com **Ir para a área da criança** como ação separada.

### 3. Entrada do aluno: primeira vez e retorno

**Sem autorização reconhecida:** título **Entrada do aluno**, orientação **Digite o código que seu responsável preparou.** Um único campo **Código de acesso**, botão **Entrar** e link **Preciso de ajuda**. Aceitar colagem, espaços e letras minúsculas; apresentar os caracteres em grupos sem exigir que a criança preencha dez campos separados.

**Com autorização válida:** avatar, nome e botão **Continuar como André**. Abaixo, **Trocar de perfil** e **Área dos pais**. O último perfil válido ganha destaque, sem esconder a possibilidade de escolher um irmão. Se uma aula já estava aberta e a sessão continua válida, retomar diretamente.

Após a primeira conexão, mostrar uma confirmação breve: **Tudo pronto, André!** e **Da próxima vez, é só escolher seu perfil. Você só vai precisar de outro código se o acesso acabar ou mudar de navegador.** Ação **Começar**. Para quem já estudava, usar **Continuar** e preservar o destino da aula; o onboarding existente não recomeça. A ajuda explica também a perda do acesso ao apagar os dados do navegador.

### 4. Troca entre crianças

Título: **Quem vai criar hoje?** Reutilizar os avatares e nomes já conhecidos, em cartões com espaço suficiente para clicar. Esta tela contém somente crianças. O atalho para os pais fica separado da grade e abre o login adulto.

- Perfil com autorização válida: o cartão permite entrar.
- Perfil conhecido sem autorização válida: mostrar **Precisa de código** e manter o cartão clicável. Ao escolher, abrir o campo com **Digite o código para entrar como Débora**, mantendo o avatar dela à vista.
- Nenhuma família reconhecida: mostrar entrada por código, sem listar nomes de crianças.

O perfil que precisa de código não fica apenas apagado ou com um cadeado sem explicação. A criança deve conseguir descobrir como continuar. O retorno à grade conserva a seleção e não obriga a repetir passos já concluídos.

### 5. Área dos pais: acesso nos aparelhos

Na página da criança, abrir **Acesso nos aparelhos**. O avatar e o nome aparecem no cabeçalho. A ação principal é **Novo acesso**.

Cada acesso mostra, nesta ordem:

> **Computador de casa**  
> Acesso do André · Liberado até 08/01/2027  
> Último uso: hoje  
> **Renovar acesso** · **Encerrar acesso**

Nome e datas acima são exemplos de apresentação, não dados reais. Quando útil para distinguir dois acessos, incluir navegador e sistema em texto secundário. Sinalizar **Este navegador** somente quando a identificação vier da credencial atual. Evitar chamar qualquer computador remoto de “este aparelho”.

O prazo aparece por extenso ou com data local clara, acompanhado de estado: **Liberado**, **Vence em breve**, **Vencido** ou **Encerrado**. Um acesso encerrado não é reativado como se ainda fosse uma credencial confiável: oferecer **Novo acesso**. Renovar um acesso reconhecido altera o prazo daquele vínculo, sem ampliar o dos irmãos.

Quando ainda não há autorização, mostrar **Prepare o acesso de André** e **Libere um computador para ele estudar sem precisar da sua senha.** Botão **Novo acesso**. Não preencher o vazio com uma tabela sem linhas.

No celular, apresentar os acessos em cartões, com ações acessíveis por toque. Se houver vários filhos, o seletor entre eles mantém avatar e nome visíveis. Também permitir editar o nome do aparelho para a família reconhecer cada acesso.

### 6. Preparar e renovar um acesso

Dentro do perfil escolhido, **Novo acesso** abre uma página curta. No celular, usar a largura disponível, sem empilhar janelas sobre o painel.

1. **Onde [nome] vai estudar?** Opções **Este computador** e **Outro computador**. Se o responsável estiver no celular, destacar **Outro computador** e explicar: **Prepare aqui o código para o computador da criança.** Autorizar login não significa que as ferramentas do curso passem a funcionar no celular.
2. **Nome do aparelho**, com exemplo **Computador de casa**, e **Por quanto tempo?**, com as opções propostas: **Somente hoje**, **7 dias**, **30 dias** e **90 dias**. A recomendação de 90 dias vem com **Para o computador de casa**. Mostrar a data de término antes de confirmar.
3. Um resumo compacto identifica criança, aparelho e prazo. A ação final é **Liberar este computador** ou **Gerar código**, conforme a escolha anterior.

Os itens acima são a ordem do formulário, não três telas obrigatórias. A opção de aparelho determina os campos e a ação final. O perfil já escolhido não precisa ser selecionado novamente.

Para outro computador, o resultado mostra o avatar, o código legível, **Copiar código**, validade do código e a instrução **No computador da criança, abra a plataforma, escolha Eu sou criador(a) e digite este código.** Exibir o endereço correto do ambiente como link para copiar. Explicar perto da validade: **Depois de usar o código, o acesso dura pelo prazo que você escolheu.** O tempo de 10 minutos pertence ao código, não ao tempo de estudo.

Para o computador atual, a confirmação diz **Este navegador está liberado para André até [data].** A ação **Ir para a área da criança** conclui a troca segura de sessão. A liberação, por si só, mantém o responsável em sua própria área até ele escolher essa ação.

**Renovar acesso** apresenta o perfil, o aparelho, o prazo atual e a nova data. **Encerrar acesso** pede confirmação com o efeito exato: **André vai precisar de outro código para entrar neste navegador. Os trabalhos salvos na conta continuam guardados.** A ação se aplica somente ao vínculo exibido.

### Estados que também fazem parte do desenho

| Situação | Resposta da interface |
| --- | --- |
| Conferindo código ou trocando perfil | Manter nome e avatar; mostrar “Entrando…”; impedir envio duplicado |
| Código não aceito | “Não conseguimos usar esse código. Confira o que digitou ou peça um novo ao seu responsável.” Conservar o campo para correção e oferecer ajuda |
| Código expirou no painel do responsável | Mostrar “Este código venceu” e “Gerar outro código”; manter perfil, aparelho e prazo escolhidos |
| Autorização reconhecida, mas vencida | “Seu acesso neste navegador venceu. Peça ao seu responsável para renovar.” Oferecer verificar novamente e entrar com novo código; não tratar como erro de senha |
| Acesso encerrado | Pedir novo código com uma orientação curta; não oferecer renovação infantil |
| Sem internet ou resposta inconclusiva | “Não conseguimos conectar agora. Confira a internet e tente de novo.” Preservar os campos e não apresentar sucesso antes da confirmação |
| Troca realizada em outra aba | Informar “O perfil mudou em outra aba” e revalidar; não continuar salvando em nome do perfil anterior |
| Saída do aluno | Confirmar o encerramento daquele perfil neste navegador, explicar a necessidade de outro código e oferecer cancelar |

Evitar mostrar detalhes de outra criança quando um código falha. Diferenciar problemas de conexão de problemas de credencial. Quando uma tentativa chegou ao servidor, mas a resposta se perdeu, a repetição precisa recuperar o estado daquela tentativa com segurança, sem duplicar autorizações ou afirmar que nada aconteceu.

### Navegação, acessibilidade e conferência visual

A gestão adulta precisa de rota e layout próprios, por exemplo **/pais**, enquanto **/perfis** fica com a seleção infantil. Os endereços são uma proposta de organização; o contrato final deve preservar links existentes e conferir os retornos após login. A implementação não deve manter a separação apenas em um modo visual da atual página de perfis.

Todas as ações terão estados de foco, passagem do mouse, pressão, carregamento e indisponibilidade. Campos terão rótulos visíveis; os erros serão associados ao campo e anunciados por leitores de tela. Os cartões serão botões ou links acessíveis por teclado, com foco nítido. Ícones e cores complementam o texto.

Conferir largura de 320 px, celular usual, tablet e computador, além de zoom a 200%, nomes longos e diferentes quantidades de filhos. Manter alvos de toque confortáveis, de pelo menos 44 px nas ações principais, e suporte a movimento reduzido. O teclado do celular não pode cobrir a ação de confirmar. Não depender de passar o mouse para descobrir o que fazer.

A validação deve percorrer as telas completas: responsável no celular autorizando outro computador; responsável no computador preparando a entrega à criança; criança retornando no dia seguinte; troca entre irmãos; recuperação de acesso vencido. Comparar as novas telas com a identidade atual e verificar se cada uma deixa claro quem está usando a plataforma e qual ação pode realizar.

Esta seção define a interface proposta. As telas novas ainda não foram implementadas nem validadas visualmente em um navegador.

## Uma regra de acesso para todos os caminhos

Dentro do Kids, a sessão ativa tem um contexto explícito: **responsável** ou **aluno**. A sessão de aluno também carrega o vínculo verificável com a autorização de um perfil naquele navegador. O parâmetro da página e a opção clicada no login não são prova de permissão.

- A autorização é conferida nas páginas, nas APIs, na renovação da sessão, na troca de perfil e nos acessos a arquivos protegidos. O backend mantém uma regra comum, em vez de depender de botões escondidos ou de exceções espalhadas.
- A sessão infantil não herda os poderes administrativos ou financeiros do responsável. A identidade da conta serve para resolver vínculo e compras da família, com permissões limitadas ao contexto correto.
- A renovação conserva o tipo da sessão, o perfil, o navegador e o prazo. Um perfil arquivado encerra o acesso infantil, sem transformá-lo em acesso adulto.
- O encerramento de uma autorização bloqueia os próximos pedidos protegidos, mesmo se o token de acesso ainda não chegou à própria expiração.
- O vínculo persistente do aparelho é separado da sessão ativa. Entrar na área dos pais não deve obrigar a gerar novamente todos os códigos da família; voltar ao aluno encerra a sessão adulta e aproveita somente autorizações infantis ainda válidas.
- Existe um contexto ativo por navegador. Se a pessoa alternar entre pai e aluno, as outras abas revalidam e deixam de mostrar ou usar o contexto antigo. Operações e salvamentos em andamento não podem ser atribuídos ao irmão que acabou de entrar.
- A interface só confirma a troca quando o servidor a conclui. Erro de rede não produz uma tela de aluno acompanhada de uma sessão de responsável, nem o inverso.
- Os redirecionamentos aceitam apenas destinos internos adequados ao público autenticado. Um link antigo não pula a seleção e a verificação do acesso.

A separação será aplicada ao Kids sem bloquear, por acidente, outros produtos do Sistema Zero que também usam a autenticação compartilhada. A comunidade de adultos e o Admin precisam continuar respeitando suas próprias permissões.

Também haverá um tratamento explícito para as sessões antigas. Na ativação do novo fluxo, uma sessão antiga sem contexto explícito não vira automaticamente uma autorização de 90 dias nem um acesso adulto aberto. Ela é encaminhada à nova entrada, e a família prepara o acesso uma vez. Uma autorização nova já concluída pode ser aproveitada. A publicação deve avisar sobre essa transição e preservar os dados e o trabalho salvo, sem recriar perfis ou reiniciar cursos. Esse comportamento será validado em staging com contas antigas e novas antes da liberação para as famílias.

## Prazo do código e prazo do acesso

São duas coisas distintas:

- **Código de conexão:** gerado automaticamente, utilizado uma única vez, válido por 10 minutos. Podemos aproveitar o formato legível de 10 caracteres do Missão Saber, dividido em dois grupos, aceitando colagem, letras minúsculas e espaços.
- **Acesso para estudar:** começa quando a conexão é concluída e dura o período escolhido pelo responsável.

Minha sugestão de produto é oferecer **7, 30 ou 90 dias**, recomendando **90 dias para o computador de casa**. Para computador emprestado, incluir **Somente hoje**, com horário de encerramento informado. Esses valores são uma proposta para o nosso uso, não uma recomendação universal de segurança.

O prazo não se prolonga sozinho a cada visita. A área dos responsáveis avisa antes do vencimento e oferece uma renovação simples. A renovação deve atualizar tanto a autorização no servidor quanto a credencial do navegador; precisamos testar esse fluxo sem prometer recuperação remota se os dados do navegador já tiverem sido apagados.

Se o acesso vencer ou for encerrado, a criança vê uma explicação curta e o trabalho local deve ser preservado quando possível. A autorização vencida não pode continuar sendo usada para acessar o servidor.

O prazo do aparelho **não muda a duração do curso ou da assinatura**. O acesso ao conteúdo continua seguindo a compra da família.

## O que encontrei no Missão Saber

O código local já implementa:

- Código aleatório de 10 caracteres, com validade de 10 minutos e uso único.
- Conexões separadas por aparelho/navegador, com nome e perfis autorizados.
- Acesso temporário de até 12 horas ou acesso lembrado por 30 dias.
- Encerramento individual pelo responsável.
- Verificação da autorização no servidor, credenciais armazenadas como hashes e limite de tentativas.
- Encerramento da sessão adulta no navegador antes de abrir o acesso de estudo.

Não encontrei uma escolha livre de quantidade de dias. A opção atual é lembrar por 30 dias ou usar o acesso temporário. Também não é um código reutilizado diariamente.

Referências locais: [política de acesso](C:/Users/tocha/projects/informach-apps/apps/missao-saber/src/features/study-access/policy.ts), [conexões e códigos](C:/Users/tocha/projects/informach-apps/apps/missao-saber/src/features/study-access/repository.ts), [painel de aparelhos](C:/Users/tocha/projects/informach-apps/apps/missao-saber/src/features/study-access/device-manager.tsx) e [troca da sessão adulta para estudo](C:/Users/tocha/projects/informach-apps/apps/missao-saber/src/features/study-access/http.ts).

Analisei a implementação e os testes existentes no código. Não executei a suíte do Missão Saber nem confirmei a versão publicada desse aplicativo.

## Alternativas consideradas

| Opção | Vantagem | Limitação para este caso | Minha avaliação |
| --- | --- | --- | --- |
| Código usado uma vez e aparelho autorizado | A criança volta a estudar sem digitar credenciais; cada aparelho tem controle próprio | Um navegador novo ou apagado precisa de autorização | Melhor opção inicial |
| Código reutilizado em toda entrada | Dispensa e-mail e funciona em vários aparelhos | Continua exigindo digitação; funciona como uma senha e pode ser repassado | Não adotaria como padrão |
| Nome de usuário e senha próprios | Mais independência em aparelhos novos; não exige necessariamente e-mail | Cria mais uma credencial para lembrar e recuperar | Pode ser considerado se mudar o padrão de uso |

QR code pode ser uma alternativa futura para conectar aparelhos. Não faria dele uma exigência, pois o computador pode não ter câmera ou a família pode preferir copiar o código.

## O que a pesquisa externa acrescentou

O Code.org oferece palavras secretas para alunos que ainda não têm e-mail pessoal. Isso confirma que uma identidade infantil não precisa ter e-mail próprio, embora a digitação de uma credencial continue existindo nesse modelo. [Documentação do Code.org](https://support.code.org/hc/en-us/articles/115000488132-Creating-a-Class-Section).

O ClassDojo oferece entrada em casa por QR individual e link individual, inclusive com apoio da conta do responsável. É uma referência de acesso infantil administrado por um adulto. Não estou propondo copiar o funcionamento de turmas ou expor uma lista pública de crianças. [Documentação do ClassDojo](https://help.classdojo.com/hc/en-us/articles/360009869032-How-Students-can-Log-into-ClassDojo-at-Home).

A RFC 8628 descreve autorização de aparelhos e discute códigos legíveis, duração limitada e proteção contra tentativas repetidas. É uma referência para essas decisões de segurança; o fluxo proposto aqui não é uma implementação literal desse protocolo OAuth. [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628).

A OWASP recomenda controlar expiração e encerramento no servidor e renovar a autenticação em ações sensíveis. No nosso caso, isso fundamenta o prazo real do acesso, o encerramento pelo responsável e a proteção da área dos pais. A escolha específica de 90 dias é uma decisão de produto a validar, não um prazo prescrito pela OWASP. [Gestão de sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) e [autenticação](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

## Adaptações necessárias no Sistema Zero

O Sistema Zero já possui perfis infantis e uma autenticação própria. O Missão Saber usa outra estrutura de autenticação. Podemos aproveitar o conceito e os cuidados do fluxo, mantendo a infraestrutura atual do Sistema Zero.

A implementação envolve código, banco e interface. Não basta adicionar um campo de código na tela de login.

1. **Criar uma autorização de estudo por conexão e perfil.** Ela identifica o responsável, um perfil específico, o navegador autorizado, o prazo e o encerramento. Cada código temporário autoriza essa combinação uma vez, de forma atômica, inclusive se duas tentativas chegarem juntas. Se dois irmãos usam o mesmo navegador, são duas autorizações independentes.
2. **Preservar essa autorização em todas as trocas e renovações.** Trocar de perfil ou renovar a sessão não pode ampliar o prazo, incluir um irmão não autorizado ou eliminar a restrição infantil.
3. **Manter a área adulta fechada.** O acesso da criança não autoriza compras, dados financeiros, gestão da família ou alterações de segurança. No navegador compartilhado, é necessário encerrar a sessão adulta e fechar a autorização temporária da área dos pais antes de entregar o acesso à criança.
4. **Encerrar quando a autorização deixa de valer.** Revogação e vencimento precisam impedir novos pedidos autorizados, inclusive quando ainda existe um token de acesso dentro da validade. Só apagar cookies ou esperar a próxima renovação é insuficiente para prometer esse comportamento.
5. **Revisar os caminhos já existentes.** Hoje, a renovação pode retornar ao contexto da conta se o perfil foi arquivado ou desapareceu. No novo acesso infantil, essa situação deve encerrar a sessão. A seleção atual também permite alternar entre os perfis da família; no acesso por aparelho, deve respeitar apenas os perfis autorizados para ele.

Esses pontos são conclusões da leitura do código, não o resultado de um teste de invasão em produção. Referências: [renovação da sessão](C:/Users/tocha/projects/sistema-zero/packages/auth/src/application/refresh/refresh.service.ts:97), [seleção de perfil](C:/Users/tocha/projects/sistema-zero/packages/auth/src/application/profiles/select-profile.service.ts) e [proteção da área dos pais](C:/Users/tocha/projects/sistema-zero/packages/community-kids/src/server/parent-gate.ts:126).

As credenciais devem ser aleatórias, armazenadas somente como hashes, protegidas por cookies seguros e nunca incluídas nos logs. As tentativas de conexão precisam de limites e mensagens que não revelem dados da criança. O vínculo do responsável continua sendo necessário para autorizar ou encerrar acessos.

Quem tiver acesso ao navegador desbloqueado e autorizado poderá abrir os perfis liberados nele. Essa é a contrapartida da entrada sem senha diária; por isso o acesso persistente é destinado ao computador de confiança da família.

O login deve manter o perfil usado pelo salvamento e pela sincronização existentes. O Pinta tem armazenamento local e sincronização na nuvem por perfil; a integração mostra **Guardado na sua conta** quando confirma o envio. A troca de login precisa preservar esse vínculo, sem misturar os arquivos dos irmãos e sem prometer que um rascunho ainda não sincronizado aparecerá em outro aparelho. Referência: [integração do Pinta com a nuvem](C:/Users/tocha/projects/sistema-zero/packages/community-kids/src/components/kids/pinta-client.tsx:81).

## Integração com o primeiro acesso e com a ajuda

A mudança precisa ser entregue com as orientações que ensinam o fluxo. O levantamento identificou estes pontos:

| Parte da plataforma | Atualização necessária | Fonte atual |
| --- | --- | --- |
| Login e retornos após autenticar | Separar responsável e aluno, respeitar o destino de entrada e a sessão já existente | `packages/community-kids/src/app/(auth)/login/` e `packages/community-kids/src/proxy.ts` |
| Área dos pais e grade de perfis | Separar gestão adulta da seleção infantil; configurar por perfil e navegador; exigir código quando o perfil escolhido não tiver autorização válida | `packages/community-kids/src/app/perfis/perfis-client.tsx` e `page.tsx` |
| Menu do avatar e alternância | “Trocar de perfil” somente para crianças; “Área dos pais” como atalho para o login adulto; retorno explícito ao aluno | `packages/community-kids/src/components/kids/user-menu.tsx` e fluxos de sessão |
| Proteção da área dos pais | Fazer senha e OTP do responsável abrirem a área correta, revendo o portão antigo e a saída de perfil | `packages/community-kids/src/server/parent-gate.ts`, `app/api/parents/verify/route.ts` e Auth |
| Onboarding dos pais | Criar ou escolher perfil → preparar acesso no computador → confirmar a conexão. O guia só avança quando a etapa existe de fato | `packages/community-kids/src/lib/guide.ts` e a tela de perfis |
| Onboarding da criança | Explicar como voltar ao próprio perfil; continuar o tutorial atual do ponto certo após a conexão | `packages/community-kids/src/components/kids/child-guide.tsx` e `lib/guide.ts` |
| Ajuda “Como fazer” | Atualizar troca de perfil e retorno à fase; acrescentar entrada com código e solução de problemas de acesso | `docs/como-fazer/como-fazer.json` e publicação pelo Admin |
| Ajuda antes de entrar | Disponibilizar orientações de acesso mesmo sem sessão. Hoje o “Como fazer” exige login | Login, páginas de ajuda de entrada e configuração do proxy |
| Zappy | Fazer as respostas e referências usarem os tutoriais atualizados | Conteúdo publicado do “Como fazer”, consultado por `packages/member-shell/src/server/zappy-ai.ts` |
| Mensagens de primeiro acesso | Revisar os destinos e as orientações para o responsável preparar o acesso do filho | `packages/messaging/scripts/seed-templates.ts` e os modelos publicados |
| Guias, prints e vídeos de ajuda | Atualizar rótulos, imagens e trechos que mostram o login antigo ou uma troca de perfil sem autorização | `docs/aulas-interativas-tecnico/REFERENCIA-PLATAFORMA.md`, materiais de ajuda e mídias associadas |
| Testes e acompanhamento | Conferir ambos os públicos, retomada do onboarding e uso diário sem nova ajuda | Testes de onboarding, login e eventos de `community-kids` |

O onboarding dos pais atualmente termina orientando a clicar no perfil. Ele precisa passar a orientar a autorização do aparelho antes da entrega para a criança. Para famílias que já usam a plataforma, apresentar somente o novo passo necessário, sem obrigar a criar outro perfil. A versão do guia de acesso deve ser tratada separadamente para não reiniciar as etapas de avatar e primeira fase que a criança já concluiu.

A ajuda infantil usa textos curtos e os nomes reais dos botões. Os procedimentos de gerar código, renovar e encerrar acesso ficam nas orientações da área dos pais. Os tutoriais infantis explicam o que a criança consegue fazer e quando precisa de ajuda, sem pedir a senha dos pais.

Os conteúdos mínimos são:

1. **Como entrar com meu código** — escolher “Eu sou criador(a)”, informar o código e reconhecer o próprio perfil.
2. **Como voltar às minhas aventuras** — abrir no navegador autorizado e continuar no próprio perfil.
3. **Como escolher ou trocar meu perfil** — atualizar o tutorial existente `plataforma-trocar-de-perfil`, mostrando a seleção entre crianças e a solicitação de código quando o perfil escolhido não tiver autorização válida.
4. **Não consegui entrar** — orientar sobre código vencido ou já utilizado, acesso encerrado e navegador diferente. Essa ajuda precisa ser acessível antes do login.
5. **Como preparar o acesso da criança** — guia dos pais para escolher perfil, aparelho e prazo.
6. **Como renovar ou encerrar um acesso** — guia dos pais com exemplo de dois perfis no mesmo computador.

Essa entrega inclui atualizar e **publicar o conteúdo em cada ambiente**. Alterar apenas o JSON no repositório não atualiza o que a criança lê: o importador atual grava rascunhos e a publicação é uma etapa própria. As mídias de cada ambiente devem ser preservadas, os prints afetados precisam ser refeitos e os links existentes devem continuar funcionando. O mesmo cuidado vale para os modelos de mensagem armazenados no banco. Referência: [publicação do Como fazer](C:/Users/tocha/projects/sistema-zero/docs/como-fazer/README.md).

A revisão alcança os materiais que explicam acesso, perfis e entrada na plataforma. Cada ocorrência deve ser avaliada no contexto: o e-mail continua correto na contratação e na conta do responsável; a criança passa a receber a orientação de acesso por aparelho. Vídeos que precisarem de nova gravação devem ser identificados por trecho, e só podem ser considerados atualizados quando a nova mídia estiver pronta e publicada.

## Primeira entrega e validação

Eu começaria com autorização por aparelho e perfil, separação entre responsável e aluno no login, código de conexão, entrada pelo perfil, escolha de prazo e painel na área dos pais. Os ajustes de segurança, o aviso de vencimento, o onboarding e os conteúdos de ajuda publicados fazem parte dessa primeira entrega. PIN, e-mail infantil e QR obrigatório ficam fora dela.

Antes da liberação, testar:

- Fechar e reabrir o navegador e voltar no dia seguinte sem ajuda do responsável.
- Conectar outro navegador com outro código; recusar um código já usado.
- Encerrar o acesso de um perfil em um aparelho sem afetar o irmão no mesmo aparelho ou o próprio perfil em outro aparelho.
- Escolher um irmão com acesso válido e entrar; escolher um irmão sem autorização ou com prazo vencido e receber a solicitação do código correto. Cada entrada assume o prazo do perfil escolhido.
- Recusar entrada na área adulta por endereço direto ou chamada ao servidor.
- Preservar restrições após renovação, troca de perfil, expiração e arquivamento.
- Fechar o acesso adulto também em abas antigas quando o aparelho passa à criança.
- Renovar o prazo e testar o que acontece se o navegador ficar dias sem abrir.
- Preservar o trabalho possível quando o acesso vencer durante uma atividade.
- Completar os caminhos de responsável e aluno, partindo tanto do login quanto de um link direto para uma fase.
- Retomar o onboarding de uma família antiga sem repetir a criação do perfil ou reiniciar conquistas da criança.
- Conferir a ajuda antes do login, os tutoriais publicados, as respostas do Zappy e os links de primeiro acesso em staging e produção.
- Entrar como responsável por senha e por OTP de e-mail, chegando diretamente à área dos pais nos dois casos.
- Impedir que a sessão adulta abra a área de aluno sem uma troca válida de contexto; impedir o caminho inverso sem autenticação adulta.
- Recusar um código que não pertença ao perfil escolhido, sem revelar dados de outra criança ou família.
- Alternar em uma aba e conferir as demais, incluindo salvamento em andamento, botão Voltar do navegador e páginas guardadas em cache.
- Migrar contas e sessões antigas sem recriar perfis, estender prazos silenciosamente ou reabrir a área dos pais pela lógica antiga.

Depois, acompanhar um grupo pequeno de famílias: quantas crianças conseguem retornar sem ajuda, onde erram o código e quantas voltam a depender dos pais por expiração ou perda da conexão. A hipótese é reduzir essa barreira de entrada; o efeito real sobre continuidade no curso precisa ser medido.
