# -*- coding: utf-8 -*-
"""운영자 콘솔(operator/ + shared/)을 Vercel 배포용 public/admin/ 으로 동기화한다.

원본은 저장소 루트의 operator/·shared/ (file:// 직접 실행용)이고,
public/admin/ 은 생성물이다 — 직접 편집하지 말고 원본을 고친 뒤 이 스크립트를 다시 돌린다.

    python sync_admin.py

Vite가 public/** 을 dist/ 에 그대로 복사하므로 배포 URL의 /admin/ 에서 서빙된다.
차이점 하나: file:// 구조에서는 shared/ 가 operator/ 의 형제 폴더라 ../shared/ 로
참조하지만, /admin/ 아래에서는 자기 하위(shared/)로 복사하고 index.html 참조를 고쳐 쓴다.
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
DEST = ROOT / "public" / "admin"


def main():
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.mkdir(parents=True)

    shutil.copytree(ROOT / "operator" / "css", DEST / "css")
    shutil.copytree(ROOT / "operator" / "js", DEST / "js")
    shutil.copytree(ROOT / "shared", DEST / "shared")

    html = (ROOT / "operator" / "index.html").read_text(encoding="utf-8")
    html = html.replace("../shared/", "shared/")
    (DEST / "index.html").write_text(html, encoding="utf-8")

    n = sum(1 for p in DEST.rglob("*") if p.is_file())
    print(f"synced {n} files -> {DEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
