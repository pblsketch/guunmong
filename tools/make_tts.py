"""대사 음성 만들기(Fish Audio). 이 기기에서 대사마다 MP3를 한 번 만들어 assets/voice/에 둔다.

게임은 실행 중에 바깥 API를 부르지 않고 이 파일만 재생한다(학생 기록·키가 기기 밖으로 나가지 않게).
- 키: 환경 변수 FISH_API_KEY 또는 ~/.config/fish-audio/key. 키를 저장소에 넣지 않는다.
- 목소리: tools/tts_voices.json의 역할 → Fish Audio 모델 id. speakers가 화자(say)를 역할에 잇고, 화자 없는 서술은 narrator.
- 파일 이름: 화면에 보이는 대사 글의 FNV-1a 32비트 해시. 글이 바뀌면 새 파일을 만들고 옛 파일은 지운다.
- 목록: js/data/voice.js (window.GUUN_VOICE = {해시: 파일}). 저장소에는 빈 목록만 둔다(사용권 확인 전).

사용: python tools/make_tts.py [장 번호…]   예) python tools/make_tts.py 1
"""
import io, json, os, subprocess, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'voice')


def key():
    k = os.environ.get('FISH_API_KEY')
    if not k:
        p = os.path.expanduser('~/.config/fish-audio/key')
        if os.path.exists(p):
            k = io.open(p, encoding='utf-8').read().strip()
    if not k:
        sys.exit('FISH_API_KEY 또는 ~/.config/fish-audio/key가 없습니다.')
    return k


def fnv(s):
    h = 0x811c9dc5
    for ch in s:  # JS와 같게 UTF-16 코드 단위로 센다
        for unit in ([ord(ch)] if ord(ch) < 0x10000 else [0xD800 + ((ord(ch) - 0x10000) >> 10), 0xDC00 + ((ord(ch) - 0x10000) & 0x3FF)]):
            h ^= unit
            h = (h * 0x01000193) & 0xFFFFFFFF
    return '%08x' % h


def lines(chapters):
    # 데이터 파일은 브라우저용 스크립트라 node로 읽어 JSON으로 받는다. 화면과 같은 글(G.text.plain)을 쓴다.
    js = r"""
    global.window = {}; const fs = require('fs');
    for (const f of ['scenes','people','challenges','interp']) eval(fs.readFileSync('js/data/' + f + '.js', 'utf8'));
    global.G = { util: new Proxy({}, { get: () => () => null }), data: { people: window.GUUN.people } };
    eval(fs.readFileSync('js/core/text.js', 'utf8'));
    const want = new Set(process.argv[1].split(',').filter(Boolean));
    const out = [], seen = new Set();
    const add = (scene, l, fallbackSay = null) => {
      const b = typeof l === 'string' ? { text: l } : l || {};
      if (b.mark || !(b.text || b.gloss)) return;
      const shown = b.text || b.gloss;
      if (seen.has(shown)) return; seen.add(shown);
      out.push({ scene, say: b.say || fallbackSay, shown, speak: G.text.plain ? G.text.plain(shown) : shown });
    };
    const scenes = window.GUUN.scenes, chOf = Object.fromEntries(scenes.map(s => [s.id, String(s.ch)]));
    for (const s of scenes) {
      if (want.size && !want.has(String(s.ch))) continue;
      for (const l of [].concat(s.narration || [], s.lines || [])) add(s.id, l);
      for (const t of s.timeline || []) for (const l of [].concat(t.lines || [])) add(s.id, l);
      if (s.monologue) for (const part of s.monologue.split('\n').filter(Boolean)) add(s.id, { say: 'seongjin', text: part });
    }
    // 생각 선택의 반응(대사창에 보이는 줄)
    for (const c of window.GUUN.challenges || []) {
      if (c.kind !== 'talk' || (want.size && !want.has(chOf[c.scene]))) continue;
      for (const o of c.options || []) add(c.scene, o.reply);
    }
    // 5장 스승 앞 대화·마지막 말·결말(학생 기록으로 만드는 되짚기 줄은 미리 만들 수 없어 뺀다)
    if (!want.size || want.has('5')) {
      const I = window.GUUN.interp || {};
      for (const l of [].concat(I.dialogue || [], I.lastWords || [], I.ending || [])) add('c5-dialogue', l);
    }
    process.stdout.write(JSON.stringify(out));
    """
    r = subprocess.run(['node', '-e', js, ','.join(chapters)], cwd=ROOT, capture_output=True)
    if r.returncode:
        sys.exit(r.stderr.decode('utf-8', 'replace'))
    return json.loads(r.stdout.decode('utf-8'))


SPEAKERS = {}


def role(say):
    if not say:
        return 'narrator'
    if say.startswith('fairy_'):
        return 'fairy'
    return SPEAKERS.get(say, say)


def tts(k, model_id, text):
    body = {'text': text, 'reference_id': model_id, 'format': 'mp3', 'mp3_bitrate': 64, 'normalize': True}
    req = urllib.request.Request('https://api.fish.audio/v1/tts', data=json.dumps(body, ensure_ascii=False).encode('utf-8'),
                                 headers={'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json; charset=utf-8', 'model': 's2.1-pro'})
    for attempt in range(4):
        try:
            return urllib.request.urlopen(req, timeout=180).read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and attempt < 3:
                time.sleep(5 * (attempt + 1)); continue
            raise SystemExit('TTS 실패 %s: %s' % (e.code, e.read()[:200]))


def main():
    chapters = sys.argv[1:]
    voices = json.load(io.open(os.path.join(ROOT, 'tools', 'tts_voices.json'), encoding='utf-8'))
    SPEAKERS.update(voices.pop('speakers', {}))
    k = key()
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(ROOT, 'js', 'data', 'voice.js')
    manifest = {}
    if os.path.exists(manifest_path):
        raw = io.open(manifest_path, encoding='utf-8').read()
        manifest = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])
    made = kept = 0
    current = lines(chapters)
    if not chapters:  # 게임 전체를 돌 때만 지금 글에 없는 옛 대사를 목록과 폴더에서 지운다
        live = {fnv(ln['shown']) for ln in current}
        for h in [h for h in manifest if h not in live]:
            p = os.path.join(OUT, h + '.mp3')
            if os.path.exists(p):
                os.remove(p)
            del manifest[h]
            print('지움', h)
    for ln in current:
        r = role(ln['say'])
        v = voices.get(r)
        if not v:
            print('목소리 없음, 서술 목소리로:', ln['say'], ln['speak'][:20]); v = voices['narrator']
        hsh = fnv(ln['shown'])
        name = hsh + '.mp3'
        path = os.path.join(OUT, name)
        if not os.path.exists(path):
            data = tts(k, v['id'], ln['speak'])
            io.open(path, 'wb').write(data)
            made += 1
            print('만듦', ln['scene'], r, ln['speak'][:30])
        else:
            kept += 1
        manifest[hsh] = 'assets/voice/' + name
    head = "'use strict';\n// 대사 목소리 목록(해시 -> 파일). tools/make_tts.py가 채운다. 비어 있으면 목소리를 쓰지 않는다.\n"
    io.open(manifest_path, 'w', encoding='utf-8', newline='\n').write(head + 'window.GUUN_VOICE = ' + json.dumps(manifest, ensure_ascii=False, indent=0) + ';\n')
    print('새로 만든 줄 %d, 있던 줄 %d, 목록 %d' % (made, kept, len(manifest)))


if __name__ == '__main__':
    main()
