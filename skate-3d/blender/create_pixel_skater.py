"""Run with Blender --background --python blender/create_pixel_skater.py."""
import bpy
import math
import random
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
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.94
    rng = random.Random(name)
    image = bpy.data.images.new(name + ' pixels', width=16, height=16)
    pixels = []
    for y in range(16):
        for x in range(16):
            shade = rng.choice([0.78, 0.88, 0.96, 1.0, 1.08])
            pixels.extend([min(1, channel * shade) for channel in color] + [1])
    image.pixels = pixels
    image.pack()
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Closest'
    mat.node_tree.links.new(tex.outputs['Color'], mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return mat

hoodie = material('Petrol cotton shirt', (0.055, 0.35, 0.40))
dark = material('Khaki trousers', (0.51, 0.46, 0.25))
skin = material('Warm skin', (0.84, 0.53, 0.27))
cream = material('Brown shoes', (0.22, 0.17, 0.095))
lime = material('Original orange deck', (1.0, 0.39, 0.035))
grip = material('Griptape', (0.07, 0.085, 0.075))
steel = material('Trucks', (0.38, 0.43, 0.40))
hair = material('Brown hair and beard', (0.23, 0.12, 0.055))
headphones = material('Black headphones', (0.065, 0.067, 0.055))
sole = material('Ochre soles', (0.43, 0.31, 0.12))

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
        mod.segments = 1
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
    box('Rider.BackShoe' if z > 0 else 'Rider.FrontShoe', (x,.285,z), (.32,.14,.29), cream)
    box('Rider.BackSole' if z > 0 else 'Rider.FrontSole', (x,.224,z), (.34,.025,.31), sole, .01)
limb('Rider.BackShin',(-.11,.35,.43),(-.25,.6,.18),.12,dark)
limb('Rider.BackThigh',(-.25,.6,.18),(-.12,.95,.04),.14,dark)
limb('Rider.FrontShin',(.11,.35,-.4),(.28,.59,-.43),.12,dark)
limb('Rider.FrontThigh',(.28,.59,-.43),(.14,.95,-.02),.14,dark)
box('Rider.Hips',(0,.91,0),(.44,.23,.35),dark,.06)
box('Rider.Hoodie',(0,1.2,-.10),(.61,.48,.39),hoodie,.095)
box('Rider.ShirtCollar',(0,1.43,-.16),(.27,.065,.23),hoodie,.01)
limb('Rider.Neck',(0,1.41,-.13),(0,1.52,-.16),.095,skin)
ball('Rider.Head',(0,1.63,-.18),(.19,.23,.18),skin)
# The source sprites define this avatar: beard, headphones, petrol shirt and khakis.
box('Rider.HeadHair',(0,1.81,-.15),(.34,.10,.29),hair,.025)
box('Rider.HeadFringe',(.02,1.79,-.31),(.31,.065,.13),hair,.012)
box('Rider.HeadBeard',(0,1.50,-.24),(.28,.10,.18),hair,.018)
for side in [-1, 1]:
    box('Rider.HeadBeardSide',(side*.16,1.57,-.20),(.055,.16,.17),hair,.01)
    box('Rider.HeadEye',(side*.13,1.68,-.327),(.052,.029,.014),headphones,0)
    box('Rider.HeadBrow',(side*.13,1.713,-.323),(.078,.022,.017),hair,0)
    box('Rider.HeadEarCup',(side*.213,1.67,-.13),(.08,.24,.19),headphones,.025)
    box('Rider.HeadBandSide',(side*.185,1.81,-.12),(.045,.22,.055),headphones,.01)
box('Rider.HeadBandTop',(0,1.90,-.12),(.38,.038,.065),headphones,.01)
box('Rider.HeadNose',(0,1.625,-.367),(.085,.09,.075),skin,.008)
box('Rider.HeadMoustache',(0,1.56,-.354),(.18,.035,.045),hair,.006)
box('Rider.ShirtHem',(0,1.005,-.08),(.49,.04,.37),hoodie,.01)
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
    elif 'Shoe' in name or 'Sole' in name: joint = 'FootBack' if 'Back' in name else 'FootFront'
    weights = obj.vertex_groups.new(name=joint)
    weights.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    mod = obj.modifiers.new('Jungle rig', 'ARMATURE')
    mod.object = rig
    obj.parent = rig
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'pixel-rider.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets'/'pixel-rider.glb'), export_format='GLB', export_cameras=False, export_lights=False)
print('Skater source and GLB exported.')
