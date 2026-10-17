"""Read alpha geometry for display crops; never rewrite a source bitmap.

Requires Pillow and NumPy. Run from the repository root, then format the JSON
with the project's Prettier configuration. Disconnected bubbles and sparks
near their creature are included in its crop.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image


def components(path):
    """Find alpha components using row runs and eight-neighbor union-find."""
    image = Image.open(path).convert("RGBA")
    mask = np.array(image)[:, :, 3] > 24
    parents, groups, previous = [], [], []

    def root(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    for y, row in enumerate(mask):
        changes = np.diff(np.pad(row.astype(np.int8), (1, 1)))
        starts = np.flatnonzero(changes == 1)
        ends = np.flatnonzero(changes == -1)
        current, previous_index = [], 0
        for start, end in zip(starts.tolist(), ends.tolist()):
            index = len(parents)
            parents.append(index)
            groups.append([start, y, end, y + 1, end - start])
            current.append((start, end, index))
            while previous_index < len(previous) and previous[previous_index][1] < start:
                previous_index += 1
            neighbor = previous_index
            while neighbor < len(previous) and previous[neighbor][0] <= end:
                prior_root, current_root = root(previous[neighbor][2]), root(index)
                if prior_root != current_root:
                    parents[current_root] = prior_root
                neighbor += 1
        previous = current

    merged = {}
    for index, box in enumerate(groups):
        group_root = root(index)
        if group_root not in merged:
            merged[group_root] = box.copy()
        else:
            group = merged[group_root]
            group[0] = min(group[0], box[0])
            group[1] = min(group[1], box[1])
            group[2] = max(group[2], box[2])
            group[3] = max(group[3], box[3])
            group[4] += box[4]
    for group_root, part in merged.items():
        part.append(group_root)
    return image, list(merged.values()), [(box, root(index)) for index, box in enumerate(groups)]


def bounds(parts):
    return [
        min(part[0] for part in parts),
        min(part[1] for part in parts),
        max(part[2] for part in parts),
        max(part[3] for part in parts),
    ]


def atlas_frames(path, columns, rows):
    image, parts, runs = components(path)
    slots = {}
    for part in (part for part in parts if part[4] > 800):
        column = min(columns - 1, int((part[0] + part[2]) / 2 / image.width * columns))
        row = min(rows - 1, int((part[1] + part[3]) / 2 / image.height * rows))
        slots.setdefault(column + row * columns, []).append(part)
    if len(slots) != columns * rows:
        raise ValueError(
            f"{path.name}: expected {columns * rows} separated sprites, "
            f"got {len(slots)}; inspect before exporting"
        )

    boxes = {key: bounds(group) for key, group in slots.items()}
    for part in (part for part in parts if 6 <= part[4] <= 800):
        def distance(box):
            dx = max(0, box[0] - part[2], part[0] - box[2])
            dy = max(0, box[1] - part[3], part[1] - box[3])
            return dx * dx + dy * dy

        key = min(boxes, key=lambda key: distance(boxes[key]))
        if distance(boxes[key]) <= 12 * 12:
            slots[key].append(part)

    owners = np.full((image.height, image.width), -1, dtype=np.int16)
    owner_by_root = {part[5]: cell for cell, group in slots.items() for part in group}
    for run, group_root in runs:
        if group_root in owner_by_root:
            owners[run[1], run[0]:run[2]] = owner_by_root[group_root]
    frames, clips = {}, {}
    for cell, group in sorted(slots.items()):
        left, top, right, bottom = bounds(group)
        left, top = max(0, left - 3), max(0, top - 3)
        right, bottom = min(image.width, right + 3), min(image.height, bottom + 3)
        frames[str(cell)] = [left, top, right - left, bottom - top]
        cropped_owners = owners[top:bottom, left:right]
        if np.any((cropped_owners >= 0) & (cropped_owners != cell)):
            # Display-only clipping excludes neighbouring sprites inside overlapping boxes.
            # Two source pixels retain the original antialiased edge; no PNG is rewritten.
            segments = []
            for offset_y, row_mask in enumerate(cropped_owners == cell):
                changes = np.diff(np.pad(row_mask.astype(np.int8), (1, 1)))
                for start, end in zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1)):
                    x, y, width = left + int(start) - 2, top + offset_y - 2, int(end - start) + 4
                    segments.append(f"M{x} {y}h{width}v5h{-width}Z")
            clips[str(cell)] = "".join(segments)
    return {
        "width": image.width,
        "height": image.height,
        "frames": frames,
        "clips": clips,
    }


def export_frames():
    report = {}
    for path in sorted(Path("assets").glob("creatures-*.png")):
        columns = 1 if path.stem == "creatures-moth" else 4
        report[path.stem.removeprefix("creatures-")] = atlas_frames(path, columns, columns)
    Path("docs/美术资源/精灵取图区.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )
    total = sum(len(atlas["frames"]) for atlas in report.values())
    print(f"Exported {total} source regions; no bitmaps edited.")
    characters = {
        "npcs": atlas_frames(Path("assets/characters/npcs.png"), 4, 2),
        "ranger": atlas_frames(Path("assets/characters/ranger-walk.png"), 4, 4),
    }
    Path("docs/美术资源/角色取图区.json").write_text(
        json.dumps(characters, ensure_ascii=False, indent=2) + "\n"
    )
    print("Exported 24 character frames; no bitmaps edited.")


if __name__ == "__main__":
    export_frames()
