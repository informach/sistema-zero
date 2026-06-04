// Conteúdo das páginas legais (Política de Privacidade e Termos de Uso), pt-BR.
// Copy adaptada para a Informach — Núcleo de Aprendizagem Ltda. e o produto
// digital "No Comando da IA" (ebook + kit prático, venda própria via funil).

export interface LegalSecao {
  titulo: string
  paragrafos: string[]
  bullets?: string[]
  /** Parágrafos exibidos depois dos bullets (fechamento da seção). */
  posBullets?: string[]
}

export interface LegalDoc {
  titulo: string
  descricao: string
  atualizadoEm: string
  secoes: LegalSecao[]
}

export const EMPRESA = {
  razaoSocial: 'Informach — Núcleo de Aprendizagem Ltda.',
  cnpj: '43.588.758/0001-03',
  email: 'contato@sistemazero.com.br',
  foro: 'Belo Horizonte/MG',
  produto: 'No Comando da IA',
}

export const PRIVACIDADE: LegalDoc = {
  titulo: 'Política de Privacidade',
  descricao:
    'Como a Informach — Núcleo de Aprendizagem Ltda. coleta, usa, armazena e protege os seus dados pessoais, em conformidade com a LGPD.',
  atualizadoEm: '4 de junho de 2026',
  secoes: [
    {
      titulo: '1. Do objeto',
      paragrafos: [
        `Esta Política de Privacidade descreve como a ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj} ("Empresa", "nós"), coleta, utiliza, armazena e protege os dados pessoais dos usuários ("você") que acessam este site, respondem ao nosso diagnóstico e adquirem o produto digital ${EMPRESA.produto}.`,
        'Ao acessar o site e fornecer seus dados, você declara ter lido e compreendido esta Política, que é regida pela Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018), pelo Marco Civil da Internet (Lei nº 12.965/2014) e pelas demais normas aplicáveis.',
      ],
    },
    {
      titulo: '2. Encarregado pelo tratamento de dados',
      paragrafos: [
        `A Empresa designa um encarregado pelo tratamento de dados pessoais (DPO), que é o canal de comunicação entre a Empresa, você e a Autoridade Nacional de Proteção de Dados (ANPD). Qualquer solicitação relacionada aos seus dados pessoais pode ser feita pelo e-mail ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '3. Quais dados coletamos',
      paragrafos: ['Coletamos dois tipos de dados:'],
      bullets: [
        'Dados fornecidos por você: nome, e-mail e telefone (informados no pré-checkout); CPF e dados de pagamento necessários para processar a compra; e as respostas do quiz/diagnóstico (usadas para personalizar o seu resultado).',
        'Dados coletados automaticamente: endereço IP, características do dispositivo e do navegador, páginas visitadas e dados de navegação, por meio de cookies e tecnologias semelhantes.',
      ],
      posBullets: [
        'Não coletamos dados sensíveis (origem racial, convicção religiosa, opinião política, dados de saúde, entre outros) e não direcionamos o site a menores de 18 anos.',
        'Os dados completos do seu cartão de crédito NUNCA passam pelos nossos servidores: a captura é feita de forma segura ("tokenização") diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '4. Como utilizamos os dados',
      paragrafos: ['Utilizamos os seus dados pessoais para as seguintes finalidades:'],
      bullets: [
        'Processar a sua compra e entregar o produto digital (criação do seu acesso à área de membros e envio das instruções de primeiro acesso);',
        'Enviar comunicações transacionais por e-mail e/ou WhatsApp (confirmação de pagamento, instruções de acesso, avisos sobre o produto);',
        'Personalizar o resultado do diagnóstico e melhorar a experiência do site;',
        'Enviar conteúdos e ofertas relacionados, quando você consentir — você pode cancelar a qualquer momento;',
        'Cumprir obrigações legais, regulatórias e fiscais;',
        'Prevenir fraudes e garantir a segurança das transações.',
      ],
    },
    {
      titulo: '5. Cookies',
      paragrafos: [
        'Utilizamos cookies e tecnologias semelhantes para manter a sua sessão (por exemplo, lembrar o seu progresso no diagnóstico e a sua sessão de compra), medir audiência e melhorar o site.',
        'Você pode desabilitar os cookies nas configurações do seu navegador (Chrome, Firefox, Safari, Edge). Ao fazer isso, partes do site — como o diagnóstico e o checkout — podem deixar de funcionar corretamente.',
      ],
    },
    {
      titulo: '6. Com quem compartilhamos os dados',
      paragrafos: [
        'Não vendemos os seus dados pessoais. Compartilhamos dados apenas com operadores essenciais à prestação do serviço:',
      ],
      bullets: [
        'Processador de pagamentos (Efí — Efí S.A. Instituição de Pagamento), para processar cobranças via Pix e cartão de crédito;',
        'Provedores de envio de e-mail e mensagens (comunicações transacionais);',
        'Provedores de infraestrutura e hospedagem que armazenam os nossos sistemas;',
        'Autoridades públicas, mediante obrigação legal, ordem judicial ou requisição de autoridade competente.',
      ],
      posBullets: [
        'Todos os operadores atuam sob contrato e em conformidade com a LGPD, tratando os dados exclusivamente para as finalidades descritas nesta Política.',
      ],
    },
    {
      titulo: '7. Como mantemos os dados seguros',
      paragrafos: [
        'Adotamos medidas técnicas e organizacionais alinhadas às boas práticas de mercado: criptografia em trânsito (HTTPS), senhas armazenadas com algoritmos de hash modernos, controle de acesso restrito aos dados e registro de operações.',
        'Caso ocorra um incidente de segurança que possa acarretar risco ou dano relevante a você, comunicaremos o fato à ANPD e aos titulares afetados, conforme exige a LGPD.',
      ],
    },
    {
      titulo: '8. Retenção dos dados',
      paragrafos: [
        'Mantemos os seus dados pessoais somente pelo tempo necessário para cumprir as finalidades desta Política, observados os prazos legais de guarda (por exemplo, registros de transações para fins fiscais e registros de acesso conforme o Marco Civil da Internet).',
        `Você pode solicitar a exclusão dos seus dados a qualquer momento pelo e-mail ${EMPRESA.email}. Atenderemos à solicitação, ressalvadas as hipóteses legais de conservação.`,
      ],
    },
    {
      titulo: '9. Seus direitos como titular',
      paragrafos: ['Nos termos do art. 18 da LGPD, você pode solicitar a qualquer momento:'],
      bullets: [
        'Confirmação da existência de tratamento dos seus dados;',
        'Acesso aos dados que mantemos sobre você;',
        'Correção de dados incompletos, inexatos ou desatualizados;',
        'Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;',
        'Portabilidade dos dados a outro fornecedor, observada a regulamentação;',
        'Eliminação dos dados tratados com base no seu consentimento;',
        'Informação sobre com quem compartilhamos os seus dados;',
        'Revogação do consentimento, quando o tratamento se basear nele.',
      ],
      posBullets: [
        `Para exercer qualquer um desses direitos, envie um e-mail para ${EMPRESA.email}. Responderemos no menor prazo possível.`,
      ],
    },
    {
      titulo: '10. Alterações desta política',
      paragrafos: [
        'Esta Política pode ser atualizada a qualquer momento para refletir mudanças legais ou do próprio serviço. A versão vigente estará sempre publicada nesta página, com a data de atualização no topo. Recomendamos a consulta periódica.',
      ],
    },
    {
      titulo: '11. Legislação e foro',
      paragrafos: [
        `Esta Política é regida pelas leis da República Federativa do Brasil, em especial pela Lei nº 13.709/2018 (LGPD). Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir quaisquer controvérsias dela decorrentes, sem prejuízo das regras protetivas do Código de Defesa do Consumidor.`,
      ],
    },
  ],
}

export const TERMOS: LegalDoc = {
  titulo: 'Termos de Uso',
  descricao:
    'Condições para uso deste site e aquisição do produto digital No Comando da IA, da Informach — Núcleo de Aprendizagem Ltda.',
  atualizadoEm: '4 de junho de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos de Uso, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pelo Produto;`,
        'Usuário: a pessoa física que navega neste site, responde ao diagnóstico e/ou adquire o Produto;',
        `Produto: o ebook ${EMPRESA.produto} e o seu kit prático de aplicação — um produto digital (infoproduto) de caráter educacional, com acesso pela área de membros da Empresa;`,
        'Área de membros: o ambiente on-line da Empresa em que o Usuário acessa o conteúdo adquirido, mediante login e senha pessoais.',
      ],
    },
    {
      titulo: '2. O que é e como funciona o Produto',
      paragrafos: [
        `O ${EMPRESA.produto} é um material digital de caráter educacional sobre como tirar ideias do papel com auxílio de inteligência artificial. A compra é feita neste próprio site, com pagamento único via Pix ou cartão de crédito.`,
        'Após a confirmação do pagamento, o acesso é liberado na área de membros e as instruções de primeiro acesso são enviadas para o e-mail informado na compra. Por isso, é essencial que os dados informados no checkout estejam corretos.',
        'A Empresa pode, a seu exclusivo critério, atualizar o conteúdo, incluir bônus e melhorar o formato de entrega do Produto, sempre preservando o acesso ao conteúdo adquirido.',
      ],
    },
    {
      titulo: '3. Das responsabilidades',
      paragrafos: ['São responsabilidades de cada parte:'],
      bullets: [
        'Da Empresa: descrever o Produto de forma lícita e transparente; entregar o acesso após a confirmação do pagamento; proteger os dados pessoais do Usuário conforme a LGPD e a Política de Privacidade; e prestar suporte pelo e-mail de contato;',
        'Do Usuário: fornecer dados verdadeiros, completos e atualizados; manter a guarda e o sigilo do seu login e senha (o acesso é pessoal e intransferível); e utilizar o Produto exclusivamente para fins pessoais e não comerciais.',
      ],
      posBullets: [
        'O compartilhamento de credenciais ou do conteúdo com terceiros constitui violação destes Termos e pode acarretar a suspensão do acesso, sem prejuízo das medidas legais cabíveis.',
      ],
    },
    {
      titulo: '4. Do pagamento',
      paragrafos: [
        'O pagamento é único (não é assinatura) e processado pela Efí — Efí S.A. Instituição de Pagamento, nas modalidades Pix e cartão de crédito. O preço vigente é o exibido na página da oferta no momento da compra.',
        'Os dados completos do cartão de crédito não transitam pelos servidores da Empresa: a captura é feita de forma segura, por tokenização, diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '5. Garantia e reembolso',
      paragrafos: [
        `O Usuário pode solicitar o reembolso integral em até 7 (sete) dias corridos a contar da compra, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento utilizado e o acesso à área de membros é encerrado.',
      ],
    },
    {
      titulo: '6. Da propriedade intelectual',
      paragrafos: [
        `Todo o conteúdo do Produto e deste site — textos, imagens, vídeos, marcas, layout e materiais do kit — é de titularidade da Empresa e protegido pelas Leis nº 9.610/1998 (Direitos Autorais) e nº 9.609/1998 (Software).`,
        `A aquisição do Produto concede ao Usuário uma licença de uso pessoal, limitada, não exclusiva e intransferível. É proibido reproduzir, distribuir, revender, compartilhar ou disponibilizar o conteúdo, no todo ou em parte, sob pena de responsabilização civil e criminal.`,
      ],
    },
    {
      titulo: '7. Isenção de garantias de resultado',
      paragrafos: [
        'O Produto tem caráter educacional e informativo. Os exemplos e demonstrações apresentados não constituem promessa ou garantia de resultados específicos, que dependem da dedicação, do contexto e da aplicação individual de cada Usuário.',
      ],
    },
    {
      titulo: '8. Da privacidade e proteção de dados',
      paragrafos: [
        'O tratamento de dados pessoais do Usuário é regido pela Política de Privacidade, disponível neste site, que integra estes Termos para todos os fins. Os dados são tratados em conformidade com a LGPD (Lei nº 13.709/2018).',
      ],
    },
    {
      titulo: '9. Das alterações destes termos',
      paragrafos: [
        'A Empresa pode alterar estes Termos a qualquer momento, publicando a versão atualizada nesta página com a respectiva data. As alterações não prejudicam direitos já adquiridos, como o acesso ao conteúdo comprado e o prazo de garantia em curso.',
      ],
    },
    {
      titulo: '10. Da lei aplicável e do foro',
      paragrafos: [
        `Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir quaisquer controvérsias, sem prejuízo do foro do domicílio do consumidor, garantido pelo Código de Defesa do Consumidor.`,
        `Dúvidas sobre estes Termos podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
  ],
}
