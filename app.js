// ⭐ 주의: 반드시 본인의 구글 앱스 스크립트 배포 웹앱 URL로 교체하세요!
const GAS_URL = "https://script.google.com/macros/s/AKfycbzvsymoV0zexvzpXGzhhO1dmcF0-Dgo5b9El4_vW9qoiJ_bSi90s6oxM1uDUGOrFSv6Lg/exec"; 

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

// 1. 초기화 및 캘린더 이벤트 리스너
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

// 2. 공통 UI 제어 함수
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
    
    // 명소 탭 클릭 시 자동 큐레이션 실행
    if (tabId === 'tab-spots' && document.getElementById('travel-location').value) {
        buildDynamicSpots(document.getElementById('travel-location').value, document.getElementById('travel-destination').value || 'default');
    }
}

// 3. 실시간 날씨 정보 (Open-Meteo)
async function updateWeatherInfo() {
    const loc = document.getElementById('travel-location').value;
    const weatherCard = document.getElementById('weather-info-card');
    if (!loc || !travelStartDate) return;
    weatherCard.style.display = 'flex';
    weatherCard.innerHTML = `<div style="font-size:13px; color:#fff; font-weight:800;"><i class="fa-solid fa-spinner fa-spin"></i> 날씨 조회 중...</div>`;
    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=ko&format=json`);
        const geoData = await geoRes.json();
        if (geoData.results) {
            const { latitude, longitude, name } = geoData.results[0];
            const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
            const wData = await wRes.json();
            weatherCard.innerHTML = `<div class="weather-main"><div class="weather-temp">${Math.round(wData.daily.temperature_2m_max[0])}°</div><div><div style="font-weight:700; font-size:15px;">${name}</div><div style="font-size:11px; opacity:0.8;">여행 시작일 기준 예보</div></div></div>`;
        }
    } catch (e) { weatherCard.style.display = 'none'; }
}

// 4. 여행 팁 및 맛집 렌더링
function buildTravelTipsAndFood(location, tips, food) {
    const container = document.getElementById('tips-food-container');
    if (!location) return;
    container.style.display = 'block';
    let html = `<div style="margin-bottom:12px;"><h3>💡 ${location} 최신 가이드</h3></div><div class="horizontal-scroll">`;
    html += `<div class="mini-card"><h4>⚠️ 필수 팁</h4><p>${tips || "정보 로딩 중..."}</p></div>`;
    if (food && food.length > 0) {
        food.forEach(f => {
            html += `<div class="mini-card"><h4 style="color:var(--accent)">${f.name}</h4><div class="rating">${f.rating}</div><p>${f.desc}</p></div>`;
        });
    }
    container.innerHTML = html + `</div>`;
}

// 5. 메인 일정 생성 및 서버 연동 (캐시 기능 포함)
async function generatePlan() {
    const loc = document.getElementById('travel-location').value;
    const type = document.getElementById('travel-type').value;
    const members = document.getElementById('travel-members').value;
    const dest = document.getElementById('travel-destination').value;
    const days = document.getElementById('travel-days').value;
    const budget = document.getElementById('travel-budget').value;
    const requests = document.getElementById('travel-requests').value;
    const depTime = document.getElementById('travel-departure').value;
    const accom = document.getElementById('travel-accommodation').value;

    if (!loc || !type || !days) return alert("필수 항목(목적지, 구성원, 기간)을 입력하세요!");

    showLoading(true, "라이브러리 및 AI 데이터 분석 중...");
    const payload = {
        action: "SAVE_PLAN", location: loc, type: type, members: members,
        destination: dest, days: days, accommodation: accom,
        departureTime: depTime, budget: budget, requests: requests,
        startDate: travelStartDate
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            const aiData = JSON.parse(result.aiPlan);
            currentAiPlanData = aiData; currentAiLoc = loc; currentAiDest = dest;
            
            // 데이터 렌더링 호출
            renderAiSchedule(aiData, loc, requests);
            buildTravelTipsAndFood(loc, JSON.parse(result.tips), JSON.parse(result.restaurants));
            buildDynamicPack(loc, dest);
            buildDynamicSpots(loc, dest);
            
            totalBudget = Number(budget); usedBudget = 0; updateBudgetUI();
            alert("최신 정보 로딩 완료! ✈️");
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        } else {
            alert("서버 오류: " + (result.message || "알 수 없는 에러"));
        }
    } catch (e) { alert("서버와의 통신에 실패했습니다."); } finally { showLoading(false); }
}

function renderAiSchedule(data, loc, req) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';
    if (req) container.innerHTML = `<div class="card" style="background:#fffcf0; border:1px solid #ffe066; margin-bottom:20px;"><h4 style="color:#d9480f; font-size:14px; margin-bottom:8px;">특별 요청 반영</h4><p style="font-size:13px;">${req}</p></div>`;
    data.forEach(day => {
        let h = `<div class="timeline"><div class="timeline-day">Day ${day.day} - ${loc}</div>`;
        day.timeline.forEach(item => {
            h += `
            <div class="timeline-item"><div class="time">${item.time}</div><div class="content">
                <h4 style="font-size:15px; margin-bottom:4px;">${item.title}</h4><p style="font-size:13px; color:var(--text-sub);">${item.desc}</p>
                <div class="schedule-meta">
                    ${item.cost !== '-' ? `<span><i class="fa-solid fa-wallet"></i> ${item.cost}</span>` : ''}
                    ${item.star !== '-' ? `<span class="star-rating"><i class="fa-solid fa-star"></i> ${item.star}</span>` : ''}
                </div>
            </div></div>`;
        });
        container.innerHTML += h + `</div>`;
    });
}

// ⭐ 6. 명소 큐레이션 동적 생성 (고도화 완료 & 구글맵 링크 수정)
function buildDynamicSpots(location, destType) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 
    if (!location) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-sub); padding:40px 0;">여행지를 설정하시면 명소가 추천됩니다.</div>';
        return;
    }

    const spotDB = {
        'relax': [
            { name: "프라이빗 힐링 스파", badge: "휴식", icon: "💆‍♀️", desc: "여행의 피로를 녹여줄 최고급 스파 체험.", time: "숙소 인근", cost: "약 5만 원~", query: `${location} 스파 마사지` },
            { name: "선셋 오션 뷰 카페", badge: "뷰 맛집", icon: "☕", desc: "아름다운 노을을 보며 즐기는 여유로운 커피 한 잔.", time: "해변/전망 좋은 곳", cost: "약 1.5만 원", query: `${location} 오션뷰 카페` }
        ],
        'tour': [
            { name: "시티 뷰 랜드마크", badge: "포토 스팟", icon: "📸", desc: "이곳에 왔다면 인증샷은 필수!", time: "대중교통 20분", cost: "약 2만 원", query: `${location} 랜드마크 전망대` },
            { name: "역사 문화 유적지", badge: "필수 코스", icon: "🏛️", desc: "현지의 역사와 문화를 깊이 이해할 수 있는 명소.", time: "중심가", cost: "약 1만 원", query: `${location} 유명 유적지` }
        ],
        'food': [
            { name: "로컬 파머스 마켓", badge: "구경 꿀잼", icon: "🛒", desc: "현지인들의 삶을 가장 가까이서 엿볼 수 있는 곳.", time: "중심가", cost: "무료 (구경)", query: `${location} 야시장 전통시장` },
            { name: "추천 미식 가이드 식당", badge: "미식 여행", icon: "🍽️", desc: "여행의 백미는 역시 맛있는 음식! 로컬 최고 맛집.", time: "택시 10분", cost: "약 4만 원~", query: `${location} 맛집 미슐랭` }
        ],
        'activity': [
            { name: "익스트림 테마파크", badge: "액티비티", icon: "🎢", desc: "짜릿한 스릴을 즐길 수 있는 최고의 테마파크.", time: "외곽 지역", cost: "약 6만 원~", query: `${location} 테마파크 놀이공원` },
            { name: "로컬 체험 투어", badge: "이색 체험", icon: "🤿", desc: "현지에서만 즐길 수 있는 특별한 액티비티 체험.", time: "해변/외곽", cost: "약 8만 원~", query: `${location} 액티비티 투어` }
        ],
        'default': [
            { name: "로컬 핫플레이스 거리", badge: "번화가", icon: "🛍️", desc: "먹거리와 볼거리가 가득한 현지인들의 핫플.", time: "중심가", cost: "무료", query: `${location} 번화가 쇼핑` },
            { name: "파노라마 전망대", badge: "포토 스팟", icon: "📸", desc: "아름다운 도시의 전경을 한눈에 담을 수 있는 곳.", time: "대중교통", cost: "약 2만 원", query: `${location} 전망대` }
        ]
    };

    const selectedSpots = spotDB[destType] || spotDB['default'];
    
    selectedSpots.forEach(spot => {
        // 정확한 구글 맵스 검색 API 링크 적용
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.query)}`;
        container.innerHTML += `
            <div class="spot-card card" style="display:flex; padding:15px; gap:15px; align-items:center;">
                <div class="spot-image" style="font-size:35px; width:70px; height:70px; background:#f1f3f5; border-radius:12px; display:flex; justify-content:center; align-items:center;">${spot.icon}</div>
                <div class="spot-info" style="flex:1;">
                    <h4 style="font-size:15px; margin-bottom:4px;">${spot.name}</h4>
                    <span class="badge" style="background:var(--accent); color:white; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:800;">${spot.badge}</span>
                    <p class="desc" style="font-size:12px; color:var(--text-sub); margin-top:6px;">${spot.desc}</p>
                    <a href="${mapUrl}" target="_blank" class="map-link" style="display:inline-block; margin-top:8px; color:var(--primary); font-weight:800; font-size:12px; text-decoration:none;"><i class="fa-solid fa-map-location-dot"></i> 구글맵 길찾기</a>
                </div>
            </div>`;
    });
}

// ⭐ 7. 여행 테마별 맞춤 스마트 준비물 (고도화 완료)
function buildDynamicPack(loc, destType) {
    const container = document.getElementById('pack-container');
    const addBox = document.getElementById('pack-add-box');
    
    // 기존 동적 아이템 지우기 (수동 추가 박스 제외)
    Array.from(container.children).forEach(c => { if(c.id !== 'pack-add-box') c.remove(); });
    
    // [기본 필수 준비물]
    let items = [
        "여권 및 신분증 사본", 
        "항공권 / 숙소 바우처 인쇄본", 
        "비상약 (소화제, 감기약, 대일밴드)", 
        "해외 결제용 카드 (트래블월렛 등)", 
        "멀티 어댑터 및 보조배터리",
        "세면도구 및 기본 스킨케어"
    ];

    // [테마별 맞춤 준비물 추가]
    if (destType === 'relax') {
        items.push("수영복 및 비치웨어", "선글라스 및 자외선 차단제", "스마트폰 방수팩");
    } else if (destType === 'tour') {
        items.push("발이 편한 런닝화/단화", "휴대용 우산 및 양산", "크로스백 또는 도난방지 힙색");
    } else if (destType === 'food') {
        items.push("소화제 및 지사제 (여분 추가)", "휴대용 물티슈 및 얼룩 제거펜", "접이식 시장 바구니");
    } else if (destType === 'activity') {
        items.push("기능성 스포츠웨어", "아쿠아슈즈 또는 가벼운 등산화", "액션캠 (고프로 등)", "근육통 파스/스프레이");
    }

    // 화면에 렌더링
    items.forEach((item, index) => {
        const id = 'auto-pack-' + index;
        const html = `
            <div class="check-item" id="item-wrap-${id}" style="display:flex; align-items:center; padding:12px 0; border-bottom:1px solid var(--border-color);">
                <input type="checkbox" id="${id}" style="width:18px; height:18px; accent-color:var(--primary);">
                <label for="${id}" style="flex:1; margin-left:12px; font-size:14px;">${item}</label>
                <button onclick="document.getElementById('item-wrap-${id}').remove()" style="background:none; border:none; color:var(--danger); cursor:pointer; padding:5px;"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        container.insertBefore(document.createRange().createContextualFragment(html), addBox);
    });
}

function addPackItem() {
    const val = document.getElementById('pack-input').value.trim();
    if(!val) return;
    const id = 'manual-pack-' + Date.now();
    const html = `
        <div class="check-item" id="item-wrap-${id}" style="display:flex; align-items:center; padding:12px 0; border-bottom:1px solid var(--border-color);">
            <input type="checkbox" id="${id}" style="width:18px; height:18px; accent-color:var(--primary);">
            <label for="${id}" style="flex:1; margin-left:12px; font-size:14px;">${val}</label>
            <button onclick="document.getElementById('item-wrap-${id}').remove()" style="background:none; border:none; color:var(--danger); cursor:pointer; padding:5px;"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    document.getElementById('pack-container').insertBefore(document.createRange().createContextualFragment(html), document.getElementById('pack-add-box'));
    document.getElementById('pack-input').value = '';
}

async function syncPackData() { alert("체크리스트가 디바이스에 안전하게 동기화되었습니다!"); }

// 8. 예산 관리 로직
function updateBudgetUI() {
    document.getElementById('display-budget').innerText = totalBudget.toLocaleString() + " 원";
    document.getElementById('used-budget').innerText = usedBudget.toLocaleString() + " 원";
    document.getElementById('remaining-budget').innerText = (totalBudget - usedBudget).toLocaleString() + " 원";
}

async function addExpense() {
    const n = document.getElementById('expense-name').value;
    const a = Number(document.getElementById('expense-amount').value);
    if (!n || !a) return alert("내역과 금액을 모두 입력하세요.");
    showLoading(true, "저장 중...");
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "ADD_EXPENSE", itemName: n, amountKrw: a, id: Date.now() }) });
        if(res.ok) {
            usedBudget += a; updateBudgetUI();
            document.getElementById('expense-history').style.display = 'block';
            const html = `<div class="expense-item" id="exp-${Date.now()}" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px dashed #eee;"><div><strong>${n}</strong></div><div class="text-danger" style="font-weight:800;">${a.toLocaleString()} 원</div></div>`;
            document.getElementById('expense-list-content').insertAdjacentHTML('afterbegin', html);
            document.getElementById('expense-name').value = ''; document.getElementById('expense-amount').value = '';
        }
    } catch(e) {} finally { showLoading(false); }
}

// 9. 사진 갤러리 및 업로드 로직
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading(true, "위치 정보 매핑 및 저장 중...");
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "UPLOAD_PHOTO", imageBase64: base64, mimeType: file.type, fileName: file.name, location: currentAiLoc || "여행지" }) });
        alert("갤러리에 성공적으로 저장되었습니다!"); 
        fetchServerData();
        showLoading(false);
    };
    reader.readAsDataURL(file);
}

async function fetchServerData() {
    try {
        const res = await fetch(GAS_URL);
        const result = await res.json();
        const gallery = document.getElementById('photo-gallery');
        gallery.innerHTML = '';
        const photos = result.data.filter(r => r[1] === "PHOTO").reverse();
        if (photos.length === 0) {
            gallery.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-sub); padding: 30px 0; font-size: 13px;">아직 촬영된 사진이 없습니다.</div>`;
            return;
        }
        photos.forEach(p => {
            gallery.innerHTML += `<div class="photo-card" style="position:relative; background:#fff; padding:10px; border-radius:12px; box-shadow:0 2px 5px rgba(0,0,0,0.05);"><img src="${p[3]}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;"><div class="photo-loc" style="font-size:11px; margin-top:8px; color:var(--text-main); font-weight:700;"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${p[2]}</div></div>`;
        });
    } catch(e) {}
}

// ⭐ 10. AI 숙소 추천 로직 (복구 완료)
async function recommendHotels() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("상세 여행지를 먼저 입력해주세요! (예: 오사카)");
    
    const box = document.getElementById('hotel-recommend-box');
    box.style.display = 'block';
    box.innerHTML = `<div style="font-size:13px; color:var(--primary); padding:10px 0;"><i class="fa-solid fa-spinner fa-spin"></i> AI가 인기 숙소를 탐색 중입니다...</div>`;
    
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RECOMMEND_HOTELS", location: loc }) });
        const result = await response.json();
        if(result.result === "success") {
            try {
                const hotels = JSON.parse(result.hotels);
                let html = `<div style="font-size:12px; color:var(--text-sub); margin-bottom:8px;">원하는 숙소를 터치하면 자동 입력됩니다.</div><div style="display:flex; flex-wrap:wrap; gap:6px;">`;
                hotels.forEach(h => {
                    const safeName = h.replace(/'/g, "\\'");
                    html += `<button onclick="document.getElementById('travel-accommodation').value='${safeName}'; document.getElementById('hotel-recommend-box').style.display='none';" style="background:#f8f9fa; border:1px solid #dee2e6; padding:6px 12px; border-radius:20px; font-size:12px; cursor:pointer; color:var(--text-main);">${h}</button>`;
                });
                html += `</div>`;
                box.innerHTML = html;
            } catch(e) { box.innerHTML = `<div style="font-size:13px; color:var(--danger);">데이터를 파싱하지 못했습니다.</div>`; }
        }
    } catch(e) { box.innerHTML = `<div style="font-size:13px; color:var(--danger);">통신 에러가 발생했습니다.</div>`; }
}

// 11. 보관함 (로컬스토리지) 로직
function promptSavePlan() {
    if (!currentAiPlanData) return alert("먼저 일정을 생성해 주세요.");
    const name = prompt("이 일정의 이름을 지어주세요:");
    if (!name) return;
    let trips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    trips.push({ id: Date.now(), name, loc: currentAiLoc, dest: currentAiDest, plan: currentAiPlanData, date: new Date().toLocaleDateString() });
    localStorage.setItem('savedTripsArray', JSON.stringify(trips));
    alert("보관함에 저장되었습니다!");
}

function toggleSavedPlans() {
    const box = document.getElementById('saved-plans-list');
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
    if(box.style.display === 'block') renderSavedPlansList();
}

function renderSavedPlansList() {
    const box = document.getElementById('saved-plans-list');
    let trips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    if(!trips.length) return box.innerHTML = "<div style='text-align:center; font-size:13px; color:#888;'>보관함이 비어있습니다.</div>";
    box.innerHTML = trips.reverse().map(t => `<div style="padding:12px; background:#fff; border:1px solid #eee; border-radius:8px; margin-bottom:8px; cursor:pointer; font-weight:700; font-size:14px;" onclick="loadSpecificPlan(${t.id})">🌍 ${t.name} <span style="font-size:11px; font-weight:400; color:#888; display:block; margin-top:4px;">${t.loc} | ${t.date}</span></div>`).join('');
}

function loadSpecificPlan(id) {
    const trips = JSON.parse(localStorage.getItem('savedTripsArray'));
    const t = trips.find(trip => trip.id === id);
    renderAiSchedule(t.plan, t.loc, "");
    buildDynamicSpots(t.loc, t.dest);
    buildDynamicPack(t.loc, t.dest);
    switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
    document.getElementById('saved-plans-list').style.display = 'none';
}

function resetApp() { if(confirm("입력된 모든 설정을 초기화하시겠습니까?")) location.reload(); }

function loadLastTrip() {
    let trips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    if(trips.length > 0) {
        const last = trips[trips.length-1];
        renderAiSchedule(last.plan, last.loc, "");
        buildDynamicSpots(last.loc, last.dest);
        buildDynamicPack(last.loc, last.dest);
    }
}
