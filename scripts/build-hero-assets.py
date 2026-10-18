"""Reproduce the archived first-pass assets. Runtime fine assets use package-hero-fine.mjs."""
import json
import math
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'artifacts/hero-assets/legacy-generated'
OUT.mkdir(parents=True, exist_ok=True)
P = {'o':'17305D','d':'466A9F','p':'F38DB4','q':'CE6C9B','P':'F9DBEA',
     'b':'70B7E8','B':'C9E9FB','t':'83CBD4','T':'C2EBE9','v':'B6A4DE',
     'V':'E3D9F3','w':'F6FAFF','s':'C9D0E0','S':'E2E3EC','n':'9AABC5'}
def rgba(color):
    value=P.get(color,color).lstrip('#')
    return tuple(int(value[i:i+2],16) for i in (0,2,4))+(255,)

class Pixels:
    def __init__(self,w,h):
        self.w,self.h=w,h
        self.p=[(0,0,0,0)]*(w*h)
    def dot(self,x,y,c):
        x,y=round(x),round(y)
        if 0<=x<self.w and 0<=y<self.h:self.p[y*self.w+x]=rgba(c) if isinstance(c,str) else c
    def rect(self,x,y,w,h,c):
        for yy in range(y,y+h):
            for xx in range(x,x+w):self.dot(xx,yy,c)
    def line(self,a,b,c,width=1):
        steps=max(abs(b[0]-a[0]),abs(b[1]-a[1]),1)
        for i in range(int(steps)+1):
            x=round(a[0]+(b[0]-a[0])*i/steps);y=round(a[1]+(b[1]-a[1])*i/steps)
            self.rect(x,y,width,width,c)
    def poly(self,points,c):
        for y in range(self.h):
            for x in range(self.w):
                inside=False
                for i,(ax,ay) in enumerate(points):
                    bx,by=points[i-1]
                    if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:inside=not inside
                if inside:self.dot(x,y,c)
    def ellipse(self,cx,cy,rx,ry,c):
        for y in range(self.h):
            for x in range(self.w):
                if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1:self.dot(x,y,c)
    def outline(self):
        old=self.p[:]
        for y in range(self.h):
            for x in range(self.w):
                if not old[y*self.w+x][3] and any(0<=x+dx<self.w and 0<=y+dy<self.h and old[(y+dy)*self.w+x+dx][3] for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]):self.dot(x,y,'o')
    def paste(self,image,x,y):
        for yy in range(image.h):
            for xx in range(image.w):
                color=image.p[yy*image.w+xx]
                if color[3]:self.dot(x+xx,y+yy,color)
    def save(self,name):
        def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
        raw=b''.join(b'\0'+bytes(channel for pixel in self.p[y*self.w:(y+1)*self.w] for channel in pixel) for y in range(self.h))
        data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
        Path(name).write_bytes(data)

glyphs={'I':['111','010','010','010','111'],'N':['1001','1101','1011','1001','1001'],
        'T':['111','010','010','010','010'],'P':['110','101','110','100','100'],
        'J':['111','001','001','101','010'],'S':['111','100','111','001','111']}
def letters(c,text,x,y,color='o',scale=1):
    for letter in text:
        rows=glyphs[letter]
        for yy,row in enumerate(rows):
            for xx,pixel in enumerate(row):
                if pixel=='1':c.rect(x+xx*scale,y+yy*scale,scale,scale,color)
        x+=(len(rows[0])+1)*scale

assets={}
def add(name,frames,anchor,duration):assets[name]={'images':frames,'anchor':anchor,'duration':duration}
for species,(base,shade,light) in enumerate([('p','q','P'),('b','d','B'),('v','d','V'),('t','d','T')]):
    frames=[]
    for frame in range(3):
        c=Pixels(16,12);tail=frame-1
        if species==0:c.ellipse(9,6,5,4,base);c.poly([(1,3+tail),(6,6),(1,9-tail)],base)
        if species==1:c.ellipse(10,6,4,3,base);c.poly([(1,2+tail),(8,6),(1,10-tail),(3,6)],base)
        if species==2:c.poly([(8,1),(14,6),(8,11),(4,6)],base);c.poly([(1,4+tail),(6,6),(1,8-tail)],base)
        if species==3:c.ellipse(9,6,5,3,base);c.poly([(1,4+tail),(6,6),(1,8-tail)],base);c.rect(7,3,3,1,base)
        c.outline();c.line((6,8),(10,9 if species in [0,2] else 8),shade);c.rect(8,4,3,1,light)
        c.rect(12,5,2,2,'w');c.dot(13,6,'o');c.dot(14,7,shade);c.rect(7,9,2,1,base)
        frames.append(c)
    add(f'fish-{species}',frames,[8,6],143)

for name in ['wave','intp','gpt','claude','react','vue','node','ts','math','controller','geometry','godot']:
    c=Pixels(32,16) if name=='intp' else Pixels(28,28)
    if name=='wave':
        c.poly([(8,24),(5,19),(3,14),(5,12),(8,15),(7,6),(10,5),(11,13),(11,3),(14,3),(14,12),(16,4),(18,5),(17,14),(20,9),(22,10),(20,18),(17,23)],'P');c.outline();c.line((7,18),(10,21),'p');c.rect(10,22,5,1,'p');c.line((2,6),(4,4),'p');c.line((23,5),(25,8),'p')
    elif name=='intp':
        for i,l in enumerate('INTP'):
            c.rect(i*8+1,3,6,10,'P' if i%2==0 else 'B');c.rect(i*8+1,3,6,1,'w');c.rect(i*8+1,12,6,1,'v');letters(c,l,i*8+2,5)
        c.outline()
    elif name=='gpt':
        for i in range(6):
            a=i*math.pi/3
            pts=[(0,-9),(5,-8),(8,-4),(8,1),(4,4),(0,2)]
            pts=[(round(14+x*math.cos(a)-y*math.sin(a)),round(14+x*math.sin(a)+y*math.cos(a))) for x,y in pts]
            for j in range(len(pts)-1):c.line(pts[j],pts[j+1],'t' if i%2 else 'b',2)
        c.outline();c.poly([(14,10),(17,12),(17,16),(14,18),(11,16),(11,12)],'w')
    elif name=='claude':
        for i in range(12):
            a=i*math.pi/6
            c.line((round(13+4*math.cos(a)),round(13+4*math.sin(a))),(round(13+10*math.cos(a)),round(13+10*math.sin(a))),'p',2)
        c.ellipse(14,14,4,4,'p');c.outline();c.rect(12,11,3,2,'P')
    elif name=='react':
        for angle in [0,math.pi/3,-math.pi/3]:
            for n in range(100):
                a=n*math.pi*2/100;x=10*math.cos(a);y=4*math.sin(a)
                c.dot(14+x*math.cos(angle)-y*math.sin(angle),14+x*math.sin(angle)+y*math.cos(angle),'b')
        c.outline();c.ellipse(14,14,2,2,'p')
    elif name=='vue':
        c.poly([(3,5),(9,5),(14,14),(19,5),(25,5),(14,24)],'t');c.outline();c.poly([(9,5),(12,5),(14,9),(16,5),(19,5),(14,14)],'d')
    elif name=='node':
        c.poly([(14,2),(24,8),(24,20),(14,26),(4,20),(4,8)],'t');c.outline();c.poly([(14,5),(21,9),(21,19),(14,23),(7,19),(7,9)],'w');letters(c,'JS',10,11,'d')
    elif name=='ts':
        c.rect(4,4,20,20,'b');c.outline();c.rect(5,5,18,1,'B');c.rect(4,22,20,2,'d');letters(c,'TS',7,11,'w',2)
    elif name=='math':
        c.poly([(5,6),(23,6),(23,10),(19,10),(18,19),(20,19),(20,22),(15,22),(14,19),(15,10),(11,10),(10,21),(6,21),(8,10),(4,10)],'p');c.outline();c.line((6,7),(21,7),'P')
    elif name=='controller':
        c.poly([(5,7),(10,6),(12,8),(17,8),(19,6),(24,8),(26,20),(23,23),(19,19),(9,19),(5,23),(2,21),(3,12)],'P');c.outline();c.rect(4,19,3,2,'v');c.rect(22,18,3,3,'p');c.rect(7,10,2,7,'d');c.rect(5,12,6,2,'d');c.rect(19,10,2,2,'b');c.rect(22,13,2,2,'p');c.rect(17,14,2,2,'t');c.rect(20,17,2,2,'v');c.rect(12,16,2,1,'d');c.rect(15,16,2,1,'d')
    elif name=='geometry':
        c.ellipse(7,8,5,5,'p');c.poly([(19,3),(25,13),(13,13)],'b');c.rect(10,17,10,8,'v');c.outline();c.rect(5,5,3,1,'P');c.rect(12,18,6,1,'V')
    elif name=='godot':
        c.poly([(4,8),(8,8),(8,4),(11,4),(11,7),(17,7),(17,4),(20,4),(20,8),(24,8),(25,11),(23,13),(23,22),(20,25),(8,25),(5,22),(5,13),(3,11)],'b');c.outline();c.rect(7,12,5,5,'w');c.rect(17,12,5,5,'w');c.rect(9,14,2,2,'o');c.rect(18,14,2,2,'o');c.line((8,20),(11,20),'w');c.line((11,20),(11,22),'w');c.line((11,22),(17,22),'w');c.line((17,22),(17,20),'w');c.line((17,20),(20,20),'w');c.rect(6,9,16,1,'B')
    add(name,[c],[c.w//2,c.h//2],0)
    icon=Pixels(40,40);icon.paste(c,20-c.w//2,20-c.h//2);icon.save(OUT/f'{name}.png')

for kind in range(3):
    frames=[]
    for frame in range(3):
        c=Pixels(24,48);delta=[-1,0,1][frame]
        if kind==0:
            for x,height in [(6,28),(12,42),(18,33)]:
                pts=[(x,46),(x-2,36),(x+delta,26),(x-2+delta,46-height)]
                for i in range(3):c.line(pts[i],pts[i+1],'t',2)
                c.line((x,38),(x-4,33),'t',2)
        elif kind==1:
            c.line((12,46),(12+delta,5),'b',2)
            for y in [14,24,34]:
                c.poly([(12,y+8),(5+delta,y),(4+delta,y-4),(9+delta,y),(13,y+5)],'t' if y!=24 else 'v')
                c.poly([(13,y+3),(18+delta,y-3),(21+delta,y-4),(19+delta,y+3),(13,y+8)],'b')
        else:
            c.line((12,46),(11+delta,17),'t',2)
            for x,y in [(7,35),(17,27),(8,18)]:c.ellipse(x+delta,y,5,3,'t' if y!=27 else 'v');c.line((x+delta,y),(12,y+8),'t')
        c.outline();c.rect(10,45,5,2,'n');frames.append(c)
    add(f'plant-{kind}',frames,[12,48],250)
for kind in range(3):
    c=Pixels(24,16);c.poly([(2,14),(4,7),(8,6),(11,2),(17,3),(20,9),(23,11),(22,15)],'n');c.outline();c.poly([(4,11),(7,7),(10,7),(12,3),(16,4),(14,8),(17,10),(10,10),(8,13)],'s');c.rect(8,7,3,1,'S')
    if kind==1:c.rect(15,11,5,3,'d')
    if kind==2:c.rect(4,12,5,2,'v')
    add(f'rock-{kind}',[c],[12,16],0)
for kind in range(2):
    frames=[]
    for frame in range(3):
        c=Pixels(16,16)
        if kind==0:
            c.poly([(3,6-frame),(6,3-frame),(10,3-frame),(14,7-frame),(12,10),(9,13),(6,13),(2,9)],'P');c.outline()
            for x in [4,7,10,12]:c.line((x,5-frame),(8,12),'p')
            c.rect(6,13,5,1,'q')
        else:
            c.ellipse(8,8,6,5,'P');c.outline();c.line((4,8),(8,4),'p');c.line((8,4),(12,8),'p');c.line((12,8),(8,11),'p');c.line((8,11),(6,8),'p');c.rect(7,7,3,2,'p')
        frames.append(c)
    add(f'shell-{kind}',frames,[8,16],300)
sand=Pixels(16,16);sand.rect(0,0,16,16,'S')
for i in range(12):sand.rect((i*7)%16,(i*11)%16,1,1,'s' if i%3 else 'P')
add('sand',[sand],[0,0],0)
cloud=Pixels(64,24);cloud.poly([(2,20),(2,15),(10,15),(10,10),(18,10),(18,5),(31,5),(31,9),(41,9),(41,13),(54,13),(54,16),(62,16),(62,21)],'P');cloud.rect(10,18,44,3,'F5CFE3');add('cloud',[cloud],[32,12],0)
cloud.save(OUT/'cloud.png')
island=Pixels(96,32);island.poly([(0,30),(0,27),(13,27),(13,23),(23,23),(23,17),(31,17),(31,10),(38,10),(38,3),(45,3),(45,10),(53,10),(53,18),(67,18),(67,23),(82,23),(82,27),(96,27),(96,31)],'C3DCF0');island.rect(10,29,76,2,'B');island.save(OUT/'island.png')

atlas=Pixels(512,320);meta={};x=y=row_h=0
for name,a in assets.items():
    meta[name]=[]
    for frame in a['images']:
        if x+frame.w+2>atlas.w:x=0;y+=row_h+2;row_h=0
        atlas.paste(frame,x,y);meta[name].append({'x':x,'y':y,'w':frame.w,'h':frame.h,'anchorX':a['anchor'][0],'anchorY':a['anchor'][1],'duration':a['duration']})
        x+=frame.w+2;row_h=max(row_h,frame.h)
assert y+row_h<atlas.h
assert len([k for k in meta if k.startswith('fish-')])==4
assert all(len(meta[f'fish-{i}'])==3 for i in range(4))
assert all(len(meta[f'plant-{i}'])==3 for i in range(3))
assert all(p[3] in [0,255] for p in atlas.p)
atlas.save(OUT/'sprites.png');
dark=Pixels(atlas.w,atlas.h);dark.p=atlas.p[:]
for frames in meta.values():
    for f in frames:
        for yy in range(f['y'],f['y']+f['h']):
            for xx in range(f['x'],f['x']+f['w']):
                if atlas.p[yy*atlas.w+xx][3]==0 and any(f['x']<=xx+dx<f['x']+f['w'] and f['y']<=yy+dy<f['y']+f['h'] and atlas.p[(yy+dy)*atlas.w+xx+dx]==rgba('o') for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]):dark.dot(xx,yy,'9BB9D8')
dark.save(OUT/'sprites-dark.png');(OUT/'atlas.json').write_text(json.dumps(meta,indent=2)+'\n')

for width,name in [(512,'poster'),(384,'poster-mobile')]:
    c=Pixels(width,288);c.rect(0,0,width,288,'F6F5FC');c.rect(4,260,width-8,24,'S')
    for x in range(4,width-4):
        i=(x-4)*63/(width-8);y=round(32+math.sin(math.pi*i/63)*(1.4*math.sin(i*.43)+.7*math.sin(i*.19)))
        c.rect(x,y,1,260-y,'EAF6FD');c.dot(x,y,'b')
    for i in range(10):
        x=round(24+(i*73)%(width-48)+math.sin(i)*2);y=248-(i*23)%202;size=5 if i%3==0 else 3
        c.rect(x+1,y,size-2,1,'87BDD7');c.rect(x+1,y+size-1,size-2,1,'87BDD7');c.rect(x,y+1,1,size-2,'87BDD7');c.rect(x+size-1,y+1,1,size-2,'87BDD7')
    for x,k in [(17,0),(42,1),(width-19,2)]:c.paste(assets[f'plant-{k}']['images'][1],x-12,212)
    for x,k in [(21,0),(width-30,1),(width-48,2)]:c.paste(assets[f'rock-{k}']['images'][0],x-12,245)
    for i in range(24):
        source=assets[f'fish-{i//6}']['images'][0];size=[.9,1.02,1.12,.96,1.08,1][i%6];fish=Pixels(round(16*size),round(12*size))
        for yy in range(fish.h):
            for xx in range(fish.w):fish.dot(xx,yy,source.p[min(11,int(yy/size))*16+min(15,int(xx/size))])
        c.paste(fish,24+(i*83)%(width-64),52+(i*37)%180)
    c.rect(1,1,width-2,2,'d');c.rect(1,285,width-2,2,'d');c.rect(1,1,2,286,'d');c.rect(width-3,1,2,286,'d');c.save(OUT/f'{name}.png')

# A separate review board displays the exact runtime pixels at integer scale in the browser.
rows=[]
for name,a in assets.items():
    imgs=[]
    for i,frame in enumerate(meta[name]):
        imgs.append(f'<div class="sprite" style="width:{frame["w"]*4}px;height:{frame["h"]*4}px;background-position:-{frame["x"]*4}px -{frame["y"]*4}px"></div>')
    rows.append(f'<article><h2>{name}</h2><div class="frames">'+''.join(imgs)+'</div></article>')
html='''<!doctype html><meta charset="utf-8"><title>Kitee — native pixel asset board</title><style>*{box-sizing:border-box}body{margin:0;padding:40px;background:#e6f2ff;color:#17305d;font:16px system-ui}h1{margin:0}header{margin-bottom:32px}main{display:flex;flex-wrap:wrap;gap:32px}article{padding:16px;background:#f5f8fc;border:1px solid #c4d6e8}h2{font-size:13px;font-weight:600;margin:0 0 16px}.frames{display:flex;align-items:center;gap:16px}.sprite{background-image:url('/img/hero/sprites.png');background-size:2048px 1280px;image-rendering:pixelated}p{max-width:900px;line-height:1.8}</style><header><h1>KITEE / NATIVE PIXEL ASSETS</h1><p>原生像素资产板 · 深蓝单像素轮廓 · 左上高光 · 有限粉蓝调色 · 透明边缘仅 0/255 alpha。鱼 16×12 / 三帧；图标 28×28 以内，INTP 32×16；水草根部固定、三帧。此板展示与运行时完全相同的 PNG 像素。</p></header><main>'''+''.join(rows)+'</main>'
(OUT/'asset-board.html').write_text(html)
print(f'Wrote {sum(len(v) for v in meta.values())} native frames, {len(meta)} assets, transparent atlas, 12 icons and 2 posters')
