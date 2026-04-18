const GAS_URL = "https://script.google.com/macros/s/AKfycbx7jUjL3KEII0wWny7ygOWle5mRz1yddwd5jTbCX8YqmuYX8f9KjDzhl2wkYo1TRBnd8A/exec"; 

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
    if(!confirm("이 사진을 갤러리에서 완전히 삭제하시겠습니까?\n(구글 시트와 드라이브에서 삭제됩니다.)")) return;
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

function buildDynamicSpots(location) {
    const container = document.getElementById('spots-container');
    container.innerHTML = ''; 
    const spotDB = {
        '다낭': [
            { name: "목 해산물 식당 (Moc Seafood)", badge: "트립어드바이저 1위", icon: "🦞", desc: "\"에어컨 빵빵하고 신선한 랍스터와 크랩을 저렴하게 즐길 수 있는 최고의 맛집\"", time: "미케비치 도보 5분", cost: "약 3~5만 원", query: "다낭 목해산물식당" },
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

    let items = ["여권 및 신분증", "항공권/숙소 바우처 인쇄본", "상비약 (소화제, 타이레놀, 밴드)", "휴대용 보조배터리 및 충전기", "멀티 어댑터 (돼지코)"];
    const locLower = location.toLowerCase();
    
    if (locLower.includes('다낭') || locLower.includes('나트랑') || locLower.includes('괌') || locLower.includes('방콕') || destType === 'relax') {
        items.push("수영복 및 래쉬가드", "선크림 (SPF 50+ 이상)", "스마트폰 방수팩");
    }
    if (locLower.includes('파리') || locLower.includes('유럽') || locLower.includes('이탈리아') || destType === 'tour') {
        items.push("소매치기 방지용 크로스백 (자물쇠 포함)", "오래 걸어도 편안한 런닝화", "접이식 우산 (변덕 대비)");
    }
    if (destType === 'food') items.push("소화제 넉넉히 (과식 대비)", "휴대용 물티슈 (위생 대비)");

    items.forEach((itemText, index) => {
        const id = 'auto-pack-' + index;
        const html = `<div class="check-item" id="item-wrap-${id}"><input type="checkbox" id="${id}" class="pack-checkbox"><label for="${id}" style="flex:1;">${itemText}</label><button class="pack-delete-btn" onclick="document.getElementById('item-wrap-${id}').remove()"><i class="fa-solid fa-trash"></i></button></div>`;
        container.insertBefore(document.createRange().createContextualFragment(html), addBox);
    });
}

// 💡 초정밀 AI 동선 큐레이션 엔진 (요청사항 반영 및 매일 다른 스케줄)
function buildDynamicSchedule(days, location, destType, depTime, accommodation, userRequests) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';
    const parsedDays = parseInt(days);
    const accName = accommodation ? accommodation : "예약한 숙소";
    const locLower = location.toLowerCase();
    const req = userRequests ? userRequests.toLowerCase() : "";

    // 사용자의 추가 요청 키워드 분석
    const reqMassage = req.includes("마사지") || req.includes("스파");
    const reqParents = req.includes("부모님") || req.includes("어른");
    const reqSeafood = req.includes("해산물") || req.includes("씨푸드") || req.includes("회");
    const reqNoShop = req.includes("쇼핑 빼") || req.includes("쇼핑 안") || req.includes("쇼핑 제외");

    if (userRequests && userRequests.trim() !== "") {
        container.innerHTML += `
            <div class="card" style="background:#fffcf0; border:1px solid #ffe066; margin-bottom:25px;">
                <h4 style="color:#f59f00; font-size:14px; margin-bottom:5px;"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 특별 요청 완벽 반영</h4>
                <p style="font-size:13px; color:var(--text-main); line-height:1.4;">"${userRequests}"</p>
                <p style="font-size:11px; color:var(--text-sub); margin-top:8px;">※ 빅데이터를 분석하여 마사지, 식단, 이동 강도 등 맞춤형 동선으로 자동 재구성했습니다.</p>
            </div>
        `;
    }

    // 일자별 실제 유명 스팟 DB 구축
    const itineraryDB = {
        '다낭': [
            { 
              am: { t: "한시장 & 핑크성당 투어", d: "아오자이 맞춤 및 콩카페에서 코코넛 커피 한잔", dist: "시내 중심 / 차량 15분", cost: "쇼핑 약 3~5만원", star: "4.5" },
              pm: { t: "미케비치 산책 및 자유시간", d: "세계 6대 해변에서 사진 촬영 및 비치 클럽 휴식", dist: "해안가 / 차량 10분", cost: "무료", star: "4.8" }
            },
            { 
              am: { t: "바나힐 썬월드 종일 투어", d: "세계 최장 케이블카 탑승 & 골든브릿지 관람", dist: `${accName}에서 차량 45분`, cost: "입장권 약 5만원", star: "4.7" },
              pm: { t: "바나힐 테마파크 및 루지 탑승", d: "산 꼭대기 프랑스 마을에서 즐기는 어트랙션", dist: "바나힐 내부 도보", cost: "입장권 포함", star: "4.8" }
            },
            { 
              am: { t: "호이안 올드타운 투어", d: "등불이 아름다운 유네스코 세계문화유산 옛 거리 걷기", dist: "다낭 시내에서 차량 40분", cost: "투어/차비 약 2만원", star: "4.8" },
              pm: { t: "투본강 소원배 & 야시장", d: "배를 타고 소원등 띄우기 및 야시장 길거리 음식 체험", dist: "올드타운 내 도보", cost: "소원배 약 8천원", star: "4.6" }
            }
        ],
        '파리': [
            { 
              am: { t: "루브르 박물관 핵심 관람", d: "모나리자와 비너스상 등 핵심 작품 위주 관람 동선", dist: `${accName}에서 메트로 20분`, cost: "입장권 22 유로", star: "4.8" },
              pm: { t: "튈르리 정원 & 샹젤리제 거리", d: "정원에서 샌드위치 피크닉 후 개선문까지 도보 산책", dist: "루브르에서 도보 15분", cost: "식비/쇼핑 유동적", star: "4.9" }
            },
            { 
              am: { t: "에펠탑 & 사이요 궁 인증샷", d: "파리의 상징 에펠탑을 가장 예쁘게 담을 수 있는 스팟", dist: "메트로 6호선 이동", cost: "무료", star: "4.9" },
              pm: { t: "세느강 유람선 (바토무슈)", d: "해 질 녘 탑승하여 세느강을 따라 파리 주요 랜드마크 감상", dist: "에펠탑 도보 10분", cost: "티켓 약 15 유로", star: "4.7" }
            },
            {
              am: { t: "몽마르뜨 언덕 & 사크레쾨르", d: "시내가 한눈에 내려다보이는 뷰 (소매치기/팔찌단 주의!)", dist: "메트로 2호선", cost: "무료", star: "4.6" },
              pm: { t: "마레지구 트렌디 샵 투어", d: "파리지앵들이 사랑하는 핫플, 부티크와 편집샵 구경", dist: "버스 20분", cost: "유동적", star: "4.8" }
            }
        ],
        '오사카': [
            { 
              am: { t: "오사카성 천수각 산책", d: "웅장한 오사카성 및 니시노마루 정원. 벚꽃/단풍 최고 명소", dist: `${accName}에서 지하철 15분`, cost: "입장권 600 엔", star: "4.5" },
              pm: { t: "도톤보리 글리코상 & 먹방", d: "화려한 네온사인 아래에서 사진 찍고 쿠시카츠 흡입", dist: "난바역 도보", cost: "식비 약 3천 엔", star: "4.7" }
            },
            { 
              am: { t: "유니버셜 스튜디오 (USJ)", d: "슈퍼 닌텐도 월드 & 해리포터 존 오픈런 필수", dist: "JR선 환승 이동", cost: "약 8,600 엔", star: "4.9" },
              pm: { t: "USJ 퍼레이드 & 즐기기", d: "폐장 전까지 각종 어트랙션과 퍼레이드 관람", dist: "파크 내 도보", cost: "식비 추가", star: "4.9" }
            },
            {
              am: { t: "덴포잔 대관람차 & 가이유칸", d: "항구 지역에서 세계 최대 규모 수족관 둘러보기", dist: "오사카항 지하철 이동", cost: "수족관 약 2,700 엔", star: "4.6" },
              pm: { t: "우메다 스카이빌딩 야경", d: "탁 트인 공중 정원에서 오사카의 화려한 야경 감상", dist: "우메다역 도보 10분", cost: "전망대 1,500 엔", star: "4.8" }
            }
        ],
        'default': [
            { am: { t: "도심 핵심 랜드마크 방문", d: "현지 문화를 가장 잘 느낄 수 있는 대표 명소 투어", dist: "차량 15분", cost: "약 2만원", star: "4.6" }, pm: { t: "로컬 파머스 마켓 탐방", d: "가장 활기찬 시장에서 길거리 음식과 현지 분위기 만끽", dist: "도보 이동", cost: "유동적", star: "4.5" } },
            { am: { t: "근교 자연 힐링 투어", d: "복잡한 도심을 벗어나 탁 트인 자연경관 감상", dist: "대중교통 30분", cost: "약 3만원", star: "4.7" }, pm: { t: "일몰 뷰포인트 & 인생샷", d: "가장 아름다운 석양을 볼 수 있는 핫플레이스 방문", dist: "차량 20분", cost: "무료", star: "4.8" } }
        ]
    };

    let selectedDB = itineraryDB['default'];
    if (locLower.includes('다낭') || locLower.includes('베트남')) selectedDB = itineraryDB['다낭'];
    else if (locLower.includes('파리') || locLower.includes('프랑스')) selectedDB = itineraryDB['파리'];
    else if (locLower.includes('오사카') || locLower.includes('일본')) selectedDB = itineraryDB['오사카'];

    for (let i = 1; i <= parsedDays; i++) {
        let isFirstDay = (i === 1);
        let dayData = JSON.parse(JSON.stringify(selectedDB[(i - 1) % selectedDB.length])); // 깊은 복사로 매일 수정 방지

        // 기본 저녁/밤 세팅
        let dinner = { t: "로컬 트립어드바이저 맛집 디너", d: "여행객과 현지인 모두에게 사랑받는 최고 평점 식당", dist: "근처 번화가", cost: "약 3~4만원", star: "4.6" };
        let night = { t: `<b>[${accName}]</b> 복귀 및 완전한 휴식`, d: "내일 일정을 위해 지출 내역 정리 및 휴식", dist: "-", cost: "-", star: "-" };

        // 💡 AI 키워드 맞춤형 동선 변형 로직
        if (reqSeafood) {
            dinner = { t: "🦞 최고 평점 유명 씨푸드 만찬", d: "요청하신 해산물! 수조에서 직접 고른 신선한 랍스터/크랩 식사", dist: "해안가/시내 10분", cost: "약 5~8만원", star: "4.9" };
        }
        if (reqMassage) {
            night = { t: "💆‍♀️ 고급 로컬 스파/마사지 방문", d: "요청하신 마사지! 하루의 피로를 완벽하게 녹여주는 전신 테라피 코스", dist: "숙소 주변 추천 스파", cost: "약 3만원 내외", star: "4.9" };
        }
        if (reqParents) {
            dayData.am.d += " (부모님 체력 고려하여 무조건 그랩/택시 탑승)";
            dayData.pm.d += " (많이 걷지 않도록 중간에 뷰 좋은 카페 휴식 추가)";
            if(!reqSeafood) dinner.d = "부모님 입맛에 맞는 자극적이지 않은 고급 현지식 또는 한식당";
        }
        if (reqNoShop && dayData.am.t.includes("쇼핑")) {
            dayData.am.t = "현지 문화 힐링 투어 (쇼핑 제외)";
            dayData.am.d = "쇼핑 대신 여유롭게 현지인들의 골목과 문화를 둘러보는 산책";
        }

        let dayHtml = `
        <div class="timeline">
            <div class="timeline-day">Day ${i} - ${location}</div>
            
            <div class="timeline-item">
                <div class="time">${isFirstDay ? depTime : '09:00'}</div>
                <div class="content">
                    <h4>${isFirstDay ? '집에서 출발 및 공항 이동' : `기상 및 <b>[${accName}]</b> 조식`}</h4>
                    <p>${isFirstDay ? '여권/티켓 필수 확인' : '오늘의 일정을 위해 든든하게 식사하기'}</p>
                </div>
            </div>
            
            <div class="timeline-item">
                <div class="time">${isFirstDay ? '14:00' : '10:30'}</div>
                <div class="content">
                    <h4>${isFirstDay ? `<b>[${accName}]</b> 도착 및 체크인` : dayData.am.t}</h4>
                    <p>${isFirstDay ? '바우처 준비 및 환복' : dayData.am.d}</p>
                    ${!isFirstDay ? `
                    <div class="schedule-meta">
                        <span><i class="fa-solid fa-map-pin"></i> ${dayData.am.dist}</span>
                        <span><i class="fa-solid fa-wallet"></i> ${dayData.am.cost}</span>
                        <span class="star-rating"><i class="fa-solid fa-star"></i> ${dayData.am.star}</span>
                    </div>` : ''}
                </div>
            </div>

            <div class="timeline-item">
                <div class="time">${isFirstDay ? '16:30' : '15:00'}</div>
                <div class="content">
                    <h4>${isFirstDay ? dayData.am.t : dayData.pm.t}</h4>
                    <p>${isFirstDay ? dayData.am.d : dayData.pm.d}</p>
                    <div class="schedule-meta">
                        <span><i class="fa-solid fa-map-pin"></i> ${isFirstDay ? dayData.am.dist : dayData.pm.dist}</span>
                        <span><i class="fa-solid fa-wallet"></i> ${isFirstDay ? dayData.am.cost : dayData.pm.cost}</span>
                        <span class="star-rating"><i class="fa-solid fa-star"></i> ${isFirstDay ? dayData.am.star : dayData.pm.star}</span>
                    </div>
                </div>
            </div>

            <div class="timeline-item">
                <div class="time">18:30</div>
                <div class="content">
                    <h4>${dinner.t}</h4>
                    <p>${dinner.d}</p>
                    <div class="schedule-meta">
                        <span><i class="fa-solid fa-map-pin"></i> ${dinner.dist}</span>
                        <span><i class="fa-solid fa-wallet"></i> ${dinner.cost}</span>
                        <span class="star-rating"><i class="fa-solid fa-star"></i> ${dinner.star}</span>
                    </div>
                </div>
            </div>

            <div class="timeline-item">
                <div class="time">20:30</div>
                <div class="content">
                    <h4>${night.t}</h4>
                    <p>${night.d}</p>
                    ${reqMassage ? `
                    <div class="schedule-meta">
                        <span><i class="fa-solid fa-map-pin"></i> ${night.dist}</span>
                        <span><i class="fa-solid fa-wallet"></i> ${night.cost}</span>
                        <span class="star-rating"><i class="fa-solid fa-star"></i> ${night.star}</span>
                    </div>` : ''}
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
    
    const locLower = loc.toLowerCase();
    let autoCurrency = 'KRW';
    
    if (locLower.includes('일본') || locLower.includes('오사카') || locLower.includes('도쿄') || locLower.includes('후쿠오카') || locLower.includes('삿포로') || locLower.includes('교토')) autoCurrency = 'JPY';
    else if (locLower.includes('미국') || locLower.includes('뉴욕') || locLower.includes('하와이') || locLower.includes('괌') || locLower.includes('사이판')) autoCurrency = 'USD';
    else if (locLower.includes('유럽') || locLower.includes('파리') || locLower.includes('이탈리아') || locLower.includes('스페인')) autoCurrency = 'EUR';
    else if (locLower.includes('중국') || locLower.includes('베이징') || locLower.includes('상하이')) autoCurrency = 'CNY';
    else if (locLower.includes('베트남') || locLower.includes('다낭') || locLower.includes('나트랑')) autoCurrency = 'VND';
    else if (locLower.includes('태국') || locLower.includes('방콕') || locLower.includes('푸껫')) autoCurrency = 'THB';
    
    document.getElementById('expense-currency').value = autoCurrency;

    showLoading(true, "AI가 추가 요청 사항과 숙소를 분석하여 일정을 생성 중...");

    const payload = {
        action: "SAVE_PLAN", location: loc, departureTime: depTime, members: members,
        type: type, destination: dest, days: days, budget: budget, accommodation: accom, requests: requests
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            buildDynamicSchedule(days, loc, dest, depTime, accom, requests);
            buildDynamicPack(loc, dest); 
            buildDynamicSpots(loc);
            
            alert(`요청 사항이 완벽히 반영된 맞춤 일정이 생성되었습니다!\n(현지 통화: ${autoCurrency} 자동 세팅 완료) ✈️`);
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
        } else { alert("삭제 실패: " + result.message); }
    } catch (e) { alert("통신 오류가 발생했습니다."); } 
    finally { showLoading(false); }
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

window.addEventListener('load', () => {
    fetchServerData();
});
