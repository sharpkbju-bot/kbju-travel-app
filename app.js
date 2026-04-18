const GAS_URL = "https://script.google.com/macros/s/AKfycbymKnULrd_wtdMLy0zA7rp6HQdnuFj6hAAxpmsF0KdWo9LyAwaLxhv9QyNQOkcv_GZwgA/exec"; 

let totalBudget = 0;
let usedBudget = 0;

function showLoading(show, text="처리 중...") {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function switchTab(tabId, element) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) selectedTab.classList.add('active');
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => nav.classList.remove('active'));
    element.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function searchAccommodation() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("상세 여행지를 먼저 입력해주세요!");
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc + " 숙소 호텔")}`;
    window.open(searchUrl, '_blank');
}

async function fetchServerData() {
    showLoading(true, "서버에서 여행 기록을 불러오는 중...");
    try {
        const response = await fetch(GAS_URL);
        const result = await response.json();
        if (result.result === "success") renderGallery(result.data);
    } catch (e) {
        console.error("데이터 로드 실패", e);
    } finally {
        showLoading(false);
    }
}

function renderGallery(dataRows) {
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = '';
    const photos = dataRows.filter(row => row[1] === "PHOTO");
    
    if (photos.length === 0) {
        gallery.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-sub); padding: 30px 0; font-size: 13px;">아직 촬영된 사진이 없습니다.</div>`;
        return;
    }
    
    photos.reverse().forEach(p => {
        const dateObj = new Date(p[0]);
        const dateStr = `${dateObj.getFullYear()}.${dateObj.getMonth()+1}.${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
        const locStr = p[2];
        const imgUrl = p[3]; 
        
        const html = `
            <div class="photo-card">
                <button class="photo-delete-btn" onclick="deletePhoto('${imgUrl}')"><i class="fa-solid fa-trash"></i></button>
                <img src="${imgUrl}" alt="여행 사진" onerror="this.src='https://via.placeholder.com/150?text=Image+Error'">
                <div class="photo-loc"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${locStr}</div>
                <div class="photo-date">${dateStr}</div>
            </div>
        `;
        gallery.innerHTML += html;
    });
}

async function deletePhoto(url) {
    if(!confirm("이 사진을 갤러리에서 완전히 삭제하시겠습니까?")) return;
    showLoading(true, "사진 기록을 삭제 중...");
    const payload = { action: "DELETE_PHOTO", fileUrl: url };
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            alert("사진이 성공적으로 삭제되었습니다! 🗑️");
            fetchServerData(); 
        } else { alert("삭제 실패: " + result.message); }
    } catch (e) { alert("통신 오류가 발생했습니다."); } 
    finally { showLoading(false); }
}

// 💡 찐 제미나이 AI 스케줄 렌더러
function renderAiSchedule(aiData, location, requests) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    if (requests && requests.trim() !== "") {
        container.innerHTML += `
            <div class="card" style="background:#fffcf0; border:1px solid #ffe066; margin-bottom:25px;">
                <h4 style="color:#f59f00; font-size:14px; margin-bottom:5px;"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 특별 요청 완벽 반영</h4>
                <p style="font-size:13px; color:var(--text-main); line-height:1.4;">"${requests}"</p>
                <p style="font-size:11px; color:var(--text-sub); margin-top:8px;">※ Gemini AI가 요청사항을 분석하여 실제 데이터를 기반으로 짠 동선입니다.</p>
            </div>
        `;
    }

    try {
        aiData.forEach(dayInfo => {
            let dayHtml = `
            <div class="timeline">
                <div class="timeline-day">Day ${dayInfo.day} - ${location}</div>
            `;
            
            dayInfo.timeline.forEach(item => {
                dayHtml += `
                <div class="timeline-item">
                    <div class="time">${item.time}</div>
                    <div class="content">
                        <h4>${item.title}</h4>
                        <p>${item.desc}</p>
                        <div class="schedule-meta">
                            <span><i class="fa-solid fa-map-pin"></i> ${item.dist || '정보 없음'}</span>
                            <span><i class="fa-solid fa-wallet"></i> ${item.cost || '정보 없음'}</span>
                            <span class="star-rating"><i class="fa-solid fa-star"></i> ${item.star || '4.0'}</span>
                        </div>
                    </div>
                </div>`;
            });
            dayHtml += `</div>`;
            container.innerHTML += dayHtml;
        });
    } catch (e) {
        container.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 50px 0;">AI 일정 파싱에 실패했습니다. 다시 생성해주세요.</div>`;
    }
}

// 명소/준비물은 간단히 유지 (기존과 동일)
function buildDynamicSpots(location) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 
    const spotDB = {
        'default': [
            { name: "로컬 파머스 마켓", badge: "구경 꿀잼", icon: "🛒", desc: "\"현지인들의 삶을 가장 가까이서 엿볼 수 있는 곳. 과일이 정말 싸요!\"", time: "중심가 위치", cost: "약 1만 원", query: `${location} 전통 시장` },
            { name: "시티 뷰 랜드마크 타워", badge: "포토 스팟", icon: "📸", desc: "\"여행에 왔다면 인증샷은 필수! 해 질 녘에 가는 것을 추천합니다.\"", time: "대중교통 20분", cost: "약 2만 원", query: `${location} 전망대` }
        ]
    };
    let selectedSpots = spotDB['default'];
    selectedSpots.forEach(spot => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.query)}`;
        const html = `
            <div class="spot-card card">
                <div class="spot-image">${spot.icon}</div>
                <div class="spot-info">
                    <h4>${spot.name}</h4><span class="badge">${spot.badge}</span><p class="desc">${spot.desc}</p>
                    <div class="spot-meta"><span><i class="fa-solid fa-clock"></i> ${spot.time}</span><span><i class="fa-solid fa-wallet"></i> ${spot.cost}</span></div>
                    <a href="${mapUrl}" target="_blank" class="map-link"><i class="fa-solid fa-map-location-dot"></i> 구글 맵으로 길찾기</a>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function buildDynamicPack(location, destType) {
    const container = document.getElementById('pack-container');
    const addBox = document.getElementById('pack-add-box');
    Array.from(container.children).forEach(child => { if (child.id !== 'pack-add-box') child.remove(); });

    let items = ["여권 및 신분증", "항공권/숙소 바우처 인쇄본", "상비약 (소화제, 타이레놀)", "보조배터리", "멀티 어댑터"];
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
    
    if (!members || !type || !loc || !dest || !depTime || !days || !budget) {
        alert("모든 설정을 빠짐없이 입력해주세요! 📝");
        return;
    }

    totalBudget = Number(budget);
    usedBudget = 0;
    updateBudgetUI();
    
    let autoCurrency = 'KRW';
    document.getElementById('expense-currency').value = autoCurrency; // 간소화

    // 💡 안내 멘트 변경: 진짜 AI가 호출됨을 알림
    showLoading(true, "제미나이 AI가 진짜 로컬 데이터를 분석 중입니다...\n(최대 10초 소요 🤖)");

    const payload = {
        action: "SAVE_PLAN", location: loc, departureTime: depTime, members: members,
        type: type, destination: dest, days: days, budget: budget, accommodation: accom, requests: requests
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            try {
                // 구글 서버가 응답한 AI JSON 문자열을 파싱
                const aiData = JSON.parse(result.aiPlan);
                renderAiSchedule(aiData, loc, requests);
            } catch(e) {
                console.error("AI 파싱 오류", e);
                alert("AI 응답을 해석하는데 문제가 발생했습니다. 다시 시도해주세요.");
            }

            buildDynamicPack(loc, dest); 
            buildDynamicSpots(loc);
            
            alert(`제미나이 AI가 완벽한 맞춤 일정을 생성했습니다! ✈️`);
            const scheduleNavBtn = document.querySelectorAll('.nav-item')[1];
            switchTab('tab-schedule', scheduleNavBtn);
        } else {
            alert("저장에 실패했습니다: " + result.message);
        }
    } catch (error) {
        alert("통신 오류가 발생했습니다. GAS 주소를 확인해주세요.");
    } finally {
        showLoading(false);
    }
}

// 비용 및 로케이션 로직 (기존과 완벽 동일하여 생략 없이 유지)
async function addExpense() {
    const name = document.getElementById('expense-name').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    if(!name || !amount) return alert("지출 내역과 금액을 정확히 입력해주세요.");

    let rate = 1; let currencySymbol = "원";
    if (currency === 'USD') { rate = 1350; currencySymbol = "$"; }
    else if (currency === 'JPY') { rate = 9.0; currencySymbol = "¥"; } 
    else if (currency === 'EUR') { rate = 1450; currencySymbol = "€"; }
    else if (currency === 'CNY') { rate = 190; currencySymbol = "元"; }
    else if (currency === 'VND') { rate = 0.054; currencySymbol = "₫"; } 
    else if (currency === 'THB') { rate = 38; currencySymbol = "฿"; }
    
    const amountKrw = Math.round(amount * rate);
    const expenseId = new Date().getTime();

    showLoading(true, "지출 내역 서버 저장 중...");
    const payload = { action: "ADD_EXPENSE", id: expenseId, itemName: name, amount: amount, currency: currency, amountKrw: amountKrw };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            usedBudget += amountKrw;
            updateBudgetUI();
            const listContainer = document.getElementById('expense-history');
            const listContent = document.getElementById('expense-list-content');
            listContainer.style.display = 'block'; 
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
            alert("성공적으로 지출 내역이 반영되었습니다! 💸");
        } else alert("저장에 실패했습니다: " + result.message);
    } catch (error) { alert("통신 오류가 발생했습니다."); } finally { showLoading(false); }
}

async function deleteExpense(id, amountKrw, isEdit = false) {
    if(!isEdit && !confirm("이 지출 내역을 삭제하시겠습니까?")) return;
    showLoading(true, isEdit ? "수정 중..." : "삭제 중...");
    const payload = { action: "DELETE_EXPENSE", id: id };
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            usedBudget -= amountKrw;
            updateBudgetUI();
            const el = document.getElementById('exp-' + id);
            if(el) el.remove();
            if(!isEdit) alert("삭제가 완료되었습니다! 🗑️");
        } else alert("삭제 실패: " + result.message);
    } catch (e) { alert("통신 오류가 발생했습니다."); } finally { showLoading(false); }
}

function editExpense(id, name, amount, currency, amountKrw) {
    if(!confirm("내역을 수정하시겠습니까?")) return;
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
    const addBox = document.getElementById('pack-add-box');
    document.getElementById('pack-container').insertBefore(document.createRange().createContextualFragment(html), addBox);
    input.value = '';
}

async function syncPackData() {
    const checkboxes = document.querySelectorAll('.pack-checkbox');
    const packData = [];
    checkboxes.forEach(chk => {
        const label = document.querySelector(`label[for="${chk.id}"]`);
        if(label) packData.push({ itemName: label.innerText, isChecked: chk.checked });
    });
    if(packData.length === 0) return alert("동기화할 준비물이 없습니다.");
    showLoading(true, "서버 동기화 중...");
    const payload = { action: "SYNC_PACK", packData: JSON.stringify(packData) };
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") alert("동기화 완료! ☁️");
        else alert("동기화 실패: " + result.message);
    } catch (error) { alert("통신 오류"); } finally { showLoading(false); }
}

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showLoading(true, "GPS 기반 현지 지역명 변환 중...");
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
                } catch (e) { console.warn("지역명 변환 실패"); }
                uploadPhotoData(file, locationStr);
            },
            (error) => { uploadPhotoData(file, "위치 정보 접근 불가"); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else { uploadPhotoData(file, "GPS 기능 미지원 기기"); }
}

function uploadPhotoData(file, locationInfo) {
    showLoading(true, "사진을 갤러리에 저장 중...");
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        const payload = { action: "UPLOAD_PHOTO", imageBase64: base64Data, mimeType: file.type, fileName: "photo_" + new Date().getTime() + ".jpg", location: locationInfo };
        try {
            const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            if(result.result === "success") {
                alert(`성공적으로 저장되었습니다! 📸\n(장소: ${locationInfo})`);
                fetchServerData();
            } else alert("실패: " + result.message);
        } catch (error) { alert("통신 오류가 발생했습니다."); } finally { showLoading(false); document.getElementById('camera-input').value = ''; }
    };
    reader.readAsDataURL(file);
}

window.addEventListener('load', () => { fetchServerData(); });
