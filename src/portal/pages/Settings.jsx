import { RouterLink } from 'vue-router';
import { Icon, Card, PageHead, Badge } from '../components/ui.jsx';
import { ChangePassword } from '../components/ChangePassword.jsx';
import { partnerApi } from '../api.js';
import { state, fmtDate } from '../store.js';

export default {
  name: 'PartnerSettings',
  setup() {
    return () => {
      const p = state.payout;
      return (
        <div class="pp-stack">
          <PageHead title="Settings" sub="Account security and payout preferences." />
          <div class="pp-grid pp-g2">
            <ChangePassword submit={(current, next) => partnerApi.post('/partner/password', { current, next })} />
            <Card title="Payout details" sub="Where your approved earnings are sent">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><span class="pp-muted">Verification</span><Badge status={p.status === 'unset' ? 'pending' : p.status} label={p.status === 'unset' ? 'Not added' : undefined} /></div>
              {p.status !== 'unset' ? (
                <dl class="pp-kv" style={{ gridTemplateColumns: '130px 1fr' }}><dt>Account holder</dt><dd>{p.holder}</dd><dt>Bank</dt><dd>{p.bank}</dd><dt>Account no.</dt><dd class="pp-num">•••• {p.last4}</dd><dt>Last updated</dt><dd>{fmtDate(p.updatedAt)}</dd></dl>
              ) : <p class="pp-muted">Add your bank details to be able to withdraw.</p>}
              <div style={{ marginTop: '16px' }}><RouterLink class="pp-btn ghost" to="/partner-portal/withdrawals"><Icon name="bank" size={16} />Manage payout details</RouterLink></div>
            </Card>
          </div>
        </div>
      );
    };
  },
};
