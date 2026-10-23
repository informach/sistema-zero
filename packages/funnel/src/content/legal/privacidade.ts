// Política de Privacidade ÚNICA do Sistema Zero (decisão da dona, 19 e 20/10/2026): uma parte
// geral, válida para todos os produtos, um capítulo para crianças e adolescentes (Desafio do
// Primeiro Jogo e Comunidade dos Criadores Kids) e um capítulo para adultos na Comunidade dos
// Criadores. A redação reaproveita `legal-kids.ts` (PRIVACIDADE_KIDS) e `legal.ts` (PRIVACIDADE
// do No Comando da IA). Fundamentos:
//   • LGPD (Lei nº 13.709/2018): art. 14 (crianças e adolescentes), art. 18 (direitos do
//     titular) e art. 33 (transferência internacional);
//   • ECA (Lei nº 8.069/1990) e ECA Digital (Lei nº 15.211/2025): privacidade desde a concepção
//     e por padrão, conta vinculada ao responsável, vedação a perfilamento e publicidade
//     comportamental dirigidos a crianças;
//   • Resolução CONANDA nº 163/2014: comunicação sempre dirigida aos pais;
//   • Marco Civil da Internet (Lei nº 12.965/2014) e CDC.
// Os parágrafos de métricas vêm de `legal-analytics.ts`, fonte única do comportamento real da
// coleta. Ao citar uma seção pelo número, confira a numeração abaixo.

import { EMPRESA, type LegalDoc } from '../legal'
import { ANALYTICS_PRIVACY_PARAGRAPHS } from '../legal-analytics'

/** Caminho público da Política única; os Termos de cada oferta apontam para ele. */
export const POLITICA_PRIVACIDADE_PATH = '/privacidade'

const DESAFIO = 'Desafio do Primeiro Jogo'
const COMUNIDADE = 'Comunidade dos Criadores'

export const PRIVACIDADE: LegalDoc = {
  titulo: 'Política de Privacidade',
  descricao: `Como a ${EMPRESA.razaoSocial} trata os dados pessoais em todos os produtos do Sistema Zero, com proteção reforçada para crianças e adolescentes, em conformidade com a LGPD, o ECA e o ECA Digital.`,
  atualizadoEm: '23 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Do objeto e do alcance',
      paragrafos: [
        `Esta Política descreve como a ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj} ("Empresa", "nós"), coleta, utiliza, armazena e protege os dados pessoais de quem acessa os sites do Sistema Zero, responde aos nossos diagnósticos e contrata ou utiliza os nossos produtos digitais ("Produtos"):`,
      ],
      bullets: [
        `${EMPRESA.produto}: ebook e kit prático para adultos, com pagamento único;`,
        `${DESAFIO}: trilha guiada para crianças e adolescentes, contratada por um adulto responsável, com pagamento único e 30 (trinta) dias de acesso;`,
        `${COMUNIDADE} Kids: assinatura mensal ou anual da área infantil da plataforma, contratada por um adulto responsável para até 2 (dois) perfis de crianças ou adolescentes;`,
        `${COMUNIDADE} (área adulta): assinatura mensal ou anual da área adulta da plataforma, contratada por uma pessoa maior de 18 anos para uso próprio.`,
      ],
      posBullets: [
        `Os Produtos infantis são vendidos a um adulto responsável (pai, mãe ou responsável legal), que é quem contrata, cria a conta e acompanha o uso. A criança ou o adolescente é a pessoa que aprende e cria dentro da plataforma. O ${EMPRESA.produto} e a área adulta da ${COMUNIDADE} são destinados a maiores de 18 anos.`,
        `As seções 1 a 12 valem para todos os Produtos. O capítulo "Crianças e adolescentes" (seções 13 a 17) trata da proteção reforçada aplicável aos Produtos infantis, e o capítulo "Adultos na ${COMUNIDADE}" (seções 18 a 21) trata do uso da área adulta.`,
        'Ao acessar os sites e fornecer dados, você declara ter lido e compreendido esta Política, que é regida pela Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018), pelo Estatuto da Criança e do Adolescente (Lei nº 8.069/1990), pela Lei nº 15.211/2025 (ECA Digital), pelo Marco Civil da Internet (Lei nº 12.965/2014) e pelas demais normas aplicáveis.',
      ],
    },
    {
      titulo: '2. Encarregado pelo tratamento de dados',
      paragrafos: [
        `A Empresa mantém um encarregado pelo tratamento de dados pessoais (DPO), canal de comunicação entre a Empresa, você e a Autoridade Nacional de Proteção de Dados (ANPD). Fale com o encarregado pelo e-mail ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '3. Quais dados coletamos',
      paragrafos: [
        'Coletamos apenas o necessário, separado por quem fornece os dados e por finalidade:',
      ],
      bullets: [
        'Do comprador ou responsável: nome, e-mail e telefone (informados no pré-checkout); CPF e dados de pagamento necessários para processar a compra; na assinatura paga com cartão de crédito, também a data de nascimento e o endereço, que o processador de pagamentos exige para a cobrança recorrente; e as respostas do diagnóstico, quando ele é oferecido. Nos Produtos infantis, o diagnóstico é respondido pelo adulto sobre o perfil de interesse da criança.',
        `Do usuário adulto da área de membros: os dados da conta (nome, e-mail e telefone) e o progresso nos cursos. Na ${COMUNIDADE}, também o nome escolhido para aparecer na comunidade, o avatar, o progresso nas etapas da Jornada, as criações feitas na plataforma (como jogos, desenhos, modelos 3D e planos do Pensa), as mensagens publicadas no Clube e no Mural, os recados enviados à nossa equipe e as preferências de perfil público e de voz, conforme o capítulo "Adultos na ${COMUNIDADE}".`,
        'Da criança ou do adolescente (aluno): nome ou apelido de exibição, a data de nascimento, que o responsável informa ao criar o perfil (obrigatória, usada para conferir a faixa etária do perfil, mostrar a idade à equipe e avisar o responsável quando o perfil completa 18 anos), progresso nos cursos e na Jornada do Criador, as criações feitas por ela na plataforma (por exemplo, o jogo montado no Estúdio) e, na Comunidade dos Criadores, as mensagens publicadas no Clube dos Criadores e as atividades enviadas para revisão da equipe. Pedimos que o responsável evite inserir dados desnecessários da criança (como documentos ou endereço) nos campos livres.',
        'Fala, somente quando a opção de voz é ligada (pelo responsável, no perfil da criança, ou pelo próprio usuário adulto, no seu perfil): a opção vem desligada, e a gravação vai a um provedor de transcrição só para virar texto, sem ser guardada pela Empresa, conforme as seções 15 e 21.',
        'No programa de convites e presentes: os dados que o responsável informa para resgatar um presente (nome, e-mail e, se quiser, telefone); o e-mail que o embaixador informa para enviar um convite; e a chave Pix que o embaixador cadastra para receber o agradecimento por indicação. O painel do embaixador registra os resgates concluídos, sem expor o nome ou os dados das crianças convidadas.',
        'Coletados automaticamente: endereço IP, características do dispositivo e do navegador e dados de navegação, por meio de cookies e tecnologias semelhantes, para manter a sessão e a segurança. As métricas próprias registram também origem, páginas, cliques e etapas, conforme a seção 5.',
      ],
      posBullets: [
        'Não coletamos dados sensíveis e não exigimos mais informações do que as necessárias para cada atividade. Os dados completos do cartão de crédito NUNCA passam pelos nossos servidores: a captura é feita de forma segura ("tokenização") diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '4. Como utilizamos os dados',
      paragrafos: ['Utilizamos os dados pessoais para as seguintes finalidades:'],
      bullets: [
        'Processar a compra e liberar o acesso ao Produto (criação da conta na área de membros e envio das instruções de primeiro acesso ao comprador ou responsável);',
        'Enviar comunicações transacionais por e-mail e/ou WhatsApp (confirmação de pagamento, instruções de acesso, avisos de cobrança e de renovação e avisos sobre o Produto), dirigidas ao responsável nos Produtos infantis;',
        'Personalizar o resultado do diagnóstico e adequar a experiência educacional;',
        'Registrar o progresso, liberar cursos e ferramentas conforme a Jornada, guardar as criações e exibir na plataforma o que for publicado, de acordo com as configurações de cada conta;',
        'Transformar a fala em texto, quando a opção de voz está ligada, e atender os pedidos feitos ao Pensa, ao Zappy e à sugestão de descrição de jogo;',
        'Emitir os certificados de conclusão e permitir a sua validação;',
        'Enviar ao comprador adulto conteúdos e ofertas relacionados, quando ele consentir, com cancelamento a qualquer momento;',
        'Prestar suporte, cumprir obrigações legais, regulatórias e fiscais, prevenir fraudes e garantir a segurança das transações.',
      ],
      posBullets: [
        'Nos Produtos infantis, valem também as regras do capítulo "Crianças e adolescentes", em especial a vedação de perfilamento comportamental e de publicidade dirigida à criança (seção 17).',
      ],
    },
    {
      titulo: '5. Cookies e métricas próprias',
      paragrafos: [
        ...ANALYTICS_PRIVACY_PARAGRAPHS,
        'Você pode desabilitar os cookies nas configurações do navegador. Ao fazer isso, partes do site, como o diagnóstico e o checkout, podem deixar de funcionar corretamente.',
      ],
    },
    {
      titulo: '6. Com quem compartilhamos os dados',
      paragrafos: [
        'Não vendemos dados pessoais, sejam de adultos, sejam de crianças. Compartilhamos dados apenas com operadores essenciais à prestação do serviço:',
      ],
      bullets: [
        'Processador de pagamentos (Efí S.A. Instituição de Pagamento, "Efí"), para processar cobranças via Pix e cartão de crédito, inclusive as cobranças recorrentes das assinaturas;',
        'Provedores de envio de e-mail e mensagens, para as comunicações transacionais (nos Produtos infantis, dirigidas ao responsável);',
        'Provedores de infraestrutura e hospedagem que armazenam os nossos sistemas;',
        'Provedores de inteligência artificial: o OpenRouter (OpenRouter, Inc.), que encaminha cada pedido ao modelo usado, e, por meio dele, os responsáveis por esses modelos, como a OpenAI. Eles atendem o assistente Zappy, o planejador Pensa, a sugestão de descrição ao compartilhar um jogo, a transformação da fala em texto e o nosso atendimento, em que a IA ajuda a equipe a resumir e rascunhar respostas que uma pessoa sempre revisa antes de enviar. Recebem somente o conteúdo de cada pedido (por exemplo, a pergunta escrita, o conteúdo do projeto analisado pelo Zappy, o áudio da fala ou a mensagem enviada ao atendimento). Não acrescentamos o e-mail, o telefone ou os documentos do comprador, do responsável ou do usuário; se essas informações forem escritas numa mensagem ao atendimento, elas seguem junto com o texto. No caso da fala, o pedido é feito com a configuração que proíbe o uso dos dados para treinar modelos;',
        'Autoridades públicas, mediante obrigação legal, ordem judicial ou requisição de autoridade competente.',
      ],
      posBullets: [
        'Os operadores tratam os dados apenas para as finalidades desta Política, em conformidade com a LGPD, sob contrato ou sob os termos de uso do serviço contratado.',
      ],
    },
    {
      titulo: '7. Transferência internacional',
      paragrafos: [
        'Alguns operadores, como os de inteligência artificial, de hospedagem e de envio de mensagens, ficam fora do Brasil. Nesses casos, a transferência internacional dos dados ocorre nas hipóteses do art. 33 da LGPD.',
        'A fala só vai ao exterior quando a opção de voz é ligada, e essa transferência é informada no próprio perfil em que a opção é ligada. A fala da criança depende do consentimento específico do responsável, dado ao ligar a opção "Falar em vez de escrever" no perfil dela; a fala do usuário adulto depende de ele ligar a voz no próprio perfil.',
      ],
    },
    {
      titulo: '8. Privacidade desde a concepção e segurança',
      paragrafos: [
        'Seguimos o princípio da privacidade desde a concepção e por padrão (privacy by design e by default): a plataforma é configurada, por padrão, na opção mais protetiva à privacidade, sem depender de ajuste manual. A voz e o perfil público, por exemplo, vêm desligados e só passam a funcionar quando o responsável (na área infantil) ou o próprio usuário adulto os liga, podendo desligá-los a qualquer momento.',
        'Adotamos medidas técnicas e organizacionais alinhadas às boas práticas: criptografia em trânsito (HTTPS), senhas armazenadas com algoritmos de hash modernos, controle de acesso restrito aos dados e registro de operações. Caso ocorra um incidente de segurança com risco ou dano relevante, comunicaremos a ANPD e os titulares afetados, conforme a LGPD.',
      ],
    },
    {
      titulo: '9. Retenção dos dados',
      paragrafos: [
        'Mantemos os dados pessoais somente pelo tempo necessário às finalidades desta Política, observados os prazos legais de guarda (por exemplo, registros de transações para fins fiscais e registros de acesso conforme o Marco Civil da Internet).',
        'Ao fim de um acesso por prazo ou de uma assinatura, a conta, o progresso e as criações continuam armazenados, para que possam voltar a ficar disponíveis numa nova contratação, e os jogos publicados podem continuar acessíveis para visita no Mural, conforme os Termos de Uso de cada Produto. Os registros das métricas próprias seguem os prazos da seção 5.',
        `O titular, ou o responsável no caso da criança ou do adolescente, pode solicitar a exclusão dos dados a qualquer momento pelo e-mail ${EMPRESA.email}. Atenderemos à solicitação, ressalvadas as hipóteses legais de conservação.`,
      ],
    },
    {
      titulo: '10. Direitos do titular e do responsável',
      paragrafos: ['Nos termos do art. 18 da LGPD, é possível solicitar a qualquer momento:'],
      bullets: [
        'Confirmação da existência de tratamento dos dados;',
        'Acesso aos dados que mantemos;',
        'Correção de dados incompletos, inexatos ou desatualizados;',
        'Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;',
        'Portabilidade dos dados a outro fornecedor, observada a regulamentação;',
        'Eliminação dos dados tratados com base no consentimento;',
        'Informação sobre com quem compartilhamos os dados;',
        'Revogação do consentimento, quando o tratamento se basear nele.',
      ],
      posBullets: [
        `Em relação à criança ou ao adolescente, esses direitos são exercidos pelo responsável legal até que a criança ou o adolescente complete 18 anos (seção 13). Para qualquer solicitação, escreva para ${EMPRESA.email}. As informações sobre o tratamento são prestadas de maneira simples, clara e acessível, e responderemos no menor prazo possível.`,
      ],
    },
    {
      titulo: '11. Alterações desta política',
      paragrafos: [
        'Esta Política pode ser atualizada para refletir mudanças legais ou do próprio serviço. A versão vigente fica sempre publicada nesta página, com a data de atualização no topo. Recomendamos a consulta periódica.',
      ],
    },
    {
      titulo: '12. Legislação e foro',
      paragrafos: [
        `Esta Política é regida pelas leis da República Federativa do Brasil, em especial pela LGPD (Lei nº 13.709/2018), pelo ECA (Lei nº 8.069/1990) e pela Lei nº 15.211/2025. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir controvérsias, sem prejuízo das regras protetivas do Código de Defesa do Consumidor.`,
      ],
    },
    {
      titulo: 'Capítulo I. Crianças e adolescentes',
      paragrafos: [
        `Este capítulo se aplica ao ${DESAFIO} e à ${COMUNIDADE} Kids e complementa as seções gerais desta Política. Nesses Produtos, quem contrata, cria a conta e acompanha o uso é o responsável; a criança ou o adolescente é a pessoa que aprende e cria na plataforma.`,
      ],
    },
    {
      titulo: '13. Melhor interesse e consentimento do responsável',
      paragrafos: [
        'O tratamento de dados pessoais de crianças e de adolescentes é realizado no melhor interesse deles, nos termos do art. 14 da LGPD, do Estatuto da Criança e do Adolescente e da Lei nº 15.211/2025 (ECA Digital).',
        'Os dados pessoais da criança são tratados com o consentimento específico e em destaque dado por ao menos um dos pais ou pelo responsável legal, manifestado por ele no momento da contratação e da criação da conta. A Empresa adota esforços razoáveis para verificar que esse consentimento foi dado pelo responsável, consideradas as tecnologias disponíveis (por exemplo, a contratação e o pagamento são feitos por um adulto, e a conta da criança fica vinculada à conta do responsável).',
        'A conta da criança é criada e gerida pelo responsável e fica vinculada a ele, que pode acompanhar o uso, ajustar as configurações do perfil e exercer, em nome da criança, os direitos descritos na seção 10.',
        'Quando o adolescente completa 18 (dezoito) anos, ele passa a exercer pessoalmente os direitos de titular dos seus dados, descritos na seção 10, inclusive a portabilidade das suas criações, pelo e-mail de contato. O perfil continua vinculado à conta do responsável enquanto a assinatura estiver vigente. A área adulta, se contratada, usa uma conta própria e separada.',
      ],
    },
    {
      titulo: '14. Dados mínimos e uso acompanhado',
      paragrafos: [
        'Não condicionamos o uso da plataforma ao fornecimento de dados além dos estritamente necessários à atividade educacional. Da criança, tratamos apenas os dados descritos na seção 3, e não exigimos dela mais informações do que as necessárias para a atividade.',
        `Recomendamos o acompanhamento do adulto durante o uso, especialmente no primeiro acesso. Na ${COMUNIDADE} Kids, a criança com menos de 9 (nove) anos usa a plataforma junto com o responsável, que lê e conduz as sessões. O ${DESAFIO} é destinado a crianças e adolescentes a partir de 9 (nove) anos.`,
      ],
    },
    {
      titulo: '15. Fala da criança',
      paragrafos: [
        'A opção "Falar em vez de escrever" vem desligada e só passa a funcionar quando o responsável a liga no perfil da criança, podendo desligá-la a qualquer momento. Com ela ligada, a criança pode falar, em vez de digitar, a mensagem que envia à nossa equipe, como um pedido de ajuda, uma resposta nos Recados ou o recado que acompanha um projeto enviado.',
        'A gravação vai a um provedor de transcrição, fora do Brasil, só para virar texto, e não é guardada pela Empresa: não a gravamos em nossos sistemas e não a usamos para reconhecer ou identificar a criança, de modo que a voz não é tratada como dado biométrico. O provedor pode manter o pedido por um prazo curto, para segurança e prevenção de abuso, conforme as regras dele, e o pedido é feito com a configuração que proíbe o uso dos dados para treinar modelos.',
        'A criança confere o texto antes de enviar, e esse texto é guardado como qualquer mensagem escrita para a nossa equipe: outras crianças nunca o veem.',
      ],
    },
    {
      titulo: '16. Perfil público, Clube e criações da criança',
      paragrafos: [
        `O perfil público da criança começa desligado e só é ativado por decisão do responsável. Na ${COMUNIDADE} Kids, o Clube dos Criadores é um espaço restrito aos alunos, com moderação prévia das publicações.`,
        'As criações feitas pela criança (como o jogo montado no Estúdio) ficam na área de membros sob a conta do responsável. Caso a plataforma ofereça a opção de gerar um link público para compartilhar uma criação, essa publicação é uma escolha do responsável e fica sob a sua supervisão. O responsável pode solicitar a remoção de uma criação publicada, ou de qualquer conteúdo publicado pela criança, a qualquer momento.',
      ],
    },
    {
      titulo: '17. Comunicação dirigida aos pais',
      paragrafos: [
        'Em conformidade com a Resolução CONANDA nº 163/2014, a comunicação e a publicidade dos Produtos infantis são sempre dirigidas aos pais e responsáveis, e nunca diretamente à criança. As mensagens por e-mail e WhatsApp são enviadas ao responsável.',
        'Não realizamos perfilamento comportamental nem publicidade direcionada a crianças e adolescentes, e não usamos os dados da criança para anúncios. Eventuais ofertas ou novidades são dirigidas ao responsável, que pode recusá-las a qualquer momento.',
      ],
    },
    {
      titulo: `Capítulo II. Adultos na ${COMUNIDADE}`,
      paragrafos: [
        `Este capítulo se aplica à área adulta da ${COMUNIDADE}, contratada por pessoa maior de 18 anos para uso próprio, e complementa as seções gerais desta Política. Na área adulta, o próprio usuário é o titular dos dados, contrata a assinatura e controla as configurações da sua conta.`,
      ],
    },
    {
      titulo: '18. Conta adulta e dados do usuário',
      paragrafos: [
        'A conta da área adulta é pessoal e criada com os dados do próprio usuário, que os mantém atualizados e escolhe o nome que aparece na comunidade e o seu avatar.',
        'Tratamos o progresso nos cursos e nas etapas da Jornada, as criações feitas no Estúdio, no Pinta, no Molda e no Pensa, as mensagens publicadas no Clube e no Mural e os recados enviados à nossa equipe, para prestar o serviço, guardar o trabalho do usuário e liberar as ferramentas conforme o seu avanço. As compras e as assinaturas ficam registradas na página Compras da área adulta.',
      ],
    },
    {
      titulo: '19. Perfil público, Mural, Clube e ranking',
      paragrafos: [
        'O perfil público começa desligado. Quando o usuário o liga, os membros da comunidade passam a ver o nome escolhido, o avatar, o progresso, as conquistas, os jogos e o espaço 3D; os dados de acesso, como e-mail e telefone, continuam privados. Com o perfil público desligado, as outras pessoas veem o usuário como "Colega" nas conversas. O perfil pode ser desligado a qualquer momento.',
        'Cada jogo publicado no Mural dos Criadores ganha um link público, que abre no celular sem login, e quem recebe o link pode jogar. O nome do usuário só aparece junto ao jogo se ele ligar o perfil público. Enquanto o jogo estiver publicado, outros membros podem jogá-lo, comentá-lo e fazer a própria versão dele, conforme os Termos de Uso. O usuário pode pedir a remoção de um jogo publicado a qualquer momento.',
        'O Clube é o espaço de conversa da comunidade adulta, com regras de convivência e moderação. As mensagens publicadas ficam visíveis aos membros, e a Empresa pode remover conteúdo que viole a lei ou os Termos de Uso.',
        'No ranking, a posição aparece para os membros, mas o nome do usuário só aparece se ele ligar o perfil público; sem ele, o usuário aparece como "Participante".',
      ],
    },
    {
      titulo: '20. Certificado de conclusão',
      paragrafos: [
        'Ao concluir um curso que oferece certificado, o usuário pode emiti-lo. O certificado traz um código QR que leva a uma página pública de validação, aberta sem login: essa página mostra o nome que consta no certificado e o curso concluído, para que qualquer pessoa com o código ou o link confirme que o certificado é autêntico.',
      ],
    },
    {
      titulo: '21. Pensa, Zappy e voz',
      paragrafos: [
        'O Pensa ajuda a planejar a ideia de um jogo e a organizá-la em tarefas. O Zappy, tutor virtual do Estúdio, lê os blocos do projeto e indica o que conferir, sem alterar o projeto. Esses recursos usam os provedores de inteligência artificial indicados na seção 6.',
        'Para gerar cada resposta, enviamos ao provedor o texto que o usuário escreve no pedido e, no caso do Zappy, o conteúdo do projeto em análise (blocos ou código). A fala só é enviada se o usuário ligar a voz no próprio perfil. Não acrescentamos o e-mail, o telefone ou os documentos do usuário; se ele escrever esses dados num pedido, eles podem seguir junto com o texto, por isso recomendamos não incluir dados pessoais nos pedidos.',
        'A voz vem desligada. Quando o usuário a liga em Meu perfil, pode falar em vez de digitar no Pensa e no Zappy. A gravação vai a um provedor de transcrição, fora do Brasil, só para virar texto, não é guardada pela Empresa e não é usada para reconhecer ou identificar o usuário. O provedor pode manter o pedido por um prazo curto, para segurança e prevenção de abuso, conforme as regras dele, e o pedido é feito com a configuração que proíbe o uso dos dados para treinar modelos. O usuário confere o texto antes de enviar e pode desligar a voz a qualquer momento.',
        'O uso do Pensa, do Zappy e da sugestão de descrição de jogo é contado em limites de pedidos por dia e por mês, exibidos em Meu perfil.',
      ],
    },
  ],
}
