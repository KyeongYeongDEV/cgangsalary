"use strict";
/* 계산 엔진 단위 테스트: node tests/unit.test.js */
const { RATES, fourInsurance, netSalary, requiredAnnual, juhyu, albaPay } = require("../js/calc.js");

let failed = 0;
function eq(name, actual, expected){
  const ok = actual === expected;
  if (!ok) failed++;
  console.log((ok ? "PASS" : "FAIL") + " | " + name + " → " + actual + (ok ? "" : " (기대값 " + expected + ")"));
}
function near(name, actual, expected, tol){
  const ok = Math.abs(actual - expected) <= tol;
  if (!ok) failed++;
  console.log((ok ? "PASS" : "FAIL") + " | " + name + " → " + actual + (ok ? "" : " (기대값 " + expected + "±" + tol + ")"));
}

/* 1. 상수 */
eq("2026 최저시급", RATES.minWage, 10320);

/* 2. 4대보험 — 과세 월급 3,966,667원 (연봉 5,000만, 비과세 20만) */
const ins = fourInsurance(3966667);
eq("국민연금 4.75%", ins.pension, 188410);
eq("건강보험 3.595%", ins.health, 142600);
eq("장기요양 13.14%", ins.care, 18730);
eq("고용보험 0.9%", ins.employment, 35700);

/* 3. 국민연금 상한 — 기준소득월액 659만원 초과 시 고정 */
eq("국민연금 상한 적용", fourInsurance(10000000).pension, Math.floor(6590000 * 0.0475 / 10) * 10);

/* 4. 연봉 5,000만 실수령액 (본인 1인, 비과세 20만, 퇴직금 별도) — 손계산 검증값 */
const r50 = netSalary({ mode: "annual", amount: 50000000, severanceIncluded: false, nonTaxMonthly: 200000, family: 1, children: 0 });
eq("연봉 5,000만 월 세전", r50.monthlyGross, 4166667);
near("연봉 5,000만 소득세", r50.incomeTax, 188680, 20);
near("연봉 5,000만 실수령", r50.net, 3573687, 100);

/* 5. 부양가족이 많으면 소득세 감소 */
const r50f3 = netSalary({ mode: "annual", amount: 50000000, severanceIncluded: false, nonTaxMonthly: 200000, family: 3, children: 1 });
if (r50f3.incomeTax < r50.incomeTax) { console.log("PASS | 부양가족 3인+자녀1 소득세 감소 → " + r50f3.incomeTax); }
else { failed++; console.log("FAIL | 부양가족 소득세 감소 안 함"); }

/* 6. 퇴직금 포함 = 13분할 */
const rInc = netSalary({ mode: "annual", amount: 52000000, severanceIncluded: true, nonTaxMonthly: 200000, family: 1, children: 0 });
eq("퇴직금 포함 13분할", rInc.monthlyGross, 4000000);

/* 7. 역계산: 목표 실수령 → 필요 연봉 → 재계산 시 목표 이상 */
const need = requiredAnnual(4000000, { severanceIncluded: false, nonTaxMonthly: 200000, family: 1, children: 0 });
const rNeed = netSalary({ mode: "annual", amount: need, severanceIncluded: false, nonTaxMonthly: 200000, family: 1, children: 0 });
near("역계산 4,000,000원 목표", rNeed.net, 4000000, 15000);

/* 8. 주휴수당 */
eq("주휴: 8h×5일 풀타임", juhyu(10320, 8, 5).allowance, 82560);
eq("주휴: 4h×5일(20h)", juhyu(10320, 4, 5).allowance, 41280);
eq("주휴: 6h×2일(12h) 미달", juhyu(10320, 6, 2).allowance, 0);
eq("주휴: 10h×5일 → 소정근로 40h 상한", juhyu(10320, 10, 5).allowance, 82560);

/* 9. 알바비 — 6h×3일(18h), 주휴 포함, 공제 없음, 월평균 */
const a1 = albaPay({ hourly: 10320, hoursPerDay: 6, daysPerWeek: 3, weeksPerMonth: 4.345, includeJuhyu: true, nightHoursPerWeek: 0, fiveOrMore: false, probation: false, taxMode: "none" });
eq("알바 주급(18h+주휴3.6h)", a1.weeklyPay, Math.round(10320 * 18 + 10320 * 3.6));
eq("알바 공제없음 실수령=세전", a1.monthlyNet, a1.monthlyGross);

/* 10. 알바 3.3% */
const a2 = albaPay({ hourly: 10320, hoursPerDay: 6, daysPerWeek: 3, weeksPerMonth: 4.345, includeJuhyu: true, nightHoursPerWeek: 0, fiveOrMore: false, probation: false, taxMode: "freelancer" });
eq("알바 3.3% 공제", a2.totalDeduct, Math.round(a2.monthlyGross * 0.033));

/* 11. 알바 4대보험 — 저임금 구간 소득세 0 */
const a3 = albaPay({ hourly: 10320, hoursPerDay: 6, daysPerWeek: 3, weeksPerMonth: 4.345, includeJuhyu: true, nightHoursPerWeek: 0, fiveOrMore: false, probation: false, taxMode: "insured" });
if (a3.ins && a3.ins.total > 0 && a3.incomeTax === 0) { console.log("PASS | 알바 4대보험 공제 + 소득세 0 → " + a3.ins.total); }
else { failed++; console.log("FAIL | 알바 4대보험 계산 이상: " + JSON.stringify({ ins: a3.ins, tax: a3.incomeTax })); }

/* 12. 야간 가산: 5인 이상만 적용 */
const nightOn = albaPay({ hourly: 10000, hoursPerDay: 8, daysPerWeek: 5, weeksPerMonth: 4.345, includeJuhyu: true, nightHoursPerWeek: 10, fiveOrMore: true, probation: false, taxMode: "none" });
const nightOff = albaPay({ hourly: 10000, hoursPerDay: 8, daysPerWeek: 5, weeksPerMonth: 4.345, includeJuhyu: true, nightHoursPerWeek: 10, fiveOrMore: false, probation: false, taxMode: "none" });
eq("야간 10h 가산 (5인 이상)", nightOn.extraPay, 10000 * 10 * 0.5);
eq("야간 가산 없음 (5인 미만)", nightOff.extraPay, 0);

/* 13. 수습 90% */
eq("수습 시급 90%", albaPay({ hourly: 10320, hoursPerDay: 8, daysPerWeek: 5, weeksPerMonth: 4.345, includeJuhyu: false, nightHoursPerWeek: 0, fiveOrMore: false, probation: true, taxMode: "none" }).hourlyApplied, 9288);

console.log(failed === 0 ? "\n전체 통과" : "\n실패 " + failed + "건");
process.exit(failed === 0 ? 0 : 1);
