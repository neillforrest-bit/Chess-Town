import json,urllib.request,sys
K=open('/tmp/.tmdbkey').read().strip()
def g(u):
    return json.load(urllib.request.urlopen(f"https://api.themoviedb.org/3{u}{'&' if '?' in u else '?'}api_key={K}"))
genres={x['id']:x['name'] for x in g('/genre/movie/list')['genres']}
seen={};out=[]
def add(res,wild):
    for m in res:
        if m['id'] in seen or not m.get('poster_path') or not m.get('overview'): continue
        y=int((m.get('release_date') or '0')[:4] or 0)
        if y<=1990 or m['vote_average']<6.0: continue
        seen[m['id']]=1
        out.append({'id':m['id'],'t':m['title'],'y':y,'r':round(m['vote_average'],1),'g':[genres.get(i,'') for i in m['genre_ids']],'o':m['overview'][:220],'p':m['poster_path'],'w':wild,'pop':round(m['popularity'])})
for p in range(1,26):
    add(g(f'/discover/movie?primary_release_date.gte=1991-01-01&vote_average.gte=6.1&vote_count.gte=2000&sort_by=popularity.desc&with_original_language=en&page={p}')['results'],False)
for p in range(1,9):
    add(g(f'/discover/movie?primary_release_date.gte=1991-01-01&vote_average.gte=7.6&vote_count.gte=700&vote_count.lte=6000&sort_by=vote_average.desc&page={p}')['results'],True)
json.dump({'genres':list(genres.values()),'movies':out},open('catalog.json','w'),separators=(',',':'))
print(len(out),sum(1 for m in out if m['w']))
