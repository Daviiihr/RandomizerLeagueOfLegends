// ========= Elementos UI =========
const machine  = document.getElementById('machine');
const hit      = document.getElementById('hit');
const btnSpin  = document.getElementById('btnSpin');
const btnTeam  = document.getElementById('btnTeam');
const btnReset = document.getElementById('btnReset');

const summonersInput = document.getElementById('summonersInput');
const reuseNamesChk  = document.getElementById('reuseNames');

const champImgEl = document.getElementById('champImg');
const resSummEl  = document.getElementById('resSummoner');
const resRoleEl  = document.getElementById('resRole');
const resChampEl = document.getElementById('resChamp');

const teamList   = document.getElementById('teamList');
const btnCopyTeam= document.getElementById('btnCopyTeam');
const btnClearTeam= document.getElementById('btnClearTeam');

// ========= Estado =========
let busy = false;
let ddragon = {
  version: null,
  lang: 'es_ES',
  champs: [], // [{key,id,name,imageFull}]
};

const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

// ========= Helpers =========
function ms(varName){
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (v.endsWith('ms')) return parseFloat(v);
  if (v.endsWith('s'))  return parseFloat(v) * 1000;
  return parseFloat(v) || 700;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function parseSummoners(){
  const lines = (summonersInput.value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines;
}
function generateAutoSummoners(n){ return Array.from({length:n}, (_,i) => `Invocador ${i+1}`); }

// ========= Data Dragon =========
async function loadDataDragon(){
  try{
    const verRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', { cache: 'force-cache' });
    const versions = await verRes.json();
    ddragon.version = versions[0];

    const champsRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/data/${ddragon.lang}/champion.json`, { cache:'force-cache' });
    const champData = await champsRes.json();

    ddragon.champs = Object.values(champData.data).map(c => ({
      id: c.id, key: c.key, name: c.name, imageFull: c.image.full
    }));
  }catch(err){
    console.error('Error Data Dragon:', err);
    ddragon.version = ddragon.version || '14.18.1';
    ddragon.champs = ddragon.champs.length ? ddragon.champs : [
      { id:'Aatrox', key:'266', name:'Aatrox', imageFull:'Aatrox.png' },
      { id:'Ahri', key:'103', name:'Ahri', imageFull:'Ahri.png' },
      { id:'Garen', key:'86', name:'Garen', imageFull:'Garen.png' },
      { id:'Lux', key:'99', name:'Lux', imageFull:'Lux.png' },
      { id:'MissFortune', key:'21', name:'Miss Fortune', imageFull:'MissFortune.png' },
    ];
  }
}
function champImgURL(imageFull){
  return `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${imageFull}`;
}

// ========= Animación palanca =========
function playLeverOnce(){
  return new Promise(resolve => {
    machine.classList.remove('releasing');
    machine.classList.add('pulling');

    const half = ms('--duration');
    setTimeout(() => {
      machine.dispatchEvent(new CustomEvent('spin:start'));

      // Subir
      machine.classList.remove('pulling');
      machine.classList.add('releasing');

      setTimeout(() => {
        machine.classList.remove('releasing');
        machine.dispatchEvent(new CustomEvent('spin:end'));
        resolve();
      }, half);
    }, half);
  });
}
function toggleInputs(lock){
  const dis = !!lock;
  if (btnSpin)  btnSpin.disabled  = dis;
  if (btnTeam)  btnTeam.disabled  = dis;
  if (hit)      hit.disabled      = dis;
}

// ========= Randomizer =========
function getNextSummoner(indexForTeam = null, usedSet = null){
  const allowRepeat = reuseNamesChk?.checked ?? true;
  const names = parseSummoners();
  if (names.length === 0){
    return indexForTeam != null ? `Invocador ${indexForTeam+1}` : 'Invocador 1';
  }
  if (allowRepeat){
    return pick(names);
  }
  const pool = names.filter(n => !usedSet?.has(n));
  if (pool.length === 0) return pick(names);
  return pick(pool);
}
function randomRole(slotIndex = null){
  if (slotIndex != null && slotIndex >=0 && slotIndex < ROLES.length){
    return ROLES[slotIndex];
  }
  return pick(ROLES);
}
function randomChampion(){
  return pick(ddragon.champs);
}

// ======= UI dentro de la máquina =======
function updateOverlay({summoner, role, champ}){
  resSummEl.textContent = summoner;
  resRoleEl.textContent = role;
  resChampEl.textContent = champ.name;
  champImgEl.src = champImgURL(champ.imageFull);
  champImgEl.alt = champ.name;
}
function pushTeamItem({summoner, role, champ}){
  const li = document.createElement('li');
  const img = document.createElement('img');
  img.src = champImgURL(champ.imageFull);
  img.alt = champ.name;
  const text = document.createElement('span');
  text.textContent = `${summoner} – ${role} – ${champ.name}`;
  li.appendChild(img);
  li.appendChild(text);
  teamList.appendChild(li);
}

// ========= Flujo de tiradas =========
async function handleSpin(mode){
  if (busy) return;
  busy = true;
  toggleInputs(true);

  if (mode === 'team'){
    teamList.innerHTML = '';
    const used = new Set();
    for (let i=0; i<5; i++){
      await playLeverOnce();
      const summoner = getNextSummoner(i, used);
      used.add(summoner);
      const role = randomRole(i);
      const champ = randomChampion();
      updateOverlay({summoner, role, champ});
      pushTeamItem({summoner, role, champ});
    }
  } else {
    await playLeverOnce();
    const summoner = getNextSummoner();
    const role = randomRole();
    const champ = randomChampion();
    updateOverlay({summoner, role, champ});
  }

  toggleInputs(false);
  busy = false;
}

// ========= Eventos UI =========
hit?.addEventListener('click', () => handleSpin('once'));
btnSpin?.addEventListener('click', () => handleSpin('once'));
btnTeam?.addEventListener('click', () => handleSpin('team'));
btnReset?.addEventListener('click', () => machine.classList.remove('pulling','releasing'));

// Copiar/Limpiar equipo
btnCopyTeam?.addEventListener('click', async () => {
  const lines = [...teamList.querySelectorAll('li')].map(li => li.textContent.trim());
  const text = lines.join('\n');
  try{
    await navigator.clipboard.writeText(text);
    btnCopyTeam.textContent = '¡Copiado!';
    setTimeout(() => btnCopyTeam.textContent = 'Copiar equipo', 1200);
  }catch{
    alert(text);
  }
});
btnClearTeam?.addEventListener('click', () => teamList.innerHTML = '');

// ========= Boot =========
(async function init(){
  await loadDataDragon();
  champImgEl.src = '';
  resSummEl.textContent = '—';
  resRoleEl.textContent = '—';
  resChampEl.textContent = '—';
})();

