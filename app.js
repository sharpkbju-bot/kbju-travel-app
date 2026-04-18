const GAS_URL = "https://script.google.com/macros/s/AKfycbwbk0EVM_8z9zyLOuwSJLOY7OGGu-blgCGlSIC_YSVuhxsGIGkWia8VtjVGw7NKQpiR-g/exec"; 

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

async function fetchServerData() {
    showLoading(true, "서버 연결 중...");
    try {
        const response = await fetch(GAS_URL);
        const result = await response.json();
        if (result.result === "success") renderGallery(result.data);
    } catch (e) { console.error(e); } finally { showLoading(false); }
}

function renderAiSchedule(aiData, location, requests) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';
    if (requests) {
        container.innerHTML += `<div class="card" style="background:#fffcf0; border:1px solid #ffe066; margin-bottom:20px;">
            <h4 style="color:#f59f00; font-size:14px;"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 특별 요청 반영됨</h4>
            <p style="font-size:13px; margin-top:5px;">"${requests}"</p>
        </div>`;
    }
    aiData.forEach(day => {
        let html = `<div class="timeline"><div class="timeline-day">Day ${day.day} - ${location}</div>`;
        day.timeline.forEach(item => {
            html += `<div class="timeline-item"><div class="time">${item.time}</div><div class="content">
                <h4>${item.title}</h4><p>${item.desc}</p>
                <div class="schedule-meta">
                    <span><i class="fa-solid fa-map-pin"></i> ${item.dist}</span>
                    <span><i class="fa-solid fa-wallet"></i> ${item.cost}</span>
                    <span class="star-rating"><i class="fa-solid fa-star"></i> ${item.star}</span>
                </div>
            </div></div>`;
        });
        container.innerHTML += html + `</div>`;
    });
}

async function generatePlan() {
    const loc = document.getElementById('travel-location').value;
    const requests = document.getElementById('travel-requests').value;
    const days = document.getElementById('travel-days').value;
    
    if (!loc || !days) return alert("목적지와 기간을 입력해주세요!");

    showLoading(true, "제미나이 AI가 일정을 생성 중입니다... (약 10초)");
    const payload = { 
        action: "SAVE_PLAN", location: loc, days: days, requests: requests,
        members: document.getElementById('travel-members').value,
        type: document.getElementById('travel-type').value,
        destination: document.getElementById('travel-destination').value,
        accommodation: document.getElementById('travel-accommodation').value,
        departureTime: document.getElementById('travel-departure').value,
        budget: document.getElementById('travel-budget').value
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.result === "success") {
            renderAiSchedule(JSON.parse(result.aiPlan), loc, requests);
            alert("AI 일정이 생성되었습니다!");
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        }
    } catch (e) { alert("오류가 발생했습니다."); } finally { showLoading(false); }
}

function renderGallery(dataRows) {
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = '';
    dataRows.filter(row => row[1] === "PHOTO").reverse().forEach(p => {
        gallery.innerHTML += `<div class="photo-card">
            <button class="photo-delete-btn" onclick="deletePhoto('${p[3]}')"><i class="fa-solid fa-trash"></i></button>
            <img src="${p[3]}" onerror="this.src='https://via.placeholder.com/150'">
            <div class="photo-loc">${p[2]}</div>
        </div>`;
    });
}

async function deletePhoto(url) {
    if(!confirm("삭제할까요?")) return;
    showLoading(true, "삭제 중...");
    await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({action: "DELETE_PHOTO", fileUrl: url}) });
    fetchServerData();
}

window.addEventListener('load', fetchServerData);
