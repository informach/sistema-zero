// Termos de Uso da assinatura "Comunidade dos Criadores" para ADULTOS (mensal ou anual), a área
// adulta da mesma plataforma do Kids (decisão da dona, 19 e 20/10/2026: mesmo nome, um Termo por
// oferta). Modelados nas cláusulas de assinatura de `termos-comunidade-kids.ts`, adaptadas a uma
// pessoa maior de 18 anos que contrata para si, com conta e dados próprios. Fundamentos: CDC
// (garantia de 7 dias por contratação, foro do domicílio do consumidor), LGPD e Leis nº
// 9.610/1998 e 9.609/1998. Cancelamento na página "Compras" da área adulta.

import { EMPRESA, type LegalDoc } from '../legal'
import { POLITICA_PRIVACIDADE_PATH } from './privacidade'

const ASSINATURA = 'Comunidade dos Criadores'

export const TERMOS_COMUNIDADE_ADULTO: LegalDoc = {
  titulo: 'Termos de Uso da Comunidade dos Criadores',
  descricao: `Condições para a contratação e o uso da assinatura da ${ASSINATURA}, a área adulta da plataforma da ${EMPRESA.razaoSocial}, contratada por pessoa maior de 18 anos para uso próprio.`,
  atualizadoEm: '20 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Das definições',
      paragrafos: ['Para os fins destes Termos, consideram-se:'],
      bullets: [
        `Empresa: ${EMPRESA.razaoSocial}, inscrita no CNPJ sob o nº ${EMPRESA.cnpj}, titular deste site e responsável pela Assinatura;`,
        'Usuário: a pessoa física maior de 18 anos que contrata a Assinatura para uso próprio, com conta e dados pessoais próprios;',
        `Assinatura: a ${ASSINATURA}, o acesso por assinatura mensal ou anual à área adulta da plataforma educacional da Empresa, com os cursos, as Ferramentas, o Mural, o Clube e os demais recursos descritos na cláusula 2;`,
        'Área de membros: o ambiente on-line em que o Usuário acessa os cursos, cria os seus projetos e acompanha as suas compras, mediante login e senha pessoais;',
        'Jornada: o percurso de etapas da área adulta; ao concluir os cursos pedidos em cada etapa, o Usuário avança para a seguinte, e algumas etapas liberam novas Ferramentas ou novos recursos delas;',
        'Ferramentas: os recursos de criação da plataforma, que incluem o Estúdio (editor de jogos com os modos blocos; Ponte, em que os blocos aparecem ao lado do código gerado; e Estúdio Pro, em que o jogo é escrito em código), o Pinta (desenho 2D), o Molda (modelagem 3D), o Pensa (planejamento da ideia de um jogo, organizada em tarefas) e o Zappy (tutor virtual do Estúdio);',
        'Mural: o Mural dos Criadores, espaço em que o Usuário publica os seus jogos, cada um com um link público que abre no celular, sem login;',
        'Clube: o espaço de conversa entre os membros da área adulta, sujeito às regras de convivência destes Termos e à moderação.',
      ],
    },
    {
      titulo: '2. O que é e como funciona a Assinatura',
      paragrafos: [
        `A ${ASSINATURA} é uma assinatura de acesso continuado à área adulta da plataforma educacional da Empresa. Ela inclui os cursos disponíveis e os que forem publicados durante a vigência, em que cada curso conduz à construção de um jogo completo; as Ferramentas; o Mural; o Clube; o Desafio do mês; o ranking; o certificado de conclusão dos cursos, com página pública de validação; e o canal Recados, para mensagens à equipe da Empresa.`,
        'Cursos e Ferramentas são liberados de forma gradual, conforme o avanço do Usuário nas etapas da Jornada, sem qualquer cobrança adicional por essa liberação. A plataforma está em lançamento: o catálogo de cursos cresce ao longo do tempo e a Empresa informa, dentro da própria plataforma, o que já está disponível e o que depende do avanço do Usuário.',
        'O Pensa e o Zappy usam provedores de inteligência artificial. O Zappy lê os blocos do projeto e indica o que conferir, sem alterar o projeto. O uso desses recursos tem um limite mensal de pedidos, além de um limite diário, exibidos no perfil do Usuário, sem cobrança adicional; atingido um limite, novos pedidos voltam a ser aceitos quando ele se renova.',
        'A plataforma funciona no navegador, sem instalar programas, e os jogos publicados no Mural abrem também no celular.',
        'A Empresa pode atualizar o conteúdo, incluir bônus e melhorar a entrega da Assinatura. Essas mudanças não alteram o preço, a duração nem as demais condições congeladas no momento de cada compra ou de cada ciclo já pago.',
      ],
    },
    {
      titulo: '3. Quem pode contratar e usar',
      paragrafos: [
        'A contratação e o aceite destes Termos são feitos exclusivamente por pessoa física maior de 18 anos, que contrata a Assinatura para uso próprio.',
        'A conta é pessoal e intransferível, criada com os dados do próprio Usuário, e não pode ser usada por outra pessoa, inclusive por crianças ou adolescentes. Para crianças e adolescentes, a Empresa oferece produtos próprios, contratados por um responsável e regidos por termos específicos.',
        'O perfil público e a voz começam desligados e só são ativados pelo próprio Usuário, no seu perfil. No Mural e no ranking, o nome do Usuário só aparece com o perfil público ligado.',
      ],
    },
    {
      titulo: '4. Das responsabilidades',
      paragrafos: ['São responsabilidades de cada parte:'],
      bullets: [
        'Da Empresa: descrever a Assinatura de forma lícita e transparente; entregar o acesso após a confirmação do pagamento; proteger os dados pessoais conforme a LGPD e a Política de Privacidade; e prestar suporte pelo e-mail de contato;',
        'Do Usuário: fornecer dados verdadeiros e atualizados; manter a guarda e o sigilo do login e da senha (o acesso é pessoal e intransferível); respeitar as regras de convivência da cláusula 5; e utilizar o conteúdo da plataforma apenas para fins pessoais e não comerciais, sem prejuízo da titularidade sobre as próprias criações prevista na cláusula 9.',
      ],
      posBullets: [
        'O compartilhamento de credenciais ou do conteúdo com terceiros viola estes Termos e pode acarretar a suspensão do acesso, sem prejuízo das medidas legais cabíveis.',
      ],
    },
    {
      titulo: '5. Regras de convivência no Clube e no Mural',
      paragrafos: [
        'O Clube e o Mural, incluindo as conversas sobre os jogos e as participações no Desafio do mês, são espaços compartilhados com outros membros. O Usuário é responsável pelo que publica e não pode publicar ou enviar:',
      ],
      bullets: [
        'conteúdo ofensivo, discriminatório, ameaçador, sexualmente explícito ou que incentive a violência;',
        'conteúdo ilegal ou que incentive a prática de atos ilegais;',
        'conteúdo que viole direitos de terceiros, como direitos autorais, marcas, imagem e privacidade;',
        'dados pessoais de outras pessoas, como telefone, endereço ou documentos, sem autorização;',
        'propaganda não autorizada, correntes, spam ou links enganosos ou maliciosos;',
        'tentativas de burlar a segurança da plataforma, os limites de uso ou o acesso de outros membros.',
      ],
      posBullets: [
        'As publicações estão sujeitas a moderação. A Empresa pode remover conteúdo que viole a lei ou estes Termos e, em caso de abuso, suspender ou encerrar a conta, sem prejuízo das medidas legais cabíveis.',
        `Conteúdos impróprios podem ser relatados pelo e-mail ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '6. Do pagamento',
      paragrafos: [
        'O Usuário escolhe o plano mensal ou o plano anual. As cobranças são processadas pela Efí S.A. Instituição de Pagamento ("Efí"), nas modalidades Pix e cartão de crédito. O plano mensal é pago com cartão de crédito, e a assinatura é recorrente: a cobrança se repete automaticamente a cada mês até o cancelamento. O plano anual pode ser pago com cartão de crédito, também de forma recorrente (a cobrança se repete a cada ano até o cancelamento), ou à vista via Pix. No Pix, o pagamento garante 12 (doze) meses de acesso, não cria cobrança recorrente, e a continuidade depende de uma nova contratação, para a qual a Empresa envia um lembrete por e-mail antes do vencimento.',
        'Cupons de desconto não se aplicam à Assinatura. O plano, o valor, a periodicidade e a forma de renovação são exibidos no checkout antes do pagamento e ficam registrados na conta do Usuário.',
        'Se uma cobrança recorrente não for aprovada, a Empresa avisa o Usuário por e-mail. O acesso continua até o fim do período já pago, acrescido de um curto prazo de tolerância, e é pausado automaticamente caso o pagamento não seja regularizado. O Usuário pode reativar a assinatura a qualquer momento.',
        'Os dados completos do cartão não transitam pelos servidores da Empresa: a captura é feita de forma segura, por tokenização, diretamente pelo processador de pagamentos.',
      ],
    },
    {
      titulo: '7. Prazo de acesso, cancelamento e projetos',
      paragrafos: [
        'O acesso vale por cada período pago. O Usuário pode cancelar a renovação a qualquer momento pela página "Compras" da área adulta, sem multa, sem fidelidade e sem necessidade de justificar. O cancelamento interrompe as cobranças futuras e o acesso continua até o fim do período já pago.',
        `Depois do término, os projetos e o progresso permanecem armazenados conforme a Política de Privacidade e podem voltar a ficar disponíveis caso o Usuário contrate novamente. Os jogos publicados pelo Usuário continuam acessíveis para visita no Mural, salvo se ele pedir a remoção, o que pode fazer a qualquer momento pelo e-mail ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '8. Garantia e reembolso',
      paragrafos: [
        `A garantia de 7 (sete) dias vale para cada contratação, contada a partir da compra: a primeira assinatura e, no plano anual pago via Pix, cada nova contratação de 12 (doze) meses. Dentro desse prazo, o Usuário pode solicitar o reembolso integral, conforme o art. 49 do Código de Defesa do Consumidor, por qualquer motivo. Basta enviar a solicitação para ${EMPRESA.email} informando o e-mail usado na compra.`,
        'Confirmada a solicitação dentro do prazo, o valor é estornado pelo mesmo meio de pagamento e o acesso à área de membros é encerrado.',
        `Para os ciclos de renovação automática no cartão, o Usuário pode cancelar a qualquer momento conforme a cláusula 7, e dúvidas sobre uma cobrança de renovação podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
    {
      titulo: '9. Da propriedade intelectual',
      paragrafos: [
        'Todo o conteúdo da plataforma e deste site (textos, imagens, vídeos, marcas, layout, cursos, Ferramentas e materiais) é de titularidade da Empresa e protegido pelas Leis nº 9.610/1998 (Direitos Autorais) e nº 9.609/1998 (Software). A Assinatura concede uma licença de uso pessoal, limitada, não exclusiva e intransferível, vedada a reprodução, distribuição ou revenda.',
        'As criações feitas pelo Usuário na plataforma (como jogos, desenhos, modelos 3D e planos) pertencem ao Usuário. Elementos fornecidos pela Empresa e usados numa criação, como personagens, cenários e outros materiais prontos dos cursos, continuam de titularidade da Empresa.',
        'Ao usar a Assinatura, o Usuário autoriza a Empresa, de forma gratuita e não exclusiva, a armazenar e exibir as suas criações na área de membros, para o funcionamento do serviço, e no Mural, enquanto estiverem publicadas, inclusive para que outros membros as joguem, comentem e façam a própria versão delas pelos recursos da plataforma. Essa autorização, em relação a um jogo publicado, termina quando ele é removido do Mural, ressalvadas as versões já criadas por outros membros.',
        'A Empresa pode moderar ou remover conteúdo que viole a lei, direitos de terceiros ou estes Termos.',
      ],
    },
    {
      titulo: '10. Recursos de inteligência artificial',
      paragrafos: [
        'O Pensa, o Zappy e a sugestão de descrição de jogo usam modelos de inteligência artificial de terceiros e podem produzir respostas incompletas, imprecisas ou incorretas. Eles orientam o Usuário, mas não substituem o seu julgamento: cabe ao Usuário conferir as sugestões e decidir o que usar no próprio projeto.',
        'O que é enviado aos provedores de inteligência artificial e como esses dados são tratados está descrito na Política de Privacidade.',
      ],
    },
    {
      titulo: '11. Isenção de garantias de resultado',
      paragrafos: [
        'A Assinatura tem caráter educacional e informativo e não promete renda, emprego ou carreira. Os exemplos e demonstrações não constituem promessa ou garantia de resultados específicos, que dependem da dedicação, do contexto e da aplicação individual de cada Usuário.',
      ],
    },
    {
      titulo: '12. Da privacidade e proteção de dados',
      paragrafos: [
        `O tratamento de dados pessoais é regido pela Política de Privacidade, disponível neste site em ${POLITICA_PRIVACIDADE_PATH}, que integra estes Termos para todos os fins, em especial o capítulo "Adultos na Comunidade dos Criadores". Os dados são tratados em conformidade com a LGPD (Lei nº 13.709/2018).`,
      ],
    },
    {
      titulo: '13. Das alterações destes termos',
      paragrafos: [
        'A Empresa pode alterar estes Termos para contratações futuras, publicando a versão atualizada nesta página com a respectiva data. Cada cobrança guarda a versão aceita no momento da compra ou do ciclo. As alterações não prejudicam o preço, a duração, a garantia nem outros direitos já adquiridos, inclusive os de ciclos de assinatura já pagos.',
      ],
    },
    {
      titulo: '14. Da lei aplicável e do foro',
      paragrafos: [
        `Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de ${EMPRESA.foro} para dirimir controvérsias, sem prejuízo do foro do domicílio do consumidor, garantido pelo Código de Defesa do Consumidor.`,
        `Dúvidas sobre estes Termos podem ser enviadas para ${EMPRESA.email}.`,
      ],
    },
  ],
}
