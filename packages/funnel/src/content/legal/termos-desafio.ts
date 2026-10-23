// Termos de Uso do "Desafio do Primeiro Jogo" (compra única, 30 dias de acesso), extraídos de
// `legal-kids.ts` (TERMOS_KIDS) sem as cláusulas da assinatura, que agora têm Termos próprios
// (`termos-comunidade-kids.ts`). A compra e o aceite são SEMPRE feitos por um adulto
// responsável; a criança é a aluna (a oferta comunica 9 a 17 anos e, desde 21/10/2026, também
// menores de 9 criando junto com o responsável). Fundamentos:
// CDC (garantia de 7 dias; o consumidor é o adulto comprador), ECA, Lei nº 15.211/2025 e
// Resolução CONANDA nº 163/2014 (comunicação dirigida aos pais).

import { EMPRESA, type LegalDoc } from '../legal'
import { POLITICA_PRIVACIDADE_PATH } from './privacidade'

const PRODUTO = 'Desafio do Primeiro Jogo'

export const TERMOS_DESAFIO: LegalDoc = {
  titulo: 'Termos de Uso do Desafio do Primeiro Jogo',
  descricao: `Condições para a contratação e o uso do ${PRODUTO}, da ${EMPRESA.razaoSocial}. A compra e o aceite são feitos por um adulto responsável.`,
  atualizadoEm: '21 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pelo Produto;`,
        'Responsável: a pessoa física maior de 18 anos que contrata o Produto e que declara ser pai, mãe ou responsável legal pela criança ou adolescente que irá utilizá-lo;',
        'Aluno: a criança ou o adolescente que utiliza o Produto sob a supervisão do Responsável. A criança menor de 9 anos usa o Produto junto com o Responsável, que lê as instruções e conduz o mouse;',
        `Desafio ou Produto: o ${PRODUTO}, uma trilha guiada de caráter educacional para a criança criar o seu primeiro jogo dentro do Estúdio, com acesso por prazo fixo pela área de membros da Empresa;`,
        'Mural: o Mural dos Criadores, espaço da plataforma em que os jogos publicados podem ser vistos e jogados;',
        'Área de membros: o ambiente on-line em que o Aluno acessa o conteúdo e cria os seus projetos, por meio da conta criada e gerida pelo Responsável.',
      ],
    },
    {
      titulo: '2. O que é e como funciona o Desafio',
      paragrafos: [
        `O ${PRODUTO} é um material digital de caráter educacional: uma trilha recomendada de etapas curtas em que a criança monta o primeiro jogo jogável, com passo a passo e um estúdio feito para crianças, sem instalar programas. A compra é feita neste site, com pagamento único via Pix ou cartão de crédito.`,
        'Após a aprovação do pagamento, o acesso às aulas do Desafio, ao Estúdio das atividades e ao Mural completo é liberado na área de membros por 30 (trinta) dias corridos, contados em períodos exatos de 24 horas. As instruções de primeiro acesso e a data final são enviadas ao e-mail do Responsável informado na compra. Por isso, é essencial que os dados do checkout estejam corretos.',
        'As etapas do Desafio representam a sequência recomendada do projeto, não dias corridos obrigatórios. Cada família pode distribuí-las dentro dos 30 dias de acesso.',
        'A Empresa pode atualizar o conteúdo, incluir bônus e melhorar a entrega do Produto. Essas mudanças não alteram o preço, a duração nem as demais condições congeladas no momento da compra.',
      ],
    },
    {
      titulo: '3. Quem pode contratar e usar',
      paragrafos: [
        'A contratação e o aceite destes Termos são feitos exclusivamente por um Responsável maior de 18 anos, que declara ser pai, mãe ou responsável legal pelo Aluno.',
        'O Aluno utiliza o Produto sob a supervisão e a responsabilidade do Responsável. A conta do Aluno é criada e gerida pelo Responsável e fica vinculada a ele, em linha com o ECA e a Lei nº 15.211/2025 (ECA Digital). Recomendamos o acompanhamento do adulto durante o uso, especialmente no primeiro acesso.',
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
        'O pagamento é único, não cria assinatura e não possui renovação automática. Ele é processado pela Efí S.A. Instituição de Pagamento ("Efí"), nas modalidades Pix e cartão de crédito. O preço vigente, eventual cupom e valor total são os exibidos no resumo do checkout no momento da compra.',
        'Os dados completos do cartão não transitam pelos servidores da Empresa: a captura é feita de forma segura, por tokenização, diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '7. Prazo de acesso, Mural e compras anteriores',
      paragrafos: [
        'O prazo de 30 (trinta) dias começa somente com a aprovação do pagamento. Uma cobrança criada, mas ainda pendente, não inicia a contagem. A data e a hora finais são calculadas a partir da aprovação e exibidas na página de confirmação e na área de membros.',
        'Depois do prazo, o acesso às aulas do Desafio termina. Permanece o acesso de visitante ao Mural, para ver e jogar os jogos disponíveis, sem novas publicações, comentários ou reações por esse acesso. O link do jogo já publicado continua funcionando enquanto a publicação estiver disponível.',
        'O progresso e os projetos permanecem armazenados conforme a Política de Privacidade e podem voltar a ficar disponíveis caso o Responsável adquira uma nova condição de acesso válida, inclusive uma assinatura da Comunidade dos Criadores Kids que inclua o Desafio.',
        'Compras vitalícias realizadas sob ofertas anteriores permanecem vitalícias nos termos contratados na época. A condição de 30 dias do Desafio não reduz nem substitui direitos de acesso já adquiridos.',
      ],
    },
    {
      titulo: '8. Garantia e reembolso',
      paragrafos: [
        `O Responsável pode solicitar o reembolso integral em até 7 (sete) dias corridos a contar da compra, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento e o acesso à área de membros é encerrado.',
        'O prazo de garantia não aumenta, pausa nem reinicia o período de 30 dias de acesso do Desafio.',
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
        'A Empresa pode alterar estes Termos para contratações futuras, publicando a versão atualizada nesta página com a respectiva data. Cada cobrança guarda a versão aceita no momento da compra. As alterações não prejudicam o preço, a duração, a garantia nem outros direitos já adquiridos.',
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
