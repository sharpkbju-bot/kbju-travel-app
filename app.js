// ⭐ 주의: 반드시 새로 발급받은 본인의 웹앱 URL(GAS_URL)로 수정해서 사용하세요!
const GAS_URL = "https://script.google.com/macros/s/AKfycbws2FKLTHfhomf9xPwtnqiUr65AwULEzcTq5Xw01G3ueG7Xb5tmqwOWxGED-UeC2TAgnA/exec"; 

let totalBudget = 0;
let usedBudget = 0;

// 현재 화면 상태 관리 변수
let currentAiPlanData = null;
let currentAiLoc = "";
let currentAiReq = "";
let currentAiDest = "";
let currentAiTips = null; // ⭐ 동적 여행 팁 저장용 변수 추가
let currentAiFood = null; // ⭐ 동적 맛집 데이터 저장용 변수 추가
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

// 3. 여행 팁 및 맛집 추천 동적 렌더링 (⭐ 동적 파라미터 적용)
function buildTravelTipsAndFood(location, tipsData, foodData) {
    const container = document.getElementById('tips-food-container');
    if (!location) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    
    let html = `
        <div style="margin-bottom: 12px;">
            <h3 style="font-size: 15px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">💡 ${location} 꿀팁 & 로컬 맛집</h3>
            <p style="font-size: 12px; color: var(--text-sub);">성공적인 여행을 위한 AI 추천 정보입니다.</p>
        </div>
        <div class="horizontal-scroll">
    `;

    // 실제 서버에서 받은 팁 데이터가 있으면 반영, 없으면 대체 텍스트(Fallback) 적용
    const actualTip = tipsData ? tipsData : `${location}에서는 소매치기를 주의하고, 현지 시장 이용 시 간단한 흥정이 필요할 수 있습니다. 대중교통 패스권을 미리 준비하면 교통비를 크게 아낄 수 있습니다!`;
    
    html += `
        <div class="mini-card">
            <h4>⚠️ 필수 여행 팁</h4>
            <p>${actualTip}</p>
        </div>
    `;

    // 서버에서 받은 맛집 배열이 존재할 경우 순회하며 렌더링
    if (foodData && Array.isArray(foodData) && foodData.length > 0) {
        foodData.forEach(food => {
            html += `
            <div class="mini-card">
                <h4 style="color: var(--accent);">${food.name}</h4>
                <div class="rating">${food.rating}</div>
                <p>${food.desc}</p>
            </div>`;
        });
    } else {
        // 데이터가 아직 없을 경우 대체 텍스트(Fallback)
        html += `
        <div class="mini-card">
            <h4 style="color: var(--accent);">🍜 로컬 찐맛집 1번가</h4>
            <div class="rating">★★★★☆ (4.5 / 여행객 평가)</div>
            <p>현지인들이 줄 서서 먹는 숨은 맛집! 가성비가 매우 훌륭하며, ${location} 특유의 진한 풍미를 느낄 수 있는 대표 메뉴를 추천합니다.</p>
        </div>
        <div class="mini-card">
            <h4 style="color: #2a9d8f;">🍤 분위기 끝판왕 레스토랑</h4>
            <div class="rating">★★★★★ (4.8 / 여행객 평가)</div>
            <p>깔끔하고 감각적인 인테리어와 친절한 서비스가 돋보입니다. 멋진 뷰를 보며 여유롭게 저녁 식사하기 완벽한 식당입니다.</p>
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// 4. 공통 유틸리티
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

// ⭐ API 과부하 시에도 멈추지 않도록 에러 핸들링 대폭 강화된 숙소 추천
function searchAccommodation() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("상세 여행지를 먼저 입력해주세요!");
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(loc + " 숙소 호텔")}`;
    window.open(searchUrl, '_blank');
}

async function recommendHotels() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("AI가 숙소를 추천하려면 '상세 여행지'를 먼저 입력해주세요! (예: 다낭)");
    
    const box = document.getElementById('hotel-recommend-box');
    box.style.display = 'block';
    box.innerHTML = `<div style="font-size:13px; color:var(--primary); padding:10px 0;"><i class="fa-solid fa-spinner fa-spin"></i> 제미나이가 ${loc}의 인기 숙소 10곳을 찾고 있습니다...</div>`;
    
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RECOMMEND_HOTELS", location: loc }) });
        const result = await response.json();
        
        if(result.result === "success") {
            try {
                const hotels = JSON.parse(result.hotels);
                // 숙소 데이터가 정상적으로 있으면 칩 렌더링
                if (hotels && hotels.length > 0) {
                    renderHotelChips(hotels);
                } else {
                    // 데이터가 비어있을 경우 예외 처리
                    box.innerHTML = `<div style="font-size:13px; color:var(--danger); margin-bottom:10px;">숙소 정보를 찾지 못했습니다. 다시 시도해주세요.</div><button class="hotel-refresh-btn" onclick="recommendHotels()"><i class="fa-solid fa-rotate-right"></i> 다시 추천받기</button>`;
                }
            } catch(e) { 
                box.innerHTML = `<div style="font-size:13px; color:var(--danger); margin-bottom:10px;">데이터 파싱 중 오류가 발생했습니다.</div><button class="hotel-refresh-btn" onclick="recommendHotels()"><i class="fa-solid fa-rotate-right"></i> 다시 추천받기</button>`; 
            }
        } else {
            // ⭐ High Demand 등 백엔드 API 에러 발생 시 명확하게 사유 표시
            box.innerHTML = `<div style="font-size:13px; color:var(--danger); margin-bottom:10px;">API 오류: ${result.message || '요청 실패'}<br>(※ Gemini 모델 과부하 상태일 수 있습니다.)</div><button class="hotel-refresh-btn" onclick="recommendHotels()"><i class="fa-solid fa-rotate-right"></i> 다시 추천받기</button>`;
        }
    } catch(e) { 
        box.innerHTML = `<div style="font-size:13px; color:var(--danger); margin-bottom:10px;">통신 에러가 발생했습니다. 잠시 후 시도해주세요.</div><button class="hotel-refresh-btn" onclick="recommendHotels()"><i class="fa-solid fa-rotate-right"></i> 다시 추천받기</button>`; 
    }
}

function renderHotelChips(hotels) {
    const box = document.getElementById('hotel-recommend-box');
    let html = `<div style="font-size:12px; color:var(--text-sub); margin-bottom:5px;">원하는 숙소를 터치하면 자동으로 입력됩니다.</div><div class="hotel-chips">`;
    hotels.forEach(hotel => {
        const safeName = hotel.replace(/'/g, "\\'"); 
        html += `<button class="hotel-chip" onclick="selectHotel('${safeName}')">${hotel}</button>`;
    });
    html += `</div><button class="hotel-refresh-btn" onclick="recommendHotels()"><i class="fa-solid fa-rotate-right"></i> 마음에 드는 곳이 없나요? 다시 추천받기</button>`;
    box.innerHTML = html;
}

function selectHotel(hotelName) {
    document.getElementById('travel-accommodation').value = hotelName;
    document.getElementById('hotel-recommend-box').style.display = 'none';
}

// 데이터 연동 및 렌더링
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

// 준비물 관련 함수
function buildDynamicPack(location, destType) {
    const container = document.getElementById('pack-container');
    const addBox = document.getElementById('pack-add-box');
    Array.from(container.children).forEach(child => { if (child.id !== 'pack-add-box') child.remove(); });

    let items = ["여권 및 신분증", "항공권/숙소 바우처 인쇄본", "상비약 (소화제, 타이레놀)", "보조배터리", "멀티 어댑터 (돼지코)"];
    items.forEach((itemText, index) => {
        const id = 'auto-pack-' + index;
        const html = `<div class="check-item" id="item-wrap-${id}"><input type="checkbox" id="${id}" class="pack-checkbox"><label for="${id}" style="flex:1;">${itemText}</label><button class="pack-delete-btn" onclick="document.getElementById('item-wrap-${id}').remove()"><i class="fa-solid fa-trash"></i></button></div>`;
        container.insertBefore(document.createRange().createContextualFragment(html), addBox);
    });
}

function addPackItem() {
    const input = document.getElementById('pack-input');
    const val = input.value.trim();
    if(!val) return;
    const id = new Date().getTime();
    const html = `<div class="check-item" id="item-wrap-${id}"><input type="checkbox" id="${id}" class="pack-checkbox"><label for="${id}" style="flex:1;">${val}</label><button class="pack-delete-btn" onclick="document.getElementById('item-wrap-${id}').remove()"><i class="fa-solid fa-trash"></i></button></div>`;
    document.getElementById('pack-container').insertBefore(document.createRange().createContextualFragment(html), document.getElementById('pack-add-box'));
    input.value = '';
}

async function syncPackData() {
    const packData = [];
    document.querySelectorAll('.pack-checkbox').forEach(chk => {
        const label = document.querySelector(`label[for="${chk.id}"]`);
        if(label) packData.push({ itemName: label.innerText, isChecked: chk.checked });
    });
    if(packData.length === 0) return alert("동기화할 데이터가 없습니다.");
    showLoading(true, "동기화 중...");
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "SYNC_PACK", packData: JSON.stringify(packData) }) });
        await response.json();
        alert("동기화 완료!");
    } catch (error) { alert("오류 발생"); } finally { showLoading(false); }
}

// 5. 일정 생성 및 보관함 로직 (⭐ API 에러 경고창 강화 및 동적 데이터 파싱)
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

            // ⭐ 백엔드에서 받은 실제 꿀팁/맛집 데이터 파싱
            const tipsData = result.tips ? JSON.parse(result.tips) : null;
            const foodData = result.restaurants ? JSON.parse(result.restaurants) : null;
            
            // 보관함에 같이 저장하기 위해 임시 할당
            currentAiTips = tipsData;
            currentAiFood = foodData;
            
            // 일정, 꿀팁, 명소, 준비물 일괄 렌더링
            renderAiSchedule(aiData, loc, requests);
            buildTravelTipsAndFood(loc, tipsData, foodData); 
            buildDynamicSpots(loc, dest);
            buildDynamicPack(loc, dest); 
            
            alert(`맞춤형 일정이 생성되었습니다! ✈️`);
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        } else {
            // ⭐ High Demand 등 백엔드 에러 시 빈 화면이 아닌 명확한 경고창 띄우기
            alert(`❌ 일정 생성 실패:\n${result.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}\n\n(※ 현재 Google AI 모델 과부하 상태일 수 있습니다.)`);
        }
    } catch (error) { 
        alert("❌ 통신 오류가 발생했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요."); 
    } finally { 
        showLoading(false); 
    }
}

function promptSavePlan() {
    if (!currentAiPlanData) return alert("저장할 일정이 없습니다. 먼저 설정 탭에서 일정을 생성해주세요!");
    const planName = prompt(`이 일정의 이름을 지어주세요!\n(예: ${currentAiLoc} 여름 가족여행)`);
    if (!planName) return; 

    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    const newTrip = {
        id: new Date().getTime(), name: planName, loc: currentAiLoc, req: currentAiReq, dest: currentAiDest, 
        tips: currentAiTips, food: currentAiFood, // ⭐ 보관함에 팁/맛집 정보도 함께 저장
        plan: currentAiPlanData, date: new Date().toLocaleDateString('ko-KR')
    };
    savedTrips.push(newTrip);
    localStorage.setItem('savedTripsArray', JSON.stringify(savedTrips));
    alert(`'${planName}' 일정이 내 폰에 안전하게 보관되었습니다! 💾`);
    if (document.getElementById('saved-plans-list').style.display === 'block') renderSavedPlansList();
}

function toggleSavedPlans() {
    const listDiv = document.getElementById('saved-plans-list');
    if (listDiv.style.display === 'none' || listDiv.style.display === '') {
        listDiv.style.display = 'block';
        renderSavedPlansList();
    } else {
        listDiv.style.display = 'none';
    }
}

function renderSavedPlansList() {
    const listDiv = document.getElementById('saved-plans-list');
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    if (savedTrips.length === 0) {
        listDiv.innerHTML = `<div style="text-align:center; padding:10px; font-size:13px; color:var(--text-sub);">저장된 일정이 없습니다.</div>`;
        return;
    }
    let html = `<h4 style="margin-bottom:12px; font-size:14px; color:var(--primary);"><i class="fa-solid fa-list-ul"></i> 저장된 일정 목록</h4>`;
    savedTrips.reverse().forEach(trip => {
        html += `<div class="plan-item"><div class="plan-item-info" onclick="loadSpecificPlan(${trip.id})"><strong>${trip.name}</strong><span>🌍 ${trip.loc} | 📅 ${trip.date}</span></div><button onclick="deleteSpecificPlan(${trip.id})" style="background:none; border:none; color:var(--danger); padding:8px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></div>`;
    });
    listDiv.innerHTML = html;
}

function loadSpecificPlan(id) {
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    const trip = savedTrips.find(t => t.id === id);
    if (!trip) return;
    
    currentAiPlanData = trip.plan; currentAiLoc = trip.loc; currentAiReq = trip.req; currentAiDest = trip.dest || 'default';
    currentAiTips = trip.tips || null; currentAiFood = trip.food || null;

    renderAiSchedule(trip.plan, trip.loc, trip.req);
    buildTravelTipsAndFood(trip.loc, currentAiTips, currentAiFood); // ⭐ 보관함 데이터로 로드
    buildDynamicSpots(trip.loc, currentAiDest); 
    buildDynamicPack(trip.loc, currentAiDest);
    
    alert(`'${trip.name}' 일정을 성공적으로 불러왔습니다! 🚀`);
    document.getElementById('saved-plans-list').style.display = 'none';
    window.scrollTo(0, 0);
}

function deleteSpecificPlan(id) {
    if (!confirm("이 일정을 보관함에서 영구히 삭제할까요?")) return;
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    savedTrips = savedTrips.filter(t => t.id !== id);
    localStorage.setItem('savedTripsArray', JSON.stringify(savedTrips));
    renderSavedPlansList();
}

// 6. 예산 관리 
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

    let rate = 1; let currencySymbol = "원";
    if (currency === 'USD') { rate = 1350; currencySymbol = "$"; }
    else if (currency === 'JPY') { rate = 9.0; currencySymbol = "¥"; } 
    else if (currency === 'EUR') { rate = 1450; currencySymbol = "€"; }
    else if (currency === 'CNY') { rate = 190; currencySymbol = "元"; }
    else if (currency === 'VND') { rate = 0.054; currencySymbol = "₫"; } 
    else if (currency === 'THB') { rate = 38; currencySymbol = "฿"; }
    
    const amountKrw = Math.round(amount * rate);
    const expenseId = new Date().getTime();

    showLoading(true, "저장 중...");
    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "ADD_EXPENSE", id: expenseId, itemName: name, amount: amount, currency: currency, amountKrw: amountKrw }) });
        usedBudget += amountKrw; updateBudgetUI();
        document.getElementById('expense-history').style.display = 'block';
        const timeStr = new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'});
        const itemHtml = `<div class="expense-item" id="exp-${expenseId}"><div><strong>${name}</strong><span class="expense-date">${timeStr}</span></div><div style="text-align: right;"><strong class="text-danger">${amount.toLocaleString()} ${currencySymbol}</strong>${currency !== 'KRW' ? `<span class="expense-date">(${amountKrw.toLocaleString()} 원)</span>` : ''}<div class="item-actions"><button class="action-btn edit" onclick="editExpense(${expenseId}, '${name}', ${amount}, '${currency}', ${amountKrw})">수정</button><button class="action-btn delete" onclick="deleteExpense(${expenseId}, ${amountKrw})">삭제</button></div></div></div>`;
        document.getElementById('expense-list-content').insertAdjacentHTML('afterbegin', itemHtml);
        document.getElementById('expense-name').value = ''; document.getElementById('expense-amount').value = '';
    } catch (e) { alert("오류"); } finally { showLoading(false); }
}

async function deleteExpense(id, amountKrw, isEdit = false) {
    if(!isEdit && !confirm("삭제하시겠습니까?")) return;
    showLoading(true, "처리 중...");
    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "DELETE_EXPENSE", id: id }) });
        usedBudget -= amountKrw; updateBudgetUI();
        const el = document.getElementById('exp-' + id);
        if(el) el.remove();
    } catch (e) { alert("오류 발생"); } finally { showLoading(false); }
}

function editExpense(id, name, amount, currency, amountKrw) {
    if(!confirm("수정하시겠습니까?")) return;
    document.getElementById('expense-name').value = name;
    document.getElementById('expense-amount').value = amount;
    document.getElementById('expense-currency').value = currency;
    deleteExpense(id, amountKrw, true);
}

// 7. 갤러리 및 GPS 사진 업로드 
function renderGallery(dataRows) {
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = '';
    const photos = dataRows.filter(row => row[1] === "PHOTO");
    if (photos.length === 0) {
        gallery.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-sub); padding: 30px 0;">아직 촬영된 사진이 없습니다.</div>`;
        return;
    }
    photos.reverse().forEach(p => {
        const dateObj = new Date(p[0]);
        const dateStr = `${dateObj.getFullYear()}.${dateObj.getMonth()+1}.${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
        gallery.innerHTML += `
            <div class="photo-card">
                <button class="photo-delete-btn" onclick="deletePhoto('${p[3]}')"><i class="fa-solid fa-trash"></i></button>
                <img src="${p[3]}" onerror="this.src='https://via.placeholder.com/150?text=Error'">
                <div class="photo-loc"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${p[2]}</div>
                <div class="photo-date">${dateStr}</div>
            </div>`;
    });
}

async function deletePhoto(url) {
    if(!confirm("갤러리와 드라이브에서 완전히 삭제하시겠습니까?")) return;
    showLoading(true, "삭제 중...");
    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({action: "DELETE_PHOTO", fileUrl: url}) });
        alert("삭제되었습니다!");
        fetchServerData();
    } catch (e) { alert("오류 발생"); } finally { showLoading(false); }
}

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading(true, "위치 변환 중...");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude; const lon = position.coords.longitude;
                let locationStr = `위도: ${lat.toFixed(5)}, 경도: ${lon.toFixed(5)}`;
                try {
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
                    const data = await response.json();
                    let regionName = "";
                    if (data.principalSubdivision) regionName += data.principalSubdivision + " ";
                    if (data.locality) regionName += data.locality;
                    if (regionName.trim() !== "") locationStr = `${regionName.trim()} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                } catch (e) {}
                uploadPhotoData(file, locationStr);
            },
            (error) => { uploadPhotoData(file, "위치 정보 접근 불가"); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else { uploadPhotoData(file, "GPS 기능 미지원 기기"); }
}

function uploadPhotoData(file, locationInfo) {
    showLoading(true, "구글 드라이브 업로드 중...");
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        const payload = { action: "UPLOAD_PHOTO", imageBase64: base64Data, mimeType: file.type, fileName: "photo_" + new Date().getTime() + ".jpg", location: locationInfo };
        try {
            await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
            alert(`저장 성공!\n(${locationInfo})`);
            fetchServerData();
        } catch (error) { alert("통신 오류"); } finally { showLoading(false); document.getElementById('camera-input').value = ''; }
    };
    reader.readAsDataURL(file);
}

// 8. 앱 초기화 및 종료
function resetApp() {
    if(!confirm("모두 초기화할까요?")) return;
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
        buildTravelTipsAndFood(last.loc, last.tips, last.food); // ⭐ 보관함 자동 로드
        buildDynamicSpots(last.loc, last.dest);
        buildDynamicPack(last.loc, last.dest);
    }
}
