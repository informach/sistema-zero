"""Cenários compilados do Molda no Raylib nativo e no Estúdio.

    import cenario
    lugar = cenario.carregar('cenario.json')  # depois de init_window
    # a cada quadro: lugar.atualizar(x, z) com a posição do personagem
    # dentro de begin_mode_3d: lugar.desenhar()
    # lugar.altura(x, z) retorna None onde não há chão
    # lugar.colide_caixa(minimo, maximo) consulta aproximações AABB
    # lugar.entrou_na_regiao('Vila') é verdadeiro uma vez por entrada
    lugar.descartar()                        # antes de close_window

Não inicia loop, câmera ou física. Água é estática; ambiente e regras continuam
disponíveis nos dados para o programa. As malhas já vieram do compilador.

Com regiões (desenhadas no Molda Cenários, na aba Jogo), o cenário carrega só a
região do personagem, as vizinhas e as que estão perto, com as mesmas regras do
Estúdio em JavaScript; ``altura`` usa o relevo inteiro sempre, então ninguém cai
onde a região ainda não carregou. Sem regiões, carrega tudo, como sempre.

Com o relevo de mundo grande (o "campo" do Molda Cenários, só no Estúdio), o chão
não vem em modelos: o cenário monta o relevo em pedaços perto do personagem, com
todo o detalhe até perto e o desenho grosso longe, e ``altura`` lê o campo.
"""
from array import array
from collections import OrderedDict
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import struct
import types
import zlib

import pyray as _p

__all__ = ['carregar', 'Cenario']
_MAX_MANIFESTO = 16 * 1024 * 1024
_MAX_PACOTE = 256 * 1024 * 1024


def _numero(v):
    if type(v) not in (float, int) or not math.isfinite(v) or abs(v) > 1e9:
        raise ValueError('O cenário contém uma medida inválida.')
    return v


def _ponto(p):
    if not isinstance(p, dict):
        raise ValueError('O cenário contém um ponto inválido.')
    return tuple(_numero(p.get(e)) for e in ('x', 'y', 'z'))


def _lista(d, nome, limite):
    a = d.get(nome)
    if not isinstance(a, list) or len(a) > limite:
        raise ValueError(f'A lista {nome} do cenário é inválida ou grande demais.')
    return a


def _matriz(m):
    if not isinstance(m, list) or len(m) != 16:
        raise ValueError('Uma matriz do cenário está incompleta.')
    for v in m:
        _numero(v)
    det = (m[0] * (m[5] * m[10] - m[9] * m[6])
           - m[4] * (m[1] * m[10] - m[9] * m[2])
           + m[8] * (m[1] * m[6] - m[5] * m[2]))
    if (m[3], m[7], m[11], m[15]) != (0, 0, 0, 1) or det == 0 or not math.isfinite(det):
        raise ValueError('Uma matriz do cenário não é afim e invertível.')


def _volume(v):
    if not isinstance(v, dict):
        raise ValueError('Uma caixa do cenário está incompleta.')
    lo, hi = _ponto(v.get('min')), _ponto(v.get('max'))
    if any(a > b for a, b in zip(lo, hi)):
        raise ValueError('Uma caixa do cenário tem limites invertidos.')
    return lo, hi


def _caminho(raiz, nome):
    if (not isinstance(nome, str) or len(nome) > 1024 or not nome
            or nome.startswith('/') or '\\' in nome or ':' in nome or '%' in nome
            or any(ord(c) < 32 for c in nome)
            or any(p in ('', '.', '..') for p in nome.split('/'))):
        raise ValueError('O cenário referencia um caminho não portátil.')
    p = (raiz / nome).resolve()
    if not p.is_relative_to(raiz):
        raise ValueError('Um recurso do cenário está fora da pasta do pacote.')
    return p


def _json(b):
    def recusar(valor):
        raise ValueError(f'O cenário contém um número JSON inválido: {valor}.')
    try:
        return json.loads(b.decode('utf-8'), parse_constant=recusar)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as e:
        raise ValueError('O manifesto do cenário está estragado.') from e


def _inspecionar_glb(p, tamanho):
    with p.open('rb') as f:
        h = f.read(20)
        if len(h) != 20:
            raise ValueError('Um modelo do cenário está truncado.')
        magic, version, total, n, tipo = struct.unpack('<5I', h)
        if (magic != 0x46546c67 or version != 2 or total != tamanho
                or tipo != 0x4e4f534a or n > _MAX_MANIFESTO or n > tamanho - 20):
            raise ValueError('Um recurso do cenário não é um GLB simples válido.')
        d = _json(f.read(n))
    for item in d.get('buffers', []) + d.get('images', []):
        uri = item.get('uri')
        if uri is not None and (not isinstance(uri, str) or not uri.startswith('data:')):
            raise ValueError('Modelos do cenário não podem buscar recursos fora do GLB.')
    if len(d.get('skins', [])) > 1:
        raise ValueError('O modelo precisa de um único esqueleto para o Raylib. Exporte o pacote pelo destino Raylib do Molda.')
    if set(d.get('extensionsRequired', [])) - {'KHR_mesh_quantization'}:
        raise ValueError('Um modelo exige uma extensão que este destino não suporta.')
    return bool(d.get('skins') or d.get('animations'))


def _conferir(raiz, d, remapeamento=None):
    if (not isinstance(d, dict) or d.get('formato') != 'molda-cena-compilada'
            or d.get('versao') != 1 or d.get('unidade') != 'metro' or d.get('eixoVertical') != 'y'):
        raise ValueError('Este arquivo não é uma cena compilada do Molda compatível.')
    inventario = _lista(d, 'arquivos', 8192)
    if remapeamento is not None:
        if (not isinstance(remapeamento, dict) or len(remapeamento) != len(inventario)
                or any(not isinstance(a, dict) or not isinstance(a.get('caminho'), str)
                       for a in inventario)
                or set(remapeamento) != {a['caminho'] for a in inventario}):
            raise ValueError('O mapa de recursos precisa cobrir exatamente o inventário do cenário.')
    arquivos, animaveis, total, conferidos = {}, set(), 0, {}
    vistos = set()
    for a in inventario:
        if not isinstance(a, dict):
            raise ValueError('O inventário do cenário está incompleto.')
        nome, n, digest = a.get('caminho'), a.get('bytes'), a.get('digest')
        p = _caminho(raiz, nome)
        if remapeamento is not None:
            p = _caminho(raiz, remapeamento[nome])
        if (nome.lower() in vistos or type(n) is not int or not 0 < n <= _MAX_PACOTE
                or not isinstance(digest, str) or not re.fullmatch('[0-9a-f]{64}', digest)):
            raise ValueError('O inventário do cenário tem nome, tamanho ou digest inválido.')
        vistos.add(nome.lower())
        total += n
        if total > _MAX_PACOTE:
            raise ValueError('O cenário ultrapassa o limite de 256 MiB.')
        assinatura = (n, digest, a.get('mime'))
        if (a.get('mime') == 'model/gltf-binary'
                and (n > 32 * 1024 * 1024 or not nome.endswith('.glb') or p.suffix.lower() != '.glb')):
            raise ValueError('Um modelo ultrapassa os limites ou não usa um arquivo GLB.')
        anterior = conferidos.get(p)
        if anterior is not None:
            if assinatura != anterior[0]:
                raise ValueError('O mesmo arquivo físico não pode representar recursos incompatíveis.')
            animavel = anterior[1]
        else:
            if p.stat().st_size != n:
                raise ValueError(f'O tamanho de {nome} não corresponde ao cenário.')
            sha = hashlib.sha256()
            with p.open('rb') as f:
                while bloco := f.read(1024 * 1024):
                    sha.update(bloco)
            if sha.hexdigest() != digest:
                raise ValueError(f'O conteúdo de {nome} não corresponde ao cenário.')
            animavel = False
            if a.get('mime') == 'model/gltf-binary':
                animavel = _inspecionar_glb(p, n)
            conferidos[p] = (assinatura, animavel)
        if animavel:
            animaveis.add(nome)
        arquivos[nome] = (p, a)
    ids = set()
    for no in _lista(d, 'nos', 32768):
        if (not isinstance(no, dict) or not isinstance(no.get('id'), str)
                or no['id'] in ids or no.get('arquivo') not in arquivos
                or arquivos[no['arquivo']][1].get('mime') != 'model/gltf-binary'):
            raise ValueError('Um nó do cenário tem identidade ou recurso inválido.')
        ids.add(no['id'])
        _matriz(no.get('matriz'))
        _volume(no.get('volume'))
    for c in _lista(d, 'colisoes', 32768):
        _volume(c.get('volume'))
        if c.get('tipo') not in ('caixa', 'capsula', 'malha', 'terreno', 'agua', 'caminho'):
            raise ValueError('Uma colisão do cenário tem tipo desconhecido.')
    for nome, limite in [('entidades', 32768), ('marcadores', 4096), ('aguas', 4096),
                         ('caminhos', 4096), ('licencas', 8192)]:
        _lista(d, nome, limite)
    return arquivos, animaveis


# As regiões (lote 7b da conclusão do plano do Estúdio, 22/11/2026): as mesmas regras do núcleo
# TypeScript (`schema-regioes.ts`, `regioes.ts` e `carga-das-regioes.ts` do molda-cenarios-core),
# conferidas contra os mesmos casos (`__tests__/regioes-casos.json`).
_FOLGA = 1e-6
_TOLERANCIA = 0.5
_PRE_CARGA = 40.0
_FOLGA_DO_DESCARTE = 20.0
_ATRASO_DO_DESCARTE = 2.0
_MALHAS_POR_JANELA = 48
_MAX_VIZINHAS = 8
_NOVAS_TENTATIVAS = (1, 4, 15)
_CHAVES_DA_REGIAO = {'id', 'nome', 'caixa', 'vizinhas', 'nos', 'colisoes', 'aguas'}


def _identificador(v):
    return (isinstance(v, str) and 1 <= len(v) <= 240
            and all(c.isalnum() or c in '_.:/-' for c in v))


def _eixo_toca(lo, hi, inicio, fim):
    sobreposto = min(hi, fim) - max(lo, inicio)
    if sobreposto < -_FOLGA:
        return False
    # Com largura, precisa entrar na região; sem largura (um plano em cima da borda), basta tocar.
    return hi - lo <= _FOLGA or sobreposto > _FOLGA


def _toca(volumes, caixa):
    x0, x1 = sorted((caixa['x0'], caixa['x1']))
    z0, z1 = sorted((caixa['z0'], caixa['z1']))
    return any(_eixo_toca(v['min']['x'], v['max']['x'], x0, x1)
               and _eixo_toca(v['min']['z'], v['max']['z'], z0, z1) for v in volumes)


def _pertenca(regioes, d):
    """As listas de cada região (nós, colisões e águas), pela régua do compilador.

    Um item vai a cada região que a pegada dele no chão toca; o que não toca nenhuma, o ator
    animado, o objeto com propriedades, o relevo, o piso plano e o mar são de todas. A água vale
    pela pegada inteira.
    """
    com_propriedades = {e.get('id') for e in d['entidades']
                        if isinstance(e, dict) and isinstance(e.get('propriedades'), dict)
                        and e['propriedades']}
    mares = {a['id'] for a in d['aguas'] if a.get('tipo') == 'mar'}
    aguas = {a['id'] for a in d['aguas']}
    pegada = {}
    for item in d['nos'] + d['colisoes']:
        e = item.get('entidade')
        if e is not None and e in aguas:
            pegada.setdefault(e, []).append(item['volume'])

    def de_todas(e):
        return e is not None and (e in com_propriedades or e in mares)

    memo = {}

    def toca_pela_pegada(e, volume, r):
        if e is None or e not in aguas:
            return _toca([volume], r['caixa'])
        chave = (e, r['id'])
        if chave not in memo:
            memo[chave] = _toca(pegada.get(e) or [volume], r['caixa'])
        return memo[chave]

    plano = (d.get('plano') or {}).get('colisao')
    return [{
        'nos': [n['id'] for n in d['nos']
                if not n.get('preservarHierarquia') and not de_todas(n.get('entidade'))
                and not any(de_todas(f.get('entidade'))
                            for f in n.get('faixas') or [] if isinstance(f, dict))
                and toca_pela_pegada(n.get('entidade'), n['volume'], r)],
        'colisoes': [c['id'] for c in d['colisoes']
                     if c['id'] != plano and c['tipo'] != 'terreno'
                     and not de_todas(c.get('entidade'))
                     and toca_pela_pegada(c.get('entidade'), c['volume'], r)],
        'aguas': [a['id'] for a in d['aguas']
                  if a['id'] not in mares and a['id'] in pegada
                  and toca_pela_pegada(a['id'], None, r)],
    } for r in regioes]


def _erros_das_regioes(regioes, limite):
    """A régua das regiões do documento, com os mesmos recados do núcleo."""
    erros, por_id, nomes = [], {}, set()
    for r in regioes:
        if r['id'] in por_id:
            erros.append(f"Região duplicada: {r['id']}")
        por_id[r['id']] = r
        nome = r['nome'].strip().lower()
        if not nome:
            erros.append('Uma região está sem nome. Escreva um nome para ela.')
        elif nome in nomes:
            erros.append(f"Já existe uma região chamada {r['nome'].strip()}.")
        nomes.add(nome)
        c = r['caixa']
        if not (c['x1'] - c['x0'] > _FOLGA and c['z1'] - c['z0'] > _FOLGA):
            erros.append(f"A região {r['nome']} precisa ter largura e comprimento.")
        elif limite and not (c['x0'] >= limite['x0'] - _FOLGA and c['z0'] >= limite['z0'] - _FOLGA
                             and c['x1'] <= limite['x1'] + _FOLGA
                             and c['z1'] <= limite['z1'] + _FOLGA):
            erros.append(f"A região {r['nome']} sai da base do cenário.")
    for r in regioes:
        if len(r['vizinhas']) > _MAX_VIZINHAS:
            erros.append(f"A região {r['nome']} tem {len(r['vizinhas'])} vizinhas. "
                         f"Uma região pode ter até {_MAX_VIZINHAS}.")
        vistas = set()
        for v in r['vizinhas']:
            if v == r['id']:
                erros.append(f"A região {r['nome']} não pode ser vizinha dela mesma.")
                continue
            outra = por_id.get(v)
            if v in vistas:
                erros.append(f"A região {r['nome']} repete a vizinha {outra['nome'] if outra else v}.")
            vistas.add(v)
            if outra is None:
                erros.append(f"A região {r['nome']} cita uma vizinha que não existe mais.")
            elif r['id'] not in outra['vizinhas']:
                erros.append(f"A região {r['nome']} tem {outra['nome']} como vizinha, "
                             f"mas {outra['nome']} não tem {r['nome']}.")
    for i, a in enumerate(regioes):
        for b in regioes[i + 1:]:
            ca, cb = a['caixa'], b['caixa']
            if (min(ca['x1'], cb['x1']) - max(ca['x0'], cb['x0']) > _FOLGA
                    and min(ca['z1'], cb['z1']) - max(ca['z0'], cb['z0']) > _FOLGA):
                erros.append(f"As regiões {a['nome']} e {b['nome']} se sobrepõem. "
                             'Elas podem encostar pela borda.')
    return erros


def _limite_do_chao(d):
    p, t = d.get('plano'), d.get('terreno')
    if p:
        return {'x0': -p['largura'] / 2, 'z0': -p['comprimento'] / 2,
                'x1': p['largura'] / 2, 'z1': p['comprimento'] / 2}
    if t:
        o = t['origem']
        return {'x0': o['x'], 'z0': o['z'],
                'x1': o['x'] + t['colunas'] * t['passo'], 'z1': o['z'] + t['linhas'] * t['passo']}
    return None


def _conferir_regioes(d):
    """As regiões da cena, conferidas antes de qualquer modelo carregar: lista velha, incompleta ou
    com item que não existe é recusada (as listas precisam ser as que a pertença calcula)."""
    regioes = d.get('regioes')
    if regioes is None:
        return []
    if not isinstance(regioes, list) or not 1 <= len(regioes) <= 64:
        raise ValueError('As regiões do cenário são inválidas.')
    for r in regioes:
        if (not isinstance(r, dict) or set(r) != _CHAVES_DA_REGIAO or not _identificador(r['id'])
                or not isinstance(r['nome'], str) or not 1 <= len(r['nome']) <= 60
                or not isinstance(r['caixa'], dict) or set(r['caixa']) != {'x0', 'z0', 'x1', 'z1'}
                or not isinstance(r['vizinhas'], list) or len(r['vizinhas']) > _MAX_VIZINHAS
                or any(not _identificador(v) for v in r['vizinhas'])):
            raise ValueError('Uma região do cenário está incompleta ou fora do formato.')
        for k in ('x0', 'z0', 'x1', 'z1'):
            _numero(r['caixa'][k])
        for lista, limite in (('nos', 32768), ('colisoes', 32768), ('aguas', 4096)):
            if (not isinstance(r[lista], list) or len(r[lista]) > limite
                    or any(not _identificador(v) for v in r[lista])):
                raise ValueError('Uma região do cenário está incompleta ou fora do formato.')
    for nome in ('colisoes', 'aguas', 'entidades'):
        if any(not isinstance(item, dict) or not isinstance(item.get('id'), str) for item in d[nome]):
            raise ValueError('O cenário com regiões precisa de identidade em cada item.')
    erros = _erros_das_regioes(regioes, _limite_do_chao(d))
    for r, esperada in zip(regioes, _pertenca(regioes, d)):
        for lista, nome in (('nos', 'peças'), ('colisoes', 'colisões'), ('aguas', 'águas')):
            if r[lista] != esperada[lista]:
                erros.append(f"A lista de {nome} da região {r['nome']} não corresponde à cena.")
    if erros:
        raise ValueError(f'As regiões do cenário não conferem: {erros[0]}')
    return regioes


def _distancia_ate_caixa(x, z, c):
    x0, x1 = sorted((c['x0'], c['x1']))
    z0, z1 = sorted((c['z0'], c['z1']))
    return math.hypot(max(x0 - x, 0, x - x1), max(z0 - z, 0, z - z1))


def _regiao_do_ponto(regioes, x, z, anterior=None):
    """A região de um ponto: quem estava em ``anterior`` continua nela até passar meio metro além
    da caixa; senão, a que contém o ponto (a borda é das duas: vale a primeira); fora, ``None``."""
    if anterior is not None:
        for r in regioes:
            if r['id'] == anterior:
                if _distancia_ate_caixa(x, z, r['caixa']) <= _TOLERANCIA:
                    return anterior
                break
    for r in regioes:
        if _distancia_ate_caixa(x, z, r['caixa']) == 0:
            return r['id']
    return None


class _PlanoDaCarga:
    """Que regiões ficam carregadas enquanto o foco anda (``criarPlanoDaCarga`` do núcleo).

    A região segura (a atual; fora de todas, a última; começando fora, a mais perto) e as vizinhas
    dela sempre ficam; as outras entram a até ``max(40 m, distância da câmera)`` e só saem 20 m além
    disso, depois de 2 s seguidos longe. Cada mudança da atual para uma região é uma entrada.
    """

    def __init__(self, regioes):
        self._regioes = regioes
        self._por_id = {r['id']: r for r in regioes}
        self._atual = None
        self._segura = None
        self._longe_desde = {}
        self._carregadas = set()

    def atualizar(self, x, z, agora, camera=None):
        antes = self._atual
        self._atual = _regiao_do_ponto(self._regioes, x, z, self._atual)
        if self._atual is not None:
            self._segura = self._atual
        elif self._segura is None:
            self._segura = min(self._regioes, key=lambda r: _distancia_ate_caixa(x, z, r['caixa']))['id']
        # Começar dentro também é entrar: a atual nasce nenhuma.
        entradas = ([self._por_id[self._atual]['nome']]
                    if self._atual is not None and self._atual != antes else [])
        s = self._por_id[self._segura]
        obrigatorias = {s['id'], *(v for v in s['vizinhas'] if v in self._por_id)}
        raio = max(_PRE_CARGA, math.hypot(camera[0] - x, camera[1] - z) if camera else 0)
        for r in self._regioes:
            d = _distancia_ate_caixa(x, z, r['caixa'])
            if r['id'] in obrigatorias or d <= raio:
                self._carregadas.add(r['id'])
                self._longe_desde.pop(r['id'], None)
                continue
            if r['id'] not in self._carregadas:
                continue
            if d <= raio + _FOLGA_DO_DESCARTE:
                self._longe_desde.pop(r['id'], None)
                continue
            desde = self._longe_desde.get(r['id'])
            if desde is None:
                self._longe_desde[r['id']] = agora
            elif agora - desde >= _ATRASO_DO_DESCARTE:
                self._carregadas.discard(r['id'])
                self._longe_desde.pop(r['id'], None)
        return {'atual': self._atual, 'segura': self._segura, 'obrigatorias': obrigatorias,
                'carregadas': set(self._carregadas), 'entradas': entradas}

    def reiniciar(self):
        """A primeira entrada volta a contar (inclusive a de quem começa dentro)."""
        self._atual = None


def _dentro(x, z, contorno):
    dentro = False
    a = contorno[-1]
    for b in contorno:
        # A borda pertence ao recorte, como no núcleo TypeScript.
        dx, dz = b['x'] - a['x'], b['z'] - a['z']
        cruz = (x - a['x']) * dz - (z - a['z']) * dx
        if (abs(cruz) < 1e-9 and min(a['x'], b['x']) - 1e-9 <= x <= max(a['x'], b['x']) + 1e-9
                and min(a['z'], b['z']) - 1e-9 <= z <= max(a['z'], b['z']) + 1e-9):
            return True
        if (a['z'] > z) != (b['z'] > z) and x < a['x'] + dx * (z - a['z']) / dz:
            dentro = not dentro
        a = b
    return dentro


# O relevo de mundo grande (plano "Mundos de 2 km", lote 6, 23/11/2026): a mesma conta da
# referência do núcleo TypeScript (`relevo-pedacos.ts` do molda-cenarios-core), conferida contra os
# mesmos casos (`__tests__/relevo-casos.json`). O Raylib do Estúdio não tem neblina nem o material
# do editor, então a cor vai no vértice: as camadas misturadas pelos pesos, vezes a cor média da
# textura de cada uma, com uma luz simples do relevo.
_NO_ESTUDIO = importlib.util.find_spec('_szraylib') is not None
_RELEVO_CELULAS = 64
_RELEVO_GROSSO = 8
_RELEVO_ALCANCE_COMPLETO = 1.5
# Até onde a câmera do Raylib enxerga (RL_CULL_DISTANCE_FAR): além disso, nada é desenhado.
_RELEVO_LONGE = 1000.0
_RELEVO_COMPLETOS_GUARDADOS = 24
_RELEVO_GROSSOS_GUARDADOS = 160
_RELEVO_GROSSOS_POR_QUADRO = 16
_L = math.sqrt(0.4 * 0.4 + 1 + 0.3 * 0.3)
_LUZ = (0.4 / _L, 1 / _L, 0.3 / _L)
_COR = re.compile('#[0-9a-fA-F]{6}')


def _rgb(hexa):
    if not isinstance(hexa, str) or not _COR.fullmatch(hexa):
        raise ValueError('Uma camada do relevo tem uma cor inválida.')
    n = int(hexa[1:], 16)
    return ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255


def _byte(v):
    return min(255, max(0, math.floor(v * 255 + 0.5)))


def _ler_png_de_pesos(b, largura, altura):
    """Os pesos de quatro camadas num PNG RGBA de 8 bits, filtro 0 em toda linha (o codificador do
    Molda); devolve as linhas descompactadas, cada uma com o byte do filtro na frente."""
    if b[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Os pesos do relevo não são um PNG.')
    pos, cabecalho, partes = 8, None, []
    while True:
        if pos + 12 > len(b):
            raise ValueError('Os pesos do relevo estão truncados.')
        n, tipo = struct.unpack_from('>I4s', b, pos)
        dados = b[pos + 8:pos + 8 + n]
        if len(dados) != n or pos + 12 + n > len(b):
            raise ValueError('Os pesos do relevo estão truncados.')
        (crc,) = struct.unpack_from('>I', b, pos + 8 + n)
        if zlib.crc32(tipo + dados) & 0xffffffff != crc:
            raise ValueError('Os pesos do relevo estão estragados.')
        pos += 12 + n
        if tipo == b'IHDR':
            cabecalho = struct.unpack('>IIBBBBB', dados)
        elif tipo == b'IDAT':
            partes.append(dados)
        elif tipo == b'IEND':
            break
    if cabecalho != (largura, altura, 8, 6, 0, 0, 0):
        raise ValueError('Os pesos do relevo não correspondem à grade.')
    fila = 1 + largura * 4
    d = zlib.decompressobj()
    try:
        cru = d.decompress(b''.join(partes), fila * altura + 1)
    except zlib.error as e:
        raise ValueError('Os pesos do relevo estão estragados.') from e
    if len(cru) != fila * altura or d.unconsumed_tail or not d.eof:
        raise ValueError('Os pesos do relevo não correspondem à grade.')
    if any(cru[j * fila] for j in range(altura)):
        raise ValueError('Os pesos do relevo usam um filtro de PNG que o cenário não lê.')
    return cru


class _RelevoDoCampo:
    """O relevo em pedaços: completos (um vértice por célula) até perto do foco, grossos (um a
    cada 8 células) longe, em blocos de 2 × 2 pedaços onde nada está perto; pula o que está atrás
    da câmera e além do alcance dela. Constrói um pedaço completo por quadro e só troca o grosso
    pelo completo quando ele está pronto (nunca aparece buraco)."""

    def __init__(self, t, alturas, buracos, pesos, camadas):
        self.ox, self.oz, self.passo = t['origem']['x'], t['origem']['z'], t['passo']
        self.colunas, self.linhas = t['colunas'], t['linhas']
        self.largura = self.colunas + 1
        self.h = memoryview(alturas).cast('f')
        self.buracos = buracos
        self.pesos = pesos
        self.fila = 1 + self.largura * 4
        self.cores = []
        for c in camadas:
            a, b = _rgb(c.get('cor')), _rgb(c.get('corMedia'))
            self.cores.append((a[0] * b[0], a[1] * b[1], a[2] * b[2]))
        self._bases = {}
        self.modelos = OrderedDict()
        self.desenho = []
        self.faltam = []

    def _altura(self, i, j):
        return self.h[j * self.largura + i]

    def _base(self, j, i):
        """A mistura das camadas (0 a 1) no vértice, em cache pelos bytes dos pesos: os mesmos
        pesos dão a mesma conta, na mesma ordem."""
        o = j * self.fila + 1 + i * 4
        chave = b''.join(p[o:o + 4] for p in self.pesos)
        base = self._bases.get(chave)
        if base is None:
            r = g = b = 0.0
            for k, c in enumerate(self.cores):
                w = chave[k] / 255
                r += w * c[0]
                g += w * c[1]
                b += w * c[2]
            base = self._bases[chave] = (r, g, b)
        return base

    def saia(self, i0, j0, celulas):
        h, g = self._altura, _RELEVO_GROSSO
        i1, j1 = i0 + celulas, j0 + celulas
        pior = 0.0

        def borda(fixo, de, ate, vertical):
            nonlocal pior
            for k in range(de, ate, g):
                fim = min(k + g, ate)
                a = h(fixo, k) if vertical else h(k, fixo)
                b = h(fixo, fim) if vertical else h(fim, fixo)
                for m in range(k + 1, fim):
                    t = (m - k) / (fim - k)
                    real = h(fixo, m) if vertical else h(m, fixo)
                    pior = max(pior, abs(real - (a + (b - a) * t)))

        borda(j0, i0, i1, False)
        borda(j1, i0, i1, False)
        borda(i0, j0, j1, True)
        borda(i1, j0, j1, True)
        return pior + 0.5

    def malha(self, i0, j0, celulas, passo):
        """Vértices (x, y, z), cores (RGBA) e triângulos do pedaço, com as saias."""
        if celulas % passo or celulas // passo < 1:
            raise ValueError('O pedaço do relevo não cabe no passo.')
        n = celulas // passo + 1
        vertices, cores, indices = array('f'), bytearray(), array('H')
        # A cor do vértice: a mistura das camadas vezes a luz do relevo (a normal pelas vizinhas
        # na grade). As alturas da linha e das vizinhas vêm de uma vez, por linha.
        h, largura, colunas, linhas, dp = self.h, self.largura, self.colunas, self.linhas, self.passo
        lx, ly, lz = _LUZ
        lo, hi = max(i0 - 1, 0), min(i0 + celulas + 1, colunas)
        colunas_do_pedaco = [i0 + b * passo for b in range(n)]
        vizinhas = [(i, max(i - 1, 0), min(i + 1, colunas)) for i in colunas_do_pedaco]
        base_de, byte, sqrt, ox = self._base, _byte, math.sqrt, self.ox
        poe_vertice, poe_cor = vertices.extend, cores.extend
        for a in range(n):
            j = j0 + a * passo
            zb, zc = max(j - 1, 0), min(j + 1, linhas)
            atual = h[j * largura + lo:j * largura + hi + 1].tolist()
            baixo = h[zb * largura + lo:zb * largura + hi + 1].tolist()
            cima = h[zc * largura + lo:zc * largura + hi + 1].tolist()
            z, entre_z = self.oz + j * dp, (zc - zb) * dp
            for i, xe, xd in vizinhas:
                k = i - lo
                poe_vertice((ox + i * dp, atual[k], z))
                r, g, b = base_de(j, i)
                dx = (atual[xd - lo] - atual[xe - lo]) / ((xd - xe) * dp)
                dz = (cima[k] - baixo[k]) / entre_z
                luz = 0.6 + 0.4 * max(0, (-dx * lx + ly - dz * lz) / sqrt(dx * dx + 1 + dz * dz))
                poe_cor((byte(r * luz), byte(g * luz), byte(b * luz), 255))
        for a in range(n - 1):
            j = j0 + a * passo
            for b in range(n - 1):
                i = i0 + b * passo
                if self.buracos and self.buracos[j * self.colunas + i]:
                    continue
                va = a * n + b
                vb, vc = va + 1, va + n
                indices.extend((va, vc, vb, vb, vc, vc + 1))
        saia = self.saia(i0, j0, celulas)
        bordas = ((list(range(n)), False), ([(n - 1) * n + b for b in range(n)], True),
                  ([a * n for a in range(n)], True), ([a * n + n - 1 for a in range(n)], False))
        for lista, inverter in bordas:
            base = len(vertices) // 3
            for v in lista:
                vertices.extend((vertices[v * 3], vertices[v * 3 + 1] - saia, vertices[v * 3 + 2]))
                cores.extend(cores[v * 4:v * 4 + 3])
                cores.append(255)
            for k in range(n - 1):
                s0, s1, b0, b1 = lista[k], lista[k + 1], base + k, base + k + 1
                if inverter:
                    indices.extend((s0, b0, s1, s1, b0, b1))
                else:
                    indices.extend((s0, s1, b0, s1, b1, b0))
        return vertices, cores, indices

    def _especificacao(self, chave):
        tipo, x, z = chave
        c = _RELEVO_CELULAS
        if tipo == 'c':
            return x * c, z * c, c, 1
        if tipo == 'g':
            return x * c, z * c, c, _RELEVO_GROSSO
        return x * c, z * c, 2 * c, _RELEVO_GROSSO

    def _construir(self, chave):
        vertices, cores, indices = self.malha(*self._especificacao(chave))
        m = _p.Mesh()
        m.vertexCount = len(vertices) // 3
        m.triangleCount = len(indices) // 3
        m.vertices, m.colors, m.indices = vertices, cores, indices
        _p.upload_mesh(m, False)
        self.modelos[chave] = _p.load_model_from_mesh(m)

    def _caixa(self, i0, j0, celulas):
        x0, z0 = self.ox + i0 * self.passo, self.oz + j0 * self.passo
        lado = celulas * self.passo
        return x0, z0, x0 + lado, z0 + lado

    @staticmethod
    def _distancia(x, z, c):
        dx = max(c[0] - x, 0.0, x - c[2])
        dz = max(c[1] - z, 0.0, z - c[3])
        return math.hypot(dx, dz)

    def atualizar(self, x, z, camera=None, tudo=False):
        c = _RELEVO_CELULAS
        nx, nz = -(-self.colunas // c), -(-self.linhas // c)
        perto = _RELEVO_ALCANCE_COMPLETO * c * self.passo
        olho, frente = (x, z), None
        if camera is not None:
            p, alvo = getattr(camera, 'position', None), getattr(camera, 'target', None)
            if p is not None and math.isfinite(p.x) and math.isfinite(p.z):
                olho = (p.x, p.z)
                if alvo is not None:
                    fx, fz = alvo.x - p.x, alvo.z - p.z
                    comprimento = math.hypot(fx, fz)
                    if comprimento > 1e-6:
                        frente = (fx / comprimento, fz / comprimento)

        def visivel(caixa):
            if self._distancia(olho[0], olho[1], caixa) > _RELEVO_LONGE:
                return False
            if frente is None:
                return True
            cx, cz = (caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2
            raio = math.hypot(caixa[2] - caixa[0], caixa[3] - caixa[1]) / 2
            return (cx - olho[0]) * frente[0] + (cz - olho[1]) * frente[1] >= -raio

        querer = []
        for bz in range(0, nz, 2):
            for bx in range(0, nx, 2):
                filhos = [(ix, iz) for iz in (bz, bz + 1) for ix in (bx, bx + 1) if ix < nx and iz < nz]
                perto_de = {f for f in filhos
                            if self._distancia(x, z, self._caixa(f[0] * c, f[1] * c, c)) <= perto}
                if not perto_de and len(filhos) == 4:
                    if visivel(self._caixa(bx * c, bz * c, 2 * c)):
                        querer.append(('b', bx, bz))
                    continue
                for f in filhos:
                    if f in perto_de:
                        querer.append(('c', f[0], f[1]))
                    elif visivel(self._caixa(f[0] * c, f[1] * c, c)):
                        querer.append(('g', f[0], f[1]))
        # Os completos que faltam, do mais perto ao mais longe: um por quadro (todos na abertura).
        faltam = sorted((k for k in querer if k[0] == 'c' and k not in self.modelos),
                        key=lambda k: self._distancia(x, z, self._caixa(k[1] * c, k[2] * c, c)))
        for k in faltam if tudo else faltam[:1]:
            self._construir(k)
        grossos = 0
        desenho = []
        for k in querer:
            if k[0] == 'c' and k not in self.modelos:
                k = ('g', k[1], k[2])
            if k not in self.modelos:
                if not tudo and grossos >= _RELEVO_GROSSOS_POR_QUADRO:
                    continue
                self._construir(k)
                grossos += 1
            self.modelos.move_to_end(k)
            desenho.append(k)
        self.desenho = desenho
        self.faltam = [k for k in faltam if k not in self.modelos]
        self._guardar(set(desenho))

    def _guardar(self, na_tela):
        for tipos, teto in (('c', _RELEVO_COMPLETOS_GUARDADOS), ('gb', _RELEVO_GROSSOS_GUARDADOS)):
            chaves = [k for k in self.modelos if k[0] in tipos]
            excesso = len(chaves) - teto
            for k in chaves:
                if excesso <= 0:
                    break
                if k not in na_tela:
                    _p.unload_model(self.modelos.pop(k))
                    excesso -= 1

    def desenhar(self):
        for k in self.desenho:
            _p.draw_model(self.modelos[k], _p.Vector3(0, 0, 0), 1, _p.WHITE)

    def estado(self):
        completos = sum(1 for k in self.desenho if k[0] == 'c')
        return {'desenhados': len(self.desenho), 'completos': completos,
                'grossos': len(self.desenho) - completos, 'faltam': len(self.faltam),
                'guardados': len(self.modelos)}

    def descartar(self):
        modelos, self.modelos, self.desenho = list(self.modelos.values()), OrderedDict(), []
        for m in modelos:
            _p.unload_model(m)


class Cenario:
    """Cena carregada. ``dados`` conserva fonte, entidades, marcadores e licenças.

    ``arquivos`` pode resolver cada caminho lógico para um arquivo físico local,
    sem reescrever o manifesto. Atores animados não compartilham poses mutáveis.
    Com regiões, só a janela de onde a cena começa carrega na abertura; depois,
    ``atualizar(x, z)`` leva a carga junto com o personagem.
    """
    def __init__(self, raiz, dados, *, arquivos=None):
        self.dados = dados
        self._fechado = False
        self._modelos = {}
        self._usos = {}
        self._texturas = {}
        self._texturas_do_modelo = {}
        self._textura_padrao = None
        self._animacoes = {}
        self._nos = {}
        self._alturas = None
        self._buracos = None
        self._relevo = None
        self._pecas = set()
        self._plano = None
        self._carregadas = set()
        self._atual = None
        self._entradas = set()
        self._falhas = {}
        self._avisou_falha = False
        self._avisadas = set()
        self._arquivos, self._animaveis = _conferir(Path(os.fspath(raiz)).resolve(), dados, arquivos)
        self._preparar_terreno()
        self._regioes = _conferir_regioes(dados)
        self._no_por_id = {no['id']: no for no in dados['nos']}
        self._regioes_do_no, self._regioes_da_colisao = {}, {}
        for r in self._regioes:
            for n in r['nos']:
                self._regioes_do_no.setdefault(n, set()).add(r['id'])
            for c in r['colisoes']:
                self._regioes_da_colisao.setdefault(c, set()).add(r['id'])
        self._malhas = {a['caminho']: a['malhas'] if type(a.get('malhas')) is int and a['malhas'] >= 0 else 0
                        for a in dados['arquivos']}
        self._malhas_de_todas = sum(self._malhas.get(no['arquivo'], 0) for no in dados['nos']
                                    if no['id'] not in self._regioes_do_no)
        try:
            if self._regioes:
                self._plano = _PlanoDaCarga(self._regioes)
                x, z = self._inicio()
                # A janela inicial já passa pelo orçamento das 48 malhas: o motor JavaScript carrega
                # as regiões do plano e corta no primeiro quadro; aqui, onde a memória é mais curta,
                # nada além da janela chega a carregar.
                self._carregar(self._dentro_do_orcamento(self._plano.atualizar(x, z, 0.0), x, z))
                # A primeira chamada de atualizar (com o personagem) conta a entrada inicial.
                self._plano.reiniciar()
            else:
                self._carregar(None)
            if self._relevo is not None:
                self._relevo.atualizar(*self._inicio(), tudo=True)
        except BaseException:
            self.descartar()
            raise

    def _registrar_texturas(self, chave, modelo):
        # UnloadModel não possui as texturas no Raylib 6; o cenário que as
        # carregou deve soltá-las. Copiar os structs antes de liberar os mapas.
        if self._textura_padrao is None:
            material = _p.load_material_default()
            try:
                self._textura_padrao = material.maps[_p.MATERIAL_MAP_ALBEDO].texture.id
            finally:
                _p.unload_material(material)
        proprias = self._texturas_do_modelo.setdefault(chave, [])
        for j in range(modelo.materialCount):
            for i in range(12):  # MAX_MATERIAL_MAPS do contrato Raylib 6.0
                t = modelo.materials[j].maps[i].texture
                if t.id and t.id != self._textura_padrao and t.id not in self._texturas:
                    self._texturas[t.id] = _p.Texture(t.id, t.width, t.height, t.mipmaps, t.format)
                    proprias.append(t.id)

    def _chave(self, no):
        # Modelos estáticos são divididos pelo arquivo físico; os animados são um por nó.
        if no['arquivo'] in self._animaveis:
            return ('no', no['id'])
        return ('arquivo', self._arquivos[no['arquivo']][0])

    def _usar_no(self, no):
        chave = self._chave(no)
        if chave not in self._modelos:
            modelo = _p.load_model(str(self._arquivos[no['arquivo']][0]))
            self._modelos[chave] = modelo
            self._usos[chave] = 0
            try:
                self._registrar_texturas(chave, modelo)
                if not _p.is_model_valid(modelo):
                    raise ValueError(f'Não foi possível carregar o modelo de {no["id"]}.')
            except BaseException:
                self._liberar_modelo(chave)
                raise
        self._usos[chave] += 1
        self._nos[no['id']] = (no, self._modelos[chave])

    def _soltar_no(self, ident):
        no, _ = self._nos.pop(ident)
        clips = self._animacoes.pop(ident, None)
        if clips is not None:
            _p.unload_model_animations(*clips)
        chave = self._chave(no)
        self._usos[chave] -= 1
        if self._usos[chave] <= 0:
            self._liberar_modelo(chave)

    def _liberar_modelo(self, chave):
        modelo = self._modelos.pop(chave)
        self._usos.pop(chave, None)
        try:
            _p.unload_model(modelo)
        finally:
            for ident in self._texturas_do_modelo.pop(chave, ()):
                textura = self._texturas.pop(ident, None)
                if textura is not None:
                    _p.unload_texture(textura)

    def _carregar(self, alvo):
        """Leva os modelos ao conjunto de regiões ``alvo`` (``None``: a cena inteira). Uma falha
        devolve o que esta chamada carregou e deixa a carga de antes intacta."""
        querer = [no for no in self.dados['nos']
                  if alvo is None or no['id'] not in self._regioes_do_no
                  or self._regioes_do_no[no['id']] & alvo]
        novos = []
        try:
            for no in querer:
                if no['id'] not in self._nos:
                    self._usar_no(no)
                    novos.append(no['id'])
        except BaseException:
            for ident in novos:
                self._soltar_no(ident)
            raise
        ficam = {no['id'] for no in querer}
        for ident in [i for i in self._nos if i not in ficam]:
            self._soltar_no(ident)
        # O desenho segue a ordem da cena, como sempre.
        self._nos = {no['id']: self._nos[no['id']] for no in self.dados['nos'] if no['id'] in self._nos}
        self._carregadas = set(alvo or ())

    def _inicio(self):
        # A janela inicial é a de onde a cena começa: o início principal, outro início ou o meio.
        inicios = [m for m in self.dados['marcadores'] if isinstance(m, dict)
                   and isinstance(m.get('configuracao'), dict)
                   and m['configuracao'].get('tipo') == 'inicio']
        m = next((m for m in inicios if m['configuracao'].get('principal')), None)
        if m is None and inicios:
            m = inicios[0]
        if m is not None:
            x, _, z = _ponto(m.get('posicao'))
            return x, z
        if self.dados['nos']:
            volumes = [_volume(no['volume']) for no in self.dados['nos']]
            return ((min(lo[0] for lo, _ in volumes) + max(hi[0] for _, hi in volumes)) / 2,
                    (min(lo[2] for lo, _ in volumes) + max(hi[2] for _, hi in volumes)) / 2)
        return 0.0, 0.0

    def _malhas_do_conjunto(self, ids):
        nos = set()
        for r in self._regioes:
            if r['id'] in ids:
                nos.update(r['nos'])
        return self._malhas_de_todas + sum(self._malhas.get(self._no_por_id[n]['arquivo'], 0) for n in nos)

    def _dentro_do_orcamento(self, estado, x, z):
        # A janela obrigatória sempre carrega; as outras só enquanto tudo cabe em 48 malhas.
        conjunto = set(estado['obrigatorias'])
        # No empate de distância, a que já está carregada vem antes (nada de trocar à toa).
        opcionais = sorted((r for r in self._regioes
                            if r['id'] in estado['carregadas'] and r['id'] not in conjunto),
                           key=lambda r: (_distancia_ate_caixa(x, z, r['caixa']),
                                          r['id'] not in self._carregadas))
        for r in opcionais:
            if self._malhas_do_conjunto(conjunto | {r['id']}) <= _MALHAS_POR_JANELA:
                conjunto.add(r['id'])
        return conjunto

    def _aplicar(self, alvo, agora):
        try:
            self._carregar(alvo)
            for ident in alvo:
                self._falhas.pop(ident, None)
            return
        except Exception as erro:
            primeira = erro
        # A falha mantém as regiões de antes (quem está na que falhou pisa no relevo). As novas
        # são tentadas uma por uma: a que quebrou não segura as outras.
        novas = [r['id'] for r in self._regioes if r['id'] in alvo and r['id'] not in self._carregadas]
        if len(novas) <= 1:
            for ident in novas:
                self._falhou(ident, agora, primeira)
            return
        conjunto = {r for r in alvo if r in self._carregadas}
        for ident in novas:
            try:
                self._carregar(conjunto | {ident})
                conjunto.add(ident)
                self._falhas.pop(ident, None)
            except Exception as erro:
                self._falhou(ident, agora, erro)

    def _falhou(self, ident, agora, erro):
        tentativa = self._falhas.get(ident, (0, 0))[0]
        self._falhas[ident] = (tentativa + 1, agora + _NOVAS_TENTATIVAS[min(tentativa, 2)])
        if not self._avisou_falha:
            self._avisou_falha = True
            print(f'Não consegui carregar uma parte do cenário ({erro}). Vou tentar de novo.')

    @staticmethod
    def _ponto_da_camera(camera):
        if camera is None:
            return None
        posicao = getattr(camera, 'position', None)
        if posicao is not None:
            x, z = posicao.x, posicao.z
        else:
            try:
                x, z = camera
            except (TypeError, ValueError):
                raise ValueError('A câmera das regiões precisa ser a câmera 3D ou um par (x, z).') from None
        if (type(x) not in (int, float) or type(z) not in (int, float)
                or not (math.isfinite(x) and math.isfinite(z))):
            return None
        return (x, z)

    def atualizar(self, x, z, *, camera=None, agora=None):
        """A cada quadro, com a posição (x, z) do personagem: carrega a região dele, as vizinhas e
        as que estão perto, e solta as que ficaram longe. Num cenário sem regiões, não faz nada.

        ``camera`` (opcional) é a câmera 3D ou um par (x, z): com ela longe do personagem, a
        pré-carga alcança mais longe. ``agora`` é o tempo em segundos (padrão: ``get_time``).
        Uma posição que não é um número finito mantém a carga como está.
        """
        self._ativo()
        self._entradas = set()
        if self._plano is None and self._relevo is None:
            return
        if type(x) not in (int, float) or type(z) not in (int, float):
            raise ValueError('A posição das regiões precisa de dois números (x e z).')
        if not (math.isfinite(x) and math.isfinite(z)):
            return
        if self._relevo is not None:
            self._relevo.atualizar(x, z, camera if hasattr(camera, 'position') else None)
        if self._plano is None:
            return
        agora = float(_p.get_time()) if agora is None else _numero(agora)
        estado = self._plano.atualizar(x, z, agora, self._ponto_da_camera(camera))
        self._atual = estado['atual']
        self._entradas = set(estado['entradas'])
        # A região que falhou espera a vez dela de tentar de novo (1, 4 e 15 s).
        alvo = {ident for ident in self._dentro_do_orcamento(estado, x, z)
                if ident in self._carregadas or self._falhas.get(ident, (0, -math.inf))[1] <= agora}
        if alvo != self._carregadas:
            self._aplicar(alvo, agora)

    def regiao(self, x, z):
        """O nome da região onde está o ponto (x, z), ou ``None`` fora de todas (ou sem regiões).
        Na borda entre duas, vale a primeira da lista."""
        self._ativo()
        if type(x) not in (int, float) or type(z) not in (int, float):
            raise ValueError('A região de um ponto precisa de dois números (x e z).')
        if not self._regioes or not (math.isfinite(x) and math.isfinite(z)):
            return None
        ident = _regiao_do_ponto(self._regioes, x, z)
        return None if ident is None else next(r['nome'] for r in self._regioes if r['id'] == ident)

    def entrou_na_regiao(self, nome):
        """Verdadeiro uma vez por entrada do personagem na região ``nome``, contada pelo último
        ``atualizar`` (inclusive quando ele já começa dentro). Um nome que o cenário não tem é
        avisado uma vez."""
        self._ativo()
        if not any(r['nome'] == nome for r in self._regioes):
            if nome not in self._avisadas:
                self._avisadas.add(nome)
                print(f'O cenário não tem a região "{nome}". '
                      'Desenhe as regiões no Molda Cenários, na aba Jogo.')
            return False
        if nome in self._entradas:
            self._entradas.discard(nome)
            return True
        return False

    def estado_das_regioes(self):
        """``None`` sem regiões; com elas, a região atual, as carregadas e as que falharam (pelos
        nomes) e quantos modelos estão na memória."""
        self._ativo()
        if self._plano is None:
            return None

        def nomes(ids):
            return [r['nome'] for r in self._regioes if r['id'] in ids]

        return {'atual': nomes({self._atual})[0] if self._atual is not None else None,
                'carregadas': nomes(self._carregadas), 'falhas': nomes(self._falhas),
                'modelos': len(self._modelos)}

    def _preparar_terreno(self):
        t = self.dados.get('terreno')
        if not t:
            p = self.dados.get('plano')
            if p and not (_numero(p.get('largura')) > 0 and _numero(p.get('comprimento')) > 0):
                raise ValueError('O piso plano do cenário é inválido.')
            return
        for nome in ('colunas', 'linhas'):
            v = t.get(nome)
            if type(v) is not int or not 64 <= v <= 4096 or v % 64:
                raise ValueError('A grade de alturas é inválida.')
        if (not 0.25 <= _numero(t.get('passo')) <= 32
                or _numero(t.get('min')) >= _numero(t.get('max'))):
            raise ValueError('O intervalo do terreno é inválido.')
        _numero(t['origem']['x'])
        _numero(t['origem']['z'])
        _numero(t.get('fundo'))
        n = (t['colunas'] + 1) * (t['linhas'] + 1)
        arquivo = self._arquivos.get(t.get('alturas'))
        if not arquivo or arquivo[1]['bytes'] != n * 4:
            raise ValueError('O campo de alturas não corresponde à grade.')
        self._alturas = arquivo[0].read_bytes()
        minimo, maximo = (struct.unpack('<f', struct.pack('<f', t[k]))[0] for k in ('min', 'max'))
        for (v,) in struct.iter_unpack('<f', self._alturas):
            if not math.isfinite(v) or v < minimo or v > maximo:
                raise ValueError('O campo de alturas contém uma medida inválida.')
        if t.get('buracos'):
            arquivo = self._arquivos.get(t['buracos'])
            if not arquivo or arquivo[1]['bytes'] != t['colunas'] * t['linhas']:
                raise ValueError('A máscara de buracos não corresponde ao terreno.')
            self._buracos = arquivo[0].read_bytes()
            if any(v not in (0, 1) for v in self._buracos):
                raise ValueError('A máscara de buracos contém valores inválidos.')
        relevo = t.get('relevo')
        if relevo is not None:
            self._preparar_relevo(t, relevo)
        self._pecas = {(p['coluna'], p['linha']) for p in _lista(t, 'pecas', 4096)}
        for contorno in _lista(t, 'recortes', 128):
            if not isinstance(contorno, list) or not 3 <= len(contorno) <= 4096:
                raise ValueError('O terreno contém um recorte inválido.')
            for p in contorno:
                _numero(p['x'])
                _numero(p['z'])

    def _preparar_relevo(self, t, relevo):
        if (not isinstance(relevo, dict) or relevo.get('tipo') != 'campo'
                or t.get('cobertura') != 'grade' or t.get('recortes')):
            raise ValueError('O relevo de mundo grande do cenário é inválido.')
        if not _NO_ESTUDIO:
            raise ValueError('Este cenário tem o relevo de mundo grande, que só abre no Estúdio. '
                             'Exporte de novo pelo destino Raylib do Molda.')
        camadas = _lista(relevo, 'camadas', 8)
        pesos = _lista(relevo, 'pesos', 2)
        if not camadas or len(pesos) != -(-len(camadas) // 4) or any(not isinstance(c, dict) for c in camadas):
            raise ValueError('As camadas do relevo não correspondem aos pesos.')
        largura, altura = t['colunas'] + 1, t['linhas'] + 1
        crus = []
        for nome in pesos:
            arquivo = self._arquivos.get(nome)
            if not arquivo:
                raise ValueError('Os pesos do relevo não estão no pacote.')
            crus.append(_ler_png_de_pesos(arquivo[0].read_bytes(), largura, altura))
        self._relevo = _RelevoDoCampo(t, self._alturas, self._buracos, crus, camadas)

    def estado_do_relevo(self):
        """``None`` sem o relevo de mundo grande; com ele, quantos pedaços estão na tela
        (completos e grossos), quantos completos ainda faltam construir e quantos estão guardados."""
        self._ativo()
        return None if self._relevo is None else self._relevo.estado()

    def _ativo(self):
        if self._fechado:
            raise RuntimeError('O cenário já foi descartado.')

    def desenhar(self):
        """Dentro de begin_mode_3d: desenha sem alterar a câmera ou iniciar um quadro."""
        self._ativo()
        if self._relevo is not None:
            self._relevo.desenhar()
        for no, modelo in self._nos.values():
            anterior = [getattr(modelo.transform, f'm{i}') for i in range(16)]
            try:
                for i, v in enumerate(no['matriz']):
                    setattr(modelo.transform, f'm{i}', v)
                _p.draw_model(modelo, _p.Vector3(0, 0, 0), 1, _p.WHITE)
            finally:
                for i, v in enumerate(anterior):
                    setattr(modelo.transform, f'm{i}', v)

    def tem_chao(self, x, z):
        self._ativo()
        _numero(x)
        _numero(z)
        t = self.dados.get('terreno')
        if not t:
            p = self.dados.get('plano')
            return bool(p and abs(x) <= p['largura'] / 2 and abs(z) <= p['comprimento'] / 2)
        gx, gz = (x - t['origem']['x']) / t['passo'], (z - t['origem']['z']) / t['passo']
        if gx < 0 or gz < 0 or gx > t['colunas'] or gz > t['linhas']:
            return False
        col, lin = min(t['colunas'] // 64 - 1, int(gx // 64)), min(t['linhas'] // 64 - 1, int(gz // 64))
        if t.get('cobertura') != 'grade' and (col, lin) not in self._pecas:
            return False
        if any(_dentro(x, z, r) for r in t['recortes']):
            return False
        if self._buracos:
            ix, iz = int(gx), int(gz)
            if ix < t['colunas'] and iz < t['linhas'] and self._buracos[iz * t['colunas'] + ix]:
                return False
        return True

    def altura(self, x, z):
        """Altura triangular do solo; None em buracos, recortes e fora do domínio.

        Não inclui o piso elevado das pontes: suas caixas/metadados estão nos dados.
        """
        if not self.tem_chao(x, z):
            return None
        t = self.dados.get('terreno')
        if not t:
            return 0.0
        gx, gz = (x - t['origem']['x']) / t['passo'], (z - t['origem']['z']) / t['passo']
        col, lin = min(t['colunas'] // 64 - 1, int(gx // 64)), min(t['linhas'] // 64 - 1, int(gz // 64))
        if self._relevo is None and (col, lin) not in self._pecas:
            return t['fundo']
        ix, iz = min(int(gx), t['colunas'] - 1), min(int(gz), t['linhas'] - 1)
        u, v, w = gx - ix, gz - iz, t['colunas'] + 1
        def h(i, j):
            return struct.unpack_from('<f', self._alturas, (j * w + i) * 4)[0]
        a, b, c, d = h(ix, iz), h(ix + 1, iz), h(ix, iz + 1), h(ix + 1, iz + 1)
        return a + (b - a) * u + (c - a) * v if u + v <= 1 else d + (c - d) * (1 - u) + (b - d) * (1 - v)

    def colide_caixa(self, minimo, maximo, ignorar=(), tipos=('caixa', 'capsula', 'malha')):
        """Interseção com AABBs aproximadas. Não é colisão precisa contra triângulos.

        Solo, água e caminhos ficam fora do padrão; podem ser incluídos em tipos.
        minimo/maximo são sequências (x, y, z), ignorar contém IDs de entidades.
        """
        self._ativo()
        lo, hi = tuple(minimo), tuple(maximo)
        if len(lo) != 3 or len(hi) != 3:
            raise ValueError('A caixa de consulta precisa de três coordenadas por canto.')
        for a, b in zip(lo, hi):
            if _numero(a) > _numero(b):
                raise ValueError('A caixa de consulta está invertida.')
        ignorar = set(ignorar)
        for c in self.dados['colisoes']:
            if c['tipo'] not in tipos or c.get('entidade') in ignorar:
                continue
            # A colisão de uma região que não está carregada não conta (ali vale o relevo); a da
            # água vale sempre, como no motor JavaScript.
            regioes = self._regioes_da_colisao.get(c.get('id'))
            if regioes is not None and c['tipo'] != 'agua' and not regioes & self._carregadas:
                continue
            a, b = _volume(c['volume'])
            if all(lo[i] <= b[i] and hi[i] >= a[i] for i in range(3)):
                return True
        return False

    def animacoes(self, no):
        """Nomes dos clipes do Raylib para um nó; carregar não inicia animação."""
        self._ativo()
        entrada = self._nos.get(no)
        if entrada is None:
            if no in self._no_por_id:
                raise ValueError('Este nó está numa região que não está carregada agora.')
            raise ValueError('O nó não existe neste cenário.')
        if no not in self._animacoes:
            contador = _p.ffi.new('int *', 0)
            clips = _p.load_model_animations(str(self._arquivos[entrada[0]['arquivo']][0]), contador)
            self._animacoes[no] = (clips, contador[0])
        clips, n = self._animacoes[no]
        return tuple(_p.ffi.string(clips[i].name).decode('utf-8', 'replace') for i in range(n))

    def animar(self, no, indice, quadro):
        """Aplica um quadro de animação de esqueleto pela API nativa do Raylib."""
        nomes = self.animacoes(no)
        if type(indice) is not int or not 0 <= indice < len(nomes) or _numero(quadro) < 0:
            raise ValueError('A animação ou o quadro não existe neste cenário.')
        modelo, clip = self._nos[no][1], self._animacoes[no][0][indice]
        if not _p.is_model_animation_valid(modelo, clip):
            raise ValueError('A animação não corresponde ao esqueleto do modelo.')
        _p.update_model_animation(modelo, clip, quadro)

    def descartar(self):
        """Libera cada recurso uma só vez; pode ser chamado novamente."""
        if self._fechado:
            return
        self._fechado = True
        try:
            if self._relevo is not None:
                self._relevo.descartar()
            for clips, n in self._animacoes.values():
                _p.unload_model_animations(clips, n)
            for modelo in self._modelos.values():
                _p.unload_model(modelo)
            for textura in self._texturas.values():
                _p.unload_texture(textura)
        finally:
            self._animacoes.clear()
            self._modelos.clear()
            self._usos.clear()
            self._texturas.clear()
            self._texturas_do_modelo.clear()
            self._nos.clear()
            self._carregadas = set()
            self._arquivos.clear()
            self._alturas = self._buracos = self._relevo = None


def carregar(caminho='cenario.json', *, arquivos=None):
    """Abre manifesto local. O mapa opcional resolve os recursos dentro da mesma raiz.

    ``caminho`` também pode ser o módulo que a importação do Molda cria no projeto
    (``import cenario_vila`` e depois ``cenario.carregar(cenario_vila)``): ele já sabe
    o manifesto e o mapa dos arquivos. É o que o bloco "Carregar o cenário" escreve.
    """
    if isinstance(caminho, types.ModuleType):
        abrir = getattr(caminho, 'carregar', None)
        if not callable(abrir) or arquivos is not None:
            raise ValueError('Use aqui o módulo do cenário (cenario_…), que o Estúdio cria ao trazer o cenário do Molda.')
        return abrir()
    p = Path(os.fspath(caminho)).resolve()
    if p.stat().st_size > _MAX_MANIFESTO:
        raise ValueError('O manifesto do cenário ultrapassa 16 MiB.')
    with p.open('rb') as f:
        b = f.read(_MAX_MANIFESTO + 1)
    if len(b) > _MAX_MANIFESTO:
        raise ValueError('O manifesto do cenário ultrapassa 16 MiB.')
    return Cenario(p.parent, _json(b), arquivos=arquivos)
