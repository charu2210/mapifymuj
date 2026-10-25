# Browser end-to-end test (Python Playwright). Start the server first:  PORT=3111 DB_PATH=/tmp/ui.db node server/index.js
# Leaflet/CDN requests are served from a local copy (set LF below) so it runs offline; adjust BASE/LF for your machine.
# Not part of 'npm test' (needs Playwright + Chromium).
import json, re, sys
from playwright.sync_api import sync_playwright
BASE='http://localhost:3111'; LF='/tmp/lf/node_modules/leaflet/dist/'
errs=[]; res=[]
def ok(n,c,extra=''): res.append((n,bool(c),extra)); print(('PASS' if c else 'FAIL'),n,extra)
import time
def wf(pg,js,t=8):
    end=time.time()+t
    while time.time()<end:
        try:
            if pg.evaluate(js): return True
        except Exception: pass
        time.sleep(.1)
    raise TimeoutError(js)
def route(r):
    u=r.request.url
    if 'leaflet.min.js' in u: return r.fulfill(path=LF+'leaflet.js',content_type='application/javascript')
    if 'leaflet.min.css' in u: return r.fulfill(path=LF+'leaflet.css',content_type='text/css')
    if u.startswith(BASE): return r.continue_()
    return r.abort()
with sync_playwright() as p:
    b=p.chromium.launch()
    def page(vw=(390,844)):
        ctx=b.new_context(viewport={'width':vw[0],'height':vw[1]}); pg=ctx.new_page()
        pg.on('pageerror',lambda e:errs.append(('pageerror',pg.url,str(e))))
        pg.on('console',lambda m: errs.append(('console',pg.url,m.text)) if m.type=='error' and 'ERR_FAILED' not in m.text and 'Failed to load resource' not in m.text else None)
        ctx.route('**/*',route); return pg
    # Dashboard at a fixed Thursday moment
    pg=page(); pg.goto(BASE+'/index.html?at=2026-10-22T10:45:00%2B05:30'); pg.wait_for_selector('.nc-name')
    wf(pg,"document.querySelector('.nc-name').textContent!=='Loading…'")
    t=pg.inner_text('#next'); ok('dashboard current class',('Relational DB' in t) and 'Rm 127' in t and 'First Floor' in t,t.replace('\n',' | ')[:120])
    ok('dashboard label Right now','right now' in pg.inner_text('#now-label').lower())
    ok('later list merged lab/ML block','11:30–1:10' in pg.inner_text('#later'),pg.inner_text('#later').replace('\n',' ')[:100])
    ok('attendance ring present',pg.locator('#next svg.ring').count()==1 and pg.locator('#snap svg.ring').count()==1)
    ok('4 building cards',pg.locator('#blds .bld-card').count()==4)
    pg.click('text=Find Room'); pg.wait_for_selector('#stage svg'); wf(pg,"document.querySelector('#crumb').textContent.includes('127')")
    ok('Find Room deep-links to AB2-127 highlighted',pg.evaluate("document.getElementById('AB2-127').querySelector('rect').style.fill")=='rgb(217, 72, 15)', pg.inner_text('#crumb'))
    ok('classes timetabled in room shown','RDBMS' in pg.inner_text('#i') or 'Relational' in pg.inner_text('#i'))
    # Search
    pg.goto(BASE+'/map.html'); pg.wait_for_selector('#stage svg')
    for q,exp in [('AB2-127','AB2-127'),('ab2 127','AB2-127'),('AB2127','AB2-127')]:
        pg.fill('#q',q); pg.press('#q','Enter'); pg.wait_for_timeout(150)
        ok('search '+q, 'AB-2' in pg.inner_text('#crumb') and '127' in pg.inner_text('#crumb'), pg.inner_text('#crumb'))
    pg.fill('#q','lab'); ok('generic "lab" shows count note','matches' in pg.inner_text('#res'),pg.inner_text('#res .more'))
    pg.fill('#q','zzzzq'); ok('not found message',pg.is_visible('#nf'))
    pg.fill('#q','');
    # touch targets
    small=pg.evaluate("[...document.querySelectorAll('button,a.btn,.chip,.seg,.nb')].filter(e=>e.offsetParent).map(e=>[e.className,Math.round(e.getBoundingClientRect().height)]).filter(x=>x[1]<44)")
    ok('all tap targets >=44px on map page',not small,str(small[:5]))
    # keyboard on SVG
    pg.click('#blds button:has-text("LHC")'); ok('building switch',pg.inner_text('#crumb').startswith('Campus › LHC'))
    n=pg.evaluate("document.querySelectorAll('#stage g[tabindex]').length"); ok('rooms keyboard-focusable',n>10,str(n))
    pg.evaluate("document.querySelector('#stage g[tabindex]').focus()"); pg.keyboard.press('Enter'); ok('Enter selects focused room','›' in pg.inner_text('#crumb') and pg.inner_text('#crumb').count('›')==3)
    # every floor loads and every room selectable by tapping (sample all)
    tot=0;bad=[]
    camp=pg.evaluate("fetch('/api/campus').then(r=>r.json())")
    for bd in camp['buildings']:
        for fl in bd['floors']:
            pg.goto(f"{BASE}/map.html?b={bd['id']}&f={fl['id']}"); pg.wait_for_selector('#stage svg')
            rooms=[r for r in camp['rooms'] if r['b']==bd['id'] and r['f']==fl['id']]
            found=pg.evaluate("ks=>ks.filter(k=>!document.getElementById(k))",[r['k'] for r in rooms]); tot+=len(rooms); bad+=found
    ok(f'all {tot} rooms exist in their floor SVG',not bad and tot==309,str(bad[:5]))
    # deep link invalid
    pg.goto(BASE+'/map.html?room=NOPE'); pg.wait_for_selector('#stage svg'); ok('invalid room key ignored',True)
    # Timetable
    pg.goto(BASE+'/timetable.html?at=2026-10-22T10:45:00%2B05:30'); pg.wait_for_selector('.slot')
    ok('timetable NOW marker','NOW' in pg.inner_text('#slots'))
    ok('timetable defaults to Thursday',pg.locator('.dtab.on .dn').inner_text()=='THU')
    pg.click('.dtab:has-text("MON")'); ok('Monday has 3 blocks',pg.locator('#slots .slot').count()==3)
    rows=pg.inner_text('#rows'); ok('attendance rows 9',pg.locator('.att-row').count()==9)
    ok('75% exactly shown orange/Borderline (DSE2220 15/20)','Borderline' in pg.locator('.att-row:has-text("DSE2220")').inner_text())
    ok('18/22 Safe','Safe' in pg.locator('.att-row:has-text("DSE2201")').inner_text())
    col=pg.evaluate("[...document.querySelectorAll('.att-row')].map(r=>[r.querySelector('.att-row-code').textContent,getComputedStyle(r.querySelector('.att-fill')).backgroundColor])")
    print('  colors',col)
    # Saturday → next Monday
    pg.goto(BASE+'/index.html?at=2026-10-24T11:00:00%2B05:30'); wf(pg,"document.querySelector('.nc-name').textContent!=='Loading…'")
    ok('Saturday shows Monday next class','monday' in pg.inner_text('#now-label').lower(),pg.inner_text('#now-label'))
    # Login flows
    pg.goto(BASE+'/login.html'); pg.wait_for_selector('#f')
    pg.fill('#em','student@muj.local'); pg.fill('#pw','wrong'); pg.click('button[type=submit]'); wf(pg,"document.querySelector('#msg').textContent.length>0")
    ok('wrong password message',pg.inner_text('#msg')=='Wrong email or password')
    pg.fill('#pw','student123'); pg.click('button[type=submit]'); pg.wait_for_url('**/index.html'); wf(pg,"document.querySelector('#who').textContent!=='there'")
    ok('signed-in dashboard greets Demo',pg.inner_text('#who')=='Demo','')
    ok('live attendance not flagged sample','sample attendance' not in pg.inner_text('#sect'))
    # Register new student (no attendance) 
    # Campus page
    pg.goto(BASE+'/campus.html?place=AB2'); pg.wait_for_selector('.leaflet-marker-icon'); 
    ok('campus markers rendered',pg.locator('.leaflet-marker-icon').count()>=20,str(pg.locator('.leaflet-marker-icon').count()))
    ok('AB2 selected, approximate flag, floor plans link','approximate' in pg.inner_text('#detail') and pg.locator('#detail a:has-text("floor plans")').count()==1)
    pg.click('#go'); wf(pg,"document.querySelector('#rt').textContent.includes('on foot')"); ok('walking directions',True,pg.inner_text('#rt'))
    pg.click('#cats [data-c=dining]'); ok('category filter',pg.locator('#plist button').count()==1)
    # Admin as admin
    pg.evaluate("localStorage.clear()"); pg.goto(BASE+'/admin.html'); pg.wait_for_url('**/login.html*')
    pg.fill('#em','admin@muj.local'); pg.fill('#pw','admin1234'); pg.click('button[type=submit]'); pg.wait_for_url('**/admin.html'); pg.wait_for_selector('#tabs .seg')
    ok('admin tabs',pg.locator('#tabs .seg').count()==5)
    pg.click('#tabs [data-t=rooms]'); pg.wait_for_selector('#rb tr'); pg.fill('#rb tr >> nth=0 >> .nm','Test Room Alpha'); pg.click('#rb tr >> nth=0 >> .sv'); pg.wait_for_selector('.toast')
    pg.goto(BASE+'/map.html'); pg.wait_for_selector('#stage svg'); pg.fill('#q','alpha'); ok('admin rename visible in search','Test Room Alpha' in pg.inner_text('#res'))
    pg.goto(BASE+'/admin.html#att'); pg.wait_for_selector('#ld'); pg.click('#ld'); pg.wait_for_selector('.stu'); ok('faculty marking lists students',pg.locator('.stu').count()>=1)
    pg.click('.stu .tg >> nth=0'); pg.click('#sv'); pg.wait_for_selector('.toast'); ok('mark attendance saved','Saved' in pg.inner_text('.toast'),pg.inner_text('.toast'))
    pg.goto(BASE+'/admin.html#pins'); pg.wait_for_selector('#pb tr'); ok('pins table',pg.locator('#pb tr').count()>=28)
    pg.goto(BASE+'/admin.html#tt'); pg.wait_for_selector('#tb tr'); ok('timetable editor rows',pg.locator('#tb tr').count()==23)
    pg.goto(BASE+'/admin.html#users'); pg.wait_for_selector('#ub tr'); ok('users list',pg.locator('#ub tr').count()>=3)
    # Responsive: no horizontal scroll at several viewports
    for vw in [(360,640),(390,844),(768,1024),(1024,768),(1366,768),(1920,1080)]:
        pg2=page(vw)
        for u in ['index.html','map.html','timetable.html','campus.html','login.html']:
            pg2.goto(f'{BASE}/{u}'); pg2.wait_for_timeout(250)
            ov=pg2.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
            if ov>1: ok(f'no h-scroll {u} @{vw[0]}',False,str(ov))
        pg2.context.close()
    ok('no h-scroll at 6 viewports x 5 pages',not [r for r in res if r[0].startswith('no h-scroll')])
    pg.screenshot(path='/tmp/admin.png')
    b.close()
print('\nJS errors:',errs[:10]); print('FAILS:',[r for r in res if not r[1]])
