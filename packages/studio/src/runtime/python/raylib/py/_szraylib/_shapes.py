"""par_shapes (Philip Rideout, MIT), a biblioteca que o raylib usa em gen_mesh_sphere,
gen_mesh_cylinder, gen_mesh_cone, gen_mesh_torus e gen_mesh_knot.

Transcrito do par_shapes.h com o mesmo modelo de precisão do C, para os pontos, as coordenadas
de textura e as normais saírem iguais aos do raylib bit a bit:

* os pontos são float, e cada conta em float é arredondada a cada operação (``F``);
* ``PAR_PI`` é um literal double (3.14159265359): ``uv * PAR_PI`` é feito em double e só depois
  guardado em float; o nó (trefoil) e o disco usam ``cos``/``sin`` de double;
* as normais são as do ``par_shapes__compute_welded_normals``: os pontos são soldados numa grade
  20x20x20, ordenada com o ``qsort``. O qsort não é estável, então a ordem dos empates decide
  qual ponto da costura vira o representante; aqui está o qsort da UCRT (o do raylib para
  Windows, conferido contra o ucrtbase.dll). No Linux e no Mac o raylib usa o qsort de lá e
  pode diferir no último bit da normal da costura.
"""
import math

from ._float32 import F, cosf, sinf

PAR_PI = 3.14159265359
_epsilon_degenerate_sphere = F(0.0001)
_EPSILON_WELDED_NORMALS = F(0.001)


class Shape:
    __slots__ = ('points', 'tcoords', 'normals', 'triangles')

    def __init__(self, points, tcoords, normals, triangles):
        self.points = points          # [x, y, z, ...] (floats do C)
        self.tcoords = tcoords        # [u, v, ...] ou None
        self.normals = normals        # [x, y, z, ...] ou None
        self.triangles = triangles    # [a, b, c, ...]

    @property
    def npoints(self):
        return len(self.points) // 3

    @property
    def ntriangles(self):
        return len(self.triangles) // 3


def _d(value):
    """O float do C promovido a double (para as contas que o C faz em double)."""
    return float(value)


# Vetores de 3 floats (par_shapes__*) ---------------------------------------------------------

def _normalize3(v):
    """par_shapes__normalize3: a raiz em double, o resto em float."""
    x, y, z = F(v[0]), F(v[1]), F(v[2])
    length = F(math.sqrt(_d(x * x + y * y + z * z)))
    if length > 0:
        inverse = 1.0 / length
        return x * inverse, y * inverse, z * inverse
    return x, y, z


def _cross3(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


# Formas paramétricas --------------------------------------------------------------------------

def parametric(fn, slices, stacks):
    points = []
    for stack in range(stacks + 1):
        u = F(stack) / stacks
        for slice_ in range(slices + 1):
            points.extend(fn(u, F(slice_) / slices))
    tcoords = []
    for stack in range(stacks + 1):
        u = F(stack) / stacks
        for slice_ in range(slices + 1):
            tcoords.extend((u, F(slice_) / slices))
    triangles = []
    v = 0
    for _ in range(stacks):
        for slice_ in range(slices):
            nxt = slice_ + 1
            triangles.extend((v + slice_ + slices + 1, v + nxt, v + slice_,
                              v + slice_ + slices + 1, v + nxt + slices + 1, v + nxt))
        v += slices + 1
    shape = Shape(points, tcoords, None, triangles)
    shape.normals = welded_normals(shape)
    return shape


def _angle(value, factor=1):
    """``uv * factor * PAR_PI``: a parte inteira em float, o PI em double, guardado em float."""
    return F(_d(value * factor) * PAR_PI)


def _sphere(u, v):
    phi, theta = _angle(u), _angle(v, 2)
    return cosf(theta) * sinf(phi), sinf(theta) * sinf(phi), cosf(phi)


def _hemisphere(u, v):
    phi, theta = _angle(u), _angle(v)
    return cosf(theta) * sinf(phi), sinf(theta) * sinf(phi), cosf(phi)


def _cylinder(u, v):
    theta = _angle(v, 2)
    return sinf(theta), cosf(theta), u


def _cone(u, v):
    r = 1.0 - u
    theta = _angle(v, 2)
    return r * sinf(theta), r * cosf(theta), u


def remove_degenerate(shape, min_area):
    min_area = F(min_area)
    min2 = (min_area * 2) * (min_area * 2)
    p = shape.points
    kept = []
    t = shape.triangles
    for f in range(0, len(t), 3):
        a, b, c = t[f], t[f + 1], t[f + 2]
        pa, pb, pc = p[3 * a:3 * a + 3], p[3 * b:3 * b + 3], p[3 * c:3 * c + 3]
        nxt = (pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2])
        prev = (pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2])
        cp = _cross3(nxt, prev)
        # par_shapes__dot3(cp, cp) soma b*a na ordem do C.
        if cp[0] * cp[0] + cp[1] * cp[1] + cp[2] * cp[2] >= min2:
            kept.extend((a, b, c))
    shape.triangles = kept


def set_epsilon_degenerate_sphere(value):
    global _epsilon_degenerate_sphere
    _epsilon_degenerate_sphere = F(value)


def parametric_sphere(slices, stacks):
    shape = parametric(_sphere, slices, stacks)
    remove_degenerate(shape, _epsilon_degenerate_sphere)
    return shape


def hemisphere(slices, stacks):
    shape = parametric(_hemisphere, slices, stacks)
    remove_degenerate(shape, _epsilon_degenerate_sphere)
    return shape


def cylinder(slices, stacks):
    return parametric(_cylinder, slices, stacks)


def cone(slices, stacks):
    return parametric(_cone, slices, stacks)


def torus(slices, stacks, minor):
    major, minor = F(1), F(minor)

    def fn(u, v):
        theta, phi = _angle(u, 2), _angle(v, 2)
        beta = major + minor * cosf(phi)
        return cosf(theta) * beta, sinf(theta) * beta, sinf(phi) * minor
    return parametric(fn, slices, stacks)


def trefoil(slices, stacks, minor):
    a, b, c = F(0.5), F(0.3), F(0.5)
    d = F(minor) * 0.1
    nb = F(-1.5) * b
    c15 = F(1.5) * c

    def fn(uu, vv):
        u = F(_d((1 - uu) * 4) * PAR_PI)
        v = _angle(vv, 2)
        u15 = _d(F(1.5) * u)
        du, dv = _d(u), _d(v)
        r = F(_d(a) + _d(b) * math.cos(u15))
        x, y, z = F(_d(r) * math.cos(du)), F(_d(r) * math.sin(du)), F(_d(c) * math.sin(u15))
        ring = _d(a) + _d(b) * math.cos(u15)
        q = _normalize3((F(_d(nb) * math.sin(u15) * math.cos(du) - ring * math.sin(du)),
                         F(_d(nb) * math.sin(u15) * math.sin(du) + ring * math.cos(du)),
                         F(_d(c15) * math.cos(u15))))
        qvn = _normalize3((q[1], -q[0], F(0)))
        ww = _cross3(q, qvn)
        cv, sv = math.cos(dv), math.sin(dv)
        return (F(_d(x) + _d(d) * (_d(qvn[0]) * cv + _d(ww[0]) * sv)),
                F(_d(y) + _d(d) * (_d(qvn[1]) * cv + _d(ww[1]) * sv)),
                F(_d(z) + _d(d * ww[2]) * sv))
    return parametric(fn, slices, stacks)


def disk(radius, slices, center, normal):
    radius = F(radius)
    points = [F(0), F(0), F(0)]
    for i in range(slices):
        theta = F(i * PAR_PI * 2 / slices)
        points.extend((F(_d(radius) * math.cos(_d(theta))), F(_d(radius) * math.sin(_d(theta))), F(0)))
    n = _normalize3(normal)
    normals = list(n) * (slices + 1)
    triangles = []
    for i in range(slices):
        triangles.extend((0, 1 + i, 1 + (i + 1) % slices))
    shape = Shape(points, None, normals, triangles)
    axis = _normalize3(_cross3(n, (F(0), F(0), F(-1))))
    rotate(shape, F(math.acos(_d(n[2]))), axis)
    translate(shape, *center)
    return shape


# Transformações -------------------------------------------------------------------------------

def translate(shape, x, y, z):
    x, y, z = F(x), F(y), F(z)
    p = shape.points
    for i in range(0, len(p), 3):
        p[i] += x
        p[i + 1] += y
        p[i + 2] += z


def rotate(shape, radians, axis):
    radians = F(radians)
    s, c = sinf(radians), cosf(radians)
    x, y, z = F(axis[0]), F(axis[1]), F(axis[2])
    xy, yz, zx = x * y, y * z, z * x
    one = 1.0 - c
    col0 = (x * x * one + c, xy * one + z * s, zx * one - y * s)
    col1 = (xy * one - z * s, y * y * one + c, yz * one + x * s)
    col2 = (zx * one + y * s, yz * one - x * s, z * z * one + c)
    for values in (shape.points, shape.normals):
        if not values:
            continue
        for i in range(0, len(values), 3):
            px, py, pz = F(values[i]), F(values[i + 1]), F(values[i + 2])
            values[i] = col0[0] * px + col1[0] * py + col2[0] * pz
            values[i + 1] = col0[1] * px + col1[1] * py + col2[1] * pz
            values[i + 2] = col0[2] * px + col1[2] * py + col2[2] * pz


def scale(shape, x, y, z):
    x, y, z = F(x), F(y), F(z)
    p = shape.points
    for i in range(0, len(p), 3):
        p[i] = F(p[i]) * x
        p[i + 1] = F(p[i + 1]) * y
        p[i + 2] = F(p[i + 2]) * z
    n = shape.normals
    if n and not (x == y and y == z):
        if x != 0 and y != 0 and z != 0:
            x, y, z = 1.0 / x, 1.0 / y, 1.0 / z
        else:
            x0, y0, z0 = x == 0, y == 0, z == 0
            x = F(x0 and not y0 and not z0)
            y = F(y0 and not x0 and not z0)
            z = F(z0 and not x0 and not y0)
        for i in range(0, len(n), 3):
            n[i], n[i + 1], n[i + 2] = _normalize3((F(n[i]) * x, F(n[i + 1]) * y, F(n[i + 2]) * z))


def merge(dst, src):
    offset = dst.npoints
    dst.points.extend(src.points)
    if src.normals or dst.normals:
        dst.normals = (dst.normals or [F(0)] * (3 * offset)) + (src.normals or [F(0)] * len(src.points))
    if src.tcoords or dst.tcoords:
        dst.tcoords = (dst.tcoords or [F(0)] * (2 * offset)) + (src.tcoords or [F(0)] * (2 * src.npoints))
    dst.triangles.extend(index + offset for index in src.triangles)


# Normais soldadas -----------------------------------------------------------------------------

def compute_normals(points, triangles):
    """par_shapes_compute_normals: soma o produto vetorial de cada canto, em float."""
    normals = [F(0)] * len(points)
    p = points
    for f in range(0, len(triangles), 3):
        a, b, c = triangles[f], triangles[f + 1], triangles[f + 2]
        pa, pb, pc = p[3 * a:3 * a + 3], p[3 * b:3 * b + 3], p[3 * c:3 * c + 3]
        for index, origin, first, second in ((a, pa, pb, pc), (b, pb, pc, pa), (c, pc, pa, pb)):
            nxt = (first[0] - origin[0], first[1] - origin[1], first[2] - origin[2])
            prev = (second[0] - origin[0], second[1] - origin[1], second[2] - origin[2])
            cp = _cross3(nxt, prev)
            normals[3 * index] += cp[0]
            normals[3 * index + 1] += cp[1]
            normals[3 * index + 2] += cp[2]
    for i in range(0, len(normals), 3):
        normals[i], normals[i + 1], normals[i + 2] = _normalize3(normals[i:i + 3])
    return normals


def _ucrt_qsort(items, compare):
    """O qsort da UCRT (o do raylib para Windows), com a mesma ordem para os empates."""
    a = list(items)
    if len(a) < 2:
        return a
    lostk, histk = [], []
    lo, hi = 0, len(a) - 1
    while True:
        size = hi - lo + 1
        if size <= 8:
            top = hi
            while top > lo:
                biggest = lo
                for index in range(lo + 1, top + 1):
                    if compare(a[index], a[biggest]) > 0:
                        biggest = index
                a[biggest], a[top] = a[top], a[biggest]
                top -= 1
        else:
            mid = lo + size // 2
            if compare(a[lo], a[mid]) > 0:
                a[lo], a[mid] = a[mid], a[lo]
            if compare(a[lo], a[hi]) > 0:
                a[lo], a[hi] = a[hi], a[lo]
            if compare(a[mid], a[hi]) > 0:
                a[mid], a[hi] = a[hi], a[mid]
            loguy, higuy = lo, hi
            while True:
                if mid > loguy:
                    loguy += 1
                    while loguy < mid and compare(a[loguy], a[mid]) <= 0:
                        loguy += 1
                if mid <= loguy:
                    loguy += 1
                    while loguy <= hi and compare(a[loguy], a[mid]) <= 0:
                        loguy += 1
                higuy -= 1
                while higuy > mid and compare(a[higuy], a[mid]) > 0:
                    higuy -= 1
                if higuy < loguy:
                    break
                a[loguy], a[higuy] = a[higuy], a[loguy]
                if mid == higuy:
                    mid = loguy
            higuy += 1
            if mid < higuy:
                higuy -= 1
                while higuy > mid and compare(a[higuy], a[mid]) == 0:
                    higuy -= 1
            if mid >= higuy:
                higuy -= 1
                while higuy > lo and compare(a[higuy], a[mid]) == 0:
                    higuy -= 1
            if higuy - lo >= hi - loguy:
                if lo < higuy:
                    lostk.append(lo)
                    histk.append(higuy)
                if loguy < hi:
                    lo = loguy
                    continue
            else:
                if loguy < hi:
                    lostk.append(loguy)
                    histk.append(hi)
                if lo < higuy:
                    hi = higuy
                    continue
        if not lostk:
            return a
        lo, hi = lostk.pop(), histk.pop()


def _cell(points, index, grid):
    return (int(points[3 * index]) + grid * int(points[3 * index + 1])
            + grid * grid * int(points[3 * index + 2]))


def weld(shape, epsilon):
    """par_shapes_weld: devolve (pontos soldados, triângulos soldados, mapa ponto -> soldado)."""
    count = shape.npoints
    points = list(shape.points)
    grid = 20
    maxcell = F(grid - 1)
    low = [points[0], points[1], points[2]]
    high = list(low)
    for i in range(1, count):
        for axis in range(3):
            value = points[3 * i + axis]
            low[axis] = low[axis] if value > low[axis] else value
            high[axis] = value if value > high[axis] else high[axis]
    factor = [F(1.0) if high[axis] == low[axis] else maxcell / (F(high[axis]) - low[axis])
              for axis in range(3)]
    for i in range(count):
        for axis in range(3):
            points[3 * i + axis] = (F(points[3 * i + axis]) - low[axis]) * factor[axis]

    # par_shapes__sort_points: o qsort decide a ordem dentro de cada célula.
    keys = [_cell(points, i, grid) for i in range(count)]
    order = _ucrt_qsort(range(count), lambda x, y: (keys[x] > keys[y]) - (keys[x] < keys[y]))
    inverse = [0] * count
    for position, original in enumerate(order):
        inverse[original] = position
    points = [value for original in order for value in points[3 * original:3 * original + 3]]
    triangles = [inverse[index] for index in shape.triangles]

    # par_shapes__weld_points
    weldmap = list(range(count))
    bins = {}
    previous = -1
    for p in range(count):
        cell = _cell(points, p, grid)
        if cell != previous:
            bins[cell] = 1 + p
        previous = cell
    removed = 0
    for p in range(count):
        if weldmap[p] != p:
            continue
        here = points[3 * p:3 * p + 3]
        lows = [int(here[axis] - epsilon) for axis in range(3)]
        highs = [int(here[axis] + epsilon) for axis in range(3)]
        nearby = []
        for i in range(lows[0], highs[0] + 1):
            for j in range(lows[1], highs[1] + 1):
                for k in range(lows[2], highs[2] + 1):
                    cell = i + grid * j + grid * grid * k
                    if bins.get(cell, 0) > 0 and len(nearby) < 8:
                        nearby.append(cell)
        for cell in nearby:
            other = bins[cell] - 1
            while True:
                if other != p and weldmap[other] == other:
                    there = points[3 * other:3 * other + 3]
                    dx, dy, dz = there[0] - here[0], there[1] - here[1], there[2] - here[2]
                    if dx * dx + dy * dy + dz * dz < epsilon:
                        weldmap[other] = p
                        removed += 1
                other += 1
                if other >= count or _cell(points, other, grid) != cell:
                    break
    kept, condensed = [], [0] * count
    next_index = 0
    for p in range(count):
        if weldmap[p] == p:
            kept.extend(points[3 * p:3 * p + 3])
            condensed[p] = next_index
            next_index += 1
        else:
            condensed[p] = condensed[weldmap[p]]
    welded_triangles = []
    for f in range(0, len(triangles), 3):
        a, b, c = condensed[triangles[f]], condensed[triangles[f + 1]], condensed[triangles[f + 2]]
        if a != b and a != c and b != c:
            welded_triangles.extend((a, b, c))
    mapping = [condensed[inverse[original]] for original in range(count)]

    # De volta ao lugar: a escala inversa (1.0/escala em double, passada como float) e a origem.
    back = [F(1.0 / _d(value)) for value in factor]
    for i in range(0, len(kept), 3):
        for axis in range(3):
            kept[i + axis] = F(kept[i + axis]) * back[axis] + low[axis]
    return kept, welded_triangles, mapping


def welded_normals(shape):
    """par_shapes__compute_welded_normals."""
    points, triangles, mapping = weld(shape, _EPSILON_WELDED_NORMALS)
    welded = compute_normals(points, triangles)
    normals = []
    for index in mapping:
        normals.extend(welded[3 * index:3 * index + 3])
    return normals


def unwelded(shape):
    """As listas de vértices do raylib: um vértice por canto de triângulo."""
    p, t, n = shape.points, shape.tcoords, shape.normals
    vertices, texcoords, normals = [], [], []
    for index in shape.triangles:
        vertices.extend(p[3 * index:3 * index + 3])
        normals.extend(n[3 * index:3 * index + 3] if n else (0.0, 0.0, 0.0))
        texcoords.extend(t[2 * index:2 * index + 2] if t else (0.0, 0.0))
    return vertices, texcoords, normals
