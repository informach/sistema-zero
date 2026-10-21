// Termos de Uso do "Desafio do Primeiro Jogo" para ADULTOS (compra única, 30 dias de acesso), a
// versão adulta do mesmo curso (A Chave do Farol) na área adulta da plataforma (decisão da dona em
// 21/10/2026: mesma oferta do Kids, mesmo preço e condições). Modelados em `termos-desafio.ts`,
// adaptados a uma pessoa maior de 18 anos que contrata para si, com conta e dados próprios, como
// `termos-comunidade-adulto.ts`. Fundamentos: CDC (garantia de 7 dias, foro do domicílio do
// consumidor), LGPD e Leis nº 9.610/1998 e 9.609/1998.

import { EMPRESA, type LegalDoc } from '../legal'
import { POLITICA_PRIVACIDADE_PATH } from './privacidade'

const PRODUTO = 'Desafio do Primeiro Jogo'

export const TERMOS_DESAFIO_ADULTO: LegalDoc = {
  titulo: 'Termos de Uso do Desafio do Primeiro Jogo para adultos',
  descricao: `Condições para a contratação e o uso do ${PRODUTO} na área adulta da plataforma da ${EMPRESA.razaoSocial}, contratado por pessoa maior de 18 anos para uso próprio.`,
  atualizadoEm: '21 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pelo Produto;`,
        'Usuário: a pessoa física maior de 18 anos que contrata o Produto para uso próprio, com conta e dados pessoais próprios;',
        `Desafio ou Produto: o ${PRODUTO}, uma trilha guiada de caráter educacional para o Usuário criar o seu primeiro jogo dentro do Estúdio, com acesso por prazo fixo pela área de membros da Empresa;`,
        'Mural: o Mural dos Criadores, espaço da plataforma em que os jogos publicados podem ser vistos e jogados;',
        'Área de membros: o ambiente on-line em que o Usuário acessa o conteúdo e cria os seus projetos, mediante login e senha pessoais.',
      ],
    },
    {
      titulo: '2. O que é e como funciona o Desafio',
      paragrafos: [
        `O ${PRODUTO} é um material digital de caráter educacional: uma trilha recomendada de etapas curtas em que o Usuário monta o primeiro jogo jogável, com passo a passo e o Estúdio da plataforma, sem instalar programas. A compra é feita neste site, com pagamento único via Pix ou cartão de crédito.`,
        'Após a aprovação do pagamento, o acesso às aulas do Desafio, ao Estúdio das atividades e ao Mural completo é liberado na área de membros por 30 (trinta) dias corridos, contados em períodos exatos de 24 horas. As instruções de primeiro acesso e a data final são enviadas ao e-mail informado na compra. Por isso, é essencial que os dados do checkout estejam corretos.',
        'As etapas do Desafio representam a sequência recomendada do projeto, não dias corridos obrigatórios. O Usuário pode distribuí-las dentro dos 30 dias de acesso.',
        'A Empresa pode atualizar o conteúdo, incluir bônus e melhorar a entrega do Produto. Essas mudanças não alteram o preço, a duração nem as demais condições congeladas no momento da compra.',
      ],
    },
    {
      titulo: '3. Quem pode contratar e usar',
      paragrafos: [
        'A contratação e o aceite destes Termos são feitos exclusivamente por pessoa física maior de 18 anos, que contrata o Produto para uso próprio.',
        'A conta é pessoal e intransferível, criada com os dados do próprio Usuário, e não pode ser usada por outra pessoa, inclusive por crianças ou adolescentes. Para crianças e adolescentes, a Empresa oferece o Desafio do Primeiro Jogo Kids, contratado por um adulto responsável.',
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
      titulo: '6. Prazo de acesso e Mural',
      paragrafos: [
        'O prazo de 30 (trinta) dias começa somente com a aprovação do pagamento. Uma cobrança criada, mas ainda pendente, não inicia a contagem. A data e a hora finais são calculadas a partir da aprovação e exibidas na página de confirmação e na área de membros.',
        'Depois do prazo, o acesso às aulas do Desafio termina. Permanece o acesso de visitante ao Mural, para ver e jogar os jogos disponíveis, sem novas publicações, comentários ou reações por esse acesso. O link do jogo já publicado continua funcionando enquanto a publicação estiver disponível.',
        'O progresso e os projetos permanecem armazenados conforme a Política de Privacidade e podem voltar a ficar disponíveis caso o Usuário adquira uma nova condição de acesso válida, inclusive uma assinatura da Comunidade dos Criadores para adultos.',
      ],
    },
    {
      titulo: '7. Garantia e reembolso',
      paragrafos: [
        `O Usuário pode solicitar o reembolso integral em até 7 (sete) dias corridos a contar da compra, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento e o acesso à área de membros é encerrado.',
        'O prazo de garantia não aumenta, pausa nem reinicia o período de 30 dias de acesso do Desafio.',
      ],
    },
    {
      titulo: '8. Da propriedade intelectual',
      paragrafos: [
        'Todo o conteúdo do Produto e deste site (textos, imagens, vídeos, marcas, layout, trilha e materiais) é de titularidade da Empresa e protegido pelas Leis nº 9.610/1998 (Direitos Autorais) e nº 9.609/1998 (Software). A aquisição concede uma licença de uso pessoal, limitada, não exclusiva e intransferível, vedada a reprodução, distribuição ou revenda.',
        'As criações feitas pelo Usuário na plataforma (como o jogo montado no Estúdio) pertencem ao Usuário. Elementos fornecidos pela Empresa e usados numa criação, como personagens, cenários e outros materiais prontos do curso, continuam sendo da Empresa. Ao usar o Produto, o Usuário autoriza a Empresa a armazenar e exibir essas criações na área de membros para o funcionamento do serviço e no Mural, enquanto estiverem publicadas. A Empresa pode moderar ou remover conteúdo que viole a lei ou estes Termos.',
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
