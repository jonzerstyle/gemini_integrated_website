#!/usr/bin/env python3
"""
Generate an animated GIF banner for numericagenda.
Slowed down by ~5x:
- Graceful, cinematic inward pull of 0s and 1s
- Deliberate matrix binary scrambling
- Distinct one-by-one letter lock-in
- Extended steady-state reading hold with laser sweep and glowing aura
"""
import math
import random
from PIL import Image, ImageDraw, ImageFont

WIDTH = 760
HEIGHT = 160
NUM_FRAMES = 115
FRAME_DURATION_MS = 140  # ~16.1 seconds total loop (~5x slower than original 3.6s)
TARGET_WORD = "numericagenda"

# Fonts
FONT_PATH_MONO = "/usr/share/fonts/truetype/ubuntu/UbuntuMono-B.ttf"
FONT_PATH_BOLD = "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf"

font_main = ImageFont.truetype(FONT_PATH_BOLD, 42)
font_binary = ImageFont.truetype(FONT_PATH_MONO, 18)
font_small = ImageFont.truetype(FONT_PATH_MONO, 12)
font_sub = ImageFont.truetype(FONT_PATH_MONO, 13)

# Calculate positions of each target letter
temp_img = Image.new("RGBA", (WIDTH, HEIGHT))
temp_draw = ImageDraw.Draw(temp_img)

char_widths = [temp_draw.textlength(c, font=font_main) for c in TARGET_WORD]
word_width = sum(char_widths)
start_x = (WIDTH - word_width) / 2
target_y = (HEIGHT - 48) / 2 - 4

letter_targets = []
cur_x = start_x
for i, c in enumerate(TARGET_WORD):
    w = char_widths[i]
    letter_targets.append({
        'char': c,
        'target_x': cur_x + w / 2,
        'target_y': target_y + 24,
        'box_x': cur_x,
        'box_y': target_y,
        'width': w
    })
    cur_x += w

# Generate persistent particles for the inward pull
random.seed(42)
NUM_PARTICLES = 190
particles = []
for i in range(NUM_PARTICLES):
    target_idx = random.randint(0, len(TARGET_WORD) - 1)
    target = letter_targets[target_idx]
    
    # Spawn from edges or outer field
    angle = random.uniform(0, 2 * math.pi)
    dist = random.uniform(220, 520)
    spawn_x = target['target_x'] + math.cos(angle) * dist
    spawn_y = target['target_y'] + math.sin(angle) * dist
    
    val = random.choice(["0", "1"])
    speed = random.uniform(0.85, 1.2)
    particles.append({
        'val': val,
        'spawn_x': spawn_x,
        'spawn_y': spawn_y,
        'target_x': target['target_x'],
        'target_y': target['target_y'],
        'target_idx': target_idx,
        'speed': speed,
        'size': random.randint(11, 16)
    })

frames = []

for frame_idx in range(NUM_FRAMES):
    img = Image.new("RGBA", (WIDTH, HEIGHT), (10, 15, 26, 255))
    draw = ImageDraw.Draw(img)

    # Subtle cyber grid background lines
    grid_alpha = 25
    for x in range(0, WIDTH, 38):
        draw.line([(x, 0), (x, HEIGHT)], fill=(59, 130, 246, grid_alpha))
    for y in range(0, HEIGHT, 26):
        draw.line([(0, y), (WIDTH, y)], fill=(59, 130, 246, grid_alpha))

    # Phase 1: Inward Pulling Binary Particles (Frames 0 to 60)
    # Stretches across first ~8.5 seconds
    if frame_idx < 66:
        pull_progress = frame_idx / 52.0  # Slow graceful inward pull
        for p in particles:
            t = min(1.0, pull_progress * p['speed'])
            ease_t = t * t * (3 - 2 * t)  # Smooth cubic ease
            
            px = p['spawn_x'] + (p['target_x'] - p['spawn_x']) * ease_t
            py = p['spawn_y'] + (p['target_y'] - p['spawn_y']) * ease_t

            alpha = int(255 * min(1.0, ease_t * 1.6))
            if frame_idx > 50:
                alpha = max(0, int(255 * (1.0 - (frame_idx - 50) / 15.0)))

            if 0 <= px <= WIDTH and 0 <= py <= HEIGHT and alpha > 0:
                color = (6, 182, 212, alpha) if p['val'] == '1' else (16, 185, 129, alpha)
                p_font = ImageFont.truetype(FONT_PATH_MONO, p['size'])
                draw.text((px, py), p['val'], fill=color, font=p_font, anchor="mm")

    # Phase 2 & 3: Binary Scramble & Deliberate Letter Lock-in
    # Scrambling begins around frame 28
    # Letters lock in one-by-one from frame 42 to frame 75
    lock_start_frame = 38
    lock_spacing = 2.8  # frames between consecutive letter locks
    for i, lt in enumerate(letter_targets):
        char_lock_frame = int(lock_start_frame + i * lock_spacing)
        bx = lt['box_x']
        by = lt['box_y']

        if frame_idx < char_lock_frame:
            # Active binary scrambling in position
            if frame_idx >= 24:
                random_bit = random.choice(["0", "1"])
                bit_color = (96, 165, 250, 220)
                draw.text((lt['target_x'], lt['target_y']), random_bit, fill=bit_color, font=font_binary, anchor="mm")
                # Small digital bracket under the letter
                draw.line([(bx, by + 40), (bx + lt['width'], by + 40)], fill=(59, 130, 246, 130), width=1)
        else:
            # Locked in!
            locked_age = frame_idx - char_lock_frame
            if locked_age <= 1:
                # Bright white lock-in flash with cyan bracket
                draw.text((bx, by), lt['char'], fill=(255, 255, 255, 255), font=font_main)
                draw.rectangle([bx - 2, by - 2, bx + lt['width'] + 2, by + 44], outline=(56, 189, 248, 255), width=2)
            else:
                # Glowing locked state
                glow_alpha = 180 if frame_idx < 105 else int(180 * max(0.0, 1.0 - (frame_idx - 105) / 10.0))
                draw.text((bx - 1, by), lt['char'], fill=(6, 182, 212, glow_alpha), font=font_main)
                draw.text((bx + 1, by), lt['char'], fill=(6, 182, 212, glow_alpha), font=font_main)
                draw.text((bx, by - 1), lt['char'], fill=(6, 182, 212, glow_alpha), font=font_main)
                draw.text((bx, by + 1), lt['char'], fill=(6, 182, 212, glow_alpha), font=font_main)
                
                fg_alpha = 255 if frame_idx < 108 else int(255 * max(0.0, 1.0 - (frame_idx - 108) / 7.0))
                draw.text((bx, by), lt['char'], fill=(255, 255, 255, fg_alpha), font=font_main)

    # Phase 4: Extended Reading & Status Hold (Frames 74 to 110)
    if frame_idx >= 72:
        sub_alpha = min(255, int((frame_idx - 72) * 20))
        if frame_idx > 106:
            sub_alpha = max(0, int(255 * (1.0 - (frame_idx - 106) / 8.0)))
        
        # Subtitle: N U M E R I C A G E N D A . C O M
        sub_text = "N U M E R I C A G E N D A . C O M"
        sub_w = temp_draw.textlength(sub_text, font=font_sub)
        sub_x = (WIDTH - sub_w) / 2
        draw.text((sub_x, target_y + 54), sub_text, fill=(148, 163, 184, sub_alpha), font=font_sub)

        # Status badge top: [ ONLINE • SYSTEM ACTIVE ]
        badge_text = "● PROTOCOL ACTIVE: 0xNUMERIC"
        badge_w = temp_draw.textlength(badge_text, font=font_small)
        badge_x = (WIDTH - badge_w) / 2
        draw.text((badge_x, target_y - 20), badge_text, fill=(52, 211, 153, sub_alpha), font=font_small)

        # Smooth laser scanline sweep across the text
        if 78 <= frame_idx <= 102:
            sweep_x = start_x + (word_width + 40) * ((frame_idx - 78) / 24.0) - 20
            draw.line([(sweep_x, target_y - 8), (sweep_x, target_y + 50)], fill=(255, 255, 255, 220), width=2)
            draw.line([(sweep_x - 3, target_y - 8), (sweep_x - 3, target_y + 50)], fill=(56, 189, 248, 120), width=2)
            draw.line([(sweep_x + 3, target_y - 8), (sweep_x + 3, target_y + 50)], fill=(56, 189, 248, 120), width=2)

    # Frame Border & Corner Brackets for HUD aesthetic
    border_color = (59, 130, 246, 80)
    draw.rounded_rectangle([2, 2, WIDTH - 3, HEIGHT - 3], radius=10, outline=border_color, width=1)
    
    bracket_len = 16
    draw.line([(4, 4), (4 + bracket_len, 4)], fill=(6, 182, 212, 200), width=2)
    draw.line([(4, 4), (4, 4 + bracket_len)], fill=(6, 182, 212, 200), width=2)
    draw.line([(WIDTH - 5, 4), (WIDTH - 5 - bracket_len, 4)], fill=(6, 182, 212, 200), width=2)
    draw.line([(WIDTH - 5, 4), (WIDTH - 5, 4 + bracket_len)], fill=(6, 182, 212, 200), width=2)
    draw.line([(4, HEIGHT - 5), (4 + bracket_len, HEIGHT - 5)], fill=(6, 182, 212, 200), width=2)
    draw.line([(4, HEIGHT - 5), (4, HEIGHT - 5 - bracket_len)], fill=(6, 182, 212, 200), width=2)
    draw.line([(WIDTH - 5, HEIGHT - 5), (WIDTH - 5 - bracket_len, HEIGHT - 5)], fill=(6, 182, 212, 200), width=2)
    draw.line([(WIDTH - 5, HEIGHT - 5), (WIDTH - 5, HEIGHT - 5 - bracket_len)], fill=(6, 182, 212, 200), width=2)

    frames.append(img.convert("RGB"))

output_path = "/home/mjones/agy/gemini_integrated_website/numericagenda_banner.gif"
print(f"Saving {len(frames)} frames with duration={FRAME_DURATION_MS}ms to {output_path}...")
frames[0].save(
    output_path,
    save_all=True,
    append_images=frames[1:],
    duration=FRAME_DURATION_MS,
    loop=0,
    optimize=True
)
print(f"Animated GIF generated successfully! Total loop duration: {len(frames) * FRAME_DURATION_MS / 1000.0:.1f}s")
