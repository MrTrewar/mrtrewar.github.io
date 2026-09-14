"""Run with Blender --background --python blender/create_skater.py."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*color, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.78
    return mat

hoodie = material('Burnt orange hoodie', (0.92, 0.245, 0.075))
dark = material('Forest canvas', (0.035, 0.095, 0.08))
skin = material('Warm skin', (0.55, 0.30, 0.16))
cream = material('Canvas shoes', (0.88, 0.86, 0.67))
lime = material('Citrus deck', (0.7, 0.92, 0.16))
grip = material('Griptape', (0.045, 0.055, 0.042))
steel = material('Trucks', (0.32, 0.36, 0.32))

# Author in the game's Y-up coordinates, then convert to Blender Z-up.
def point(p):
    return Vector((p[0], -p[2], p[1]))

def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def box(name, p, size, mat, bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=point(p))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, mat)

def ball(name, p, scale, mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=point(p))
    obj = bpy.context.object
    obj.scale = (scale[0], scale[2], scale[1])
    return finish(obj, name, mat)

def limb(name, a, b, radius, mat):
    start, end = point(a), point(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=(end-start).length, location=(start+end)/2)
    obj = bpy.context.object
    obj.rotation_euler = (end-start).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, mat)

box('Board.Deck', (0, .16, 0), (.48, .08, 1.58), lime, .07)
box('Board.Grip', (0, .206, 0), (.42, .015, 1.36), grip, .035)
for z in [-.5, .5]:
    limb('Board.Truck', (-.26,.105,z), (.26,.105,z), .035, steel)
    for x in [-.265,.265]:
        limb('Board.Wheel', (x-.035,.085,z), (x+.035,.085,z), .083, cream)
for x,z in [(-.11,.43),(.11,-.4)]:
    box('Rider.Shoe', (x,.285,z), (.32,.14,.29), cream)
    box('Rider.Sole', (x,.224,z), (.34,.025,.31), grip, .01)
limb('Rider.BackShin',(-.11,.35,.43),(-.25,.6,.18),.12,dark)
limb('Rider.BackThigh',(-.25,.6,.18),(-.12,.95,.04),.14,dark)
limb('Rider.FrontShin',(.11,.35,-.4),(.28,.59,-.43),.12,dark)
limb('Rider.FrontThigh',(.28,.59,-.43),(.14,.95,-.02),.14,dark)
box('Rider.Hips',(0,.91,0),(.44,.23,.35),dark,.06)
box('Rider.Hoodie',(0,1.2,-.10),(.61,.48,.39),hoodie,.095)
ball('Rider.Hood',(0,1.43,.025),(.26,.17,.16),hoodie)
limb('Rider.Neck',(0,1.41,-.13),(0,1.52,-.16),.095,skin)
ball('Rider.Head',(0,1.63,-.18),(.19,.23,.18),skin)
ball('Rider.Helmet',(0,1.75,-.16),(.215,.18,.215),cream)
box('Rider.HelmetStripe',(0,1.885,-.17),(.08,.03,.2),hoodie,.008)
box('Rider.Backpack',(0,1.22,.14),(.34,.37,.17),dark,.055)
box('Rider.Patch',(0,1.22,.23),(.1,.1,.02),lime,.005)
limb('Rider.LeftSleeve',(-.27,1.37,-.11),(-.50,1.14,-.05),.105,hoodie)
limb('Rider.LeftArm',(-.50,1.14,-.05),(-.69,1.19,-.18),.075,skin)
ball('Rider.LeftHand',(-.70,1.19,-.19),(.08,.085,.075),skin)
limb('Rider.RightSleeve',(.27,1.36,-.1),(.46,1.12,-.27),.105,hoodie)
limb('Rider.RightArm',(.46,1.12,-.27),(.64,1.19,-.44),.075,skin)
ball('Rider.RightHand',(.64,1.19,-.44),(.08,.085,.075),skin)

# A lightweight rigid-weight skeleton keeps shoes, knees and shoulders articulated.
rider_parts = [o for o in bpy.context.scene.objects if o.name.startswith('Rider.')]
bpy.ops.object.select_all(action='DESELECT')
data = bpy.data.armatures.new('JungleSkeleton')
rig = bpy.data.objects.new('Rider.Rig', data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None):
    b = data.edit_bones.new(name)
    b.head, b.tail = point(head), point(tail)
    if parent:
        b.parent = data.edit_bones[parent]
    return b
bone('Pelvis', (0,.91,0), (0,1.08,-.06))
bone('Torso', (0,1.08,-.06), (0,1.43,-.1), 'Pelvis')
bone('Head', (0,1.43,-.1), (0,1.82,-.16), 'Torso')
bone('UpperArmL', (-.27,1.37,-.11), (-.50,1.14,-.05), 'Torso')
bone('ForearmL', (-.50,1.14,-.05), (-.70,1.19,-.19), 'UpperArmL')
bone('UpperArmR', (.27,1.36,-.1), (.46,1.12,-.27), 'Torso')
bone('ForearmR', (.46,1.12,-.27), (.64,1.19,-.44), 'UpperArmR')
bone('ThighBack', (-.12,.95,.04), (-.25,.6,.18), 'Pelvis')
bone('ShinBack', (-.25,.6,.18), (-.11,.35,.43), 'ThighBack')
bone('FootBack', (-.11,.35,.43), (-.11,.25,.3), 'ShinBack')
bone('ThighFront', (.14,.95,-.02), (.28,.59,-.43), 'Pelvis')
bone('ShinFront', (.28,.59,-.43), (.11,.35,-.4), 'ThighFront')
bone('FootFront', (.11,.35,-.4), (.11,.25,-.5), 'ShinFront')
bpy.ops.object.mode_set(mode='OBJECT')
for obj in rider_parts:
    name = obj.name
    joint = 'Torso'
    if 'Hips' in name: joint = 'Pelvis'
    elif any(n in name for n in ['Head', 'Helmet', 'Neck']): joint = 'Head'
    elif 'LeftSleeve' in name: joint = 'UpperArmL'
    elif 'Left' in name: joint = 'ForearmL'
    elif 'RightSleeve' in name: joint = 'UpperArmR'
    elif 'Right' in name: joint = 'ForearmR'
    elif 'BackThigh' in name: joint = 'ThighBack'
    elif 'BackShin' in name: joint = 'ShinBack'
    elif 'FrontThigh' in name: joint = 'ThighFront'
    elif 'FrontShin' in name: joint = 'ShinFront'
    elif 'Shoe' in name or 'Sole' in name: joint = 'FootBack' if obj.location.y < 0 else 'FootFront'
    weights = obj.vertex_groups.new(name=joint)
    weights.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    mod = obj.modifiers.new('Jungle rig', 'ARMATURE')
    mod.object = rig
    obj.parent = rig
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'jungle-skater.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets'/'jungle-skater.glb'), export_format='GLB', export_cameras=False, export_lights=False)
print('Skater source and GLB exported.')
