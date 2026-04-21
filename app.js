const GAS_URL = "https://script.google.com/macros/s/AKfycbzpxzr2L8qDHxLwcGOeWGToqg1exudrFSsGIyQ5vSHNMlJJyHyN6bhELynflI7ebkgrWQ/exec";

async function generatePlan() {
    const loc = document.getElementById('travel-location').value;
    const type = document.getElementById('travel-type').value;
    const members = document.getElementById('travel-members').value;
    const dest = document.getElementById('travel-destination').value;
    const days = document.getElementById('travel-days').value;
    const accom = document.getElementById('travel-accommodation').value;
    const depTime = document.getElementById('travel-departure').value;
    const budget = document.getElementById('travel-budget').value;
    const requests = document.getElementById('travel-requests').value;

    if (!loc || !type || !days) return alert("필수 항목(목적지, 구성원, 기간)을 확인해주세요!");

    showLoading(true, "라이브러리에서 최신 정보를 조회 중입니다...");

    const payload = {
        action: "SAVE_PLAN",
        location: loc,
        type: type,
        members: members,
        destination: dest,
        days: days,
        accommodation: accom,
        departureTime: depTime,
        budget: budget,
        requests: requests,
        startDate: travelStartDate // flatpickr에서 저장된 전역 변수
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.result === "success") {
            const aiData = JSON.parse(result.aiPlan);
            const tipsData = JSON.parse(result.tips);
            const foodData = JSON.parse(result.restaurants);
            
            renderAiSchedule(aiData, loc, requests);
            buildTravelTipsAndFood(loc, tipsData, foodData);
            
            alert("최신 여행 정보 로딩 완료! 일정 탭을 확인하세요. ✈️");
            switchTab('tab-schedule', document.querySelectorAll('.nav-item')[1]);
        }
    } catch (e) {
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
        showLoading(false);
    }
}
