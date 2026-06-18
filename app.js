/* ============================================================
   HIZZONER: MERIDIAN HEIGHTS
   A deep city-management sim, soaked in Meridian, MS easter eggs.
   Single-file vanilla JS, canvas-rendered isometric-ish flat grid.
   ============================================================ */
'use strict';

/* ---------------- CONSTANTS ---------------- */
const GRID_W = 48, GRID_H = 36;
const TILE_BASE = 22; // base pixel size before zoom
let ZOOM = 1;

const DIFFICULTIES = {
  easy:   { treasury: 50000, taxMod: 1.0, eventMod: 0.6, approvalDrift: 0.3, label: 'Steel Magnolia' },
  normal: { treasury: 25000, taxMod: 1.0, eventMod: 1.0, approvalDrift: 0.15, label: 'Crossties' },
  hard:   { treasury: 10000, taxMod: 1.15, eventMod: 1.5, approvalDrift: -0.1, label: 'Queen City Grit' }
};

/* ---------------- ZONE / BUILDING DEFINITIONS ---------------- */
// type categories: zone (grows organically), civic (placed, service), road, park, special
const TOOLS = [
  { id:'bulldoze', group:'Tools', name:'Bulldoze', ic:'\u{1F528}', cost:0, type:'tool' },
  { id:'road', group:'Tools', name:'Road', ic:'\u{1F6E3}', cost:20, type:'road' },

  { id:'zres', group:'Zoning', name:'Residential', ic:'\u{1F3E0}', cost:10, type:'zone', zoneKind:'res', color:'resi' },
  { id:'zcom', group:'Zoning', name:'Commercial', ic:'\u{1F3EA}', cost:15, type:'zone', zoneKind:'com', color:'comm' },
  { id:'zind', group:'Zoning', name:'Industrial', ic:'\u{1F3ED}', cost:15, type:'zone', zoneKind:'ind', color:'indu' },

  { id:'park', group:'Civic', name:'Park', ic:'\u{1F333}', cost:300, type:'civic', service:'park', radius:5, happiness:6, upkeep:8, color:'park' },
  { id:'school', group:'Civic', name:'School', ic:'\u{1F3EB}', cost:2200, type:'civic', service:'school', radius:9, happiness:5, upkeep:90, color:'civic' },
  { id:'clinic', group:'Civic', name:'Clinic', ic:'\u{2695}\u{FE0F}', cost:3000, type:'civic', service:'health', radius:8, happiness:5, upkeep:110, color:'civic' },
  { id:'police', group:'Civic', name:'Police Post', ic:'\u{1F46E}', cost:2600, type:'civic', service:'police', radius:9, happiness:4, upkeep:95, color:'civic' },
  { id:'fire', group:'Civic', name:'Fire Station', ic:'\u{1F692}', cost:2400, type:'civic', service:'fire', radius:8, happiness:3, upkeep:85, color:'civic' },
  { id:'water', group:'Civic', name:'Water Tower', ic:'\u{1F4A7}', cost:1800, type:'civic', service:'water', radius:14, happiness:1, upkeep:40, color:'water' },
  { id:'power', group:'Civic', name:'Power Plant', ic:'\u{26A1}', cost:4500, type:'civic', service:'power', radius:16, happiness:-3, upkeep:60, pollution:8, color:'indu' },
  { id:'transit', group:'Civic', name:'Transit Hub', ic:'\u{1F68C}', cost:3200, type:'civic', service:'transit', radius:10, happiness:4, upkeep:120, trafficRelief:0.35, color:'civic' },
  { id:'landfill', group:'Civic', name:'Landfill', ic:'\u{1F5D1}\u{FE0F}', cost:1600, type:'civic', service:'sanitation', radius:12, happiness:-4, upkeep:50, pollution:5, color:'indu' },

  { id:'landmark', group:'Landmarks', name:'Heritage Site', ic:'\u{1F3DB}\u{FE0F}', cost:5000, type:'landmark', happiness:10, upkeep:60, color:'civic' },
];

const TOOL_GROUPS = ['Tools','Zoning','Civic','Landmarks'];

// Meridian-flavored heritage landmarks the player can build (capped, one each)
const LANDMARKS = [
  { key:'threefoot', name:'The Threefoot Building', ic:'\u{1F3E2}', desc:'A restored Art Deco tower anchoring downtown. Tourists love it.', happiness:14, tourism:18 },
  { key:'rileycenter', name:'Riley Performing Arts Center', ic:'\u{1F3AD}', desc:'A grand restored vaudeville theater hosting touring shows.', happiness:12, tourism:14 },
  { key:'carousel', name:'Highland Park Dentzel Carousel', ic:'\u{1F3A0}', desc:'A beautifully preserved antique carousel, beloved by kids and collectors.', happiness:16, tourism:10 },
  { key:'bonita', name:'Bonita Lakes Park', ic:'\u{1F3D6}\u{FE0F}', desc:'Trails, fishing, and a disc golf course around the lakes.', happiness:13, tourism:12 },
  { key:'msms', name:'Mississippi School for Math & Science', ic:'\u{1F52C}', desc:'A magnet for the state\'s brightest students. Boosts your school stats.', happiness:8, tourism:2, eduBoost:0.15 },
  { key:'depot', name:'Historic Union Station Depot', ic:'\u{1F686}', desc:'The old rail depot, restored as a transit and events hub.', happiness:10, tourism:8, trafficRelief:0.1 },
];

/* ---------------- ADVISOR NPC ROSTER ---------------- */
const ADVISORS = {
  treasurer: { name:'Eunice Caldwell', title:'City Treasurer', ic:'\u{1F4B0}' },
  planner:   { name:'Desmond Okafor', title:'Chief City Planner', ic:'\u{1F4D0}' },
  police:    { name:'Chief Roy Tannehill', title:'Police Chief', ic:'\u{1F46E}' },
  fire:      { name:'Chief Adelina Cruz', title:'Fire Chief', ic:'\u{1F692}' },
  health:    { name:'Dr. Patricia Boone', title:'Public Health Director', ic:'\u{2695}\u{FE0F}' },
  education: { name:'Marcus Webb', title:'Schools Superintendent', ic:'\u{1F393}' },
  pio:       { name:'Renee Fontaine', title:'Press Secretary', ic:'\u{1F4E2}' },
  enviro:    { name:'Hollis Greer', title:'Environmental Officer', ic:'\u{1F33F}' },
  chief:     { name:'Walter "Bo" Pruitt', title:'Chief of Staff', ic:'\u{1F454}' },
};

/* ---------------- ACHIEVEMENTS ---------------- */
const ACHIEVEMENTS = [
  { id:'first_road', name:'Paving the Way', desc:'Build your first road.', ic:'\u{1F6E3}' },
  { id:'pop_1000', name:'On the Map', desc:'Reach a population of 1,000.', ic:'\u{1F4CD}' },
  { id:'pop_10000', name:'Boomtown', desc:'Reach a population of 10,000.', ic:'\u{1F3D9}\u{FE0F}' },
  { id:'pop_50000', name:'Queen City', desc:'Reach a population of 50,000 \u2014 a nod to Meridian\u2019s old nickname.', ic:'\u{1F451}' },
  { id:'all_landmarks', name:'Heritage Trail Complete', desc:'Build every Meridian-inspired landmark.', ic:'\u{1F3DB}\u{FE0F}' },
  { id:'threefoot_restored', name:'Skyline Restored', desc:'Build the Threefoot Building.', ic:'\u{1F3E2}' },
  { id:'carousel_built', name:'Ride the Dentzel', desc:'Build the Highland Park Carousel.', ic:'\u{1F3A0}' },
  { id:'survive_tornado', name:'Battening Down', desc:'Survive a tornado warning event without casualties.', ic:'\u{1F32A}\u{FE0F}' },
  { id:'reelected', name:'Second Term', desc:'Win re-election.', ic:'\u{1F5F3}\u{FE0F}' },
  { id:'reelected_3', name:'Dynasty at City Hall', desc:'Win a third term as mayor.', ic:'\u{1F3DB}\u{FE0F}' },
  { id:'balanced_50', name:'Sound Fiscal Footing', desc:'Keep a balanced budget for 50 straight weeks.', ic:'\u{1F4D6}' },
  { id:'approval_90', name:'Beloved Hizzoner', desc:'Reach 90% approval rating.', ic:'\u{1F31F}' },
  { id:'approval_low', name:'Rough Week at the Office', desc:'Drop below 15% approval. Hang in there.', ic:'\u{1F61F}' },
  { id:'zero_crime', name:'Safest Streets in Mississippi', desc:'Reach a crime rate near zero with strong police coverage.', ic:'\u{1F6E1}\u{FE0F}' },
  { id:'green_city', name:'Green & Growing', desc:'Build 15 parks across the city.', ic:'\u{1F333}' },
  { id:'naacp_nod', name:'A City for Everyone', desc:'Maintain high approval across every district for 20 weeks.', ic:'\u{1F91D}' },
  { id:'first_bankruptcy', name:'Red Ink', desc:'Run out of money. It happens to the best of us.', ic:'\u{1F4C9}' },
  { id:'meridian_native', name:'Hometown Pride', desc:'Name your city Meridian (any spelling close enough counts).', ic:'\u{2B50}' },
  { id:'mr_pottery', name:'Y\u2019all Means All', desc:'Trigger five different random news events.', ic:'\u{1F4F0}' },
];

/* ---------------- EASTER EGG NEWS TICKER LINES (flavor, non-mechanical) ---------------- */
const FLAVOR_TICKER = [
  'Local diner reports record biscuit sales after city council meeting runs long.',
  'Meridian Heights Senior Bombers open practice; coach predicts a "scrappy" season.',
  'Sound check at the Riley Center underway ahead of Saturday\u2019s show.',
  'City crews report sighting of unusually large catfish near Bonita Lakes.',
  'Downtown merchants association renews push for more angled parking.',
  'Highland Park carousel operator says the calliope needs new sheet music.',
  'Weather service notes a humid week ahead \u2014 typical for this time of year.',
  'Threefoot Building elevator inspection completed without incident.',
  'Local radio station WMER celebrates another year on the air.',
  'City planner spotted measuring a vacant lot with a tape measure and great enthusiasm.',
  'Animal control reports a confused armadillo loose near the rail yard.',
  'Farmers market vendors request more shade tents for the summer.',
  'Historic preservation society applauds a quiet, uneventful week downtown.',
  'Local bakery debuts a new fried pie flavor; reviews are "cautiously optimistic."',
  'Crosstie Festival planning committee begins early scouting for vendors.',
];

const HEADER_EGG_NOTES = [
  'Meridian Heights was charted near the junction of two old rail lines \u2014 the city still leans on that crossroads identity.',
  'Local legend says the carousel calliope can be heard three blocks away on a still evening.',
  'The Threefoot Building once stood as the tallest building between Birmingham and New Orleans \u2014 at least that\u2019s how the story goes around here.',
];

/* ---------------- WORLD STATE ---------------- */
function freshGrid(){
  const g = [];
  for(let y=0;y<GRID_H;y++){
    const row=[];
    for(let x=0;x<GRID_W;x++){
      row.push({ t:'empty', dev:0, road:false, builtWeek:0, landmarkKey:null });
    }
    g.push(row);
  }
  return g;
}

const STATE = {
  started:false,
  mayorName:'',
  cityName:'Meridian Heights',
  diff:'normal',
  week:1, year:1, term:1, weekInTerm:1, termLength:208, // 4 years * 52 weeks
  speed:1, paused:false,
  treasury:25000,
  taxRate:{ res:8, com:9, ind:7 }, // percent
  approval:55,
  approvalByDistrict:{}, // computed
  population:0, jobs:0, unemployment:0,
  happinessFactors:{},
  crimeRate:20, pollution:10, trafficLoad:0,
  servicesCoverage:{ school:0, health:0, police:0, fire:0, water:0, power:0, transit:0, sanitation:0, park:0 },
  policies:{
    curfew:false, recycling:false, businessGrants:false, propertyTaxFreeze:false,
    overtime_police:false, schoolFunding:false, smokestackRules:false, festivalFunding:true,
  },
  grid: freshGrid(),
  landmarksBuilt:{},
  achievementsUnlocked:{},
  eventLog:[],
  balancedStreak:0,
  history:{ pop:[], treasury:[], approval:[] },
  electionsWon:0,
  pendingEvent:null,
  tickAccum:0,
  selectedTool:null,
  camX:0, camY:0,
  achTriggerCount:0,
  distinctEventsTriggered:{},
};

/* ============================================================
   RENDERING
   ============================================================ */
const canvas = document.getElementById('gridcanvas');
const ctx = canvas.getContext('2d');
const mapscroll = document.getElementById('mapscroll');
const hoverinfo = document.getElementById('hoverinfo');

const ZONE_COLORS = {
  res:{base:'#274a30', dev:['#33602f','#3f7a37','#4f9d3f','#5fbf4a']},
  com:{base:'#1f3d52', dev:['#235577','#2a6b96','#3a86b8','#4aa3da']},
  ind:{base:'#4a3320', dev:['#6b4622','#8a5826','#a86f2c','#c98a3a']},
};

function tileSize(){ return TILE_BASE * ZOOM; }

function resizeCanvas(){
  const ts = tileSize();
  canvas.width = GRID_W * ts;
  canvas.height = GRID_H * ts;
  drawGrid();
}

function colorForCell(cell){
  if(cell.road) return '#3a3f48';
  if(cell.t==='zone'){
    const c = ZONE_COLORS[cell.zoneKind];
    if(!c) return '#222';
    const lvl = Math.min(cell.dev,3);
    return cell.dev>0 ? c.dev[lvl] : c.base;
  }
  if(cell.t==='civic'){
    const def = TOOLS.find(t=>t.id===cell.toolId);
    return def ? `var(--${def.color})` : '#555';
  }
  if(cell.t==='landmark') return '#b08a3a';
  return null;
}

const VAR_CACHE = {};
function resolveVar(v){
  if(v.startsWith('var(')){
    const name = v.slice(4,-1);
    if(!VAR_CACHE[name]) VAR_CACHE[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return VAR_CACHE[name];
  }
  return v;
}

function drawGrid(){
  const ts = tileSize();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0f1420';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for(let y=0;y<GRID_H;y++){
    for(let x=0;x<GRID_W;x++){
      const cell = STATE.grid[y][x];
      const px = x*ts, py = y*ts;
      let col = colorForCell(cell);
      if(col){
        ctx.fillStyle = resolveVar(col);
        ctx.fillRect(px,py,ts-1,ts-1);
      } else {
        ctx.fillStyle = ((x+y)%2===0) ? '#121826' : '#0f1420';
        ctx.fillRect(px,py,ts-1,ts-1);
      }
      if(cell.road){
        ctx.fillStyle = '#5a5f68';
        ctx.fillRect(px+ts*0.35, py, ts*0.3, ts);
        ctx.fillRect(px, py+ts*0.35, ts, ts*0.3);
      }
      if(cell.t==='civic' || cell.t==='landmark'){
        const def = cell.t==='landmark' ? LANDMARKS.find(l=>l.key===cell.landmarkKey) : TOOLS.find(t=>t.id===cell.toolId);
        if(def && ts>=14){
          ctx.font = `${Math.floor(ts*0.6)}px sans-serif`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(def.ic, px+ts/2, py+ts/2+1);
        }
      } else if(cell.t==='zone' && cell.dev>0 && ts>=10){
        ctx.fillStyle='rgba(0,0,0,0.25)';
        const inset = ts*0.12;
        ctx.fillRect(px+inset,py+inset,ts-inset*2-1,ts-inset*2-1);
      }
    }
  }
  if(ts>=16){
    ctx.strokeStyle='rgba(255,255,255,0.04)';
    ctx.lineWidth=1;
    for(let x=0;x<=GRID_W;x++){ ctx.beginPath(); ctx.moveTo(x*ts,0); ctx.lineTo(x*ts,canvas.height); ctx.stroke(); }
    for(let y=0;y<=GRID_H;y++){ ctx.beginPath(); ctx.moveTo(0,y*ts); ctx.lineTo(canvas.width,y*ts); ctx.stroke(); }
  }
}

/* ============================================================
   GRID HELPERS
   ============================================================ */
function inBounds(x,y){ return x>=0 && y>=0 && x<GRID_W && y<GRID_H; }
function cellAt(x,y){ return inBounds(x,y) ? STATE.grid[y][x] : null; }
function hasAdjacentRoad(x,y){
  const offs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of offs){
    const c = cellAt(x+dx,y+dy);
    if(c && c.road) return true;
  }
  return false;
}
function distance(x1,y1,x2,y2){ return Math.sqrt((x1-x2)**2+(y1-y2)**2); }

/* ============================================================
   SERVICE COVERAGE CALCULATION
   ============================================================ */
function recomputeCoverage(){
  const cov = { school:0, health:0, police:0, fire:0, water:0, power:0, transit:0, sanitation:0, park:0 };
  const counts = { school:0, health:0, police:0, fire:0, water:0, power:0, transit:0, sanitation:0, park:0 };
  const civicCells = [];
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const cell = STATE.grid[y][x];
    if(cell.t==='civic'){
      const def = TOOLS.find(t=>t.id===cell.toolId);
      if(def && def.service){ civicCells.push({x,y,def}); counts[def.service] = (counts[def.service]||0)+1; }
    }
  }
  let devTiles=0;
  const coveredCount = { school:0, health:0, police:0, fire:0, water:0, power:0, transit:0, sanitation:0, park:0 };
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const cell = STATE.grid[y][x];
    if(cell.t==='zone' && cell.dev>0){
      devTiles++;
      for(const key of Object.keys(coveredCount)){
        const matching = civicCells.filter(c=>c.def.service===key);
        const covered = matching.some(c=>distance(c.x,c.y,x,y)<=c.def.radius);
        if(covered) coveredCount[key]++;
      }
    }
  }
  for(const key of Object.keys(cov)){
    cov[key] = devTiles>0 ? Math.round((coveredCount[key]/devTiles)*100) : (counts[key]>0?60:0);
  }
  STATE.servicesCoverage = cov;
  STATE._civicCounts = counts;
}

/* ============================================================
   GROWTH / ECONOMY SIMULATION (per tick = 1 week)
   ============================================================ */
function countZoneTiles(){
  let res=0,com=0,ind=0,resDev=0,comDev=0,indDev=0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t==='zone'){
      if(c.zoneKind==='res'){ res++; if(c.dev>0) resDev++; }
      if(c.zoneKind==='com'){ com++; if(c.dev>0) comDev++; }
      if(c.zoneKind==='ind'){ ind++; if(c.dev>0) indDev++; }
    }
  }
  return {res,com,ind,resDev,comDev,indDev};
}

function desirability(kind){
  let d = 50;
  const tax = STATE.taxRate[kind];
  d -= (tax-7)*3.2;
  d += (STATE.servicesCoverage.park||0)*0.12;
  d += (STATE.servicesCoverage.police||0)*0.08;
  d += (STATE.servicesCoverage.fire||0)*0.05;
  d -= STATE.pollution*0.5;
  d -= STATE.crimeRate*0.3;
  d -= Math.max(0,STATE.trafficLoad-40)*0.25;
  if(kind==='res'){ d += (STATE.servicesCoverage.school||0)*0.1; d += (STATE.servicesCoverage.health||0)*0.07; }
  if(kind==='com'){ d += STATE.population>0 ? Math.min(20, STATE.population/400) : 0; }
  if(kind==='ind'){ d -= (STATE.servicesCoverage.park||0)*0.05; d += 10; }
  if(STATE.policies.businessGrants && (kind==='com'||kind==='ind')) d += 8;
  if(STATE.policies.propertyTaxFreeze && kind==='res') d += 5;
  return Math.max(0, Math.min(100, d));
}

function growZones(){
  const desRes = desirability('res'), desCom = desirability('com'), desInd = desirability('ind');
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t!=='zone') continue;
    if(!hasAdjacentRoad(x,y)){
      if(c.dev>0 && Math.random()<0.04) c.dev = Math.max(0,c.dev-1);
      continue;
    }
    const des = c.zoneKind==='res'?desRes:c.zoneKind==='com'?desCom:desInd;
    const growChance = des/100 * 0.16;
    const shrinkChance = (1-des/100) * 0.05;
    if(c.dev < 3 && Math.random()<growChance) c.dev++;
    else if(c.dev > 0 && Math.random()<shrinkChance) c.dev--;
  }
}

function recomputePopulationAndEconomy(){
  let pop=0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t==='zone' && c.zoneKind==='res') pop += c.dev * 35;
  }
  let jobs=0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t==='zone' && c.zoneKind==='com') jobs += c.dev * 18;
    if(c.t==='zone' && c.zoneKind==='ind') jobs += c.dev * 22;
  }
  STATE.population = pop;
  STATE.jobs = jobs;
  STATE.unemployment = pop>0 ? Math.max(0, Math.min(60, Math.round(100 - (jobs/(pop/2.2+1))*100))) : 0;

  let roadTiles=0, devTiles=0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.road) roadTiles++;
    if(c.t==='zone' && c.dev>0) devTiles++;
  }
  let relief = STATE._civicCounts && STATE._civicCounts.transit ? Math.min(0.4, STATE._civicCounts.transit*0.12) : 0;
  if(STATE.landmarksBuilt.depot) relief += 0.1;
  const rawTraffic = roadTiles>0 ? (devTiles/roadTiles)*40 : (devTiles>0?80:0);
  STATE.trafficLoad = Math.max(0, Math.min(100, rawTraffic * (1-relief)));

  let pol=0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t==='zone' && c.zoneKind==='ind') pol += c.dev * 1.4;
    if(c.t==='civic'){
      const def = TOOLS.find(t=>t.id===c.toolId);
      if(def && def.pollution) pol += def.pollution;
    }
  }
  if(STATE.policies.recycling) pol *= 0.75;
  if(STATE.policies.smokestackRules) pol *= 0.7;
  // Parks act as green buffers \u2014 better park coverage trims pollution even with no policy active.
  const parkCoverage = STATE.servicesCoverage.park || 0;
  pol *= (1 - Math.min(0.3, parkCoverage*0.003));
  // Bonita Lakes Park (landmark) is a larger green space and gives a flat additional offset.
  if(STATE.landmarksBuilt.bonita) pol -= 4;
  STATE.pollution = Math.max(0, Math.min(100, Math.round(pol)));

  let crime = 35 - (STATE.servicesCoverage.police||0)*0.32 + STATE.unemployment*0.25;
  if(STATE.policies.curfew) crime -= 6;
  if(STATE.policies.overtime_police) crime -= 8;
  STATE.crimeRate = Math.max(0, Math.min(100, Math.round(crime)));
}

function recomputeApproval(){
  const diff = DIFFICULTIES[STATE.diff];
  let target = 50;
  target += (STATE.servicesCoverage.school||0)*0.08;
  target += (STATE.servicesCoverage.health||0)*0.07;
  target += (STATE.servicesCoverage.park||0)*0.07;
  target -= STATE.crimeRate*0.18;
  target -= STATE.pollution*0.12;
  target -= Math.max(0,STATE.trafficLoad-50)*0.15;
  target -= STATE.unemployment*0.25;
  target -= Math.max(0, (STATE.taxRate.res-9))*1.6;
  if(STATE.treasury<0) target -= 15;
  let landmarkBonus=0;
  for(const key in STATE.landmarksBuilt) if(STATE.landmarksBuilt[key]){
    const l = LANDMARKS.find(ll=>ll.key===key);
    if(l) landmarkBonus += l.happiness*0.3;
  }
  target += landmarkBonus;
  target += diff.approvalDrift*5;
  target = Math.max(2, Math.min(98, target));
  STATE.approval += (target-STATE.approval)*0.12;
  STATE.approval = Math.max(1, Math.min(99, STATE.approval));
}

function weeklyBudget(){
  let resIncome = 0, comIncome=0, indIncome=0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t==='zone'){
      if(c.zoneKind==='res') resIncome += c.dev * 6 * (STATE.taxRate.res/8);
      if(c.zoneKind==='com') comIncome += c.dev * 9 * (STATE.taxRate.com/9);
      if(c.zoneKind==='ind') indIncome += c.dev * 8 * (STATE.taxRate.ind/7);
    }
  }
  let income = resIncome+comIncome+indIncome;
  if(STATE.policies.festivalFunding) income += STATE.population>3000 ? 40 : 0;
  let tourismIncome = 0;
  for(const key in STATE.landmarksBuilt) if(STATE.landmarksBuilt[key]){
    const l = LANDMARKS.find(ll=>ll.key===key);
    if(l) tourismIncome += l.tourism*4;
  }
  income += tourismIncome;

  let upkeep = 0;
  for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
    const c = STATE.grid[y][x];
    if(c.t==='civic'){
      const def = TOOLS.find(t=>t.id===c.toolId);
      if(def) upkeep += def.upkeep;
    }
    if(c.t==='landmark') upkeep += 60;
    if(c.road) upkeep += 0.4;
  }
  if(STATE.policies.schoolFunding) upkeep += 60;
  if(STATE.policies.overtime_police) upkeep += 70;
  if(STATE.policies.businessGrants) upkeep += 50;

  const net = Math.round(income - upkeep);
  return { income:Math.round(income), upkeep:Math.round(upkeep), net, resIncome:Math.round(resIncome), comIncome:Math.round(comIncome), indIncome:Math.round(indIncome), tourismIncome:Math.round(tourismIncome) };
}

/* ============================================================
   RANDOM EVENTS (Meridian-flavored, with mechanical consequences)
   ============================================================ */
const EVENTS = [
  {
    id:'tornado_warning', weight:3, minWeek:4, crisis:true, achId:'survive_tornado',
    title:'Tornado Warning Issued', tag:'WEATHER ALERT',
    advisor:'fire',
    body:(s)=>`Chief Cruz: "${s.mayorName||'Mayor'}, the National Weather Service has a tornado warning out for the county. We need a call on sirens and shelters."`,
    choices:[
      { label:'Sound the sirens, open shelters ($800)', cost:800, effect:(s)=>{ s.approval+=3; logFlavor('City sirens wail across town as residents shelter in place \u2014 a familiar Mississippi spring ritual.'); } },
      { label:'Issue a phone alert only ($150)', cost:150, effect:(s)=>{ s.approval-=1; if(Math.random()<0.3){ s.approval-=8; logFlavor('Storm damage reported near the rail yard. Some residents say they never got the warning in time.'); } else { logFlavor('The storm passed just east of town. Close call.'); } } },
    ]
  },
  {
    id:'festival_request', weight:4, minWeek:2,
    title:'Crosstie Festival Funding Request', tag:'CITY EVENTS',
    advisor:'pio',
    body:(s)=>`Renee Fontaine: "The arts council wants city support for this year\u2019s Crosstie Arts Festival. It\u2019s good press, but it\u2019s not free."`,
    choices:[
      { label:'Fund it fully ($1,200)', cost:1200, effect:(s)=>{ s.approval+=5; logFlavor('The Crosstie Arts Festival draws a record crowd downtown, with vendors lined up past the old depot.'); } },
      { label:'Offer partial support ($400)', cost:400, effect:(s)=>{ s.approval+=2; } },
      { label:'Decline this year', cost:0, effect:(s)=>{ s.approval-=3; logFlavor('The arts council expresses disappointment, but promises to try again next year.'); } },
    ]
  },
  {
    id:'pothole_complaints', weight:5, minWeek:1,
    title:'Pothole Complaints Pile Up', tag:'PUBLIC WORKS',
    advisor:'chief',
    body:(s)=>`Bo Pruitt: "Phones are ringing off the hook about potholes on the main drag. Folks are not shy about letting us know."`,
    choices:[
      { label:'Emergency repair crew ($600)', cost:600, effect:(s)=>{ s.approval+=3; } },
      { label:'Add it to next quarter\u2019s docket', cost:0, effect:(s)=>{ s.approval-=2; } },
    ]
  },
  {
    id:'factory_offer', weight:3, minWeek:6,
    title:'Out-of-State Manufacturer Inquiry', tag:'ECONOMIC DEVELOPMENT',
    advisor:'planner',
    body:(s)=>`Desmond Okafor: "A manufacturer is scouting sites along the rail corridor. They want a tax abatement to set up shop here."`,
    choices:[
      { label:'Offer a 5-year abatement', cost:0, effect:(s)=>{ s.treasury-=2000; s.approval+=2; for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){const c=STATE.grid[y][x]; if(c.t==='zone'&&c.zoneKind==='ind'&&c.dev<3&&Math.random()<0.4) c.dev++;} logFlavor('A new manufacturer breaks ground near the rail corridor, promising dozens of jobs.'); } },
      { label:'Decline \u2014 protect the tax base', cost:0, effect:(s)=>{ s.approval-=1; } },
    ]
  },
  {
    id:'bonita_cleanup', weight:3, minWeek:5,
    title:'Bonita Lakes Cleanup Day', tag:'PARKS & RECREATION',
    advisor:'enviro',
    body:(s)=>`Hollis Greer: "Volunteers want to organize a lake cleanup at Bonita Lakes. A little city support goes a long way."`,
    choices:[
      { label:'Supply equipment & dumpsters ($350)', cost:350, effect:(s)=>{ s.approval+=3; s.pollution=Math.max(0,s.pollution-2); } },
      { label:'Let them organize on their own', cost:0, effect:(s)=>{} },
    ]
  },
  {
    id:'school_supplies', weight:4, minWeek:3,
    title:'Classroom Supply Shortage', tag:'EDUCATION',
    advisor:'education',
    body:(s)=>`Marcus Webb: "Teachers are buying their own supplies again this year. A small city grant would help a lot."`,
    choices:[
      { label:'Approve emergency grant ($500)', cost:500, effect:(s)=>{ s.approval+=3; } },
      { label:'Refer them to the district budget', cost:0, effect:(s)=>{ s.approval-=2; } },
    ]
  },
  {
    id:'crime_spike', weight:3, minWeek:5, crisis:true,
    title:'Uptick in Property Crime Downtown', tag:'PUBLIC SAFETY',
    advisor:'police',
    body:(s)=>`Chief Tannehill: "We\u2019ve had a string of break-ins downtown. I\u2019d like authorization for some overtime patrols."`,
    choices:[
      { label:'Authorize overtime patrols ($700)', cost:700, effect:(s)=>{ s.crimeRate=Math.max(0,s.crimeRate-10); s.approval+=2; } },
      { label:'Hold off on overtime', cost:0, effect:(s)=>{ s.crimeRate+=5; s.approval-=2; } },
    ]
  },
  {
    id:'water_main', weight:2, minWeek:8, crisis:true,
    title:'Water Main Break on Main Street', tag:'INFRASTRUCTURE',
    advisor:'treasurer',
    body:(s)=>`Eunice Caldwell: "A water main burst overnight. We can rush a repair crew, but it\u2019ll cost extra for the overtime."`,
    choices:[
      { label:'Rush repair crew ($1,500)', cost:1500, effect:(s)=>{ s.approval+=2; } },
      { label:'Standard repair schedule ($500)', cost:500, effect:(s)=>{ s.approval-=4; logFlavor('Residents near Main Street report low water pressure for most of the week.'); } },
      { label:'Crews patch it with what\u2019s on hand (no cost)', cost:0, effect:(s)=>{ s.approval-=7; s.pollution=Math.min(100,s.pollution+3); logFlavor('A makeshift patch job on Main Street holds, for now \u2014 residents are not thrilled.'); } },
    ]
  },
  {
    id:'state_grant', weight:2, minWeek:10, good:true,
    title:'State Infrastructure Grant Awarded', tag:'GOOD NEWS',
    advisor:'treasurer',
    body:(s)=>`Eunice Caldwell: "Good news \u2014 the state approved our infrastructure grant application. This is a nice cushion for the treasury."`,
    choices:[
      { label:'Accept the grant', cost:0, effect:(s)=>{ s.treasury+=3000; s.approval+=2; } },
    ]
  },
  {
    id:'heatwave', weight:3, minWeek:6,
    title:'Summer Heat Advisory', tag:'WEATHER ALERT',
    advisor:'health',
    body:(s)=>`Dr. Boone: "We\u2019re looking at a stretch of dangerous heat. I\u2019d like to open cooling centers for folks without reliable AC."`,
    choices:[
      { label:'Open cooling centers ($450)', cost:450, effect:(s)=>{ s.approval+=3; } },
      { label:'Issue a public advisory only (no cost)', cost:0, effect:(s)=>{ s.approval-=1; } },
    ]
  },
  {
    id:'armadillo', weight:2, minWeek:1, flavorOnly:true,
    title:'Armadillo Loose Near City Hall', tag:'LOCAL COLOR',
    advisor:'chief',
    body:(s)=>`Bo Pruitt: "Mayor, I need you to know that there is, in fact, an armadillo loose near City Hall. Animal control is on it. I just thought you should know."`,
    choices:[
      { label:'Note it and move on', cost:0, effect:(s)=>{ logFlavor('The armadillo is safely relocated. City Hall returns to normal business.'); } },
    ]
  },
  {
    id:'msms_recruit', weight:2, minWeek:12, good:true,
    title:'MSMS Recruiting Drive', tag:'EDUCATION',
    advisor:'education',
    body:(s)=>`Marcus Webb: "The Mississippi School for Math and Science wants to highlight Meridian Heights in their statewide recruiting materials. Good exposure for us."`,
    choices:[
      { label:'Welcome the spotlight', cost:0, effect:(s)=>{ s.approval+=4; } },
    ]
  },
];

function eligibleEvents(){
  return EVENTS.filter(e=> STATE.week>=e.minWeek );
}

function maybeTriggerEvent(){
  if(STATE.pendingEvent) return;
  const diff = DIFFICULTIES[STATE.diff];
  const baseChance = 0.16 * diff.eventMod;
  if(Math.random() > baseChance) return;
  const pool = eligibleEvents();
  if(pool.length===0) return;
  const totalWeight = pool.reduce((a,e)=>a+e.weight,0);
  let r = Math.random()*totalWeight;
  let chosen = pool[0];
  for(const e of pool){ if(r<e.weight){ chosen=e; break;} r-=e.weight; }
  showEvent(chosen);
}

function showEvent(ev){
  STATE.pendingEvent = ev;
  STATE.distinctEventsTriggered[ev.id] = true;
  const distinctCount = Object.keys(STATE.distinctEventsTriggered).length;
  if(distinctCount>=5) unlockAchievement('mr_pottery');
  const adv = ADVISORS[ev.advisor];
  document.getElementById('flash-tag').textContent = ev.tag || (ev.crisis?'CRISIS':'CITY HALL');
  document.getElementById('flash-tag').className = 'flash-tag' + (ev.good?' good':'');
  document.getElementById('flash-title').textContent = ev.title;
  document.getElementById('flash-body').innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:6px;"><span style="font-size:22px;">${adv?adv.ic:'\u{1F4DD}'}</span><span>${ev.body(STATE)}</span></div>`;
  const choicesEl = document.getElementById('flash-choices');
  choicesEl.innerHTML = '';
  ev.choices.forEach(choice=>{
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.style.cssText = 'background:var(--ink-3);border:1px solid var(--ink-3);color:var(--paper);border-radius:6px;padding:9px 10px;text-align:left;width:100%;margin-bottom:7px;font-size:12.5px;';
    const tooExpensive = choice.cost && choice.cost>STATE.treasury;
    btn.innerHTML = `${choice.label}` + (choice.cost ? `<div class="ev-cost">Cost: $${choice.cost.toLocaleString()}${tooExpensive?' \u2014 will put treasury into debt':''}</div>` : '');
    btn.onclick = ()=>{
      // Going into debt is allowed (mirrors how weekly budget deficits already work) so the
      // modal can never trap the player with no affordable option.
      if(choice.cost) STATE.treasury -= choice.cost;
      choice.effect(STATE);
      if(ev.achId) unlockAchievement(ev.achId);
      closeModal('newsflash');
      STATE.pendingEvent = null;
      refreshUI();
    };
    choicesEl.appendChild(btn);
  });
  // Emergency escape valve: always available, costs only approval, guarantees the modal
  // can be dismissed even if every scripted choice were somehow unaffordable or broken.
  const skipBtn = document.createElement('button');
  skipBtn.className = 'choice';
  skipBtn.style.cssText = 'background:transparent;border:1px dashed var(--ink-3);color:var(--slate);border-radius:6px;padding:7px 10px;text-align:left;width:100%;font-size:11.5px;';
  skipBtn.innerHTML = 'Table this for now (small approval hit)';
  skipBtn.onclick = ()=>{
    STATE.approval = Math.max(1, STATE.approval-1.5);
    closeModal('newsflash');
    STATE.pendingEvent = null;
    refreshUI();
  };
  choicesEl.appendChild(skipBtn);
  openModal('newsflash');
}

function logFlavor(text){
  STATE.eventLog.unshift({week:STATE.week, text});
  if(STATE.eventLog.length>40) STATE.eventLog.pop();
  addTickerItem(text);
}

/* ============================================================
   TICKER (signature element)
   ============================================================ */
let tickerItems = [];
function addTickerItem(text){
  tickerItems.push(text);
  if(tickerItems.length>20) tickerItems.shift();
  renderTicker();
}
function renderTicker(){
  const track = document.getElementById('ticker-track');
  track.innerHTML = '';
  const items = tickerItems.length ? tickerItems : ['Welcome to Meridian Heights. All systems nominal.'];
  // duplicate list for seamless scroll feel (simple approach: just lay out, CSS animation optional)
  items.concat(items).forEach(t=>{
    const d = document.createElement('div');
    d.className='ticker-item';
    d.textContent = t;
    track.appendChild(d);
  });
}
let tickerOffset = 0;
function animateTicker(){
  const track = document.getElementById('ticker-track');
  if(track.scrollWidth>0){
    tickerOffset -= 0.6;
    if(Math.abs(tickerOffset) > track.scrollWidth/2) tickerOffset = 0;
    track.style.transform = `translateX(${tickerOffset}px)`;
  }
  requestAnimationFrame(animateTicker);
}

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
function unlockAchievement(id){
  if(STATE.achievementsUnlocked[id]) return;
  STATE.achievementsUnlocked[id] = true;
  const ach = ACHIEVEMENTS.find(a=>a.id===id);
  if(ach) flashEgg(ach.ic, `<b>Award Unlocked: ${ach.name}</b>${ach.desc}`);
}

function checkAchievements(){
  if(STATE.population>=1000) unlockAchievement('pop_1000');
  if(STATE.population>=10000) unlockAchievement('pop_10000');
  if(STATE.population>=50000) unlockAchievement('pop_50000');
  if(STATE.approval>=90) unlockAchievement('approval_90');
  if(STATE.approval<=15) unlockAchievement('approval_low');
  if(STATE.treasury<0) unlockAchievement('first_bankruptcy');
  if(STATE.crimeRate<=5 && (STATE.servicesCoverage.police||0)>=70) unlockAchievement('zero_crime');
  let parkCount=0;
  for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++) if(STATE.grid[y][x].toolId==='park') parkCount++;
  if(parkCount>=15) unlockAchievement('green_city');
  const allBuilt = LANDMARKS.every(l=>STATE.landmarksBuilt[l.key]);
  if(allBuilt) unlockAchievement('all_landmarks');
  if(STATE.landmarksBuilt.threefoot) unlockAchievement('threefoot_restored');
  if(STATE.landmarksBuilt.carousel) unlockAchievement('carousel_built');
  const nameLower = (STATE.cityName||'').toLowerCase();
  if(nameLower.includes('meridian')) unlockAchievement('meridian_native');
  const b = weeklyBudget();
  if(b.net + STATE.treasury >= 0 && b.net>=-50) STATE.balancedStreak++; else STATE.balancedStreak=0;
  if(STATE.balancedStreak>=50) unlockAchievement('balanced_50');
}

/* ============================================================
   GAME LOOP (1 tick = 1 week)
   ============================================================ */
function tickWeek(){
  recomputeCoverage();
  growZones();
  recomputePopulationAndEconomy();
  recomputeApproval();
  const b = weeklyBudget();
  STATE.treasury += b.net;
  STATE._lastBudget = b;

  STATE.week++;
  STATE.weekInTerm++;
  if(STATE.week % 52 === 1 && STATE.week>1) STATE.year++;

  maybeTriggerEvent();
  checkAchievements();

  if(STATE.weekInTerm > STATE.termLength){
    runElection();
  }
  refreshUI();
}

function runElection(){
  STATE.paused = true;
  const approvalFactor = STATE.approval;
  const win = approvalFactor >= 42 + Math.random()*16;
  document.getElementById('elect-tag').textContent = 'ELECTION NIGHT';
  if(win){
    STATE.electionsWon++;
    STATE.term++;
    STATE.weekInTerm = 1;
    document.getElementById('elect-title').textContent = 'Re-Elected, Mayor!';
    document.getElementById('elect-body').textContent = `With ${Math.round(STATE.approval)}% approval going into election day, the voters of ${STATE.cityName} have returned you to office for term ${STATE.term}. Chief of Staff Pruitt says the victory party at the Threefoot lobby is "tasteful, but not subtle."`;
    unlockAchievement('reelected');
    if(STATE.electionsWon>=3) unlockAchievement('reelected_3');
  } else {
    document.getElementById('elect-title').textContent = 'Election Defeat';
    document.getElementById('elect-body').textContent = `After a hard-fought term, the voters of ${STATE.cityName} have chosen a new direction. You may continue managing the city in a caretaker capacity, but the headlines are not kind this morning.`;
  }
  openModal('electionmodal');
}

/* ============================================================
   UI: TOP STATS
   ============================================================ */
function fmtMoney(n){
  const neg = n<0;
  const v = Math.abs(Math.round(n));
  return (neg?'-$':'$') + v.toLocaleString();
}

function refreshTopStats(){
  document.getElementById('stat-treasury').textContent = fmtMoney(STATE.treasury);
  document.getElementById('stat-treasury').className = 'val' + (STATE.treasury<0?' bad':STATE.treasury<3000?' warn':'');
  document.getElementById('stat-pop').textContent = STATE.population.toLocaleString();
  document.getElementById('stat-approval').textContent = Math.round(STATE.approval)+'%';
  document.getElementById('stat-approval').className = 'val' + (STATE.approval>=60?' good':STATE.approval<35?' bad':' warn');
  const net = STATE._lastBudget ? STATE._lastBudget.net : 0;
  document.getElementById('stat-net').textContent = (net>=0?'+':'') + fmtMoney(net);
  document.getElementById('stat-net').className = 'val' + (net>=0?' good':' bad');
  document.getElementById('stat-unemp').textContent = STATE.unemployment+'%';
  document.getElementById('stat-unemp').className = 'val' + (STATE.unemployment>15?' bad':STATE.unemployment>8?' warn':' good');
  document.getElementById('date-main').textContent = `Week ${STATE.weekInTerm}, Year ${STATE.year}`;
  document.getElementById('term-line').textContent = `Term ${STATE.term} \u00b7 Week ${STATE.weekInTerm} of ${STATE.termLength}`;
  document.getElementById('cityname').childNodes[0].textContent = STATE.cityName.toUpperCase() + ' ';
  document.getElementById('mayorline').textContent = STATE.mayorName ? `Mayor ${STATE.mayorName}` : 'Office of the Mayor';
}

/* ============================================================
   UI: TOOLBAR
   ============================================================ */
function buildToolbar(){
  const tb = document.getElementById('toolbar');
  tb.innerHTML = '';
  TOOL_GROUPS.forEach(group=>{
    const label = document.createElement('div');
    label.className='tool-group-label';
    label.textContent = group;
    tb.appendChild(label);
    TOOLS.filter(t=>t.group===group).forEach(t=>{
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.id = 'tool-'+t.id;
      btn.innerHTML = `<span class="ic">${t.ic}</span><span>${t.name}</span>` + (t.cost?`<span class="cost">$${t.cost}</span>`:'<span class="cost">&nbsp;</span>');
      btn.onclick = ()=> selectTool(t.id);
      tb.appendChild(btn);
    });
    if(group==='Landmarks'){
      const note = document.createElement('div');
      note.className='smallnote';
      note.style.padding='4px';
      note.textContent = 'Each heritage site can be built once. Pick a spot and place it like any building.';
      tb.appendChild(note);
    }
  });
}

function selectTool(id){
  STATE.selectedTool = STATE.selectedTool===id ? null : id;
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('selected'));
  if(STATE.selectedTool){
    const el = document.getElementById('tool-'+STATE.selectedTool);
    if(el) el.classList.add('selected');
  }
}

/* ============================================================
   PLACEMENT LOGIC
   ============================================================ */
let pendingLandmarkChoice = null;

function tryPlace(x,y){
  if(!STATE.selectedTool) return;
  const tool = TOOLS.find(t=>t.id===STATE.selectedTool);
  const cell = cellAt(x,y);
  if(!cell) return;

  if(tool.id==='bulldoze'){
    if(cell.t==='empty' && !cell.road) return;
    const refund = 0;
    cell.t='empty'; cell.dev=0; cell.road=false; cell.toolId=null; cell.zoneKind=null; cell.landmarkKey=null;
    recomputeCoverage();
    drawGrid();
    return;
  }

  if(tool.type==='road'){
    if(STATE.treasury<tool.cost){ flashEgg('\u{1F4B8}','Not enough in the treasury for that.'); return; }
    if(cell.road) return;
    STATE.treasury -= tool.cost;
    cell.road = true; cell.t = cell.t==='zone'?cell.t:'empty';
    if(!STATE.achievementsUnlocked.first_road) unlockAchievement('first_road');
    drawGrid(); refreshTopStats();
    return;
  }

  if(tool.type==='zone'){
    if(cell.road || cell.t==='civic' || cell.t==='landmark') return;
    if(STATE.treasury<tool.cost){ flashEgg('\u{1F4B8}','Not enough in the treasury for that.'); return; }
    STATE.treasury -= tool.cost;
    cell.t='zone'; cell.zoneKind=tool.zoneKind; cell.dev=0; cell.toolId=null; cell.landmarkKey=null;
    drawGrid(); refreshTopStats();
    return;
  }

  if(tool.type==='civic'){
    if(cell.road || cell.t==='zone' || cell.t==='civic' || cell.t==='landmark') return;
    if(STATE.treasury<tool.cost){ flashEgg('\u{1F4B8}','Not enough in the treasury for that.'); return; }
    STATE.treasury -= tool.cost;
    cell.t='civic'; cell.toolId=tool.id; cell.landmarkKey=null;
    recomputeCoverage();
    drawGrid(); refreshTopStats(); renderSidePanel();
    return;
  }

  if(tool.type==='landmark'){
    if(cell.road || cell.t==='zone' || cell.t==='civic' || cell.t==='landmark') return;
    openLandmarkPicker(x,y);
    return;
  }
}

function openLandmarkPicker(x,y){
  const available = LANDMARKS.filter(l=>!STATE.landmarksBuilt[l.key]);
  if(available.length===0){ flashEgg('\u{1F3DB}\u{FE0F}','Every heritage site is already built! Meridian Heights\u2019 heritage trail is complete.'); return; }
  const overlay = document.getElementById('newsflash');
  document.getElementById('flash-tag').textContent = 'HERITAGE SITE';
  document.getElementById('flash-tag').className = 'flash-tag achieve';
  document.getElementById('flash-title').textContent = 'Choose a Landmark to Build';
  document.getElementById('flash-body').textContent = 'Each heritage site is a one-of-a-kind boost to tourism and approval. Pick one to build on this tile (cost: $5,000).';
  const choicesEl = document.getElementById('flash-choices');
  choicesEl.innerHTML = '';
  available.forEach(l=>{
    const btn = document.createElement('button');
    btn.className='choice';
    btn.style.cssText = 'background:var(--ink-3);border:1px solid var(--ink-3);color:var(--paper);border-radius:6px;padding:9px 10px;text-align:left;width:100%;margin-bottom:7px;font-size:12.5px;';
    btn.innerHTML = `${l.ic} <b>${l.name}</b><div class="ev-cost">${l.desc}</div>`;
    btn.onclick = ()=>{
      if(STATE.treasury<5000){ flashEgg('\u{1F4B8}','Not enough in the treasury for that.'); return; }
      STATE.treasury -= 5000;
      const cell = cellAt(x,y);
      cell.t='landmark'; cell.landmarkKey=l.key;
      STATE.landmarksBuilt[l.key]=true;
      logFlavor(`${l.name} officially opens to the public. ${l.desc}`);
      closeModal('newsflash');
      drawGrid(); refreshTopStats(); checkAchievements();
    };
    choicesEl.appendChild(btn);
  });
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'choice';
  cancelBtn.style.cssText = 'background:transparent;border:1px dashed var(--ink-3);color:var(--slate);border-radius:6px;padding:7px 10px;text-align:left;width:100%;font-size:11.5px;';
  cancelBtn.innerHTML = 'Cancel';
  cancelBtn.onclick = ()=>{ closeModal('newsflash'); };
  choicesEl.appendChild(cancelBtn);
  openModal('newsflash');
}

/* ============================================================
   CANVAS INPUT (click + drag paint + pan + zoom)
   ============================================================ */
let isPainting = false;
let isPanning = false;
let panStart = {x:0,y:0,sx:0,sy:0};

function canvasCoordsFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left);
  const cy = (e.clientY - rect.top);
  const ts = tileSize();
  return { x: Math.floor(cx/ts), y: Math.floor(cy/ts) };
}

canvas.addEventListener('mousedown', (e)=>{
  if(e.button===1 || e.button===2){
    isPanning = true;
    panStart = {x:e.clientX, y:e.clientY, sx:mapscroll.scrollLeft, sy:mapscroll.scrollTop};
    return;
  }
  if(!STATE.selectedTool) return;
  isPainting = true;
  const {x,y} = canvasCoordsFromEvent(e);
  tryPlace(x,y);
});
window.addEventListener('mouseup', ()=>{ isPainting=false; isPanning=false; });
canvas.addEventListener('mousemove', (e)=>{
  const {x,y} = canvasCoordsFromEvent(e);
  if(isPainting && STATE.selectedTool && (TOOLS.find(t=>t.id===STATE.selectedTool).type==='zone' || TOOLS.find(t=>t.id===STATE.selectedTool).type==='road' || STATE.selectedTool==='bulldoze')){
    tryPlace(x,y);
  }
  if(isPanning){
    mapscroll.scrollLeft = panStart.sx - (e.clientX-panStart.x);
    mapscroll.scrollTop = panStart.sy - (e.clientY-panStart.y);
    return;
  }
  showHoverInfo(e,x,y);
});
canvas.addEventListener('mouseleave', ()=>{ hoverinfo.style.display='none'; });
canvas.addEventListener('contextmenu', (e)=>e.preventDefault());

function showHoverInfo(e,x,y){
  const cell = cellAt(x,y);
  if(!cell){ hoverinfo.style.display='none'; return; }
  let title='Empty Lot', detail='';
  if(cell.road){ title='Road'; }
  else if(cell.t==='zone'){
    const names={res:'Residential',com:'Commercial',ind:'Industrial'};
    title = names[cell.zoneKind] + ' Zone';
    detail = cell.dev>0 ? `Development level ${cell.dev}/3` : 'Undeveloped \u2014 needs road access';
  } else if(cell.t==='civic'){
    const def = TOOLS.find(t=>t.id===cell.toolId);
    title = def.name; detail = `Upkeep: $${def.upkeep}/wk`;
  } else if(cell.t==='landmark'){
    const l = LANDMARKS.find(ll=>ll.key===cell.landmarkKey);
    title = l.name; detail = l.desc;
  }
  hoverinfo.innerHTML = `<div class="h-title">${title}</div>${detail}`;
  hoverinfo.style.display='block';
  const wrapRect = document.getElementById('mapwrap').getBoundingClientRect();
  hoverinfo.style.left = Math.min(wrapRect.width-230, e.clientX-wrapRect.left+14)+'px';
  hoverinfo.style.top = Math.max(4, e.clientY-wrapRect.top-10)+'px';
}

document.getElementById('zoom-in').onclick = ()=>{ ZOOM=Math.min(2.2,ZOOM+0.2); resizeCanvas(); };
document.getElementById('zoom-out').onclick = ()=>{ ZOOM=Math.max(0.5,ZOOM-0.2); resizeCanvas(); };
document.getElementById('zoom-reset').onclick = ()=>{ ZOOM=1; resizeCanvas(); };

/* ============================================================
   MODALS / TOASTS
   ============================================================ */
function openModal(id){ document.getElementById(id).classList.remove('hidden'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); }

let eggTimeout=null;
function flashEgg(icon, html){
  const t = document.getElementById('eggtoast');
  t.querySelector('.egg-ic').textContent = icon;
  t.querySelector('.egg-t').innerHTML = html;
  t.classList.add('show');
  clearTimeout(eggTimeout);
  eggTimeout = setTimeout(()=>t.classList.remove('show'), 4200);
}

/* ============================================================
   SIDE PANEL TABS
   ============================================================ */
let activeTab = 'advisors';

function setTab(tab){
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  renderSidePanel();
}
document.querySelectorAll('.tab-btn').forEach(b=> b.onclick = ()=> setTab(b.dataset.tab) );

function advisorAdvice(){
  // Generates contextual advice lines per advisor based on current state
  const lines = [];
  const cov = STATE.servicesCoverage;
  lines.push({ key:'chief', text:`Approval sits at <b>${Math.round(STATE.approval)}%</b>. ${STATE.approval<35?'Folks are getting restless \u2014 maybe a quick win is in order.':STATE.approval>70?'You\u2019re riding high right now. Keep it up.':'Steady as she goes.'}` });
  lines.push({ key:'treasurer', text:`Treasury stands at <b>${fmtMoney(STATE.treasury)}</b>, net <b>${STATE._lastBudget?fmtMoney(STATE._lastBudget.net):'$0'}</b>/week. ${STATE.treasury<2000?'I\u2019d hold off on big projects until we build a cushion.':'We have room to invest if you want to.'}` });
  lines.push({ key:'planner', text:`${(cov.school||0)<40 && STATE.population>500 ? 'Residential growth is outpacing school capacity \u2014 consider another school.' : 'Zoning and road connectivity look reasonable right now.'}` });
  lines.push({ key:'police', text:`Crime rate reads <b>${STATE.crimeRate}</b>. ${STATE.crimeRate>40?'I could use another Police Post or some overtime funding.':'Patrol coverage is holding steady.'}` });
  lines.push({ key:'fire', text:`${(cov.fire||0)<40 && STATE.population>800 ? 'Fire coverage is thin in the newer districts. A station would help response times.' : 'Response times look acceptable across most of the city.'}` });
  lines.push({ key:'health', text:`${(cov.health||0)<40 && STATE.population>1000 ? 'We\u2019re short on clinic coverage for a city this size.' : 'Public health indicators are stable.'}` });
  lines.push({ key:'education', text:`${(cov.school||0)<50 && STATE.population>500 ? 'I\u2019d like to talk about another school when the budget allows.' : 'Enrollment and capacity are roughly in balance.'}` });
  lines.push({ key:'enviro', text:`Pollution index: <b>${STATE.pollution}</b>. ${STATE.pollution>40?'Recycling or smokestack rules would help, but so would more parks near the industrial side of town \u2014 or just thinning out the densest industrial blocks.':'Air and water quality look fine for now.'}` });
  lines.push({ key:'pio', text:`${STATE.population>3000 && !STATE.landmarksBuilt.threefoot ? 'A restored landmark like the Threefoot Building would make for a great press story.' : 'Press coverage has been fairly quiet this week.'}` });
  return lines;
}

function renderAdvisorsTab(){
  const el = document.getElementById('panelcontent');
  let html = '<div class="section-title">Staff Briefing</div>';
  const advice = advisorAdvice();
  advice.forEach(item=>{
    const a = ADVISORS[item.key];
    html += `<div class="advisor-card"><div class="advisor-portrait">${a.ic}</div><div class="advisor-body"><div class="advisor-name">${a.name}</div><div class="advisor-title">${a.title}</div><div class="advisor-msg">${item.text}</div></div></div>`;
  });
  el.innerHTML = html;
}

function renderBudgetTab(){
  const el = document.getElementById('panelcontent');
  const b = STATE._lastBudget || weeklyBudget();
  let html = '<div class="section-title">Tax Rates</div>';
  ['res','com','ind'].forEach(k=>{
    const names={res:'Residential',com:'Commercial',ind:'Industrial'};
    html += `<div class="ledger-row"><span>${names[k]} (%)</span><span style="display:flex;align-items:center;gap:6px;">
      <button class="speedbtn" style="width:22px;height:22px;font-size:11px;" data-taxdown="${k}">&minus;</button>
      <b>${STATE.taxRate[k]}%</b>
      <button class="speedbtn" style="width:22px;height:22px;font-size:11px;" data-taxup="${k}">+</button>
    </span></div>`;
  });
  html += '<div class="section-title">Weekly Ledger</div>';
  html += `<div class="ledger-row"><span>Residential tax</span><span class="pos">+${b.resIncome}</span></div>`;
  html += `<div class="ledger-row"><span>Commercial tax</span><span class="pos">+${b.comIncome}</span></div>`;
  html += `<div class="ledger-row"><span>Industrial tax</span><span class="pos">+${b.indIncome}</span></div>`;
  html += `<div class="ledger-row"><span>Tourism revenue</span><span class="pos">+${b.tourismIncome}</span></div>`;
  html += `<div class="ledger-row"><span>Services upkeep</span><span class="neg">-${b.upkeep}</span></div>`;
  html += `<div class="ledger-row total"><span>Net this week</span><span class="${b.net>=0?'pos':'neg'}">${b.net>=0?'+':''}${b.net}</span></div>`;
  html += `<div class="section-title">Treasury</div>`;
  html += `<div class="ledger-row total"><span>Current balance</span><span class="${STATE.treasury>=0?'pos':'neg'}">${fmtMoney(STATE.treasury)}</span></div>`;
  el.innerHTML = html;
  el.querySelectorAll('[data-taxup]').forEach(b2=> b2.onclick=()=>{ const k=b2.dataset.taxup; STATE.taxRate[k]=Math.min(20,STATE.taxRate[k]+1); renderSidePanel(); });
  el.querySelectorAll('[data-taxdown]').forEach(b2=> b2.onclick=()=>{ const k=b2.dataset.taxdown; STATE.taxRate[k]=Math.max(0,STATE.taxRate[k]-1); renderSidePanel(); });
}

function barRow(label, val, color){
  return `<div class="barline"><div class="blabel">${label}</div><div class="btrack"><div class="bfill" style="width:${val}%;background:${color};"></div></div><div class="bval">${val}%</div></div>`;
}

function renderCityTab(){
  const el = document.getElementById('panelcontent');
  const cov = STATE.servicesCoverage;
  let html = '<div class="section-title">City Vitals</div>';
  html += barRow('Crime', STATE.crimeRate, STATE.crimeRate>50?'var(--bad)':STATE.crimeRate>25?'var(--warn)':'var(--good)');
  html += barRow('Pollution', STATE.pollution, STATE.pollution>50?'var(--bad)':STATE.pollution>25?'var(--warn)':'var(--good)');
  html += barRow('Traffic', Math.round(STATE.trafficLoad), STATE.trafficLoad>60?'var(--bad)':STATE.trafficLoad>35?'var(--warn)':'var(--good)');
  html += barRow('Unemployment', STATE.unemployment, STATE.unemployment>20?'var(--bad)':STATE.unemployment>10?'var(--warn)':'var(--good)');
  html += '<div class="section-title">Service Coverage</div>';
  html += barRow('Schools', cov.school||0, 'var(--civic)');
  html += barRow('Health', cov.health||0, 'var(--civic)');
  html += barRow('Police', cov.police||0, 'var(--civic)');
  html += barRow('Fire', cov.fire||0, 'var(--civic)');
  html += barRow('Water', cov.water||0, 'var(--water)');
  html += barRow('Power', cov.power||0, 'var(--indu)');
  html += barRow('Transit', cov.transit||0, 'var(--civic)');
  html += barRow('Sanitation', cov.sanitation||0, 'var(--indu)');
  html += barRow('Parks', cov.park||0, 'var(--park)');
  html += '<div class="section-title">Heritage Trail</div>';
  LANDMARKS.forEach(l=>{
    const built = STATE.landmarksBuilt[l.key];
    html += `<div class="ledger-row"><span>${l.ic} ${l.name}</span><span style="color:${built?'var(--good)':'var(--slate-dim)'}">${built?'Built':'Not built'}</span></div>`;
  });
  const note = HEADER_EGG_NOTES[Math.floor(STATE.week/8)%HEADER_EGG_NOTES.length];
  html += `<div class="smallnote">${note}</div>`;
  el.innerHTML = html;
}

function policyRow(key, name, desc){
  const on = STATE.policies[key];
  return `<div class="policy-row"><div class="policy-name">${name}<div class="policy-desc">${desc}</div></div><div class="toggle ${on?'on':''}" data-policy="${key}"></div></div>`;
}

function renderPolicyTab(){
  const el = document.getElementById('panelcontent');
  let html = '<div class="section-title">Ordinances & Programs</div>';
  html += policyRow('curfew','Youth Curfew','Reduces crime slightly; some residents dislike it.');
  html += policyRow('recycling','Curbside Recycling','Cuts pollution; modest upkeep cost.');
  html += policyRow('businessGrants','Small Business Grants','Boosts commercial & industrial desirability; costs $50/wk.');
  html += policyRow('propertyTaxFreeze','Property Tax Freeze','Residents love it; slightly limits revenue growth.');
  html += policyRow('overtime_police','Police Overtime Program','Cuts crime further; costs $70/wk.');
  html += policyRow('schoolFunding','Extra School Funding','Improves education outcomes; costs $60/wk.');
  html += policyRow('smokestackRules','Smokestack Emission Rules','Cuts industrial pollution; industry grumbles a little.');
  html += policyRow('festivalFunding','City Festival Sponsorships','Modest tourism income once the city has some size.');
  el.innerHTML = html;
  el.querySelectorAll('[data-policy]').forEach(t=>{
    t.onclick = ()=>{
      const key = t.dataset.policy;
      STATE.policies[key] = !STATE.policies[key];
      renderPolicyTab();
      refreshTopStats();
    };
  });
}

function renderAchievementsTab(){
  const el = document.getElementById('panelcontent');
  let html = '<div class="section-title">Mayoral Awards</div>';
  ACHIEVEMENTS.forEach(a=>{
    const unlocked = STATE.achievementsUnlocked[a.id];
    html += `<div class="ach-card ${unlocked?'':'locked'}"><div class="ach-icon">${a.ic}</div><div><div class="ach-name">${a.name}</div><div class="ach-desc">${unlocked?a.desc:'???'}</div></div></div>`;
  });
  el.innerHTML = html;
}

function renderHelpTab(){
  const el = document.getElementById('panelcontent');
  let html = '';

  html += `<div class="section-title">How to Play</div>`;
  html += `<div class="help-block">
    <p>You\u2019re the mayor of ${STATE.cityName}. Pick tools on the left, then click (or click-and-drag) tiles on the map to build. Time passes automatically \u2014 use the speed buttons in the top bar to pause, or run things faster once you\u2019re comfortable.</p>
  </div>`;

  html += `<div class="section-title">Tax Rates \u2014 How Fast Do They Work?</div>`;
  html += `<div class="help-block">
    <p>Tax changes take effect <b>immediately</b> \u2014 there\u2019s no delay. The very next week\u2019s budget uses whatever rate you just set, and it also immediately changes how attractive new development is.</p>
    <p>That said, the <i>visible</i> effects play out over time: raising taxes doesn\u2019t shrink existing buildings overnight, but it does make zones less likely to grow further (and slightly more likely to decay) from that week forward. Likewise, lowering taxes doesn\u2019t cause instant growth \u2014 it just improves the odds each week going forward.</p>
    <p>Rule of thumb: small, steady tax rates (roughly 6\u201310%) tend to keep growth healthy. Pushing rates much above 12\u201314% will choke off new development even if your budget looks better in the short term.</p>
  </div>`;

  html += `<div class="section-title">What To Watch Each Week</div>`;
  html += `<div class="help-priority"><span class="hp-num">1</span><div><b>Net /wk</b> in the top bar. If it\u2019s red for several weeks running, you\u2019re heading toward debt \u2014 either raise taxes slightly, slow down on new civic buildings, or grow your commercial/industrial tax base.</div></div>`;
  html += `<div class="help-priority"><span class="hp-num">2</span><div><b>Unemployment</b> (top bar / City tab). High unemployment quietly drags down approval and pushes crime up. It usually means you have more housing than jobs \u2014 zone more commercial and industrial, not more residential.</div></div>`;
  html += `<div class="help-priority"><span class="hp-num">3</span><div><b>Approval</b>. This is your re-election lifeline and it moves slowly on purpose \u2014 it drifts toward a "target" each week rather than jumping, so don\u2019t panic over one bad week. Sustained problems (crime, pollution, traffic, unemployment, high taxes) are what really hurt it over time.</div></div>`;
  html += `<div class="help-priority"><span class="hp-num">4</span><div><b>Service coverage</b> (City tab). If population is growing faster than your schools/clinics/police coverage, build more \u2014 coverage is based on how many <i>developed</i> zone tiles fall within a building\u2019s radius, not just whether you have one somewhere in town.</div></div>`;

  html += `<div class="section-title">Zoning Basics</div>`;
  html += `<div class="help-block"><ul>
    <li><b>Every zoned tile needs adjacent road</b> to grow. No road touching it, and it'll stall or even decay.</li>
    <li><b>Residential</b> growth responds most to low crime, parks, schools, and clinics.</li>
    <li><b>Commercial</b> growth responds most to nearby population (it needs customers).</li>
    <li><b>Industrial</b> is the least picky about services but adds the most pollution and traffic.</li>
    <li>A healthy city usually keeps jobs (commercial + industrial) roughly in balance with population, so check unemployment before zoning more housing.</li>
  </ul></div>`;

  html += `<div class="section-title">Cutting Pollution</div>`;
  html += `<div class="help-block">
    <p>Pollution comes almost entirely from developed industrial tiles, plus a smaller amount from Power Plants and Landfills. The Recycling and Smokestack Rules policies are the most direct levers, but they're not the only ones:</p>
    <ul>
      <li><b>Parks act as a green buffer.</b> Better park coverage trims pollution citywide, even with no policy active \u2014 it's not just a happiness boost.</li>
      <li><b>Bonita Lakes Park</b> (the landmark) gives a flat pollution reduction on top of regular parks once built.</li>
      <li><b>Bulldoze or thin out your densest industrial blocks.</b> Pollution scales with industrial development level, so a few high-density industrial tiles can outweigh several low-density ones \u2014 spreading industry out or downsizing it works immediately, no policy required.</li>
      <li>Power Plants and Landfills add a flat amount of pollution just by existing. If you have more than you need, removing one helps more than any policy will.</li>
    </ul>
  </div>`;

  html += `<div class="section-title">Money Troubles</div>`;
  html += `<div class="help-block">
    <p>Running a deficit isn\u2019t an instant game over \u2014 your treasury can go negative, and the city keeps running, just with a real approval penalty. If you ever face a crisis event you genuinely can\u2019t afford, every event includes a way to decline or go into debt rather than locking you out \u2014 there\u2019s always a "table this for now" option at the bottom of any newsflash.</p>
  </div>`;


  html += `<div class="section-title">Starting City</div>`;
  html += `<div class="help-block">
    <p>${STATE.cityName} doesn\u2019t start from an empty field \u2014 you inherit a small existing downtown (the Threefoot Building, a few blocks of housing and shops, and minimal services). It\u2019s deliberately a little undersized, so expect early gaps in coverage as the population grows. That\u2019s normal, not a sign you\u2019re doing something wrong.</p>
  </div>`;

  html += `<div class="section-title">Elections & Difficulty</div>`;
  html += `<div class="help-block">
    <p>Each term runs ${STATE.termLength} weeks (about 4 years). Winning re-election depends mostly on your approval rating heading into election week, with a little randomness mixed in. Difficulty changes your starting treasury, how often random events fire, and how approval naturally drifts over time \u2014 it doesn\u2019t change the core rules.</p>
  </div>`;

  el.innerHTML = html;
}
function renderSidePanel(){
  if(activeTab==='advisors') renderAdvisorsTab();
  else if(activeTab==='budget') renderBudgetTab();
  else if(activeTab==='city') renderCityTab();
  else if(activeTab==='policy') renderPolicyTab();
  else if(activeTab==='achievements') renderAchievementsTab();
  else if(activeTab==='help') renderHelpTab();
}

function refreshUI(){
  refreshTopStats();
  renderSidePanel();
}

/* ============================================================
   SPEED CONTROLS
   ============================================================ */
function setSpeed(val){
  STATE.speed = val;
  STATE.paused = (val===0);
  document.querySelectorAll('.speedbtn').forEach(b=>b.classList.remove('active'));
  const map = {0:'spd-pause',1:'spd-1',2:'spd-2',3:'spd-3'};
  document.getElementById(map[val]).classList.add('active');
}
document.getElementById('spd-pause').onclick = ()=> setSpeed(0);
document.getElementById('spd-1').onclick = ()=> setSpeed(1);
document.getElementById('spd-2').onclick = ()=> setSpeed(2);
document.getElementById('spd-3').onclick = ()=> setSpeed(3);

/* ============================================================
   MAIN LOOP TIMER
   ============================================================ */
let lastTickTime = 0;
function mainLoop(timestamp){
  if(!STATE.paused && !STATE.pendingEvent && STATE.started){
    const interval = STATE.speed===1?1400 : STATE.speed===2?750 : 350;
    if(timestamp - lastTickTime > interval){
      lastTickTime = timestamp;
      tickWeek();
    }
  }
  requestAnimationFrame(mainLoop);
}

/* ============================================================
   START / INIT
   ============================================================ */
let chosenDiff = 'normal';
document.querySelectorAll('.diff-opt').forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll('.diff-opt').forEach(b=>b.style.borderColor='var(--ink-3)');
    btn.style.borderColor = 'var(--brass)';
    chosenDiff = btn.dataset.diff;
    startGame();
  };
});

/* ============================================================
   STARTER CITY
   Meridian Heights already exists when you take office \u2014 you're
   not founding it from a blank field. This seeds a small,
   deliberately undersized downtown core so growth immediately
   creates real decisions (services lag population, etc).
   ============================================================ */
function seedStarterCity(){
  const cx = Math.floor(GRID_W/2), cy = Math.floor(GRID_H/2);
  const setCell = (x,y,patch)=>{ if(inBounds(x,y)) Object.assign(STATE.grid[y][x], patch); };

  // Main Street running east-west, plus one cross street
  for(let x=cx-7; x<=cx+7; x++) setCell(x, cy, {road:true});
  for(let y=cy-4; y<=cy+4; y++) setCell(cx, y, {road:true});
  // a second parallel street one block north and south for a real block structure
  for(let x=cx-7; x<=cx+7; x++){ setCell(x, cy-2, {road:true}); setCell(x, cy+2, {road:true}); }

  // Downtown commercial frontage along Main Street, already lightly developed
  [-6,-5,-4,-3,3,4,5,6].forEach(dx=>{
    setCell(cx+dx, cy-1, {t:'zone', zoneKind:'com', dev: Math.random()<0.6?2:1});
    setCell(cx+dx, cy+1, {t:'zone', zoneKind:'com', dev: Math.random()<0.5?1:0});
  });

  // Established residential blocks just off downtown
  for(let dx=-6; dx<=6; dx++){
    if(dx===0) continue;
    setCell(cx+dx, cy-3, {t:'zone', zoneKind:'res', dev: Math.random()<0.5?2:1});
    setCell(cx+dx, cy+3, {t:'zone', zoneKind:'res', dev: Math.random()<0.5?1:1});
  }

  // A small industrial pocket near the old rail corridor, east side of town
  for(let dy=-1; dy<=1; dy++){ setCell(cx+9, cy+dy, {road:true}); }
  setCell(cx+8, cy-1, {t:'zone', zoneKind:'ind', dev:1});
  setCell(cx+8, cy+1, {t:'zone', zoneKind:'ind', dev:1});

  // Core civic services \u2014 intentionally minimal so coverage gaps show up fast as the city grows
  setCell(cx-2, cy-4, {t:'civic', toolId:'water'});
  setCell(cx+2, cy-4, {t:'civic', toolId:'police'});
  setCell(cx-3, cy+4, {t:'civic', toolId:'school'});
  setCell(cx+1, cy+5, {t:'civic', toolId:'park'});

  // The Threefoot Building already stands \u2014 it's the city's historic anchor, not something
  // a brand-new mayor would build from scratch.
  setCell(cx, cy-1, {t:'landmark', landmarkKey:'threefoot'});
  STATE.landmarksBuilt.threefoot = true;

  recomputeCoverage();
}

function startGame(){
  const mayorInput = document.getElementById('mayorname').value.trim();
  const cityInput = document.getElementById('cityinput').value.trim();
  STATE.mayorName = mayorInput || 'Langley';
  STATE.cityName = cityInput || 'Meridian Heights';
  STATE.diff = chosenDiff;
  STATE.treasury = DIFFICULTIES[chosenDiff].treasury;
  STATE.started = true;
  seedStarterCity();
  closeModal('startmodal');
  checkAchievements();
  logFlavor(`${STATE.mayorName} is sworn in as Mayor of ${STATE.cityName}. The city band, somewhat out of tune, plays anyway.`);
  refreshUI();
  drawGrid();
}

document.getElementById('elect-continue').onclick = ()=>{ closeModal('electionmodal'); STATE.paused=false; };

/* ============================================================
   BOOT
   ============================================================ */
function init(){
  buildToolbar();
  resizeCanvas();
  recomputeCoverage();
  refreshUI();
  renderTicker();
  // seed ticker with a few flavor lines
  FLAVOR_TICKER.slice(0,4).forEach(t=>addTickerItem(t));
  requestAnimationFrame(mainLoop);
  requestAnimationFrame(animateTicker);
  // periodically inject flavor ticker lines even with no mechanical event
  setInterval(()=>{
    if(STATE.started && !STATE.paused && Math.random()<0.5){
      const line = FLAVOR_TICKER[Math.floor(Math.random()*FLAVOR_TICKER.length)];
      addTickerItem(line);
    }
  }, 9000);
}
init();
