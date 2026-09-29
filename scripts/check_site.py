#!/usr/bin/env python3
"""Static integrity checks for the dependency-free playground site."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
IGNORED_SCHEMES = {"data", "http", "https", "mailto", "tel", "javascript"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[tuple[str, str]] = []
        self.ids: list[str] = []
        self.inline_scripts = 0
        self.inline_styles = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if tag in {"a", "link"} and values.get("href"):
            self.references.append((tag, values["href"] or ""))
        if tag in {"script", "img"} and values.get("src"):
            self.references.append((tag, values["src"] or ""))
        if tag == "script" and not values.get("src"):
            self.inline_scripts += 1
        if tag == "style":
            self.inline_styles += 1


def local_target(page: Path, reference: str) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme in IGNORED_SCHEMES or parsed.netloc or reference.startswith("#"):
        return None
    raw_path = unquote(parsed.path)
    if not raw_path:
        return None
    target = (ROOT / raw_path.lstrip("/")) if raw_path.startswith("/") else (page.parent / raw_path)
    target = target.resolve()
    if target.is_dir() or raw_path.endswith("/"):
        target /= "index.html"
    return target


def check_pages(errors: list[str]) -> list[Path]:
    pages = sorted(path for path in ROOT.rglob("*.html") if ".git" not in path.parts)
    for page in pages:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        duplicate_ids = sorted({value for value in parser.ids if parser.ids.count(value) > 1})
        if duplicate_ids:
            errors.append(f"{page.relative_to(ROOT)}: duplicate ids: {', '.join(duplicate_ids)}")
        if page.name == "index.html" and page.parent != ROOT and parser.inline_scripts:
            errors.append(f"{page.relative_to(ROOT)}: inline script remains")
        if parser.inline_styles:
            errors.append(f"{page.relative_to(ROOT)}: inline style remains")
        for tag, reference in parser.references:
            target = local_target(page, reference)
            if target is not None and not target.exists():
                errors.append(f"{page.relative_to(ROOT)}: missing {tag} target {reference}")
    return pages


def check_data(errors: list[str]) -> None:
    manifest_path = ROOT / "data/manifest.json"
    state_path = ROOT / "scripts/state.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"data metadata: {exc}")
        return
    files = [manifest.get("base"), *(row.get("file") for row in manifest.get("updates", []))]
    for relative in filter(None, files):
        if not (ROOT / "data" / relative).is_file():
            errors.append(f"manifest: missing data/{relative}")
    if not state.get("last_processed"):
        errors.append("state: last_processed is missing")
    ids = state.get("processed_record_ids", [])
    if len(ids) != len(set(ids)):
        errors.append("state: processed_record_ids contains duplicates")


def check_styles(errors: list[str]) -> int:
    styles = sorted(path for path in ROOT.rglob("*.css") if ".git" not in path.parts)
    for style in styles:
        source = style.read_text(encoding="utf-8")
        if source.count("{") != source.count("}"):
            errors.append(f"{style.relative_to(ROOT)}: unbalanced braces")
        for raw in re.findall(r"url\(([^)]+)\)", source, re.I):
            reference = raw.strip().strip("\"'")
            target = local_target(style, reference)
            if target is not None and not target.exists():
                errors.append(f"{style.relative_to(ROOT)}: missing CSS target {reference}")
    return len(styles)


def check_javascript(errors: list[str]) -> int:
    node = shutil.which("node")
    scripts = sorted(path for path in ROOT.rglob("*.js") if ".git" not in path.parts)
    if not node:
        errors.append("node is required to syntax-check JavaScript")
        return len(scripts)
    for script in scripts:
        source = script.read_text(encoding="utf-8")
        imports = re.findall(r"(?:from\s+|import\s*)[\"']([^\"']+)[\"']", source)
        for reference in imports:
            target = local_target(script, reference)
            if target is not None and not target.exists():
                errors.append(f"{script.relative_to(ROOT)}: missing import {reference}")
        result = subprocess.run(
            [node, "--check", str(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if result.returncode:
            detail = (result.stderr or result.stdout).strip().splitlines()[-1]
            errors.append(f"{script.relative_to(ROOT)}: {detail}")
    return len(scripts)


def main() -> int:
    errors: list[str] = []
    pages = check_pages(errors)
    check_data(errors)
    style_count = check_styles(errors)
    script_count = check_javascript(errors)
    if errors:
        print("site check failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"site check ok: {len(pages)} HTML / {style_count} CSS / {script_count} JavaScript files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
