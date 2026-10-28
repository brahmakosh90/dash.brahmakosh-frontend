import { Card, PageHead, Callout } from '../components/ui.jsx';
import { ChangePassword } from '../components/ChangePassword.jsx';
import { RULES, money } from '../store.js';
import { staffApi } from '../api.js';
import { staff } from './adminStore.js';

export default {
  name: 'AdminSettings',
  setup() {
    return () => (
      <div class="pp-stack">
        <PageHead title="Settings" sub="Your account security and the programme rules currently in force." />
        <div class="pp-grid pp-g2">
          {staff.source === 'staff'
            ? <ChangePassword submit={(current, next) => staffApi.post('/admin/password', { current, next })} />
            : <Card title="Change password"><Callout tone="info">You are signed in with a platform admin account. Change its password in the main admin console.</Callout></Card>}
          <Card title="Programme rules" sub="Applied automatically across the whole programme">
            <dl class="pp-kv" style={{ gridTemplateColumns: '1fr auto' }}>
              <dt>Commission per eligible registration</dt><dd>{money(RULES.commission)}</dd>
              <dt>Fraud hold before approval</dt><dd>{RULES.holdDays} days</dd>
              <dt>Attribution window</dt><dd>{RULES.attributionDays} days</dd>
              <dt>Minimum withdrawal</dt><dd>{money(RULES.minWithdrawal, 0)}</dd>
              <dt>Payout method</dt><dd>Manual bank transfer</dd>
            </dl>
            <div style={{ marginTop: '14px' }}><Callout tone="info">Rules are set in code so every payout stays consistent and auditable. Ask engineering to change them.</Callout></div>
          </Card>
        </div>
      </div>
    );
  },
};
