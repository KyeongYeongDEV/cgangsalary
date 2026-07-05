"use strict";
(function(){
  const $ = (id) => document.getElementById(id);
  function parseNum(el){ return parseInt(String(el.value).replace(/[^0-9]/g, ""), 10) || 0; }

  $("hourly").addEventListener("input", () => {
    const n = parseNum($("hourly"));
    $("hourly").value = n ? n.toLocaleString("ko-KR") : "";
    $("minWageWarn").classList.toggle("show", n > 0 && n < RATES.minWage);
  });

  $("fiveOrMore").addEventListener("change", () => {
    $("nightField").style.display = $("fiveOrMore").checked ? "" : "none";
  });

  $("albaForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const hourly = parseNum($("hourly"));
    if (!hourly){ $("hourly").focus(); return; }
    const taxMode = document.querySelector("input[name=taxMode]:checked").value;
    const r = albaPay({
      hourly,
      hoursPerDay: parseFloat($("hoursPerDay").value) || 0,
      daysPerWeek: parseInt($("daysPerWeek").value, 10),
      weeksPerMonth: parseFloat($("weeks").value),
      includeJuhyu: $("includeJuhyu").checked,
      nightHoursPerWeek: $("fiveOrMore").checked ? (parseFloat($("nightHours").value) || 0) : 0,
      fiveOrMore: $("fiveOrMore").checked,
      probation: $("probation").checked,
      taxMode
    });

    $("minWageWarn").classList.toggle("show", hourly < RATES.minWage);
    $("resultValue").textContent = won(r.monthlyNet);
    $("resultSub").textContent = "주 " + r.weeklyHours + "시간 근무 · 적용 시급 " + won(r.hourlyApplied)
      + (r.juhyuEligible ? " · 주휴수당 포함" : " · 주 15시간 미만이라 주휴수당 없음");
    $("dWeekly").textContent = won(r.weeklyPay);
    $("dJuhyu").textContent = won(r.juhyuPay);
    $("juhyuNote").textContent = r.juhyuEligible ? "" : "(주 15시간 미만 — 미해당)";
    $("dExtra").textContent = won(r.extraPay);
    $("dGross").textContent = won(r.monthlyGross);
    $("dDeduct").textContent = "−" + won(r.totalDeduct);
    $("dNet").textContent = won(r.monthlyNet);

    if (taxMode === "none"){
      $("deductNote").textContent = "(공제 없음)";
      $("taxNote").textContent = "";
    } else if (taxMode === "freelancer"){
      $("deductNote").textContent = "(3.3% 원천징수)";
      $("taxNote").textContent = "※ 3.3% 원천징수는 잠정 세금입니다. 다음 해 5월 종합소득세 신고를 하면 소득이 적은 경우 대부분 환급받습니다.";
    } else {
      const ins = r.ins;
      $("deductNote").textContent = "(4대보험 " + won(ins.total) + (r.incomeTax ? " + 소득세 " + won(r.incomeTax + r.localTax) : "") + ")";
      $("taxNote").textContent = "※ 4대보험 상세 — 국민연금 " + won(ins.pension) + ", 건강보험 " + won(ins.health)
        + ", 장기요양 " + won(ins.care) + ", 고용보험 " + won(ins.employment)
        + (r.incomeTax ? ", 근로소득세+지방세 " + won(r.incomeTax + r.localTax) : " (근로소득세는 이 급여 수준에서 0원)");
    }
    $("result").classList.add("show");
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
