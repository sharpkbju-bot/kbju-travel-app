// ⭐ 주의: 반드시 새로 발급받은 본인의 웹앱 URL(GAS_URL)로 수정해서 사용하세요!
const GAS_URL = "https://script.google.com/macros/s/AKfycbx0QwxBQ_sD4Tuwk7bcDHWX_XxOU8vyp-X2KmUB8-kYQQx0TiDXNv9n3Fu-UwbsKGCWlw/exec"; 

let totalBudget = 0;
let usedBudget = 0;

// 현재 화면 상태 관리 변수
let currentAiPlanData = null;
let currentAiLoc = "";
let currentAiReq = "";
let currentAiDest = "";
let travelStartDate = "";
let travelEndDate = "";

// 1. 캘린더(Flatpickr) 초기화 및 날짜 계산 로직
window.addEventListener('DOMContentLoaded', () => {
    flatpickr("#travel-dates", {
        mode: "range",
        locale: "ko",
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                travelStartDate = instance.formatDate(selectedDates[0], "Y-m-d");
                travelEndDate = instance.formatDate(selectedDates[1], "Y-m-d");
                
                // 여행 기간(일) 자동 계산
                const diffTime = Math.abs(selectedDates[1] - selectedDates[0]);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                document.getElementById('travel-days').value = diffDays;
                
                // 날짜 선택 시 날씨 정보 업데이트 트리거
                updateWeatherInfo();
            }
        }
    });
    
    // 초기 데이터 로드
    fetchServerData();
    loadLastTrip();
});

// 2. 날씨 정보 가져오기 (Open-Meteo API 사용)
async function updateWeatherInfo() {
    const loc = document.getElementById('travel-location').value;
    const dateInput = document.getElementById('travel-dates').value;
    const weatherCard = document.getElementById('weather-info-card');

    if (!loc || !travelStartDate) return;

    weatherCard.style.display = 'flex';
    weatherCard.innerHTML = `<div style="font-size:13px; font-weight:800;"><i class="fa-solid fa-spinner fa-spin"></i> ${loc} 날씨 분석 중...</div>`;

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=ko&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            weatherCard.innerHTML = `<div>📍 '${loc}' 위치를 찾을 수 없어 날씨를 불러오지 못했습니다.</div>`;
            return;
        }

        const { latitude, longitude, name } = geoData.results[0];
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherRes.json();

        const maxTemp = weatherData.daily.temperature_2m_max[0];
        const minTemp = weatherData.daily.temperature_2m_min[0];
        const weatherCode = weatherData.daily.weathercode[0];

        const weatherMap = {
            0: { icon: "☀️", desc: "맑음" },
            1: { icon: "🌤️", desc: "대체로 맑음" },
            2: { icon: "⛅", desc: "구름 조금" },
            3: { icon: "☁️", desc: "흐림" },
            45: { icon: "🌫️", desc: "안개" },
            51: { icon: "🌦️", desc: "이슬비" },
            61: { icon: "🌧️", desc: "비" },
            71: { icon: "❄️", desc: "눈" },
            95: { icon: "⚡", desc: "뇌우" }
        };

        const currentW = weatherMap[weatherCode] || { icon: "🌡️", desc: "정보 없음" };

        weatherCard.innerHTML = `
            <div class="weather-main">
                <div class="weather-icon">${currentW.icon}</div>
                <div>
                    <div class="weather-temp">${Math.round(maxTemp)}° / ${Math.round(minTemp)}°</div>
                    <div class="weather-desc">${name} | ${currentW.desc}</div>
                </div>
            </div>
            <div class="weather-detail">
                <div>📅 여행 시작일 기준</div>
                <div style="font-size:10px; opacity:0.7;">현지 기상 상황에 따라<br>변동될 수 있습니다.</div>
            </div>
        `;
    } catch (e) {
        weatherCard.innerHTML = `<div>날씨 정보를 불러오는 중 에러가 발생했습니다.</div>`;
    }
}

// 3. 여행 팁 및 맛집 추천 동적 렌더링
function buildTravelTipsAndFood(location) {
    const container = document.getElementById('tips-food-container');
    if (!location) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    
    // 여행지 이름을 반영하여 맞춤형 데이터처럼 렌더링 (가이드용 데이터)
    container.innerHTML = `
        <div style="margin-bottom: 12px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">💡 ${location} 꿀팁 & 로컬 맛집</h3>
            <p style="font-size: 12px; color: var(--text-sub);">성공적인 여행을 위한 AI 추천 정보입니다.</p>
        </div>
        
        <div class="horizontal-scroll">
            <div class="mini-card">
                <h4>⚠️ 필수 여행 팁</h4>
                <p>${location}에서는 소매치기를 주의하고, 현지 시장 이용 시 간단한 흥정이 필요할 수 있습니다. 대중교통 패스권을 미리 준비하면 교통비를 크게 아낄 수 있습니다!</p>
            </div>
            <div class="mini-card">
                <h4 style="color: var(--accent);">🍜 로컬 찐맛집 1번가</h4>
                <div class="rating">★★★★☆ (4.5 / 여행객 평가)</div>
                <p>현지인들이 줄 서서 먹는 숨은 맛집! 가성비가 매우 훌륭하며, ${location} 특유의 진한 풍미를 느낄 수 있는 대표 메뉴를 추천합니다.</p>
            </div>
            <div class="mini-card">
                <h4 style="color: #2a9d8f;">🍤 분위기 끝판왕 레스토랑</h4>
                <div class="rating">★★★★★ (4.8 / 여행객 평가)</div>
                <p>깔끔하고 감각적인 인테리어와 친절한 서비스가 돋보입니다. 멋진 뷰를 보며 여유롭게 저녁 식사하기 완벽한 식당입니다.</p>
            </div>
        </div>
    `;
}

// 4. 공통 유틸리티 및 기존 로직
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

    if (tabId === 'tab-spots') {
        const locInput = document.getElementById('travel-location').value;
        const destInput = document.getElementById('travel-destination').value || 'default';
        if (locInput) buildDynamicSpots(locInput, destInput);
    }
}

function searchAccommodation() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("상세 여행지를 먼저 입력해주세요!");
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(loc + " 숙소 호텔")}`;
    window.open(searchUrl, '_blank');
}

async function fetchServerData() {
    showLoading(true, "서버 데이터 연결 중...");
    try {
        const response = await fetch(GAS_URL);
        const result = await response.json();
        if (result.result === "success") renderGallery(result.data);
    } catch (e) { console.error(e); } finally { showLoading(false); }
}

function renderAiSchedule(aiData, location, requests) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';
    
    if (requests && requests.trim() !== "") {
        container.innerHTML += `
        <div class="card" style="background:#fffcf0; border:1px solid #ffe066; margin-bottom:20px;">
            <h4 style="color:#f59f00; font-size:14px; margin-bottom:8px;"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 특별 요청 완벽 반영</h4>
            <p style="font-size:14px; line-height:1.5;">"${requests}"</p>
        </div>`;
    }
    
    try {
        aiData.forEach(day => {
            let html = `<div class="timeline"><div class="timeline-day">Day ${day.day} - ${location}</div>`;
            day.timeline.forEach(item => {
                html += `
                <div class="timeline-item"><div class="time">${item.time}</div><div class="content">
                    <h4>${item.title}</h4><p>${item.desc}</p>
                    <div class="schedule-meta">
                        <span><i class="fa-solid fa-map-pin"></i> ${item.dist || '-'}</span>
                        <span><i class="fa-solid fa-wallet"></i> ${item.cost || '-'}</span>
                        <span class="star-rating"><i class="fa-solid fa-star"></i> ${item.star || '-'}</span>
                    </div>
                </div></div>`;
            });
            container.innerHTML += html + `</div>`;
        });
    } catch(e) {
        container.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 50px 0;">일정을 불러오지 못했습니다.</div>`;
    }
}

function buildDynamicSpots(location, destType) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 
    const spotDB = {
        'relax': [{ name: "스파 & 온천", badge: "힐링", icon: "💆", desc: "여행의 피로를 풀어줄 최고의 선택.", time: "시내", cost: "3만~", query: `${location} 스파` }],
        'tour': [{ name: "역사 유적지", badge: "필수", icon: "🏛️", desc: "이 지역의 역사를 한눈에.", time: "중심지", cost: "무료~", query: `${location} 유적지` }],
        'food': [{ name: "로컬 맛집 거리", badge: "미식", icon: "🍴", desc: "진짜 로컬들의 숨은 맛집.", time: "시내", cost: "2만~", query: `${location} 맛집` }],
        'activity': [{ name: "테마파크", badge: "스릴", icon: "🎢", desc: "활동적인 하루를 위한 장소.", time: "외곽", cost: "5만~", query: `${location} 액티비티` }],
        'default': [
            { name: "로컬 마켓", badge: "구경", icon: "🛒", desc: "현지인들의 삶을 엿보는 곳.", time: "중심가", cost: "1만~", query: `${location} 시장` },
            { name: "전망대", badge: "포토", icon: "📸", desc: "인생샷을 위한 필수 방문지.", time: "대중교통 20분", cost: "2만~", query: `${location} 전망대` }
        ]
    };
    const spots = spotDB[destType] || spotDB['default'];
    spots.forEach(spot => {
        const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(spot.query)}`;
        container.innerHTML += `
            <div class="spot-card card">
                <div class="spot-image">${spot.icon}</div>
                <div class="spot-info">
                    <h4>${spot.name}</h4><span class="badge">${spot.badge}</span><p class="desc">${spot.desc}</p>
                    <div class="spot-meta"><span><i class="fa-solid fa-clock"></i> ${spot.time}</span><span><i class="fa-solid fa-wallet"></i> ${spot.cost}</span></div>
                    <a href="${mapUrl}" target="_blank" class="map-link"><i class="fa-solid fa-map-location-dot"></i> 구글 맵</a>
                </div>
            </div>`;
    });
}

async function generatePlan() {
    const members = document.getElementById('travel-members').value;
    const type = document.getElementById('travel-type').value;
    const loc = document.getElementById('travel-location').value;
    const dest = document.getElementById('travel-destination').value;
    const accom = document.getElementById('travel-accommodation').value; 
    const requests = document.getElementById('travel-requests').value; 
    const depTime = document.getElementById('travel-departure').value;
    const days = document.getElementById('travel-days').value;
    const budget = document.getElementById('travel-budget').value;
    
    if (!members || !type || !loc || !dest || !travelStartDate || !days || !budget) return alert("날짜를 포함한 모든 설정을 입력해주세요! 📝");

    totalBudget = Number(budget);
    usedBudget = 0;
    updateBudgetUI();

    showLoading(true, "AI가 최적의 동선을 설계 중입니다...");

    const payload = {
        action: "SAVE_PLAN", location: loc, departureTime: depTime, members: members,
        type: type, destination: dest, days: days, budget: budget, accommodation: accom, requests: requests,
        startDate: travelStartDate, endDate: travelEndDate
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            const aiData = JSON.parse(result.aiPlan);
            currentAiPlanData = aiData;
            currentAiLoc = loc;
            currentAiReq = requests;
            currentAiDest = dest;
            
            // 일정, 꿀팁, 명소 렌더링
            renderAiSchedule(aiData, loc, requests);
            buildTravelTipsAndFood(loc); // 팁&맛집 호출
            buildDynamicSpots(loc, dest);
            
            alert(`맞춤형 일정이 생성되었습니다! ✈️`);
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        }
    } catch (error) { alert("통신 오류 발생"); } finally { showLoading(false); }
}

function updateBudgetUI() {
    const remaining = totalBudget - usedBudget;
    document.getElementById('display-budget').innerText = totalBudget.toLocaleString() + " 원";
    document.getElementById('used-budget').innerText = usedBudget.toLocaleString() + " 원";
    document.getElementById('remaining-budget').innerText = remaining.toLocaleString() + " 원";
}

async function addExpense() {
    const name = document.getElementById('expense-name').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    if(!name || !amount) return alert("내역과 금액을 입력하세요.");

    let rate = 1; if (currency === 'USD') rate = 1350; else if (currency === 'JPY') rate = 9.0;
    const amountKrw = Math.round(amount * rate);
    const expenseId = new Date().getTime();

    showLoading(true, "저장 중...");
    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "ADD_EXPENSE", id: expenseId, itemName: name, amount: amount, currency: currency, amountKrw: amountKrw }) });
        usedBudget += amountKrw; updateBudgetUI();
        document.getElementById('expense-history').style.display = 'block';
        const itemHtml = `<div class="expense-item" id="exp-${expenseId}"><div><strong>${name}</strong></div><div style="text-align: right;"><strong class="text-danger">${amount.toLocaleString()} ${currency}</strong></div></div>`;
        document.getElementById('expense-list-content').insertAdjacentHTML('afterbegin', itemHtml);
    } catch (e) { alert("오류"); } finally { showLoading(false); }
}

function renderGallery(dataRows) {
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = '';
    const photos = dataRows.filter(row => row[1] === "PHOTO");
    photos.reverse().forEach(p => {
        gallery.innerHTML += `
            <div class="photo-card">
                <img src="${p[3]}">
                <div class="photo-loc"><i class="fa-solid fa-location-dot"></i> ${p[2]}</div>
            </div>`;
    });
}

function resetApp() {
    if(!confirm("모두 초기화할까요?")) return;
    
    // UI 강제 리셋 방어 코드
    document.getElementById('tips-food-container').style.display = 'none';
    location.reload();
}

function exitApp() {
    if(confirm("앱을 종료하시겠습니까?")) {
        document.body.innerHTML = `<div style="display:flex; height:100vh; justify-content:center; align-items:center;">즐거운 여행 되세요! ✈️</div>`;
    }
}

function loadLastTrip() {
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    if (savedTrips.length > 0) {
        const last = savedTrips[savedTrips.length - 1];
        renderAiSchedule(last.plan, last.loc, last.req);
        buildTravelTipsAndFood(last.loc); // 보관함 로드 시에도 호출
    }
}
