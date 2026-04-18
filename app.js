const GAS_URL = "https://script.google.com/macros/s/AKfycbxHPywU0EjrzXdqcUmzMAGDunFysvv56SwHryAO9YrRZ1ULJ4-3ny8szEEcSX3WfQb8gQ/exec"; 

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

// 신규: 숙소 구글 맵 검색 기능
function searchAccommodation() {
    const loc = document.getElementById('travel-location').value;
    if(!loc) return alert("상세 여행지를 먼저 입력해주세요!");
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc + " 숙소 호텔")}`;
    window.open(searchUrl, '_blank');
}

// 신규: 앱 구동/새로고침 시 서버에서 데이터를 불러와 갤러리를 렌더링하는 함수
async function fetchServerData() {
    showLoading(true, "서버에서 여행 기록을 불러오는 중...");
    try {
        const response = await fetch(GAS_URL);
        const result = await response.json();
        
        if (result.result === "success") {
            renderGallery(result.data);
        }
    } catch (e) {
        console.error("데이터 로드 실패", e);
    } finally {
        showLoading(false);
    }
}

// 갤러리 렌더링 로직
function renderGallery(dataRows) {
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = '';
    
    // 2번째 열(인덱스 1)이 'PHOTO'인 행만 추출
    const photos = dataRows.filter(row => row[1] === "PHOTO");
    
    if (photos.length === 0) {
        gallery.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-sub); padding: 30px 0; font-size: 13px;">아직 촬영된 사진이 없습니다.</div>`;
        return;
    }
    
    // 최신 사진이 위로 오도록 배열 뒤집기
    photos.reverse().forEach(p => {
        const dateObj = new Date(p[0]);
        const dateStr = `${dateObj.getFullYear()}.${dateObj.getMonth()+1}.${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
        const locStr = p[2];
        const imgUrl = p[3]; // 저장된 특수 이미지 링크
        
        const html = `
            <div class="photo-card">
                <img src="${imgUrl}" alt="여행 사진" onerror="this.src='https://via.placeholder.com/150?text=Image+Load+Error'">
                <div class="photo-loc"><i class="fa-solid fa-location-dot" style="color:var(--accent);"></i> ${locStr}</div>
                <div class="photo-date">${dateStr}</div>
            </div>
        `;
        gallery.innerHTML += html;
    });
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

// 수정됨: 숙소를 반영한 디테일한 맞춤형 일정 생성
function buildDynamicSchedule(days, location, destType, depTime, accommodation) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    const typeLabels = { 'relax': '휴양/힐링', 'tour': '관광/랜드마크', 'food': '맛집 탐방', 'activity': '액티비티 체험' };
    const themeStr = typeLabels[destType] || '자유 일정';
    const parsedDays = parseInt(days);
    const accName = accommodation ? accommodation : "예약한 숙소";
    const locLower = location.toLowerCase();

    // 도시별 디테일 모의 데이터 세팅
    let s_morning = "현지 명소 둘러보기";
    let s_lunch = "현지 최고 맛집 런치";
    let s_afternoon = "주요 랜드마크 방문 및 자유시간";
    let s_dinner = "로컬 다이닝 및 휴식";
    let s_desc_am = "이동 시간 및 동선 파악 필수";

    if(locLower.includes('다낭') || locLower.includes('베트남')) {
        s_morning = "한시장 쇼핑 및 주변 로컬 카페 탐방";
        s_lunch = "냐벱(Nha Bep) 등 현지 베트남 가정식";
        s_afternoon = "바나힐 테마파크 투어 또는 미케비치 수영";
        s_dinner = "해산물 마켓 씨푸드 다이닝";
        s_desc_am = "그랩(Grab) 어플 호출 추천";
    } else if(locLower.includes('파리') || locLower.includes('프랑스')) {
        s_morning = "루브르 박물관 또는 오르세 미술관 관람";
        s_lunch = "노천 카페에서 샌드위치와 에스프레소";
        s_afternoon = "에펠탑 관람 및 몽마르뜨 언덕 산책";
        s_dinner = "세느강 낭만 디너 크루즈 탑승";
        s_desc_am = "소매치기 주의 및 나비고(Navigo) 패스 준비";
    } else if(locLower.includes('오사카') || locLower.includes('일본')) {
        s_morning = "오사카성 천수각 산책 및 사진 촬영";
        s_lunch = "도톤보리 이치란 라멘 또는 초밥";
        s_afternoon = "유니버셜 스튜디오 또는 덴포잔 관람차";
        s_dinner = "야키니쿠와 시원한 생맥주 한 잔";
        s_desc_am = "주유패스 활용 및 지하철 이동 추천";
    }

    for (let i = 1; i <= parsedDays; i++) {
        let isFirstDay = (i === 1);
        let dayHtml = `
        <div class="timeline">
            <div class="timeline-day">Day ${i} - ${location} (${themeStr})</div>
            
            <div class="timeline-item">
                <div class="time">${isFirstDay ? depTime : '09:30'}</div>
                <div class="content">
                    <h4>${isFirstDay ? '집에서 출발 및 공항/역 이동' : `기상 및 <b>[${accName}]</b> 조식`}</h4>
                    <p>${isFirstDay ? '여권 및 티켓 확인 필수' : '여유로운 아침 식사 및 컨디션 조절'}</p>
                </div>
            </div>
            
            <div class="timeline-item">
                <div class="time">${isFirstDay ? '14:00' : '11:00'}</div>
                <div class="content">
                    <h4>${isFirstDay ? `<b>[${accName}]</b> 체크인 및 짐 보관` : s_morning}</h4>
                    <p>${isFirstDay ? '바우처 준비 및 로비 대기' : s_desc_am}</p>
                </div>
            </div>

            <div class="timeline-item">
                <div class="time">${isFirstDay ? '15:30' : '13:00'}</div>
                <div class="content">
                    <h4>${s_lunch}</h4>
                    <p>미리 예약 또는 웨이팅 확인 필수</p>
                </div>
            </div>
            
            <div class="timeline-item">
                <div class="time">${isFirstDay ? '17:00' : '15:00'}</div>
                <div class="content">
                    <h4>${s_afternoon}</h4>
                    <p>체력 소모: 보통 | 사진 스팟 집중 공략</p>
                </div>
            </div>
            
            <div class="timeline-item">
                <div class="time">19:00</div>
                <div class="content">
                    <h4>${s_dinner}</h4>
                    <p>저녁 식사 후 내일 일정 점검</p>
                </div>
            </div>

            <div class="timeline-item">
                <div class="time">21:30</div>
                <div class="content">
                    <h4><b>[${accName}]</b> 복귀 및 완전한 휴식</h4>
                    <p>가벼운 맥주 한 캔과 함께 하루 마무리</p>
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
    const accom = document.getElementById('travel-accommodation').value; // 신규: 숙소 값
    
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

    showLoading(true, "숙소 위치 기반으로 디테일 일정을 생성 및 저장 중...");

    const payload = {
        action: "SAVE_PLAN", location: loc, departureTime: depTime, members: members,
        type: type, destination: dest, days: days, budget: budget, accommodation: accom
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            // 변경됨: 숙소 데이터를 파라미터로 넘김
            buildDynamicSchedule(days, loc, dest, depTime, accom);
            buildDynamicPack(loc, dest); 
            buildDynamicSpots(loc);
            
            alert(`완벽한 맞춤형 여행 일정이 생성되었습니다!\n(현지 통화: ${autoCurrency} 자동 세팅 완료) ✈️`);
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

async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading(true, "GPS 기반 현지 지역명 변환 중...");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                let locationStr = `위도: ${lat.toFixed(5)}, 경도: ${lon.toFixed(5)}`;

                try {
                    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
                    const data = await response.json();
                    
                    let regionName = "";
                    if (data.principalSubdivision) regionName += data.principalSubdivision + " ";
                    if (data.locality) regionName += data.locality;
                    
                    if (regionName.trim() !== "") {
                        locationStr = `${regionName.trim()} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                    }
                } catch (e) {
                    console.warn("지역명 변환 실패");
                }

                uploadPhotoData(file, locationStr);
            },
            (error) => {
                console.warn("GPS 수집 오류:", error);
                uploadPhotoData(file, "위치 정보 접근 불가");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        uploadPhotoData(file, "GPS 기능 미지원 기기");
    }
}

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
            location: locationInfo 
        };

        try {
            const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await response.json();
            
            if(result.result === "success") {
                alert(`성공적으로 사진이 갤러리에 저장되었습니다! 📸\n(기록된 장소: ${locationInfo})`);
                // 사진 업로드 성공 시 갤러리 자동 리로드
                fetchServerData();
            } else {
                alert("실패: " + result.message);
            }
        } catch (error) { 
            alert("통신 오류가 발생했습니다."); 
        } finally { 
            showLoading(false); 
            document.getElementById('camera-input').value = ''; 
        }
    };
    reader.readAsDataURL(file);
}

// 신규: 앱 최초 로딩 시 갤러리 데이터 불러오기 (사용자가 원할 때 우측 상단 버튼으로도 가능)
window.addEventListener('load', () => {
    fetchServerData();
});
