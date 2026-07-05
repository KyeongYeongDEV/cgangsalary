"use strict";
(function(){
  const $ = (id) => document.getElementById(id);

  /* 숫자 입력칸에 천단위 콤마 자동 적용 */
  function parseNum(el){ return parseInt(String(el.value).replace(/[^0-9]/g, ""), 10) || 0; }
  function bindComma(el){
    el.addEventListener("input", () => {
      const n = parseNum(el);
      el.value = n ? n.toLocaleString("ko-KR") : "";
    });
  }
  ["amount", "target", "nonTax"].forEach(id => bindComma($(id)));

  let calcMode = "forward";  /* forward: 실수령액, reverse: 역계산 */
  let payMode = "annual";    /* annual | monthly */

  function segInit(segId, attr, onChange){
    const seg = $(segId);
    seg.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        seg.querySelectorAll("button").forEach(b => b.classList.remove("on"));
        btn.classList.add("on");
        onChange(btn.dataset[attr]);
      });
    });
  }
  segInit("calcMode", "mode", m => { calcMode = m; syncForm(); });
  segInit("payMode", "pay", p => { payMode = p; syncForm(); });

  function syncForm(){
    const forward = calcMode === "forward";
    $("amountField").style.display = forward ? "" : "none";
    $("targetField").style.display = forward ? "none" : "";
    $("payMode").style.visibility = forward ? "" : "hidden";
    $("severanceField").style.display = (forward && payMode === "monthly") ? "none" : "";
    $("amountLabel").textContent = payMode === "annual" ? "세전 연봉" : "세전 월급";
    $("amount").placeholder = payMode === "annual" ? "예: 50,000,000" : "예: 4,000,000";
    $("calcBtn").textContent = forward ? "실수령액 계산하기" : "필요 연봉 계산하기";
    $("result").classList.remove("show");
  }

  function currentOpts(){
    return {
      severanceIncluded: $("severance").value === "included",
      nonTaxMonthly: parseNum($("nonTax")),
      family: parseInt($("family").value, 10),
      children: parseInt($("children").value, 10)
    };
  }

  function showResult(r, label, sub){
    $("resultLabel").textContent = label;
    $("resultValue").textContent = won(r.net);
    $("resultSub").textContent = sub;
    $("dPension").textContent = won(r.pension);
    $("dHealth").textContent = won(r.health);
    $("dCare").textContent = won(r.care);
    $("dEmployment").textContent = won(r.employment);
    $("dIncomeTax").textContent = won(r.incomeTax);
    $("dLocalTax").textContent = won(r.localTax);
    $("dTotal").textContent = won(r.totalDeduct);
    $("dNet").textContent = won(r.net);
    $("result").classList.add("show");
    $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  $("salaryForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const opts = currentOpts();
    if (calcMode === "forward"){
      const amount = parseNum($("amount"));
      if (!amount){ $("amount").focus(); return; }
      const r = netSalary(Object.assign({ mode: payMode, amount }, opts));
      const yearly = r.net * 12;
      showResult(r, "월 예상 실수령액",
        "세전 월 " + won(r.monthlyGross) + " · 연간 실수령 약 " + won(yearly));
    } else {
      const target = parseNum($("target"));
      if (!target){ $("target").focus(); return; }
      const annual = requiredAnnual(target, opts);
      const r = netSalary(Object.assign({ mode: "annual", amount: annual }, opts));
      showResult(r, "필요한 세전 연봉", "이 연봉일 때 월 실수령액 약 " + won(r.net));
      $("resultValue").textContent = won(annual);
    }
  });

  $("resetBtn").addEventListener("click", () => {
    $("salaryForm").reset();
    $("nonTax").value = "200,000";
    $("result").classList.remove("show");
    $("amount").focus();
  });

  $("copyBtn").addEventListener("click", () => {
    const rows = Array.from(document.querySelectorAll("#breakdown tr"))
      .map(tr => Array.from(tr.children).map(td => td.textContent.replace(/\s+/g, " ").trim()).join(": "));
    const text = $("resultLabel").textContent + " " + $("resultValue").textContent + "\n" + rows.join("\n") + "\n(CgangSalary · cgangsalary.pages.dev)";
    navigator.clipboard.writeText(text).then(() => {
      $("copyDone").style.display = "";
      setTimeout(() => { $("copyDone").style.display = "none"; }, 1500);
    });
  });

  /* 연봉 구간별 실수령액표 생성 (본인 1인, 비과세 20만, 퇴직금 별도) */
  (function buildTable(){
    const tbody = document.querySelector("#salaryTable tbody");
    const rows = [];
    for (let annual = 24000000; annual <= 100000000; annual += 4000000){
      const r = netSalary({ mode: "annual", amount: annual, severanceIncluded: false,
                            nonTaxMonthly: 200000, family: 1, children: 0 });
      rows.push("<tr><td>" + comma(annual / 10000) + "만원</td><td>" + won(r.monthlyGross) +
                "</td><td>" + won(r.totalDeduct) + "</td><td><b>" + won(r.net) + "</b></td></tr>");
    }
    tbody.innerHTML = rows.join("");
  })();

  syncForm();
})();
