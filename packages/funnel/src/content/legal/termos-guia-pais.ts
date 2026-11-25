// Termos de Uso do guia para pais "Transformando o vilão em aliado" (compra única, acesso sem
// prazo), 25/11/2026. Modelados em `termos-desafio-adulto.ts` (pessoa maior de 18 anos que contrata
// para si): o guia é assistido pelo próprio adulto, na área dos pais. Fundamentos: CDC (garantia de
// 7 dias, foro do domicílio do consumidor), LGPD e Leis nº 9.610/1998 e 9.609/1998.

import { EMPRESA, type LegalDoc } from '../legal'
import { POLITICA_PRIVACIDADE_PATH } from './privacidade'

const PRODUTO = 'Transformando o vilão em aliado'

export const TERMOS_GUIA_PAIS: LegalDoc = {
  titulo: 'Termos de Uso do guia Transformando o vilão em aliado',
  descricao: `Condições para a contratação e o uso do guia ${PRODUTO}, na área dos pais da plataforma da ${EMPRESA.razaoSocial}, contratado por pessoa maior de 18 anos para uso próprio.`,
  atualizadoEm: '25 de novembro de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pelo Produto;`,
        'Usuário: a pessoa física maior de 18 anos, mãe, pai ou responsável, que contrata o Produto para uso próprio, com conta e dados pessoais próprios;',
        `Guia ou Produto: o guia ${PRODUTO}, um curso em vídeo de caráter educacional para pais e responsáveis, com apostila e certificado, acessado pela área dos pais da Empresa;`,
        'Área de membros: o ambiente on-line em que o Usuário acessa o conteúdo e cria os seus projetos, mediante login e senha pessoais.',
      ],
    },
    {
      titulo: '2. O que é e como funciona o Guia',
      paragrafos: [
        `O guia ${PRODUTO} é um material digital de caráter educacional: aulas curtas em vídeo, com apostila e certificado, para o Usuário assistir no seu ritmo. A compra é feita neste site, com pagamento único via Pix ou cartão de crédito. O mesmo Guia também pode ser recebido de presente, por um link de convite ou de campanha, nas condições informadas na página do presente.`,
        'Após a aprovação do pagamento, o Guia é liberado na área dos pais, no menu Cursos para pais, sem prazo de término. As instruções de primeiro acesso são enviadas ao e-mail informado na compra. Por isso, é essencial que os dados do checkout estejam corretos.',
        'As aulas podem ser vistas e revistas a qualquer momento, no computador ou no celular.',
        'A Empresa pode atualizar o conteúdo, incluir bônus e melhorar a entrega do Produto. Essas mudanças não alteram o preço, a duração nem as demais condições congeladas no momento da compra.',
      ],
    },
    {
      titulo: '3. Quem pode contratar e usar',
      paragrafos: [
        'A contratação e o aceite destes Termos são feitos exclusivamente por pessoa física maior de 18 anos, que contrata o Produto para uso próprio.',
        'A conta é pessoal e intransferível, criada com os dados do próprio Usuário. O Guia é dirigido ao adulto: quem assiste às aulas é a mãe, o pai ou o responsável.',
      ],
    },
    {
      titulo: '4. Das responsabilidades',
      paragrafos: ['São responsabilidades de cada parte:'],
      bullets: [
        'Da Empresa: descrever o Produto de forma lícita e transparente; entregar o acesso após a confirmação do pagamento; proteger os dados pessoais conforme a LGPD e a Política de Privacidade; e prestar suporte pelo e-mail de contato;',
        'Do Usuário: fornecer dados verdadeiros e atualizados; manter a guarda e o sigilo do login e da senha (o acesso é pessoal e intransferível); e utilizar o Produto apenas para fins pessoais e não comerciais.',
      ],
      posBullets: [
        'O compartilhamento de credenciais ou do conteúdo com terceiros viola estes Termos e pode acarretar a suspensão do acesso, sem prejuízo das medidas legais cabíveis.',
      ],
    },
    {
      titulo: '5. Do pagamento',
      paragrafos: [
        'O pagamento é único, não cria assinatura e não possui renovação automática. Ele é processado pela Efí S.A. Instituição de Pagamento ("Efí"), nas modalidades Pix e cartão de crédito. O preço vigente, eventual cupom e valor total são os exibidos no resumo do checkout no momento da compra.',
        'Os dados completos do cartão não transitam pelos servidores da Empresa: a captura é feita de forma segura, por tokenização, diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '6. Prazo de acesso',
      paragrafos: [
        'O acesso começa com a aprovação do pagamento. Uma cobrança criada, mas ainda pendente, não libera o Guia.',
        'O acesso ao Guia não tem prazo de término: ele fica disponível na conta enquanto a Empresa mantiver a plataforma em funcionamento.',
        'O progresso nas aulas permanece armazenado conforme a Política de Privacidade.',
      ],
    },
    {
      titulo: '7. Garantia e reembolso',
      paragrafos: [
        `O Usuário pode solicitar o reembolso integral em até 7 (sete) dias corridos a contar da compra, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento e o acesso à área de membros é encerrado.',
      ],
    },
    {
      titulo: '8. Da propriedade intelectual',
      paragrafos: [
        'Todo o conteúdo do Produto e deste site (textos, imagens, vídeos, marcas, layout, trilha e materiais) é de titularidade da Empresa e protegido pelas Leis nº 9.610/1998 (Direitos Autorais) e nº 9.609/1998 (Software). A aquisição concede uma licença de uso pessoal, limitada, não exclusiva e intransferível, vedada a reprodução, distribuição ou revenda.',
        'A apostila, os vídeos e o certificado são para uso pessoal do Usuário e da sua família.',
      ],
    },
    {
      titulo: '9. Isenção de garantias de resultado',
      paragrafos: [
        'O Produto tem caráter educacional e informativo e não promete renda, emprego ou carreira. Os exemplos e demonstrações não constituem promessa ou garantia de resultados específicos, que dependem da dedicação e do contexto de cada Usuário.',
      ],
    },
    {
      titulo: '10. Da privacidade e proteção de dados',
      paragrafos: [
        `O tratamento de dados pessoais é regido pela Política de Privacidade, disponível neste site em ${POLITICA_PRIVACIDADE_PATH}, que integra estes Termos para todos os fins, em especial o capítulo "Adultos na Comunidade dos Criadores". Os dados são tratados em conformidade com a LGPD (Lei nº 13.709/2018).`,
      ],
    },
    {
      titulo: '11. Das alterações destes termos',
      paragrafos: [
        'A Empresa pode alterar estes Termos para contratações futuras, publicando a versão atualizada nesta página com a respectiva data. Cada cobrança guarda a versão aceita no momento da compra. As alterações não prejudicam o preço, a duração, a garantia nem outros direitos já adquiridos.',
      ],
    },
    {
      titulo: '12. Da lei aplicável e do foro',
      paragrafos: [
        `Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir controvérsias, sem prejuízo do foro do domicílio do consumidor, garantido pelo Código de Defesa do Consumidor.`,
        `Dúvidas sobre estes Termos podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
  ],
}
