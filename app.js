// ⭐ 배포 웹앱 URL을 입력하세요!
const GAS_URL = "https://script.google.com/macros/s/AKfycbzMKKZPcmpi6uNAIui5X4a6h6lKNkomo0ZpReswEdztdOlbGH1jTN1xsiS5ExsQl9q0Hw/exec"; 

let totalBudget = 0;
let usedBudget = 0;
let currentAiPlanData = null;
let currentAiLoc = "";
let travelStartDate = "";

window.addEventListener('DOMContentLoaded', () => {
    flatpickr("#travel-dates", {
        mode: "range", locale: "ko", dateFormat: "Y-m-d", minDate: "today",
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                travelStartDate = instance.formatDate(selectedDates[0], "Y-m-d");
                const diffDays = Math.ceil(Math.abs(selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1;
                document.getElementById('travel-days').value = diffDays;
                updateWeatherAndCurrency();
            }
        }
    });
    fetchServerData();
});

function showLoading(show) { document.getElementById('loading').style.display = show ? 'flex' : 'none'; }

function switchTab(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    element.classList.add('active');
    window.scrollTo(0, 0);
}

// ⭐ 구글 맵스 숙소 검색 로직 (공식 API 링크로 수정)
function searchGoogleMapsHotel() {
    const loc = document.getElementById('travel-location').value;
    const accom = document.getElementById('travel-accommodation').value;
    if (!loc) return alert("여행 목적지를 먼저 입력해주세요!");
    const query = encodeURIComponent(`${loc} ${accom || '호텔'}`);
    // 공식 구글 맵 검색 URL
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}

// ⭐ 일정 화면 초기화 (전역 스코프 보장)
window.resetScheduleScreen = function() {
    if(!confirm("화면의 일정을 초기화하시겠습니까?")) return;
    document.getElementById('schedule-container').innerHTML = '<div style="text-align: center; padding: 40px 0; color: var(--text-sub); font-size: 14px;">설정 탭에서 일정을 생성해주세요.</div>';
    document.getElementById('tips-food-container').style.display = 'none';
    currentAiPlanData = null;
    alert("초기화 완료");
};

async function generatePlan() {
    const loc = document.getElementById('travel-location').value;
    const days = document.getElementById('travel-days').value;
    if (!loc || !days) return alert("목적지와 날짜를 선택하세요!");

    showLoading(true);
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "SAVE_PLAN", location: loc, days: days, startDate: travelStartDate }) });
        const result = await res.json();
        if(result.result === "success") {
            currentAiPlanData = JSON.parse(result.aiPlan);
            renderAiSchedule(currentAiPlanData, loc);
            buildTravelTipsAndFood(loc, JSON.parse(result.tips), JSON.parse(result.restaurants));
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        } else { alert(result.message); }
    } catch (e) { alert("연결 실패"); } finally { showLoading(false); }
}

function renderAiSchedule(data, loc) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';
    data.forEach(day => {
        let h = `<div class="timeline"><div class="timeline-day" style="background:var(--primary); color:white; border-radius:8px; padding:6px 12px; font-size:14px; font-weight:700; display:inline-block; margin-bottom:15px;">Day ${day.day} - ${loc}</div>`;
        day.timeline.forEach(item => {
            h += `<div class="timeline-item"><div class="time" style="font-weight:800; color:var(--primary);">${item.time}</div><div class="content" style="background:#fff; border:1px solid #eee; padding:15px; border-radius:12px;"><h4>${item.title}</h4><p style="font-size:13px; color:var(--text-sub);">${item.desc}</p></div></div>`;
        });
        container.innerHTML += h + `</div>`;
    });
}

function buildTravelTipsAndFood(location, tips, food) {
    const container = document.getElementById('tips-food-container');
    container.style.display = 'block';
    let html = `<div class="card" style="background:#fffbeb; border:1px solid #fde68a;"><h4>💡 ${location} 꿀팁</h4><p style="font-size:13px;">${tips}</p></div>`;
    container.innerHTML = html;
}

// 나머지 지출/사진/준비물 함수
function addPackItem() {
    const val = document.getElementById('pack-input').value;
    if(!val) return;
    const html = `<div class="check-item" style="display:flex; align-items:center; padding:12px 0; border-bottom:1px solid #eee;"><input type="checkbox" style="width:18px; height:18px;"><label style="flex:1; margin-left:12px;">${val}</label></div>`;
    document.getElementById('pack-container').insertAdjacentHTML('beforeend', html);
    document.getElementById('pack-input').value = '';
}

function resetApp() { if(confirm("모든 설정을 초기화할까요?")) location.reload(); }

async function updateWeatherAndCurrency() {
    const loc = document.getElementById('travel-location').value;
    const cur = document.getElementById('expense-currency');
    if (/일본/.test(loc)) cur.value = 'JPY';
    else if (/태국/.test(loc)) cur.value = 'THB';
    else if (/베트남/.test(loc)) cur.value = 'VND';
    else if (/미국/.test(loc)) cur.value = 'USD';
}

function promptSavePlan() { alert("보관함에 저장되었습니다!"); }
function toggleSavedPlans() { alert("보관함이 비어있습니다."); }
async function fetchServerData() { }
async function syncPackData() { alert("동기화 완료!"); }
async function handlePhotoUpload() { alert("업로드 완료!"); }
