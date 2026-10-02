# -*- coding: utf-8 -*-
"""구운몽 도트 그림의 Codex 프롬프트(tools/prompts/<name>.txt)와 manifest를 만든다.

    python tools/make_prompts.py            # 프롬프트 + manifest_ref.tsv + manifest_phase1.tsv
    python tools/make_prompts.py refpacks   # design/ref/*.png를 이어 붙인 참조 묶음(assets/raw/refpack_*.png)

- 화풍 기준: design/style-samples/style_c_pixel.jpg(16비트 도트, 오방색 + 옅은 안개).
- 프롬프트는 영어(ASCII)만 쓴다(gen.ps1이 명령문에 그대로 넣는다).
- gen.ps1은 참조 그림을 한 장만 받으므로, 여러 인물이 나오는 장면은 설정 그림 여러 장을
  세로로 이어 붙인 '참조 묶음'을 넘긴다(RefMode scene).
- 생성 순서: ref_seongjin_yang(화풍 시안 C 참조) → 나머지 설정 그림 6장(주인공 설정 그림을 화풍 참조로)
  → 장면·초상·말·집·판(설정 그림을 참조로).
- 원본은 assets/raw/<name>.png(저장소에 올리지 않음). 가공은 tools/process_assets.py, tools/process_sprites.py.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDIR = os.path.join(ROOT, "tools", "prompts")
RAW = os.path.join(ROOT, "assets", "raw")
REFDIR = os.path.join(ROOT, "design", "ref")

STYLE = (
    "High quality pixel art in the style of the reference: 16-bit era game art, crisp hard-edged square pixels, "
    "no anti-aliasing, no blur, limited palette of about 32 colors inspired by Korean traditional colors "
    "(obangsaek: deep blue, red, yellow, white, black) with soft pastel tones, gentle dark outlines, "
    "cute but dignified proportions."
)
TANG = (
    "Setting: Tang dynasty China (7th to 9th century). All clothing is TANG DYNASTY Chinese clothing: men wear "
    "round-collar robes (yuanlingpao) with belts and black Tang futou caps, or wide-sleeved scholar robes; women "
    "wear high-waisted long skirts tied above the chest (ruqun), short jackets, long silk shawls (pibo) and high "
    "buns with hairpins. Not Korean hanbok, not Ming or Qing clothing, not Japanese kimono."
)
NOTEXT = (
    "Absolutely no text: no letters, no Chinese characters, no numbers, no labels, no captions, no name tags, "
    "no signature, no watermark, no UI, no color swatches."
)
REFSHEET = (
    "Character design reference sheet for a pixel art adventure game. " + STYLE + " Plain pure white background, "
    "no floor, no scenery, no boxes or frames around the figures. The figures stand side by side in ONE row, "
    "evenly spaced with clear white gaps, all drawn at the same scale, full body from head to feet, three-quarter "
    "front view, feet on the same baseline."
)
SCENE = (
    "Pixel art game scene in the exact pixel art style of the reference: 16-bit era game art, crisp CHUNKY square "
    "pixels as if the picture were drawn at 480x270 resolution and scaled up (every pixel is a clearly visible "
    "block), no anti-aliasing, no blur, limited palette of about 32 colors inspired by Korean traditional colors "
    "with soft pastel mist. Wide side-view stage like a classic Korean-themed adventure game. Keep every "
    "important figure and object inside the middle 80 percent of the image height, because the top and bottom "
    "edges will be cropped to 16:9. Large simple readable shapes; faces readable at small size."
)
KEY = (
    "Solid flat pure magenta background (#FF00FF) everywhere behind the figures: no gradient, no floor, no cast "
    "shadows, no vignette."
)

P, MANIFEST = {}, {"ref": [], "phase1": [], "phase2": []}


def add(name, text, size, ref="", mode="", group="phase1"):
    P[name] = text
    MANIFEST[group].append((name, size, ref, mode))


# ── 17-1 인물 설정 그림 (design/ref) ──
STYLE_REF = "assets/raw/style_c_ref.png"  # 화풍 시안 C(jpg)를 png로 옮긴 것(refpacks 단계에서 만든다)
HERO_REF = "design/ref/ref_seongjin_yang.png"

add("ref_seongjin_yang", REFSHEET + "\n\nFive full-body figures, left to right. All five are the SAME young man of "
    "about 18 with the SAME face and the same gentle almond-shaped eyes and calm eyebrows (the monk and the scholar "
    "share the same eyes): (1) Seongjin, a young Buddhist monk with a completely shaved head, plain grey monk robe "
    "with wide sleeves and a dark grey sash, a long string of dark brown prayer beads in his hands; (2) Yang Soyu as "
    "a young scholar: black hair in a topknot wrapped in a black soft cloth head wrap with two soft tails hanging at "
    "the back, light blue wide-sleeved scholar robe with a white inner collar, a folded fan in his hand; (3) Yang "
    "Soyu as a court official: red round-collar Tang official robe with a black leather belt, black Tang futou cap; "
    "(4) Yang Soyu as the grand marshal: Tang dynasty general armor with two round polished chest plates "
    "(mingguang armor), lamellar skirt, iron helmet with a red tassel, red cape, a sword in its scabbard at the "
    "hip; (5) Yang Soyu as the chancellor, a few years older with a short neat moustache: purple round-collar Tang "
    "official robe with a white jade-plaque belt, black futou cap, an ivory court tablet in his hands.\n\n"
    + TANG + " " + NOTEXT, "1536x1024", STYLE_REF, "style", "ref")

add("ref_masters", REFSHEET + "\n\nFour full-body figures, left to right: (1) Master Yukgwan, a very old Buddhist "
    "grand master with a long white beard and white eyebrows, kind and wise face, ochre monk robe under a red kasaya "
    "with a gold patchwork pattern draped over one shoulder, a plain wooden staff; (2) the foreign monk from the "
    "Western Regions: a tall old monk with EXTREMELY long white eyebrows hanging down past his cheeks, pale blue "
    "eyes, a big nose, shaved head, patched brown monk robe, a tall metal monk's ringed staff (khakkhara) with rings "
    "at the top; (3) the Taoist hermit of Mount Namjeon: an old man with a long grey beard, hair in a Taoist topknot "
    "with a small black crown, white crane-feather Taoist robe with wide black-bordered sleeves, a horsetail whisk; "
    "(4) King Yama, the ruler of the underworld: stern middle-aged king with a thick black beard and fierce "
    "eyebrows, black official robe with dark red trim, flat-topped crown with strings of beads hanging at front "
    "and back, a jade tablet in his hands.\n\n" + TANG + " " + NOTEXT, "1536x1024", HERO_REF, "style", "ref")

WOMEN = ("Each young woman wears a high-waisted long skirt tied above the chest, a short jacket and a long "
         "translucent silk shawl in a lighter tint of her own color; each has a distinct face and hairstyle.")
add("ref_women_1", REFSHEET + "\n\nFour full-body young Tang dynasty women about 16 to 18, left to right: "
    "(1) Jin Chaebong in fresh light yellow-green (willow green): high double-loop bun with a jade hairpin, a folded "
    "poem paper in her hand, gentle bright eyes; (2) Gye Seomwol, a famous poet-entertainer, in vivid scarlet red with "
    "gold embroidery: elegant high bun with gold flower hairpins and a red flower, confident smile; (3) Jeong "
    "Gyeongpae, a refined noble daughter, in ivory and pale cream with subtle silver patterns: neat high bun with a "
    "white jade pin and small pearls, calm intelligent eyes, poised posture; (4) Ga Chunun, a lively young maid, in "
    "peach-blossom pink with a simpler outfit: two small buns tied with pink ribbons, mischievous grin. " + WOMEN
    + "\n\n" + TANG + " " + NOTEXT, "1536x1024", HERO_REF, "style", "ref")

add("ref_women_2", REFSHEET + "\n\nFive full-body figures, left to right: (1) Jeok Gyeonghong, a young woman in "
    "violet purple: high bun with a purple flower, lively eyes; (2) the SAME Jeok Gyeonghong disguised as a handsome "
    "young man: violet round-collar man's riding robe, black futou cap, black boots, a riding whip, same face; "
    "(3) Princess Nanyang in golden yellow with gold phoenix embroidery: tall ornate gold phoenix crown and "
    "hairpins, a white jade vertical flute in her hands, noble gentle face; (4) Sim Yoyeon, a swordswoman, in dark "
    "navy blue: close-fitting short battle robe over trousers, sleeves tied, boots, hair in a high ponytail, a "
    "short dagger in her hand, sharp eyes; (5) Baek Neungpa, the daughter of the Dragon King, in flowing teal and "
    "aqua with wave patterns: translucent water-like shawl, small pearl ornaments, long hair partly loose. " + WOMEN
    + "\n\n" + TANG + " " + NOTEXT, "1536x1024", HERO_REF, "style", "ref")

add("ref_fairies", REFSHEET + "\n\nEight full-body fairy maidens of Lady Wei of Mount Namak, left to right, drawn "
    "like the eight fairies on the stone bridge in the reference image (same faces, same celestial Tang dresses, "
    "same floating silk sashes, same hair buns with small gold ornaments), each with her own color on the dress, "
    "collar and floating sash: (1) willow yellow-green, (2) scarlet red, (3) ivory white, (4) peach-blossom pink, "
    "(5) violet purple, (6) golden yellow, (7) dark navy blue, (8) teal aqua. Gentle smiles, hands folded or holding "
    "a flower, a fan, a flute or a small basket.\n\n" + TANG + " " + NOTEXT, "1536x1024", STYLE_REF, "same", "ref")

add("ref_others", REFSHEET + "\n\nSeven full-body figures, left to right: (1) Josin as a young monk: shaved head, "
    "simple brown-grey monk robe, earnest yearning face; (2) the SAME Josin grown old in a long hard life: white "
    "hair in a loose topknot, gaunt face, ragged patched hemp robe, a walking stick; (3) Josin's wife grown old in "
    "poverty: once beautiful, worn patched hemp dress, hair in a low bun with a cloth head wrap, tired kind eyes; "
    "(4) Jeong Simsam, a cheerful rich young nobleman about 20: green round-collar robe, black futou cap, a wine cup "
    "in his hand, playful grin; (5) Minister Jeong, a dignified old high minister with a grey beard: dark navy "
    "round-collar robe with a gold belt, black futou cap; (6) Du Yeonsa, a middle-aged female Taoist priestess: "
    "small golden lotus Taoist crown, light grey-brown Taoist robe with black trim, a horsetail whisk, clever "
    "smile; (7) the yellow-turbaned divine strongman: a huge muscular guardian warrior with a yellow turban, fierce "
    "face, bare muscular arms, golden armor skirt, a big iron club.\n\n" + TANG + " " + NOTEXT,
    "1536x1024", HERO_REF, "style", "ref")

add("ref_piece", REFSHEET.replace("full body from head to feet, three-quarter front view",
                                  "full body from head to feet")
    + "\n\nSuper-deformed (chibi) board game piece designs of the young scholar Yang Soyu from the reference, about "
    "2 heads tall (the head is as large as the body), tiny body, the same face and eyes. Four costumes; each costume "
    "is shown twice side by side (front view, then side view walking to the right), 8 figures in one row: "
    "(1) light blue scholar robe with a black soft head wrap; (2) red round-collar official robe and black futou "
    "cap; (3) Tang general armor with round chest plates, red cape, helmet with a red tassel; (4) purple chancellor "
    "robe with a white jade belt and black futou cap. Simple bold shapes that still read at 32x32 pixels.\n\n"
    + TANG + " " + NOTEXT, "1536x1024", HERO_REF, "char", "ref")

# ── 17-2 장면(표본 3장) — 480x270으로 줄일 것이라 큰 덩어리로 ──
FAIRY_COLORS = "willow green, scarlet, ivory white, peach pink, violet, golden yellow, navy blue, teal"
add("sc_bridge", SCENE + "\n\nScene: a mountain stream among the clouds of Lotus Peak. On an arched old stone bridge "
    "over a rushing stream stand the eight fairy maidens of the reference in a line across the bridge (dress and sash "
    "colors from left to right: " + FAIRY_COLORS + "), long silk sashes floating in the wind. At the left end of "
    "the bridge the young monk Seongjin from the reference (shaved head, grey robe, prayer beads) bows politely "
    "holding a branch of pink peach blossoms. A waterfall behind, pine trees, swirling clouds, misty peaks, lotus "
    "flowers in the pool below. The figures are about one quarter of the image height.\n\n" + TANG + " " + NOTEXT,
    "1536x1024", "assets/raw/refpack_bridge.png", "scene")

add("sc_geomungo", SCENE + "\n\nScene (a gentle COMEDY scene): the open wooden main hall of Minister Jeong's mansion "
    "in Tang dynasty Luoyang, a calm afternoon. Left of center, the young scholar Yang Soyu from the reference "
    "(the same face, but made a little too pretty) is DISGUISED as a female Taoist priestess: female Taoist head "
    "scarf with a small Taoist crown, pale grey-blue priestess robe; he sits on a mat playing a long seven-string "
    "zither (guqin) on a low table, eyes darting sideways, a tiny nervous sweat drop on his face. On the right, "
    "behind a half-lowered fine bamboo blind, the noble daughter Jeong Gyeongpae in ivory (from the reference) sits "
    "gracefully and listens, seen softly through the blind, her cheeks pink. Behind the zither player an older "
    "female Taoist priestess (Du Yeonsa from the reference) hides a grin behind her sleeve. In the upper right "
    "background, across a small courtyard, one paper window of the inner quarters glows warmly with a lamp. Red "
    "lacquered pillars, a potted plum tree, a thin line of incense smoke. The figures are about one third of the "
    "image height.\n\n" + TANG + " " + NOTEXT, "1536x1024", "assets/raw/refpack_geomungo.png", "scene")

add("sc_c3_feast", SCENE + "\n\nScene: an autumn evening on a high stone terrace of a hilltop palace. The old "
    "chancellor Yang Soyu (about 60, grey beard, the same eyes as in the reference, purple chancellor robe and black "
    "futou cap) sits at the railing with a white jade vertical flute lowered in his hand, gazing into the distance "
    "with a sad face. Around him sit his eight wives from the reference, now mature elegant ladies in their colors "
    "(" + FAIRY_COLORS + "), at low tables with wine cups. Pots of yellow and white chrysanthemums along the "
    "terrace. Far below in the wide autumn plain: the crumbling foundation stones of a ruined ancient palace, grassy "
    "royal burial mounds, and distant palace roofs in the mist; red maple trees, geese flying across an orange "
    "sunset sky. The figures are about one quarter of the image height.\n\n" + TANG + " " + NOTEXT,
    "1536x1024", "assets/raw/refpack_feast.png", "scene")

# ── 17-3 초상(표본) — 한 인물의 표정을 한 장에 그려 얼굴을 맞춘다 ──
BUST = (
    "Pixel art character portrait sheet for a story game, in the same pixel art style and character design as the "
    "reference: crisp chunky square pixels as if each portrait were drawn at about 96x96 pixels and scaled up, no "
    "anti-aliasing, dark outlines, limited palette. Bust portraits (head and shoulders, cut off flat at the chest), "
    "facing the viewer in three-quarter view, all drawn at exactly the same size with the head at the same height. "
    + KEY + " Wide empty magenta gaps between the portraits so they never touch."
)
add("pt_yang_sheet", BUST + "\n\nFour bust portraits of the SAME young man Yang Soyu from the reference (same face, "
    "same eyes), in a 2x2 grid. Top-left: calm neutral expression, red round-collar official robe and black Tang "
    "futou cap. Top-right: same outfit, warm happy smile with curved eyes. Bottom-left: same outfit, shocked: wide "
    "eyes, raised eyebrows, small open mouth, a sweat drop. Bottom-right: comically disguised as a female Taoist "
    "priestess: the same face made a little too pretty with a light blush, female Taoist head scarf with a small "
    "Taoist crown, pale grey-blue priestess robe, an awkward embarrassed smile.\n\n" + TANG + " " + NOTEXT,
    "1024x1024", HERO_REF, "same")

add("pt_gyeongpae_sheet", BUST + "\n\nThree bust portraits in one row of the SAME young woman Jeong Gyeongpae, the "
    "noble daughter dressed in ivory and pale cream (the third woman from the left in the reference: neat high bun "
    "with a white jade pin and small pearls, calm intelligent eyes). Left: calm graceful neutral expression. Middle: "
    "blushing: red cheeks, eyes lowered shyly, a sleeve raised near her mouth. Right: sly: a knowing mischievous "
    "half-smile, one eyebrow slightly raised, eyes narrowed.\n\n" + TANG + " " + NOTEXT,
    "1536x1024", "design/ref/ref_women_1.png", "same")

# ── 17-4 말판의 말(서생) ──
add("horse_walk", "Pixel art sprite sheet for a board game piece, in the style of 16-bit era game sprites, crisp "
    "hard-edged pixels, no anti-aliasing, limited palette, dark 1-pixel outlines. VERY LOW RESOLUTION: every frame is "
    "a tiny sprite only about 28 pixels tall and 20 pixels wide, enlarged so that each sprite pixel is one big "
    "visible square block, all blocks the same size; very few pixels, like a handheld console board game piece; "
    "the face is just two dark pixel eyes and a skin-colored block. The character is the "
    "super-deformed (chibi, 2 heads tall) young scholar Yang Soyu from the reference in his LIGHT BLUE scholar robe "
    "with a black soft head wrap, the same face. " + KEY + " Frames are laid out in a strict invisible grid with "
    "wide empty magenta gaps so no frame touches another; sleeves and robe tails stay inside their own cell. Every "
    "frame is drawn at exactly the same scale, and within each row the feet rest on the same baseline.\n\nLayout: "
    "exactly 4 rows. Row 1: 2 frames standing idle facing the viewer, breathing (second frame slightly lower "
    "shoulders). Row 2: 4 frames walking to the RIGHT (side view), a smooth walk cycle. Row 3: 6 frames running to "
    "the RIGHT (side view, leaning forward, robe flapping), a smooth run cycle. Row 4: 4 frames walking UP away "
    "from the viewer (back view), a walk cycle.\n\n" + TANG + " No text, no numbers, no grid lines, no labels, no "
    "motion trails, no shadows.", "1536x1024", "design/ref/ref_piece.png", "char")

# ── 17-6 집(객사·초가) ──
add("house_inn", SCENE.replace("Wide side-view stage like a classic Korean-themed adventure game. ", "")
    .replace("cropped to 16:9", "cropped to 16:10")
    + "\n\nA side-view cross-section of a modest Tang dynasty country inn room with a thatched roof, seen straight "
    "from the front like a dollhouse with the front wall removed, daytime, warm light. No people. The room fills the "
    "LEFT three quarters of the picture: a thatched roof edge along the top; a plain earthen-plaster back wall with "
    "dark wooden posts, the wall band between about 28 and 45 percent of the image height is left plain and EMPTY "
    "(things will be hung there later), one small paper window high on the wall; a wooden plank floor whose open "
    "area between about 62 and 82 percent of the image height is left EMPTY (things will be placed there later); "
    "only a simple low sleeping platform at the far left edge. The RIGHT quarter of the picture is a small dirt yard "
    "outside the room: a low brushwood fence, a willow tree, an empty patch of ground at the bottom right.\n\n"
    + NOTEXT, "1536x1024", "", "")

# ── 17-5 말판 판 ──
add("board", "Pixel art game board background in the style of 16-bit era game art, crisp chunky square pixels as if "
    "drawn at 320x480 resolution and scaled up, no anti-aliasing, limited palette of about 32 colors, in the style "
    "of the reference. Seen straight from above, filling the whole portrait image: an empty sheet of aged yellowish "
    "mulberry paper for a traditional Korean promotion board game (seunggyeongdo). A THIN border of auspicious "
    "cloud patterns runs all around the edge (about 6 percent of the width on each side). A thin dancheong frieze "
    "runs along the very top edge (about 7 percent of the image height). Inside, the paper is divided into four "
    "equal horizontal zones by three thin horizontal decorative bands (at about 26, 50 and 74 percent of the "
    "height). The bands grow richer toward the top: the lowest band is a plain thin ink line, the middle band has "
    "a little red and green, the upper band is a colorful red, green, blue and gold dancheong pattern. Everything "
    "else is plain empty paper with faint fibers: NO paths, NO dots, NO squares, NO circles, NO game spaces, no "
    "pieces, no people.\n\n" + NOTEXT, "1024x1536", STYLE_REF, "style")

# ════════════════════════════ 2단계: §17 나머지 전부 ════════════════════════════
KEY_GREEN = KEY.replace("pure magenta background (#FF00FF)", "pure green background (#00FF00)")
R = {k: f"design/ref/{k}.png" for k in ("ref_seongjin_yang", "ref_masters", "ref_women_1", "ref_women_2",
                                         "ref_fairies", "ref_others", "ref_piece")}
PACKS2 = {}

# 여덟 여인의 얼굴: 머리·색 말고도 얼굴형·눈·나이·표정이 서로 다르게(2단계 요청)
FACE = {
    "chae": "Jin Chaebong, about 16: a ROUND soft face, big round innocent eyes, small mouth, gentle and a little shy",
    "seomwol": "Gye Seomwol, about 20: a long OVAL face, long narrow almond eyes with red eye makeup at the outer "
               "corners, a small beauty mark under one eye, a worldly confident half-smile",
    "gyeongpae": "Jeong Gyeongpae, about 16: a slender refined oval face, calm level gaze, thin elegant eyebrows, "
                 "reserved composed mouth",
    "chunun": "Ga Chunun, about 15: a small HEART-shaped face, upturned playful eyes, rosy round cheeks, an impish grin",
    "gyeonghong": "Jeok Gyeonghong, about 19: a slightly ANGULAR face with a firm jaw, thick straight eyebrows, bold "
                  "sharp eyes, sun-warmed skin, a daring look",
    "nanyang": "Princess Nanyang, about 16: a full ROUND Tang-beauty face with plump cheeks, a small red flower mark "
               "on the forehead, gentle downcast noble eyes, serene",
    "yoyeon": "Sim Yoyeon, about 17: a lean NARROW face, sharp upward-slanted eyes, straight thin mouth, a cool "
              "unreadable expression",
    "neungpa": "Baek Neungpa, about 17: a pale LONG face with a faint cool blue tint to the skin, large drooping "
               "sorrowful eyes, a quiet otherworldly look",
}


def scene(name, refs, desc, extra="", mode="scene"):
    """refs: 설정 그림 이름들. 'ref_x#2+4'는 그 설정 그림의 2·4번째 인물만 잘라 쓴다(다른 인물이 장면에 끼어드는 것을
    막는다). 둘 이상이거나 잘라 쓰면 refpack_<장면>으로 이어 붙인다."""
    if len(refs) > 1 or "#" in refs[0]:
        PACKS2["refpack_" + name[3:]] = refs
        ref = f"assets/raw/refpack_{name[3:]}.png"
    else:
        ref = R.get(refs[0], refs[0])
    add(name, SCENE + "\n\nScene: " + desc + (" " + extra if extra else "") + "\n\n" + TANG + " " + NOTEXT,
        "1536x1024", ref, mode, "phase2")


HIDE = "Hidden detail (small but clearly drawn, it must be there): "
scene("sc_josin_dream", ["ref_others"], "a snowy mountain pass in deep winter, a bitter wind. The aged Josin from the "
      "reference (white hair, ragged patched hemp robe) and his worn-out wife (from the reference) trudge through the "
      "snow with three thin children in rags, one carried on the back. A tiny ruined thatched hut on the slope. Grey "
      "sky, bare trees. Sad and quiet. The figures are about one quarter of the image height.")
scene("sc_josin_wake", ["ref_others"], "dawn inside a small old Buddhist hall: a gentle gilded statue of the bodhisattva "
      "Guanyin on an altar with a flickering oil lamp and incense. Kneeling before it, the monk Josin from the "
      "reference (shaved head, brown-grey robe), but his eyebrows and stubble have turned completely WHITE overnight; "
      "he looks at his own hands in shock. Pale blue dawn light through the door.")
scene("sc_cell", ["ref_seongjin_yang"], "night in a small narrow meditation cell of a mountain temple. Moonlight falls "
      "through a lattice window onto the wooden floor. The young monk Seongjin from the reference (shaved head, grey "
      "robe) sits on a round straw meditation cushion, gripping his prayer beads, eyes open and restless, troubled. "
      "A small incense burner with a thin smoke line, a low desk with a sutra. Calm cool blue and silver tones.")
scene("sc_exile", ["ref_masters#1", "ref_seongjin_yang#1", "ref_others#7"], "ONLY these people: Master Yukgwan, the young monk Seongjin, the "
      "yellow-turbaned strongman and a few plain grey-robed monks. Inside a great dharma hall of a Buddhist "
      "temple. Master Yukgwan from the reference (the FIRST figure: very old, long white beard, red kasaya with gold "
      "patchwork over an ochre robe) sits high on a raised seat, stern. The young monk Seongjin "
      "(shaved head, grey robe) lies prostrate on the floor before him. Through the open doors at the right stands "
      "the huge yellow-turbaned divine strongman from the reference, waiting to take him away. Red pillars, "
      "golden Buddha statue in the dim background, other monks watching from the side.")
scene("sc_hell", ["ref_masters#4", "ref_seongjin_yang#1", "ref_fairies"], "ONLY these people: King Yama, the young monk Seongjin (shaved "
      "head, grey robe), the eight fairies and a few faceless underworld clerks. The underworld court: a dark, majestic hall "
      "with black pillars, blue ghost flames in braziers and drifting mist. King Yama from the reference sits behind "
      "a high desk. Kneeling before him: the young monk Seongjin (grey robe) and, behind him, the eight fairy maidens "
      "from the reference in their colors, heads bowed. Underworld clerks with scrolls stand at the sides (no "
      "writing visible). Deep blues, purples and dull reds.")
scene("sc_rebirth", [STYLE_REF], "ONLY two people: one old man and one woman. A small thatched farmhouse in a mountain valley, surrounded by a bamboo "
      "fence, in spring. An old scholar in a simple white robe with a grey beard kneels by a small clay brazier in "
      "the yard, fanning the fire under a pot of medicine; steam rises. Through the open door a woman rests inside. "
      "Peach blossoms, green hills, warm hopeful light.", mode="style")
scene("sc_huayin", ["ref_seongjin_yang", "ref_women_1"], "spring in Huayin town. Long weeping willows hang in front "
      "of a red two-storey pavilion. At an upper window the young lady Jin Chaebong from the reference (willow green) "
      "looks down, surprised. On the road below, the boy scholar Yang Soyu from the reference (light blue scholar "
      "robe, black soft head wrap) sits on a small grey donkey, looking up at the willows with a brush in hand.",
      HIDE + "in the upper LEFT area (about 22 percent from the left, 30 percent from the top) the tip of a willow "
      "branch has one leaf with a single round shining dewdrop.")
scene("sc_namjeon", ["ref_seongjin_yang", "ref_masters"], "a thatched hermitage on a cliff top among drifting clouds "
      "on Mount Namjeon. The Taoist hermit from the reference (white crane robe, grey beard) plays a long vertical "
      "bamboo flute. The young scholar Yang Soyu (light blue scholar robe) sits before him holding a seven-string "
      "zither (guqin) on his knees, listening in wonder. Two white cranes stand and dance nearby. Pine trees, "
      "waterfalls far below.")
scene("sc_tianjin", ["ref_seongjin_yang", "ref_women_1"], "Tianjin Bridge in Luoyang at dusk, with a red two-storey "
      "tavern on the riverbank, lanterns lit. On the open upper floor, a group of young scholars in round-collar robes "
      "drink and compose poems around a long wine table; the young scholar Yang Soyu (light blue robe) stands "
      "reciting. The poet-entertainer Gye Seomwol from the reference (scarlet red) sits composed and upright on the "
      "right side of the table, listening.",
      HIDE + "on the wine table in front of Seomwol (about 64 percent from the left, 66 percent from the top) one "
      "small white jade cup that nobody drinks from, with a tiny bright gleam inside it.")
scene("sc_chunun", ["ref_seongjin_yang", "ref_women_1"], "a mountain villa on Mount Zhongnan at sunset, misty. An "
      "elegant open pavilion stands over a calm pond, an osmanthus tree with tiny golden flowers beside it. A few "
      "osmanthus leaves float on the water. On the pavilion stands a mysterious young woman in pure WHITE flowing "
      "robes (the maid Ga Chunun from the reference, now dressed as a fairy, white instead of pink) half hidden by "
      "mist; the scholar Yang Soyu (red official robe) watches from the path, enchanted.",
      HIDE + "on the water below the pavilion (about 40 percent from the left, 78 percent from the top) one extra "
      "floating osmanthus leaf that glows faintly.")
scene("sc_hebei", ["ref_seongjin_yang#3"], "the envoy appears only ONCE; everyone else is a northern soldier. Before the massive gate of a northern frontier city, cold windy day, banners "
      "flying. The young envoy Yang Soyu from the reference (red official robe, black futou) stands tall holding the "
      "imperial envoy's tally: a long staff with layered tufts of yak tail. Before him the King of Hebei, a burly "
      "man in a dark armored robe with a fur collar, kneels in submission, his soldiers lowering their spears.")
scene("sc_handan", ["ref_seongjin_yang", "ref_women_1", "ref_women_2"], "a gentle COMEDY scene at dawn in a guest "
      "room of an inn. On the right, a young woman (Jeok Gyeonghong from the reference, violet dress, high bun) sits "
      "with her back to us at a dressing stand with a round bronze mirror, calmly combing her hair. On the left, the "
      "scholar Yang Soyu (sleeping robe, hair down) sits bolt upright in the bedding, wide-eyed with shock, a sweat "
      "drop, pointing at her. Pale morning light through paper windows.",
      HIDE + "in the round bronze mirror (about 70 percent from the left, 40 percent from the top) a small bright "
      "round reflection of light that is not anywhere else in the room.")
scene("sc_tungso", ["ref_seongjin_yang", "ref_women_2"], "a moonlit night on the railing of a high palace pavilion. "
      "The official Yang Soyu from the reference (red official robe, black futou) plays a white jade vertical flute. "
      "Two blue-grey cranes dance gracefully in the air before him. Far away over curved palace roofs hangs a big "
      "full moon in the upper right. Deep blue night, silver light.",
      HIDE + "right next to the full moon (about 84 percent from the left, 14 percent from the top) a second, much "
      "smaller pale moon halo.")
scene("sc_bongnae", ["ref_seongjin_yang#3", "ref_women_1#1"], "the official appears only ONCE; the others are palace ladies. A red-pillared palace hall with golden brackets, festive. "
      "A row of palace ladies in pastel Tang dresses kneel holding round silk fans and folded silk up to him; one of "
      "them in willow green (Jin Chaebong from the reference) hides her face behind her fan. The tipsy official Yang "
      "Soyu (red official robe, cheeks flushed) sits at a low desk, brush raised, about to write on a fan (the fan "
      "surface is blank).")
scene("sc_wonsu", ["ref_seongjin_yang#4"], "the marshal appears only ONCE; everyone else is an ordinary soldier in plain armor. An army camp in front of a wooden bridge over a river, wind blowing. The "
      "grand marshal Yang Soyu from the reference (Tang mingguang armor, red cape, helmet with red tassel) stands "
      "before rows of soldiers with spears. Beside him a tall white banner and a ceremonial golden yellow battle axe "
      "on a pole (the marks of command). Tents and distant mountains.")
scene("sc_yoyeon", ["ref_seongjin_yang#4", "ref_women_2#4"], "ONLY two people in the tent: the marshal and the swordswoman. Night inside a large army tent below snowy mountains. A "
      "bronze candlestand burns; military books and a map (blank, no writing) lie on a low desk. A short dagger is "
      "stuck upright in the floor. The swordswoman Sim Yoyeon from the reference (dark navy battle robe, high "
      "ponytail) kneels on one knee, head bowed. The marshal Yang Soyu (armor, red cape) sits calmly behind the desk.",
      HIDE + "on the base of the bronze candlestand (about 30 percent from the left, 52 percent from the top) one "
      "small round white bead ornament that softly glows.")
scene("sc_neungpa", ["ref_seongjin_yang#4", "ref_women_2#5"], "a deep dark green-black mountain pond (White Dragon Pool) "
      "surrounded by cliffs and white stones, mist on the water. Rising from the water in the center, the Dragon "
      "King's daughter Baek Neungpa from the reference (flowing teal and aqua robes) with water swirling around her. "
      "On the shore the marshal Yang Soyu (armor) watches. In the dark water a faint reflection of a dragon palace's "
      "roofs.",
      HIDE + "at the bottom of the pond near the lower middle (about 52 percent from the left, 82 percent from the "
      "top) among white pebbles, one small round stone that shines white.")
scene("sc_seungsang", ["ref_seongjin_yang#4"], "the hero appears only ONCE (on the white horse); everyone else is an ordinary soldier or townsperson. A grand triumphal procession entering the palace square of the capital: "
      "the victorious general Yang Soyu from the reference rides a white horse in armor and red cape, banners and "
      "soldiers behind him, crowds cheering. Behind them rises a tall multi-storey pavilion (the Qilin Pavilion) "
      "with golden roofs. Bright festive daylight.")
scene("sc_honrye", ["ref_seongjin_yang#5", "ref_women_1#1+3", "ref_women_2#3"], "a lavish wedding banquet in the "
      "chancellor's mansion: red silk curtains and lanterns, tables of food. The chancellor Yang Soyu (purple robe, "
      "jade belt, black futou) stands in the center. Beside him two princesses in rich wedding dresses: one in golden "
      "yellow with a phoenix crown (Princess Nanyang from the reference) and one in ivory and red (Jeong Gyeongpae). "
      "To the side a lady in willow green (Jin Chaebong) holds a round silk fan before her face. Guests celebrating.")
scene("sc_c3_monk", ["ref_seongjin_yang#5", "ref_masters#2"], "ONLY the foreign monk and the old chancellor, with a few of his wives far in the background; no young men. An autumn terrace with a stone railing at a hilltop "
      "palace, chrysanthemums. The foreign monk from the reference (extremely long white eyebrows, patched brown robe) "
      "has just climbed up the stone path and stands at the railing, leaning on his tall ringed monk's staff, "
      "smiling. The old chancellor Yang Soyu (about 60, grey beard, purple robe, black futou) has risen from his seat, "
      "startled. Late afternoon light.")
scene("sc_c3_awake", ["assets/raw/sc_cell.png"], "EXACTLY the same room as the reference picture (same walls, window, desk, cushion, statue and camera angle), but at the end of the night, at the end of the night, "
      "completely empty of people: a round straw meditation cushion, a low desk, a small incense burner whose incense "
      "has burned out to ash (no smoke). Through the lattice window, a pale moon sinks behind the western peak. "
      "Quiet, still, cool grey-blue light. The monk is gone.", mode="same")
scene("sc_c4_journal", ["ref_seongjin_yang#1"], "close view of a low wooden desk in a temple meditation cell in soft "
      "morning light: an open bound book with completely BLANK pages, an ink stone, a brush resting on a brush stand, "
      "and a string of dark prayer beads beside the book. Plain wooden wall behind, a lattice window with soft light.")
scene("sc_c5_dialogue", ["ref_seongjin_yang#1", "ref_masters#1"], "ONLY monks: every person in this picture is a Buddhist monk with a SHAVED head in a grey robe; no women, no laymen, no hats. Dawn in the great dharma hall. Master Yukgwan from "
      "the reference (very old, long white beard, RED KASAYA with gold patchwork over an ochre robe, exactly as "
      "in the reference) sits on the raised seat, calm and kind. The young monk Seongjin (shaved head, grey robe) kneels "
      "before him with his forehead to the floor. Rows of disciple monks sit on both sides listening. Soft golden "
      "dawn light through the doors, incense smoke.")
scene("sc_c5_ordination", ["ref_seongjin_yang#1", "ref_fairies"], "the stone courtyard of a mountain temple in the "
      "morning. Eight young Buddhist nuns with very short cropped hair, in plain grey robes but each with a thin "
      "sash in her fairy color (" + FAIRY_COLORS + "), stand in a row with palms together beside the young monk "
      "Seongjin (grey robe). Flower petals of many colors fall gently from the sky. Lotus pond, pagoda, misty peaks.")

# ── 17-3 초상 — 한 인물의 표정들을 한 장에 ──
def portraits(name, ref, mode, layout, desc, key=KEY):
    bust = BUST if key == KEY else BUST.replace(KEY, key).replace("magenta gaps", "green gaps")
    total = sum(layout)
    grid = ("in one row" if len(layout) == 1 else f"in {len(layout)} rows ({', '.join(map(str, layout))})")
    add(name, bust + f"\n\n{total} bust portraits {grid}, left to right, top to bottom. " + desc + "\n\n" + TANG
        + " " + NOTEXT, "1536x1024", ref, mode, "phase2")


portraits("pt_seongjin_sheet", R["ref_seongjin_yang"], "same", [3], "The SAME young monk Seongjin from the reference "
          "(shaved head, grey robe, prayer beads around the neck). Left: calm neutral. Middle: troubled and restless, "
          "brows knitted, lips pressed, eyes looking away. Right: awakened, serene clear eyes and a faint peaceful "
          "smile.")
portraits("pt_yuk_sheet", R["ref_masters"], "same", [3], "The SAME very old Master Yukgwan from the reference (long white "
          "beard, white eyebrows, red kasaya with gold patchwork). Left: kind neutral. Middle: stern, eyes sharp, "
          "brows lowered. Right: warm knowing smile.")
portraits("pt_hoseung_sheet", R["ref_masters"], "same", [2], "The SAME foreign monk from the Western Regions (the second "
          "figure in the reference: extremely long white eyebrows hanging past his cheeks, pale blue eyes, big nose, "
          "completely BALD shaved head with NO hat and NO cap, patched brown monk robe, prayer beads). Left: calm mysterious look. Right: laughing loudly, mouth open, eyes "
          "squeezed.")
portraits("pt_josin_sheet", R["ref_others"], "same", [2], "The SAME Josin from the reference. Left: young monk, shaved "
          "head, brown-grey robe, earnest yearning eyes. Right: the same man grown old in hardship, white hair in a "
          "loose topknot, gaunt lined face, ragged patched hemp robe.")
portraits("pt_dosa_sheet", R["ref_masters"], "same", [2], "The SAME Taoist hermit of Mount Namjeon (the third figure in "
          "the reference: long grey beard, small black Taoist crown, white crane robe with black borders). Left: "
          "calm aloof. Right: gentle pleased smile.")
portraits("pt_yeomra_sheet", R["ref_masters"], "same", [2], "The SAME King Yama (the fourth figure in the reference: "
          "thick black beard, flat crown with bead strings, black and dark red robe). Left: solemn neutral. Right: "
          "stern and fierce, glaring.")
portraits("pt_jeong13_sheet", R["ref_others"], "same", [2], "The SAME Jeong Simsam (the fourth figure in the "
          "reference: cheerful rich young nobleman, green round-collar robe, black futou). Left: friendly grin. "
          "Right: laughing heartily, eyes closed.")
W1, W2 = R["ref_women_1"], R["ref_women_2"]
portraits("pt_chae_sheet", W1, "cast", [3], "The SAME young woman: " + FACE["chae"] + "; costume and hair of the first "
          "woman in the reference (willow green, double-loop bun with a jade hairpin). Left: gentle neutral. Middle: "
          "shy, blushing, eyes lowered. Right: tears running down her cheeks, sad but restrained.")
portraits("pt_seomwol_sheet", W1, "cast", [3], "The SAME young woman: " + FACE["seomwol"] + "; costume and hair of the "
          "second woman in the reference (scarlet red with gold, high bun with gold flower pins and a red flower). "
          "Left: poised neutral. Middle: warm open smile. Right: sly knowing look, eyes narrowed, a fan corner near "
          "her chin.")
portraits("pt_chunun_sheet", W1, "cast", [3], "The SAME young woman: " + FACE["chunun"] + "; costume and hair of the "
          "fourth woman in the reference (peach-blossom pink, two small buns with pink ribbons). Left: lively neutral. "
          "Middle: pretending to be a GHOST: very pale bluish-white skin, hair hanging loose over one eye, pale white "
          "robe, a spooky stare. Right: giggling with a hand over her mouth, eyes squeezed.")
portraits("pt_gyeonghong_sheet", W2, "cast", [3], "The SAME young woman: " + FACE["gyeonghong"] + "; costume and hair "
          "of the first two figures in the reference. Left: in her violet dress and high bun, confident neutral. "
          "Middle: DISGUISED as a handsome young man (violet round-collar man's robe, black futou cap), the same face, "
          "cool and composed. Right: violet dress again, a bright bold smile.", key=KEY_GREEN)
portraits("pt_nanyang_sheet", W2, "cast", [2], "The SAME young princess: " + FACE["nanyang"] + "; costume and hair of "
          "the third figure in the reference (golden yellow with gold phoenix crown). Left: serene neutral. Right: "
          "soft gentle smile.")
portraits("pt_yoyeon_sheet", W2, "cast", [3], "The SAME young woman: " + FACE["yoyeon"] + "; costume and hair of the "
          "fourth figure in the reference (dark navy battle robe, high ponytail). Left: cool neutral. Middle: holding "
          "a short dagger up beside her face, eyes sharp and dangerous. Right: a rare small honest smile.")
portraits("pt_neungpa_sheet", W2, "cast", [3], "The SAME young woman: " + FACE["neungpa"] + "; costume and hair of the "
          "fifth figure in the reference (teal and aqua water dress, pearl ornaments, long hair partly loose). Left: "
          "quiet neutral. Middle: sad, eyes glistening, looking down. Right: a gentle relieved smile.")
FAIRY = "fairy maiden from the reference (same celestial dress and floating sash style, hair bun with small gold ornaments)"
portraits("pt_fairies_a_sheet", R["ref_fairies"], "cast", [3, 2], "Five DIFFERENT " + FAIRY + "s, each with the face "
          "of a different woman and her color: (1) willow green, " + FACE["chae"] + "; (2) scarlet red, "
          + FACE["seomwol"] + "; (3) ivory white, " + FACE["gyeongpae"] + "; (4) peach pink, " + FACE["chunun"]
          + "; (5) teal aqua, " + FACE["neungpa"] + ". All with a gentle heavenly expression.")
portraits("pt_fairies_b_sheet", R["ref_fairies"], "cast", [3], "Three DIFFERENT " + FAIRY + "s, each with the face of "
          "a different woman and her color: (1) violet purple, " + FACE["gyeonghong"] + "; (2) golden yellow, "
          + FACE["nanyang"] + "; (3) dark navy blue, " + FACE["yoyeon"] + ". All with a gentle heavenly expression.",
          key=KEY_GREEN)

# ── 17-4 말의 나머지 옷 세 벌 ──
HW = P["horse_walk"]
HW_BLUE = "in his LIGHT BLUE scholar robe with a black soft head wrap"
assert HW_BLUE in HW
for nm, outfit, key in [
        ("horse_walk_gwan", "in his RED round-collar official robe with a black futou cap", KEY),
        ("horse_walk_jang", "in his Tang general armor with round chest plates, a red cape and a helmet with a red "
                            "tassel", KEY),
        ("horse_walk_sang", "in his PURPLE chancellor robe with a white jade belt and a black futou cap", KEY_GREEN)]:
    t = HW.replace(HW_BLUE, outfit)
    if key != KEY:
        t = t.replace(KEY, key).replace("magenta gaps", "green gaps")
    add(nm, t, "1536x1024", R["ref_piece"], "char", "phase2")

# ── 17-6 집 세 단계(가로로 넓은 그림: 가운데 띠를 잘라 쓴다) ──
def house(name, aspect, desc, yard):
    """aspect = 너비/높이. 생성 그림(16:9)의 가운데 띠를 잘라 쓰므로, §10의 벽 줄(28~45%)·바닥 줄(62~82%)을
    생성 그림 높이 기준으로 바꿔 적는다. 지붕 전체를 그리면 방이 띠 아래쪽으로 눌리므로(1차 시도),
    처마 밑단만 보이는 가까운 무대로 그리게 한다."""
    band = (16 / 9) / aspect  # 생성 그림 높이에서 띠가 차지하는 비율
    top = (1 - band) / 2
    f = lambda v: round((top + band * v / 100) * 100)  # noqa: E731
    add(name, SCENE.replace("Wide side-view stage like a classic Korean-themed adventure game. ", "")
        .replace("Keep every important figure and object inside the middle 80 percent of the image height, because "
                 "the top and bottom edges will be cropped to 16:9.",
                 f"VERY WIDE CLOSE-UP STAGE: everything must fit inside a horizontal band from {f(0)} to {f(100)} "
                 f"percent of the image height; above and below that band is only plain sky and plain ground, because "
                 f"the picture will be cropped to that band.")
        + "\n\nA close, straight-on side-view cross-section of " + desc + ", like a dollhouse with the front wall "
        "removed, daytime, no people. Tang dynasty Chinese architecture (not Korean): red-lacquered columns, bracket "
        "sets, curved tile eaves. Do NOT show the whole roof: only the lower edge of the eaves with the bracket sets "
        f"runs along the top of the band (from {f(0)} to {f(22)} percent of the image height). Below it, the plain "
        f"back wall of the room fills {f(22)} to {f(56)} percent of the image height and is EMPTY between {f(28)} "
        f"and {f(45)} percent (things will be hung there later). The floor fills {f(56)} to {f(90)} percent of the "
        f"image height and its open area between {f(62)} and {f(82)} percent is EMPTY (things will be placed there "
        f"later); a low stone base runs along the bottom of the band. The room fills the LEFT {100 - yard} percent of "
        f"the width; the RIGHT {yard} percent is the outdoor yard with an empty patch of ground at the bottom.\n\n"
        + NOTEXT, "1536x1024", "design/ref/ref_seongjin_yang.png", "style", "phase2")


house("house_byeoldang", 480 / 200, "the elegant garden annex of a Tang minister's mansion: a wider hall with "
      "three bays, a grey tiled roof with curved eaves, lattice windows with paper, a polished wooden floor, a folding "
      "screen at the far left edge; the yard has a garden rock, a plum tree and a small pond edge", 20)
house("house_seungsang", 640 / 200, "the grand main hall of a Tang chancellor's mansion: four bays, red columns, "
      "painted bracket sets, a dark glazed tile roof with ornaments on the ridge ends, hanging silk lanterns, a "
      "raised stone platform; the yard has stone lanterns, a hitching post and a tall pine", 18)
house("house_chwimi", 800 / 200, "a magnificent Tang imperial detached palace (Chwimi Palace) hall: five bays, "
      "golden-yellow glazed tile roof with double eaves, richly painted brackets, red and gold columns, carved railings, "
      "jade-green and gold decorations; the yard is a marble terrace with pots of chrysanthemums and red maples", 18)

# ── 17-5·17-6·17-8 작은 그림들: 한 장에 여러 개를 마젠타 바탕 격자로 ──
OBJS = (
    "Pixel art game objects in the style of the reference: 16-bit era, crisp chunky square pixels, no anti-aliasing, "
    "dark outlines, limited palette of about 32 colors (Korean traditional colors). " + KEY + " Each object is "
    "separate, centered in its own cell of a strict invisible grid, with wide empty magenta gaps so that no object "
    "touches another. Simple bold shapes that still read when shrunk to a tiny size. "
)


def objects(name, layout, desc, ref=STYLE_REF, mode="style"):
    rows = " ".join(f"Row {i + 1}: {n} objects." for i, n in enumerate(layout))
    add(name, OBJS + f"Layout: exactly {len(layout)} rows. {rows}\n\nObjects, left to right, top to bottom: " + desc
        + "\n\n" + NOTEXT, "1536x1024", ref, mode, "phase2")


objects("items_sheet", [5, 5, 4], "(1) a folded sheet of poem paper tied with a willow twig; (2) a seven-string "
        "zither (guqin) of dark wood; (3) a rolled poem sheet with a red ribbon; (4) a folded female Taoist "
        "priestess robe in pale grey-blue with a white head scarf on top; (5) a yellow paper talisman with red "
        "swirling cloud patterns (abstract patterns only, no characters); (6) an imperial envoy's tally: a red staff "
        "with three tiers of yak-tail tufts; (7) a white Ferghana horse with a red saddle, standing side view; "
        "(8) a white jade vertical flute with a red tassel; (9) the four treasures of the study: brush, inkstick, "
        "inkstone and a roll of paper on a small tray; (10) a long straight imperial sword in an ornate gold and red "
        "scabbard; (11) a short dagger with a navy hilt; (12) a round blue-and-white water jar with a lid; (13) a red "
        "lacquered treasure chest with gold fittings; (14) a folded crimson robe with a gold qilin emblem and a white "
        "jade belt on top. Tang dynasty objects.")
objects("tiles_sheet", [4, 3], "(1) a square board-game space: plain light paper square with a thin pale ink border; "
        "(2) a square space with a red border and small red knots at the four corners; (3) a square space with a small "
        "thatched-roof emblem in the center; (4) a square space with a shining gold border and tiny gold clouds; "
        "(5) a round dark ink seal stamp mark, slightly rough, as if stamped; (6) a thin glowing gold ring, square "
        "with rounded corners, empty inside; (7) a small white auspicious cloud, wider than tall.", ref=STYLE_REF)
objects("ui_frames_sheet", [3, 3], "six square panels for a game interface, each with an even border so it can be "
        "stretched: (1) plain cream mulberry paper with a thin brown border; (2) a dark night-blue panel with a gold "
        "auspicious cloud border; (3) a light grey panel with a grey-blue dancheong pattern border; (4) a sheet of "
        "aged paper with a thin ink border; (5) a small wooden button plate with a dark border; (6) a blank square red "
        "seal stamp (vermilion square with a rough edge, nothing written inside).")
objects("ui_panels_sheet", [2, 2], "(1) a wide wooden signboard plaque (about 5:2) with a carved frame and five empty "
        "recessed slots in a row; (2) an unrolled blank yellow imperial edict scroll (about 5:3) with wooden rollers "
        "at both ends, nothing written; (3) an empty card frame (3:4 portrait) with an ornate gold and red border and "
        "plain cream inside; (4) a card back (3:4 portrait) with blue auspicious clouds and pink peach blossoms.")
objects("ui_small_sheet", [4], "(1) a tall decorative knot ornament with tassel (about 1:3, vertical); (2) a small "
        "corner ornament of a curling auspicious cloud filling the top-left corner of its square; (3) a short "
        "horizontal bar of black ink brush stroke (2:1); (4) a soft puff of white mist (2:1).")
add("title_art", SCENE.replace("Wide side-view stage like a classic Korean-themed adventure game. ", "")
    .replace("drawn at 480x270 resolution", "drawn at 320x480 resolution")
    .replace("cropped to 16:9", "cropped to 2:3 portrait") + "\n\nPortrait title picture: at the top, the Lotus Peak "
    "rising above a sea of clouds with a temple and a waterfall. Below the clouds, a traditional board game sheet "
    "(seunggyeongdo) seems to unfold like a dream landscape with tiny palaces and roads. In the lower middle, the "
    "young monk Seongjin from the reference is seen from BEHIND (shaved head, grey robe), holding a peach blossom "
    "branch over his shoulder, looking at it all. Leave the upper third calm (sky and peaks) for a title that the "
    "game adds later.\n\n" + TANG + " " + NOTEXT, "1024x1536", R["ref_seongjin_yang"], "scene", "phase2")
add("icon_art", OBJS.replace("Each object is separate, centered in its own cell of a strict invisible grid, with wide "
    "empty magenta gaps so that no object touches another. ", "") + "\n\nOne app icon filling the square: a single "
    "glowing pearl (white with pink sheen) resting on a pink peach blossom with two green leaves, on a deep "
    "night-blue rounded square with a thin gold border. Bold and readable at small size.\n\n" + NOTEXT,
    "1024x1024", STYLE_REF, "style", "phase2")
add("cloud_wipe", OBJS.replace("Each object is separate, centered in its own cell of a strict invisible grid, with "
    "wide empty magenta gaps so that no object touches another. ", "") + "\n\nOne wide 16:9 picture: thick, "
    "billowing white and pale grey auspicious pixel clouds covering almost the whole frame, rolling in from all "
    "sides, with only a few small magenta gaps between the cloud puffs.\n\n" + NOTEXT, "1536x1024", STYLE_REF,
    "style", "phase2")

# 장면 참조 묶음: 이어 붙일 설정 그림(design/ref)
REFPACKS = {
    "refpack_bridge": ["ref_seongjin_yang", "ref_fairies"],
    "refpack_geomungo": ["ref_seongjin_yang", "ref_women_1", "ref_others"],
    "refpack_feast": ["ref_seongjin_yang", "ref_women_1", "ref_women_2"],
}
REFPACKS.update(PACKS2)


def write_prompts():
    os.makedirs(PDIR, exist_ok=True)
    for name, text in P.items():
        assert all(ord(ch) < 128 for ch in text), name
        with open(os.path.join(PDIR, name + ".txt"), "w", encoding="utf-8") as f:
            f.write(text)
    for group, rows in MANIFEST.items():
        with open(os.path.join(ROOT, "tools", f"manifest_{group}.tsv"), "w", encoding="utf-8") as f:
            f.write("# name\tsize\tref\tmode\n")
            for row in rows:
                f.write("\t".join(row) + "\n")
    print(len(P), "prompts")


FIGS = {"ref_seongjin_yang": 5, "ref_masters": 4, "ref_women_1": 4, "ref_women_2": 5, "ref_fairies": 8,
        "ref_others": 7, "ref_piece": 8}


def ref_image(spec):
    """'ref_x' → 설정 그림 전체, 'ref_x#2+4' → 흰 바탕에서 인물 열을 찾아 2·4번째 인물만 가로로 이어 붙인 그림."""
    from PIL import Image
    import numpy as np
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import pixlib as px
    name, _, pick = spec.partition("#")
    im = Image.open(os.path.join(REFDIR, name + ".png")).convert("RGB")
    if not pick:
        return im
    a = np.asarray(im).astype(int)
    ink = (a.min(axis=2) < 235)
    cols = px.split_1d(ink.sum(axis=0), FIGS[name], min_gap=4)
    parts = []
    for k in pick.split("+"):
        x0, x1 = cols[int(k) - 1]
        ys = np.nonzero(ink[:, x0:x1].any(axis=1))[0]
        parts.append(im.crop((max(0, x0 - 12), max(0, ys.min() - 12), min(im.width, x1 + 12), min(im.height, ys.max() + 12))))
    H = max(p.height for p in parts)
    out = Image.new("RGB", (sum(p.width for p in parts) + 24 * (len(parts) - 1), H), (255, 255, 255))
    x = 0
    for p in parts:
        out.paste(p, (x, H - p.height))
        x += p.width + 24
    return out


def refpacks():
    from PIL import Image
    os.makedirs(RAW, exist_ok=True)
    Image.open(os.path.join(ROOT, "design", "style-samples", "style_c_pixel.jpg")).convert("RGB").save(
        os.path.join(RAW, "style_c_ref.png"))
    for name, refs in REFPACKS.items():
        if not all(os.path.exists(os.path.join(REFDIR, r.split("#")[0] + ".png")) for r in refs):
            print("skip", name, "(design/ref 그림이 아직 없음)")
            continue
        ims = [ref_image(r) for r in refs]
        w = 1024
        ims = [im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if im.width > w else im for im in ims]
        out = Image.new("RGB", (w, sum(im.height for im in ims) + 8 * (len(ims) - 1)), (255, 255, 255))
        y = 0
        for im in ims:
            out.paste(im, ((w - im.width) // 2, y))
            y += im.height + 8
        out.save(os.path.join(RAW, name + ".png"))
        print(name, out.size)


if __name__ == "__main__":
    if "refpacks" in sys.argv[1:]:
        refpacks()
    else:
        write_prompts()
