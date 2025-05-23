# 온라인 커피 주문 앱

## 프로젝트 구조
```
order-new/
├── ui/                 # 프론트엔드 (React)
│   ├── public/         # 정적 파일
│   ├── src/           # 소스 코드
│   │   ├── components/ # 재사용 가능한 컴포넌트
│   │   ├── pages/     # 페이지 컴포넌트
│   │   ├── styles/    # CSS 파일
│   │   └── utils/     # 유틸리티 함수
│   └── package.json   # 프론트엔드 의존성
│
├── server/            # 백엔드 (Node.js + Express)
│   ├── src/          # 소스 코드
│   │   ├── routes/   # API 라우트
│   │   ├── models/   # 데이터베이스 모델
│   │   ├── config/   # 설정 파일
│   │   └── utils/    # 유틸리티 함수
│   └── package.json  # 백엔드 의존성
│
└── docs/             # 문서
    └── PRD.md        # 제품 요구사항 문서
```

## 시작하기

### 프론트엔드 설정
```bash
cd ui
npm install
npm start
```

### 백엔드 설정
```bash
cd server
npm install
npm start
```

## 기술 스택
- 프론트엔드: React
- 백엔드: Node.js + Express
- 데이터베이스: SQLite 