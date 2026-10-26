"""Câmera 3D (rcore.c e rcamera.h do raylib 6.0): o modo 3D, as conversões entre a tela e o
mundo e a câmera automática (update_camera).

A projeção do quadro (frustum ou orto) é montada no navegador com o tamanho da tela de desenho
de agora, como o BeginMode3D faz com o framebuffer atual; aqui ficam as mesmas contas para
quem pergunta pelo mundo (get_world_to_screen, get_screen_to_world_ray).
"""
from . import _constants as K
from . import _raymath as rm
from . import _rt as rt
from ._args import integer, struct
from ._float32 import DEG2RAD, F
from ._raymath import number, vec2, vec3
from ._structs import Camera3D, Ray, Vector2, Vector3

# As contas da câmera são em float, operação por operação, como no C (ver _float32.py). As
# distâncias de corte e as contas da projeção ortográfica são double no rlgl e no rcore.
CULL_NEAR = 0.05
CULL_FAR = 4000.0

# rcamera.h (os #define são float: 5.4f, 0.03f...)
CAMERA_MOVE_SPEED = F(5.4)
CAMERA_ROTATION_SPEED = F(0.03)
CAMERA_PAN_SPEED = F(2.0)
CAMERA_MOUSE_MOVE_SENSITIVITY = F(0.003)
CAMERA_ORBITAL_SPEED = F(0.5)
_WORLD_PLANE = F(0.7071)


def _camera(value, function):
    return struct(value, Camera3D, function, 'camera')


def _drawing(function):
    if not rt.window.open:
        rt.require_window(function)


def begin_mode_3d(camera, /):
    f = 'begin_mode_3d'
    cam = _camera(camera, f)
    _drawing(f)
    p, t, u = cam.position, cam.target, cam.up
    rt.ops.extend((rt.OP_BEGIN_3D, p.x, p.y, p.z, t.x, t.y, t.z, u.x, u.y, u.z, cam.fovy,
                   cam.projection))
    rt.window.mode_3d = True


def end_mode_3d():
    _drawing('end_mode_3d')
    rt.ops.append(rt.OP_END_3D)
    rt.window.mode_3d = False


# Matrizes da câmera -------------------------------------------------------------------------

def view_values(cam):
    return rm.look_at((cam.position.x, cam.position.y, cam.position.z),
                      (cam.target.x, cam.target.y, cam.target.z),
                      (cam.up.x, cam.up.y, cam.up.z))


def projection_values(cam, width, height):
    aspect = width / height
    if cam.projection == K.CAMERA_PERSPECTIVE:
        return rm.perspective(F(cam.fovy) * DEG2RAD, aspect, CULL_NEAR, CULL_FAR)
    if cam.projection == K.CAMERA_ORTHOGRAPHIC:
        top = cam.fovy / 2.0
        right = top * aspect
        return rm.ortho(-right, right, -top, top, CULL_NEAR, CULL_FAR)
    return (1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)


def get_camera_matrix(camera, /):
    return rm._make(view_values(_camera(camera, 'get_camera_matrix')))


def _transform4(m, x, y, z, w):
    """QuaternionTransform(q, m), em float."""
    m, x, y, z, w = rm._f(m), F(x), F(y), F(z), F(w)
    return (m[0] * x + m[4] * y + m[8] * z + m[12] * w,
            m[1] * x + m[5] * y + m[9] * z + m[13] * w,
            m[2] * x + m[6] * y + m[10] * z + m[14] * w,
            m[3] * x + m[7] * y + m[11] * z + m[15] * w)


def world_to_screen(position, cam, width, height):
    """GetWorldToScreenEx: a visão, depois a projeção, e a divisão pelo w em float."""
    proj = projection_values(cam, width, height)
    view = view_values(cam)
    q = _transform4(view, position[0], position[1], position[2], 1.0)
    q = _transform4(proj, *q)
    nx, ny = q[0] / q[3], -q[1] / q[3]
    return (nx + 1.0) / 2.0 * F(width), (ny + 1.0) / 2.0 * F(height)


def get_world_to_screen(position, camera, /):
    f = 'get_world_to_screen'
    rt.require_window(f)
    point = vec3(position, f, 'position')
    return Vector2(*world_to_screen(point, _camera(camera, f), rt.window.width, rt.window.height))


def get_world_to_screen_ex(position, camera, width, height, /):
    f = 'get_world_to_screen_ex'
    point = vec3(position, f, 'position')
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    return Vector2(*world_to_screen(point, _camera(camera, f), w, h))


def screen_to_world_ray(position, cam, width, height):
    """GetScreenToWorldRayEx: três pontos pelo Vector3Unproject do raymath."""
    x = (2.0 * F(position[0])) / F(width) - 1.0
    y = 1.0 - (2.0 * F(position[1])) / F(height)
    view = view_values(cam)
    proj = projection_values(cam, width, height)
    near = rm.unproject(x, y, 0.0, proj, view)
    far = rm.unproject(x, y, 1.0, proj, view)
    plane = rm.unproject(x, y, -1.0, proj, view)
    direction = rm._normalize3((far[0] - near[0], far[1] - near[1], far[2] - near[2]))
    if cam.projection == K.CAMERA_ORTHOGRAPHIC:
        origin = plane
    elif cam.projection == K.CAMERA_PERSPECTIVE:
        origin = (cam.position.x, cam.position.y, cam.position.z)
    else:
        origin = (0.0, 0.0, 0.0)
    return Ray(Vector3(*origin), Vector3(*direction))


def get_screen_to_world_ray(position, camera, /):
    f = 'get_screen_to_world_ray'
    rt.require_window(f)
    point = vec2(position, f, 'position')
    return screen_to_world_ray(point, _camera(camera, f), rt.window.width, rt.window.height)


def get_screen_to_world_ray_ex(position, camera, width, height, /):
    f = 'get_screen_to_world_ray_ex'
    point = vec2(position, f, 'position')
    w, h = integer(width, f, 'width'), integer(height, f, 'height')
    return screen_to_world_ray(point, _camera(camera, f), w, h)


# Câmera automática (rcamera.h) ---------------------------------------------------------------

def _v(vector):
    return (vector.x, vector.y, vector.z)


def _forward(cam):
    return rm._normalize3(rm._sub3(_v(cam.target), _v(cam.position)))


def _up(cam):
    return rm._normalize3(_v(cam.up))


def _right(cam):
    return rm._normalize3(rm._cross(_forward(cam), _up(cam)))


def _flatten(vector, cam):
    """Projeta no chão do mundo (o plano do vetor up), como o moveInWorldPlane."""
    x, y, z = vector
    if abs(cam.up.z) > _WORLD_PLANE:
        z = 0.0
    elif abs(cam.up.x) > _WORLD_PLANE:
        x = 0.0
    else:
        y = 0.0
    return rm._normalize3((x, y, z))


def _move(cam, vector, distance):
    step = (vector[0] * distance, vector[1] * distance, vector[2] * distance)
    cam.position = rm._add3(_v(cam.position), step)
    cam.target = rm._add3(_v(cam.target), step)


def _move_forward(cam, distance, world_plane):
    forward = _forward(cam)
    _move(cam, _flatten(forward, cam) if world_plane else forward, distance)


def _move_right(cam, distance, world_plane):
    right = _right(cam)
    _move(cam, _flatten(right, cam) if world_plane else right, distance)


def _move_up(cam, distance):
    _move(cam, _up(cam), distance)


def _move_to_target(cam, delta):
    distance = rm._length3(rm._sub3(_v(cam.position), _v(cam.target))) + delta
    if distance <= 0:
        distance = 0.001
    forward = _forward(cam)
    cam.position = rm._sub3(_v(cam.target), (forward[0] * distance, forward[1] * distance,
                                               forward[2] * distance))


def _yaw(cam, angle, around_target):
    view = rm._sub3(_v(cam.target), _v(cam.position))
    view = rm._rotate_axis_angle(view, _up(cam), angle)
    if around_target:
        cam.position = rm._sub3(_v(cam.target), view)
    else:
        cam.target = rm._add3(_v(cam.position), view)


def _pitch(cam, angle, lock_view, around_target, rotate_up):
    up = _up(cam)
    view = rm._sub3(_v(cam.target), _v(cam.position))
    if lock_view:
        max_up = rm._angle3(up, view) - 0.001
        if angle > max_up:
            angle = max_up
        max_down = -rm._angle3((-up[0], -up[1], -up[2]), view) + 0.001
        if angle < max_down:
            angle = max_down
    right = _right(cam)
    view = rm._rotate_axis_angle(view, right, angle)
    if around_target:
        cam.position = rm._sub3(_v(cam.target), view)
    else:
        cam.target = rm._add3(_v(cam.position), view)
    if rotate_up:
        cam.up = rm._rotate_axis_angle(_v(cam.up), right, angle)


def _roll(cam, angle):
    cam.up = rm._rotate_axis_angle(_v(cam.up), _forward(cam), angle)


def update_camera(camera, mode, /):
    f = 'update_camera'
    cam = _camera(camera, f)
    mode = integer(mode, f, 'mode')
    from . import _core
    delta = _core.get_mouse_delta()
    world_plane = mode in (K.CAMERA_FIRST_PERSON, K.CAMERA_THIRD_PERSON)
    around_target = mode in (K.CAMERA_THIRD_PERSON, K.CAMERA_ORBITAL)
    lock_view = mode in (K.CAMERA_FREE, K.CAMERA_FIRST_PERSON, K.CAMERA_THIRD_PERSON,
                         K.CAMERA_ORBITAL)
    dt = F(rt.window.frame_time)
    move_speed = CAMERA_MOVE_SPEED * dt
    rotation_speed = CAMERA_ROTATION_SPEED * dt
    pan_speed = CAMERA_PAN_SPEED * dt
    orbital_speed = CAMERA_ORBITAL_SPEED * dt
    down = rt.input.down

    if mode == K.CAMERA_CUSTOM:
        pass
    elif mode == K.CAMERA_ORBITAL:
        rotation = rm._rotate(_up(cam), orbital_speed)
        view = rm._sub3(_v(cam.position), _v(cam.target))
        x, y, z = view
        m = rotation
        view = (m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
                m[2] * x + m[6] * y + m[10] * z + m[14])
        cam.position = rm._add3(_v(cam.target), view)
    else:
        if down[K.KEY_DOWN]:
            _pitch(cam, -rotation_speed, lock_view, around_target, False)
        if down[K.KEY_UP]:
            _pitch(cam, rotation_speed, lock_view, around_target, False)
        if down[K.KEY_RIGHT]:
            _yaw(cam, -rotation_speed, around_target)
        if down[K.KEY_LEFT]:
            _yaw(cam, rotation_speed, around_target)
        if down[K.KEY_Q]:
            _roll(cam, -rotation_speed)
        if down[K.KEY_E]:
            _roll(cam, rotation_speed)
        if mode == K.CAMERA_FREE and rt.input.buttons[K.MOUSE_BUTTON_MIDDLE]:
            if delta.x > 0:
                _move_right(cam, pan_speed, world_plane)
            if delta.x < 0:
                _move_right(cam, -pan_speed, world_plane)
            if delta.y > 0:
                _move_up(cam, -pan_speed)
            if delta.y < 0:
                _move_up(cam, pan_speed)
        else:
            _yaw(cam, -delta.x * CAMERA_MOUSE_MOVE_SENSITIVITY, around_target)
            _pitch(cam, -delta.y * CAMERA_MOUSE_MOVE_SENSITIVITY, lock_view, around_target, False)
        if down[K.KEY_W]:
            _move_forward(cam, move_speed, world_plane)
        if down[K.KEY_A]:
            _move_right(cam, -move_speed, world_plane)
        if down[K.KEY_S]:
            _move_forward(cam, -move_speed, world_plane)
        if down[K.KEY_D]:
            _move_right(cam, move_speed, world_plane)
        if mode == K.CAMERA_FREE:
            if down[K.KEY_SPACE]:
                _move_up(cam, move_speed)
            if down[K.KEY_LEFT_CONTROL]:
                _move_up(cam, -move_speed)

    if mode in (K.CAMERA_THIRD_PERSON, K.CAMERA_ORBITAL, K.CAMERA_FREE):
        _move_to_target(cam, -_core.get_mouse_wheel_move())
        if _core.is_key_pressed(K.KEY_KP_SUBTRACT):
            _move_to_target(cam, 2.0)
        if _core.is_key_pressed(K.KEY_KP_ADD):
            _move_to_target(cam, -2.0)


def update_camera_pro(camera, movement, rotation, zoom, /):
    f = 'update_camera_pro'
    cam = _camera(camera, f)
    mx, my, mz = vec3(movement, f, 'movement')
    rx, ry, rz = vec3(rotation, f, 'rotation')
    z = number(zoom, f, 'zoom')
    _pitch(cam, -ry * DEG2RAD, True, False, False)
    _yaw(cam, -rx * DEG2RAD, False)
    _roll(cam, rz * DEG2RAD)
    _move_forward(cam, mx, True)
    _move_right(cam, my, True)
    _move_up(cam, mz)
    _move_to_target(cam, z)
