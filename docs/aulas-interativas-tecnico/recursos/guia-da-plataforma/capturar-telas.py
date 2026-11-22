"""Tira os prints reais da área das crianças para o guia da plataforma dos passo a passo.

Para cada curso, abre as quatro primeiras partes da Aula 1 no staging, fotografa as telas e mede
onde fica cada controle marcado no PDF. Saída em `telas/<curso>/`: as imagens e `marcas.json`,
com a caixa de cada marca em porcentagem da imagem e o nome que o controle mostra na tela. O
gerador do PDF lê só esses arquivos: gerar o PDF não precisa de login.

Requisitos:
- Python com Playwright e Chrome instalado.
- Uma sessão de criança no staging, salva como storage state do Playwright. Para criar: entre na
  Área dos pais com a conta de testes, em Acesso nos aparelhos autorize "Neste aparelho" por
  "Somente hoje", clique em Ir para a área da criança, escolha o perfil e salve o estado do
  navegador (`context.storage_state(path=...)`).

    SZ_KIDS_SESSAO=caminho/da/sessao.json python capturar-telas.py [cade-todo-mundo|desafio-primeiro-jogo|ilha-do-farol]

A Ilha do Farol (22/11/2026) tem a sua própria tela, o jogo em 3D ampliado na Parte 1 da Aula 1, com
os botões da vista, que ficam dentro do jogo (`no_jogo`). Tira também as duas fotos da página da
câmera do caderno (`FOTOS`): a vista do começo e a cena girada, sem marcas; e as da página de
encostar, a experiência da Aula 2, Parte 3, olhando de cima e de lado.

Abrir as partes muda só a parte em que a aula reabre para aquele perfil de testes.

Os prints mostram a tela de quem chega pela primeira vez. Se o perfil de testes já enviou o
projeto, o botão de envio aparece com o nome da primeira vez (`Enviar meu projeto`) e o aviso de
envio antigo sai da imagem; a marca d'água do vídeo, que mostra o identificador do perfil, também.
"""
from pathlib import Path
import json
import os
import sys
from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
BASE = os.environ.get('SZ_KIDS_URL', 'https://community-kids-staging.up.railway.app')
ESCALA = 2

CURSOS = {
    'cade-todo-mundo': 'f59382bb-9791-42ac-8912-7f011c2959d1',
    'desafio-primeiro-jogo': '38b1df5b-cd0e-4888-ae00-b319a582a567',
    'ilha-do-farol': 'f63fe236-5862-42c9-81c8-cb26a113eac2',
}
# O endereço do curso, quando não é o nome da pasta dos prints.
SLUG = {'ilha-do-farol': 'jornada-faisca-base-3d'}

# Alvos: {'botao': nome} pelo nome acessível ou texto (começo, sem diferença de maiúsculas),
# {'texto': t} pelo menor elemento com esse texto, {'cartao': selo} pelo cartão do selo da parte
# (Assista, Jogue, Leia...), {'css': seletor} e {'uniao': [alvos]} para uma caixa só.
# `subir: n` marca o elemento n níveis acima (o selo inteiro em vez da palavra) e
# {'pai_de': alvo} a fileira que contém o botão (as abas do Estúdio).
# `opcional` deixa a marca de fora quando o curso não tem aquele controle.
TELAS = [
    {
        'id': 'aula', 'parte': 1, 'tela': (1440, 900),
        'marcas': [
            {'id': 'progresso', 'alvo': {'texto_re': r'^Parte \d+ de \d+$'}, 'ancora': 'b'},
            {'id': 'video', 'alvo': {'cartao': 'Assista'}, 'ancora': 'tr'},
            {'id': 'zappy', 'alvo': {'cartao': 'O Zappy fala'}, 'ancora': 'tl'},
            {'id': 'atividade', 'alvo': {'cartao': 'Jogue'}, 'ancora': 'tl'},
            {'id': 'ampliar-jogo', 'alvo': {'botao': 'Ampliar jogo'}, 'ancora': 'b'},
            {'id': 'jogar-de-novo', 'alvo': {'botao': 'Jogar de novo'}, 'ancora': 'b'},
            {'id': 'menu', 'alvo': {'botao': 'Mostrar menu'}, 'ancora': 'b'},
            {'id': 'lista-de-aulas', 'alvo': {'botao': 'Mostrar lista de aulas'}, 'ancora': 'l'},
            {'id': 'ajuda', 'alvo': {'botao': 'Preciso de ajuda'}, 'ancora': 't'},
            {'id': 'proxima-parte', 'alvo': {'botao': 'Próxima parte'}, 'ancora': 't'},
        ],
    },
    {
        'id': 'modo-focado', 'parte': 1, 'tela': (1440, 900),
        'antes': [{'clicar': 'Ampliar jogo'}],
        'depois': [{'clicar': 'Voltar à aula'}],
        'marcas': [
            {'id': 'voltar-a-aula', 'alvo': {'botao': 'Voltar à aula'}, 'ancora': 'b'},
            {'id': 'video-no-foco', 'alvo': {'botao': 'Vídeo'}, 'ancora': 'b'},
            {'id': 'jogar-de-novo', 'alvo': {'botao': 'Jogar de novo'}, 'ancora': 'b'},
        ],
    },
    {
        'id': 'passo-a-passo', 'parte': 2, 'tela': (1440, 1180),
        'marcas': [
            {'id': 'leia', 'alvo': {'cartao': 'Leia'}, 'ancora': 'tl'},
            {'id': 'modos-do-livro', 'alvo': {'uniao': [{'botao': 'Livro 3D'}, {'botao': 'Ler por páginas'}]}, 'ancora': 'r'},
            {'id': 'paginas', 'alvo': {'uniao': [{'botao': 'Página anterior'}, {'botao': 'Próxima página'}]}, 'ancora': 'b'},
            {'id': 'livro-tela-cheia', 'alvo': {'css': '[aria-label="Tela cheia"], [aria-label="Ver em tela cheia"], [aria-label="Ampliar livro"]', 'dentro': {'cartao': 'Leia'}}, 'ancora': 'l'},
            {'id': 'baixar', 'alvo': {'botao': 'Baixar'}, 'ancora': 'r'},
        ],
    },
    {
        'id': 'experiencia', 'parte': 3, 'tela': (1440, 1900),
        'recorte': {'cartao': 'Experimente'},
        'marcas': [
            {'id': 'ampliar-experiencia', 'alvo': {'botao': 'Ampliar experiência'}, 'ancora': 'l'},
            {'id': 'balao', 'alvo': {'css': '.sz-fala-linha', 'dentro': {'cartao': 'Experimente'}}, 'ancora': 'tl'},
            {'id': 'sua-vez', 'alvo': {'texto_re': r'^Sua vez$'}, 'ancora': 'b'},
            {'id': 'som', 'alvo': {'botao': 'Desligar o som e a voz automática'}, 'ancora': 'b'},
            {'id': 'recomecar-experiencia', 'alvo': {'botao': 'Recomeçar experiência'}, 'ancora': 'r'},
            {'id': 'descobertas', 'alvo': {'texto_re': r'^Suas descobertas'}, 'ancora': 'l', 'opcional': True},
            {'id': 'testes', 'alvo': {'texto_re': r'^Seus testes'}, 'ancora': 'l', 'opcional': True},
        ],
    },
    {
        'id': 'estudio', 'parte': 4, 'tela': (1440, 1100),
        'recorte': {'cartao': 'Crie'},
        'marcas': [
            {'id': 'abas', 'alvo': {'pai_de': {'botao': 'Mensagens', 'exato': True}}, 'ancora': 'r'},
            {'id': 'paleta', 'alvo': {'css': '.blocklyToolbox'}, 'ancora': 'l'},
            {'id': 'area-do-projeto', 'alvo': {'area_blockly': True}, 'ancora': 'bl'},
            {'id': 'salvo', 'alvo': {'texto_re': r'^Salvo$', 'subir': 1}, 'ancora': 'r'},
            {'id': 'recomecar', 'alvo': {'botao': 'Recomeçar'}, 'ancora': 't'},
            {'id': 'expandir', 'alvo': {'botao': 'Expandir'}, 'ancora': 't'},
            {'id': 'enviar', 'alvo': {'botao': 'Enviar meu projeto'}, 'ancora': 't'},
            {'id': 'rodar', 'alvo': {'botao': 'Rodar de novo'}, 'ancora': 'l'},
            {'id': 'objetivos', 'alvo': {'texto_re': r'^Objetivos do projeto$'}, 'ancora': 'l'},
            {'id': 'verificar', 'alvo': {'botao': 'Verificar projeto'}, 'ancora': 't'},
        ],
    },
    {
        'id': 'estudio-expandido', 'parte': 4, 'tela': (1440, 900),
        'antes': [{'clicar': 'Expandir'}],
        'depois': [{'clicar': 'Reduzir'}],
        'marcas': [
            {'id': 'lado-dos-blocos', 'alvo': {'area_blockly': True}, 'ancora': 'tr'},
            {'id': 'lado-do-jogo', 'alvo': {'texto_re': r'^Jogo$', 'papel_nao': True}, 'ancora': 'b'},
            {'id': 'jogo-maior', 'alvo': {'botao': 'Jogo maior'}, 'ancora': 'b'},
            {'id': 'rodar-parar', 'alvo': {'uniao': [{'botao': 'Rodar de novo'}, {'botao': 'Parar'}]}, 'ancora': 'b'},
            {'id': 'desfazer', 'alvo': {'uniao': [{'botao': 'Desfazer'}, {'botao': 'Refazer'}]}, 'ancora': 'b'},
            {'id': 'video-no-estudio', 'alvo': {'botao': 'Vídeo'}, 'ancora': 'b'},
            {'id': 'reduzir', 'alvo': {'botao': 'Reduzir'}, 'ancora': 'b'},
        ],
    },
]

# A Ilha do Farol: o jogo em 3D ampliado. O aviso, a dica e os botões da vista são do próprio jogo,
# dentro do iframe: `no_jogo` mede lá dentro e soma o lugar do iframe; `{'jogo': True}` é o iframe.
TELAS_ILHA = [
    {
        'id': 'jogo-3d', 'parte': 1, 'tela': (1440, 900),
        'antes': [{'clicar': 'Ampliar jogo'}],
        'depois': [{'clicar': 'Voltar à aula'}],
        'recorte': {'jogo': True},
        'marcas': [
            {'id': 'aviso-do-jogo', 'alvo': {'no_jogo': {'texto_re': r'^Encontre a chave'}}, 'ancora': 'l'},
            {'id': 'dica-dos-controles', 'alvo': {'no_jogo': {'texto_re': r'^Setas ou WASD'}}, 'ancora': 'l'},
            {'id': 'aproximar', 'alvo': {'no_jogo': {'botao': 'Aproximar'}}, 'ancora': 'l'},
            {'id': 'afastar', 'alvo': {'no_jogo': {'botao': 'Afastar'}}, 'ancora': 'l'},
            {'id': 'girar', 'alvo': {'no_jogo': {'uniao': [{'botao': 'Girar a cena para um lado'}, {'botao': 'Girar a cena para o outro lado'}]}}, 'ancora': 'l'},
            {'id': 'vista-do-comeco', 'alvo': {'no_jogo': {'botao': 'Voltar à vista do começo'}}, 'ancora': 'l'},
        ],
    },
]
TELAS_DO_CURSO = {'ilha-do-farol': TELAS_ILHA}

# Fotos sem marcas para as páginas de conceito do caderno. `aula`: outra aula do curso; `ampliar`: o
# botão que amplia a atividade; `girar`: toques em "Girar a cena para o outro lado" (no jogo);
# `clicar`: botões da experiência; `corte`: o pedaço do jogo (esquerda, topo, direita, base, em
# fração do iframe), o mesmo nas duas vistas para a ilha ficar do mesmo tamanho; sem `corte`, a
# cena da experiência (o maior canvas). Na vista do começo, a pedra esconde a chave.
AULA_2_ILHA = '972c7cd4-7c5d-4395-853b-f263724c4348'
FOTOS = {
    'ilha-do-farol': [
        {'id': 'vista-do-comeco', 'parte': 1, 'ampliar': 'Ampliar jogo', 'girar': 0, 'corte': (0.12, 0.2, 0.9, 0.92)},
        {'id': 'vista-girada', 'parte': 1, 'ampliar': 'Ampliar jogo', 'girar': 6, 'corte': (0.12, 0.2, 0.9, 0.92)},
        {'id': 'encostar-de-cima', 'aula': AULA_2_ILHA, 'parte': 3, 'ampliar': 'Ampliar experiência', 'clicar': []},
        {'id': 'encostar-de-lado', 'aula': AULA_2_ILHA, 'parte': 3, 'ampliar': 'Ampliar experiência', 'clicar': ['Lado']},
    ],
}

# A cena da experiência: o maior canvas visível, com a moldura arredondada dele.
MAIOR_CANVAS = r"""
() => {
  const cs = [...document.querySelectorAll('canvas')].filter((c) => c.getClientRects().length)
  const r = cs.map((c) => c.getBoundingClientRect()).sort((a, b) => b.width * b.height - a.width * a.height)[0]
  return r ? { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height } : null
}
"""

# Procura no DOM. Devolve a caixa (coordenadas da página) e o nome que aparece na tela.
ACHAR = r"""
([alvo, recorte]) => {
  const visivel = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'
  // Por cima de tudo no centro: descarta a cópia escondida atrás de outra aba ou painel.
  const noTopo = (e) => {
    const r = e.getBoundingClientRect()
    const no = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return !!no && (no === e || e.contains(no))
  }
  const nome = (e) => (e.getAttribute('aria-label') || e.innerText || e.title || '').replace(/\s+/g, ' ').trim()
  const caixa = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height } }
  const norm = (t) => t.normalize('NFC').toLocaleLowerCase('pt-BR')
  const menor = (lista) => lista.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0]
  const cartao = (selo) => {
    const selos = [...document.querySelectorAll('main *')].filter((e) => visivel(e) && e.children.length <= 2 && norm(e.innerText || '').trim() === norm(selo))
    for (const s of selos) {
      let e = s
      while (e && e.parentElement && e.getBoundingClientRect().height < 160) e = e.parentElement
      if (e) return e
    }
    return null
  }
  const um = (a, raiz = document) => {
    if (a.uniao) {
      const partes = a.uniao.map((b) => um(b, raiz))
      if (partes.some((p) => !p)) return null
      const x = Math.min(...partes.map((p) => p.x)), y = Math.min(...partes.map((p) => p.y))
      const x2 = Math.max(...partes.map((p) => p.x + p.w)), y2 = Math.max(...partes.map((p) => p.y + p.h))
      return { x, y, w: x2 - x, h: y2 - y, nome: partes.map((p) => p.nome).join(' | ') }
    }
    if (a.pai_de) {
      const filho = um(a.pai_de, raiz)
      if (!filho) return null
      const el = document.elementFromPoint(filho.x - scrollX + 2, filho.y - scrollY + filho.h / 2)?.closest('button, [role=tab]')?.parentElement
      // A fileira se anuncia pelo papel ("Painéis do editor"); o que a criança lê são as abas.
      return el ? { ...caixa(el), nome: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) } : null
    }
    if (a.dentro) { const r = cartao(a.dentro.cartao); if (!r) return null; return um({ ...a, dentro: undefined }, r) }
    if (a.area_blockly) {
      // A parte do Estúdio onde ficam os blocos do projeto: o fundo do Blockly sem a paleta.
      const fundo = [...document.querySelectorAll('.blocklyMainBackground')].find(visivel)
      const paleta = [...document.querySelectorAll('.blocklyToolbox')].find(visivel)
      if (!fundo || !paleta) return null
      const f = caixa(fundo), p = caixa(paleta)
      const x = Math.max(f.x, p.x + p.w)
      return { x, y: f.y, w: f.x + f.w - x, h: f.h, nome: '' }
    }
    let el = null
    if (a.cartao) el = cartao(a.cartao)
    else if (a.css) el = [...raiz.querySelectorAll(a.css)].find(visivel) ?? null
    else if (a.botao) {
      const seletor = a.papel === 'tab' ? 'button, [role=tab]' : 'button, a, [role=tab], [role=button]'
      const quer = norm(a.botao)
      const achados = [...raiz.querySelectorAll(seletor)].filter(visivel).filter((e) => a.exato ? norm(nome(e)) === quer : norm(nome(e)).startsWith(quer))
      el = achados.find(noTopo) ?? achados[0] ?? null
    } else if (a.texto || a.texto_re) {
      const re = a.texto_re ? new RegExp(a.texto_re, 'i') : null
      const cand = [...raiz.querySelectorAll('body *')].filter((e) => visivel(e) && !['SCRIPT', 'STYLE'].includes(e.tagName)).filter((e) => {
        const t = (e.innerText || '').replace(/\s+/g, ' ').trim()
        return re ? re.test(t) : norm(t) === norm(a.texto)
      }).filter((e) => !a.papel_nao || !e.closest('button, [role=tab]'))
      el = menor(cand) ?? null
    }
    if (!el) return null
    for (let i = 0; i < (a.subir ?? 0) && el.parentElement; i++) el = el.parentElement
    return { ...caixa(el), nome: nome(el).slice(0, 80) }
  }
  return um(alvo)
}
"""

# Deixa a tela como a de quem chega pela primeira vez (ver o cabeçalho deste arquivo).
PRIMEIRA_VEZ = r"""
() => {
  document.activeElement?.blur?.()
  const textos = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const trocar = []
  while (textos.nextNode()) trocar.push(textos.currentNode)
  for (const t of trocar) {
    const v = t.nodeValue.trim()
    if (v === 'Enviar de novo') t.nodeValue = t.nodeValue.replace('Enviar de novo', 'Enviar meu projeto')
    if (/^Perfil [0-9a-f]{8}$/.test(v)) t.parentElement.style.visibility = 'hidden'
  }
  for (const b of document.querySelectorAll('button[aria-label="Enviar de novo"]')) b.setAttribute('aria-label', 'Enviar meu projeto')
  for (const e of document.querySelectorAll('main p, main div')) {
    const t = (e.innerText || '').trim()
    if (e.children.length <= 2 && (/^Projeto enviado! Foi em/.test(t) || /^Você mudou o projeto depois de enviar/.test(t))) e.style.display = 'none'
  }
}
"""


def ir_para(page, parte):
    for _ in range(10):
        atual = page.get_by_text(__import__('re').compile(r'^Parte \d+ de \d+$')).first.inner_text()
        n = int(atual.split()[1])
        if n == parte:
            break
        nome = 'Anterior' if n > parte else 'Próxima parte'
        page.get_by_role('button', name=nome, exact=True).first.click()
        page.wait_for_timeout(3500)
    page.wait_for_timeout(6000)


def frame_do_jogo(page):
    """O iframe do jogo em 3D: o que tem a barra da vista."""
    for frame in page.frames:
        try:
            if frame.evaluate("() => !!document.querySelector('[data-sz-vista]')"):
                return frame
        except Exception:
            continue
    return None


def achar(page, alvo):
    """A caixa do alvo em coordenadas da página, também dentro do jogo (`no_jogo`, `jogo`)."""
    if 'no_jogo' in alvo or alvo.get('jogo'):
        jogo = frame_do_jogo(page)
        if not jogo:
            return None
        quadro = jogo.frame_element().bounding_box()
        rolagem_x, rolagem_y = page.evaluate('() => [scrollX, scrollY]')
        if alvo.get('jogo'):
            return {'x': quadro['x'] + rolagem_x, 'y': quadro['y'] + rolagem_y, 'w': quadro['width'], 'h': quadro['height'], 'nome': ''}
        caixa = jogo.evaluate(ACHAR, [alvo['no_jogo'], None])
        if not caixa:
            return None
        escala = quadro['width'] / jogo.evaluate('() => innerWidth')
        return {
            **caixa,
            'x': quadro['x'] + rolagem_x + caixa['x'] * escala,
            'y': quadro['y'] + rolagem_y + caixa['y'] * escala,
            'w': caixa['w'] * escala,
            'h': caixa['h'] * escala,
        }
    return page.evaluate(ACHAR, [alvo, None])


def medir(page, tela, largura, altura):
    """Recorte da imagem e caixa de cada marca, em porcentagem do recorte."""
    if tela.get('recorte'):
        r = achar(page, tela['recorte'])
        if not r:
            return None, {}, ['recorte']
        recorte = {'x': max(r['x'] - 8, 0), 'y': max(r['y'] - 8, 0), 'width': r['w'] + 16, 'height': r['h'] + 16}
    else:
        recorte = {'x': 0, 'y': 0, 'width': largura, 'height': altura}
    marcas = {}
    faltando = []
    for marca in tela['marcas']:
        caixa = achar(page, marca['alvo'])
        if not caixa:
            if not marca.get('opcional'):
                faltando.append(marca['id'])
            continue
        x = (caixa['x'] - recorte['x']) / recorte['width'] * 100
        y = (caixa['y'] - recorte['y']) / recorte['height'] * 100
        w = caixa['w'] / recorte['width'] * 100
        h = caixa['h'] / recorte['height'] * 100
        if x < -1 or y < -1 or x + w > 101 or y + h > 101:
            faltando.append(f"{marca['id']} (fora da imagem)")
            continue
        marcas[marca['id']] = {'x': round(x, 2), 'y': round(y, 2), 'w': round(w, 2), 'h': round(h, 2), 'ancora': marca['ancora'], 'nome': caixa['nome']}
    return recorte, marcas, faltando


def capturar(curso):
    sessao = os.environ.get('SZ_KIDS_SESSAO')
    if not sessao or not Path(sessao).exists():
        raise RuntimeError('Defina SZ_KIDS_SESSAO com a sessão de criança salva (ver o cabeçalho).')
    pasta = AQUI / 'telas' / curso
    pasta.mkdir(parents=True, exist_ok=True)
    resultado = {}
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(channel='chrome', headless=True)
        def abrir(largura, altura, parte, aula=None):
            ctx = browser.new_context(storage_state=sessao, viewport={'width': largura, 'height': altura}, device_scale_factor=ESCALA)
            page = ctx.new_page()
            page.goto(f"{BASE}/cursos/{SLUG.get(curso, curso)}/aulas/{aula or CURSOS[curso]}", wait_until='domcontentloaded')
            page.wait_for_timeout(8000)
            if '/login/aluno' in page.url or '/perfis' in page.url:
                # O aparelho autorizado só pede o perfil de novo: escolhe o primeiro que entra sem código.
                fora = {'Tenho um código', 'Voltar', 'Preciso de ajuda', 'Entrar para criar'}
                perfis = [b for b in page.get_by_role('button').all() if b.is_visible() and b.inner_text().strip() not in fora and 'Pedir código' not in b.inner_text()]
                if perfis:
                    perfis[0].click()
                    page.wait_for_timeout(8000)
            if '/aulas/' not in page.url:
                raise RuntimeError(f'A sessão não abriu a aula ({page.url}). Renove a sessão de criança.')
            ir_para(page, parte)
            return ctx, page

        for foto in FOTOS.get(curso, []):
            ctx, page = abrir(1440, 900, foto['parte'], foto.get('aula'))
            page.get_by_role('button', name=foto['ampliar'], exact=True).first.click()
            page.wait_for_timeout(4000)
            for nome in foto.get('clicar', []):
                page.get_by_role('button', name=nome, exact=True).first.click()
                page.wait_for_timeout(2500)
            if 'corte' in foto:
                jogo = frame_do_jogo(page)
                for _ in range(foto.get('girar', 0)):
                    jogo.get_by_role('button', name='Girar a cena para o outro lado').click()
                    page.wait_for_timeout(300)
            page.mouse.move(1, 899)
            page.wait_for_timeout(1500)
            if 'corte' in foto:
                quadro = jogo.frame_element().bounding_box()
                esquerda, topo, direita, base = foto['corte']
                corte = {
                    'x': quadro['x'] + quadro['width'] * esquerda,
                    'y': quadro['y'] + quadro['height'] * topo,
                    'width': quadro['width'] * (direita - esquerda),
                    'height': quadro['height'] * (base - topo),
                }
            else:
                corte = page.evaluate(MAIOR_CANVAS)
            page.screenshot(path=str(pasta / f"{foto['id']}.jpg"), clip=corte, type='jpeg', quality=86)
            ctx.storage_state(path=sessao)
            ctx.close()
            print(f"{curso}/{foto['id']}: foto")
        for tela in TELAS_DO_CURSO.get(curso, TELAS):
            largura, altura = tela['tela']
            ctx, page = abrir(largura, altura, tela['parte'])
            for acao in tela.get('antes', []):
                page.get_by_role('button', name=acao['clicar'], exact=True).first.click()
                page.wait_for_timeout(3000)
            # O livro e o Estúdio às vezes terminam de carregar depois: mede de novo antes de desistir.
            for tentativa in range(5):
                page.mouse.move(1, altura - 1)
                page.evaluate('() => window.scrollTo(0, 0)')
                page.evaluate(PRIMEIRA_VEZ)
                page.wait_for_timeout(500)
                recorte, marcas, faltando = medir(page, tela, largura, altura)
                if not faltando:
                    break
                page.wait_for_timeout(3000)
            if faltando:
                page.screenshot(path=str(pasta / f"erro-{tela['id']}.png"))
                raise RuntimeError(f"{curso}/{tela['id']}: marcas não encontradas: {', '.join(faltando)}")
            (pasta / f"erro-{tela['id']}.png").unlink(missing_ok=True)
            arquivo = f"{tela['id']}.jpg"
            page.screenshot(path=str(pasta / arquivo), clip=recorte, type='jpeg', quality=86)
            resultado[tela['id']] = {'arquivo': arquivo, 'largura': recorte['width'], 'altura': recorte['height'], 'marcas': marcas}
            for acao in tela.get('depois', []):
                page.get_by_role('button', name=acao['clicar'], exact=True).first.click()
                page.wait_for_timeout(1500)
            # A sessão se renova a cada visita: guardar a nova evita que a próxima tela caia no login.
            ctx.storage_state(path=sessao)
            ctx.close()
            print(f"{curso}/{tela['id']}: {len(marcas)} marcas")
        browser.close()
    # Sempre LF, também no Windows: o Biome confere o JSON do repositório.
    (pasta / 'marcas.json').write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    for curso in (sys.argv[1:] or list(CURSOS)):
        capturar(curso)
