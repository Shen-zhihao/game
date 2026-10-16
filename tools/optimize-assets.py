"""Optimize assets/*.png without changing any decoded RGBA pixel.

Requires oxipng on PATH and Pillow (also used by export-sprite-frames.py).
Run with --apply to replace smaller files; the default only previews results.
Use --level 6 for a higher-effort lossless search.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from PIL import Image


def fingerprint(path):
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[24] != 8:
        raise ValueError(f"Expected an 8-bit PNG: {path}")
    with Image.open(path) as image:
        if getattr(image, "n_frames", 1) != 1:
            raise ValueError(f"Animated PNG requires separate verification: {path}")
        return {
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "width": image.width,
            "height": image.height,
            "rgbaSha256": hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest(),
        }, {
            key: image.info.get(key)
            for key in ("icc_profile", "gamma", "srgb", "chromaticity", "dpi")
        }


def optimize(root, apply=False, level=4):
    optimizer = shutil.which("oxipng")
    if not optimizer:
        raise RuntimeError("Install oxipng first (macOS: brew install oxipng)")
    paths = sorted((root / "assets").rglob("*.png"))
    if not paths:
        raise RuntimeError("No PNG assets found")
    version = subprocess.check_output([optimizer, "--version"], text=True).strip()
    with tempfile.TemporaryDirectory(prefix="stargrove-png-") as scratch:

        def compress(path):
            if path.is_symlink():
                raise ValueError(f"Refusing to replace symlink: {path}")
            relative = path.relative_to(root)
            output = Path(scratch) / relative
            output.parent.mkdir(parents=True, exist_ok=True)
            before, display_before = fingerprint(path)
            # Do not use --alpha, quantization, resizing or 16-bit scaling.
            subprocess.run(
                [optimizer, "-o", str(level), "--threads", "2", "--out", str(output), str(path)],
                check=True,
                capture_output=True,
                text=True,
            )
            after, display_after = fingerprint(output)
            for key in ("width", "height", "rgbaSha256"):
                if before[key] != after[key]:
                    raise ValueError(f"Pixel verification failed ({key}): {relative}")
            if display_before != display_after:
                raise ValueError(f"Color metadata changed: {relative}")
            smaller = after["bytes"] < before["bytes"]
            print(f"Verified {relative}: {before['bytes']} -> {after['bytes']}", file=sys.stderr)
            return {
                "file": relative.as_posix(),
                "before": before,
                "after": after if smaller else before,
                "smaller": smaller,
            }

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(compress, paths))

        # Validate the whole batch before touching any source file.
        if apply:
            for result in results:
                path = root / result["file"]
                if hashlib.sha256(path.read_bytes()).hexdigest() != result["before"]["sha256"]:
                    raise RuntimeError(f"Asset changed during compression: {path}")
            for result in results:
                if result["smaller"]:
                    path = root / result["file"]
                    output = Path(scratch) / result["file"]
                    output.chmod(path.stat().st_mode)
                    os.replace(output, path)

    before_bytes = sum(item["before"]["bytes"] for item in results)
    after_bytes = sum(item["after"]["bytes"] for item in results)
    return {
        "optimizer": version,
        "level": level,
        "applied": apply,
        "verification": "Exact dimensions, decoded RGBA including transparent RGB, and color metadata",
        "pngCount": len(results),
        "smallerCount": sum(item["smaller"] for item in results),
        "beforeBytes": before_bytes,
        "afterBytes": after_bytes,
        "savedBytes": before_bytes - after_bytes,
        "files": results,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Replace only smaller, verified PNGs")
    parser.add_argument(
        "--level", type=int, choices=range(7), default=4,
        help="oxipng effort (0-6; default 4)",
    )
    args = parser.parse_args()
    print(json.dumps(optimize(Path(__file__).resolve().parents[1], args.apply, args.level), indent=2))
