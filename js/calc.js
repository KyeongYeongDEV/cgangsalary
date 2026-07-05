"use strict";
/* CgangSalary 계산 엔진 — 2026년 기준
 * 근거:
 *  - 2026년 최저임금 시간급 10,320원 (고용노동부 고시)
 *  - 국민연금 근로자 4.75% (총 9.5%), 기준소득월액 상한 6,590,000원 (2026.7~2027.6)
 *  - 건강보험 근로자 3.595% (총 7.19%), 장기요양보험 건강보험료의 13.14%
 *  - 고용보험 근로자 0.9%
 *  - 소득세: 국세청 근로소득 간이세액표 산식(소득세법 시행령 별표2) 기반 근사
 */
const RATES = {
  year: 2026,
  minWage: 10320,
  pension: 0.0475,
  pensionCapBase: 6590000,
  health: 0.03595,
  care: 0.1314,
  employment: 0.009,
  mealNonTax: 200000
};

function trunc10(v){ return Math.floor(v / 10) * 10; }
function comma(v){ return Math.round(v).toLocaleString("ko-KR"); }
function won(v){ return comma(v) + "원"; }

/* 4대보험 근로자 부담분 (월, 비과세 제외 금액 기준) */
function fourInsurance(monthlyTaxable){
  const base = Math.max(0, monthlyTaxable);
  const pension = trunc10(Math.min(base, RATES.pensionCapBase) * RATES.pension);
  const health = trunc10(base * RATES.health);
  const care = trunc10(health * RATES.care);
  const employment = trunc10(base * RATES.employment);
  return { pension, health, care, employment, total: pension + health + care + employment };
}

/* 근로소득공제 (연간, 한도 2,000만원) */
function earnedIncomeDeduction(annual){
  let d;
  if (annual <= 5000000) d = annual * 0.7;
  else if (annual <= 15000000) d = 3500000 + (annual - 5000000) * 0.4;
  else if (annual <= 45000000) d = 7500000 + (annual - 15000000) * 0.15;
  else if (annual <= 100000000) d = 12000000 + (annual - 45000000) * 0.05;
  else d = 14750000 + (annual - 100000000) * 0.02;
  return Math.min(20000000, d);
}

/* 간이세액표의 "특별소득공제 및 특별세액공제 중 일부" 근사식 (연간) */
function specialDeduction(annual, family){
  const n = Math.min(Math.max(family, 1), 3);
  let d;
  if (annual <= 30000000){
    d = n === 1 ? 3100000 + annual * 0.04
      : n === 2 ? 3600000 + annual * 0.04
      : 5000000 + annual * 0.07;
  } else if (annual <= 45000000){
    const cut = (annual - 30000000) * 0.05;
    d = (n === 1 ? 3100000 + annual * 0.04
       : n === 2 ? 3600000 + annual * 0.04
       : 5000000 + annual * 0.07) - cut;
  } else if (annual <= 70000000){
    d = n === 1 ? 3100000 + annual * 0.015
      : n === 2 ? 3600000 + annual * 0.02
      : 5000000 + annual * 0.05;
  } else {
    d = n === 1 ? 3100000 + annual * 0.005
      : n === 2 ? 3600000 + annual * 0.01
      : 5000000 + annual * 0.03;
  }
  if (n === 3 && annual > 40000000) d += (annual - 40000000) * 0.04;
  return Math.max(0, d);
}

/* 종합소득세 기본세율 (2023년 이후) */
function basicTax(x){
  if (x <= 0) return 0;
  if (x <= 14000000) return x * 0.06;
  if (x <= 50000000) return 840000 + (x - 14000000) * 0.15;
  if (x <= 88000000) return 6240000 + (x - 50000000) * 0.24;
  if (x <= 150000000) return 15360000 + (x - 88000000) * 0.35;
  if (x <= 300000000) return 37060000 + (x - 150000000) * 0.38;
  if (x <= 500000000) return 94060000 + (x - 300000000) * 0.40;
  if (x <= 1000000000) return 174060000 + (x - 500000000) * 0.42;
  return 384060000 + (x - 1000000000) * 0.45;
}

/* 근로소득세액공제 (한도 포함) */
function earnedTaxCredit(calcTax, annual){
  const credit = calcTax <= 1300000 ? calcTax * 0.55 : 715000 + (calcTax - 1300000) * 0.30;
  let limit;
  if (annual <= 33000000) limit = 740000;
  else if (annual <= 70000000) limit = Math.max(660000, 740000 - (annual - 33000000) * 0.008);
  else if (annual <= 120000000) limit = Math.max(500000, 660000 - (annual - 70000000) * 0.5);
  else limit = Math.max(200000, 500000 - (annual - 120000000) * 0.5);
  return Math.min(credit, limit);
}

/* 월 근로소득세 (간이세액표 산식 기반)
 * family: 공제대상 가족 수(본인 포함), children: 8세 이상 20세 이하 자녀 수 */
function monthlyIncomeTax(monthlyTaxable, family, children, monthlyPension){
  if (monthlyTaxable <= 1060000) return 0; /* 간이세액표 과세 하한 근방 */
  const annual = monthlyTaxable * 12;
  const taxBase = Math.max(0,
    annual
    - earnedIncomeDeduction(annual)
    - 1500000 * family
    - Math.min(monthlyPension * 12, annual)
    - specialDeduction(annual, family));
  const calc = basicTax(taxBase);
  let monthly = Math.max(0, calc - earnedTaxCredit(calc, annual)) / 12;
  if (children > 0){
    const childCut = children === 1 ? 12500 : children === 2 ? 29160 : 29160 + 25000 * (children - 2);
    monthly = Math.max(0, monthly - childCut);
  }
  return trunc10(monthly);
}

/* 직장인 월 실수령액
 * o = { mode:'annual'|'monthly', amount, severanceIncluded, nonTaxMonthly, family, children } */
function netSalary(o){
  const months = o.mode === "annual" && o.severanceIncluded ? 13 : 12;
  const monthlyGross = Math.round(o.mode === "annual" ? o.amount / months : o.amount);
  const nonTax = Math.min(o.nonTaxMonthly || 0, monthlyGross);
  const taxable = monthlyGross - nonTax;
  const ins = fourInsurance(taxable);
  const incomeTax = monthlyIncomeTax(taxable, o.family || 1, o.children || 0, ins.pension);
  const localTax = trunc10(incomeTax * 0.1);
  const totalDeduct = ins.total + incomeTax + localTax;
  return {
    monthlyGross: Math.round(monthlyGross),
    pension: ins.pension, health: ins.health, care: ins.care, employment: ins.employment,
    insTotal: ins.total, incomeTax, localTax, totalDeduct,
    net: Math.round(monthlyGross - totalDeduct)
  };
}

/* 역계산: 목표 월 실수령액 → 필요한 세전 연봉 (이진 탐색) */
function requiredAnnual(targetNet, opts){
  let lo = 0, hi = 3000000000;
  for (let i = 0; i < 60; i++){
    const mid = (lo + hi) / 2;
    const net = netSalary(Object.assign({}, opts, { mode: "annual", amount: mid })).net;
    if (net < targetNet) lo = mid; else hi = mid;
  }
  return Math.round(hi / 10000) * 10000; /* 만원 단위 반올림 */
}

/* 주휴수당: 1주 소정근로시간 15시간 이상이면 (소정근로시간/40)×8×시급 */
function juhyu(hourly, hoursPerDay, daysPerWeek){
  const daily = Math.min(hoursPerDay, 8);            /* 1일 소정근로 최대 8시간 */
  const weekly = Math.min(daily * daysPerWeek, 40);  /* 1주 소정근로 최대 40시간 */
  const eligible = weekly >= 15;
  const juhyuHours = eligible ? weekly / 40 * 8 : 0;
  return {
    weeklyHours: weekly,
    eligible,
    juhyuHours,
    allowance: Math.round(juhyuHours * hourly)
  };
}

/* 알바비 계산
 * o = { hourly, hoursPerDay, daysPerWeek, weeksPerMonth, includeJuhyu,
 *       nightHoursPerWeek, fiveOrMore, probation, taxMode:'none'|'freelancer'|'insured' } */
function albaPay(o){
  const hourly = o.probation ? Math.round(o.hourly * 0.9) : o.hourly;
  const totalHours = o.hoursPerDay * o.daysPerWeek;
  const j = juhyu(hourly, o.hoursPerDay, o.daysPerWeek);
  const basePay = hourly * totalHours;
  const overtimeHours = Math.max(0, totalHours - j.weeklyHours);
  let extraPay = 0;
  if (o.fiveOrMore){
    extraPay += overtimeHours * hourly * 0.5;                 /* 연장 가산 0.5배 */
    extraPay += (o.nightHoursPerWeek || 0) * hourly * 0.5;    /* 야간 가산 0.5배 */
  }
  const juhyuPay = o.includeJuhyu && j.eligible ? j.allowance : 0;
  const weeklyPay = Math.round(basePay + juhyuPay + extraPay);
  const monthlyGross = Math.round(weeklyPay * o.weeksPerMonth);

  let ins = null, incomeTax = 0, localTax = 0, withholding = 0;
  if (o.taxMode === "freelancer"){
    withholding = Math.round(monthlyGross * 0.033);
  } else if (o.taxMode === "insured"){
    ins = fourInsurance(monthlyGross);
    incomeTax = monthlyIncomeTax(monthlyGross, 1, 0, ins.pension);
    localTax = trunc10(incomeTax * 0.1);
  }
  const totalDeduct = (ins ? ins.total : 0) + incomeTax + localTax + withholding;
  return {
    hourlyApplied: hourly,
    belowMinWage: hourly < RATES.minWage,
    weeklyHours: totalHours,
    juhyuEligible: j.eligible,
    juhyuPay,
    overtimeHours,
    extraPay: Math.round(extraPay),
    weeklyPay,
    monthlyGross,
    ins, incomeTax, localTax, withholding, totalDeduct,
    monthlyNet: monthlyGross - totalDeduct
  };
}

if (typeof module !== "undefined") {
  module.exports = { RATES, fourInsurance, monthlyIncomeTax, netSalary, requiredAnnual, juhyu, albaPay, trunc10 };
}
