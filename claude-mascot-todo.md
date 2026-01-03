# Claude Desktop Mascot - Project TODO

## Phase 1: Foundation - COMPLETED
- [x] Tauri 프로젝트 초기화
- [x] 투명 윈도우 + always-on-top 설정
- [x] 기본 HTML/CSS로 정적 캐릭터 이미지 표시
- [x] 드래그로 캐릭터 이동 가능하게
- [x] 시스템 트레이 아이콘 추가

## Phase 2: Character Animation - COMPLETED
- [x] Rive 또는 Lottie 애니메이션 통합 (CSS animations + lottie-react installed)
- [x] 기본 상태 머신: idle, walking, talking, jumping, falling
- [x] 화면 가장자리 인식 + 걷기 로직
- [x] 클릭 이벤트 → 애니메이션 트리거
- [x] 간단한 물리 (중력, 바운스)

## Phase 3: Chat Interface - COMPLETED
- [x] 말풍선 UI 컴포넌트
- [x] 텍스트 입력창 (캐릭터 클릭 시 토글)
- [x] 채팅 히스토리 저장 (로컬)
- [x] 타이핑 애니메이션 효과

## Phase 4: Claude Agent Integration - COMPLETED
- [x] Claude CLI 연동 (Rust backend spawning claude CLI)
- [x] Tauri Commands로 IPC 설정 (invoke + events)
- [x] 기본 대화 기능 완성
- [x] 스트리밍 응답 처리 (Tauri events)
- [x] 캐릭터 표정/애니메이션 ↔ 응답 감정 연동 (emotionMapper)

## Phase 5: MCP Setup
- [ ] 로컬 MCP 서버 구현
  - [ ] 현재 시간/날짜
  - [ ] 활성 윈도우 정보
  - [ ] 시스템 알림 감지
- [ ] Claude Code MCP 연결 테스트
- [ ] Agent에 MCP tools 등록

## Phase 6: Desktop Automation
- [ ] 파일 시스템 접근 도구
- [ ] 앱 실행/전환 도구
- [ ] 클립보드 읽기/쓰기
- [ ] 스크린샷 캡처 → Claude Vision 연동
- [ ] 권한 관리 UI

## Phase 7: Personality & Polish
- [ ] 캐릭터 성격 프롬프트 설정
- [ ] 자율 행동 스케줄러 (랜덤 말걸기, 휴식 등)
- [ ] 설정 화면 (캐릭터 선택, 투명도, 크기)
- [ ] 시작 프로그램 등록 옵션

## Phase 8: Advanced Features (Optional)
- [ ] 음성 입력 (Whisper)
- [ ] TTS 출력
- [ ] 여러 캐릭터 지원
- [ ] 플러그인 시스템
- [ ] 캐릭터 에디터

---

## Tech Stack Summary
| Layer | Choice |
|-------|--------|
| Desktop Framework | Tauri v2 |
| Frontend | React + TypeScript |
| Animation | CSS Animations |
| Agent Backend | Rust (spawns Claude CLI) |
| IPC | Tauri Commands + Events |
| MCP | TypeScript MCP Server (planned) |

## Resources
- [Tauri Docs](https://tauri.app)
- [Rive](https://rive.app)
- [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-python)
- [MCP Spec](https://modelcontextprotocol.io)
