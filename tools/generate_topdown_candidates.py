"""gen.ps1만 호출하며 승인 전 원본을 보존한다. 새 provider나 API는 쓰지 않는다."""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "tools/manifest_topdown_v3.json").read_text(encoding="utf-8"))
    logdir = ROOT / "tests/shots/topdown-v3"
    logdir.mkdir(parents=True, exist_ok=True)
    evidence = []
    for entry in manifest["assets"]:
        if args.only and entry["id"] not in args.only:
            continue
        target = ROOT / entry["original"]
        if target.exists():
            print(f"PRESERVED {entry['original']}", flush=True)
            continue
        prompt = (ROOT / entry["prompt"]).read_text(encoding="ascii")
        if not all(word in prompt for word in ["NOTEXT", "TANG"]):
            raise ValueError("NOTEXT/TANG required")
        name = "t3-topdown-" + Path(entry["original"]).stem
        command = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tools/gen.ps1",
                   "-Name", name, "-PromptFile", entry["prompt"], "-Out", entry["original"],
                   "-Size", "1536x1280" if entry["kind"] == "map" else "1280x1024",
                   "-Image", entry["reference"], "-RefMode", entry["mode"]]
        print("GENERATING " + entry["id"], flush=True)
        result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        logfile = logdir / (entry["id"] + "-generation.log")
        logfile.write_bytes(result.stdout)
        auth = Path(os.environ.get("TEMP", "")) / ("codex-img-guun-" + name) / "auth.json"
        good = result.returncode == 0 and target.is_file() and not auth.exists()
        evidence.append(dict(command=command, exit=result.returncode, original=entry["original"],
                             originalExists=target.is_file(), authCopyRemoved=not auth.exists(),
                             log=logfile.relative_to(ROOT).as_posix()))
        (logdir / ("generation-evidence-" + name + ".json")).write_text(json.dumps(evidence[-1], indent=2) + "\n", encoding="utf-8")
        print(result.stdout.decode("utf-8", errors="replace").strip(), flush=True)
        if not good:
            print("BLOCKED: original missing, generation failed or auth cleanup failed", flush=True)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
