// ⭐ 주의: 반드시 새로 발급받은 본인의 웹앱 URL(GAS_URL)로 수정해서 사용하세요!
const GAS_URL = "https://script.google.com/macros/s/AKfycbx0QwxBQ_sD4Tuwk7bcDHWX_XxOU8vyp-X2KmUB8-kYQQx0TiDXNv9n3Fu-UwbsKGCWlw/exec"; 

let totalBudget = 0;
let usedBudget = 0;

// 현재 화면에 띄워진 일정 데이터를 임시 보관하는 변수 (저장용)
let currentAiPlanData = null;
let currentAiLoc = "";
let currentAiReq = "";

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
}

function searchAccommodation() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("상세 여행지를 먼저 입력해주세요!");
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc + " 숙소 호텔")}`;
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

function buildDynamicSpots(location) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 
    const spotDB = {
        'default': [
            { name: "로컬 파머스 마켓", badge: "구경 꿀잼", icon: "🛒", desc: "현지인들의 삶을 가장 가까이서 엿볼 수 있는 곳.", time: "중심가", cost: "약 1만 원", query: `${location} 전통 시장` },
            { name: "시티 뷰 랜드마크", badge: "포토 스팟", icon: "📸", desc: "여행에 왔다면 인증샷은 필수!", time: "대중교통 20분", cost: "약 2만 원", query: `${location} 전망대` }
        ]
    };
    spotDB['default'].forEach(spot => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.query)}`;
        container.innerHTML += `
            <div class="spot-card card">
                <div class="spot-image">${spot.icon}</div>
                <div class="spot-info">
                    <h4>${spot.name}</h4><span class="badge">${spot.badge}</span><p class="desc">${spot.desc}</p>
                    <div class="spot-meta"><span><i class="fa-solid fa-clock"></i> ${spot.time}</span><span><i class="fa-solid fa-wallet"></i> ${spot.cost}</span></div>
                    <a href="${mapUrl}" target="_blank" class="map-link"><i class="fa-solid fa-map-location-dot"></i> 구글 맵으로 길찾기</a>
                </div>
            </div>
        `;
    });
}

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

function updateBudgetUI() {
    const remaining = totalBudget - usedBudget;
    document.getElementById('display-budget').innerText = totalBudget.toLocaleString() + " 원";
    document.getElementById('used-budget').innerText = usedBudget.toLocaleString() + " 원";
    document.getElementById('remaining-budget').innerText = remaining.toLocaleString() + " 원";
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
                renderHotelChips(hotels);
            } catch(e) { box.innerHTML = `<div style="font-size:13px; color:var(--danger);">데이터를 불러오지 못했습니다.</div>`; }
        }
    } catch(e) { box.innerHTML = `<div style="font-size:13px; color:var(--danger);">통신 에러가 발생했습니다.</div>`; }
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
    
    if (!members || !type || !loc || !dest || !depTime || !days || !budget) return alert("모든 설정을 빠짐없이 입력해주세요! 📝");

    totalBudget = Number(budget);
    usedBudget = 0;
    updateBudgetUI();
    document.getElementById('expense-currency').value = 'KRW';

    showLoading(true, "Gemini 2.5 Flash가 디테일 일정을 분석 중입니다... 🤖");

    const payload = {
        action: "SAVE_PLAN", location: loc, departureTime: depTime, members: members,
        type: type, destination: dest, days: days, budget: budget, accommodation: accom, requests: requests
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            try {
                const aiData = JSON.parse(result.aiPlan);
                
                // ⭐ 현재 생성된 데이터를 전역 변수에 임시 저장 (나중에 이름 지어 저장하기 위함)
                currentAiPlanData = aiData;
                currentAiLoc = loc;
                currentAiReq = requests;
                
                renderAiSchedule(aiData, loc, requests);
            } catch(e) {
                alert("AI 응답 해석 오류입니다. 다시 시도해주세요.");
            }
            buildDynamicPack(loc, dest); 
            buildDynamicSpots(loc);
            
            alert(`완벽한 AI 맞춤형 여행 일정이 생성되었습니다!\n(일정 탭에서 '현재 일정 저장'을 눌러 이름을 지어주세요!) ✈️`);
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        } else {
            alert("저장 실패: " + result.message);
        }
    } catch (error) { alert("통신 오류가 발생했습니다."); } finally { showLoading(false); }
}

// ==========================================
// ⭐ 다중 일정 보관함 (Save/Load) 전용 로직
// ==========================================

// 1. 현재 화면의 일정에 이름을 붙여서 저장
function promptSavePlan() {
    if (!currentAiPlanData) return alert("저장할 일정이 없습니다. 먼저 설정 탭에서 일정을 생성해주세요!");
    
    const planName = prompt(`이 일정의 이름을 지어주세요!\n(예: ${currentAiLoc} 여름 가족여행)`);
    if (!planName) return; // 취소 누름

    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    
    const newTrip = {
        id: new Date().getTime(),
        name: planName,
        loc: currentAiLoc,
        req: currentAiReq,
        plan: currentAiPlanData,
        date: new Date().toLocaleDateString('ko-KR')
    };
    
    savedTrips.push(newTrip);
    localStorage.setItem('savedTripsArray', JSON.stringify(savedTrips));
    
    alert(`'${planName}' 일정이 내 폰에 안전하게 보관되었습니다! 💾`);
    
    // 만약 보관함이 열려있다면 새로고침
    if (document.getElementById('saved-plans-list').style.display === 'block') {
        renderSavedPlansList();
    }
}

// 2. 보관함 열기/닫기 토글
function toggleSavedPlans() {
    const listDiv = document.getElementById('saved-plans-list');
    if (listDiv.style.display === 'none' || listDiv.style.display === '') {
        listDiv.style.display = 'block';
        renderSavedPlansList();
    } else {
        listDiv.style.display = 'none';
    }
}

// 3. 보관함 리스트 화면에 그리기
function renderSavedPlansList() {
    const listDiv = document.getElementById('saved-plans-list');
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    
    if (savedTrips.length === 0) {
        listDiv.innerHTML = `<div style="text-align:center; padding:10px; font-size:13px; color:var(--text-sub);">저장된 일정이 없습니다.</div>`;
        return;
    }

    let html = `<h4 style="margin-bottom:12px; font-size:14px; color:var(--primary);"><i class="fa-solid fa-list-ul"></i> 저장된 일정 목록</h4>`;
    
    // 최신순으로 정렬해서 보여주기
    savedTrips.reverse().forEach(trip => {
        html += `
        <div class="plan-item">
            <div class="plan-item-info" onclick="loadSpecificPlan(${trip.id})">
                <strong>${trip.name}</strong>
                <span>🌍 ${trip.loc} | 📅 ${trip.date}</span>
            </div>
            <button onclick="deleteSpecificPlan(${trip.id})" style="background:none; border:none; color:var(--danger); padding:8px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
        </div>
        `;
    });
    listDiv.innerHTML = html;
}

// 4. 보관함에서 특정 일정 불러오기
function loadSpecificPlan(id) {
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    const trip = savedTrips.find(t => t.id === id);
    if (!trip) return;

    // 현재 데이터를 불러온 데이터로 교체
    currentAiPlanData = trip.plan;
    currentAiLoc = trip.loc;
    currentAiReq = trip.req;

    renderAiSchedule(trip.plan, trip.loc, trip.req);
    alert(`'${trip.name}' 일정을 성공적으로 불러왔습니다! 🚀`);
    
    // 불러오기 완료 후 보관함 숨기기
    document.getElementById('saved-plans-list').style.display = 'none';
    window.scrollTo(0, 0);
}

// 5. 보관함에서 특정 일정 삭제하기
function deleteSpecificPlan(id) {
    if (!confirm("이 일정을 보관함에서 영구히 삭제할까요?")) return;
    
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    savedTrips = savedTrips.filter(t => t.id !== id);
    localStorage.setItem('savedTripsArray', JSON.stringify(savedTrips));
    
    renderSavedPlansList(); // 삭제 후 목록 갱신
}

// ==========================================

async function addExpense() {
    const name = document.getElementById('expense-name').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    if(!name || !amount) return alert("지출 내역과 금액을 입력해주세요.");

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
    const payload = { action: "ADD_EXPENSE", id: expenseId, itemName: name, amount: amount, currency: currency, amountKrw: amountKrw };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            usedBudget += amountKrw; updateBudgetUI();
            const listContent = document.getElementById('expense-list-content');
            document.getElementById('expense-history').style.display = 'block'; 
            const timeStr = new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'});
            
            const itemHtml = `
                <div class="expense-item" id="exp-${expenseId}">
                    <div><strong>${name}</strong><span class="expense-date">${timeStr}</span></div>
                    <div style="text-align: right;"><strong class="text-danger">${amount.toLocaleString()} ${currencySymbol}</strong>
                        ${currency !== 'KRW' ? `<span class="expense-date">(${amountKrw.toLocaleString()} 원)</span>` : ''}
                        <div class="item-actions">
                            <button class="action-btn edit" onclick="editExpense(${expenseId}, '${name}', ${amount}, '${currency}', ${amountKrw})">수정</button>
                            <button class="action-btn delete" onclick="deleteExpense(${expenseId}, ${amountKrw})">삭제</button>
                        </div>
                    </div>
                </div>`;
            listContent.insertAdjacentHTML('afterbegin', itemHtml); 
            document.getElementById('expense-name').value = ''; document.getElementById('expense-amount').value = '';
        }
    } catch (error) { alert("통신 오류"); } finally { showLoading(false); }
}

async function deleteExpense(id, amountKrw, isEdit = false) {
    if(!isEdit && !confirm("삭제하시겠습니까?")) return;
    showLoading(true, "처리 중...");
    const payload = { action: "DELETE_EXPENSE", id: id };
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            usedBudget -= amountKrw; updateBudgetUI();
            const el = document.getElementById('exp-' + id);
            if(el) el.remove();
        }
    } catch (e) { alert("오류 발생"); } finally { showLoading(false); }
}

function editExpense(id, name, amount, currency, amountKrw) {
    if(!confirm("수정하시겠습니까?")) return;
    document.getElementById('expense-name').value = name;
    document.getElementById('expense-amount').value = amount;
    document.getElementById('expense-currency').value = currency;
    deleteExpense(id, amountKrw, true);
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
            </div>
        `;
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

// 앱 실행 시 사진 갤러리 불러오고, 마지막으로 봤던 일정이 있으면 자동으로 띄워줍니다!
window.addEventListener('load', () => {
    fetchServerData();
    let savedTrips = JSON.parse(localStorage.getItem('savedTripsArray') || "[]");
    
    // 저장된 일정이 하나라도 있다면 가장 최근 일정을 기본으로 띄워줍니다.
    if (savedTrips.length > 0) {
        const lastTrip = savedTrips[savedTrips.length - 1]; // 배열의 마지막 = 가장 최근
        currentAiPlanData = lastTrip.plan;
        currentAiLoc = lastTrip.loc;
        currentAiReq = lastTrip.req;
        
        try { renderAiSchedule(lastTrip.plan, lastTrip.loc, lastTrip.req); } catch(e) {}
    }
});
// ⭐ 새 기능: 앱 전체 초기화 (리셋)
function resetApp() {
    if(!confirm("입력한 설정과 화면의 현재 일정을 모두 싹~ 비우시겠습니까?\n(※ 내 보관함에 이미 저장해둔 일정은 지워지지 않으니 안심하세요!)")) return;

    // 1. 입력 필드 초기화
    document.getElementById('travel-location').value = '';
    document.getElementById('travel-accommodation').value = '';
    document.getElementById('travel-requests').value = '';
    document.getElementById('travel-days').value = '';
    document.getElementById('travel-budget').value = '';
    document.getElementById('travel-departure').value = '';
    document.getElementById('hotel-recommend-box').style.display = 'none';

    // 2. 화면 데이터 초기화
    currentAiPlanData = null;
    currentAiLoc = "";
    currentAiReq = "";
    
    document.getElementById('schedule-container').innerHTML = '<div style="text-align: center; color: var(--text-sub); padding: 50px 0;">아직 생성된 일정이 없습니다.<br>설정 탭에서 일정을 생성해 주세요.</div>';
    document.getElementById('spots-container').innerHTML = '<div style="text-align: center; color: var(--text-sub); padding: 50px 0; font-size: 14px;">여행지를 입력하세요. AI 맞춤형 명소가 큐레이션 됩니다.</div>';

    // 3. 준비물 & 예산 초기화
    const packContainer = document.getElementById('pack-container');
    Array.from(packContainer.children).forEach(child => { if (child.id !== 'pack-add-box') child.remove(); });
    totalBudget = 0;
    usedBudget = 0;
    updateBudgetUI();
    
    // 4. 홈(설정) 탭으로 이동
    switchTab('tab-home', document.querySelectorAll('.nav-item')[0]);
    window.scrollTo(0, 0);
}
// ⭐ 새 기능: 앱 종료 유도 함수
function exitApp() {
    if(confirm("여행 플래너를 종료하시겠습니까?\n(입력 중인 정보가 있다면 미리 '저장'해주세요!)")) {
        // 브라우저 닫기 시도 (일부 안드로이드나 데스크탑에서 작동)
        window.close();
        
        // window.close()가 막혀있는 스마트폰 환경을 위한 우아한 대안 안내
        alert("이용해 주셔서 감사합니다! ✈️\n안전한 종료를 위해 홈 버튼을 누르거나 브라우저 창을 닫아주세요.");
        
        // 화면을 어둡게 처리하여 종료된 듯한 시각적 효과 주기 (선택 사항)
        document.body.innerHTML = `<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#F7F9FC; color:var(--primary); font-weight:800; font-size:18px;">
            <i class="fa-solid fa-plane-departure" style="font-size:40px; margin-bottom:15px;"></i>
            즐거운 여행 되세요!
        </div>`;
    }
}
