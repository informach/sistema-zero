// Conteúdo das páginas legais do funil KIDS (Política de Privacidade e Termos de
// Uso) do produto "Desafio do Primeiro Jogo". A venda e o aceite são SEMPRE feitos
// por um adulto responsável; a criança é a aluna. A copy é fundamentada em:
//   • LGPD (Lei nº 13.709/2018), em especial o art. 14 (dados de crianças e
//     adolescentes: melhor interesse + consentimento do responsável);
//   • ECA (Lei nº 8.069/1990) e ECA Digital (Lei nº 15.211/2025): privacidade
//     desde a concepção e por padrão, conta vinculada a responsável, vedação a
//     perfilamento/publicidade comportamental dirigidos a crianças;
//   • Resolução CONANDA nº 163/2014: publicidade dirigida à criança é abusiva, por
//     isso a comunicação é sempre dirigida aos pais;
//   • CDC (garantia de 7 dias; o consumidor é o adulto comprador).
// Reaproveita os dados da empresa e os tipos de `legal.ts`.

import { EMPRESA, type LegalDoc } from './legal'

const PRODUTO = 'Desafio do Primeiro Jogo'

/** Aviso curto exibido nos rodapés do funil kids (oferta/checkout/obrigado/legais). */
export const AVISO_LEGAL_KIDS =
  'Conteúdo dirigido aos pais e responsáveis, em conformidade com o Estatuto da Criança e do ' +
  'Adolescente (ECA), com a Lei nº 15.211/2025 (ECA Digital) e com a Resolução 163/2014 do CONANDA, ' +
  'que veda publicidade dirigida diretamente a crianças. A compra e o uso são feitos por um adulto ' +
  'responsável, e a conta da criança fica vinculada a ele. Tratamos os dados no melhor interesse da ' +
  'criança, com o consentimento do responsável (LGPD, art. 14), e não fazemos perfilamento nem ' +
  'publicidade comportamental dirigidos a crianças. Não há promessa de renda, emprego ou carreira ' +
  'para a criança; os resultados dependem do acompanhamento e do tempo dedicado em cada família.'

export const PRIVACIDADE_KIDS: LegalDoc = {
  titulo: 'Política de Privacidade',
  descricao:
    'Como a Informach — Núcleo de Aprendizagem Ltda. trata os dados pessoais no Desafio do Primeiro Jogo, com proteção reforçada para crianças e adolescentes, em conformidade com a LGPD, o ECA e o ECA Digital.',
  atualizadoEm: '26 de junho de 2026',
  secoes: [
    {
      titulo: '1. Do objeto e do público',
      paragrafos: [
        `Esta Política descreve como a ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj} ("Empresa", "nós"), trata os dados pessoais relacionados ao produto digital ${PRODUTO}.`,
        `O ${PRODUTO} é vendido a um adulto responsável (pai, mãe ou responsável legal), que é quem contrata, cria a conta e acompanha o uso. A criança ou o adolescente é a pessoa que aprende e cria dentro da plataforma. Por isso, esta Política dá atenção especial à proteção de dados de crianças e adolescentes.`,
        'Ao contratar e fornecer dados, o responsável declara ter lido e compreendido esta Política, que é regida pela Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018), pelo Estatuto da Criança e do Adolescente (Lei nº 8.069/1990), pela Lei nº 15.211/2025 (ECA Digital), pelo Marco Civil da Internet (Lei nº 12.965/2014) e pelas demais normas aplicáveis.',
      ],
    },
    {
      titulo: '2. Encarregado pelo tratamento de dados',
      paragrafos: [
        `A Empresa mantém um encarregado pelo tratamento de dados pessoais (DPO), canal de comunicação entre a Empresa, você e a Autoridade Nacional de Proteção de Dados (ANPD). Fale com o encarregado pelo e-mail ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '3. Melhor interesse e consentimento do responsável',
      paragrafos: [
        'O tratamento de dados pessoais de crianças e de adolescentes é realizado no melhor interesse deles, nos termos do art. 14 da LGPD.',
        'Os dados pessoais da criança são tratados com o consentimento específico e em destaque dado por ao menos um dos pais ou pelo responsável legal, manifestado por ele no momento da contratação e da criação da conta. A Empresa adota esforços razoáveis para verificar que esse consentimento foi dado pelo responsável, consideradas as tecnologias disponíveis (por exemplo, a contratação e o pagamento são feitos por um adulto, e a conta da criança fica vinculada à conta do responsável).',
        'Não condicionamos o uso da plataforma ao fornecimento de dados além dos estritamente necessários à atividade educacional.',
      ],
    },
    {
      titulo: '4. Quais dados coletamos',
      paragrafos: ['Coletamos apenas o necessário, separado por finalidade:'],
      bullets: [
        'Do responsável: nome, e-mail e telefone (informados no pré-checkout); CPF e dados de pagamento necessários para processar a compra; e as respostas do diagnóstico, que são respondidas pelo adulto sobre o perfil de interesse da criança.',
        'Da criança/aluno: nome ou apelido de exibição, progresso na trilha, e as criações feitas por ela na plataforma (por exemplo, o joguinho montado no Sistema Zero Studio). Pedimos que o responsável evite inserir dados desnecessários da criança (como documentos ou endereço) nos campos livres.',
        'Coletados automaticamente: endereço IP, características do dispositivo e do navegador e dados de navegação, por meio de cookies e tecnologias semelhantes, para manter a sessão e a segurança.',
      ],
      posBullets: [
        'Não coletamos dados sensíveis e não exigimos da criança mais informações do que as necessárias para a atividade. Os dados completos do cartão de crédito NUNCA passam pelos nossos servidores: a captura é feita de forma segura ("tokenização") diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '5. Como utilizamos os dados',
      paragrafos: ['Utilizamos os dados pessoais para as seguintes finalidades:'],
      bullets: [
        'Liberar e entregar o acesso ao produto e às criações da criança (criação da conta na área de membros e instruções de primeiro acesso enviadas ao responsável);',
        'Enviar comunicações transacionais ao responsável por e-mail e/ou WhatsApp (confirmação de pagamento, instruções de acesso e avisos sobre o produto);',
        'Personalizar o resultado do diagnóstico e adequar a experiência educacional;',
        'Prestar suporte, cumprir obrigações legais, regulatórias e fiscais e prevenir fraudes.',
      ],
      posBullets: [
        'Não realizamos perfilamento comportamental nem publicidade direcionada a crianças e adolescentes, e não usamos os dados da criança para anúncios. Eventuais ofertas ou novidades são dirigidas ao responsável, que pode recusá-las a qualquer momento.',
      ],
    },
    {
      titulo: '6. Cookies',
      paragrafos: [
        'Utilizamos cookies e tecnologias semelhantes para manter a sessão (por exemplo, lembrar o progresso no diagnóstico e a sessão de compra), medir audiência e melhorar a plataforma.',
        'Você pode desabilitar os cookies nas configurações do navegador. Ao fazer isso, partes do site, como o diagnóstico e o checkout, podem deixar de funcionar corretamente.',
      ],
    },
    {
      titulo: '7. Com quem compartilhamos os dados',
      paragrafos: [
        'Não vendemos os seus dados nem os da criança. Compartilhamos dados apenas com operadores essenciais à prestação do serviço:',
      ],
      bullets: [
        'Processador de pagamentos (Efí — Efí S.A. Instituição de Pagamento), para processar cobranças via Pix e cartão de crédito;',
        'Provedores de envio de e-mail e mensagens, para as comunicações transacionais dirigidas ao responsável;',
        'Provedores de infraestrutura e hospedagem que armazenam os nossos sistemas;',
        'Autoridades públicas, mediante obrigação legal, ordem judicial ou requisição de autoridade competente.',
      ],
      posBullets: [
        'Todos os operadores atuam sob contrato e em conformidade com a LGPD, tratando os dados apenas para as finalidades desta Política.',
      ],
    },
    {
      titulo: '8. Privacidade desde a concepção e segurança',
      paragrafos: [
        'Seguimos o princípio da privacidade desde a concepção e por padrão (privacy by design e by default): a plataforma é configurada, por padrão, na opção mais protetiva à privacidade da criança, sem depender de ajuste manual pelo responsável.',
        'Adotamos medidas técnicas e organizacionais alinhadas às boas práticas: criptografia em trânsito (HTTPS), senhas armazenadas com algoritmos de hash modernos, controle de acesso restrito aos dados e registro de operações. Caso ocorra um incidente de segurança com risco ou dano relevante, comunicaremos a ANPD e os titulares afetados, conforme a LGPD.',
      ],
    },
    {
      titulo: '9. Retenção dos dados',
      paragrafos: [
        'Mantemos os dados pessoais somente pelo tempo necessário às finalidades desta Política, observados os prazos legais de guarda (por exemplo, registros de transações para fins fiscais e registros de acesso conforme o Marco Civil da Internet).',
        `O responsável pode solicitar a exclusão dos dados a qualquer momento pelo e-mail ${EMPRESA.email}. Atenderemos à solicitação, ressalvadas as hipóteses legais de conservação.`,
      ],
    },
    {
      titulo: '10. Direitos do titular e do responsável',
      paragrafos: [
        'Nos termos do art. 18 da LGPD, é possível solicitar a qualquer momento a confirmação e o acesso aos dados, a correção, a anonimização ou eliminação de dados desnecessários, a portabilidade, a informação sobre compartilhamento e a revogação do consentimento.',
        `Em relação à criança, esses direitos são exercidos pelo responsável legal. Para qualquer solicitação, escreva para ${EMPRESA.email}. As informações sobre o tratamento são prestadas de maneira simples, clara e acessível.`,
      ],
    },
    {
      titulo: '11. Criações da criança na plataforma',
      paragrafos: [
        'As criações feitas pela criança (como o jogo montado no Estúdio) ficam na área de membros sob a conta do responsável. Caso a plataforma ofereça a opção de gerar um link público para compartilhar uma criação, essa publicação é uma escolha do responsável e fica sob a sua supervisão. O responsável pode solicitar a remoção de uma criação publicada a qualquer momento.',
      ],
    },
    {
      titulo: '12. Alterações desta política',
      paragrafos: [
        'Esta Política pode ser atualizada para refletir mudanças legais ou do próprio serviço. A versão vigente fica sempre publicada nesta página, com a data de atualização no topo. Recomendamos a consulta periódica.',
      ],
    },
    {
      titulo: '13. Legislação e foro',
      paragrafos: [
        `Esta Política é regida pelas leis da República Federativa do Brasil, em especial pela LGPD (Lei nº 13.709/2018), pelo ECA (Lei nº 8.069/1990) e pela Lei nº 15.211/2025. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir controvérsias, sem prejuízo das regras protetivas do Código de Defesa do Consumidor.`,
      ],
    },
  ],
}

export const TERMOS_KIDS: LegalDoc = {
  titulo: 'Termos de Uso',
  descricao:
    'Condições para a contratação e o uso do Desafio do Primeiro Jogo, da Informach — Núcleo de Aprendizagem Ltda. A compra e o aceite são feitos por um adulto responsável.',
  atualizadoEm: '26 de junho de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pelo Produto;`,
        'Responsável: a pessoa física maior de 18 anos que contrata o Produto e que declara ser pai, mãe ou responsável legal pela criança ou adolescente que irá utilizá-lo;',
        'Aluno: a criança ou o adolescente, a partir de 9 anos, que utiliza o Produto sob a supervisão do Responsável;',
        `Produto: o ${PRODUTO}, uma trilha guiada de caráter educacional para a criança criar o seu primeiro joguinho dentro do Sistema Zero Studio, com acesso pela área de membros da Empresa;`,
        'Área de membros: o ambiente on-line em que o Aluno acessa o conteúdo e cria os seus projetos, por meio da conta criada e gerida pelo Responsável.',
      ],
    },
    {
      titulo: '2. O que é e como funciona o Produto',
      paragrafos: [
        `O ${PRODUTO} é um material digital de caráter educacional: uma trilha de 3 dias em que a criança monta o primeiro joguinho jogável, com passo a passo em vídeo e um estúdio feito para crianças, sem instalar nada. A compra é feita neste site, com pagamento único via Pix ou cartão de crédito.`,
        'Após a confirmação do pagamento, o acesso é liberado na área de membros e as instruções de primeiro acesso são enviadas ao e-mail do Responsável informado na compra. Por isso, é essencial que os dados do checkout estejam corretos.',
        'A Empresa pode, a seu critério, atualizar o conteúdo, incluir bônus e melhorar a entrega do Produto, sempre preservando o acesso ao conteúdo adquirido.',
      ],
    },
    {
      titulo: '3. Quem pode contratar e usar',
      paragrafos: [
        'A contratação e o aceite destes Termos são feitos exclusivamente por um Responsável maior de 18 anos, que declara ser pai, mãe ou responsável legal pelo Aluno.',
        'O Aluno utiliza o Produto sob a supervisão e a responsabilidade do Responsável. A conta do Aluno é criada e gerida pelo Responsável e fica vinculada a ele, em linha com o ECA e a Lei nº 15.211/2025 (ECA Digital). Recomendamos o acompanhamento do adulto durante o uso, especialmente no Dia 1.',
      ],
    },
    {
      titulo: '4. Das responsabilidades',
      paragrafos: ['São responsabilidades de cada parte:'],
      bullets: [
        'Da Empresa: descrever o Produto de forma lícita e transparente; entregar o acesso após a confirmação do pagamento; proteger os dados pessoais conforme a LGPD e a Política de Privacidade (Kids); e prestar suporte pelo e-mail de contato;',
        'Do Responsável: fornecer dados verdadeiros e atualizados; manter a guarda e o sigilo do login e da senha (o acesso é pessoal e intransferível); supervisionar o uso pelo Aluno; e utilizar o Produto apenas para fins pessoais e não comerciais.',
      ],
      posBullets: [
        'O compartilhamento de credenciais ou do conteúdo com terceiros viola estes Termos e pode acarretar a suspensão do acesso, sem prejuízo das medidas legais cabíveis.',
      ],
    },
    {
      titulo: '5. Comunicação dirigida aos pais',
      paragrafos: [
        'Em conformidade com a Resolução CONANDA nº 163/2014, a comunicação e a publicidade do Produto são sempre dirigidas aos pais e responsáveis, e nunca diretamente à criança.',
        'O Produto tem finalidade educacional e não promete renda, emprego ou carreira para a criança. Os resultados dependem do acompanhamento e do tempo dedicado em cada família.',
      ],
    },
    {
      titulo: '6. Do pagamento',
      paragrafos: [
        'O pagamento é único (não é assinatura) e processado pela Efí — Efí S.A. Instituição de Pagamento, nas modalidades Pix e cartão de crédito. O preço vigente é o exibido na página da oferta no momento da compra.',
        'Os dados completos do cartão não transitam pelos servidores da Empresa: a captura é feita de forma segura, por tokenização, diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '7. Garantia e reembolso',
      paragrafos: [
        `O Responsável pode solicitar o reembolso integral em até 7 (sete) dias corridos a contar da compra, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento e o acesso à área de membros é encerrado.',
      ],
    },
    {
      titulo: '8. Da propriedade intelectual',
      paragrafos: [
        'Todo o conteúdo do Produto e deste site (textos, imagens, vídeos, marcas, layout, trilha e materiais) é de titularidade da Empresa e protegido pelas Leis nº 9.610/1998 (Direitos Autorais) e nº 9.609/1998 (Software). A aquisição concede uma licença de uso pessoal, limitada, não exclusiva e intransferível, vedada a reprodução, distribuição ou revenda.',
        'As criações feitas pelo Aluno na plataforma (como o jogo montado no Estúdio) pertencem ao Aluno e ao seu Responsável. Ao usar o Produto, o Responsável autoriza a Empresa a armazenar e exibir essas criações na área de membros para o funcionamento do serviço. Caso o Responsável opte por gerar um link público de uma criação, essa publicação é feita sob a sua responsabilidade, e a Empresa pode moderar ou remover conteúdo que viole a lei ou estes Termos.',
      ],
    },
    {
      titulo: '9. Isenção de garantias de resultado',
      paragrafos: [
        'O Produto tem caráter educacional e informativo. Os exemplos e demonstrações não constituem promessa ou garantia de resultados específicos, que dependem da dedicação, do contexto e do acompanhamento de cada família.',
      ],
    },
    {
      titulo: '10. Da privacidade e proteção de dados',
      paragrafos: [
        'O tratamento de dados pessoais é regido pela Política de Privacidade (Kids), disponível neste site, que integra estes Termos para todos os fins. Os dados de crianças e adolescentes são tratados no melhor interesse deles, com o consentimento do responsável, nos termos do art. 14 da LGPD (Lei nº 13.709/2018) e da Lei nº 15.211/2025 (ECA Digital).',
      ],
    },
    {
      titulo: '11. Das alterações destes termos',
      paragrafos: [
        'A Empresa pode alterar estes Termos a qualquer momento, publicando a versão atualizada nesta página com a respectiva data. As alterações não prejudicam direitos já adquiridos, como o acesso ao conteúdo comprado e o prazo de garantia em curso.',
      ],
    },
    {
      titulo: '12. Da lei aplicável e do foro',
      paragrafos: [
        `Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo o ECA (Lei nº 8.069/1990) e a Lei nº 15.211/2025. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir controvérsias, sem prejuízo do foro do domicílio do consumidor, garantido pelo Código de Defesa do Consumidor.`,
        `Dúvidas sobre estes Termos podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
  ],
}
