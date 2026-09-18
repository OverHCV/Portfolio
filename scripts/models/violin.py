"""
Violín (Blend Swap #92873, CC0): violin.blend → public/models/violin.glb.

    /Applications/Blender.app/Contents/MacOS/Blender -b raw/extract/violin/Violin/violin.blend -P scripts/models/violin.py

El .blend no es low-poly (~516k tris). Se quitan luces, cámara, partituras, arco y cuerdas (la mitad de
los triángulos, invisibles a la distancia del acto), se decima lo demás hasta ~15k tris, se une en una
malla (una primitiva por material) y se escala a 0.59 m. Los materiales de Cycles no se exportan: en R3F
se reemplazan por los del sitio según su nombre (wood, black, gold…), así que solo viajan nombres.
"""

import math
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
out = ROOT / "public/models/violin.glb"
TARGET_TRIS = 12000
MIN_TRIS = 120
LENGTH = 0.59

DROP = ("bow", "sheet", "string_")
for obj in list(bpy.data.objects):
    if obj.type != "MESH" or obj.name.startswith(DROP):
        bpy.data.objects.remove(obj, do_unlink=True)

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


total = sum(tris(o) for o in meshes)
ratio = min(1.0, TARGET_TRIS / total)
for obj in meshes:
    # Las piezas chicas (clavijas, afinadores) conservan un mínimo de forma.
    if tris(obj) <= MIN_TRIS:
        continue
    mod = obj.modifiers.new("decimate", "DECIMATE")
    mod.ratio = max(ratio, MIN_TRIS / tris(obj))
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)

bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
violin = bpy.context.view_layer.objects.active
violin.name = "violin"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Centro de la caja en el origen y largo real.
bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
violin.location = (0, 0, 0)
violin.scale = [LENGTH / max(violin.dimensions)] * 3
bpy.ops.object.transform_apply(location=True, scale=True)
bpy.ops.object.shade_auto_smooth(angle=math.radians(40))

# Materiales mínimos con el nombre original: R3F los reemplaza.
for slot in violin.material_slots:
    if slot.material:
        slot.material.use_nodes = False

bpy.ops.export_scene.gltf(
    filepath=str(out),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_texcoords=False,
    export_materials="PLACEHOLDER",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
)
print("tris", tris(violin), "dims", tuple(round(d, 3) for d in violin.dimensions), "mats", [s.material.name for s in violin.material_slots if s.material])
