# Selenium 전표 입력 서비스

Cloudflare Worker는 Chrome을 실행하지 않습니다. 이 Node.js 서비스가 별도 PC/서버에서 Chrome을 실행하고 Worker의 요청을 받아 전표 입력칸을 채웁니다.

현재 테스트 전표 6개 입력칸의 실제 Chromium 자동 입력과 입력값 재조회 일치를 검증했습니다. 실제 관리자 화면은 아직 지정되지 않았습니다. 이 서비스가 공개 서버에 배포되거나 Worker에 연결된 상태는 아닙니다.

## 로컬 테스트 시작

Node.js 24, Chrome/Chromium, 해당 버전의 ChromeDriver가 필요합니다.

```sh
cd selenium-runner
npm ci
cp config.example.json config.local.json
```

실행 환경에 아래 값을 설정합니다. 비밀 값을 저장소에 커밋하지 마세요.

| 변수 | 설명 |
| --- | --- |
| `SELENIUM_RUNNER_TOKEN` | Worker와 실행 서비스만 공유하는 서버 통신용 비밀 값. 웹 사용자 입력 키가 아닙니다. |
| `SELENIUM_CONFIG` | 설정 파일 경로. 예: `./config.local.json` |
| `CHROME_BINARY` | 필요할 때 Chrome/Chromium 실행 파일 경로 |
| `CHROMEDRIVER_PATH` | ChromeDriver 실행 파일 경로. 미지정 시 Selenium Manager 사용 |
| `HEADLESS` | `false`이면 브라우저를 띄우고 입력 후 창을 유지합니다. 기본값은 headless 테스트 모드이며 완료 후 브라우저가 닫힙니다. 실제 저장을 하지 않으므로 headless 입력값은 영구 저장되지 않습니다. |
| `CHROME_PROFILE_DIR` | 선택: 로그인 세션을 유지할 전용 Chrome 프로필의 절대 경로. 기본 Chrome 프로필을 동시에 사용하지 마세요. |
| `HOST` / `PORT` | 기본 `127.0.0.1:8090`. 서버 배포 시 네트워크 구성에 맞게 지정합니다. |

```sh
npm start
```

`config.example.json`은 공개 테스트 전표 `/selenium-demo`를 가리킵니다. 실사용 전에 `config.local.json`의 `targetUrl`, `readySelector`, `fields` CSS 셀렉터를 실제 관리자 화면에 맞춥니다. 사용자 요청의 URL/셀렉터로 브라우저를 실행하지 않으며 서버에 고정된 설정만 사용합니다.

로그인이 필요한 실제 관리자 화면에서는 별도의 로그인 연동이 필요합니다. 로컬 브라우저 방식이라면 `HEADLESS=false`와 전용 프로필로 로그인할 수 있습니다. 로그인 화면에서 입력칸이 아직 보이지 않으면 설정한 대기 시간이 지나 실패합니다. iframe, 커스텀 드롭다운, 동적 행 등은 실제 화면을 확인한 후 어댑터를 추가해야 합니다. 현재는 일반 텍스트 입력칸만 지원합니다.

## Worker 연결

실행 서비스를 HTTPS로 접근 가능한 서버에 올린 다음 **Worker**에 아래를 등록합니다.

- 일반 변수 `SELENIUM_RUNNER_URL`: 실행 서비스의 HTTPS 원점 주소 (예: `https://your-runner.example.com`)
- Secret `SELENIUM_RUNNER_TOKEN`: 실행 서비스 환경과 동일한 값

배포한 Worker에서 **Selenium 연결 확인** → **OCR에서 전표값 추출** 또는 직접 값 입력 → **전표 화면에 자동 입력**을 사용합니다. 전표값 추출은 새 Vertex AI 요청이며 누락된 값은 빈칸으로 남깁니다. 사용자 확인 후 전달할 수 있게 모든 항목을 수정할 수 있습니다.

- `GET /health`: 인증된 연결 확인
- `POST /fill`: 인증된 `{ "fields": { "vendor": "거래처", "totalAmount": "110000" } }` 입력
- 인증 헤더: `Authorization: Bearer <SELENIUM_RUNNER_TOKEN>`

호출 확인 키를 사용자에게 요구하지 않습니다. 서버 통신용 토큰은 브라우저에 전달하지 않습니다. 기존 공개 Worker의 자동 입력 API도 로그인 없이 접근 가능하므로 실제 관리자 시스템에 연결하기 전 접근 범위는 운영 목적에 맞게 구성하세요.

최종 저장·제출 버튼을 클릭하는 코드는 없습니다. 브라우저 표시 모드에서 입력값을 검토할 수 있고, 다음 입력 작업은 직전 자동화 브라우저를 닫고 새 작업을 시작합니다. 중복 실행 시 409를 반환합니다. 자동 입력 자체로 서버에 저장하는 관리자 화면은 별도로 확인해야 합니다.

## 검증

```sh
npm test
```

실제 브라우저 검증에는 별도로 설치된 Chrome과 호환 ChromeDriver가 필요합니다. 프로젝트 루트 `npm test`는 Worker 연결·데이터 검증·OCR 분석 테스트를 포함합니다. `CHROME_NO_SANDBOX=true`는 격리된 테스트 환경에서 Chrome sandbox를 지원하지 않을 때만 사용합니다.
