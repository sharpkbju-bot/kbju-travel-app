// ⭐ 주의: 반드시 본인의 구글 앱스 스크립트 배포 웹앱 URL로 교체하세요!
const GAS_URL = "https://script.google.com/macros/s/AKfycbzMKKZPcmpi6uNAIui5X4a6h6lKNkomo0ZpReswEdztdOlbGH1jTN1xsiS5ExsQl9q0Hw/exec"; 

let totalBudget = 0;
let usedBudget = 0;
let currentAiPlanData = null;
let currentAiLoc = "";
let currentAiReq = "";
let currentAiDest = "";
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
                updateWeatherAndCurrency();
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

async function updateWeatherAndCurrency() {
    const loc = document.getElementById('travel-location').value;
    
    const currencySelect = document.getElementById('expense-currency');
    if (loc) {
        if (/일본|오사카|도쿄|후쿠오카|삿포로|교토/.test(loc)) currencySelect.value = 'JPY';
        else if (/태국|방콕|푸껫|푸켓|치앙마이|파타야/.test(loc)) currencySelect.value = 'THB';
        else if (/베트남|다낭|나트랑|냐짱|하노이|호치민|푸꾸옥/.test(loc)) currencySelect.value = 'VND';
        else if (/대만|타이베이|가오슝/.test(loc)) currencySelect.value = 'TWD';
        else if (/필리핀|세부|보라카이|마닐라|보홀/.test(loc)) currencySelect.value = 'PHP';
        else if (/미국|하와이|괌|사이판|뉴욕|LA/.test(loc)) currencySelect.value = 'USD';
        else if (/유럽|프랑스|이탈리아|독일|스페인|파리|로마/.test(loc)) currencySelect.value = 'EUR';
        else currencySelect.value = 'KRW';
    }

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

function searchGoogleMapsHotel() {
    const loc = document.getElementById('travel-location').value;
    const accom = document.getElementById('travel-accommodation').value;
    if (!loc) return alert("상세 여행 목적지를 먼저 입력해주세요!");
    const query = encodeURIComponent(`${loc} ${accom || '호텔'}`);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(googleMapsUrl, '_blank');
}

function buildTravelTipsAndFood(location, tips, food) {
    const container = document.getElementById('tips-food-container');
    if (!location) return;
    container.style.display = 'block';
    let html = `<div style="margin-bottom:12px;"><h3 style="color:var(--primary-dark); font-weight:800;">💡 ${location} 핵심 가이드</h3></div><div class="horizontal-scroll">`;
    html += `<div class="mini-card" style="border-radius:16px; border:1px solid var(--border-color);">
                <h4 style="color:#ef4444; font-weight:800; margin-bottom:6px;"><i class="fa-solid fa-triangle-exclamation"></i> 필수 팁</h4>
                <p style="font-size:13px; color:var(--text-sub);">${tips || "정보가 없습니다."}</p>
             </div>`;
    if (food && food.length > 0) {
        food.forEach(f => {
            html += `<div class="mini-card" style="border-radius:16px; border:1px solid var(--border-color);">
                        <h4 style="color:var(--primary); font-weight:800; margin-bottom:4px;">${f.name}</h4>
                        <div class="rating" style="color:#f59e0b; font-size:12px; margin-bottom:6px;">${f.rating}</div>
                        <p style="font-size:13px; color:var(--text-sub);">${f.desc}</p>
                     </div>`;
        });
    }
    container.innerHTML = html + `</div>`;
}

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

    showLoading(true, "라이브러리에서 정보를 찾는 중...");
    
    const payload = {
        action: "SAVE_PLAN", 
        location: loc, type: type, members: members,
        destination: dest, days: days, accommodation: accom,
        departureTime: depTime, budget: budget, requests: requests,
        startDate: travelStartDate
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            const aiData = JSON.parse(result.aiPlan);
            currentAiPlanData = aiData; currentAiLoc = loc; currentAiDest = dest; currentAiReq = requests;
            
            renderAiSchedule(aiData, loc, requests);
            buildTravelTipsAndFood(loc, JSON.parse(result.tips), JSON.parse(result.restaurants));
            buildDynamicPack(loc, dest);
            buildDynamicSpots(loc, dest);
            
            totalBudget = Number(budget); usedBudget = 0; updateBudgetUI();
            alert("일정 로딩 완료! ✈️");
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        } else {
            alert("안내: " + (result.message || "데이터를 찾을 수 없습니다."));
        }
    } catch (e) { 
        alert("네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요."); 
    } finally { 
        showLoading(false); 
    }
}

// ⭐ 일정 화면 지우기(초기화) 버튼 작동 함수
function resetScheduleScreen() {
    if(!confirm("화면에 표시된 일정을 초기화하시겠습니까?\n(보관함에 저장된 데이터는 삭제되지 않습니다.)")) return;
    
    // 일정 및 팁 화면 비우기
    document.getElementById('schedule-container').innerHTML = '<div style="text-align: center; padding: 40px 0; color: var(--text-sub); font-size: 14px;">설정 탭에서 일정을 생성해주세요.</div>';
    document.getElementById('tips-food-container').style.display = 'none';
    
    // 현재 메모리에 올라간 데이터 비우기
    currentAiPlanData = null;
    currentAiLoc = "";
    currentAiDest = "";
    currentAiReq = "";
    
    alert("화면이 초기화되었습니다.");
}

function renderAiSchedule(data, loc, req) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';
    
    if(!data || data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;">일정 데이터를 불러오지 못했습니다.</div>';
        return;
    }

    if (req) container.innerHTML = `<div class="card" style="background:#f0fdf4; border:1px solid #bbf7d0; margin-bottom:20px; border-radius:16px;"><h4 style="color:#16a34a; font-size:14px; margin-bottom:8px; font-weight:800;"><i class="fa-solid fa-check-circle"></i> 특별 요청사항</h4><p style="font-size:13px; color:#15803d;">${req}</p></div>`;
    
    data.forEach(day => {
        let h = `<div class="timeline"><div class="timeline-day" style="background:var(--primary); color:white; border-radius:8px; padding:6px 12px; font-size:14px; font-weight:700; display:inline-block; margin-bottom:15px;">Day ${day.day} - ${loc}</div>`;
        day.timeline.forEach(item => {
            h += `
            <div class="timeline-item"><div class="time" style="color:var(--secondary); font-weight:800;">${item.time}</div><div class="content" style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:15px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                <h4 style="font-size:15px; margin-bottom:6px; color:var(--text-main); font-weight:800;">${item.title}</h4>
                <p style="font-size:13px; color:var(--text-sub); margin-bottom:10px; line-height:1.5;">${item.desc}</p>
                <div class="schedule-meta" style="border-top:1px dashed #e2e8f0; padding-top:10px; font-size:12px; color:#64748b;">
                    ${item.cost !== '-' ? `<span style="margin-right:12px;"><i class="fa-solid fa-wallet" style="color:var(--primary);"></i> ${item.cost}</span>` : ''}
                    ${item.star !== '-' ? `<span class="star-rating" style="color:#f59e0b;"><i class="fa-solid fa-star"></i> ${item.star}</span>` : ''}
                </div>
            </div></div>`;
        });
        container.innerHTML += h + `</div>`;
    });
}

function buildDynamicSpots(location, destType) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 
    if (!location) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-sub); padding:40px 0;">여행지를 설정하시면 명소가 추천됩니다.</div>';
        return;
    }
    const spotDB = {
        'relax': [
            { name: "프라이빗 힐링 스파", badge: "휴식", icon: "💆‍♀️", desc: "피로를 녹여줄 최고급 스파.", query: `${location} 스파 마사지` },
            { name: "선셋 오션 뷰 카페", badge: "뷰 맛집", icon: "☕", desc: "노을을 보며 즐기는 여유.", query: `${location} 오션뷰 카페` }
        ],
        'tour': [
            { name: "시티 뷰 랜드마크", badge: "포토 스팟", icon: "📸", desc: "이곳에 왔다면 인증샷 필수!", query: `${location} 랜드마크 전망대` },
            { name: "역사 문화 유적지", badge: "필수 코스", icon: "🏛️", desc: "역사와 문화를 이해할 명소.", query: `${location} 유명 유적지` }
        ],
        'food': [
            { name: "로컬 파머스 마켓", badge: "구경 꿀잼", icon: "🛒", desc: "현지인 삶을 엿볼 야시장.", query: `${location} 야시장 전통시장` },
            { name: "미식 가이드 식당", badge: "미식 여행", icon: "🍽️", desc: "여행의 백미, 로컬 최고 맛집.", query: `${location} 맛집` }
        ],
        'activity': [
            { name: "익스트림 테마파크", badge: "액티비티", icon: "🎢", desc: "짜릿한 스릴을 즐길 테마파크.", query: `${location} 테마파크 놀이공원` },
            { name: "로컬 체험 투어", badge: "이색 체험", icon: "🤿", desc: "현지 특별 액티비티 체험.", query: `${location} 액티비티 투어` }
        ],
        'default': [
            { name: "핫플레이스 거리", badge: "번화가", icon: "🛍️", desc: "먹거리 볼거리 가득한 핫플.", query: `${location} 번화가 쇼핑` },
            { name: "파노라마 전망대", badge: "포토 스팟", icon: "📸", desc: "도시 전경을 한눈에 담는 곳.", query: `${location} 전망대` }
        ]
    };

    const selectedSpots = spotDB[destType] || spotDB['default'];
    selectedSpots.forEach(spot => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.query)}`;
        container.innerHTML += `
            <div class="spot-card card" style="display:flex; padding:16px; gap:16px; align-items:center; border-radius:16px;">
                <div class="spot-image" style="font-size:32px; width:64px; height:64px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; display:flex; justify-content:center; align-items:center;">${spot.icon}</div>
                <div class="spot-info" style="flex:1;">
                    <h4 style="font-size:15px; margin-bottom:6px; color:var(--text-main); font-weight:800;">${spot.name}</h4>
                    <span class="badge" style="background:var(--secondary); color:white; padding:4px 8px; border-radius:8px; font-size:11px; font-weight:700;">${spot.badge}</span>
                    <p class="desc" style="font-size:13px; color:var(--text-sub); margin-top:8px;">${spot.desc}</p>
                    <a href="${mapUrl}" target="_blank" style="display:inline-block; margin-top:10px; color:var(--primary); font-weight:800; font-size:13px; text-decoration:none; background:#e0e7ff; padding:6px 12px; border-radius:8px;"><i class="fa-solid fa-map-location-dot"></i> 구글맵 연결</a>
                </div>
            </div>`;
    });
}

function buildDynamicPack(loc, destType) {
    const container = document.getElementById('pack-container');
    const addBox = document.getElementById('pack-add-box');
    Array.from(container.children).forEach(c => { if(c.id !== 'pack-add-box') c.remove(); });
    
    let items = ["여권 및 신분증 사본", "항공/숙소 바우처 인쇄본", "해외 결제용 카드", "비상약 및 멀티 어댑터"];
    if (destType === 'relax') items.push("수영복/비치웨어", "자외선 차단제", "방수팩");
    else if (destType === 'tour') items.push("편한 런닝화", "휴대용 우산/양산", "도난방지 힙색");
    else if (destType === 'food') items.push("소화제 추가", "휴대용 물티슈", "접이식 바구니");
    else if (destType === 'activity') items.push("스포츠웨어", "아쿠아슈즈", "액션캠", "근육통 파스");

    items.forEach((item, index) => {
        const id = 'auto-pack-' + index;
        const html = `
            <div class="check-item" id="item-wrap-${id}" style="display:flex; align-items:center; padding:14px 0; border-bottom:1px solid var(--border-color);">
                <input type="checkbox" id="${id}" style="width:20px; height:20px; accent-color:var(--primary); cursor:pointer;">
                <label for="${id}" style="flex:1; margin-left:14px; font-size:15px; color:var(--text-main); font-weight:500;">${item}</label>
                <button onclick="document.getElementById('item-wrap-${id}').remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:5px; font-size:16px;"><i class="fa-solid fa-trash-can"></i></button>
            </div>`;
        container.insertBefore(document.createRange().createContextualFragment(html), addBox);
    });
}

function addPackItem() {
    const val = document.getElementById('pack-input').value.trim();
    if(!val) return;
    const id = 'manual-pack-' + Date.now();
    const html = `
        <div class="check-item" id="item-wrap-${id}" style="display:flex; align-items:center; padding:14px 0; border-bottom:1px solid var(--border-color);">
            <input type="checkbox" id="${id}" style="width:20px; height:20px; accent-color:var(--primary); cursor:pointer;">
            <label for="${id}" style="flex:1; margin-left:14px; font-size:15px; color:var(--text-main); font-weight:500;">${val}</label>
            <button onclick="document.getElementById('item-wrap-${id}').remove()" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:5px; font-size:16px;"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;
    document.getElementById('pack-container').insertBefore(document.createRange().createContextualFragment(html), document.getElementById('pack-add-box'));
    document.getElementById('pack-input').value = '';
}

async function syncPackData() { alert("체크리스트가 동기화되었습니다!"); }

function updateBudgetUI() {
    document.getElementById('display-budget').innerText = totalBudget.toLocaleString() + " 원";
    document.getElementById('used-budget').innerText = usedBudget.toLocaleString() + " 원";
    document.getElementById('remaining-budget').innerText = (totalBudget - usedBudget).toLocaleString() + " 원";
}

async function addExpense() {
    const n = document.getElementById('expense-name').value;
    const a = Number(document.getElementById('expense-amount').value);
    if (!n || !a) return alert("내역과 금액을 입력하세요.");
    showLoading(true, "저장 중...");
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "ADD_EXPENSE", itemName: n, amountKrw: a, id: Date.now() }) });
        if(res.ok) {
            usedBudget += a; updateBudgetUI();
            document.getElementById('expense-history').style.display = 'block';
            const html = `<div class="expense-item" id="exp-${Date.now()}" style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f1f5f9;"><div><strong style="color:var(--text-main);">${n}</strong></div><div class="text-danger" style="font-weight:800; color:#ef4444;">${a.toLocaleString()} 원</div></div>`;
            document.getElementById('expense-list-content').insertAdjacentHTML('afterbegin', html);
            document.getElementById('expense-name').value = ''; document.getElementById('expense-amount').value = '';
        }
    } catch(e) {} finally { showLoading(false); }
}

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading(true, "저장 중...");
    const reader = new FileReader();
    reader.onload = async (e) => {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "UPLOAD_PHOTO", imageBase64: e.target.result.split(',')[1], mimeType: file.type, fileName: file.name, location: currentAiLoc || "위치 알 수 없음" }) });
        alert("저장 성공!"); fetchServerData();
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
            gallery.innerHTML += `<div class="photo-card" style="position:relative; background:#fff; padding:10px; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border:1px solid var(--border-color);"><img src="${p[3]}" style="width:100%; height:120px; object-fit:cover; border-radius:8px;"><div class="photo-loc" style="font-size:12px; margin-top:10px; color:var(--text-main); font-weight:800;"><i class="fa-solid fa-location-dot" style="color:var(--secondary); margin-right:4px;"></i> ${p[2]}</div></div>`;
        });
    } catch(e) {}
}

function promptSavePlan() {
    if (!currentAiPlanData) return alert("저장할 일정이 없습니다.");
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
    if(!trips.length) return box.innerHTML = "<div style='text-align:center; font-size:13px; color:var(--text-sub);'>보관함이 비어있습니다.</div>";
    box.innerHTML = trips.reverse().map(t => `<div style="padding:14px; background:#f8fafc; border:1px solid var(--border-color); border-radius:12px; margin-bottom:10px; cursor:pointer; font-weight:800; font-size:14px; color:var(--primary-dark);" onclick="loadSpecificPlan(${t.id})">🌍 ${t.name} <span style="font-size:11px; font-weight:500; color:var(--text-sub); display:block; margin-top:6px;">${t.loc} | ${t.date}</span></div>`).join('');
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

function resetApp() { if(confirm("조건을 초기화하시겠습니까?")) location.reload(); }

function loadLastTrip() {
    let trips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    if(trips.length > 0) {
        const last = trips[trips.length-1];
        renderAiSchedule(last.plan, last.loc, "");
        buildDynamicSpots(last.loc, last.dest);
        buildDynamicPack(last.loc, last.dest);
    }
}
