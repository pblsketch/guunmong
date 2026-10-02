// tests/ 안의 점검 스크립트를 차례로 돌린다. 하나라도 실패하면 1로 끝난다(완료 조건: 이 스크립트가 0으로 끝남).
// 점검 스크립트는 check-*.mjs 이름으로 두고, 인자 없이 실행해 0/1로 끝나야 한다.
//
// ───────── 돌리는 법
//   node tests/run-all.mjs           저장소 맨 위에서(또는 tests/ 안에서 npm test). 모두 돌리는 데 10분 남짓
//   node tests/check-<이름>.mjs      하나만(어느 폴더에서 불러도 된다)
//   node tests/check-bgm.mjs --no-lufs   배경음 음량 재기(ffmpeg)를 건너뛴다
// 크롬(channel: 'chrome')과 tests/node_modules의 playwright를 쓴다. 화면 캡처는 tests/shots/(저장소에 넣지 않음)에 남는다.
//
// ───────── 명세 16절 '필요한 검증' ↔ 점검
// 1. 데이터 점검
//    - 모든 장면에 읽기 활동·마음 선택지·물건 ........................ check-content(정적 '규칙', 화면 G.checkData)
//    - 여인 장면 여덟 곳에 구슬 하나씩 ............................... check-content(정적 'pearl')
//    - 채점하는 일지 짝마다 근거 .................................... check-content(정적 'journal')
//    - 原文 표시 글 = 원작 검증 노트의 원문 .......................... check-content('orig': 영인 대조 전이라 原文 표시가 하나도 없음,
//                                                                      완주 걸음마다 原文 낙관이 화면에 없는지)
//    - 그림·소리 파일이 모두 있음 .................................... check-assets(그림 파일·정수배·§17-8 장식), check-bgm(곡 파일)
// 2. 학생처럼 끝까지 하기(선생님용 단추 없이) ......................... check-content '완주' 세 판
//    - 휴대폰 390×844 처음 읽기 · 태블릿 820×1180 다시 읽기 · 데스크톱 1280×860 처음 읽기, 0장 → 결과
//    - 일부러 틀려 도움 사다리(틀린 칸 → 여백 메모 → 정답 보기, 0·2·4장) ... 판마다(ladder), 임시 데이터로는 check-engine '도움 사다리'·check-dream
//    - 장면 중간 새로 고침 → 그 장면 처음부터 ........................... 판마다(2장 둘째 장면), check-engine '이어 하기'(3장 앞뒤 규칙)
//    - 깨어난 뒤 뒤로 가기·새로 고침·목차·주소로 0~3장에 못 돌아감 ...... 판마다(lockChecks), check-engine '깨어남 잠금'(선생님용 예외)
//    - 해석 한 번 고치기 ............................................. 휴대폰·태블릿 판, check-dream
//    - 결과 이미지 저장(진짜 PNG: 서명·IHDR·IEND·크기) .................. 판마다, check-dream
//    - 처음 읽기·다시 읽기 ........................................... 판마다 번갈아, check-engine '읽기 방식'
//    - 알림이 읽는 글 칸·진행 단추를 가리지 않음 ......................... 판마다(알림이 뜰 때마다 잼)
//    - 장마다 대표 화면 캡처(tests/shots/play_*), 도트 그림 정수배, 넘친 글 ... 판마다
// 3. 소리 점검
//    - 곡 파일 크기·음량(-20 LUFS ±2)·클리핑(봉우리 < -0.5 dBTP) ......... check-bgm(ffmpeg ebur128)
//    - 장면별 곡 바뀜 ................................................ check-engine '글 표시와 곡'
//    - 배경음·효과음 따로 켜고 끄기 .................................. check-content '음원 출처와 소리 켜고 끄기', check-engine '설정'
//    - 출처 표시(국립국악원 · 공공누리 제1유형, 퉁소 대신 단소)가 화면에 보임 ... check-content(타이틀·설정, 휴대폰·데스크톱), check-bgm(문구)
// 4. 파일로 열기(file://): 시작·저장·소리 .............................. check-engine '파일로 열기'(임시 데이터), check-content '파일로 열기(실제 데이터)'
// 5. 권리 점검 ......................................................... check-rights
//    - 올라간 파일·모든 이력·커밋 글에 출판사·유통사 이름 없음, 교과서 파일(design/source/·교과서 이름 문서) 없음,
//      .dryforge/가 어느 이력에도 없음, 교과서 본문과 15자 이상 겹치는 글 없음(추출본이 있을 때). 데이터 글은 check-content도 본다
// 6. 모든 점검은 node 스크립트로 자동 실행, 하나라도 실패하면 완료가 아님 ...... 이 파일(tests/package.json의 npm test)
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here).filter(f => /^check-.*\.mjs$/.test(f)).sort();
let failed = 0;
const rows = [];
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [f], { cwd: here, stdio: 'inherit' });
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  rows.push(`${r.status === 0 ? 'PASS' : 'FAIL'} ${f} (exit ${r.status}, ${sec}초)`);
  console.log(rows[rows.length - 1]);
  if (r.status !== 0) failed++;
}
if (files.length) console.log('\n' + rows.join('\n'));
console.log(files.length ? `${files.length - failed}/${files.length} passed` : 'no checks yet');
process.exit(failed ? 1 : 0);
