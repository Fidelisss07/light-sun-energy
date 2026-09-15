import bpy, math
from mathutils import Vector
from pathlib import Path

root = Path(bpy.data.filepath).parent
scene = bpy.context.scene

# ETAPA 2 — células fotovoltaicas com separações e condutores visíveis.
mat = bpy.data.materials['Photovoltaic glass']
nodes, links = mat.node_tree.nodes, mat.node_tree.links
bsdf = nodes.get('Principled BSDF')
uv = nodes.new('ShaderNodeTexCoord')
split = nodes.new('ShaderNodeSeparateXYZ'); links.new(uv.outputs['UV'], split.inputs[0])
def calc(op, a, b=None):
    n=nodes.new('ShaderNodeMath'); n.operation=op
    if hasattr(a,'node'): links.new(a,n.inputs[0])
    else: n.inputs[0].default_value=a
    if b is not None:
        if hasattr(b,'node'): links.new(b,n.inputs[1])
        else: n.inputs[1].default_value=b
    return n.outputs[0]
x=calc('FRACT',calc('MULTIPLY',split.outputs['X'],6))
y=calc('FRACT',calc('MULTIPLY',split.outputs['Y'],12))
border=calc('MAXIMUM',calc('LESS_THAN',x,.025),calc('LESS_THAN',y,.022))
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.012,.026,.052,1);mix.inputs[2].default_value=(.17,.21,.25,1)
links.new(border,mix.inputs[0]);links.new(mix.outputs[0],bsdf.inputs['Base Color'])
bsdf.inputs['Metallic'].default_value=.12
bsdf.inputs['Roughness'].default_value=.24
bsdf.inputs['Coat Weight'].default_value=.5

# Montagem em 16 segundos: suportes, perfis e módulos independentes.
scene.frame_start=1;scene.frame_end=384;scene.render.fps=24
panels=sorted([o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('Panel_')],key=lambda o:o.name)
for i,obj in enumerate(panels):
    obj.animation_data_clear()
    home=obj.location.copy()
    start=90+i*10
    for frame,height,angle,scale in [(1,4.5,.14,.0001),(start,4.5,.14,.0001),(start+1,4.5,.14,1),(start+34,0,0,1)]:
        obj.location=home+Vector((0,0,height));obj.rotation_euler=(angle,0,0);obj.scale=(scale,)*3
        obj.keyframe_insert('location',frame=frame);obj.keyframe_insert('rotation_euler',frame=frame);obj.keyframe_insert('scale',frame=frame)
    for child in obj.children:
        child.hide_render=True;child.keyframe_insert('hide_render',frame=1)
        child.hide_render=False;child.keyframe_insert('hide_render',frame=start+1)

for i,obj in enumerate([o for o in scene.objects if o.name=='Supports' or o.name.startswith('Rail_')]):
    obj.animation_data_clear()
    start=25 if obj.name=='Supports' else 44+i*5
    obj.scale=(.0001,)*3;obj.keyframe_insert('scale',frame=1);obj.keyframe_insert('scale',frame=start)
    obj.scale=(1,)*3;obj.keyframe_insert('scale',frame=start+20)

# Trajetória contínua: apresentação, aproximação e visão final.
camera=scene.camera;camera.animation_data_clear();camera.data.animation_data_clear()
shots=[(1,(-18,23,19),(-.5,.3,2.5),48),(80,(-16,20,16),(-1,.6,2.8),48),(210,(-11,12,10),(-3.4,1.8,3.3),48),(290,(-10.2,9.2,6.9),(-3.7,1.75,3.35),48),(384,(-17,21,18),(-.5,.3,2.5),48)]
for frame,pos,aim,lens in shots:
    camera.location=pos;target=Vector(aim)
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=lens;camera.data.dof.focus_distance=(target-camera.location).length
    camera.keyframe_insert('location',frame=frame);camera.keyframe_insert('rotation_euler',frame=frame)
    camera.data.keyframe_insert('lens',frame=frame);camera.data.dof.keyframe_insert('focus_distance',frame=frame)
camera.data.dof.aperture_fstop=8
for name,frame in [('01 TELHADO VAZIO',1),('02 ESTRUTURA',45),('03 MODULOS',100),('04 DETALHES',290),('05 INSTALACAO COMPLETA',384)]:
    scene.timeline_markers.new(name,frame=frame)
scene.frame_set(290)
scene.render.resolution_percentage=70
scene.render.filepath=str(root/'cinematic-lighting-preview.png')
for screen in bpy.data.screens:
    for area in screen.areas:
        for space in area.spaces:
            if space.type=='VIEW_3D':
                space.overlay.show_overlays=False
                space.region_3d.view_perspective='CAMERA'
                space.shading.type='MATERIAL'
                space.shading.use_scene_world=True
                space.shading.use_scene_lights=True
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/'light-sun-cinematic.blend'))
print('ETAPA 2 pronta: 384 quadros, montagem dos 14 paineis e movimento de camera.')
