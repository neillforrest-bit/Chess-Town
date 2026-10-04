import json,urllib.request,concurrent.futures as cf,time
K=open('/tmp/.tmdbkey').read().strip()
c=json.load(open('src/data/catalog.json'))
def g(u):
    for i in range(3):
        try: return json.load(urllib.request.urlopen(f"https://api.themoviedb.org/3{u}{'&' if '?' in u else '?'}api_key={K}",timeout=20))
        except Exception as e: time.sleep(1)
    return {}
def one(m):
    d=g(f"/movie/{m['id']}?append_to_response=credits,release_dates,external_ids,keywords")
    cert=''
    for r in d.get('release_dates',{}).get('results',[]):
        if r['iso_3166_1']=='US':
            for x in r['release_dates']:
                if x.get('certification'): cert=x['certification']; break
    m['c']=[a['name'] for a in d.get('credits',{}).get('cast',[])[:3]]
    m['k']=cert; m['rn']=d.get('runtime') or 0; m['tag']=(d.get('tagline') or '')[:90]
    m['im']=d.get('external_ids',{}).get('imdb_id') or ''
    m['kw']=[k['name'] for k in d.get('keywords',{}).get('keywords',[])[:12]]
    m['o']=(d.get('overview') or m['o'])[:300]
    return m
with cf.ThreadPoolExecutor(8) as ex: out=list(ex.map(one,c['movies']))
c['movies']=out
json.dump(c,open('/tmp/catalog_tmdb.json','w'),separators=(',',':'))
print('done',len(out),sum(1 for m in out if m['k']),sum(1 for m in out if m['im']))
