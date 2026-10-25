"""par_shapes (Philip Rideout, MIT), a biblioteca que o raylib usa em gen_mesh_sphere,
gen_mesh_cylinder, gen_mesh_cone, gen_mesh_torus e gen_mesh_knot.

Os pontos, as coordenadas de textura e a ordem dos triângulos saem iguais aos do raylib (é o
que aparece na tela com o shader padrão). As normais seguem a mesma ideia (média das faces em
volta de cada ponto, soldando os pontos repetidos da costura), com a soldagem simplificada.
"""
import math

PI = math.pi
_epsilon_degenerate_sphere = 0.0001


class Shape:
    __slots__ = ('points', 'tcoords', 'normals', 'triangles')

    def __init__(self, points, tcoords, normals, triangles):
        self.points = points          # [x, y, z, ...]
        self.tcoords = tcoords        # [u, v, ...] ou None
        self.normals = normals        # [x, y, z, ...] ou None
        self.triangles = triangles    # [a, b, c, ...]

    @property
    def npoints(self):
        return len(self.points) // 3


def _normalize(x, y, z):
    length = math.sqrt(x * x + y * y + z * z)
    if length > 0:
        return x / length, y / length, z / length
    return x, y, z


def compute_normals(points, triangles):
    normals = [0.0] * len(points)
    p = points
    for f in range(0, len(triangles), 3):
        a, b, c = triangles[f], triangles[f + 1], triangles[f + 2]
        ax, ay, az = p[3 * a], p[3 * a + 1], p[3 * a + 2]
        bx, by, bz = p[3 * b], p[3 * b + 1], p[3 * b + 2]
        cx, cy, cz = p[3 * c], p[3 * c + 1], p[3 * c + 2]
        for index, (nx, ny, nz), (vx, vy, vz) in (
                (a, (bx - ax, by - ay, bz - az), (cx - ax, cy - ay, cz - az)),
                (b, (cx - bx, cy - by, cz - bz), (ax - bx, ay - by, az - bz)),
                (c, (ax - cx, ay - cy, az - cz), (bx - cx, by - cy, bz - cz))):
            normals[3 * index] += ny * vz - nz * vy
            normals[3 * index + 1] += nz * vx - nx * vz
            normals[3 * index + 2] += nx * vy - ny * vx
    for i in range(0, len(normals), 3):
        normals[i], normals[i + 1], normals[i + 2] = _normalize(normals[i], normals[i + 1],
                                                                normals[i + 2])
    return normals


def _welded_normals(points, triangles):
    """Normais com os pontos repetidos soldados (a costura e os polos da esfera)."""
    key_of = {}
    weld = []
    welded_points = []
    for i in range(0, len(points), 3):
        key = (round(points[i], 5), round(points[i + 1], 5), round(points[i + 2], 5))
        index = key_of.get(key)
        if index is None:
            index = key_of[key] = len(welded_points) // 3
            welded_points.extend(points[i:i + 3])
        weld.append(index)
    welded_triangles = []
    for f in range(0, len(triangles), 3):
        a, b, c = weld[triangles[f]], weld[triangles[f + 1]], weld[triangles[f + 2]]
        if a != b and a != c and b != c:
            welded_triangles.extend((a, b, c))
    welded = compute_normals(welded_points, welded_triangles)
    normals = []
    for index in weld:
        normals.extend(welded[3 * index:3 * index + 3])
    return normals


def parametric(fn, slices, stacks):
    points = []
    for stack in range(stacks + 1):
        u = stack / stacks
        for slice_ in range(slices + 1):
            points.extend(fn(u, slice_ / slices))
    tcoords = []
    for stack in range(stacks + 1):
        u = stack / stacks
        for slice_ in range(slices + 1):
            tcoords.extend((u, slice_ / slices))
    triangles = []
    v = 0
    for _ in range(stacks):
        for slice_ in range(slices):
            nxt = slice_ + 1
            triangles.extend((v + slice_ + slices + 1, v + nxt, v + slice_,
                              v + slice_ + slices + 1, v + nxt + slices + 1, v + nxt))
        v += slices + 1
    return Shape(points, tcoords, _welded_normals(points, triangles), triangles)


def _sphere(u, v):
    phi, theta = u * PI, v * 2 * PI
    return math.cos(theta) * math.sin(phi), math.sin(theta) * math.sin(phi), math.cos(phi)


def _hemisphere(u, v):
    phi, theta = u * PI, v * PI
    return math.cos(theta) * math.sin(phi), math.sin(theta) * math.sin(phi), math.cos(phi)


def _cylinder(u, v):
    theta = v * 2 * PI
    return math.sin(theta), math.cos(theta), u


def _cone(u, v):
    r = 1.0 - u
    theta = v * 2 * PI
    return r * math.sin(theta), r * math.cos(theta), u


def remove_degenerate(shape, min_area):
    min2 = (min_area * 2) * (min_area * 2)
    p = shape.points
    kept = []
    t = shape.triangles
    for f in range(0, len(t), 3):
        a, b, c = t[f], t[f + 1], t[f + 2]
        nx, ny, nz = p[3 * b] - p[3 * a], p[3 * b + 1] - p[3 * a + 1], p[3 * b + 2] - p[3 * a + 2]
        vx, vy, vz = p[3 * c] - p[3 * a], p[3 * c + 1] - p[3 * a + 1], p[3 * c + 2] - p[3 * a + 2]
        cx, cy, cz = ny * vz - nz * vy, nz * vx - nx * vz, nx * vy - ny * vx
        if cx * cx + cy * cy + cz * cz >= min2:
            kept.extend((a, b, c))
    shape.triangles = kept


def set_epsilon_degenerate_sphere(value):
    global _epsilon_degenerate_sphere
    _epsilon_degenerate_sphere = value


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
    def fn(u, v):
        theta, phi = u * 2 * PI, v * 2 * PI
        beta = 1 + minor * math.cos(phi)
        return math.cos(theta) * beta, math.sin(theta) * beta, math.sin(phi) * minor
    return parametric(fn, slices, stacks)


def trefoil(slices, stacks, minor):
    a, b, c, d = 0.5, 0.3, 0.5, minor * 0.1

    def fn(uu, vv):
        u = (1 - uu) * 4 * PI
        v = vv * 2 * PI
        r = a + b * math.cos(1.5 * u)
        x, y, z = r * math.cos(u), r * math.sin(u), c * math.sin(1.5 * u)
        q = _normalize(-1.5 * b * math.sin(1.5 * u) * math.cos(u) - (a + b * math.cos(1.5 * u)) * math.sin(u),
                       -1.5 * b * math.sin(1.5 * u) * math.sin(u) + (a + b * math.cos(1.5 * u)) * math.cos(u),
                       1.5 * c * math.cos(1.5 * u))
        qvn = _normalize(q[1], -q[0], 0.0)
        ww = (q[1] * qvn[2] - q[2] * qvn[1], q[2] * qvn[0] - q[0] * qvn[2], q[0] * qvn[1] - q[1] * qvn[0])
        return (x + d * (qvn[0] * math.cos(v) + ww[0] * math.sin(v)),
                y + d * (qvn[1] * math.cos(v) + ww[1] * math.sin(v)),
                z + d * ww[2] * math.sin(v))
    return parametric(fn, slices, stacks)


def disk(radius, slices, center, normal):
    points = [0.0, 0.0, 0.0]
    for i in range(slices):
        theta = i * PI * 2 / slices
        points.extend((radius * math.cos(theta), radius * math.sin(theta), 0.0))
    n = _normalize(*normal)
    normals = list(n) * (slices + 1)
    triangles = []
    for i in range(slices):
        triangles.extend((0, 1 + i, 1 + (i + 1) % slices))
    shape = Shape(points, None, normals, triangles)
    axis = _normalize(n[1] * -1 - n[2] * 0, n[2] * 0 - n[0] * -1, n[0] * 0 - n[1] * 0)
    rotate(shape, math.acos(n[2]), axis)
    translate(shape, *center)
    return shape


def translate(shape, x, y, z):
    p = shape.points
    for i in range(0, len(p), 3):
        p[i] += x
        p[i + 1] += y
        p[i + 2] += z


def rotate(shape, radians, axis):
    s, c = math.sin(radians), math.cos(radians)
    x, y, z = axis
    xy, yz, zx = x * y, y * z, z * x
    one = 1.0 - c
    col0 = (x * x * one + c, xy * one + z * s, zx * one - y * s)
    col1 = (xy * one - z * s, y * y * one + c, yz * one + x * s)
    col2 = (zx * one + y * s, yz * one - x * s, z * z * one + c)
    for values in (shape.points, shape.normals):
        if not values:
            continue
        for i in range(0, len(values), 3):
            px, py, pz = values[i], values[i + 1], values[i + 2]
            values[i] = col0[0] * px + col1[0] * py + col2[0] * pz
            values[i + 1] = col0[1] * px + col1[1] * py + col2[1] * pz
            values[i + 2] = col0[2] * px + col1[2] * py + col2[2] * pz


def scale(shape, x, y, z):
    p = shape.points
    for i in range(0, len(p), 3):
        p[i] *= x
        p[i + 1] *= y
        p[i + 2] *= z
    n = shape.normals
    if n and not (x == y and y == z):
        if x != 0 and y != 0 and z != 0:
            x, y, z = 1.0 / x, 1.0 / y, 1.0 / z
        else:
            x0, y0, z0 = x == 0, y == 0, z == 0
            x = float(x0 and not y0 and not z0)
            y = float(y0 and not x0 and not z0)
            z = float(z0 and not x0 and not y0)
        for i in range(0, len(n), 3):
            n[i], n[i + 1], n[i + 2] = _normalize(n[i] * x, n[i + 1] * y, n[i + 2] * z)


def merge(dst, src):
    offset = dst.npoints
    dst.points.extend(src.points)
    if src.normals or dst.normals:
        dst.normals = (dst.normals or [0.0] * (3 * offset)) + (src.normals or [0.0] * len(src.points))
    if src.tcoords or dst.tcoords:
        dst.tcoords = (dst.tcoords or [0.0] * (2 * offset)) + (src.tcoords or [0.0] * (2 * src.npoints))
    dst.triangles.extend(index + offset for index in src.triangles)


def unwelded(shape):
    """As listas de vértices do raylib: um vértice por canto de triângulo."""
    p, t, n = shape.points, shape.tcoords, shape.normals
    vertices, texcoords, normals = [], [], []
    for index in shape.triangles:
        vertices.extend(p[3 * index:3 * index + 3])
        normals.extend(n[3 * index:3 * index + 3] if n else (0.0, 0.0, 0.0))
        texcoords.extend(t[2 * index:2 * index + 2] if t else (0.0, 0.0))
    return vertices, texcoords, normals
