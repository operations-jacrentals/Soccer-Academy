/*
 * Age-8 tracker — CORE LOGIC (UI-agnostic).
 * No DOM, no styling. A fresh UI imports this and renders however it likes.
 *
 * What it computes: the self-referential "MY CARD" — a 6-spoke profile
 * (PAC·SHO·PAS·DRI·DEF·PHY) with a HEART instead of an overall rating.
 * Every spoke grows ONLY from the child's own past marks. No overall number,
 * no cross-child ranking is representable from this data.
 *
 * Data model (persist as JSON, e.g. localStorage):
 *   mem = {
 *     players: ["Ava", ...],                 // roster (also the join key)
 *     rep:   { "player|Dn": {base,best,r2} }, // per-day PR (best only climbs); r2 = weak-foot 2nd number (gate day)
 *     funpb: { "player|metric": {base,best} },// monthly Pace/Physical PBs + juggle
 *     heart: { "player|Dn": count },          // brave-try tallies (HEART days)
 *     rules: { "player|Dn": [bool x5] },      // D15 restart checklist
 *     a:     { "Dn|player|s": true },          // attendance: 1 tick = 1 attended session = 1 hour
 *     plan:  { "Dn|phaseIdx": "custom text" } // drill overrides (family-locked; see metrics.json)
 *   }
 * A "report" is a single PR per player per day: run the test every session,
 * log the best — the number only ever climbs (a weaker session never lowers it).
 */

// ---- config: spokes ----
export const SP = ["PAC","SHO","PAS","DRI","DEF","PHY"];
export const ANG = {PAC:-90, SHO:-30, PAS:30, DRI:90, DEF:150, PHY:210}; // hexagon spoke angles (deg)
export const TECH = {DRI:1, PAS:1, SHO:1, DEF:1}; // "technical" spokes eligible to be the Next Quest
export const SPNAME = {PAC:"Pace", SHO:"Shooting", PAS:"Passing", DRI:"Dribbling", DEF:"Defending", PHY:"Physical"};

// ---- metric registry (metric_id -> spoke, growth step, direction) ----
// step = how much improvement over baseline counts as "1 unit of mastery"; dir<0 = lower is better.
// (Full human-readable index + per-day mapping lives in metrics.json.)
export const MET = {
  touch:{sp:"DRI",step:3,dir:1}, gate:{sp:"DRI",step:2,dir:1}, cushion:{sp:"DRI",step:2,dir:1}, juggle:{sp:"DRI",step:4,dir:1},
  pass:{sp:"PAS",step:2,dir:1}, onetwo:{sp:"PAS",step:2,dir:1}, scan:{sp:"PAS",step:1.5,dir:1},
  teamstreak:{sp:"PAS",step:2,dir:1}, rondostreak:{sp:"PAS",step:2,dir:1},
  finish:{sp:"SHO",step:2,dir:1}, keeper:{sp:"SHO",step:2,dir:1}, jockey:{sp:"DEF",step:1.5,dir:1},
  dash:{sp:"PAC",step:0.3,dir:-1}, balL:{sp:"PHY",step:3,dir:1}, balR:{sp:"PHY",step:3,dir:1}, ladder:{sp:"PHY",step:2,dir:1}
};

// ---- which metric each day carries (D1..D15). k = kind of entry ----
//   ampm/gate -> single PR number (gate also has r2 weak-foot); heart -> brave-try counter; rules -> D15 checklist.
export const DAY = {
  D1:{k:"ampm",m:"touch",lab:"Touch Count 30s",sp:"DRI",unit:"touches / 30s"},
  D2:{k:"gate",m:"gate",lab:"Gate Run 60s",sp:"DRI",unit:"gates / 60s"},
  D3:{k:"heart",m:"brave1",lab:"Brave Tries — moves attempted",sp:"HEART"},
  D4:{k:"ampm",m:"cushion",lab:"Cushion Count 60s",sp:"DRI",unit:"clean / 60s"},
  D5:{k:"heart",m:"mymove",lab:"My-Move shows in the game",sp:"HEART"},
  D6:{k:"ampm",m:"pass",lab:"Pass Count 60s (pair)",sp:"PAS",unit:"passes / 60s"},
  D7:{k:"ampm",m:"onetwo",lab:"One-Two Count 60s (pair)",sp:"PAS",unit:"1-2s / 60s"},
  D8:{k:"heart",m:"brave2",lab:"Brave Tries II — moves attempted",sp:"HEART"},
  D9:{k:"ampm",m:"scan",lab:"Scan Score",sp:"PAS",unit:"/ 10"},
  D10:{k:"ampm",m:"finish",lab:"Finish Ten (placement, both feet)",sp:"SHO",unit:"/ 10"},
  D11:{k:"ampm",m:"teamstreak",lab:"Team Streak (group)",sp:"PAS",unit:"best streak"},
  D12:{k:"ampm",m:"rondostreak",lab:"Rondo Streak (group)",sp:"PAS",unit:"best streak"},
  D13:{k:"heart",m:"winbacks",lab:"Patient win-backs",sp:"HEART",jockey:1},
  D14:{k:"ampm",m:"keeper",lab:"Keeper's Ten (clean W-catches)",sp:"SHO",unit:"/ 10"},
  D15:{k:"rules",lab:"Rules Five → Game Ready",sp:"—"}
};
export const HEARTDAYS = ["D3","D5","D8","D13"];
export const G = 4; // mastery saturation constant

// ---- record (single PR: first entry sets base; best only climbs) ----
export function recPR(mem, p, day, x){ const k=p+"|"+day, r=mem.rep[k]||{}; if(r.base==null)r.base=x; r.best=(r.best==null)?x:Math.max(r.best,x); mem.rep[k]=r; }
export function recR2(mem, p, x){ const k=p+"|D2", r=mem.rep[k]||{}; r.r2=x; mem.rep[k]=r; }           // gate day weak-foot 2nd number
export function recBest(mem, p, met, x){ const k=p+"|"+met, r=mem.funpb[k]||{}; if(r.base==null)r.base=x; r.best=(r.best==null)?x:(MET[met].dir<0?Math.min(r.best,x):Math.max(r.best,x)); mem.funpb[k]=r; }
export function recHeart(mem, p, day, delta){ const k=p+"|"+day; mem.heart[k]=Math.max(0,(mem.heart[k]||0)+delta); }
export function hours(mem, p){ let n=0; for(const k in mem.a){ if(mem.a[k]){ const s=k.split("|"); if(s[1]===p)n++; } } return n; } // ticks == hours

// ---- mastery (self-referential, monotone-saturating: 100*(1-e^(-g/G))) ----
export function prMastery(r, met){ if(!r||r.base==null)return null; const best=(r.best!=null)?r.best:r.base; const g=Math.max(0,(best-r.base)/MET[met].step); return 100*(1-Math.exp(-g/G)); }
export function bestMastery(r, met){ if(!r||r.base==null)return null; const best=(r.best!=null)?r.best:r.base; const m=MET[met], b=m.dir<0?-r.base:r.base, pr=m.dir<0?-best:best; return 100*(1-Math.exp(-Math.max(0,(pr-b))/m.step/G)); }
export function heartTotal(mem, p){ let n=0; HEARTDAYS.forEach(d=>{ n+=(mem.heart[p+"|"+d]||0); }); return n; }

/*
 * profile(mem, p) -> the whole self-referential card shape for one player.
 * Returns { L, lit, litArr, zs, sup, next, lowGuard, heart, hb, feetA, weak, strong, tier }.
 *   L[spoke]   = 0..100 mastery length (a RENDERING input — never printed as a score).
 *   lit[spoke] = has enough data to light up.
 *   sup        = "superpower" spoke (highest within-child z-score).
 *   next       = "next quest" = lowest TECH spoke (Pace/Physical guarded out — they grow on biology's clock).
 *   feetA/weak/strong = both-feet balance from the gate day's strong (best) vs weak-foot (r2).
 *   hb         = heart brightness 0..1 (the medallion only brightens; never a number).
 *   tier       = bronze/silver/gold journey frame (self-referential milestones, NOT a rank).
 */
export function profile(mem, p){
  const lv={}; SP.forEach(s=>{ lv[s]=[]; });
  for(const day in DAY){ const d=DAY[day]; if(d.k==="ampm"||d.k==="gate"){ const m=prMastery(mem.rep[p+"|"+day], d.m); if(m!=null)lv[d.sp].push(m); } }
  ["jockey","dash","balL","balR","ladder","juggle"].forEach(met=>{ const m=bestMastery(mem.funpb[p+"|"+met], met); if(m!=null)lv[MET[met].sp].push(m); });
  const L={}, lit={}, litArr=[];
  SP.forEach(s=>{ if(lv[s].length){ L[s]=lv[s].reduce((a,b)=>a+b,0)/lv[s].length; lit[s]=true; litArr.push(s); } else { L[s]=0; lit[s]=false; } });
  const g=mem.rep[p+"|D2"]; let feetA=null, weak=null, strong=null;
  if(g&&g.best!=null&&g.r2!=null&&(g.best+g.r2)>0){ strong=g.best; weak=g.r2; feetA=(g.best-g.r2)/(g.best+g.r2); if(feetA<0)feetA=0; }
  const zs={}; let sup=null, next=null, lowGuard=false;
  if(litArr.length>=2){
    const vals=litArr.map(s=>L[s]), mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)*(b-mean),0)/vals.length)||1;
    litArr.forEach(s=>{ zs[s]=(L[s]-mean)/sd; });
    litArr.forEach(s=>{ if(sup==null||zs[s]>zs[sup])sup=s; });
    litArr.forEach(s=>{ if(TECH[s]&&(next==null||zs[s]<zs[next]))next=s; });
    let lowest=null; litArr.forEach(s=>{ if(lowest==null||zs[s]<zs[lowest])lowest=s; });
    if(lowest==="PAC"||lowest==="PHY")lowGuard=true;
  } else if(litArr.length===1){ sup=litArr[0]; }
  const h=heartTotal(mem, p), hb=1-Math.exp(-h/8);
  let tier="bronze"; const n=litArr.length;
  if(n>=3&&h>0)tier="silver";
  if(n>=5&&h>=6&&lit.DRI&&lit.PAS&&lit.SHO)tier="gold";
  return {L,lit,litArr,zs,sup,next,lowGuard,heart:h,hb,feetA,weak,strong,tier};
}

// ---- roster CRUD (data follows a rename; removing a player purges their keys) ----
export function addPlayer(mem, name){ name=(name||"").trim().slice(0,24); if(!name||mem.players.indexOf(name)!==-1)return false; mem.players.push(name); return true; }
export function removePlayer(mem, p){ mem.players=mem.players.filter(x=>x!==p);
  [mem.rep,mem.a,mem.heart,mem.funpb,mem.rules].forEach(map=>{ Object.keys(map).forEach(k=>{ const s=k.split("|"); if(s[0]===p||s[1]===p)delete map[k]; }); }); }
export function renamePlayer(mem, oldN, newN){ newN=(newN||"").slice(0,24); if(!newN||newN===oldN||mem.players.indexOf(newN)!==-1)return false;
  const i=mem.players.indexOf(oldN); if(i===-1)return false; mem.players[i]=newN;
  ["rep","a","heart","funpb","rules"].forEach(mk=>{ const m=mem[mk], nm={}; Object.keys(m).forEach(k=>{ nm[k.split("|").map(x=>x===oldN?newN:x).join("|")]=m[k]; }); mem[mk]=nm; }); return true; }

export function emptyMem(){ return {players:[], rep:{}, funpb:{}, heart:{}, rules:{}, a:{}, plan:{}}; }
