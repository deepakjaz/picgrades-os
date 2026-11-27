# Builds the canvas versions of the 6 story templates (step 99b). Each keeps its template's colours, fonts,
# signature decoration and motion; phone (390 wide) and laptop (1200 wide) placed separately.
import json
n=[0]
def E(t, p, l, s=None, sl=None, **kw):
    n[0]+=1; e={'id':'%s%d'%(kw.pop('pre','e'),n[0]),'t':t,'p':dict(zip('xywhz',p)),'l':dict(zip('xywhz',l))}
    if s: e['s']=s
    if sl: e['sl']=sl
    e.update(kw); return e
art=lambda id_,p,l,**kw: E('art',p,l,src={'k':'art','id':id_,'o':'decor'},**kw)
def sec(id_, hp, hl, els, bg=None, **kw):
    s={'id':id_,'h':{'p':hp,'l':hl},'els':els}
    if bg: s['bg']=bg
    s.update(kw); return s
def doc(name, C, head, sections): return {'v':1,'name':name,'colors':C,'fonts':{'head':head,'body':'Jost'},'sections':sections}
def btn(act, p, l, s, **kw): return E('action', p, l, s, act=act, **kw)
def common_tail(C, head, pre, bless_bg, card_bg, btn_s, btn2_s, notes_title, create_title, create_note, quote_style):
    # "Make something" + blessings + credit — every template keeps the app's three creative tools and the guests' words
    make = sec(pre+'-make', 420, 360, [
        E('shape',(20,30,350,350,0),(100,40,1000,280,0),{'bg':card_bg,'radius':26,'shadow':1}),
        E('text',(40,56,310,44,1),(140,74,480,52,1),{'font':head,'size':32,'color':C['ink']},{'size':40},text=create_title,m='rise'),
        E('text',(40,102,310,40,1),(140,130,460,44,1),{'size':13,'opacity':0.72,'lh':1.45,'color':C['ink']},text=create_note),
        btn('reel',(40,160,310,52,2),(680,70,380,56,2),btn_s,m='rise'),
        btn('post',(40,224,310,52,2),(680,140,380,56,2),btn2_s,m='rise',mo={'d':120}),
        btn('memory',(40,288,310,52,2),(680,210,380,56,2),btn2_s,m='rise',mo={'d':240})])
    words = sec(pre+'-words', 380, 330, [
        E('text',(24,34,342,46,1),(200,40,800,54,1),{'font':head,'size':34,'align':'center','color':C['ink']},{'size':42},text=notes_title,m='fade'),
        E('blessings',(32,96,326,150,1),(260,110,680,130,1),quote_style,m='fade'),
        btn('notes',(105,262,180,46,2),(510,250,180,48,2),btn2_s),
        E('credit',(24,330,342,24,1),(300,300,600,24,1),{'size':11,'ls':0.2,'upper':True,'align':'center','opacity':0.65,'color':C['ink']})], bg={'c':bless_bg})
    return [make, words]

OUT=[]
# ---------- C3 · Cloud Pages (mountain destination): clouds over a valley, mountains, story pages ----------
C={'bg':'#EEF0EB','ink':'#1E3A2C','acc':'#C9A36B','acc2':'#5D6C70','card':'#FFFFFF'}; H='Instrument Serif'
pill={'bg':'#1E3A2C','color':'#EEF0EB','radius':26,'size':15,'weight':500}; pill2={'border':1,'bcolor':'#1E3A2C','color':'#1E3A2C','radius':26,'size':15,'weight':500}
hero=sec('c3-sky',844,780,[
  art('dc-mountains-far',(-205,440,800,267,1),(0,330,1200,400,1)),
  E('photo',(30,505,330,300,2),(330,350,540,360,2),{'radius':18,'fy':30},src={'k':'cover','n':0},m='rise',mo={'t':1400}),
  art('dc-mountains-near',(-255,640,900,285,3),(0,560,1200,380,3)),
  art('dc-cloud',(-50,96,230,130,4),(40,60,340,192,4),m='float'),
  art('dc-cloud-soft',(210,170,230,130,4),(820,120,360,203,4),m='float',mo={'d':800}),
  art('dc-cloud',(240,400,200,113,4),(930,330,260,147,4),m='float',mo={'d':400}),
  E('names',(0,190,390,120,5),(200,150,800,120,5),{'font':H,'size':56,'align':'center','color':'#1E3A2C','lh':1.0},{'size':84},m='rise',mo={'t':1300}),
  E('date',(0,312,390,24,5),(200,276,800,28,5),{'size':12,'ls':0.3,'upper':True,'align':'center','color':'#5D6C70'},m='fade',mo={'d':500}),
  btn('findme',(125,770,140,46,6),(520,700,160,48,6),{'bg':'#EEF0EB','color':'#1E3A2C','radius':23,'size':14,'weight':600})],
  bg={'c':'#DCE6EA'})
pages=sec('c3-pages',560,560,[
  E('text',(24,30,342,22,1),(100,40,600,24,1),{'size':11,'ls':0.3,'upper':True,'color':'#C9A36B'},text='Story pages'),
  E('text',(24,54,342,44,1),(100,66,700,54,1),{'font':H,'size':36,'color':'#1E3A2C'},{'size':46},text='Our days, page by page',m='rise'),
  E('events',(24,116,366,400,1),(100,140,1000,380,1),{'radius':18,'size':16,'weight':500,'color':'#1E3A2C'},v='row',per={'p':1.4,'l':3.6},m='rise')])
glance=sec('c3-glance',360,360,[E('strip',(0,40,390,280,1),(0,40,1200,280,1),{'radius':14})],bg={'c':'#DCE6EA'})
OUT.append(('canvas-cloud-pages','Cloud Pages (editor)','tpl-c3',doc('Cloud Pages (editor)',C,H,[hero,pages,glance]+common_tail(C,H,'c3','#EEF0EB','#FFFFFF',pill,pill2,'Words for us','Make something','From this wedding — for the guests and the couple.',{'font':H,'size':22,'italic':True,'align':'center','lh':1.35,'color':'#1E3A2C'}))))

# ---------- C4 · Haldi Splash (farmhouse day wedding): colour drops, a photo in a splash ----------
C={'bg':'#F3EEE3','ink':'#2E2A22','acc':'#C0643B','acc2':'#55623A','card':'#FFFFFF'}; H='Parisienne'
pill={'bg':'#55623A','color':'#F3EEE3','radius':26,'size':15,'weight':500}; pill2={'border':1,'bcolor':'#C0643B','color':'#C0643B','radius':26,'size':15,'weight':500}
hero=sec('c4-splash',844,780,[
  art('dc-drop-yellow',(14,150,70,70,1),(80,120,110,110,1),m='pulse'),
  art('dc-drop-pink',(300,210,52,52,1),(1040,170,90,90,1),m='pulse',mo={'d':600}),
  art('dc-drop-green',(40,600,46,46,1),(620,640,70,70,1),m='pulse',mo={'d':300}),
  art('dc-drop-yellow',(310,640,60,60,1),(1080,600,80,80,1),m='float'),
  art('dc-splash-ring',(30,175,330,330,2),(110,110,520,520,2),m='spin-slow'),
  E('photo',(55,200,280,280,3),(150,150,440,440,3),{'shape':'circle','fy':30},src={'k':'cover','n':0},m='grow',mo={'t':1200,'str':80}),
  E('names',(10,520,370,96,4),(680,270,460,140,4),{'font':H,'size':52,'align':'center','color':'#C0643B','lh':1.05},{'size':84,'align':'left'},m='rise'),
  E('date',(10,622,370,24,4),(680,420,460,28,4),{'size':12,'ls':0.3,'upper':True,'align':'center','color':'#55623A'},{'align':'left'},m='fade',mo={'d':400}),
  btn('findme',(120,680,150,46,5),(680,480,170,48,5),{'bg':'#C0643B','color':'#ffffff','radius':23,'size':14,'weight':600},m='bounce',mo={'d':600})])
evs=sec('c4-events',420,440,[
  E('text',(24,30,342,56,1),(100,40,700,70,1),{'font':H,'size':40,'color':'#C0643B'},{'size':52},text='The celebrations',m='rise'),
  E('events',(24,110,366,190,1),(100,140,1000,250,1),{'size':14,'weight':500,'color':'#2E2A22'},v='circles',per={'p':3.1,'l':6},m='rise')],bg={'c':'#FBF4DF'})
pair=sec('c4-pair',470,520,[
  E('photo',(24,30,200,280,1),(100,40,500,420,1),{'radius':120,'fy':30},src={'k':'hl','n':0},m='left'),
  E('photo',(190,170,176,240,2),(640,100,460,380,2),{'radius':16,'fy':30},src={'k':'hl','n':1},m='right',mo={'d':200}),
  art('dc-drop-pink',(20,380,56,56,3),(560,420,80,80,3),m='pulse')])
OUT.append(('canvas-haldi-splash','Haldi Splash (editor)','tpl-c4',doc('Haldi Splash (editor)',C,H,[hero,evs,pair]+common_tail(C,H,'c4','#FBF4DF','#FFFFFF',pill,pill2,'Blessings','Make something','Turn the day into a reel, a post or a little film.',{'font':'Cormorant Garamond','size':22,'italic':True,'align':'center','lh':1.35,'color':'#2E2A22'}))))

# ---------- C5 · Cinema Chapters (ballroom / reception night): spotlight, gold dust, iris, chapters ----------
C={'bg':'#0F0E0D','ink':'#F4EDE2','acc':'#D8C197','acc2':'#C98B7A','card':'#1C1A18'}; H='Bodoni Moda'
pill={'bg':'#D8C197','color':'#0F0E0D','radius':4,'size':14,'weight':600}; pill2={'border':1,'bcolor':'#D8C197','color':'#D8C197','radius':4,'size':14,'weight':500}
hero=sec('c5-screen',844,780,[
  art('dc-gold-dust',(0,0,390,844,1),(0,0,1200,780,1),m='breathe'),
  art('dc-gold-glow',(-5,190,400,400,1),(350,40,500,500,1),m='breathe',mo={'d':500}),
  E('photo',(45,230,300,300,2),(400,90,400,400,2),{'shape':'circle','fy':30},src={'k':'cover','n':0},m='iris',mo={'t':1600}),
  art('dc-iris-ring',(35,220,320,320,3),(388,78,424,424,3),m='spin-slow'),
  E('text',(0,560,390,22,4),(200,520,800,24,4),{'size':11,'ls':0.4,'upper':True,'align':'center','color':'#D8C197'},text='A film in chapters',m='fade',mo={'d':800}),
  E('names',(10,590,370,80,4),(200,548,800,90,4),{'font':H,'size':34,'upper':True,'ls':0.14,'align':'center','color':'#F4EDE2'},{'size':52},m='fade',mo={'d':1000,'t':1400}),
  E('date',(10,672,370,24,4),(200,644,800,28,4),{'size':12,'ls':0.3,'upper':True,'align':'center','color':'#C98B7A'},m='fade',mo={'d':1200}),
  btn('findme',(125,736,140,46,5),(520,700,160,48,5),{'border':1,'bcolor':'#D8C197','color':'#D8C197','radius':4,'size':14,'weight':500})],bg={'c':'#000000'})
chap=sec('c5-chapters',560,520,[
  E('text',(24,40,342,22,1),(100,50,500,24,1),{'size':11,'ls':0.4,'upper':True,'color':'#D8C197'},text='Chapters'),
  E('text',(24,66,342,90,1),(100,78,500,110,1),{'font':H,'size':34,'italic':True,'color':'#F4EDE2','lh':1.15},{'size':42},text='The evening, scene by scene',m='rise'),
  E('events',(24,170,342,360,1),(640,50,460,420,1),{'font':H,'size':22,'color':'#F4EDE2'},v='list',m='fade'),
  E('photo',(0,0,0,0,0),(100,210,480,280,1),{'radius':4,'fy':30},src={'k':'hl','n':0},m='rise',p_hide=True)])
chap['els'][-1]['p']['hide']=True; chap['els'][-1]['p'].update({'x':24,'y':0,'w':100,'h':60}); del chap['els'][-1]['p_hide']
glance=sec('c5-reel',340,360,[E('strip',(0,30,390,280,1),(0,40,1200,280,1),{'radius':4})],bg={'c':'#000000'})
OUT.append(('canvas-cinema-chapters','Cinema Chapters (editor)','tpl-c5',doc('Cinema Chapters (editor)',C,H,[hero,chap,glance]+common_tail(C,H,'c5','#0F0E0D','#1C1A18',pill,pill2,'Words from the audience','Make something','A reel to the beat, a post, or a little film.',{'font':'Cormorant Garamond','size':22,'italic':True,'align':'center','lh':1.35,'color':'#F4EDE2'}))))

# ---------- G1 · Heritage Courtyard · Dusk (haveli evening): keyhole arch, jaali, plumb line, dusk ----------
C={'bg':'#F6F2EC','ink':'#1E1B18','acc':'#B8925A','acc2':'#7A5A32','card':'#EFE8DC'}; H='Cormorant Garamond'
pill={'bg':'#171C26','color':'#F9F7F3','radius':2,'size':14,'weight':500}; pill2={'border':1,'bcolor':'#B8925A','color':'#B8925A','radius':2,'size':14,'weight':500}
hero=sec('g1-arch',844,780,[
  art('dc-lattice',(35,70,320,96,1),(600,130,320,96,1),m='fade'),
  E('text',(0,190,390,22,2),(600,250,500,24,2),{'size':11,'ls':0.35,'upper':True,'align':'center','color':'#B8925A'},{'align':'left'},text='An evening at the haveli'),
  E('names',(10,214,370,70,2),(600,282,520,140,2),{'font':H,'size':44,'italic':True,'align':'center','color':'#1E1B18','lh':1.05},{'size':72,'align':'left'},m='rise'),
  E('date',(10,286,370,24,2),(600,430,500,28,2),{'size':12,'ls':0.3,'upper':True,'align':'center','color':'#7A5A32'},{'align':'left'},m='fade'),
  art('dc-keyhole-arch',(65,330,260,399,2),(110,150,380,583,2),m='unfold',mo={'t':1500}),
  E('photo',(87,365,216,354,1),(142,200,316,522,1),{'shape':'arch','radius':2,'fy':30},src={'k':'cover','n':0},m='reveal',mo={'d':300,'t':1400}),
  E('shape',(194,730,2,70,2),(600,500,2,120,2),{'bg':'#B8925A'},m='shutters',mo={'d':600}),
  btn('findme',(125,770,140,46,3),(600,640,170,48,3),{'bg':'#171C26','color':'#F9F7F3','radius':2,'size':14,'weight':500})])
evs=sec('g1-courtyard',520,520,[
  E('text',(24,40,342,22,1),(100,50,500,24,1),{'size':11,'ls':0.35,'upper':True,'color':'#B8925A'},text='The celebrations'),
  E('text',(24,64,342,50,1),(100,78,700,60,1),{'font':H,'size':38,'italic':True,'color':'#1E1B18'},{'size':48},text='Courtyard by courtyard',m='rise'),
  E('events',(24,136,366,340,1),(100,160,1000,320,1),{'radius':0,'size':15,'color':'#1E1B18'},v='row',per={'p':2.1,'l':4},m='rise')])
dusk=sec('g1-dusk',420,440,[
  E('photo',(24,40,342,340,1),(100,50,1000,340,1),{'radius':2,'fy':30},src={'k':'hl','n':0},m='fade',mo={'t':1400,'p':0.12}),
  art('dc-lattice',(110,340,170,51,2),(500,360,200,60,2))],bg={'c':'#171C26'})
tail=common_tail(C,H,'g1','#171C26','#EFE8DC',pill,pill2,'Blessings by lamplight','Make something','A reel, a post, or a little film — from this evening.',{'font':H,'size':22,'italic':True,'align':'center','lh':1.35,'color':'#F9F7F3'})
for e in tail[1]['els']:
    if e['t'] in ('text','credit'): e['s']['color']='#F9F7F3'
tail[1]['els'][2]['s']={'border':1,'bcolor':'#CFA86E','color':'#CFA86E','radius':2,'size':14,'weight':500}
OUT.append(('canvas-heritage-courtyard','Heritage Courtyard (editor)','tpl-g1',doc('Heritage Courtyard (editor)',C,H,[hero,evs,dusk]+tail)))

# ---------- G2 · Misty Tea Estate · Morning (hills & estate): mist, tea hills, terrace path, floating dock ----------
C={'bg':'#F4F6F2','ink':'#18261E','acc':'#4B6B56','acc2':'#8C9E90','card':'#E8EDE6'}; H='Instrument Serif'
pill={'bg':'#18261E','color':'#F4F6F2','radius':26,'size':15,'weight':500}; pill2={'border':1,'bcolor':'#4B6B56','color':'#4B6B56','radius':26,'size':15,'weight':500}
hero=sec('g2-mist',844,780,[
  art('dc-mist',(-250,120,520,260,3),(-200,80,800,400,3),m='glide',mo={'dir':'right','t':2200,'str':60}),
  art('dc-mist',(130,330,520,260,3),(620,300,800,400,3),m='glide',mo={'dir':'left','t':2200,'str':60,'d':200}),
  E('names',(10,560,370,110,4),(100,470,700,130,4),{'font':H,'size':54,'align':'center','color':'#ffffff','lh':1.0},{'size':84,'align':'left'},m='fade',mo={'t':1600}),
  E('date',(10,672,370,24,4),(100,604,600,28,4),{'size':12,'ls':0.3,'upper':True,'align':'center','color':'#E8EDE6'},{'align':'left'},m='fade',mo={'d':500}),
  art('dc-tea-hills',(-205,690,800,240,2),(0,560,1200,360,2)),
  btn('findme',(125,770,140,46,5),(100,660,170,48,5),{'bg':'#F4F6F2','color':'#18261E','radius':23,'size':14,'weight':600})],
  bg={'c':'#cfd8d0','src':{'k':'cover','n':0},'dim':0.22,'fy':30})
path=sec('g2-terrace',500,520,[
  E('text',(24,40,342,22,1),(100,50,500,24,1),{'size':11,'ls':0.35,'upper':True,'color':'#4B6B56'},text='The terrace path'),
  E('text',(24,64,342,50,1),(100,78,700,60,1),{'font':H,'size':38,'color':'#18261E'},{'size':48},text='Along the hills',m='rise'),
  E('events',(24,134,366,320,1),(100,160,1100,320,1),{'radius':6,'size':15,'color':'#18261E'},v='row',per={'p':1.6,'l':3.4},m='glide',mo={'dir':'right'})],bg={'c':'#F4F6F2'})
glance=sec('g2-glance',340,360,[E('strip',(0,30,390,280,1),(0,40,1200,280,1),{'radius':6})],bg={'c':'#E8EDE6'})
OUT.append(('canvas-misty-tea','Misty Tea Estate (editor)','tpl-g2',doc('Misty Tea Estate (editor)',C,H,[hero,path,glance]+common_tail(C,H,'g2','#F4F6F2','#E8EDE6',pill,pill2,'Words in the mist','Make something','A reel, a post, or a little film — slow and calm.',{'font':H,'size':22,'italic':True,'align':'center','lh':1.35,'color':'#18261E'}))))

# ---------- G3 · Alabaster Gallery · Minimal Luxury (modern banquet): museum mat, plates index, black bar ----------
C={'bg':'#FAF9F6','ink':'#141413','acc':'#8E795E','acc2':'#C5B8A5','card':'#F1EFEA'}; H='Bodoni Moda'
pill={'bg':'#141413','color':'#FAF9F6','radius':0,'size':13,'weight':500,'upper':True,'ls':0.12}; pill2={'border':1,'bcolor':'#141413','color':'#141413','radius':0,'size':13,'weight':500,'upper':True,'ls':0.12}
hero=sec('g3-gallery',844,780,[
  E('text',(24,90,342,22,1),(640,200,480,24,1),{'size':10,'ls':0.4,'upper':True,'align':'center','color':'#8E795E'},{'align':'left'},text='Monograph'),
  E('names',(10,114,370,64,1),(640,228,500,150,1),{'font':H,'size':38,'upper':True,'ls':0.1,'align':'center','color':'#141413','lh':1.05},{'size':60,'align':'left'},m='fade',mo={'t':1400}),
  E('date',(10,180,370,24,1),(640,386,480,28,1),{'size':11,'ls':0.3,'upper':True,'align':'center','color':'#8E795E'},{'align':'left'},m='fade',mo={'d':400}),
  art('dc-hairline-frame',(45,230,300,390,2),(110,90,460,598,2),m='reveal'),
  E('photo',(65,256,260,338,1),(140,128,400,522,1),{'radius':0,'fy':30},src={'k':'cover','n':0},m='zoom-out',mo={'t':1600,'str':40}),
  E('shape',(170,650,50,1,1),(640,440,80,1,1),{'bg':'#8E795E'},m='wipe'),
  btn('findme',(115,690,160,46,3),(640,480,180,48,3),{'bg':'#141413','color':'#FAF9F6','radius':0,'size':13,'weight':500,'upper':True,'ls':0.12})])
plates=sec('g3-plates',540,520,[
  E('text',(24,40,342,22,1),(100,50,500,24,1),{'size':10,'ls':0.4,'upper':True,'color':'#8E795E'},text='Plates'),
  E('text',(24,64,342,50,1),(100,78,460,60,1),{'font':H,'size':34,'color':'#141413'},{'size':42},text='Index of the day',m='fade'),
  E('events',(24,136,342,360,1),(100,160,460,320,1),{'font':H,'size':20,'color':'#141413'},v='list',m='fade'),
  E('photo',(0,0,0,0,0),(640,60,460,420,1),{'radius':0,'fy':30},src={'k':'hl','n':0},m='fade')],bg={'c':'#F1EFEA'})
plates['els'][-1]['p']={'x':24,'y':0,'w':100,'h':60,'z':0,'hide':True}
bar=sec('g3-bar',300,260,[
  E('shape',(0,40,390,220,0),(100,40,1000,180,0),{'bg':'#141413'}),
  E('text',(24,64,342,40,1),(140,70,400,44,1),{'font':H,'size':26,'color':'#FAF9F6'},{'size':30},text='Make something'),
  btn('reel',(24,120,342,40,2),(560,64,200,48,2),{'border':1,'bcolor':'#FAF9F6','color':'#FAF9F6','radius':0,'size':12,'weight':500,'upper':True,'ls':0.12}),
  btn('post',(24,168,165,40,2),(780,64,140,48,2),{'border':1,'bcolor':'#FAF9F6','color':'#FAF9F6','radius':0,'size':12,'weight':500,'upper':True,'ls':0.12},v='text'),
  btn('memory',(201,168,165,40,2),(940,64,140,48,2),{'border':1,'bcolor':'#FAF9F6','color':'#FAF9F6','radius':0,'size':12,'weight':500,'upper':True,'ls':0.12},v='text')])
tail=common_tail(C,H,'g3','#FAF9F6','#F1EFEA',pill,pill2,'Notes from the guests','Make something','',{'font':H,'size':20,'italic':True,'align':'center','lh':1.4,'color':'#141413'})
OUT.append(('canvas-alabaster','Alabaster Gallery (editor)','tpl-g3',doc('Alabaster Gallery (editor)',C,H,[hero,plates,bar,tail[1]])))

json.dump([{'id':i,'name':nm,'from':f,'canvas':d} for i,nm,f,d in OUT], open('docs.json','w'), indent=1)
print(len(OUT),'docs', [ (i, sum(len(s['els']) for s in d['sections'])) for i,_,_,d in OUT])
