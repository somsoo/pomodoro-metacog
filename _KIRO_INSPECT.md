# 사이트 정보: 메타인지 포모도로 & 딥워크 로그 (pomodoro-metacog)

- 주소: https://pomodoro-metacog.enjoy-onepage.com/
- 로컬 경로: `Webapp_Staging\pomodoro-metacog` (배포 완료 시 GitHub Pages main)
- 저장소: somsoo/pomodoro-metacog
- 배포 브랜치: main
- 상태: live (2026-10-02 배포 및 검증 완료)
- 허브 카드: 등록 대기
- 설명: 세션 완료 후 3초 메타인지 성찰(집중도 1~5점, 방해요인 태그, 1줄 메모)을 기록하고, 누적 몰입 시간과 방해요인 통계를 시각화하는 무오차 Web Audio 포모도로 타이머.

## 기술 스택
- 무오차 타이머: Timestamp Delta 기반 무결성 인터벌
- 사운드: Web Audio API 기반 순수 코드 합성 차임 (Solfeggio 528Hz) & 핑크 노이즈
- 시각화: SVG 다이얼 게이지 & CSS 프로그레스 바
- 데이터 저장: LocalStorage 기반 무서버 프라이버시 보호 구조
- 모바일 대응: 320px~1200px 0px 오버플로우, 버튼/제목 1줄 엄격 준수, AdSense 90px 클램프
