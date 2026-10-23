// Tipos dos textos legais, dados da empresa e o Termo de Uso do "No Comando da IA" (ebook + kit
// prático, venda própria via funil). A Política de Privacidade deste produto foi substituída em
// 20/10/2026 pela Política única (`content/legal/privacidade.ts`); o texto antigo está em
// `docs/legal/historico/`. Os Termos das outras ofertas ficam em `content/legal/`.

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
