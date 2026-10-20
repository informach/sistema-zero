// Termos de Uso da assinatura "Comunidade dos Criadores Kids" (mensal ou anual), extraídos de
// `legal-kids.ts` (TERMOS_KIDS) com todas as cláusulas da assinatura. A compra e o aceite são
// SEMPRE feitos por um adulto responsável; o Aluno é menor de 18 anos e, abaixo de 9, usa a
// plataforma junto com o responsável (decisão da dona, 19 e 20/10/2026). Fundamentos: CDC
// (garantia de 7 dias por contratação; o consumidor é o adulto comprador), ECA, Lei nº
// 15.211/2025 e Resolução CONANDA nº 163/2014 (comunicação dirigida aos pais).
// ⚠️ "não promete renda, emprego ou carreira" fica de propósito: ali "carreira" tem o sentido
// profissional que a cláusula nega (exceção à regra da Jornada no CLAUDE.md do funil).

import { EMPRESA, type LegalDoc } from '../legal'
import { POLITICA_PRIVACIDADE_PATH } from './privacidade'

const DESAFIO = 'Desafio do Primeiro Jogo'
const ASSINATURA = 'Comunidade dos Criadores Kids'

export const TERMOS_COMUNIDADE_KIDS: LegalDoc = {
  titulo: 'Termos de Uso da Comunidade dos Criadores Kids',
  descricao: `Condições para a contratação e o uso da assinatura da ${ASSINATURA}, a área infantil da plataforma da ${EMPRESA.razaoSocial}. A compra e o aceite são feitos por um adulto responsável.`,
  atualizadoEm: '20 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pelo Produto;`,
        'Responsável: a pessoa física maior de 18 anos que contrata o Produto e que declara ser pai, mãe ou responsável legal pela criança ou adolescente que irá utilizá-lo;',
        'Aluno: a criança ou o adolescente menor de 18 anos que utiliza o Produto sob a supervisão do Responsável; abaixo de 9 anos, o uso acontece junto com o Responsável, que lê e conduz as sessões;',
        `Assinatura ou Produto: a ${ASSINATURA}, o acesso por assinatura mensal ou anual à plataforma educacional da Empresa (cursos, Estúdio e demais ferramentas liberadas conforme a Jornada do Criador, Mural, Clube, revisão das atividades enviadas e respostas por escrito às dúvidas), para até 2 (dois) perfis de Aluno na mesma conta;`,
        `Desafio: o ${DESAFIO}, uma trilha guiada de caráter educacional para a criança criar o seu primeiro jogo dentro do Estúdio, incluída na Assinatura;`,
        'Jornada do Criador: o percurso de etapas da plataforma; conforme o Aluno avança nele, cursos e ferramentas de criação são liberados;',
        'Área de membros: o ambiente on-line em que o Aluno acessa o conteúdo e cria os seus projetos, por meio da conta criada e gerida pelo Responsável.',
      ],
    },
    {
      titulo: '2. O que é e como funciona a Assinatura',
      paragrafos: [
        `A ${ASSINATURA} é uma assinatura de acesso continuado à plataforma educacional da Empresa. Ela inclui o Desafio, os cursos disponíveis e os que forem publicados durante a vigência, as ferramentas de criação, o Mural, o Clube dos Criadores, a revisão das atividades enviadas pela equipe e as respostas por escrito às dúvidas enviadas pelo botão Preciso de ajuda, que chegam nos Recados, para até 2 (dois) perfis de Aluno na mesma conta. As aulas são gravadas e não incluem professor ao vivo.`,
        'Cursos e ferramentas são liberados de forma gradual, conforme o avanço do Aluno na Jornada do Criador, sem qualquer cobrança adicional por essa liberação. A plataforma está em lançamento: o catálogo de cursos cresce ao longo do tempo e a Empresa informa, dentro da própria plataforma, o que já está disponível e o que depende do avanço do Aluno.',
        'A Empresa pode atualizar o conteúdo, incluir bônus e melhorar a entrega do Produto. Essas mudanças não alteram o preço, a duração nem as demais condições congeladas no momento de cada compra ou de cada ciclo já pago.',
      ],
    },
    {
      titulo: '3. Quem pode contratar e usar',
      paragrafos: [
        'A contratação e o aceite destes Termos são feitos exclusivamente por um Responsável maior de 18 anos, que declara ser pai, mãe ou responsável legal pelo Aluno.',
        'O Aluno utiliza o Produto sob a supervisão e a responsabilidade do Responsável. A conta do Aluno é criada e gerida pelo Responsável e fica vinculada a ele, em linha com o ECA e a Lei nº 15.211/2025 (ECA Digital). Recomendamos o acompanhamento do adulto durante o uso, especialmente no primeiro acesso. Abaixo de 9 (nove) anos, o uso acontece junto com o Responsável, que lê e conduz as sessões.',
        'O Clube dos Criadores é um espaço restrito aos Alunos, com moderação prévia das publicações. O perfil público do Aluno começa desligado e só é ativado por decisão do Responsável. O Responsável pode solicitar a remoção de qualquer conteúdo publicado pelo Aluno.',
      ],
    },
    {
      titulo: '4. Das responsabilidades',
      paragrafos: ['São responsabilidades de cada parte:'],
      bullets: [
        'Da Empresa: descrever o Produto de forma lícita e transparente; entregar o acesso após a confirmação do pagamento; proteger os dados pessoais conforme a LGPD e a Política de Privacidade; e prestar suporte pelo e-mail de contato;',
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
        'O Responsável escolhe o plano mensal ou o plano anual. As cobranças são processadas pela Efí S.A. Instituição de Pagamento ("Efí"), nas modalidades Pix e cartão de crédito. No cartão de crédito, a assinatura é recorrente: a cobrança se repete automaticamente a cada período (mensal ou anual) até o cancelamento. O plano anual também pode ser pago à vista via Pix; nesse caso, o pagamento garante 12 (doze) meses de acesso, não cria cobrança recorrente, e a continuidade depende de uma nova contratação, para a qual a Empresa envia um lembrete por e-mail antes do vencimento. Cupons de desconto não se aplicam à Assinatura. O plano, o valor, a periodicidade e a forma de renovação são exibidos no checkout antes do pagamento e ficam registrados na conta do Responsável.',
        'Se uma cobrança recorrente não for aprovada, a Empresa avisa o Responsável por e-mail. O acesso continua até o fim do período já pago, acrescido de um curto prazo de tolerância, e é pausado automaticamente caso o pagamento não seja regularizado. O Responsável pode reativar a assinatura a qualquer momento.',
        'Os dados completos do cartão não transitam pelos servidores da Empresa: a captura é feita de forma segura, por tokenização, diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '7. Prazo de acesso, cancelamento e projetos',
      paragrafos: [
        'O acesso vale por cada período pago. O Responsável pode cancelar a renovação a qualquer momento pela sua área na plataforma (em "Minhas compras"), sem multa, sem fidelidade e sem necessidade de justificar. O cancelamento interrompe as cobranças futuras e o acesso continua até o fim do período já pago.',
        'Depois do término, os projetos e o progresso permanecem armazenados conforme a Política de Privacidade, e os jogos publicados pelo Aluno continuam acessíveis para visita no Mural.',
      ],
    },
    {
      titulo: '8. Garantia e reembolso',
      paragrafos: [
        `A garantia de 7 (sete) dias vale para cada contratação, contada a partir da compra: a primeira assinatura e, no plano anual pago via Pix, cada nova contratação de 12 (doze) meses. Dentro desse prazo, o Responsável pode solicitar o reembolso integral, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento e o acesso à área de membros é encerrado.',
        `Para os ciclos de renovação automática no cartão, o Responsável pode cancelar a qualquer momento conforme a cláusula 7, e dúvidas sobre uma cobrança de renovação podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '9. Da propriedade intelectual',
      paragrafos: [
        'Todo o conteúdo do Produto e deste site (textos, imagens, vídeos, marcas, layout, trilha e materiais) é de titularidade da Empresa e protegido pelas Leis nº 9.610/1998 (Direitos Autorais) e nº 9.609/1998 (Software). A aquisição concede uma licença de uso pessoal, limitada, não exclusiva e intransferível, vedada a reprodução, distribuição ou revenda.',
        'As criações feitas pelo Aluno na plataforma (como o jogo montado no Estúdio) pertencem ao Aluno e ao seu Responsável. Ao usar o Produto, o Responsável autoriza a Empresa a armazenar e exibir essas criações na área de membros para o funcionamento do serviço. Caso o Responsável opte por gerar um link público de uma criação, essa publicação é feita sob a sua responsabilidade, e a Empresa pode moderar ou remover conteúdo que viole a lei ou estes Termos.',
      ],
    },
    {
      titulo: '10. Isenção de garantias de resultado',
      paragrafos: [
        'O Produto tem caráter educacional e informativo. Os exemplos e demonstrações não constituem promessa ou garantia de resultados específicos, que dependem da dedicação, do contexto e do acompanhamento de cada família.',
      ],
    },
    {
      titulo: '11. Da privacidade e proteção de dados',
      paragrafos: [
        `O tratamento de dados pessoais é regido pela Política de Privacidade, disponível neste site em ${POLITICA_PRIVACIDADE_PATH}, que integra estes Termos para todos os fins. Os dados de crianças e adolescentes são tratados no melhor interesse deles, com o consentimento do responsável, nos termos do art. 14 da LGPD (Lei nº 13.709/2018) e da Lei nº 15.211/2025 (ECA Digital), conforme o capítulo "Crianças e adolescentes" da Política.`,
      ],
    },
    {
      titulo: '12. Das alterações destes termos',
      paragrafos: [
        'A Empresa pode alterar estes Termos para contratações futuras, publicando a versão atualizada nesta página com a respectiva data. Cada cobrança guarda a versão aceita no momento da compra ou do ciclo. As alterações não prejudicam o preço, a duração, a garantia nem outros direitos já adquiridos, inclusive os de ciclos de assinatura já pagos.',
      ],
    },
    {
      titulo: '13. Da lei aplicável e do foro',
      paragrafos: [
        `Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo o ECA (Lei nº 8.069/1990) e a Lei nº 15.211/2025. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir controvérsias, sem prejuízo do foro do domicílio do consumidor, garantido pelo Código de Defesa do Consumidor.`,
        `Dúvidas sobre estes Termos podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
  ],
}
