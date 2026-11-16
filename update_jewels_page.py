import re

gifts = [
    # Desi / Indian Specials
    ("Samosa", 2, "🥟", "indian"),
    ("Panipuri", 2, "🍲", "indian"),
    ("Mango lassi", 2, "🥭", "indian"),
    ("Namaste", 2, "🙏", "indian"),
    ("Hamsasya mudra", 2, "👌", "indian"),
    ("Arre yaar!", 5, "🗣️", "indian"),
    ("Kem cho?", 5, "👋", "indian"),
    ("Macha", 5, "🤙", "indian"),
    ("Bas kar", 10, "🛑", "indian"),
    ("Cricket", 10, "🏏", "indian"),
    ("All izz well", 10, "✨", "indian"),
    ("Diya", 100, "🪔", "indian"),
    ("Chai toast", 100, "☕", "indian"),
    ("Vada pav", 100, "🍔", "indian"),
    ("Nimbu Mirchi", 100, "🌶️", "indian"),
    ("Vibe hai", 100, "🌈", "indian"),
    ("Bindaas", 350, "💃", "indian"),
    ("Aiyyo!", 350, "😲", "indian"),
    ("Badhai ho", 400, "🎊", "indian"),
    ("Lucky lifafa", 800, "🧧", "indian"),

    # Gaming & Memes
    ("Gold coin", 10, "🪙", "gaming"),
    ("W", 10, "⌨️", "gaming"),
    ("Press F", 10, "⌨️", "gaming"),
    ("GGEZ", 20, "🎮", "gaming"),
    ("Jammin", 200, "🐱", "gaming"),
    ("OP", 200, "🔥", "gaming"),
    ("Saxophone", 250, "🎷", "gaming"),
    ("MVP", 250, "👑", "gaming"),
    ("GG gravestone", 250, "🪦", "gaming"),
    ("Controller", 500, "🎮", "gaming"),
    ("Let em cook", 750, "🍳", "gaming"),
    ("GG keys", 800, "⌨️", "gaming"),
    ("Gamer ghost", 1000, "👻", "gaming"),
    ("Loot box", 1000, "🎁", "gaming"),
    ("Goat trophy", 1000, "🐐", "gaming"),
    ("Aura Farming", 2500, "😎", "gaming"),
    ("Skull dance", 2500, "💀", "gaming"),
    ("Super GG", 10000, "🚀", "gaming"),

    # Mega & Epic
    ("Hooray", 7000, "🎉", "mega"),
    ("Rock star", 7800, "🎸", "mega"),
    ("Sports car", 9500, "🏎️", "mega"),
    ("Limo", 10000, "🚘", "mega"),
    ("Trifle smash", 10000, "🍰", "mega"),
    ("Matsuri", 12000, "🏮", "mega"),
    ("Seal splash", 12000, "🦭", "mega"),
    ("Ball party", 12000, "⚽", "mega"),
    ("Gamer corgi", 15000, "🐶", "mega"),
    ("Tokyo Night", 15000, "🗼", "mega"),
    ("Night market", 15500, "🎪", "mega"),
    ("Idol Life", 17000, "🎤", "mega"),
    ("Victory spin", 17000, "🏆", "mega"),
    ("Castle", 18000, "🏰", "mega"),
    ("Racing game", 20000, "🏎️", "mega"),
    ("Happy Birthday", 20000, "🎂", "mega"),
    ("Seaside", 22500, "🌊", "mega"),

    # Snacks & Emotes
    ("Star", 2, "⭐", "emotes"),
    ("Sparkles", 2, "✨", "emotes"),
    ("100", 2, "💯", "emotes"),
    ("Treat", 5, "🦴", "emotes"),
    ("Chili", 6, "🌶️", "emotes"),
    ("Garlic", 20, "🧄", "emotes"),
    ("Party hat", 20, "🎉", "emotes"),
    ("Fox on donut", 60, "🍩", "emotes"),
    ("Finger heart", 350, "🫰", "emotes"),
    ("Fuljhadi spark", 500, "🎇", "emotes"),
    ("Latte", 600, "☕", "emotes"),
    ("Mic drop", 600, "🎤", "emotes"),
    ("Trophy cake", 1000, "🎂", "emotes"),
    ("Guitar", 1000, "🎸", "emotes"),
    ("Bubble heart", 1500, "🫧", "emotes"),
    ("Falling leaves", 5000, "🍂", "emotes"),
    ("Biscuit tin", 5000, "🍪", "emotes"),
    ("Sushi", 5500, "🍣", "emotes"),
    ("Hot pot", 6800, "🍲", "emotes"),
]

# Generate HTML for gift cards
gift_cards_html = []
for name, val, emoji, cat in gifts:
    take_inr = round(val * 0.005 * 86.85, 2)
    take_str = f"~₹{round(take_inr):,}" if take_inr >= 100 else f"~₹{take_inr:.2f}"
    gift_cards_html.append(f'''        <div class="gift-preset-card" data-jewels="{val}" data-cat="{cat}"
          style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 1.6rem;">{emoji}</span>
            <span class="pill-badge pill-purple" style="font-weight: 700; font-size: 0.72rem;">{val:,} 💎</span>
          </div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="{name}">{name}</div>
          <div class="gift-take-label" style="font-size: 0.78rem; color: #10b981; font-weight: 700; margin-top: 3px;">Take: {take_str}</div>
        </div>''')

rendered_gifts_grid = "\\n".join(gift_cards_html)

# Read youtube-jewels-calculator.html
with open('frontend/youtube-jewels-calculator.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Title and Meta
html = re.sub(
    r'<title>[^<]+</title>',
    '<title>YouTube Live Stream Gifts &amp; Jewels to INR/USD Calculator (2026) — TubeMetrix</title>',
    html
)
html = re.sub(
    r'<meta name="description"[^>]+>',
    '<meta name="description" content="Calculate real creator earnings from YouTube Live stream gifts, stickers, and Jewels in INR (₹) and USD ($). View actual YouTube India bundle prices and fan spend vs creator net payout.">',
    html
)

# 2. Update Hero Section
old_hero = re.search(r'<section class="hero-section".*?</section>', html, re.DOTALL)
if old_hero:
    new_hero = '''<section class="hero-section" style="max-width: 760px; margin: 0 auto 28px auto; text-align: center;">
      <div class="hero-badge" style="margin-bottom: 10px;">
        <span class="pulse-dot"></span>
        <span>LIVE STREAM GIFTS &amp; STICKERS CALCULATOR</span>
      </div>
      <h1 class="hero-title" style="margin-bottom: 8px;">YouTube Live Stream Gifts &amp; Jewels Calculator</h1>
      <p class="hero-subtitle" style="font-size: 0.98rem; color: var(--text-secondary); max-width: 620px; margin: 0 auto; line-height: 1.5;">
        Convert YouTube live gifts, stickers &amp; Jewels into real money (₹ INR &amp; $ USD). See exact Creator Net Take vs Fan Purchase Cost.
      </p>
    </section>'''
    html = html.replace(old_hero.group(0), new_hero)

# 3. Update Manual Jewels Converter Card
old_conv = re.search(r'<!-- 2\. Manual Jewels Converter Card -->.*?</section>', html, re.DOTALL)
if old_conv:
    new_conv = f'''<!-- 2. Manual Jewels Converter Card -->
    <section class="config-card" style="max-width: 860px; margin: 0 auto 32px auto; padding: 26px 28px; border-radius: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">
            💎 Instant Jewels &amp; Gifts Payout Calculator
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
            Enter any Jewels count or pick an official pack preset to see your real take-home cash.
          </p>
        </div>
        <span class="pill-badge pill-green" id="forexRateBadge" style="font-size: 0.76rem; padding: 5px 12px; border-radius: 9999px;">$1 USD = ₹86.85 INR</span>
      </div>

      <!-- Quick Preset Chips (Aligned to Official YouTube Bundles) -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; align-items: center;">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Packs:</span>
        <button type="button" class="jewel-preset-chip" data-jewels="50">50</button>
        <button type="button" class="jewel-preset-chip" data-jewels="300">300</button>
        <button type="button" class="jewel-preset-chip" data-jewels="700">700</button>
        <button type="button" class="jewel-preset-chip" data-jewels="1500">1,500</button>
        <button type="button" class="jewel-preset-chip active" data-jewels="1000">1,000</button>
        <button type="button" class="jewel-preset-chip" data-jewels="4000">4,000</button>
        <button type="button" class="jewel-preset-chip" data-jewels="8000">8,000</button>
        <button type="button" class="jewel-preset-chip" data-jewels="20000">20,000</button>
      </div>

      <!-- Main Input Box -->
      <div class="input-row" style="margin-bottom: 20px;">
        <div class="input-wrapper" style="flex: 1;">
          <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="6 3 18 3 22 9 12 22 2 9 6 3"></polygon>
          </svg>
          <input type="text" id="calcJewelsInput" value="1000" placeholder="Enter Jewels (e.g. 1000)"
            autocomplete="off" style="font-size: 1.05rem; font-weight: 700; font-family: 'JetBrains Mono', monospace;">
        </div>
      </div>

      <!-- 4 Real-time Value Calculation Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 14px;">
        <div class="kpi-card highlight">
          <span class="kpi-badge">Net Creator Take (INR)</span>
          <div class="kpi-amount" id="calcInrVal" style="color: #10b981; font-size: 1.45rem;">₹434.25</div>
          <span class="kpi-sub" id="calcInrSub">~₹0.43 net in Bank</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-badge">Net Creator Take (USD)</span>
          <div class="kpi-amount" id="calcUsdVal" style="color: #10b981; font-size: 1.45rem;">$5.00</div>
          <span class="kpi-sub">$0.005 net per Jewel</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-badge">Total Jewels Spent</span>
          <div class="kpi-amount" id="calcJewelsVal" style="color: #8b5cf6; font-size: 1.45rem;">1,000 💎</div>
          <span class="kpi-sub">Total gifts value</span>
        </div>

        <div class="kpi-card">
          <span class="kpi-badge">Fan Purchase Cost</span>
          <div class="kpi-amount" id="calcFanCostVal" style="color: #f59e0b; font-size: 1.45rem;">~₹1,200</div>
          <span class="kpi-sub">Official YouTube app cost</span>
        </div>
      </div>

      <div id="calcFormulaNote" style="font-size: 0.82rem; color: var(--text-muted); text-align: center; line-height: 1.5; background: var(--bg-card); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
        💡 YouTube Formula: <strong>1 Jewel = $0.005 USD Net Creator Take</strong> (1,000 Jewels = $5.00 USD ≈ ₹434 INR). 
        <span style="opacity: 0.85;">(In YouTube Studio backend, this is calculated as 2 Jewels = 1 Ruby = $0.01 USD).</span>
      </div>
    </section>'''
    html = html.replace(old_conv.group(0), new_conv)

# 4. Update Popular Gifts Catalog
old_catalog = re.search(r'<!-- 3\. Popular Gifts Catalog -->.*?</section>', html, re.DOTALL)
if old_catalog:
    new_catalog = f'''<!-- 3. Real YouTube Gifts & Stickers Catalog -->
    <section class="info-section" style="max-width: 860px; margin: 0 auto 32px auto; padding: 0 16px;">
      <div style="text-align: center; margin-bottom: 16px;">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>🎁</span> Live YouTube Stream Gifts &amp; Stickers Catalog
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
          All official stickers live in the YouTube mobile app. Click any sticker to calculate instant creator payout.
        </p>
      </div>

      <!-- Category Filter Pills -->
      <div id="giftCategoryTabs" style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 18px;">
        <button type="button" class="preset-chip active" data-filter="all">All Gifts (74)</button>
        <button type="button" class="preset-chip" data-filter="indian">🇮🇳 Desi Specials (20)</button>
        <button type="button" class="preset-chip" data-filter="gaming">🎮 Gaming &amp; Memes (18)</button>
        <button type="button" class="preset-chip" data-filter="mega">💎 Mega Gifts (17)</button>
        <button type="button" class="preset-chip" data-filter="emotes">🍿 Snacks &amp; Emotes (19)</button>
      </div>

      <!-- 74 Real Gift Cards Grid -->
      <div id="giftsGridContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; max-height: 520px; overflow-y: auto; padding: 8px; border: 1px solid var(--border-color); border-radius: 14px; background: var(--bg-surface);">
{rendered_gifts_grid}
      </div>
    </section>'''
    html = html.replace(old_catalog.group(0), new_catalog)

# 5. Insert Official YouTube India "Get Jewels" Packs Breakdown
table_block = '''<!-- 4. Official YouTube India "Get Jewels" Packs Breakdown -->
    <section class="config-card" style="max-width: 860px; margin: 0 auto 32px auto; padding: 24px 26px; border-radius: 18px;">
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
          <span>🛒</span> YouTube India "Get Jewels" Bundle Prices &amp; Revenue Split
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
          Actual prices fans pay on the YouTube mobile app vs what the streamer receives.
        </p>
      </div>

      <div class="table-card" style="overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px 12px;">Jewels Pack</th>
              <th style="text-align: right; padding: 10px 12px;">Fan Pays (INR)</th>
              <th style="text-align: right; padding: 10px 12px;">Price Per Jewel</th>
              <th style="text-align: right; padding: 10px 12px;">Creator Takes (Net INR)</th>
              <th style="text-align: right; padding: 10px 12px;">Creator Takes (USD)</th>
              <th style="text-align: center; padding: 10px 12px;">Streamer Share</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px 12px;"><strong>💎 50 Jewels</strong></td>
              <td style="text-align: right; color: var(--text-primary); font-weight: 600; padding: 10px 12px;">₹95</td>
              <td style="text-align: right; color: var(--text-muted); padding: 10px 12px;">₹1.90</td>
              <td style="text-align: right; color: #10b981; font-weight: 700; padding: 10px 12px;">₹21.71</td>
              <td style="text-align: right; color: #10b981; padding: 10px 12px;">$0.25</td>
              <td style="text-align: center; padding: 10px 12px;"><span class="pill-badge pill-amber">~23%</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px;"><strong>💎 300 Jewels</strong></td>
              <td style="text-align: right; color: var(--text-primary); font-weight: 600; padding: 10px 12px;">₹479</td>
              <td style="text-align: right; color: var(--text-muted); padding: 10px 12px;">₹1.60</td>
              <td style="text-align: right; color: #10b981; font-weight: 700; padding: 10px 12px;">₹130.28</td>
              <td style="text-align: right; color: #10b981; padding: 10px 12px;">$1.50</td>
              <td style="text-align: center; padding: 10px 12px;"><span class="pill-badge pill-amber">~27%</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px;"><strong>💎 700 Jewels</strong></td>
              <td style="text-align: right; color: var(--text-primary); font-weight: 600; padding: 10px 12px;">₹959</td>
              <td style="text-align: right; color: var(--text-muted); padding: 10px 12px;">₹1.37</td>
              <td style="text-align: right; color: #10b981; font-weight: 700; padding: 10px 12px;">₹303.98</td>
              <td style="text-align: right; color: #10b981; padding: 10px 12px;">$3.50</td>
              <td style="text-align: center; padding: 10px 12px;"><span class="pill-badge pill-green">~32%</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px;"><strong>💎 1,500 Jewels</strong></td>
              <td style="text-align: right; color: var(--text-primary); font-weight: 600; padding: 10px 12px;">₹1,900</td>
              <td style="text-align: right; color: var(--text-muted); padding: 10px 12px;">₹1.27</td>
              <td style="text-align: right; color: #10b981; font-weight: 700; padding: 10px 12px;">₹651.38</td>
              <td style="text-align: right; color: #10b981; padding: 10px 12px;">$7.50</td>
              <td style="text-align: center; padding: 10px 12px;"><span class="pill-badge pill-green">~34%</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px;"><strong>💎 4,000 Jewels</strong></td>
              <td style="text-align: right; color: var(--text-primary); font-weight: 600; padding: 10px 12px;">₹4,799</td>
              <td style="text-align: right; color: var(--text-muted); padding: 10px 12px;">₹1.20</td>
              <td style="text-align: right; color: #10b981; font-weight: 700; padding: 10px 12px;">₹1,737.00</td>
              <td style="text-align: right; color: #10b981; padding: 10px 12px;">$20.00</td>
              <td style="text-align: center; padding: 10px 12px;"><span class="pill-badge pill-green">~36%</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 12px;"><strong>💎 8,000 Jewels</strong></td>
              <td style="text-align: right; color: var(--text-primary); font-weight: 600; padding: 10px 12px;">₹9,500</td>
              <td style="text-align: right; color: var(--text-muted); padding: 10px 12px;">₹1.19</td>
              <td style="text-align: right; color: #10b981; font-weight: 700; padding: 10px 12px;">₹3,474.00</td>
              <td style="text-align: right; color: #10b981; padding: 10px 12px;">$40.00</td>
              <td style="text-align: center; padding: 10px 12px;"><span class="pill-badge pill-purple">~37%</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 10px; margin-bottom: 0;">
        * Note: Remainder goes toward Google Play / Apple App Store in-app transaction fees (up to 30%) and YouTube platform infrastructure costs.
      </p>
    </section>'''

old_econ = re.search(r'<!-- 4\. YouTube Jewels & Rubies Economics Breakdown -->.*?</section>', html, re.DOTALL)
if old_econ:
    html = html.replace(old_econ.group(0), table_block)

with open('frontend/youtube-jewels-calculator.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('youtube-jewels-calculator.html updated successfully!')
