# 회전면 위 입자 운동 — EAPEF 유도 및 수치 검증

**General Physics I Group Project** · DGIST 반도체공학과 · 2026

**GitHub:** `https://github.com/<username>/<repo>` ← 저장소 생성 후 실제 URL로 교체하세요.

> Timberlake & Mbenoun, *Am. J. Phys.* **94**, 16 (2026) 논문의 **유효 아날로그 퍼텐셜 에너지 함수(EAPEF)** 를 회전면 위 마찰 없는 입자 운동에 적용하고, 이론 유도와 수치 적분 결과를 비교·검증한 프로젝트입니다.

## 팀원

| 이름 | 영문 |
|------|------|
| 강지안 | Ji-an Kang |
| 박지훈 | Ji-hoon Park |
| 최원혁 | Won-hyuk Choi |
| 노영찬 | Young-chan Noh |
| 정재안 | Jae-an Jung |

## 프로젝트 개요

균일 중력장 아래 회전면 \(z = z(r)\) 위를 움직이는 질점에 대해:

- 축대칭 각운동량 \(L_z\) 보존을 이용한 **축소 라그랑지안** 유도
- **EAPEF** \(U_{\mathrm{eq}}(r)\) 및 방사 방향 운동 방정식
- 원운동 조건 및 안정성 지표 \(S(r) = 3z' + rz''\)
- 명시적 Euler 적분(\(\Delta t = 0.005\,\mathrm{s}\), \(m = g = 1\))으로 수치 검증

다음 세 곡면을 분석합니다.

| 곡면 | 형태 | 주요 결과 |
|------|------|-----------|
| **원뿔** | \(z = \alpha r\) | EAPEF 두 영점 → 방사 방향 진동, 수평면 투영의 세차 |
| **포물면** | \(z = \alpha r^2\) | 전환점·에너지 보존·\(\Delta t\) 수렴 검증 |
| **가우시안** | \(z = e^{-r^2}\) | EAPEF 단일 영점 → 바깥으로 이탈 예측과 일치 |

## 저장소 구조

```
├── index.html              # 3D 인터랙티브 시뮬레이터 (Three.js)
├── main.tex                # 보고서 LaTeX 원본
├── compile.ps1             # PDF 빌드 스크립트 (Windows / MiKTeX)
├── simulate.mjs            # 배치 시뮬레이션 엔진
├── run_final_sims.mjs      # 보고서용 최종 수치 실험 실행
├── export_pgfplots.mjs     # sim_results.json → plot_data/*.dat
├── build_standalone_tex.mjs # 단일 파일 output/main.tex 생성
├── plot_data/              # pgfplots용 그래프 데이터
└── output/                 # 빌드 결과 (main.tex, main.pdf)
```

## 빠른 시작

### 1. 웹 시뮬레이터

브라우저에서 `index.html`을 열면 됩니다. 별도 설치 없이 동작합니다 (Three.js는 CDN 로드).

- 곡면 종류·계수 \(\alpha\), 초기 반지름 \(r_0\), 각운동량 \(L_z\), 초기 방사 속도 \(v_{r0}\) 조절
- 3D 궤적, EAPEF·\(U_e\) 비교, 방위·진동 주기, 에너지 보존 오차 실시간 표시
- **원운동 설계 가이드**: 입력 \(r_0\)에서 원운동에 필요한 \(L_z\) 자동 계산

### 2. 보고서 PDF 빌드

**필요 환경:** [Node.js](https://nodejs.org/), [MiKTeX](https://miktex.org/) (Windows)

```powershell
# 수치 결과 재생성 (선택)
node run_final_sims.mjs
node export_pgfplots.mjs

# standalone .tex 생성 + PDF 컴파일
.\compile.ps1
```

결과물: `output/main.pdf`, `output/main.tex` (LMS .tex 제출용)

## 제출물 (LMS)

| 항목 | 파일 |
|------|------|
| 보고서 PDF (5–7쪽) | `output/main.pdf` |
| LaTeX 소스 | `output/main.tex` (또는 `main.tex`) |
| 설명 영상 (약 5분) | 별도 녹화·업로드 |
| GitHub 링크 | 아래 저장소 URL을 보고서에 기재 |

## 참고 문헌

- C. Timberlake & M. Mbenoun, “Motion on a surface of revolution,” *Am. J. Phys.* **94**, 16–24 (2026).

## 라이선스

DGIST 일반물리 I 과제용 학술 프로젝트입니다.
