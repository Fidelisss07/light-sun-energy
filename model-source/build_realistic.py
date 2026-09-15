import bpy, math, os, random
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
TEX = ROOT / 'model-source' / 'textures'
OUT = ROOT / 'dist' / 'assets' / 'model'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(18)

def material(name, color, rough=.7, metallic=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metallic
    return m

def pbr(name, asset, tint=(1,1,1), normal_strength=.5):
    m=material(name,tint);n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF')
    for mapname,target in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
        tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(TEX/(asset+'_'+mapname+'.jpg')),check_existing=True)
        tex.image.colorspace_settings.name='sRGB' if mapname=='Diffuse' else 'Non-Color'
        if mapname=='nor_gl':
            normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=normal_strength
            l.new(tex.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],bs.inputs['Normal'])
        else:l.new(tex.outputs['Color'],bs.inputs[target])
    return m

plaster=pbr('Weathered mineral plaster','plastered_wall',normal_strength=.38)
dirt=pbr('Soil of the construction site','brown_mud',normal_strength=.6)
cement=material('Fiber cement roofing',(.64,.65,.60),.8)
trim=material('Anthracite roof flashing',(.095,.11,.115),.46,.3)
concrete=material('Concrete foundation',(.42,.43,.40),.92)
aluminum=material('Brushed aluminum',(.57,.63,.67),.32,.92)
dark=material('Deep window recess',(.021,.025,.026),.75)
glass=material('Window glass',(.08,.125,.14),.16,.55)
wood=material('Natural door',(.24,.17,.105),.76)
black=material('Panel frame anodized aluminum',(.035,.041,.047),.28,.7)
rubber=material('Gaskets and cable insulation',(.014,.016,.019),.83)
tile=material('Concrete walkway',(.5,.5,.47),.95)

def applymat(obj,mat):obj.data.materials.append(mat)
def uv_world(obj,scale=2):
    if obj.type!='MESH':return
    uv=obj.data.uv_layers.new(name='UVMap') if not obj.data.uv_layers else obj.data.uv_layers.active
    for poly in obj.data.polygons:
        normal=poly.normal;axis=max(range(3),key=lambda i:abs(normal[i]));a,b=[i for i in range(3) if i!=axis]
        for li in poly.loop_indices:
            co=obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[a]/scale,co[b]/scale)
def cube(name,loc,size,mat,bevel=0,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    applymat(o,mat);uv_world(o)
    if bevel:
        mod=o.modifiers.new('Soft real-world edges','BEVEL');mod.width=bevel;mod.segments=2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if parent:o.parent=parent
    return o
def cylinder(name,loc,radius,depth,mat,parent=None,rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;applymat(o,mat)
    if rotation:o.rotation_euler=rotation
    if parent:o.parent=parent
    return o
def empty(name):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o

# Full-size ground, not a presentation plinth.
cube('Construction ground',(0,0,-.13),(34,26,.22),dirt)
cube('Road',(-12,0,-.035),(5,26,.09),concrete)
for y in range(-12,13,2):cube('Sidewalk slab',(-8.5,y,.03),(1.8,1.94,.13),tile,.025)
cube('Foundation',(0,0,.13),(15.9,9.9,.26),concrete,.025)
cube('Floor slab',(0,0,.32),(15.75,9.75,.19),plaster,.015)
# Front wall with real openings and depth, assembled from solid wall segments.
openings=[(-3.9,-2.8,.36,2.52),(2.85,4.1,.36,2.58),(5.1,6.25,1.42,2.46)]
xs=sorted(set([-7.9,7.9]+[v for a,b,c,d in openings for v in (a,b)]))
zs=sorted(set([.36,2.95]+[v for a,b,c,d in openings for v in (c,d)]))
for x1,x2 in zip(xs,xs[1:]):
 for z1,z2 in zip(zs,zs[1:]):
    mx,mz=(x1+x2)/2,(z1+z2)/2
    if any(a<mx<b and c<mz<d for a,b,c,d in openings):continue
    cube('Facade',(mx,4.78,mz),(x2-x1,.28,z2-z1),plaster,.008)
for x in (-7.77,7.77):cube('Side wall',(x,0,1.65),(.26,9.55,2.6),plaster,.015)
cube('Rear wall',(0,-4.78,1.65),(15.8,.26,2.6),plaster,.015)
cube('Internal ceiling',(0,0,2.76),(15.5,9.5,.1),dark)
for a,b,c,d in openings:
    x=(a+b)/2;z=(c+d)/2;w=b-a;h=d-c
    cube('Recessed opening',(x,4.48,z),(w,.035,h),dark)
    # Frames set back into the plaster reveals.
    for fx in (a+.055,b-.055):cube('Metal window jamb',(fx,4.56,z),(.055,.08,h),trim,.008)
    for fz in (c+.025,d-.025):cube('Metal window head',(x,4.56,fz),(w,.08,.05),trim,.006)
    if c>1:
        cube('Recessed glass',(x,4.55,z),(w-.12,.025,h-.12),glass,.006)
        cube('Window mullion',(x,4.585,z),(.045,.035,h),aluminum,.004)
        cube('Projecting window sill',(x,4.96,c-.025),(w+.15,.44,.065),trim,.012)
    else:
        cube('Dark doorway inner wall',(x,4.23,z),(w,.12,h),dark)
        cube('Door threshold',(x,4.85,c-.015),(w+.06,.45,.065),concrete,.008)

cube('Roof deck',(0,0,2.93),(15.55,9.55,.18),concrete)
def corrugated(name,width,depth,x,y,z):
    # Real sinusoidal roofing profile with overlapping panels.
    verts=[];faces=[];pitch=.18;segments=int(width/pitch)*10
    for i in range(segments+1):
        xx=-width/2+width*i/segments
        zz=.035*math.cos(xx/pitch*math.tau)
        verts.extend([(xx,-depth/2,zz),(xx,depth/2,zz-.035)])
    for i in range(segments):faces.append((2*i,2*i+2,2*i+3,2*i+1))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=(x,y,z)
    applymat(obj,cement);uv_world(obj,3)
    for poly in mesh.polygons:poly.use_smooth=True
    solid=obj.modifiers.new('Roof sheet thickness','SOLIDIFY');solid.thickness=.018
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=solid.name)
    return obj
corrugated('Corrugated fiber cement',15.5,9.5,0,0,3.045)
def parapet(w,d,x,y,z,height):
    for sx,sy,px,py in [(w+.2,.2,x,y-d/2),(w+.2,.2,x,y+d/2),(.2,d,x-w/2,y),(.2,d,x+w/2,y)]:
        cube('Plaster parapet',(px,py,z),(sx,sy,height),plaster,.012)
        cube('Metal parapet cap',(px,py,z+height/2+.016),(sx+.08,sy+.08,.052),trim,.012)
parapet(15.8,9.8,0,0,3.18,.48)
# Service volume and its recessed corrugated cover, matching the reference.
cube('Raised roof volume',(3.7,-1.2,3.57),(4.65,5.05,1.15),plaster,.025)
corrugated('Raised volume roof',4.4,4.8,3.7,-1.2,4.17)
parapet(4.65,5.05,3.7,-1.2,4.29,.4)
# Ridge seams and screw fixings, with realistic millimeter-scale hardware.
for y in (-3.2,0,3.2):
    for x in np.arange(-7.3,7.4,.72):
        if 1.25<x<6.1 and -3.8<y<1.4:continue
        cylinder('Roof screw',(float(x),y,3.084),.022,.025,aluminum)
for x in (-7.55,7.55):
    cylinder('Rainwater pipe',(x,4.66,1.58),.065,2.85,trim)
    cylinder('Pipe elbow',(x,4.49,2.97),.065,.36,trim,rotation=(math.pi/2,0,0))
cube('Chimney base',(7.03,-2.5,3.1),(.55,.55,.07),aluminum,.012)
cylinder('Chimney',(7.03,-2.5,3.43),.105,.62,trim)
cylinder('Chimney rim',(7.03,-2.5,3.75),.13,.055,trim)
for y in np.arange(-3.3,3.8,.47):cube('Site paver',(-8.05,float(y),.1),(.45,.40,.08),tile,.008)

# Texture of the photovoltaic cells, including bus bars and fine conductors.
size=512;pixels=np.ones((size,size,4),dtype=np.float32)
pixels[:,:,:3]=(.018,.039,.073)
for row in range(12):
 for col in range(6):
    x0=int(col*size/6)+2;x1=int((col+1)*size/6)-2;y0=int(row*size/12)+1;y1=int((row+1)*size/12)-1
    tint=random.uniform(.94,1.06);pixels[y0:y1,x0:x1,:3]=np.array((.027,.067,.126))*tint
    for i in range(1,4):
        xx=int(x0+(x1-x0)*i/4);pixels[y0:y1,xx:xx+1,:3]=(.30,.36,.42)
    for i in range(1,8):
        yy=int(y0+(y1-y0)*i/8);pixels[yy:yy+1,x0:x1,:3]=(.065,.10,.15)
im=bpy.data.images.new('PV monocrystalline cell grid',size,size,alpha=True)
im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(TEX/'solar_cells.png');im.file_format='PNG';im.save()
pv=material('Photovoltaic glass',(.04,.07,.12),.22,.35)
n=pv.node_tree.nodes;l=pv.node_tree.links;bs=n.get('Principled BSDF');tex=n.new('ShaderNodeTexImage');tex.image=im;l.new(tex.outputs['Color'],bs.inputs['Base Color'])
bs.inputs['Coat Weight'].default_value=.45;bs.inputs['Coat Roughness'].default_value=.16

supports=empty('Supports')
for row,z in enumerate((.85,2.87)):
 for offset in (-.62,.62):
    rail=empty('Rail_'+str(row*2+int(offset>0)))
    cube('Mounting rail',(-3.75,z+offset,3.205),(7.48,.075,.09),aluminum,.008,parent=rail)
    cube('Rail channel',(-3.75,z+offset,3.255),(7.44,.034,.017),trim,.002,parent=rail)
    for x in (-6.7,-4.75,-2.8,-.85):
        cube('Roof bracket',(x,z+offset,3.14),(.18,.18,.16),aluminum,.009,parent=supports)
        cylinder('Bracket bolt',(x,z+offset,3.235),.022,.025,trim,parent=supports)

for row,y in enumerate((.85,2.87)):
 for col in range(7):
    index=row*7+col;group=empty('Panel_'+str(index).zfill(2));group.location=(-6.93+col*1.06,y,3.30)
    # Local coordinates inside independently animated panel group.
    cube('Backsheet',(0,0,-.025),(1,.06,1),rubber) if False else None
    cube('Panel rear',(0,0,-.015),(1,1.94,.048),rubber,.005,parent=group)
    for x in (-.493,.493):cube('Aluminum long frame',(x,0,0),(.025,1.96,.065),aluminum,.004,parent=group)
    for yedge in (-.967,.967):cube('Aluminum short frame',(0,yedge,0),(1.01,.025,.065),aluminum,.004,parent=group)
    # Plane UVs follow the cell texture once across each module.
    bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,.024));o=bpy.context.object;o.name='PV glass';o.scale=(.479,.947,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);applymat(o,pv);o.parent=group
    cube('Junction box',(0,.5,-.065),(.19,.16,.065),rubber,.014,parent=group)
    for x in (-.493,.493):
     for yclamp in (-.60,.60):
        cube('Module clamp',(x,yclamp,.049),(.064,.058,.031),aluminum,.005,parent=group)
        cylinder('Clamp screw',(x,yclamp,.071),.012,.018,trim,parent=group)

# Merge the static architecture to reduce browser draw calls, preserving materials and UVs.
static=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent is None]
bpy.ops.object.select_all(action='DESELECT')
for o in static:o.select_set(True)
bpy.context.view_layer.objects.active=static[0];bpy.ops.object.join();bpy.context.object.name='Architecture'
# Merge each panel's parts into one mesh with named parent kept for timeline control.
for group in [o for o in bpy.context.scene.objects if o.type=='EMPTY']:
    children=[o for o in group.children if o.type=='MESH']
    if len(children)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in children:o.select_set(True)
        bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join()

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'residential.glb'),export_format='GLB',export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
# Keep a fully editable Blender source, plus a physically lit validation render.
world=bpy.data.worlds.new('Outdoor daylight');bpy.context.scene.world=world;world.use_nodes=True
nodes=world.node_tree.nodes;links=world.node_tree.links;env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(OUT/'daylight.hdr'));links.new(env.outputs['Color'],nodes['Background'].inputs['Color']);nodes['Background'].inputs['Strength'].default_value=.7
bpy.ops.object.light_add(type='SUN',location=(-10,10,18));bpy.context.object.rotation_euler=(.4,-.55,-.5);bpy.context.object.data.energy=2.2;bpy.context.object.data.angle=.06
bpy.ops.object.camera_add(location=(14,22,20));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,2.2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=48;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
    for device in prefs.devices:device.use=device.type=='OPTIX'
    scene.cycles.device='GPU'
except Exception as e:print('CPU rendering fallback',e)
scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'model-source'/'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'model-source'/'light-sun-residential.blend'))
bpy.ops.render.render(write_still=True)
print('MODEL_READY',OUT/'residential.glb')
