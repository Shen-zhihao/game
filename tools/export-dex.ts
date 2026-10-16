import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  ALL_SPECIES,
  CONTENT_VERSION,
  ITEMS,
  learnset,
  MOVES,
  spriteFor,
  TYPE_CHART,
  TYPE_COLORS,
  TYPES,
} from '../src/content/catalog';
import { HABITAT_SITES, SPECIES_HABITATS } from '../src/content/habitats';
import { STAT_NAMES, TRAINING_PLANS } from '../src/content/training';
import { SIGNATURE_BY_SPECIES } from '../src/content/signatures';
import { spriteFrame } from '../src/content/spriteFrames';
import { format, resolveConfig } from 'prettier';
import design from '../docs/精灵属性/精灵设计数据.json';
import acquisition from '../docs/精灵获取/稀有精灵获取.json';
import { APP_ENGLISH_NAME, APP_NAME } from '../src/content/brand';

const rarityNames = { ordinary: '普通', starter: '初始伙伴', rare: '稀有', legendary: '神兽' };
const typing = Object.fromEntries(
  design.families.flatMap((family) => {
    const rarity =
      (acquisition.families.find((entry) => entry.familyId === family.id)?.rarity as
        keyof typeof rarityNames | undefined) ?? 'ordinary';
    return family.forms.map((species) => [
      species.id,
      { rarity, label: rarityNames[rarity], rationale: family.typingRationale },
    ]);
  }),
);

async function main() {
  const entries = ALL_SPECIES.map((s) => ({
    ...s,
    sprite: spriteFor(s.id),
    frame: spriteFrame(spriteFor(s.id)!),
    habitat: SPECIES_HABITATS[s.id],
    locations: SPECIES_HABITATS[s.id]!.siteIds.map((id) => {
      const h = HABITAT_SITES.find((h) => h.id === id)!;
      return { id: h.id, name: h.name, map: h.map ?? null, medium: h.medium };
    }),
    training: TRAINING_PLANS[s.id],
    signature: SIGNATURE_BY_SPECIES[s.id] ?? null,
    typing: typing[s.id],
    moves: learnset(s.id).map((m) => ({ ...m, ...MOVES[m.moveId] })),
  }));
  if (entries.length !== 250 || entries.some((e) => !e.sprite || !e.habitat?.obtainableNow))
    throw new Error('图鉴仍有占位或未实现获取路径');
  const data = {
    contentVersion: CONTENT_VERSION,
    maxLevel: 100,
    pointsPerLevel: [1, 10],
    types: TYPES,
    typeColors: TYPE_COLORS,
    typeChart: TYPE_CHART,
    statNames: STAT_NAMES,
    items: ITEMS,
    entries,
  };
  const path = 'docs/图鉴/图鉴数据.json';
  writeFileSync(
    path,
    await format(JSON.stringify(data), { ...(await resolveConfig(path)), filepath: path }),
  );
  const atlasNames = [...new Set(entries.map((e) => e.sprite!.atlas))];
  const css = atlasNames
    .map(
      (name) =>
        `.a-${name}{background-image:url(data:image/png;base64,${readFileSync(`assets/creatures-${name}.png`).toString('base64')})}`,
    )
    .join('\n');
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${APP_NAME} · 250精灵全图鉴</title><style>
  *{box-sizing:border-box}body{margin:0;background:#0d211f;color:#e9eedb;font-family:system-ui,-apple-system,sans-serif;line-height:1.6}header{padding:42px max(24px,6vw) 26px;background:linear-gradient(125deg,#173d33,#25384a)}h1{margin:0;font-size:clamp(30px,5vw,55px);letter-spacing:.08em}.eyebrow{color:#dec887;letter-spacing:.2em}header p{max-width:980px;color:#c4d4c5}main{padding:24px max(20px,5vw)}.filters{position:sticky;top:0;background:#0d211ff5;padding:14px 0;z-index:2;display:flex;gap:10px;flex-wrap:wrap}input,select,button{background:#193930;color:#eef0df;border:1px solid #5d7565;border-radius:9px;padding:11px;font:inherit}input{flex:1;min-width:220px}select{max-width:210px}#count{color:#e1c579;margin:12px 0}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(295px,1fr));gap:17px}.card{border:1px solid #37534a;border-radius:15px;background:linear-gradient(150deg,#193930,#152c30);padding:18px;overflow:hidden}.head{display:flex;align-items:center;gap:12px}.sprite{position:relative;width:120px;height:120px;flex:0 0 120px;background-size:100% 100%;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(0 9px 7px #0004)}h2{margin:0;font-size:23px}.number{font-size:12px;color:#b3bdb1;letter-spacing:.12em}.badges{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.type{padding:1px 8px;border-radius:20px;font-size:11px;color:#122c27;font-weight:800}.role{color:#dfc68a;font-size:13px}.source{color:#bfd0bf;font-size:13px;min-height:44px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:12px 0;font-size:12px}.stats span{border-bottom:2px solid #54796a;padding:4px}details{border-top:1px solid #37534a;padding-top:9px}summary{cursor:pointer;color:#dec887}details p{font-size:13px}details ul{padding-left:18px;font-size:12px}.note{color:#b0c8b5;font-size:12px}footer{padding:30px;color:#b1c9bb}.hidden{display:none}.chart{overflow:auto;margin-top:35px}table{border-collapse:collapse;font-size:11px}th,td{border:1px solid #466057;padding:5px;text-align:center;min-width:28px}th{background:#234638}a{color:#e4cf92}@media print{body{background:white;color:#182b24}.filters{display:none}.card{background:white;border:1px solid #999;break-inside:avoid}#grid{grid-template-columns:repeat(2,1fr)}.source,.note,header p{color:#234}details{display:block}header{background:white}summary{color:#234}}
  ${css}</style><header><div class="eyebrow">${APP_ENGLISH_NAME} FIELD ARCHIVE / ${CONTENT_VERSION}</div><h1>${APP_NAME} · 全图鉴</h1><p>250 种原创精灵 · 115 个家族 · 135 条进化关系。独立正面像素图、18 属性克制、栖地与剧情获取、完整学招和专属培养方案，均来自游戏当前运行数据。</p><p class="note">Lv.100 封顶，每次升级随机获得 1–10 能力点，强度越高越容易获得高点数，支持自己分配；已确认点数需用重塑药剂返还。普通精灵以单属性为主，少量双属性；稀有与神兽可走单系专精或多系组合。多属性逐项叠乘；速度达 2 倍／3 倍可连续出手，要害伤害 ×2。大师球全篇仅三个固定剧情来源。</p></header><main><div class="filters"><input id="search" placeholder="搜索编号、名字、属性或栖地…" aria-label="搜索图鉴"><select id="type" aria-label="筛选属性"><option value="">全部属性</option></select><select id="method" aria-label="筛选获取"><option value="">全部获取</option><option value="wild">普通野生</option><option value="evolution">进化形态</option><option value="storyEncounter">剧情定点</option><option value="storyGift">初始保育</option></select><button id="reset">重置筛选</button></div><div id="count"></div><div id="grid"></div><section class="chart"><h2>18 属性标准克制表</h2><p class="note">行是攻击属性，列是防御属性；多属性目标逐项相乘。0 为免疫。</p><div id="chart"></div></section></main><footer>这份图鉴可完全离线使用。展示的是独立正面形象；独立背面与完整攻击动画不在本图鉴范围。主线、联盟与居民任务不要求集齐全部精灵。</footer><script id="data" type="application/json">${payload}</script><script>
  const d=JSON.parse(document.getElementById('data').textContent),grid=document.getElementById('grid'),type=document.getElementById('type'),method=document.getElementById('method'),search=document.getElementById('search');
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  Object.entries(d.types).forEach(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;type.append(o)});
  const evo=e=>e.condition.kind==='level'?'Lv.'+e.condition.level:'Lv.'+e.condition.minLevel+' + '+d.items[e.condition.itemId].name;
  d.entries.forEach(e=>{const c=document.createElement('article');c.className='card';c.dataset.id=e.id;const sprite=e.sprite,source=e.habitat.method==='evolution'?'由 '+d.entries.find(s=>s.id===e.evolvesFromId).name+' 进化':e.habitat.method==='wild'?'普通野生 · '+[...new Set(e.locations.filter(l=>l.map).map(l=>l.name))].join('／'):e.habitat.storyBeat;
  const f=e.frame,k=120*.86/Math.max(f.width,f.height),crop='position:absolute;overflow:hidden;left:'+((120-f.width*k)/2)+'px;top:'+(120*.93-f.height*k)+'px;width:'+(f.width*k)+'px;height:'+(f.height*k)+'px',image='position:absolute;background-size:100% 100%;left:'+(-f.x*k)+'px;top:'+(-f.y*k)+'px;width:'+(f.atlasWidth*k)+'px;height:'+(f.atlasHeight*k)+'px';
  c.innerHTML='<div class="head"><div class="sprite" role="img" aria-label="'+esc(e.name)+'"><div style="'+crop+'"><div class="a-'+sprite.atlas+'" style="'+image+'"></div></div></div><div><div class="number">NO. '+String(e.dexNumber).padStart(3,'0')+'</div><h2>'+esc(e.name)+'</h2><div class="badges">'+e.types.map(t=>'<span class="type" style="background:'+d.typeColors[t]+'">'+d.types[t]+'</span>').join('')+'</div><div class="role">'+esc(e.training.role)+'</div></div></div><div class="stats">'+Object.entries(e.baseStats).map(([k,v])=>'<span>'+d.statNames[k]+' '+v+'</span>').join('')+'</div><p class="source">'+esc(source)+'</p><details><summary>生态、进化与培养方案</summary><p><b>属性定位：</b>'+esc(e.typing.label)+' · '+(e.types.length===1?'单系专精':e.types.length+'属性组合')+'。'+esc(e.typing.rationale)+'</p><p>'+esc(e.habitat.description)+'</p><p><b>进化：</b>'+ (e.evolutions.length?e.evolutions.map(v=>esc(evo(v)+' → '+d.entries.find(s=>s.id===v.toId).name)).join('；'):'最终或独立形态')+'</p><p>'+esc(e.training.strategy)+'</p><p class="note">'+esc(e.training.caution)+'</p><p>推荐每十点：'+Object.entries(e.training.weights).filter(([,v])=>v).map(([k,v])=>d.statNames[k]+' '+v).join('／')+'</p>'+(e.signature?'<p><b>专属技能：</b>'+esc(e.signature.move.name)+' · Lv.'+e.signature.level+' · '+esc(e.signature.description)+'（不可复刻）</p>':'')+'<p><b>自然学招：</b>'+e.moves.map(m=>'Lv.'+m.level+' '+esc(m.name)+(m.exclusiveSpeciesId?'〔专属·不可复刻〕':'')).join(' · ')+'</p></details>';grid.append(c)});
  function filter(){const q=search.value.trim().toLowerCase();let n=0;d.entries.forEach((e,i)=>{const yes=(!type.value||e.types.includes(type.value))&&(!method.value||e.habitat.method===method.value)&&(!q||(e.dexNumber+' '+e.name+' '+e.types.map(t=>d.types[t]).join(' ')+' '+e.locations.map(l=>l.name).join(' ')).toLowerCase().includes(q));grid.children[i].classList.toggle('hidden',!yes);if(yes)n++});document.getElementById('count').textContent='显示 '+n+' / 250 种形态 · 所有家族均已有游戏内获取路径'}
  search.addEventListener('input',filter);type.addEventListener('change',filter);method.addEventListener('change',filter);document.getElementById('reset').onclick=()=>{search.value='';type.value='';method.value='';filter()};filter();
  const ids=Object.keys(d.types);document.getElementById('chart').innerHTML='<table><tr><th>攻／防</th>'+ids.map(t=>'<th>'+d.types[t]+'</th>').join('')+'</tr>'+ids.map(a=>'<tr><th>'+d.types[a]+'</th>'+ids.map(b=>'<td>'+d.typeChart[a][b]+'</td>').join('')+'</tr>').join('')+'</table>';
  </script></html>`;
  mkdirSync('exports', { recursive: true });
  writeFileSync('exports/stargrove-dex.html', html);
  console.log(
    `导出 ${entries.length} 种完整图鉴，${atlasNames.length} 张独立图集，离线HTML ${(Buffer.byteLength(html) / 1048576).toFixed(1)} MiB。`,
  );
}
void main();
