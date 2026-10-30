# DOCS · 공개 지원 서류

이 저장소는 비공개 Typst 문서 저장소에서 검증한 **공개용 결과물만** 호스팅합니다. 빌드 소스와 검증 기록은 배포하지 않습니다.

## 고정 주소

- 다운로드 페이지 (GitHub Pages 설정 필요): https://tlswltjq.github.io/DOCS/
- 전체 서류 ZIP: https://tlswltjq.github.io/DOCS/application.zip
- 이력서 PDF: https://tlswltjq.github.io/DOCS/resume.pdf
- GitHub 파일 미리보기: https://github.com/tlswltjq/DOCS/blob/main/resume.pdf

## GitHub Pages 켜기

**Settings → Pages → Build and deployment → Deploy from a branch**를 선택하고 **main** / **/(root)**를 저장합니다.
이 저장소는 별도 프레임워크 없이 `index.html`을 제공합니다.

## 다운로드 페이지

- 전체 서류 ZIP 다운로드, 개별 PDF 미리보기 및 다운로드 기능을 제공합니다.
- 문서 목록과 최종 업데이트 날짜는 `manifest.json`을 읽어 자동 표시합니다.
- JavaScript를 사용할 수 없거나 목록 조회에 실패해도 기본 PDF/ZIP 링크는 작동하도록 구성했습니다.
- 문서 선택 및 브라우저 내 선택 ZIP 생성 기능은 제공하지 않습니다. 문서 배포에만 집중하는 단일 컬럼 레이아웃입니다.

## 배포 규칙

- `resume.pdf`, `files/*.pdf`, `manifest.json`, `application.zip`은 자동 배포 결과물입니다.
- 문서 종류, 순서, 제목, 설명은 비공개 저장소의 `publication.json`에서 변경합니다.
- `submission/**` 태그가 검증 및 비공개 Release에 성공하면 공개 패키지가 갱신됩니다.
- 비공개 저장소의 Documents workflow를 `main`에서 **Run workflow**로 실행해 수동 갱신할 수도 있습니다.
- 포털의 **전체 ZIP 다운로드**는 빌드 시 생성된 `application.zip`을 제공합니다.
- 공개 문서를 제외하더라도 이전 Git 커밋에 파일 내용이 남을 수 있습니다. 민감한 서류는 배포하지 마세요.

> DOCS 저장소는 Public입니다. 배포되는 PDF 및 ZIP에는 외부 공개가 가능한 내용만 넣으세요.
