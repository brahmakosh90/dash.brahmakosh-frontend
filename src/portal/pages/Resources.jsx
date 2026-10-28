import { Icon, Card, PageHead } from '../components/ui.jsx';
import { ME, partnerOf, copyText, download, toast } from '../store.js';

const BANNERS = [['Instagram post · 1080×1080', 1080, 1080], ['Story / Reel cover · 1080×1920', 1080, 1920], ['Link preview · 1200×628', 1200, 628]];
const CAPTIONS = [
  'Five quiet minutes a day changed how I start my mornings. I use Brahmakosh for guided meditation and prayer — join me with my code {code} 🙏',
  'Looking for a daily sadhana habit that actually sticks? Try Brahmakosh. Download with my link and use code {code}.',
  'From mantra chanting to mindful breathing — Brahmakosh keeps my practice consistent. Start free with {code} ✨',
];

const bannerSvg = (w, h, code, link) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2f8f"/><stop offset=".6" stop-color="#4f46e5"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.85}" cy="${h * 0.15}" r="${Math.min(w, h) * 0.28}" fill="#fff" opacity=".08"/><g font-family="Segoe UI,Arial,sans-serif" fill="#fff" text-anchor="middle"><text x="${w / 2}" y="${h * 0.3}" font-size="${Math.min(w, h) * 0.075}" font-weight="700" letter-spacing="6" opacity=".85">BRAHMAKOSH</text><text x="${w / 2}" y="${h * 0.48}" font-size="${Math.min(w, h) * 0.095}" font-weight="800">Your daily practice,</text><text x="${w / 2}" y="${h * 0.48 + Math.min(w, h) * 0.12}" font-size="${Math.min(w, h) * 0.095}" font-weight="800">made simple</text><rect x="${w * 0.25}" y="${h * 0.7}" width="${w * 0.5}" height="${Math.min(w, h) * 0.12}" rx="${Math.min(w, h) * 0.06}" fill="#fff"/><text x="${w / 2}" y="${h * 0.7 + Math.min(w, h) * 0.082}" font-size="${Math.min(w, h) * 0.058}" font-weight="800" fill="#4338ca">Use code ${code}</text><text x="${w / 2}" y="${h * 0.7 + Math.min(w, h) * 0.2}" font-size="${Math.min(w, h) * 0.04}" opacity=".9">${link}</text></g></svg>`;

export default {
  name: 'MarketingResources',
  setup() {
    return () => {
      const me = partnerOf(ME);
      return (
        <div class="pp-stack">
          <PageHead title="Marketing Resources" sub="Ready-made banners and captions that already carry your referral code." />
          <Card title="Branded banners" sub="Download as SVG — scales to any size without losing quality">
            <div class="pp-grid pp-g3">{BANNERS.map(([label, w, h]) => {
              const svg = bannerSvg(w, h, me.code, `brahmakosh.com/r/${me.code}`);
              return (
                <div class="pp-card" style={{ padding: '14px', boxShadow: 'none' }} key={label}>
                  <div style={{ background: '#f4f5fb', borderRadius: '10px', padding: '10px', display: 'grid', placeItems: 'center', height: '210px' }}>
                    <img alt={label} src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} style={{ maxWidth: '100%', maxHeight: '190px', borderRadius: '6px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px', gap: '8px' }}><b style={{ flex: 1, fontSize: '13px' }}>{label}</b>
                    <button class="pp-btn ghost sm" onClick={() => { download(`brahmakosh-banner-${w}x${h}.svg`, svg, 'image/svg+xml'); toast('Banner downloaded'); }}><Icon name="download" size={14} />SVG</button></div>
                </div>
              );
            })}</div>
          </Card>
          <Card title="Caption templates" sub="Copy, paste and post">
            <div class="pp-list">{CAPTIONS.map((c) => { const text = c.replace('{code}', me.code); return (
              <div key={c}><span class="pp-ico indigo"><Icon name="message" size={16} /></span><div class="pp-grow">{text}</div><button class="pp-btn ghost sm" onClick={() => copyText(text, 'Caption copied')}><Icon name="copy" size={14} />Copy</button></div>
            ); })}</div>
          </Card>
        </div>
      );
    };
  },
};
