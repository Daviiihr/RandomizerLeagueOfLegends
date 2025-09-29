/* LOL GAMBLING MACHINE – acepta 1..5 invocadores, palanca estática, sin anim de slots */
const DOM = {
  lever: document.getElementById("lever"),
  nameEl: document.getElementById("nameValue"),
  roleEl: document.getElementById("roleValue"),
  champImg: document.getElementById("champImg"),
  champName: document.getElementById("champName"),
  roleBadge: document.getElementById("roleBadge"),
  resetBtn: document.getElementById("resetBtn"),
  saveBtn: document.getElementById("saveBtn"),
  teamBtn: document.getElementById("teamBtn"),
  teamList: document.getElementById("teamList"),
  summonerInput: document.getElementById("summonerInput"),
  clearSide: document.getElementById("clearSide"),
  invCount: document.getElementById("invCount"),
};

const ROLES = ["Top", "Jungla", "Medio", "ADC", "Soporte"];
const ROLE_BADGE_TEXT = { Top:"TOP", Jungla:"JUGGLER", Medio:"MID", ADC:"ADC", Soporte:"SUP" };

let champList = [];      // {name, id, imageUrl}
let latestVersion = "";
let spinning = false;
let team = [];           // {name, role, champName, champImg}

/* Utils */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random()-0.5);

/* Data Dragon */
async function loadChampions(){
  try{
    const versions = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r=>r.json());
    latestVersion = versions[0];

    const lang = "es_MX"; // o "es_ES"
    const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/${lang}/champion.json`).then(r=>r.json());

    champList = Object.values(data.data).map(c => ({
      name: c.name,
      id: c.id,
      imageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${c.image.full}`
    }));

    setDefaultFaces();
    renderRoster();
  }catch(e){
    console.error("Error Data Dragon:", e);
    alert("No pude cargar Data Dragon.");
  }
}

function setDefaultFaces(){
  // avatar genérico (profile icon)
  const defaultIcon = "https://ddragon.leagueoflegends.com/cdn/14.14.1/img/profileicon/29.png";
  const avatar = document.getElementById("avatarName");
  if (avatar) avatar.src = defaultIcon;

  // campeón por defecto
  const lee = champList.find(c=>c.id.toLowerCase()==="leesin") || champList[0];
  if(lee){
    DOM.champImg.src = lee.imageUrl;
    DOM.champImg.alt = lee.name;
    DOM.champName.textContent = lee.name.toUpperCase();
  }
  // textos por defecto
  DOM.nameEl.textContent = "Doinb";
  DOM.roleEl.textContent = "Jungla";
  if (DOM.roleBadge) DOM.roleBadge.textContent = "JUGGLER";
}

/* Entrada: 1..5 invocadores */
function getSummonerQueue(){
  const raw = (DOM.summonerInput?.value || "")
    .split(/\r?\n/)              // por líneas
    .map(s => s.trim())
    .filter(Boolean);

  return raw.slice(0, 5);        // permite 1..5
}

/* Contador y feedback visual */
function updateInvCountUI(){
  const lines = (DOM.summonerInput?.value || "")
    .split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const shown = Math.min(lines.length, 5);
  if (DOM.invCount) DOM.invCount.textContent = shown.toString();

  const wrap = DOM.summonerInput?.closest('.textbox-wrap');
  if (!wrap) return;
  wrap.classList.remove('valid','invalid');

  if (lines.length === 0) wrap.classList.add('invalid');       // 0 → rojo
  else if (lines.length <= 5) wrap.classList.add('valid');      // 1..5 → verde
  else wrap.classList.add('invalid');                           // >5 → rojo
}

/* Sin animación de slots */
function setSpinning(on){
  spinning = on;    // NO agregamos ni quitamos clases de animación
}

/* Palanca: solo baja la bola; el palo queda vertical */
function pullLeverVisual(){
  DOM.lever.classList.add("pulled");
  setTimeout(()=> DOM.lever.classList.remove("pulled"), 340);
}

/* Giro único */
async function spinOnce({forcedName=null, forcedRole=null} = {}){
  if (spinning) return;

  setSpinning(true);
  pullLeverVisual();

  const list = getSummonerQueue();
  const name = forcedName ?? (list.length ? pick(list) : `Inv ${Math.floor(Math.random()*999)}`);
  const role = forcedRole ?? pick(ROLES);
  const champ = pick(champList.length ? champList : [{name:"?", imageUrl:""}]);

  DOM.nameEl.textContent  = name;
  DOM.roleEl.textContent  = role;
  if (DOM.roleBadge) DOM.roleBadge.textContent = (ROLE_BADGE_TEXT?.[role] || role).toUpperCase();
  if (champ.imageUrl) DOM.champImg.src = champ.imageUrl;
  DOM.champImg.alt = champ.name;
  DOM.champName.textContent = champ.name.toUpperCase();

  setSpinning(false);
  return { name, role, champName: champ.name, champImg: champ.imageUrl || "" };
}

/* Guardar actual */
function saveCurrent(){
  const name = DOM.nameEl.textContent.trim();
  const role = DOM.roleEl.textContent.trim();
  const champName = DOM.champName.textContent.trim();
  const champImg = DOM.champImg.getAttribute("src") || "";
  if(!name || name==="—" || !role || role==="—" || !champName || champName==="—"){
    alert("Primero realiza un giro válido.");
    return;
  }
  if(team.length >= 5){ alert("Ya tienes 5 integrantes."); return; }
  team.push({ name, role, champName, champImg });
  renderRoster();
}

/* Reset */
function resetAll(){
  team = [];
  renderRoster();
}

/* Equipo (usa los ingresados y completa hasta 5) */
async function rollTeam(){
  if (spinning) return;

  const entered = getSummonerQueue();          // 0..5
  if (entered.length === 0){
    alert("Ingresa al menos 1 invocador (hasta 5).");
    return;
  }

  // Prepara lista total de 5: usa los que diste y rellena con aleatorios
  const teamNames = [...entered];
  while (teamNames.length < 5){
    teamNames.push(`Inv ${Math.floor(Math.random()*999)}`);
  }

  team = [];
  renderRoster();

  const roles = shuffle(ROLES);  // roles únicos
  for (let i=0; i<5; i++){
    const r = await spinOnce({ forcedName: teamNames[i], forcedRole: roles[i] });
    team.push(r);
    renderRoster();
    await sleep(300);
  }
}

/* Roster izquierdo */
function roleClass(role){
  const r = (role||"").toLowerCase();
  if(r.startsWith("top")) return "role-top";
  if(r.startsWith("jung")) return "role-jg";
  if(r.startsWith("med")||r.includes("mid")) return "role-mid";
  if(r.includes("adc")||r.includes("tir")) return "role-adc";
  return "role-sup";
}
function renderRoster(){
  const ul = DOM.teamList;
  ul.innerHTML = "";

  // Si no hay integrantes, un placeholder
  if(team.length === 0){
    const li = document.createElement("li");
    li.className = "roster-item";
    li.style.opacity = .5;
    li.innerHTML = `
      <div class="avatar" style="background:#223a63; border:2px solid #2d4e86; width:46px; height:46px; border-radius:50%"></div>
      <div class="meta"><span class="name">—</span><span class="champ">—</span></div>
      <span class="role-chip">—</span>`;
    ul.appendChild(li);
  }

  team.slice(0,5).forEach(m=>{
    const li = document.createElement("li");
    li.className = "roster-item";
    li.innerHTML = `
      <img class="avatar" src="${m.champImg}" alt="${m.champName}">
      <div class="meta">
        <span class="name">${m.name}</span>
        <span class="champ">${m.champName}</span>
      </div>
      <span class="role-chip ${roleClass(m.role)}">${(ROLE_BADGE_TEXT[m.role]||m.role).toUpperCase()}</span>
    `;
    ul.appendChild(li);
  });

  // Placeholders hasta llenar 5 visualmente (sin scroll)
  for(let i=team.length; i<5; i++){
    const li = document.createElement("li");
    li.className = "roster-item";
    li.style.opacity = .5;
    li.innerHTML = `
      <div class="avatar" style="background:#223a63; border:2px solid #2d4e86; width:46px; height:46px; border-radius:50%"></div>
      <div class="meta"><span class="name">—</span><span class="champ">—</span></div>
      <span class="role-chip">—</span>`;
    ul.appendChild(li);
  }
}

/* Eventos */
DOM.lever.addEventListener("click", () => spinOnce());
DOM.resetBtn.addEventListener("click", resetAll);
DOM.saveBtn.addEventListener("click", saveCurrent);
DOM.teamBtn.addEventListener("click", rollTeam);
DOM.clearSide.addEventListener("click", () => {
  if (DOM.summonerInput) DOM.summonerInput.value = "";
  updateInvCountUI();
  team = [];
  renderRoster();
});
if (DOM.summonerInput){
  DOM.summonerInput.addEventListener('input', updateInvCountUI);
  updateInvCountUI();
}

/* Init */
loadChampions();
