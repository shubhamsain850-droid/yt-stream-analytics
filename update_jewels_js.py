with open('frontend/jewels-calc.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update initInteractiveCalculator to support category filter tabs
old_init_calc = '''    // Gift quick-click cards
    document.querySelectorAll('.gift-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const count = parseInt(card.dataset.jewels, 10);
        if (!isNaN(count)) {
          input.value = count;
          document.querySelectorAll('.jewel-preset-chip').forEach(c => {
            if (parseInt(c.dataset.jewels, 10) === count) {
              c.classList.add('active');
            } else {
              c.classList.remove('active');
            }
          });
          recalcInteractive();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    updateGiftCatalogRates();
    recalcInteractive();'''

new_init_calc = '''    // Gift quick-click cards
    document.querySelectorAll('.gift-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const count = parseInt(card.dataset.jewels, 10);
        if (!isNaN(count)) {
          input.value = count;
          document.querySelectorAll('.jewel-preset-chip').forEach(c => {
            if (parseInt(c.dataset.jewels, 10) === count) {
              c.classList.add('active');
            } else {
              c.classList.remove('active');
            }
          });
          recalcInteractive();
          const calcCard = document.getElementById('calcJewelsInput');
          if (calcCard) calcCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Category filter tabs for gifts catalog
    document.querySelectorAll('#giftCategoryTabs button[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#giftCategoryTabs button[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('#giftsGridContainer .gift-preset-card').forEach(card => {
          if (filter === 'all' || card.dataset.cat === filter) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    updateGiftCatalogRates();
    recalcInteractive();'''

if old_init_calc in code:
    code = code.replace(old_init_calc, new_init_calc)
else:
    print('Warning: old_init_calc not matched exactly')

# 2. Update recalcInteractive
old_recalc = '''  function recalcInteractive() {
    const input = document.getElementById('calcJewelsInput');
    if (!input) return;

    let jewels = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(jewels) || jewels < 0) jewels = 0;

    // Official YouTube Conversion:
    // 2 Jewels = 1 Ruby
    // 1 Ruby = $0.01 USD
    const rubies = jewels / 2;
    const creatorUsd = rubies * 0.01;
    const creatorInr = creatorUsd * usdToInrRate;
    const inrPerJewel = jewels > 0 ? (creatorInr / jewels).toFixed(2) : (0.5 * 0.01 * usdToInrRate).toFixed(2);

    // Update main UI elements in calculator card
    setElText('calcRubiesVal', rubies.toLocaleString(undefined, { maximumFractionDigits: 1 }));
    setElText('calcUsdVal', `$${creatorUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setElText('calcInrVal', `₹${(creatorInr >= 100 ? Math.round(creatorInr) : creatorInr.toFixed(2)).toLocaleString()}`);
    setElText('calcInrSub', `~₹${inrPerJewel} net per Jewel`);

    const formulaEl = document.getElementById('calcFormulaNote');
    if (formulaEl) {
      formulaEl.innerHTML = `Formula: <strong>${jewels.toLocaleString()} Jewels ÷ 2 = ${rubies.toLocaleString()} Rubies × $0.01 = $${creatorUsd.toFixed(2)} USD (≈ ₹${Math.round(creatorInr).toLocaleString()})</strong>`;
    }

    // Legacy fallbacks
    setElText('resJewels', jewels.toLocaleString());
    setElText('resRubies', rubies.toLocaleString(undefined, { maximumFractionDigits: 1 }));
    setElText('resUsd', `$${creatorUsd.toFixed(2)} USD`);
    setElText('resInr', `₹${Math.round(creatorInr).toLocaleString()}`);
  }'''

new_recalc = '''  function recalcInteractive() {
    const input = document.getElementById('calcJewelsInput');
    if (!input) return;

    let jewels = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(jewels) || jewels < 0) jewels = 0;

    // Official YouTube Virtual Items Conversion:
    // 1 Jewel = $0.005 USD Net Creator Payout (Tracked in YouTube Studio as 2 Jewels = 1 Ruby = $0.01 USD)
    const creatorUsd = jewels * 0.005;
    const creatorInr = creatorUsd * usdToInrRate;
    const inrPerJewel = jewels > 0 ? (creatorInr / jewels).toFixed(2) : (0.005 * usdToInrRate).toFixed(2);

    // Fan Spend Estimation: Based on official YouTube India packs (~₹1.19 - ₹1.90 / jewel)
    let fanCostInr = 0;
    if (jewels <= 50) fanCostInr = jewels * 1.90;
    else if (jewels <= 300) fanCostInr = jewels * 1.60;
    else if (jewels <= 700) fanCostInr = jewels * 1.37;
    else if (jewels <= 1500) fanCostInr = jewels * 1.27;
    else fanCostInr = jewels * 1.19;

    // Update 4 Real-time KPI Cards
    setElText('calcInrVal', `₹${(creatorInr >= 100 ? Math.round(creatorInr) : creatorInr.toFixed(2)).toLocaleString()}`);
    setElText('calcInrSub', `~₹${inrPerJewel} net in Bank`);
    setElText('calcUsdVal', `$${creatorUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setElText('calcJewelsVal', `${jewels.toLocaleString()} 💎`);
    setElText('calcFanCostVal', `~₹${Math.round(fanCostInr).toLocaleString()}`);

    const formulaEl = document.getElementById('calcFormulaNote');
    if (formulaEl) {
      formulaEl.innerHTML = `💡 YouTube Formula: <strong>${jewels.toLocaleString()} Jewels = $${creatorUsd.toFixed(2)} USD (≈ ₹${Math.round(creatorInr).toLocaleString()}) Net Creator Take</strong>. <span style="opacity: 0.85;">Fan spent ~₹${Math.round(fanCostInr).toLocaleString()} in app bundle. (In YouTube Studio backend, 2 Jewels = 1 Ruby = $0.01 USD).</span>`;
    }

    // Legacy fallbacks
    setElText('calcRubiesVal', (jewels / 2).toLocaleString());
    setElText('resJewels', jewels.toLocaleString());
    setElText('resUsd', `$${creatorUsd.toFixed(2)} USD`);
    setElText('resInr', `₹${Math.round(creatorInr).toLocaleString()}`);
  }'''

if old_recalc in code:
    code = code.replace(old_recalc, new_recalc)
else:
    print('Warning: old_recalc not matched exactly')

# 3. Update renderAuditResults KPI Banner
old_kpi_banner = '''      if (kpiBanner) {
        kpiBanner.innerHTML = `
          <div class="kpi-card highlight">
            <span class="kpi-badge">Net Creator Earnings</span>
            <div class="kpi-amount" style="color: #10b981;">₹${Math.round(creatorInr).toLocaleString()}</div>
            <span class="kpi-sub">approx. $${creatorUsd.toFixed(2)} USD (at ₹${usdToInrRate.toFixed(2)}/USD)</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Total Jewels</span>
              <span class="pill-badge pill-purple">Gifts Sent</span>
            </div>
            <div class="kpi-value">${totalJewels.toLocaleString()}</div>
            <span class="kpi-note">${totalGiftsComboed.toLocaleString()} virtual gifts received</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Rubies Earned</span>
              <span class="pill-badge pill-red">2:1 Ratio</span>
            </div>
            <div class="kpi-value">${rubies.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            <span class="kpi-note">$0.01 USD payout per Ruby</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Gifts &amp; Supporters</span>
              <span class="pill-badge pill-amber">Backers</span>
            </div>
            <div class="kpi-value">${totalGiftsComboed.toLocaleString()}</div>
            <span class="kpi-note">from ${donorsCount.toLocaleString()} unique supporter${donorsCount === 1 ? '' : 's'}</span>
          </div>
        `;
      }'''

new_kpi_banner = '''      if (kpiBanner) {
        kpiBanner.innerHTML = `
          <div class="kpi-card highlight">
            <span class="kpi-badge">Net Creator Earnings</span>
            <div class="kpi-amount" style="color: #10b981;">₹${Math.round(creatorInr).toLocaleString()}</div>
            <span class="kpi-sub">approx. $${creatorUsd.toFixed(2)} USD (at ₹${usdToInrRate.toFixed(2)}/USD)</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Total Jewels Sent</span>
              <span class="pill-badge pill-purple">${totalJewels.toLocaleString()} 💎</span>
            </div>
            <div class="kpi-value">${totalJewels.toLocaleString()}</div>
            <span class="kpi-note">${totalGiftsComboed.toLocaleString()} virtual gifts received</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Estimated Fan Spend</span>
              <span class="pill-badge pill-amber">Retail Bundles</span>
            </div>
            <div class="kpi-value">~₹${Math.round(totalJewels * 1.25).toLocaleString()}</div>
            <span class="kpi-note">Official YouTube app bundle cost</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Gifts &amp; Supporters</span>
              <span class="pill-badge pill-green">Backers</span>
            </div>
            <div class="kpi-value">${totalGiftsComboed.toLocaleString()}</div>
            <span class="kpi-note">from ${donorsCount.toLocaleString()} unique supporter${donorsCount === 1 ? '' : 's'}</span>
          </div>
        `;
      }'''

if old_kpi_banner in code:
    code = code.replace(old_kpi_banner, new_kpi_banner)
else:
    print('Warning: old_kpi_banner not matched exactly')

# 4. Update loadDemoStream
old_demo = '''        data: {
          jewels: [
            { gift_name: 'Panipuri', author: 'Rohan Sharma', quantity: 6, jewels: 60, inr_value: 25.2 },
            { gift_name: 'Panipuri', author: 'Simran_Gamer', quantity: 9, jewels: 90, inr_value: 37.8 },
            { gift_name: 'Samosa', author: 'GamingWithAman', quantity: 8, jewels: 200, inr_value: 84.0 },
            { gift_name: 'Masala Chai', author: 'Sneha_07', quantity: 6, jewels: 300, inr_value: 126.0 },
            { gift_name: 'Mic Drop', author: 'Vikram Rathore', quantity: 4, jewels: 400, inr_value: 168.0 },
            { gift_name: 'Heart Fireworks', author: 'Pooja_Sharma', quantity: 3, jewels: 750, inr_value: 315.0 },
            { gift_name: 'Royal Crown', author: 'MegaFan_Rishi', quantity: 1, jewels: 1000, inr_value: 420.0 },
            { gift_name: 'Golden Castle', author: 'Vipul_VIP', quantity: 1, jewels: 5000, inr_value: 2100.0 }
          ],
          totals: {
            jewels_count: 7800,
            jewels_inr: 3276.0
          }
        }'''

new_demo = '''        data: {
          jewels: [
            { gift_name: 'Aura Farming', author: 'Rohan Sharma', quantity: 1, jewels: 2500, inr_value: 1085.6 },
            { gift_name: 'Samosa', author: 'Simran_Gamer', quantity: 10, jewels: 20, inr_value: 8.7 },
            { gift_name: 'Panipuri', author: 'GamingWithAman', quantity: 15, jewels: 30, inr_value: 13.0 },
            { gift_name: 'Chai toast', author: 'Sneha_07', quantity: 5, jewels: 500, inr_value: 217.1 },
            { gift_name: 'Diya', author: 'Vikram Rathore', quantity: 8, jewels: 800, inr_value: 347.4 },
            { gift_name: 'Guitar', author: 'Pooja_Sharma', quantity: 1, jewels: 1000, inr_value: 434.3 },
            { gift_name: 'Castle', author: 'MegaFan_Rishi', quantity: 1, jewels: 18000, inr_value: 7816.5 },
            { gift_name: 'Seaside', author: 'Vipul_VIP', quantity: 1, jewels: 22500, inr_value: 9770.6 }
          ],
          totals: {
            jewels_count: 45350,
            jewels_inr: 19693.2
          }
        }'''

if old_demo in code:
    code = code.replace(old_demo, new_demo)
else:
    print('Warning: old_demo not matched exactly')

# 5. Update getGiftIcon with real names
old_icon_func = '''  function getGiftIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('panipuri') || n.includes('pani puri') || n.includes('golgappa')) return '🍲';
    if (n.includes('samosa')) return '🥟';
    if (n.includes('chai') || n.includes('tea')) return '☕';
    if (n.includes('mic drop') || n.includes('mic')) return '🎤';
    if (n.includes('heart') || n.includes('firework')) return '💖';
    if (n.includes('crown') || n.includes('royal')) return '👑';
    if (n.includes('castle')) return '🏰';
    if (n.includes('galaxy')) return '🌌';
    if (n.includes('rocket')) return '🚀';
    if (n.includes('fire') || n.includes('flame')) return '🔥';
    if (n.includes('diamond') || n.includes('gem')) return '💎';
    return '🎁';
  }'''

new_icon_func = '''  function getGiftIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('samosa')) return '🥟';
    if (n.includes('panipuri') || n.includes('pani puri')) return '🍲';
    if (n.includes('mango lassi') || n.includes('lassi')) return '🥭';
    if (n.includes('vada pav')) return '🍔';
    if (n.includes('chai toast') || n.includes('chai')) return '☕';
    if (n.includes('diya')) return '🪔';
    if (n.includes('nimbu mirchi') || n.includes('chili')) return '🌶️';
    if (n.includes('vibe hai')) return '🌈';
    if (n.includes('namaste')) return '🙏';
    if (n.includes('arre yaar')) return '🗣️';
    if (n.includes('kem cho')) return '👋';
    if (n.includes('macha')) return '🤙';
    if (n.includes('bas kar')) return '🛑';
    if (n.includes('bindaas')) return '💃';
    if (n.includes('aiyyo')) return '😲';
    if (n.includes('badhai ho')) return '🎊';
    if (n.includes('lucky lifafa')) return '🧧';
    if (n.includes('aura farming')) return '😎';
    if (n.includes('saxophone')) return '🎷';
    if (n.includes('gold coin')) return '🪙';
    if (n.includes('jammin')) return '🐱';
    if (n.includes('op')) return '🔥';
    if (n.includes('ggez')) return '🎮';
    if (n.includes('press f') || n.includes('w')) return '⌨️';
    if (n.includes('trophy cake') || n.includes('goat trophy')) return '🏆';
    if (n.includes('loot box')) return '🎁';
    if (n.includes('guitar') || n.includes('rock star')) return '🎸';
    if (n.includes('gamer ghost')) return '👻';
    if (n.includes('skull dance')) return '💀';
    if (n.includes('seaside')) return '🌊';
    if (n.includes('racing game') || n.includes('sports car')) return '🏎️';
    if (n.includes('castle')) return '🏰';
    if (n.includes('happy birthday') || n.includes('cake')) return '🎂';
    if (n.includes('limo')) return '🚘';
    if (n.includes('matsuri') || n.includes('night market')) return '🏮';
    if (n.includes('tokyo night')) return '🗼';
    if (n.includes('corgi') || n.includes('husky') || n.includes('hound')) return '🐶';
    if (n.includes('mic drop')) return '🎤';
    if (n.includes('heart') || n.includes('pepero')) return '💖';
    if (n.includes('sushi') || n.includes('hot pot') || n.includes('ramen')) return '🍣';
    return '🎁';
  }'''

if old_icon_func in code:
    code = code.replace(old_icon_func, new_icon_func)
else:
    print('Warning: old_icon_func not matched exactly')

with open('frontend/jewels-calc.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('frontend/jewels-calc.js updated successfully!')
