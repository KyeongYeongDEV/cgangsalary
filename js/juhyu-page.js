"use strict";
(function(){
  const $ = (id) => document.getElementById(id);
  function parseNum(el){ return parseInt(String(el.value).replace(/[^0-9]/g, ""), 10) || 0; }

  $("hourly").addEventListener("input", () => {
    const n = parseNum($("hourly"));
    $("hourly").value = n ? n.toLocaleString("ko-KR") : "";
    $("minWageWarn").classList.toggle("show", n > 0 && n < RATES.minWage);
  });

  $("juhyuForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const hourly = parseNum($("hourly"));
    if (!hourly){ $("hourly").focus(); return; }
    const hoursPerDay = parseFloat($("hoursPerDay").value) || 0;
    const daysPerWeek = parseInt($("daysPerWeek").value, 10);
    const j = juhyu(hourly, hoursPerDay, daysPerWeek);
    const basePay = Math.round(hourly * hoursPerDay * daysPerWeek);

    $("minWageWarn").classList.toggle("show", hourly < RATES.minWage);
    $("resultValue").textContent = won(j.allowance);
    $("resultSub").textContent = j.eligible
      ? "지급 조건 충족 — 주 " + j.weeklyHours + "시간 (15시간 이상)"
      : "지급 대상 아님 — 주 소정근로 " + j.weeklyHours + "시간으로 15시간 미만입니다";
    $("dWeeklyHours").textContent = j.weeklyHours + "시간";
    $("dJuhyuHours").textContent = (Math.round(j.juhyuHours * 100) / 100) + "시간";
    $("dJuhyu").textContent = won(j.allowance);
    $("dWeekly").textContent = won(basePay + j.allowance);
    $("calcNote").textContent = j.eligible
      ? "계산 과정: (" + j.weeklyHours + "시간 ÷ 40) × 8 × " + won(hourly) + " = " + won(j.allowance)
      : "주 15시간 이상 근무하도록 시간을 조정하면 주휴수당을 받을 수 있습니다. 예를 들어 하루 3시간 × 주 5일이면 조건을 충족합니다.";
    $("result").classList.add("show");
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
