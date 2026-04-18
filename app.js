const GAS_URL = "https://script.google.com/macros/s/AKfycbxlC2NgWP2qNyJ8Oj8mS17k_rwBrTQqI9uvo2KKWCphXpx4sO5mLxZNGgWH_9JldZUBJw/exec"; 

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

function buildDynamicSpots(location) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 

    const spotDB = {
        '다낭': [
            { name: "미케 해변 씨푸드 마켓", badge: "현지인 추천", icon: "🦀", desc: "\"가성비 최고! 싱싱한 해산물을 직접 고르고 조리법을 선택할 수 있어요.\"", time: "숙소 기준 15분", cost: "약 3만 원", query: "다낭 미케해변 해산물 맛집" },
            { name: "콩카페 1호점 (한시장)", badge: "필수 코스", icon: "☕", desc: "\"코코넛 커피 스무디는 필수! 땀을 쏙 들어가게 해주는 마법의 맛.\"", time: "한시장 도보 3분", cost: "약 3,000원", query: "다낭 콩카페 한시장" }
        ],
        '파리': [
            { name: "Le Relais de l'Entrecôte", badge: "갈비살 스테이크", icon: "🥩", desc: "\"메뉴는 단 하나! 특제 소스가 얹어진 스테이크와 무한 리필 감자튀김.\"", time: "샹젤리제 도보 5분", cost: "약 40 유로", query: "Le Relais de l'Entrecôte Paris" },
            { name: "몽마르뜨 언덕 사크레쾨르", badge: "노을 명소", icon: "🌇", desc: "\"파리 시내가 한눈에 내려다보이는 최고의 뷰포인트. 소매치기 주의!\"", time: "지하철 2호선", cost: "무료", query: "파리 사크레쾨르 대성당" }
        ],
        '오사카': [
            { name: "도톤보리 앗치치혼포", badge: "타코야키 1티어", icon: "🐙", desc: "\"강을 바라보며 먹는 겉바속촉 타코야키. 파와 마요네즈 듬뿍 추천!\"", time: "도톤보리 중앙", cost: "약 600 엔", query: "오사카 앗치치혼포" },
            { name: "우메다 스카이 빌딩", badge: "야경 명소", icon: "🌃", desc: "\"탁 트인 공중 정원에서 오사카의 화려한 야경을 감상하세요.\"", time: "우메다역 도보 10분", cost: "1,500 엔", query: "오사카 우메다 스카이 빌딩" }
        ],
        'default': [
            { name: "로컬 파머스 마켓", badge: "구경 꿀잼", icon: "🛒", desc: "\"현지인들의 삶을 가장 가까이서 엿볼 수 있는 곳. 과일이 정말 싸요!\"", time: "중심가 위치", cost: "약 1만 원", query: `${location} 전통 시장` },
            { name: "시티 뷰 랜드마크 타워", badge: "포토 스팟", icon: "📸", desc: "\"여행에 왔다면 인증샷은 필수! 해 질 녘에 가는 것을 추천합니다.\"", time: "대중교통 20분", cost: "약 2만 원", query: `${location} 전망대` }
        ]
    };

    const locLower = location.toLowerCase();
    let selectedSpots = spotDB['default'];
    
    if (locLower.includes('다낭') || locLower.includes('베트남')) selectedSpots = spotDB['다낭'];
    else if (locLower.includes('파리') || locLower.includes('프랑스')) selectedSpots = spotDB['파리'];
    else if (locLower.includes('오사카') || locLower.includes('일본')) selectedSpots = spotDB['오사카'];

    selectedSpots.forEach(spot => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.query)}`;
        const html = `
            <div class="spot-card card">
                <div class="spot-image">${spot.icon}</div>
                <div class="spot-info">
                    <h4>${spot.name}</h4>
                    <span class="badge">${spot.badge}</span>
                    <p class="desc">${spot.desc}</p>
                    <div class="spot-meta">
                        <span><i class="fa-solid fa-clock"></i> ${spot.time}</span>
                        <span><i class="fa-solid fa-wallet"></i> ${spot.cost}</span>
                    </div>
                    <a href="${mapUrl}" target="_blank" class="map-link">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 맵으로 길찾기
                    </a>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function buildDynamicPack(location, destType) {
    const container = document.getElementById('pack-container');
    const addBox = document.getElementById('pack-add-box');
    
    Array.from(container.children).forEach(child => {
        if (child.id !== 'pack-add-box') child.remove();
    });

    let items = [
        "여권 및 신분증", "항공권/숙소 바우처 인쇄본", "상비약 (소화제, 타이레놀, 밴드)", 
        "휴대용 보조배터리 및 충전기", "멀티 어댑터 (돼지코)"
    ];

    const locLower = location.toLowerCase();
    
    if (locLower.includes('다낭') || locLower.includes('나트랑') || locLower.includes('괌') || locLower.includes('하와이') || locLower.includes('방콕') || destType === 'relax') {
        items.push("수영복 및 래쉬가드", "선크림 (SPF 50+ 이상)", "선글라스 및 챙 넓은 모자", "스마트폰 방수팩", "모기 기피제");
    }
    if (locLower.includes('파리') || locLower.includes('유럽') || locLower.includes('이탈리아') || destType === 'tour') {
        items.push("소매치기 방지용 크로스백 (자물쇠 포함)", "오래 걸어도 편안한 런닝화", "동전 지갑 (팁/화장실용)", "접이식 우산 (변덕 대비)");
    }
    if (destType === 'food') {
        items.push("소화제 넉넉히 (과식 대비)", "휴대용 물티슈 (위생 대비)");
    }

    items.forEach((itemText, index) => {
        const id = 'auto-pack-' + index;
        const html = `
            <div class="check-item" id="item-wrap-${id}">
                <input type="checkbox" id="${id}" class="pack-checkbox">
                <label for="${id}" style="flex:1;">${itemText}</label>
                <button class="pack-delete-btn" onclick="document.getElementById('item-wrap-${id}').remove()"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.insertBefore(document.createRange().createContextualFragment(html), addBox);
    });
}

function buildDynamicSchedule(days, location, destType, depTime) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    const typeLabels = { 'relax': '휴양/힐링', 'tour': '관광/랜드마크', 'food': '맛집 탐방', 'activity': '액티비 체험' };
    const themeStr = typeLabels[destType] || '자유 일정';
    const parsedDays = parseInt(days);

    for (let i = 1; i <= parsedDays; i++) {
        let isFirstDay = (i === 1);
        let dayHtml = `
        <div class="timeline">
            <div class="timeline-day">Day ${i} - ${location} (${themeStr})</div>
            <div class="timeline-item">
                <div class="time">${isFirstDay ? depTime : '09:30'}</div>
                <div class="content">
                    <h4>${isFirstDay ? '집에서 출발 및 공항/역 이동' : '숙소 출발 및 가벼운 아침 산책'}</h4>
                    <p>${isFirstDay ? '이동 시간: 확인 필요' : '컨디션 조절: 최상'}</p>
                </div>
            </div>
            <div class="timeline-item">
                <div class="time">12:30</div>
                <div class="content">
                    <h4>${location} 현지 최고 맛집 점심</h4>
                    <p>예상 비용: 현지 물가 확인 필요 | ${themeStr} 특화 추천 스팟</p>
                </div>
            </div>
            <div class="timeline-item">
                <div class="time">15:00</div>
                <div class="content">
                    <h4>${location} 필수 명소 방문 및 자유시간</h4>
                    <p>체력 소모: 보통 | 사진 스팟 집중 공략</p>
                </div>
            </div>
            <div class="timeline-item">
                <div class="time">18:30</div>
                <div class="content">
                    <h4>석식 및 숙소 복귀 (휴식)</h4>
                    <p>저녁 식사 및 내일 일정 준비 | 편안한 저녁</p>
                </div>
            </div>
        </div>`;
        container.innerHTML += dayHtml;
    }
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
    
    const locLower = loc.toLowerCase();
    let autoCurrency = 'KRW';
    
    if (locLower.includes('일본') || locLower.includes('오사카') || locLower.includes('도쿄') || locLower.includes('후쿠오카') || locLower.includes('삿포로') || locLower.includes('교토')) autoCurrency = 'JPY';
    else if (locLower.includes('미국') || locLower.includes('뉴욕') || locLower.includes('하와이') || locLower.includes('괌') || locLower.includes('사이판')) autoCurrency = 'USD';
    else if (locLower.includes('유럽') || locLower.includes('파리') || locLower.includes('이탈리아') || locLower.includes('스페인')) autoCurrency = 'EUR';
    else if (locLower.includes('중국') || locLower.includes('베이징') || locLower.includes('상하이')) autoCurrency = 'CNY';
    else if (locLower.includes('베트남') || locLower.includes('다낭') || locLower.includes('나트랑')) autoCurrency = 'VND';
    else if (locLower.includes('태국') || locLower.includes('방콕') || locLower.includes('푸껫')) autoCurrency = 'THB';
    
    document.getElementById('expense-currency').value = autoCurrency;

    showLoading(true, "AI가 로컬 스팟과 동선을 계산하여 서버 저장 중...");

    const payload = {
        action: "SAVE_PLAN", location: loc, departureTime: depTime, members: members,
        type: type, destination: dest, days: days, budget: budget
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            buildDynamicSchedule(days, loc, dest, depTime);
            buildDynamicPack(loc, dest); 
            buildDynamicSpots(loc);
            
            alert(`완벽한 여행 일정이 생성되었습니다! (현지 통화: ${autoCurrency} 자동 설정) ✈️`);
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

async function addExpense() {
    const name = document.getElementById('expense-name').value;
    const amount = Number(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;

    if(!name || !amount) {
        alert("지출 내역과 금액을 정확히 입력해주세요.");
        return;
    }

    let rate = 1;
    let currencySymbol = "원";
    if (currency === 'USD') { rate = 1350; currencySymbol = "$"; }
    else if (currency === 'JPY') { rate = 9.0; currencySymbol = "¥"; } 
    else if (currency === 'EUR') { rate = 1450; currencySymbol = "€"; }
    else if (currency === 'CNY') { rate = 190; currencySymbol = "元"; }
    else if (currency === 'VND') { rate = 0.054; currencySymbol = "₫"; } 
    else if (currency === 'THB') { rate = 38; currencySymbol = "฿"; }
    
    const amountKrw = Math.round(amount * rate);
    const expenseId = new Date().getTime();

    showLoading(true, "지출 내역 서버 저장 중...");

    const payload = {
        action: "ADD_EXPENSE", id: expenseId, itemName: name, amount: amount, currency: currency, amountKrw: amountKrw
    };

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
                    <div>
                        <strong>${name}</strong>
                        <span class="expense-date">${timeStr}</span>
                    </div>
                    <div style="text-align: right;">
                        <strong class="text-danger">${amount.toLocaleString()} ${currencySymbol}</strong>
                        ${currency !== 'KRW' ? `<span class="expense-date">(${amountKrw.toLocaleString()} 원)</span>` : ''}
                        <div class="item-actions">
                            <button class="action-btn edit" onclick="editExpense(${expenseId}, '${name}', ${amount}, '${currency}', ${amountKrw})">수정</button>
                            <button class="action-btn delete" onclick="deleteExpense(${expenseId}, ${amountKrw})">삭제</button>
                        </div>
                    </div>
                </div>
            `;
            listContent.insertAdjacentHTML('afterbegin', itemHtml); 
            
            document.getElementById('expense-name').value = '';
            document.getElementById('expense-amount').value = '';

            alert("성공적으로 지출 내역이 반영되었습니다! 💸");
        } else {
            alert("저장에 실패했습니다: " + result.message);
        }
    } catch (error) {
        alert("통신 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}

async function deleteExpense(id, amountKrw, isEdit = false) {
    if(!isEdit && !confirm("이 지출 내역을 삭제하시겠습니까? (서버에서도 지워집니다)")) return;

    showLoading(true, isEdit ? "수정을 위해 기존 데이터를 정리 중..." : "지출 내역 서버에서 삭제 중...");
    const payload = { action: "DELETE_EXPENSE", id: id };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            usedBudget -= amountKrw;
            updateBudgetUI();
            
            const el = document.getElementById('exp-' + id);
            if(el) el.remove();
            
            if(isEdit) alert("입력창으로 데이터를 성공적으로 불러왔습니다. 수정 후 다시 저장해주세요! ✏️");
            else alert("삭제가 완료되었습니다! 🗑️");
        } else {
            alert("삭제 실패: " + result.message);
        }
    } catch (e) {
        alert("통신 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}

function editExpense(id, name, amount, currency, amountKrw) {
    if(!confirm("내역을 수정하시겠습니까? \\n(기존 내역은 삭제되고 입력창으로 이동합니다.)")) return;
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
    const html = `
        <div class="check-item" id="item-wrap-${id}">
            <input type="checkbox" id="${id}" class="pack-checkbox">
            <label for="${id}" style="flex:1;">${val}</label>
            <button class="pack-delete-btn" onclick="document.getElementById('item-wrap-${id}').remove()"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;
    
    const container = document.getElementById('pack-container');
    const addBox = document.getElementById('pack-add-box');
    container.insertBefore(document.createRange().createContextualFragment(html), addBox);
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

    showLoading(true, "체크리스트 상태를 서버에 동기화 중...");
    const payload = { action: "SYNC_PACK", packData: JSON.stringify(packData) };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") alert("모든 준비물 체크 상태가 서버에 안전하게 보관되었습니다! ☁️");
        else alert("동기화 실패: " + result.message);
    } catch (error) { alert("통신 오류가 발생했습니다."); } 
    finally { showLoading(false); }
}

// 신규: GPS 센서를 활용한 스마트 사진 업로드 기능
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading(true, "GPS 위치 정보 확인 중...");

    // 스마트폰 GPS 접근 로직
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // GPS 좌표 성공적으로 획득
                const lat = position.coords.latitude.toFixed(5);
                const lon = position.coords.longitude.toFixed(5);
                const locationStr = `위도: ${lat}, 경도: ${lon}`;
                uploadPhotoData(file, locationStr);
            },
            (error) => {
                // GPS 권한 거부 또는 실패 시
                console.warn("GPS 수집 오류:", error);
                uploadPhotoData(file, "위치 정보 접근 불가 (수동 확인 필요)");
            },
            // 정확도 높임, 시간 초과 10초 설정
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        // GPS를 지원하지 않는 브라우저/기기
        uploadPhotoData(file, "GPS 기능 미지원 기기");
    }
}

// 신규: 추출된 GPS 정보와 사진을 구글 서버로 전송하는 서브 함수
function uploadPhotoData(file, locationInfo) {
    showLoading(true, "사진을 구글 드라이브에 저장 중...");
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1];
        const payload = {
            action: "UPLOAD_PHOTO", 
            imageBase64: base64Data, 
            mimeType: file.type,
            fileName: "photo_" + new Date().getTime() + ".jpg", 
            location: locationInfo // 실제 추출된 위도/경도 데이터 탑재
        };

        try {
            const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            
            if(result.result === "success") {
                alert(`성공적으로 사진이 저장되었습니다! 📸\\n(기록된 GPS: ${locationInfo})`);
            } else {
                alert("실패: " + result.message);
            }
        } catch (error) { 
            alert("통신 오류가 발생했습니다."); 
        } finally { 
            showLoading(false); 
            document.getElementById('camera-input').value = ''; // 다음 촬영을 위해 초기화
        }
    };
    reader.readAsDataURL(file);
}
