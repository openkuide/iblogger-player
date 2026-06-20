#!/usr/bin/env python3
"""
build-db.py — split the big movies-export JSON into a lightweight db/ for the
static player.

Output:
  db/index.json          slim catalog: one entry per movie (slug, titles,
                         poster, year, rating, genres, episodeCount). Used by
                         the home/browse view and to compute "related".
  db/<slug>.json         full detail for one movie: titles, description,
                         poster, genres, and the ordered episode list with
                         real source URLs.

Usage:
  python3 build-db.py movies-export-2026-05-30T03-55-41.json
"""
import json
import os
import re
import sys
import unicodedata
from collections import OrderedDict

SRC = sys.argv[1] if len(sys.argv) > 1 else "movies-export-2026-05-30T03-55-41.json"
OUT = "db"


def pick(translations, key, prefer=("EN", "KM")):
    """Return the first translation field across preferred locales, else any."""
    by_locale = {t.get("locale"): t for t in (translations or [])}
    for loc in prefer:
        t = by_locale.get(loc)
        if t and t.get(key):
            return t[key]
    for t in (translations or []):
        if t.get(key):
            return t[key]
    return ""


def slugify(text, fallback):
    """ASCII slug from a title. Khmer/non-ascii collapse away, so fall back."""
    text = unicodedata.normalize("NFKD", text or "")
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return text or fallback


def titles(translations):
    """{'en': ..., 'km': ...} title map (km falls back to en)."""
    en = pick(translations, "title", ("EN",))
    km = pick(translations, "title", ("KM",))
    return {"en": en, "km": km or en}


def build():
    with open(SRC, encoding="utf-8") as f:
        movies = json.load(f)

    os.makedirs(OUT, exist_ok=True)

    index = []
    seen_slugs = {}
    skipped = 0

    for i, m in enumerate(movies):
        sources = [s for s in (m.get("sources") or []) if s.get("isActive", True)]
        if not sources:
            skipped += 1
            continue

        t = titles(m.get("translations"))
        base = slugify(t["en"] or t["km"], "movie-%d" % i)

        # Ensure unique slug across the catalog.
        slug = base
        n = seen_slugs.get(base, 0)
        if n:
            slug = "%s-%d" % (base, n + 1)
        seen_slugs[base] = n + 1

        # Order episodes by sortOrder, then build a clean episode list.
        sources.sort(key=lambda s: s.get("sortOrder", 0))
        episodes = []
        for s in sources:
            et = s.get("translations") or []
            episodes.append(OrderedDict([
                ("ep", pick(et, "episode") or str(len(episodes) + 1)),
                ("title", {"en": pick(et, "title", ("EN",)),
                           "km": pick(et, "title", ("KM",))}),
                ("url", s.get("url")),
                ("type", s.get("sourceType", "M3U8")),
                ("final", bool(s.get("isFinalEpisode"))),
            ]))

        genres = m.get("genres") or []

        # Full per-movie detail file.
        detail = OrderedDict([
            ("slug", slug),
            ("title", t),
            ("description", {"en": pick(m.get("translations"), "description", ("EN",)),
                             "km": pick(m.get("translations"), "description", ("KM",))}),
            ("poster", m.get("posterUrl")),
            ("year", m.get("releaseYear")),
            ("rating", m.get("rating")),
            ("genres", genres),
            ("language", m.get("language")),
            ("episodeCount", len(episodes)),
            ("episodes", episodes),
        ])
        with open(os.path.join(OUT, slug + ".json"), "w", encoding="utf-8") as f:
            json.dump(detail, f, ensure_ascii=False, separators=(",", ":"))

        # Slim catalog entry (no episode URLs — keeps index.json small).
        index.append(OrderedDict([
            ("slug", slug),
            ("title", t),
            ("poster", m.get("posterUrl")),
            ("year", m.get("releaseYear")),
            ("rating", m.get("rating")),
            ("genres", genres),
            ("episodeCount", len(episodes)),
        ]))

    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))

    idx_kb = os.path.getsize(os.path.join(OUT, "index.json")) / 1024
    print("✓ %d movies → db/ (%d skipped: no active sources)" % (len(index), skipped))
    print("✓ db/index.json = %.1f KB" % idx_kb)
    print("✓ %d per-movie files written" % len(index))


if __name__ == "__main__":
    build()
