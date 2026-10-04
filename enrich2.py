import json,urllib.request,concurrent.futures as cf,time,re
K=open('/tmp/.omdbkey').read().strip()
c=json.load(open('/tmp/catalog_tmdb.json'))
def one(m):
    if not m['im']: return m
    for i in range(3):
        try:
            d=json.load(urllib.request.urlopen(f"http://www.omdbapi.com/?i={m['im']}&apikey={K}",timeout=20)); break
        except Exception: d={}; time.sleep(1)
    rt=mc=None
    for r in d.get('Ratings',[]) or []:
        if r['Source']=='Rotten Tomatoes': rt=int(r['Value'].rstrip('%'))
        if r['Source']=='Metacritic': mc=int(r['Value'].split('/')[0])
    imdb=d.get('imdbRating'); m['rt']=rt; m['mc']=mc; m['imdb']=float(imdb) if imdb and imdb!='N/A' else None
    aw=d.get('Awards') or ''; m['aw']='' if aw=='N/A' else aw
    if not m['k'] and d.get('Rated') not in (None,'N/A','Not Rated','Unrated'): m['k']=d['Rated']
    if d.get('Actors') and d['Actors']!='N/A' and not m['c']: m['c']=[a.strip() for a in d['Actors'].split(',')[:3]]
    return m
with cf.ThreadPoolExecutor(6) as ex: out=list(ex.map(one,c['movies']))
c['movies']=out
json.dump(c,open('src/data/catalog.json','w'),separators=(',',':'))
print('done',len(out),'rt',sum(1 for m in out if m.get('rt') is not None),'mc',sum(1 for m in out if m.get('mc') is not None),'aw',sum(1 for m in out if m.get('aw')),'cert',sum(1 for m in out if m['k']))
