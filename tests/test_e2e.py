# CgangSalary E2E 테스트: pdf-editor/.venv/bin/python tests/test_e2e.py
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
failed = []

def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL") + " | " + name + ((" — " + str(detail)) if detail and not cond else ""))
    if not cond:
        failed.append(name)

def num(text):
    return int("".join(c for c in text if c.isdigit()) or 0)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # ---------- 연봉 계산기 (index) ----------
    page.goto(f"file://{ROOT}/index.html")
    page.fill("#amount", "50000000")
    page.click("#calcBtn")
    net = num(page.text_content("#resultValue"))
    check("연봉 5,000만 실수령 3,573,687원", net == 3573687, net)
    check("공제 내역 국민연금 표시", num(page.text_content("#dPension")) == 188410, page.text_content("#dPension"))

    # 역계산
    page.click('#calcMode button[data-mode="reverse"]')
    page.fill("#target", "4000000")
    page.click("#calcBtn")
    need = num(page.text_content("#resultValue"))
    check("역계산 결과 연봉 5,500만~6,000만 범위", 55000000 <= need <= 60000000, need)

    # 실수령액표 자동 생성
    rows = page.locator("#salaryTable tbody tr").count()
    check("실수령액표 20행 생성", rows == 20, rows)

    # 월급 기준 전환 시 퇴직금 필드 숨김
    page.click('#calcMode button[data-mode="forward"]')
    page.click('#payMode button[data-pay="monthly"]')
    check("월급 기준에서 퇴직금 숨김", not page.is_visible("#severanceField"))

    # ---------- 주휴수당 계산기 ----------
    page.goto(f"file://{ROOT}/juhyu.html")
    check("주휴: 시급 기본값 10,320", page.input_value("#hourly") == "10,320")
    page.click("#juhyuForm button[type=submit]")  # 기본 8h×5일
    check("주휴: 풀타임 82,560원", num(page.text_content("#resultValue")) == 82560, page.text_content("#resultValue"))
    page.fill("#hoursPerDay", "6")
    page.select_option("#daysPerWeek", "2")
    page.click("#juhyuForm button[type=submit]")
    check("주휴: 12h 미달 0원", num(page.text_content("#resultValue")) == 0)
    check("주휴: 미달 사유 문구", "15시간 미만" in page.text_content("#resultSub"))

    # ---------- 알바비 계산기 ----------
    page.goto(f"file://{ROOT}/alba.html")
    check("알바: 시급 기본값 10,320 (수정 가능 input)", page.input_value("#hourly") == "10,320")
    # 시급 수정 가능 확인 + 최저시급 미달 경고
    page.fill("#hourly", "9000")
    check("알바: 최저시급 미달 경고", page.is_visible("#minWageWarn"))
    page.fill("#hourly", "10320")
    check("알바: 경고 해제", not page.is_visible("#minWageWarn"))

    # 6h×3일, 공제 없음
    page.fill("#hoursPerDay", "6")
    page.select_option("#daysPerWeek", "3")
    page.click("#albaForm button[type=submit]")
    check("알바: 6h×3일 월 968,553원", num(page.text_content("#resultValue")) == 968553, page.text_content("#resultValue"))

    # 3.3% 선택
    page.check('input[name=taxMode][value="freelancer"]')
    page.click("#albaForm button[type=submit]")
    gross = num(page.text_content("#dGross"))
    net_a = num(page.text_content("#resultValue"))
    check("알바: 3.3% 공제 반영", net_a == gross - round(gross * 0.033), (gross, net_a))

    # 4대보험 선택 (사용자 요구사항: 가게마다 선택 가능)
    page.check('input[name=taxMode][value="insured"]')
    page.click("#albaForm button[type=submit]")
    check("알바: 4대보험 공제 반영", "4대보험" in page.text_content("#deductNote"))
    check("알바: 4대보험 상세 안내", "국민연금" in page.text_content("#taxNote"))

    # 5인 이상 체크 시 야간 입력칸 표시
    check("알바: 야간칸 기본 숨김", not page.is_visible("#nightField"))
    page.check("#fiveOrMore")
    check("알바: 5인 이상 체크 시 야간칸 표시", page.is_visible("#nightField"))

    # ---------- 공통: nav 일관성 + JSON-LD/본문 FAQ 일치 + JS 오류 ----------
    import json, re
    expected_nav = None
    for name in ["index.html", "juhyu.html", "alba.html", "about.html", "privacy.html", "contact.html"]:
        page.goto(f"file://{ROOT}/{name}")
        links = page.eval_on_selector_all("header nav a", "els => els.map(e => e.getAttribute('href'))")
        if expected_nav is None:
            expected_nav = links
        check(f"nav 동일 ({name})", links == expected_nav, links)
        active = page.eval_on_selector_all("header nav a.active", "els => els.map(e => e.getAttribute('href'))")
        check(f"nav active 자기 페이지 ({name})", active == [name], active)

    for name in ["index.html", "juhyu.html", "alba.html"]:
        html = (ROOT / name).read_text(encoding="utf-8")
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))
        faq = [x for x in ld["@graph"] if x["@type"] == "FAQPage"][0]
        page.goto(f"file://{ROOT}/{name}")
        visible_qs = page.eval_on_selector_all("#faq details summary", "els => els.map(e => e.textContent.trim())")
        ld_qs = [q["name"] for q in faq["mainEntity"]]
        check(f"FAQ JSON-LD=본문 일치 ({name})", visible_qs == ld_qs, (len(visible_qs), len(ld_qs)))
        check(f"FAQ 7개 이상 ({name})", len(visible_qs) >= 7, len(visible_qs))

    check("JS 오류 없음", errors == [], errors)
    browser.close()

print()
if failed:
    print(f"실패 {len(failed)}건: {failed}")
    sys.exit(1)
print("전체 통과")
