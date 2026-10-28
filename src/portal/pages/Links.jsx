import { ref, computed, watch, onMounted } from 'vue';
import QRCode from 'qrcode';
import { Icon, Card, Kpi, PageHead, CopyField, DataTable, Seg, Badge } from '../components/ui.jsx';
import { LineChart, Donut, COLORS } from '../components/charts.jsx';
import { state, ME, partnerOf, copyText, download, toast, dailySeries, bucketSeries, partnerTotals, money, num, pct, rate, ageDays } from '../store.js';

export default {
  name: 'ReferralLinks',
  setup() {
    const me = partnerOf(ME);
    const campaignId = ref('');
    const qrSvg = ref('');
    const days = ref(30);

    const options = computed(() => state.campaigns.filter((c) => c.partnerId === ME && (c.general || ['active', 'scheduled'].includes(c.status))));
    const current = computed(() => options.value.find((c) => c.id === campaignId.value) || options.value[0]);
    const code = computed(() => current.value.code);
    const link = computed(() => `https://brahmakosh.com/r/${code.value}${current.value.general ? '' : '?utm_campaign=' + current.value.code.toLowerCase()}`);
    const message = computed(() => `Join me on Brahmakosh — your daily companion for meditation, prayer and spiritual growth 🙏 Download the app and sign up with my code ${code.value}: ${link.value}`);

    const renderQR = async () => { qrSvg.value = await QRCode.toString(link.value, { type: 'svg', margin: 0, errorCorrectionLevel: 'H', color: { dark: '#151a33', light: '#ffffff' } }); };
    onMounted(renderQR); watch(link, renderQR);

    const downloadQR = async (kind) => {
      if (kind === 'svg') return download(`brahmakosh-qr-${code.value}.svg`, qrSvg.value, 'image/svg+xml');
      const url = await QRCode.toDataURL(link.value, { width: 1024, margin: 2, errorCorrectionLevel: 'H' });
      const a = document.createElement('a'); a.href = url; a.download = `brahmakosh-qr-${code.value}.png`; a.click(); toast('QR code downloaded');
    };

    const share = (net) => {
      const u = encodeURIComponent(link.value); const t = encodeURIComponent(message.value);
      const urls = { whatsapp: `https://wa.me/?text=${t}`, telegram: `https://t.me/share/url?url=${u}&text=${encodeURIComponent('Join me on Brahmakosh 🙏 Code: ' + code.value)}`, x: `https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on Brahmakosh 🙏 Code ' + code.value)}&url=${u}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`, linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, email: `mailto:?subject=${encodeURIComponent('Try Brahmakosh')}&body=${t}` };
      window.open(urls[net], '_blank', 'noopener');
    };
    const nativeShare = () => (navigator.share ? navigator.share({ title: 'Brahmakosh', text: message.value, url: link.value }).catch(() => {}) : copyText(message.value, 'Share message copied'));

    const scope = computed(() => state.referrals.filter((r) => ageDays(r.installAt) < days.value && (current.value.general ? true : r.campaignId === current.value.id)));
    const byChannel = computed(() => {
      const m = {}; scope.value.forEach((r) => { m[r.channel] = m[r.channel] || { channel: r.channel, installs: 0, regs: 0 }; m[r.channel].installs++; if (r.status === 'registered') m[r.channel].regs++; });
      return Object.values(m).sort((a, b) => b.installs - a.installs).map((x) => ({ ...x, id: x.channel, conv: rate(x.regs, x.installs) }));
    });
    const series = computed(() => bucketSeries(dailySeries({ partnerId: ME, days: days.value, campaignId: current.value.general ? 'all' : current.value.id }), days.value > 45 ? 'weekly' : 'daily'));
    const tot = computed(() => series.value.reduce((a, r) => ({ clicks: a.clicks + r.clicks, installs: a.installs + r.installs, regs: a.regs + r.regs }), { clicks: 0, installs: 0, regs: 0 }));
    const palette = [COLORS.green, COLORS.indigo, COLORS.amber, COLORS.blue, COLORS.violet, COLORS.red, COLORS.gray];

    return () => (
      <div class="pp-stack">
        <PageHead title="Referral Links & Codes" sub="Your unique link and code, with sharing tools and click-to-conversion tracking.">
          <select class="pp-select" style={{ width: 'auto' }} value={current.value.id} onChange={(e) => (campaignId.value = e.target.value)} aria-label="Campaign">
            {options.value.map((c) => <option key={c.id} value={c.id}>{c.general ? 'Direct link (no campaign)' : `${c.name} · ${c.code}`}</option>)}
          </select>
        </PageHead>

        <div class="pp-grid pp-g-2-1">
          <Card title="Your referral link & code" sub={current.value.general ? 'Permanent link, works without a campaign' : `Campaign link · ${current.value.name}`}>
            <div class="pp-form">
              <label class="pp-field"><span>Referral link</span><CopyField value={link.value} onCopy={() => copyText(link.value, 'Referral link copied')} /></label>
              <label class="pp-field"><span>Referral code</span><CopyField value={code.value} onCopy={() => copyText(code.value, 'Referral code copied')} />
                <small>New users can enter this code at sign-up if they do not use your link.</small></label>
              <div class="pp-field"><span>Share on</span>
                <div class="pp-share">
                  <button onClick={() => share('whatsapp')}><Icon name="message" size={16} />WhatsApp</button>
                  <button onClick={() => share('telegram')}><Icon name="send" size={16} />Telegram</button>
                  <button onClick={() => share('facebook')}><Icon name="share" size={16} />Facebook</button>
                  <button onClick={() => share('x')}><Icon name="share" size={16} />X</button>
                  <button onClick={() => share('linkedin')}><Icon name="share" size={16} />LinkedIn</button>
                  <button onClick={() => share('email')}><Icon name="mail" size={16} />Email</button>
                  <button onClick={nativeShare}><Icon name="external" size={16} />More…</button>
                </div>
              </div>
              <div class="pp-field"><span>Ready-to-send message</span><textarea class="pp-textarea" readonly value={message.value} />
                <div style={{ marginTop: '8px' }}><button class="pp-btn ghost sm" onClick={() => copyText(message.value, 'Message copied')}><Icon name="copy" size={14} />Copy message</button></div></div>
            </div>
          </Card>
          <Card title="QR code" sub="Scan to open your link">
            <div class="pp-qr" role="img" aria-label={`QR code for ${code.value}`} innerHTML={qrSvg.value} />
            <div style={{ textAlign: 'center', marginTop: '12px' }}><span class="pp-chip">{code.value}</span></div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
              <button class="pp-btn ghost sm" onClick={() => downloadQR('png')}><Icon name="download" size={14} />PNG</button>
              <button class="pp-btn ghost sm" onClick={() => downloadQR('svg')}><Icon name="download" size={14} />SVG</button>
            </div>
          </Card>
        </div>

        <div class="pp-head" style={{ marginBottom: 0, marginTop: '8px' }}>
          <div><h3 style={{ fontSize: '17px', fontWeight: 800 }}>Click & conversion tracking</h3></div>
          <div class="pp-head-actions"><Seg modelValue={days.value} onChange={(v) => (days.value = v)} options={[[7, '7D'], [30, '30D'], [90, '90D']]} /></div>
        </div>
        <div class="pp-grid pp-g4">
          <Kpi icon="pointer" tone="amber" label="Link clicks" value={num(tot.value.clicks)} foot={`last ${days.value} days`} />
          <Kpi icon="phone" tone="indigo" label="Verified installs" value={num(tot.value.installs)} foot={`${pct(rate(tot.value.installs, tot.value.clicks))} of clicks`} />
          <Kpi icon="userCheck" tone="green" label="Registrations" value={num(tot.value.regs)} foot={`${pct(rate(tot.value.regs, tot.value.installs))} of installs`} />
          <Kpi icon="trendUp" tone="violet" label="Conversion rate" value={pct(rate(tot.value.regs, tot.value.clicks))} foot="click → registration" />
        </div>
        <div class="pp-grid pp-g-2-1">
          <Card title="Clicks vs conversions"><LineChart data={series.value} series={[{ key: 'clicks', label: 'Clicks', color: COLORS.amber }, { key: 'regs', label: 'Registrations', color: COLORS.green }]} height={250} area={false} /></Card>
          <Card title="Where your installs come from" sub="Self-reported channel tag on each link">
            <Donut items={byChannel.value.map((c, i) => ({ label: c.channel, value: c.installs, color: palette[i % palette.length] }))} center={num(scope.value.length)} centerLabel="installs" />
          </Card>
        </div>
        <Card title="Channel performance" flush>
          <DataTable pageSize={7} rows={byChannel.value} columns={[
            { label: 'Channel', render: (r) => <b>{r.channel}</b> }, { label: 'Installs', align: 'r', render: (r) => num(r.installs) },
            { label: 'Registrations', align: 'r', render: (r) => num(r.regs) }, { label: 'Install → Reg', align: 'r', render: (r) => <b>{pct(r.conv)}</b> },
          ]} />
        </Card>
      </div>
    );
  },
};
