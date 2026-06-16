# 회전면 위 입자 운동 — EAPEF 유도 및 수치 검증

**DGIST · 반도체공학과 · General Physics I · 2026**

**Repository:** https://github.com/Jajungi/movingsurface

---

회전 대칭 곡면 위에서 마찰 없이 미끄러지는 질점의 운동을 분석하는 프로젝트입니다.  
Timberlake & Mbenoun (*Am. J. Phys.* **94**, 16, 2026)이 제안한 **EAPEF**(Effective Analogous Potential Energy Function, 유효 아날로그 퍼텐셜)를 직접 유도하고, 웹 시뮬레이터와 수치 적분으로 이론 예측을 검증합니다.

## 무엇을 다루나요?

중력 아래 회전면 `z = z(r)` 위 질점은 두 자유도 `(r, φ)`로 기술됩니다. 축대칭성 덕분에 **각운동량 `Lz`가 보존**되므로, 2차원 문제를 **1차원 방사 방정식**으로 줄일 수 있습니다.

| 단계 | 내용 |
|------|------|
| 1. 라그랑지안 | 원통좌표에서 운동에너지·중력 퍼텐셜로 축소 라그랑지안 구성 |
| 2. EAPEF | `U_eq(r)` — 방사 운동을 1D 퍼텐셜 문제처럼 해석 |
| 3. 궤도 분석 | 원운동 조건, 전환점(turning point), 안정성 지표 `S(r) = 3z' + rz''` |
| 4. 수치 검증 | 명시적 Euler 적분 (`Δt = 0.005 s`, `m = g = 1`)으로 이론과 비교 |

### 분석한 세 곡면

| 곡면 | `z(r)` | 물리적 특징 |
|------|--------|-------------|
| **원뿔** | `αr` | EAPEF에 영점 2개 → 안·밖 전환점 사이 방사 진동, 수평 투영은 **세차(precession)** |
| **포물면** | `αr²` | 전환점·에너지 보존·`Δt` 수렴을 정량적으로 검증 |
| **가우시안** | `e^(-r²)` | EAPEF 영점 1개 → 바깥으로 **이탈(escape)** 예측과 시뮬레이션 일치 |

## 팀원

| | |
|---|---|
| 강지안 | Ji-an Kang |
| 박지훈 | Ji-hoon Park |
| 최원혁 | Won-hyuk Choi |
| 노영찬 | Young-chan Noh |
| 정재안 | Jae-an Jung |

## 저장소 구조

```
movingsurface/
├── simulator/
│   └── index.html          # 3D 인터랙티브 시뮬레이터 (Three.js)
├── report/
│   ├── main.tex            # 보고서 LaTeX 원본
│   ├── plot_data/          # pgfplots 그래프용 데이터 (.dat)
│   └── output/             # 빌드 결과 (main.tex, main.pdf)
├── scripts/
│   ├── simulate.mjs        # 공통 수치 적분 엔진
│   ├── run_final_sims.mjs  # 보고서용 배치 실험 → data/sim_results.json
│   ├── export_pgfplots.mjs # JSON → report/plot_data/*.dat
│   ├── build_standalone_tex.mjs  # 단일 파일 report/output/main.tex 생성
│   ├── run_report_sims.mjs # 가우시안 등 보조 실험
│   ├── find_gaussian.mjs   # 초기조건 탐색 유틸
│   └── compile.ps1         # PDF 빌드 (MiKTeX)
├── data/
│   └── sim_results.json    # 배치 시뮬레이션 원본 결과
├── compile.ps1             # 루트에서 PDF 빌드 실행
└── README.md
```

## 웹 시뮬레이터

`simulator/index.html`을 브라우저에서 열면 됩니다. 별도 설치 없이 동작합니다.

**주요 기능**

- **곡면 선택** — 원뿔, 포물면, 3차 곡면, 역수 곡면, 반구형 그릇
- **초기조건 조절** — `α`, `r₀`, `Lz`, 초기 방사 속도 `vr₀`
- **실시간 분석** — EAPEF vs 일반 유효 퍼텐셜, 방위·진동 주기, 에너지 보존 오차
- **3D 시각화** — 입자 궤적, 회전면, 궤적 선 on/off
- **원운동 가이드** — 입력 `r₀`에서 원운동에 필요한 `Lz` 자동 계산 및 원클릭 적용

시뮬레이터와 `scripts/`의 배치 스크립트는 **동일한 물리 엔진**(Euler, `dt = 0.005`)을 사용합니다.

## 보고서 PDF 빌드

**필요 환경:** [Node.js](https://nodejs.org/), [MiKTeX](https://miktex.org/) (Windows)

프로젝트 루트에서 실행:

```powershell
# 1) 수치 실험 재실행 (선택 — plot_data를 갱신할 때)
node scripts/run_final_sims.mjs
node scripts/export_pgfplots.mjs

# 2) standalone .tex 생성 + PDF 컴파일
.\compile.ps1
```

**결과물**

| 파일 | 설명 |
|------|------|
| `report/output/main.pdf` | 최종 보고서 PDF |
| `report/output/main.tex` | 그래프 데이터가 내장된 단일 LaTeX 파일 |

`report/main.tex`는 `plot_data/`를 외부 참조하는 **개발용 원본**이고, `report/output/main.tex`는 제출·공유용 **독립 빌드**입니다.

## 데이터 파이프라인

```
scripts/run_final_sims.mjs
        ↓
   data/sim_results.json
        ↓
scripts/export_pgfplots.mjs
        ↓
   report/plot_data/*.dat
        ↓
scripts/build_standalone_tex.mjs  +  scripts/compile.ps1
        ↓
   report/output/main.pdf
```

## 참고 문헌

- C. Timberlake & M. Mbenoun, “Motion on a surface of revolution,” *Am. J. Phys.* **94**, 16–24 (2026).

---

*DGIST General Physics I 학술 프로젝트*
