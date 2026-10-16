"""Render the game's original, sample-free score (Python + numpy + afconvert/ffmpeg).

Run from any directory. Intermediate PCM stays outside the repository.
"""

import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
APP_NAME = json.loads((ROOT / "src" / "content" / "brand" / "brand.json").read_text(encoding="utf-8"))["name"]
RATE = 44100
# Each piece has its own harmony, motif, orchestration and rhythm. MIDI note numbers.
SCORES = [
    ("title", "星苔的邀约", 92, 60, "major", "bell", [0, 4, 7, 11, 9, 7, 4, 2], "soft"),
    ("travel", "新叶步道", 108, 62, "major", "flute", [0, 2, 4, 7, 9, 7, 4, 2], "walk"),
    ("town", "窗灯与归途", 96, 65, "major", "pluck", [4, 7, 9, 7, 4, 2, 0, 2], "walk"),
    ("forest", "林间萤语", 84, 64, "minor", "flute", [0, 3, 7, 10, 7, 5, 3, 2], "soft"),
    ("cave", "矿脉回声", 76, 57, "minor", "bell", [0, 7, 3, 2, 0, 10, 7, 5], "ambient"),
    ("coast", "青帆逐浪", 100, 67, "major", "pluck", [7, 9, 7, 4, 2, 4, 0, 2], "coast"),
    ("power", "铜光脉冲", 116, 59, "minor", "pulse", [0, 7, 12, 10, 7, 3, 5, 2], "pulse"),
    ("wind", "雪岭来信", 80, 69, "major", "bell", [7, 4, 2, 0, 2, 9, 7, 4], "ambient"),
    ("furnace", "炉心火种", 110, 55, "minor", "pluck", [0, 3, 5, 7, 10, 7, 5, 2], "pulse"),
    ("mirror", "镜湖微光", 78, 62, "minor", "bell", [0, 2, 7, 5, 3, 10, 7, 2], "ambient"),
    ("ruins", "群星低语", 72, 60, "minor", "bell", [0, 7, 10, 14, 12, 7, 3, 2], "ambient"),
    ("league", "金辉之约", 112, 62, "major", "flute", [0, 7, 9, 12, 11, 9, 7, 4], "march"),
    ("gentle", "同行的叮咛", 88, 65, "major", "flute", [4, 2, 0, 7, 4, 9, 7, 2], "soft"),
    ("rival", "阿澈的约定", 120, 64, "major", "pulse", [0, 4, 7, 4, 9, 7, 12, 11], "walk"),
    ("tension", "定序暗流", 104, 54, "minor", "pulse", [0, 1, 7, 6, 3, 2, 7, 1], "pulse"),
    ("wild-battle", "草丛里的挑战", 144, 64, "minor", "pulse", [0, 7, 3, 5, 7, 10, 7, 2], "battle"),
    ("trainer-battle", "伙伴的交锋", 152, 62, "minor", "pulse", [0, 3, 7, 12, 10, 7, 5, 2], "battle"),
    ("boss-battle", "徽章与星冠", 160, 57, "minor", "pulse", [0, 12, 7, 10, 8, 7, 5, 2], "boss"),
    ("victory", "胜利的新芽", 124, 67, "major", "bell", [0, 4, 7, 12, 9, 7, 4, 7], "march"),
    ("defeat", "休息后再出发", 76, 62, "major", "flute", [7, 4, 2, 0, 4, 2, 0, 7], "soft"),
]


def synth(note, seconds, voice):
    t = np.arange(round(seconds * RATE)) / RATE
    hz = 440 * 2 ** ((note - 69) / 12)
    phase = 2 * np.pi * hz * t
    if voice == "bell":
        tone = np.sin(phase + 1.3 * np.sin(2 * phase) * np.exp(-6 * t))
        env = np.exp(-3.5 * t / max(seconds, 0.1))
    elif voice == "pad":
        tone = (np.sin(phase) + 0.28 * np.sin(phase * 1.002) + 0.13 * np.sin(phase * 2)) / 1.4
        env = np.sin(np.pi * np.minimum(t / seconds, 1)) ** 0.7
    elif voice == "bass":
        tone = (np.sin(phase) + 0.25 * np.sin(2 * phase)) / 1.25
        env = np.exp(-2 * t / seconds)
    elif voice == "flute":
        phase += 0.018 * np.sin(2 * np.pi * 4.5 * t)
        tone = np.sin(phase) + 0.16 * np.sin(2 * phase) + 0.05 * np.sin(3 * phase)
        env = 0.75 + 0.25 * np.exp(-4 * t / seconds)
    else:
        harmonics = [1, 0.32, 0.13, 0.06] if voice == "pulse" else [1, 0.22, 0.1]
        tone = sum(a * np.sin((i + 1) * phase) for i, a in enumerate(harmonics))
        env = np.exp(-(2.8 if voice == "pluck" else 1.2) * t / seconds)
    attack = np.minimum(t / (0.035 if voice in ("pad", "flute") else 0.007), 1)
    release = np.minimum((seconds - t) / min(0.09, seconds / 3), 1)
    return (tone * env * attack * release).astype(np.float32)


def render(score):
    key, _, bpm, root, mode, lead, motif, rhythm = score
    beat = 60 / bpm
    bars = 8 if key in ("victory", "defeat") else 16
    length = round(bars * 4 * beat * RATE)
    out = np.zeros((length, 2), dtype=np.float32)
    rng = np.random.default_rng(int.from_bytes(hashlib.sha256(key.encode()).digest()[:4], "little"))

    def place(sound, start, gain, pan=0):
        offset = round(start * RATE) % length
        signal = sound[:, None] * np.array([math.sqrt((1 - pan) / 2), math.sqrt((1 + pan) / 2)]) * gain
        end = min(length - offset, len(signal))
        out[offset:offset + end] += signal[:end]
        if len(signal) > end:
            out[:len(signal) - end] += signal[end:]

    def note(pitch, start, duration, voice, gain, pan=0):
        place(synth(pitch, duration, voice), start, gain, pan)

    third = 4 if mode == "major" else 3
    harmony = [0, 7, 9, 5] if mode == "major" else [0, 8, 3, 10]
    for bar in range(bars):
        start = bar * 4 * beat
        chord_root = root - 12 + harmony[(bar // 2) % 4]
        chord = [chord_root, chord_root + third, chord_root + 7]
        for i, pitch in enumerate(chord):
            note(pitch, start, beat * 4.3, "pad", 0.055, (i - 1) * 0.5)
        for step in range(8):
            # Arpeggios support the melody; the B phrase changes register and response.
            pitch = chord[([0, 2, 1, 2, 0, 1, 2, 1][step])] + 12
            note(pitch, start + step * beat / 2, beat * 0.65, "pluck", 0.045, (-1) ** step * 0.4)
        for step in range(4):
            if rhythm == "ambient" and step % 2:
                continue
            note(chord_root - 12 + (7 if step == 3 else 0), start + step * beat,
                 beat * 0.82, "bass", 0.13 if rhythm in ("battle", "boss") else 0.085)
        phrase = bar % 4
        for step in range(4):
            index = (step + phrase * 2) % len(motif)
            pitch = root + motif[index]
            if bar >= 8:
                pitch += 12 if bar % 4 < 2 else 0
            if phrase == 3 and step == 3:
                continue
            duration = beat * (1.55 if step == 3 else 0.8)
            note(pitch, start + step * beat + (beat * 0.25 if step % 2 and rhythm == "coast" else 0),
                 duration, lead, 0.105, 0.1)
            if rhythm in ("battle", "boss", "pulse") and step % 2 == 0:
                note(pitch + 7, start + (step + 0.5) * beat, beat * 0.28, "pluck", 0.055, -0.25)
        if rhythm not in ("ambient", "soft"):
            for step in range(8):
                t = np.arange(round(RATE * 0.11)) / RATE
                hat = rng.normal(size=len(t))
                hat[1:] -= hat[:-1].copy() * 0.85
                place((hat * np.exp(-65 * t)).astype(np.float32), start + step * beat / 2, 0.014, 0.32)
            for step in (0, 2):
                t = np.arange(round(RATE * 0.24)) / RATE
                kick = np.sin(2 * np.pi * (47 * t + 2.4 * (1 - np.exp(-30 * t)))) * np.exp(-20 * t)
                place(kick.astype(np.float32), start + step * beat, 0.16)
            for step in (1, 3):
                t = np.arange(round(RATE * 0.14)) / RATE
                snare = (rng.normal(size=len(t)) * 0.35 + np.sin(2 * np.pi * 185 * t) * 0.25) * np.exp(-30 * t)
                place(snare.astype(np.float32), start + step * beat, 0.075)
        if key in ("coast", "wind", "cave", "ruins", "forest", "mirror"):
            # Quiet air/water texture, synthesized from deterministic filtered noise.
            n = round(4 * beat * RATE)
            noise = rng.normal(size=n)
            smooth = np.convolve(noise, np.ones(100) / 100, mode="same")
            envelope = np.sin(np.linspace(0, np.pi, n)) ** 2
            place((smooth * envelope).astype(np.float32), start, 0.09, -0.3)
    # Circular delay preserves the musical period, including tails at the loop boundary.
    dry = out.copy()
    for seconds, gain in ((beat * 0.75, 0.14), (beat * 1.5, 0.07)):
        out += np.roll(dry[:, ::-1], round(seconds * RATE), axis=0) * gain
    out *= min(0.13 / max(float(np.sqrt(np.mean(out ** 2))), 1e-6), 0.86 / max(float(np.max(np.abs(out))), 1e-6))
    edge = round(0.004 * RATE)
    out[:edge] *= np.linspace(0, 1, edge)[:, None]
    out[-edge:] *= np.linspace(1, 0, edge)[:, None]
    return out


def encounter():
    out = np.zeros((round(RATE * 0.72), 2), dtype=np.float32)
    for pitch, start, duration in [(57, 0, 0.1), (64, 0.08, 0.1), (69, 0.16, 0.1), (75, 0.24, 0.12), (76, 0.36, 0.32)]:
        sound = synth(pitch, duration, "pulse") * 0.22
        i = round(start * RATE)
        out[i:i + len(sound)] += sound[:, None]
    return out


def main():
    destination = ROOT / "assets" / "music"
    destination.mkdir(parents=True, exist_ok=True)
    entries = []
    with tempfile.TemporaryDirectory(prefix="stargrove-music-") as temporary:
        for score in SCORES + [("encounter", "遭遇闪光", 0, 0, "", "", [], "")]:
            key, title, bpm, *_ = score
            samples = encounter() if key == "encounter" else render(score)
            pcm = Path(temporary) / f"{key}.wav"
            with wave.open(str(pcm), "wb") as stream:
                stream.setnchannels(2)
                stream.setsampwidth(2)
                stream.setframerate(RATE)
                stream.writeframes((samples * 32767).astype("<i2").tobytes())
            target = destination / f"{key}.m4a"
            if shutil.which("afconvert"):
                subprocess.run(["afconvert", str(pcm), str(target), "-f", "m4af", "-d", "aac@44100", "-b", "64000", "-q", "127"], check=True)
            else:
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(pcm), "-c:a", "aac", "-b:a", "64k", str(target)], check=True)
            data = target.read_bytes()
            entries.append({"id": key, "曲名": title, "文件": f"assets/music/{key}.m4a", "BPM": bpm or None,
                            "时长秒": round(len(samples) / RATE, 3), "循环": key != "encounter", "字节数": len(data), "SHA256": hashlib.sha256(data).hexdigest()})
            print(f"{key}: {len(samples) / RATE:.2f}s, {len(data)} bytes", flush=True)
    manifest = ROOT / "docs" / "音乐资源" / "背景音乐.json"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({"来源": f"为{APP_NAME}编写的原创程序合成配乐；无第三方录音、采样或现有游戏旋律。",
                                    "使用范围": "随本项目分发、修改和商用，无第三方署名要求。",
                                    "生成工具": "tools/generate-music.py（Python 3、numpy；AAC 编码使用 macOS afconvert 或 ffmpeg）",
                                    "音频格式": "AAC-LC / M4A，44.1 kHz，立体声，目标 64 kbit/s；运行时离线播放本地文件。",
                                    "曲目": entries}, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
