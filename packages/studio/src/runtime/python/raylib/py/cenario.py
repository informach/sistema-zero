"""Cenários compilados do Molda no Raylib nativo e no Estúdio.

    import cenario
    lugar = cenario.carregar('cenario.json')  # depois de init_window
    # dentro de begin_mode_3d: lugar.desenhar()
    # lugar.altura(x, z) retorna None onde não há chão
    # lugar.colide_caixa(minimo, maximo) consulta aproximações AABB
    lugar.descartar()                        # antes de close_window

Não inicia loop, câmera ou física. Água é estática; ambiente e regras continuam
disponíveis nos dados para o programa. As malhas já vieram do compilador.
"""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct

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


class Cenario:
    """Cena carregada. ``dados`` conserva fonte, entidades, marcadores e licenças.

    ``arquivos`` pode resolver cada caminho lógico para um arquivo físico local,
    sem reescrever o manifesto. Atores animados não compartilham poses mutáveis.
    """
    def __init__(self, raiz, dados, *, arquivos=None):
        self.dados = dados
        self._fechado = False
        self._modelos = {}
        self._texturas = {}
        self._textura_padrao = None
        self._animacoes = {}
        self._nos = {}
        self._alturas = None
        self._buracos = None
        self._pecas = set()
        self._arquivos, animaveis = _conferir(Path(os.fspath(raiz)).resolve(), dados, arquivos)
        self._preparar_terreno()
        try:
            for no in dados['nos']:
                chave = ('no', no['id']) if no['arquivo'] in animaveis else ('arquivo', self._arquivos[no['arquivo']][0])
                if chave not in self._modelos:
                    modelo = _p.load_model(str(self._arquivos[no['arquivo']][0]))
                    self._modelos[chave] = modelo
                    self._registrar_texturas(modelo)
                    if not _p.is_model_valid(modelo):
                        raise ValueError(f'Não foi possível carregar o modelo de {no["id"]}.')
                self._nos[no['id']] = (no, self._modelos[chave])
        except BaseException:
            self.descartar()
            raise

    def _registrar_texturas(self, modelo):
        # UnloadModel não possui as texturas no Raylib 6; o cenário que as
        # carregou deve soltá-las. Copiar os structs antes de liberar os mapas.
        if self._textura_padrao is None:
            material = _p.load_material_default()
            try:
                self._textura_padrao = material.maps[_p.MATERIAL_MAP_ALBEDO].texture.id
            finally:
                _p.unload_material(material)
        for j in range(modelo.materialCount):
            for i in range(12):  # MAX_MATERIAL_MAPS do contrato Raylib 6.0
                t = modelo.materials[j].maps[i].texture
                if t.id and t.id != self._textura_padrao and t.id not in self._texturas:
                    self._texturas[t.id] = _p.Texture(t.id, t.width, t.height, t.mipmaps, t.format)

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
        self._pecas = {(p['coluna'], p['linha']) for p in _lista(t, 'pecas', 4096)}
        for contorno in _lista(t, 'recortes', 128):
            if not isinstance(contorno, list) or not 3 <= len(contorno) <= 4096:
                raise ValueError('O terreno contém um recorte inválido.')
            for p in contorno:
                _numero(p['x'])
                _numero(p['z'])

    def _ativo(self):
        if self._fechado:
            raise RuntimeError('O cenário já foi descartado.')

    def desenhar(self):
        """Dentro de begin_mode_3d: desenha sem alterar a câmera ou iniciar um quadro."""
        self._ativo()
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
        if (col, lin) not in self._pecas:
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
            a, b = _volume(c['volume'])
            if all(lo[i] <= b[i] and hi[i] >= a[i] for i in range(3)):
                return True
        return False

    def animacoes(self, no):
        """Nomes dos clipes do Raylib para um nó; carregar não inicia animação."""
        self._ativo()
        entrada = self._nos.get(no)
        if entrada is None:
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
            for clips, n in self._animacoes.values():
                _p.unload_model_animations(clips, n)
            for modelo in self._modelos.values():
                _p.unload_model(modelo)
            for textura in self._texturas.values():
                _p.unload_texture(textura)
        finally:
            self._animacoes.clear()
            self._modelos.clear()
            self._texturas.clear()
            self._nos.clear()
            self._arquivos.clear()
            self._alturas = self._buracos = None


def carregar(caminho='cenario.json', *, arquivos=None):
    """Abre manifesto local. O mapa opcional resolve os recursos dentro da mesma raiz."""
    p = Path(os.fspath(caminho)).resolve()
    if p.stat().st_size > _MAX_MANIFESTO:
        raise ValueError('O manifesto do cenário ultrapassa 16 MiB.')
    with p.open('rb') as f:
        b = f.read(_MAX_MANIFESTO + 1)
    if len(b) > _MAX_MANIFESTO:
        raise ValueError('O manifesto do cenário ultrapassa 16 MiB.')
    return Cenario(p.parent, _json(b), arquivos=arquivos)
