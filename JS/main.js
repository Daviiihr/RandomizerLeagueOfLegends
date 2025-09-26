/* LOL GAMBLING MACHINE – igual a la referencia visual, con Data Dragon */
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
  invInput1: document.getElementById("invInput1"),
  clearSide: document.getElementById("clearSide"),
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

/* Carga campeones (Data Dragon) */
async function loadChampions(){
  try{
    const vers = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r=>r.json());
    latestVersion = vers[0];
    const lang = "es_MX"; // o "es_ES"
    const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/${lang}/champion.json`).then(r=>r.json());
    champList = Object.values(data.data).map(c=>({
      name:c.name,
      id:c.id,
      imageUrl:`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${c.image.full}`
    }));
    // set defaults visuales similares a la imagen
    setDefaultFaces();
    renderRoster();
  }catch(e){
    console.error(e);
    alert("No pude cargar Data Dragon.");
  }
}

function setDefaultFaces(){
  // nombre slot: avatar default azul
  document.getElementById("avatarName").src =
    "https://ddragon.leagueoflegends.com/cdn/14.14.1/img/profileicon/29.png"; // ícono generico
  // campeón por defecto (Lee Sin si existe)
  const lee = champList.find(c=>c.id.toLowerCase()==="leesin") || champList[0];
  if(lee){
    DOM.champImg.src = lee.imageUrl;
    DOM.champImg.alt = lee.name;
    DOM.champName.textContent = lee.name.toUpperCase();
  }
  DOM.nameEl.textContent = "Doinb";
  DOM.roleEl.textContent = "Jungla";
  DOM.roleBadge.textContent = "JUGGLER";
}

/* Helpers */
function getSummonerQueue(){
  // en esta versión la referencia muestra 1 input, pero aceptamos 5 separados por coma o línea
  const raw = DOM.invInput1.value.trim();
  if(!raw) return [];
  return raw.split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean).slice(0,5);
}
function roleClass(role){
  const r = role.toLowerCase();
  if(r.startsWith("top")) return "role-top";
  if(r.startsWith("jung")) return "role-jg";
  if(r.startsWith("med")||r.includes("mid")) return "role-mid";
  if(r.includes("adc")||r.includes("tir")) return "role-adc";
  return "role-sup";
}
function setSpinning(on){
  spinning = on;
  document.querySelectorAll(".slot-face").forEach(el=>el.classList.toggle("spin", on));
}

/* Palanca visual */
function pullLeverVisual(){
  DOM.lever.classList.add("pulled");
  setTimeout(()=> DOM.lever.classList.remove("pulled"), 340);
}

/* Giro único */
async function spinOnce({forcedName=null, forcedRole=null} = {}){
  if(spinning) return;
  setSpinning(true);
  pullLeverVisual();

  // ruido visual corto
  const noise = 10 + Math.floor(Math.random()*10);
  const tmpChamps = champList.length ? champList : [{name:"?", imageUrl:""}];
  for(let i=0;i<noise;i++){
    const c = pick(tmpChamps);
    DOM.champImg.src = c.imageUrl; DOM.champName.textContent = c.name.toUpperCase();
    DOM.roleBadge.textContent = pick(["TOP","JUGGLER","MID","ADC","SUP"]);
    DOM.nameEl.textContent = pick(["—","···","???","###"]);
    DOM.roleEl.textContent = pick(["Rol","—","···"]);
    await sleep(40 + i*6);
  }

  const invs = getSummonerQueue();
  const name = forcedName ?? (invs[0] || `Inv ${Math.floor(Math.random()*999)}`);
  const role = forcedRole ?? pick(ROLES);
  const champ = pick(tmpChamps);

  DOM.nameEl.textContent  = name;
  DOM.roleEl.textContent  = role;
  DOM.roleBadge.textContent = ROLE_BADGE_TEXT[role] || role.toUpperCase();
  DOM.champImg.src = champ.imageUrl;
  DOM.champImg.alt = champ.name;
  DOM.champName.textContent = champ.name.toUpperCase();

  setSpinning(false);
  return { name, role, champName: champ.name, champImg: champ.imageUrl };
}

/* Guardar actual al roster */
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

/* Reset total */
function resetAll(){
  team = [];
  renderRoster();
}

/* Hacer equipo (5 giros) */
async function rollTeam(){
  if(spinning) return;
  const inv = getSummonerQueue();
  if(inv.length < 5){ alert("Escribe 5 invocadores separados por coma o por línea."); return; }
  team = [];
  const roles = shuffle(ROLES);
  for(let i=0;i<5;i++){
    const r = await spinOnce({ forcedName: inv[i], forcedRole: roles[i] });
    team.push(r);
    renderRoster();
    await sleep(350);
  }
}

/* Render roster izquierdo */
function renderRoster(){
  const ul = DOM.teamList;
  ul.innerHTML = "";
  if(team.length === 0){
    const li = document.createElement("li");
    li.className = "roster-item";
    li.style.opacity = .5;
    li.innerHTML = `
      <div class="avatar" style="background:#223a63; border-color:#2d4e86;"></div>
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
  // placeholders hasta 3–4 elementos (para apariencia pareja)
  for(let i=team.length;i<3;i++){
    const li = document.createElement("li");
    li.className = "roster-item";
    li.style.opacity = .5;
    li.innerHTML = `
      <div class="avatar" style="background:#223a63; border-color:#2d4e86;"></div>
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
DOM.clearSide.addEventListener("click", () => { DOM.invInput1.value=""; resetAll(); });

/* Init */
loadChampions();
