# CgangSalary (짱샐러리)

연봉 실수령액 · 주휴수당 · 알바비 무료 계산기 — https://cgangsalary.pages.dev

서버 없는 정적 사이트(HTML + 바닐라 JS). 모든 계산은 브라우저 안에서만 실행되며 입력값은 어디로도 전송되지 않는다.

## 페이지

| 페이지 | 대상 키워드 |
|---|---|
| `index.html` | 연봉 실수령액 계산기, 월급 실수령액 (역계산·실수령액표 포함) |
| `juhyu.html` | 주휴수당 계산기, 주휴수당 조건 |
| `alba.html` | 알바비 계산기, 시급 계산기 (공제: 없음/3.3%/4대보험 선택) |

## 2026년 적용 기준값 (js/calc.js `RATES`)

- 최저시급 10,320원 (고용노동부 고시)
- 국민연금 근로자 4.75%, 기준소득월액 상한 6,590,000원 (2026.7~2027.6)
- 건강보험 3.595%, 장기요양 건강보험료의 13.14%, 고용보험 0.9%
- 소득세: 국세청 근로소득 간이세액표 산식(소득세법 시행령 별표2) 근사, 원천징수 100% 기준
- 외부 검증: work.calculate.co.kr 2026 실수령액표 대비 오차 0.06~0.44%

**매년 갱신 필요**: 최저시급(8월 고시), 4대보험 요율(연초), 국민연금 상한(7월). `RATES` 상수와 본문 표·FAQ 문구를 함께 수정할 것.

## 테스트 (push 전 필수)

```bash
node tests/unit.test.js                          # 계산 엔진 단위 테스트
~/Downloads/ebook-script/pdf-editor/.venv/bin/python tests/test_e2e.py # Playwright E2E (계산 흐름·nav 일관성·FAQ/JSON-LD 일치)
```

## 배포

Cloudflare Pages ← GitHub(KyeongYeongDEV/cgangsalary) 연동. `git push`만 하면 자동 배포.
빌드 설정: Framework preset None, Build command 비움, Output directory `/`.
