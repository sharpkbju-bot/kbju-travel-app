const GAS_URL = "https://script.google.com/macros/s/AKfycbxnVqMhIMVfou3B6nIlzQRLsb4QR4bLbkHgreiKGbh6vjBy9s2Oq7HT8bTJWpl_gO9R9A/exec"; 

let totalBudget = 0;
let usedBudget = 0;
let currentAiPlanData = null;
let currentAiLoc = "";
let currentAiReq = "";
let currentAiDest = "";
let currentAiTips = null;
let currentAiFood = null;
let travelStartDate = "";
let travelEndDate = "";

window.addEventListener('DOMContentLoaded', () => {
    flatpickr("#travel-dates", {
        mode: "range", locale: "ko", dateFormat: "Y-m-d", minDate: "today",
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                travelStartDate = instance.formatDate(selectedDates[0], "Y-m-d");
                travelEndDate = instance.formatDate(selectedDates[1], "Y-m-d");
                const diffDays = Math.ceil(Math.abs(selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1;
                document.getElementById('travel-days').value = diffDays;
                updateWeatherInfo();
            }
        }
    });
    fetchServerData();
    loadLastTrip();
});

function showLoading(show, text="처리 중...") {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    element.classList.add('active');
    window.scrollTo(0, 0);
    if (tabId === 'tab-spots' && document.getElementById('travel-location').value) {
        buildDynamicSpots(document.getElementById('travel-location').value, document.getElementById('travel-destination').value || 'default');
    }
}

async function updateWeatherInfo() {
    const loc = document.getElementById('travel-location').value;
    const weatherCard = document.getElementById('weather-info-card');
    if (!loc || !travelStartDate) return;
    weatherCard.style.display = 'flex';
    weatherCard.innerHTML = `<div style="font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> 날씨 조회 중...</div>`;
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=ko&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results) {
            const { latitude, longitude, name } = geoData.results[0];
            const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
            const wData = await wRes.json();
            weatherCard.innerHTML = `<div class="weather-main"><div class="weather-temp">${Math.round(wData.daily.temperature_2m_max[0])}°</div><div>${name}</div></div>`;
        }
    } catch (e) { weatherCard.style.display = 'none'; }
}

function buildTravelTipsAndFood(location, tips, food) {
    const container = document.getElementById('tips-food-container');
    if (!location) return;
    container.style.display = 'block';
    let html = `<div style="margin-bottom:12px;"><h3>💡 ${location} 최신 여행 가이드</h3></div><div class="horizontal-scroll">`;
    html += `<div class="mini-card"><h4>⚠️ 필수 팁</h4><p>${tips || "정보 로딩 중..."}</p></div>`;
    if (food && food.length > 0) {
        food.forEach(f => {
            html += `<div class="mini-card"><h4 style="color:var(--accent)">${f.name}</h4><div class="rating">${f.rating}</div><p>${f.desc}</p></div>`;
        });
    }
    container.innerHTML = html + `</div>`;
}

async function generatePlan() {
    const loc = document.getElementById('travel-location').value;
    const type = document.getElementById('travel-type').value;
    const members = document.getElementById('travel-members').value;
    const days = document.getElementById('travel-days').value;
    const budget = document.getElementById('travel-budget').value;
    if (!loc || !type || !days) return alert("필수 정보를 입력해주세요!");

    showLoading(true, "라이브러리 데이터 및 AI 분석 중...");
    const payload = {
        action: "SAVE_PLAN", location: loc, type: type, members: members,
        destination: document.getElementById('travel-destination').value,
        days: days, accommodation: document.getElementById('travel-accommodation').value,
        departureTime: document.getElementById('travel-departure').value,
        budget: budget, requests: document.getElementById('travel-requests').value,
        startDate: travelStartDate
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            const aiData = JSON.parse(result.aiPlan);
            currentAiPlanData = aiData; currentAiLoc = loc; currentAiDest = payload.destination;
            renderAiSchedule(aiData, loc, payload.requests);
            buildTravelTipsAndFood(loc, JSON.parse(result.tips), JSON.parse(result.restaurants));
            buildDynamicPack(loc, payload.destination);
            totalBudget = Number(budget); updateBudgetUI();
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        } else { alert("오류: " + result.message); }
    } catch (e) { alert("연결 실패"); } finally { showLoading(false); }
}

function renderAiSchedule(data, loc, req) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = req ? `<div class="card" style="background:#fffcf0"><h4>요청 반영: ${req}</h4></div>` : '';
    data.forEach(day => {
        let h = `<div class="timeline"><div class="timeline-day">Day ${day.day} - ${loc}</div>`;
        day.timeline.forEach(item => {
            h += `<div class="timeline-item"><div class="time">${item.time}</div><div class="content"><h4>${item.title}</h4><p>${item.desc}</p></div></div>`;
        });
        container.innerHTML += h + `</div>`;
    });
}

// --- 보관함 로직 ---
function promptSavePlan() {
    if (!currentAiPlanData) return alert("저장할 일정이 없습니다.");
    const name = prompt("일정 이름 입력:");
    if (!name) return;
    let trips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    trips.push({ id: Date.now(), name, loc: currentAiLoc, plan: currentAiPlanData, date: new Date().toLocaleDateString() });
    localStorage.setItem('savedTripsArray', JSON.stringify(trips));
    alert("저장되었습니다!");
}
function toggleSavedPlans() {
    const div = document.getElementById('saved-plans-list');
    div.style.display = div.style.display === 'block' ? 'none' : 'block';
    if(div.style.display === 'block') renderSavedPlansList();
}
function renderSavedPlansList() {
    const div = document.getElementById('saved-plans-list');
    let trips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    div.innerHTML = trips.length ? '' : '저장된 일정 없음';
    trips.reverse().forEach(t => {
        div.innerHTML += `<div class="plan-item" onclick="loadSpecificPlan(${t.id})">${t.name} (${t.loc})</div>`;
    });
}
function loadSpecificPlan(id) {
    const trip = JSON.parse(localStorage.getItem('savedTripsArray')).find(t => t.id === id);
    renderAiSchedule(trip.plan, trip.loc, "");
    switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
}

// --- 지출 관리 로직 ---
function updateBudgetUI() {
    document.getElementById('display-budget').innerText = totalBudget.toLocaleString() + " 원";
    document.getElementById('used-budget').innerText = usedBudget.toLocaleString() + " 원";
    document.getElementById('remaining-budget').innerText = (totalBudget - usedBudget).toLocaleString() + " 원";
}
async function addExpense() {
    const n = document.getElementById('expense-name').value;
    const a = Number(document.getElementById('expense-amount').value);
    if(!n || !a) return;
    showLoading(true);
    await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "ADD_EXPENSE", itemName: n, amountKrw: a, id: Date.now() }) });
    usedBudget += a; updateBudgetUI();
    document.getElementById('expense-history').style.display = 'block';
    document.getElementById('expense-list-content').innerHTML += `<div>${n}: ${a}원</div>`;
    showLoading(false);
}

// --- 사진 갤러리 로직 ---
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    showLoading(true, "사진 저장 중...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "UPLOAD_PHOTO", imageBase64: ev.target.result.split(',')[1], mimeType: file.type, fileName: file.name, location: currentAiLoc }) });
        if(res.ok) { alert("저장 완료!"); fetchServerData(); }
        showLoading(false);
    };
    reader.readAsDataURL(file);
}
async function fetchServerData() {
    try {
        const res = await fetch(GAS_URL);
        const json = await res.json();
        const gallery = document.getElementById('photo-gallery');
        gallery.innerHTML = '';
        json.data.filter(r => r[1] === "PHOTO").forEach(p => {
            gallery.innerHTML += `<div class="photo-card"><img src="${p[3]}"></div>`;
        });
    } catch(e) {}
}

function buildDynamicSpots(l, d) { /* 기존 명소 카드 렌더링 동일 */ }
function buildDynamicPack(l, d) { /* 기존 준비물 렌더링 동일 */ }
function addPackItem() { /* 준비물 추가 로직 동일 */ }
async function syncPackData() { /* 준비물 동기화 동일 */ }
function resetApp() { if(confirm("초기화?")) location.reload(); }
function loadLastTrip() { /* 마지막 일정 불러오기 동일 */ }
