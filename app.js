/* ============ Тёмный План — логика приложения ============ */
const STORAGE_KEY = "temny-plan-data-v1";
const CATS = ["Учёба", "Здоровье", "Личное", "Дом"];
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DOWS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function pad(n){ return n.toString().padStart(2,"0"); }

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return { tasks: [], settings: { sound:true, notifications:false }, timerTaskId:null };
}
function saveData(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadData();
if(!state.settings) state.settings = { sound:true, notifications:false };

/* ---------------- Bat icon helper ---------------- */
function batSVG(fillOpacity){
  return `<svg viewBox="0 0 24 24" fill="currentColor" style="opacity:${fillOpacity}"><path d="M12 3c.4 1 .8 2 1.3 2.6.7-1 1.6-2 2.7-2.4-.2 1.1-.1 2.2.2 3.1 1.4-.5 3-.5 4.3.1-.8.8-1.3 1.7-1.5 2.7 1.1.1 2.2.5 3 1.3-1.1.4-2 1-2.7 1.9 1 .5 1.8 1.3 2.2 2.4-1.2-.1-2.3.1-3.3.6.5 1 .6 2.1.4 3.2-1-.6-2-.9-3.1-.9.1 1.1-.1 2.2-.7 3.1-.7-.8-1.6-1.4-2.6-1.7-.3.9-.9 1.7-1.7 2.2C12 21 11.4 20.2 11.1 19.3c-1 .3-1.9.9-2.6 1.7-.6-.9-.8-2-.7-3.1-1.1 0-2.1.3-3.1.9-.2-1.1-.1-2.2.4-3.2-1-.5-2.1-.7-3.3-.6.4-1.1 1.2-1.9 2.2-2.4-.7-.9-1.6-1.5-2.7-1.9.8-.8 1.9-1.2 3-1.3-.2-1-.7-1.9-1.5-2.7 1.3-.6 2.9-.6 4.3-.1.3-.9.4-2 .2-3.1 1.1.4 2 1.4 2.7 2.4C11.2 5 11.6 4 12 3z"/></svg>`;
}
const PRIO_ICON = (active) => `<svg viewBox="0 0 24 24" fill="${active? 'var(--gold)':'var(--text-faint)'}"><path d="M12 3c.4 1 .8 2 1.3 2.6.7-1 1.6-2 2.7-2.4-.2 1.1-.1 2.2.2 3.1 1.4-.5 3-.5 4.3.1-.8.8-1.3 1.7-1.5 2.7 1.1.1 2.2.5 3 1.3-1.1.4-2 1-2.7 1.9 1 .5 1.8 1.3 2.2 2.4-1.2-.1-2.3.1-3.3.6.5 1 .6 2.1.4 3.2-1-.6-2-.9-3.1-.9.1 1.1-.1 2.2-.7 3.1-.7-.8-1.6-1.4-2.6-1.7-.3.9-.9 1.7-1.7 2.2C12 21 11.4 20.2 11.1 19.3c-1 .3-1.9.9-2.6 1.7-.6-.9-.8-2-.7-3.1-1.1 0-2.1.3-3.1.9-.2-1.1-.1-2.2.4-3.2-1-.5-2.1-.7-3.3-.6.4-1.1 1.2-1.9 2.2-2.4-.7-.9-1.6-1.5-2.7-1.9.8-.8 1.9-1.2 3-1.3-.2-1-.7-1.9-1.5-2.7 1.3-.6 2.9-.6 4.3-.1.3-.9.4-2 .2-3.1 1.1.4 2 1.4 2.7 2.4C11.2 5 11.6 4 12 3z"/></svg>`;
const PRIO_LABELS = ["Низкий","Средний","Высокий","Срочно"];

/* ---------------- Toast ---------------- */
let toastTimer=null;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove("show"), 1800);
}

/* ---------------- Navigation ---------------- */
function showScreen(name){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("screen-"+name).classList.add("active");
  document.querySelectorAll("nav.bottom button").forEach(b=>{
    b.classList.toggle("active", b.dataset.screen===name);
  });
  if(name==="calendar") renderCalendar();
  if(name==="timer") renderTimer();
  if(name==="stats") renderStats();
  if(name==="settings") renderSettings();
  if(name==="tasks") renderTasks();
}
document.querySelectorAll("nav.bottom button").forEach(b=>{
  b.addEventListener("click", ()=> showScreen(b.dataset.screen));
});

/* ================= TASKS ================= */
let currentTaskTab = "all";
document.getElementById("task-tabs").addEventListener("click", (e)=>{
  const btn = e.target.closest("button"); if(!btn) return;
  currentTaskTab = btn.dataset.tab;
  document.querySelectorAll("#task-tabs button").forEach(b=>b.classList.toggle("active", b===btn));
  renderTasks();
});

function fmtDue(ts){
  if(!ts) return "Без срока";
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString()===now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
  const isTomorrow = d.toDateString()===tomorrow.toDateString();
  const time = pad(d.getHours())+":"+pad(d.getMinutes());
  if(sameDay) return "Сегодня, "+time;
  if(isTomorrow) return "Завтра, "+time;
  return d.getDate()+" "+MONTHS[d.getMonth()].toLowerCase()+", "+time;
}

function renderTasks(){
  const list = document.getElementById("task-list");
  const now = new Date();
  let tasks = state.tasks.slice();

  if(currentTaskTab==="today"){
    tasks = tasks.filter(t=> t.dueTs && new Date(t.dueTs).toDateString()===now.toDateString());
  } else if(currentTaskTab==="upcoming"){
    tasks = tasks.filter(t=> !t.done && t.dueTs && new Date(t.dueTs) > now && new Date(t.dueTs).toDateString()!==now.toDateString());
  } else if(currentTaskTab==="done"){
    tasks = tasks.filter(t=> t.done);
  }

  tasks.sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;
    const at=a.dueTs||Infinity, bt=b.dueTs||Infinity;
    return at-bt;
  });

  if(tasks.length===0){
    list.innerHTML = `<div class="empty">
      ${batSVG(0.5)}
      <div>Здесь пока пусто.<br>Нажмите «+», чтобы создать первую задачу.</div>
    </div>`;
    return;
  }

  // group: today / upcoming / no date / done — only for "all" tab
  let html = "";
  if(currentTaskTab==="all"){
    const today = tasks.filter(t=>!t.done && t.dueTs && new Date(t.dueTs).toDateString()===now.toDateString());
    const upcoming = tasks.filter(t=>!t.done && (!t.dueTs || new Date(t.dueTs).toDateString()!==now.toDateString()) && (!t.dueTs || new Date(t.dueTs) >= new Date(now.getFullYear(),now.getMonth(),now.getDate())) );
    const upcomingReal = tasks.filter(t=>!t.done).filter(t=> !today.includes(t));
    const done = tasks.filter(t=>t.done);
    if(today.length){ html += `<div class="section-title">Сегодня <span class="count">${today.length}</span></div>`; today.forEach(t=> html+=taskCardHTML(t)); }
    if(upcomingReal.length){ html += `<div class="section-title">Предстоящие <span class="count">${upcomingReal.length}</span></div>`; upcomingReal.forEach(t=> html+=taskCardHTML(t)); }
    if(done.length){ html += `<div class="section-title">Выполнено <span class="count">${done.length}</span></div>`; done.forEach(t=> html+=taskCardHTML(t)); }
  } else {
    tasks.forEach(t=> html+=taskCardHTML(t));
  }
  list.innerHTML = html;
}

function taskCardHTML(t){
  const prioOpacity = [0.35,0.6,0.85,1][Math.max(0,(t.priority||2)-1)];
  return `<div class="task-card ${t.done?'done':''}" onclick="App.openTaskDetail('${t.id}')">
    <div class="checkbox ${t.done?'checked':''}" onclick="event.stopPropagation(); App.toggleDone('${t.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="#181205" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
    </div>
    <div class="task-info">
      <div class="t">${escapeHTML(t.name)}</div>
      <div class="m">
        <span>${fmtDue(t.dueTs)}</span>
        ${t.category? '· '+escapeHTML(t.category):''}
      </div>
    </div>
    <div class="prio-bat">${batSVG(prioOpacity)}</div>
  </div>`;
}
function escapeHTML(s){ return (s||"").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- New / Edit task ---------------- */
let editingTaskId = null;
let ntPriority = 2;
let ntCategory = null;
let ntDueTs = null;
let dpPendingTs = null;
let dpMode = "cal";
let dpCalMonth = new Date();

function openNewTask(){
  editingTaskId = null;
  ntPriority = 2; ntCategory = null; ntDueTs = null;
  document.getElementById("newtask-title").textContent = "Новая задача";
  document.getElementById("nt-name").value = "";
  document.getElementById("nt-notes").value = "";
  document.getElementById("nt-date-label").textContent = "Указать дату";
  document.getElementById("nt-delete").style.display = "none";
  renderPrioPicker(); renderCatPicker();
  document.getElementById("fs-newtask").classList.add("active");
  setTimeout(()=> document.getElementById("nt-name").focus(), 250);
}
function closeNewTask(){
  document.getElementById("fs-newtask").classList.remove("active");
}
function renderPrioPicker(){
  const el = document.getElementById("nt-prio");
  el.innerHTML = [1,2,3,4].map(p=>{
    const op = [0.35,0.6,0.85,1][p-1];
    return `<div class="prio-opt ${ntPriority===p?'selected':''}" onclick="App.setPrio(${p})" title="${PRIO_LABELS[p-1]}">${batSVGraw(op)}</div>`;
  }).join("");
}
function batSVGraw(op){
  return `<svg viewBox="0 0 24 24" fill="var(--gold)" style="opacity:${op}"><path d="M12 3c.4 1 .8 2 1.3 2.6.7-1 1.6-2 2.7-2.4-.2 1.1-.1 2.2.2 3.1 1.4-.5 3-.5 4.3.1-.8.8-1.3 1.7-1.5 2.7 1.1.1 2.2.5 3 1.3-1.1.4-2 1-2.7 1.9 1 .5 1.8 1.3 2.2 2.4-1.2-.1-2.3.1-3.3.6.5 1 .6 2.1.4 3.2-1-.6-2-.9-3.1-.9.1 1.1-.1 2.2-.7 3.1-.7-.8-1.6-1.4-2.6-1.7-.3.9-.9 1.7-1.7 2.2C12 21 11.4 20.2 11.1 19.3c-1 .3-1.9.9-2.6 1.7-.6-.9-.8-2-.7-3.1-1.1 0-2.1.3-3.1.9-.2-1.1-.1-2.2.4-3.2-1-.5-2.1-.7-3.3-.6.4-1.1 1.2-1.9 2.2-2.4-.7-.9-1.6-1.5-2.7-1.9.8-.8 1.9-1.2 3-1.3-.2-1-.7-1.9-1.5-2.7 1.3-.6 2.9-.6 4.3-.1.3-.9.4-2 .2-3.1 1.1.4 2 1.4 2.7 2.4C11.2 5 11.6 4 12 3z"/></svg>`;
}
function setPrio(p){ ntPriority = p; renderPrioPicker(); }
function renderCatPicker(){
  const el = document.getElementById("nt-cat");
  el.innerHTML = CATS.map(c=>`<div class="cat-chip ${ntCategory===c?'selected':''}" onclick="App.setCat('${c}')">${c}</div>`).join("");
}
function setCat(c){ ntCategory = (ntCategory===c? null : c); renderCatPicker(); }

function saveTask(){
  const name = document.getElementById("nt-name").value.trim();
  if(!name){ toast("Введите название задачи"); return; }
  const notes = document.getElementById("nt-notes").value.trim();
  if(editingTaskId){
    const t = state.tasks.find(x=>x.id===editingTaskId);
    Object.assign(t, { name, notes, priority: ntPriority, category: ntCategory, dueTs: ntDueTs });
  } else {
    state.tasks.push({ id: uid(), name, notes, priority: ntPriority, category: ntCategory, dueTs: ntDueTs, done:false, createdTs: Date.now(), completedTs:null });
  }
  saveData();
  closeNewTask();
  renderTasks();
  toast("Задача сохранена");
}

function toggleDone(id){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  t.done = !t.done;
  t.completedTs = t.done? Date.now() : null;
  saveData();
  renderTasks();
}

function openTaskDetail(id){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  const sheet = document.getElementById("td-sheet");
  const prioOpacity = [0.35,0.6,0.85,1][Math.max(0,(t.priority||2)-1)];
  sheet.innerHTML = `
    <div class="handle"></div>
    <h2>Задача</h2>
    <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:16px;">
      <div style="width:26px;height:26px;flex-shrink:0;">${batSVG(prioOpacity)}</div>
      <div>
        <div style="font-size:17px; font-weight:700; margin-bottom:6px;">${escapeHTML(t.name)}</div>
        <div style="color:var(--text-dim); font-size:13px;">${fmtDue(t.dueTs)}${t.category? ' · '+escapeHTML(t.category):''} · ${PRIO_LABELS[(t.priority||2)-1]}</div>
      </div>
    </div>
    ${t.notes? `<div style="background:var(--card); border:1px solid var(--line); border-radius:12px; padding:13px; font-size:13.5px; color:var(--text-dim); margin-bottom:16px; line-height:1.5;">${escapeHTML(t.notes)}</div>` : ""}
    <button class="row-btn" onclick="App.toggleDone('${t.id}'); App.closeTaskDetail();">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>
      ${t.done? "Снять отметку выполнения" : "Отметить как выполненную"}
    </button>
    <button class="row-btn" onclick="App.editTask('${t.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Редактировать
    </button>
    <button class="row-btn" onclick="App.startTimerForTask('${t.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/></svg>
      Запустить таймер
    </button>
    <button class="btn-danger" onclick="App.deleteTask('${t.id}')">Удалить задачу</button>
  `;
  document.getElementById("td-overlay").classList.add("active");
  sheet.classList.add("active");
}
function closeTaskDetail(){
  document.getElementById("td-overlay").classList.remove("active");
  document.getElementById("td-sheet").classList.remove("active");
}
function editTask(id){
  const t = state.tasks.find(x=>x.id===id);
  if(!t) return;
  closeTaskDetail();
  editingTaskId = id;
  ntPriority = t.priority||2; ntCategory = t.category||null; ntDueTs = t.dueTs||null;
  document.getElementById("newtask-title").textContent = "Изменить задачу";
  document.getElementById("nt-name").value = t.name;
  document.getElementById("nt-notes").value = t.notes||"";
  document.getElementById("nt-date-label").textContent = t.dueTs? fmtDue(t.dueTs) : "Указать дату";
  document.getElementById("nt-delete").style.display = "block";
  renderPrioPicker(); renderCatPicker();
  document.getElementById("fs-newtask").classList.add("active");
}
function deleteTask(id){
  state.tasks = state.tasks.filter(x=>x.id!==id);
  saveData();
  closeTaskDetail();
  renderTasks();
  toast("Задача удалена");
}
function deleteCurrentTask(){ if(editingTaskId) deleteTask(editingTaskId); closeNewTask(); }

/* ---------------- Date picker sheet ---------------- */
document.getElementById("dp-tabs").addEventListener("click", (e)=>{
  const btn = e.target.closest("button"); if(!btn) return;
  dpMode = btn.dataset.tab;
  document.querySelectorAll("#dp-tabs button").forEach(b=>b.classList.toggle("active", b===btn));
  document.getElementById("dp-cal-body").style.display = dpMode==="cal"? "block":"none";
  document.getElementById("dp-rel-body").style.display = dpMode==="rel"? "block":"none";
});
function openDatePick(){
  dpPendingTs = ntDueTs || Date.now();
  dpCalMonth = new Date(dpPendingTs);
  dpMode = "cal";
  document.querySelectorAll("#dp-tabs button").forEach((b,i)=>b.classList.toggle("active", i===0));
  document.getElementById("dp-cal-body").style.display="block";
  document.getElementById("dp-rel-body").style.display="none";
  renderDpCal();
  document.getElementById("dp-overlay").classList.add("active");
  document.getElementById("dp-sheet").classList.add("active");
}
function closeDatePick(){
  document.getElementById("dp-overlay").classList.remove("active");
  document.getElementById("dp-sheet").classList.remove("active");
}
function renderDpCal(){
  const y = dpCalMonth.getFullYear(), m = dpCalMonth.getMonth();
  const first = new Date(y,m,1);
  let startDow = first.getDay(); startDow = startDow===0?6:startDow-1;
  const daysInMonth = new Date(y,m+1,0).getDate();
  const selDate = new Date(dpPendingTs);
  let html = `<div class="cal-head" style="margin-top:0">
    <div class="icon-btn" onclick="App.dpShiftMonth(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></div>
    <div class="m-label">${MONTHS[m]} ${y}</div>
    <div class="icon-btn" onclick="App.dpShiftMonth(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
  </div><div class="cal-grid">`;
  DOWS.forEach(d=> html+=`<div class="dow">${d}</div>`);
  for(let i=0;i<startDow;i++){
    const dnum = new Date(y,m,0).getDate()-startDow+i+1;
    html += `<div class="cal-day other">${dnum}</div>`;
  }
  for(let d=1; d<=daysInMonth; d++){
    const isSel = selDate.getFullYear()===y && selDate.getMonth()===m && selDate.getDate()===d;
    const isToday = new Date().toDateString()===new Date(y,m,d).toDateString();
    html += `<div class="cal-day ${isSel?'selected':''} ${isToday&&!isSel?'today':''}" onclick="App.dpPickDay(${d})">${d}</div>`;
  }
  html += `</div>
  <div class="field" style="margin-top:18px; display:flex; gap:10px; align-items:center;">
    <input type="time" id="dp-time" value="${pad(selDate.getHours())}:${pad(selDate.getMinutes())}" style="flex:1; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:12px; color:var(--text); font-size:14px;">
  </div>`;
  document.getElementById("dp-cal-body").innerHTML = html;
  document.getElementById("dp-time").addEventListener("change", (e)=>{
    const [hh,mm] = e.target.value.split(":").map(Number);
    const d = new Date(dpPendingTs); d.setHours(hh,mm,0,0); dpPendingTs = d.getTime();
  });
}
function dpShiftMonth(dir){ dpCalMonth = new Date(dpCalMonth.getFullYear(), dpCalMonth.getMonth()+dir, 1); renderDpCal(); }
function dpPickDay(d){
  const cur = new Date(dpPendingTs);
  const nd = new Date(dpCalMonth.getFullYear(), dpCalMonth.getMonth(), d, cur.getHours(), cur.getMinutes());
  dpPendingTs = nd.getTime();
  renderDpCal();
}
function pickRelative(mins, ev){
  dpPendingTs = Date.now() + mins*60000;
  document.querySelectorAll("#dp-rel-body .row-btn").forEach(b=> b.style.borderColor = "var(--line)");
  if(ev && ev.currentTarget) ev.currentTarget.style.borderColor = "var(--gold)";
}
function confirmDatePick(){
  ntDueTs = dpPendingTs;
  document.getElementById("nt-date-label").textContent = fmtDue(ntDueTs);
  closeDatePick();
}

/* ================= CALENDAR ================= */
let calMonth = new Date();
let calSelected = new Date();
function calShift(dir){ calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()+dir, 1); renderCalendar(); }
function renderCalendar(){
  document.getElementById("cal-month-label").textContent = MONTHS[calMonth.getMonth()]+" "+calMonth.getFullYear();
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y,m,1);
  let startDow = first.getDay(); startDow = startDow===0?6:startDow-1;
  const daysInMonth = new Date(y,m+1,0).getDate();
  const grid = document.getElementById("cal-grid");
  let html = "";
  DOWS.forEach(d=> html+=`<div class="dow">${d}</div>`);
  const prevDays = new Date(y,m,0).getDate();
  for(let i=0;i<startDow;i++){
    html += `<div class="cal-day other">${prevDays-startDow+i+1}</div>`;
  }
  for(let d=1; d<=daysInMonth; d++){
    const dateObj = new Date(y,m,d);
    const isSel = calSelected.toDateString()===dateObj.toDateString();
    const isToday = new Date().toDateString()===dateObj.toDateString();
    const hasTask = state.tasks.some(t=> t.dueTs && new Date(t.dueTs).toDateString()===dateObj.toDateString());
    html += `<div class="cal-day ${isSel?'selected':''} ${isToday&&!isSel?'today':''}" onclick="App.calPickDay(${d})">
      ${d}${hasTask? '<div class="dot"></div>' : ''}
    </div>`;
  }
  grid.innerHTML = html;
  renderDayList();
}
function calPickDay(d){
  calSelected = new Date(calMonth.getFullYear(), calMonth.getMonth(), d);
  renderCalendar();
}
function renderDayList(){
  document.getElementById("day-list-label").textContent = calSelected.getDate()+" "+MONTHS[calSelected.getMonth()].toLowerCase()+" "+calSelected.getFullYear();
  const items = state.tasks.filter(t=> t.dueTs && new Date(t.dueTs).toDateString()===calSelected.toDateString());
  items.sort((a,b)=>a.dueTs-b.dueTs);
  const el = document.getElementById("day-list-items");
  if(items.length===0){ el.innerHTML = `<div class="empty" style="padding:24px 0;">Задач на этот день нет</div>`; return; }
  el.innerHTML = items.map(taskCardHTML).join("");
}

/* ================= TIMER ================= */
let timerState = { running:false, remaining:0, total:0, taskId:null, intervalId:null, minutesInput:25 };

function startTimerForTask(taskId){
  closeTaskDetail();
  timerState.taskId = taskId;
  showScreen("timer");
}

function renderTimer(){
  const main = document.getElementById("timer-main");
  const task = timerState.taskId? state.tasks.find(t=>t.id===timerState.taskId) : null;

  if(!timerState.running && timerState.remaining===0){
    // setup view
    main.innerHTML = `
      <div class="timer-wrap">
        <div class="timer-ring">
          <svg width="230" height="230">
            <circle cx="115" cy="115" r="100" stroke="#2a2a2e" stroke-width="10" fill="none"/>
            <circle cx="115" cy="115" r="100" stroke="var(--gold)" stroke-width="10" fill="none"
              stroke-dasharray="628" stroke-dashoffset="0" stroke-linecap="round"/>
          </svg>
          <div class="timer-center">
            <div class="label">Длительность</div>
            <div class="time" id="setup-time">${pad(timerState.minutesInput)}:00</div>
          </div>
        </div>
        <div class="timer-controls" style="margin-bottom:22px;">
          <div class="tc-btn" onclick="App.adjustSetupMinutes(-5)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14"/></svg></div>
          <div class="tc-btn primary" onclick="App.startTimer()"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
          <div class="tc-btn" onclick="App.adjustSetupMinutes(5)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M12 5v14"/></svg></div>
        </div>
        ${task? `<div class="timer-task">Для задачи: <b>${escapeHTML(task.name)}</b></div>` : ""}
        <div class="task-pick">
          <div class="row-btn" onclick="App.pickTimerTask()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10l2 2 4-4"/></svg>
            <span>${task? "Изменить задачу" : "Привязать к задаче"}</span>
            <span class="sub">›</span>
          </div>
        </div>
      </div>`;
    return;
  }

  const pct = timerState.total>0? timerState.remaining/timerState.total : 0;
  const circumference = 628;
  const offset = circumference * (1-pct);
  const h = Math.floor(timerState.remaining/3600);
  const mnt = Math.floor((timerState.remaining%3600)/60);
  const sec = timerState.remaining%60;
  main.innerHTML = `
    <div class="timer-wrap">
      <div class="timer-ring">
        <svg width="230" height="230">
          <circle cx="115" cy="115" r="100" stroke="#2a2a2e" stroke-width="10" fill="none"/>
          <circle cx="115" cy="115" r="100" stroke="var(--gold)" stroke-width="10" fill="none"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
            style="transition: stroke-dashoffset 1s linear"/>
        </svg>
        <div class="timer-center">
          <div class="label">${timerState.running? "Осталось":"Пауза"}</div>
          <div class="time">${pad(h)}:${pad(mnt)}:${pad(sec)}</div>
        </div>
      </div>
      <div class="timer-units"><div>Час</div><div>Мин</div><div>Сек</div></div>
      ${task? `<div class="timer-task">${escapeHTML(task.name)}</div>` : `<div class="timer-task">Свободный таймер</div>`}
      <div class="timer-controls">
        <div class="tc-btn" onclick="App.stopTimer()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></div>
        <div class="tc-btn primary" onclick="App.toggleTimer()">${timerState.running? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'}</div>
        <div class="tc-btn" onclick="App.resetTimer()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 109-9M3 4v6h6"/></svg></div>
      </div>
    </div>`;
}
function adjustSetupMinutes(delta){
  timerState.minutesInput = Math.max(5, Math.min(180, timerState.minutesInput+delta));
  document.getElementById("setup-time").textContent = pad(timerState.minutesInput)+":00";
}
function startTimer(){
  timerState.total = timerState.minutesInput*60;
  timerState.remaining = timerState.total;
  timerState.running = true;
  runTicker();
  renderTimer();
}
function toggleTimer(){
  timerState.running = !timerState.running;
  if(timerState.running) runTicker(); else clearInterval(timerState.intervalId);
  renderTimer();
}
function runTicker(){
  clearInterval(timerState.intervalId);
  timerState.intervalId = setInterval(()=>{
    if(!timerState.running) return;
    timerState.remaining--;
    if(timerState.remaining<=0){
      clearInterval(timerState.intervalId);
      timerState.running=false; timerState.remaining=0;
      notifyUser("Таймер завершён", timerState.taskId? (state.tasks.find(t=>t.id===timerState.taskId)||{}).name || "" : "Время вышло");
      playBeep();
    }
    if(document.getElementById("screen-timer").classList.contains("active")) renderTimer();
  }, 1000);
}
function stopTimer(){
  clearInterval(timerState.intervalId);
  timerState = { running:false, remaining:0, total:0, taskId:timerState.taskId, intervalId:null, minutesInput:timerState.minutesInput };
  renderTimer();
}
function resetTimer(){
  timerState.remaining = timerState.total;
  timerState.running = false;
  clearInterval(timerState.intervalId);
  renderTimer();
}
function pickTimerTask(){
  const sheet = document.getElementById("td-sheet");
  const openTasks = state.tasks.filter(t=>!t.done);
  sheet.innerHTML = `<div class="handle"></div><h2>Выбрать задачу</h2>
    <div class="row-btn" onclick="App.setTimerTask(null)">Без привязки к задаче</div>
    ${openTasks.map(t=>`<div class="row-btn" onclick="App.setTimerTask('${t.id}')">${escapeHTML(t.name)}</div>`).join("") || '<div class="empty" style="padding:20px 0;">Нет активных задач</div>'}
  `;
  document.getElementById("td-overlay").classList.add("active");
  sheet.classList.add("active");
}
function setTimerTask(id){
  timerState.taskId = id;
  closeTaskDetail();
  renderTimer();
}

function playBeep(){
  if(!state.settings.sound) return;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 500);
  }catch(e){}
}
function notifyUser(title, body){
  toast(title + (body? ": "+body : ""));
  if(state.settings.notifications && "Notification" in window && Notification.permission==="granted"){
    try{ new Notification(title, { body, icon:"icon-192.png" }); }catch(e){}
  }
}

/* ================= STATS ================= */
let statsTab = "week";
document.getElementById("stats-tabs").addEventListener("click",(e)=>{
  const btn = e.target.closest("button"); if(!btn) return;
  statsTab = btn.dataset.tab;
  document.querySelectorAll("#stats-tabs button").forEach(b=>b.classList.toggle("active", b===btn));
  renderStats();
});
function renderStats(){
  const body = document.getElementById("stats-body");
  const now = new Date();
  let rangeStart;
  if(statsTab==="week"){ rangeStart = new Date(now); rangeStart.setDate(now.getDate()-6); rangeStart.setHours(0,0,0,0); }
  else if(statsTab==="month"){ rangeStart = new Date(now.getFullYear(), now.getMonth(), 1); }
  else { rangeStart = new Date(0); }

  const doneInRange = state.tasks.filter(t=> t.done && t.completedTs && t.completedTs>=rangeStart.getTime());
  const prevRangeLen = now.getTime()-rangeStart.getTime();
  const prevStart = rangeStart.getTime()-prevRangeLen;
  const donePrev = state.tasks.filter(t=> t.done && t.completedTs && t.completedTs>=prevStart && t.completedTs<rangeStart.getTime());
  let deltaPct = 0;
  if(donePrev.length>0) deltaPct = Math.round(((doneInRange.length-donePrev.length)/donePrev.length)*100);
  else if(doneInRange.length>0) deltaPct = 100;

  // last 7 days bar chart
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(now); d.setDate(now.getDate()-i); d.setHours(0,0,0,0);
    const nd = new Date(d); nd.setDate(d.getDate()+1);
    const count = state.tasks.filter(t=>t.done && t.completedTs>=d.getTime() && t.completedTs<nd.getTime()).length;
    days.push({d, count, isToday: d.toDateString()===now.toDateString()});
  }
  const maxCount = Math.max(1, ...days.map(x=>x.count));

  // categories
  const catCounts = {};
  CATS.forEach(c=>catCounts[c]=0);
  let catTotal = 0;
  state.tasks.filter(t=>t.done && (statsTab==="all" || t.completedTs>=rangeStart.getTime())).forEach(t=>{
    if(t.category && catCounts.hasOwnProperty(t.category)){ catCounts[t.category]++; catTotal++; }
  });

  const dowLabels = days.map(x=>DOWS[(x.d.getDay()+6)%7]);

  body.innerHTML = `
    <div class="stat-card">
      <div class="lbl">Выполнено задач</div>
      <div class="big">${doneInRange.length}</div>
      ${donePrev.length>0 || doneInRange.length>0 ? `<div class="delta">${deltaPct>=0?'+':''}${deltaPct}% от прошлого периода</div>` : ""}
      <div class="bar-row">
        ${days.map(x=>`<div class="bar ${x.isToday?'today':''}" style="height:100%"><b style="height:${Math.max(6,(x.count/maxCount)*100)}%"></b></div>`).join("")}
      </div>
      <div class="bar-labels">${dowLabels.map(l=>`<span>${l}</span>`).join("")}</div>
    </div>
    <div class="stat-card">
      <div class="lbl" style="margin-bottom:14px;">Категории</div>
      ${catTotal===0? `<div class="empty" style="padding:10px 0;">Пока нет данных по категориям</div>` : CATS.map(c=>{
        const pct = catTotal>0? Math.round((catCounts[c]/catTotal)*100) : 0;
        return `<div class="cat-row">
          <div class="cr-top"><span>${c}</span><span class="pct">${pct}%</span></div>
          <div class="cat-bar-bg"><div style="width:${pct}%"></div></div>
        </div>`;
      }).join("")}
    </div>
  `;
}

/* ================= SETTINGS ================= */
function renderSettings(){
  const body = document.getElementById("settings-body");
  const total = state.tasks.length;
  const done = state.tasks.filter(t=>t.done).length;
  body.innerHTML = `
    <div class="set-group">
      <div class="profile-row">
        <div class="av">${batSVG(1)}</div>
        <div>
          <div class="nm">Тёмный Рыцарь</div>
          <div class="sub">Фокус. Дисциплина. Цель.</div>
        </div>
      </div>
    </div>
    <div class="set-group">
      <div class="set-row" onclick="App.toggleNotifications()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
        <div class="lab">Уведомления</div>
        <div class="switch ${state.settings.notifications?'on':''}"><i></i></div>
      </div>
      <div class="set-row" onclick="App.toggleSound()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19 8a5 5 0 010 8"/></svg>
        <div class="lab">Звук</div>
        <div class="switch ${state.settings.sound?'on':''}"><i></i></div>
      </div>
    </div>
    <div class="set-group">
      <div class="set-row" onclick="App.exportData()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>
        <div class="lab">Экспорт данных (резервная копия)</div>
        <div class="val">›</div>
      </div>
      <div class="set-row" onclick="document.getElementById('import-file').click()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/></svg>
        <div class="lab">Импорт данных</div>
        <div class="val">›</div>
      </div>
      <input type="file" id="import-file" accept="application/json" style="display:none" onchange="App.importData(event)">
    </div>
    <div class="set-group">
      <div class="set-row" style="cursor:default">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div class="lab">О приложении</div>
        <div class="val">Всего задач: ${total} · Готово: ${done}</div>
      </div>
    </div>
    <button class="btn-danger" onclick="App.confirmReset()">Сбросить все данные</button>
  `;
}
function toggleSound(){ state.settings.sound = !state.settings.sound; saveData(); renderSettings(); }
function toggleNotifications(){
  if(!state.settings.notifications){
    if("Notification" in window){
      Notification.requestPermission().then(p=>{
        state.settings.notifications = (p==="granted");
        saveData(); renderSettings();
        if(p!=="granted") toast("Разрешение на уведомления не получено");
      });
    } else {
      toast("Уведомления не поддерживаются этим браузером");
    }
  } else {
    state.settings.notifications = false;
    saveData(); renderSettings();
  }
}
function exportData(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "temny-plan-backup.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Файл резервной копии сохранён");
}
function importData(e){
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(!data.tasks) throw new Error("bad file");
      state = data;
      if(!state.settings) state.settings = { sound:true, notifications:false };
      saveData();
      renderTasks(); renderSettings();
      toast("Данные восстановлены");
    }catch(err){ toast("Не удалось прочитать файл"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}
function confirmReset(){
  const sheet = document.getElementById("td-sheet");
  sheet.innerHTML = `<div class="handle"></div><h2>Сбросить все данные?</h2>
    <div style="color:var(--text-dim); font-size:13.5px; line-height:1.6; margin-bottom:18px;">
      Все задачи и настройки будут удалены безвозвратно. Рекомендуем сначала сделать экспорт.
    </div>
    <button class="btn-danger" onclick="App.doReset()">Да, удалить всё</button>
    <button class="btn-ghost" onclick="App.closeTaskDetail()">Отмена</button>`;
  document.getElementById("td-overlay").classList.add("active");
  sheet.classList.add("active");
}
function doReset(){
  state = { tasks: [], settings:{sound:true,notifications:false}, timerTaskId:null };
  saveData();
  closeTaskDetail();
  renderTasks(); renderSettings();
  toast("Данные сброшены");
}

/* ================= Init ================= */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}

renderTasks();

/* Expose API used by inline handlers */
window.App = {
  openNewTask, closeNewTask, saveTask, setPrio, setCat,
  toggleDone, openTaskDetail, closeTaskDetail, editTask, deleteTask, deleteCurrentTask,
  openDatePick, closeDatePick, dpShiftMonth, dpPickDay, pickRelative, confirmDatePick,
  calShift, calPickDay,
  startTimer, toggleTimer, stopTimer, resetTimer, adjustSetupMinutes, pickTimerTask, setTimerTask, startTimerForTask,
  toggleSound, toggleNotifications, exportData, importData, confirmReset, doReset
};
