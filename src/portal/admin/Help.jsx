import { RouterLink } from 'vue-router';
import { Icon, Card, PageHead, Callout } from '../components/ui.jsx';
import { RULES, money } from '../store.js';

const GUIDES = [
  ['users', 'Approve partners', 'partners', 'Open Partners → Applications. Review the details, then Approve. Rejecting or suspending needs a reason that the partner can see.'],
  ['megaphone', 'Approve campaigns', 'campaigns', 'Partner-requested campaigns wait under “Pending approval”. Approve to schedule or activate them; Pause or Revoke any running campaign.'],
  ['checkCircle', 'Review commissions', 'commissions', `New commissions are held for ${RULES.holdDays} days. After that, approve them in bulk, or reject / reverse suspicious ones with a reason.`],
  ['bank', 'Verify payout details', 'withdrawals', 'When a partner changes bank details, verify the account holder on Withdrawals before any transfer is made.'],
  ['swap', 'Process withdrawals', 'withdrawals', `Approve a request (min ${money(RULES.minWithdrawal, 0)}), send the manual bank transfer, mark it as sent, then reconcile it with the bank reference.`],
  ['shieldAlert', 'Handle fraud flags', 'fraud', 'Mark a flag as under review, then Confirm (reverses the pending commissions, optionally suspends the partner) or Dismiss with a note.'],
  ['key', 'Manage the team', 'roles', 'Super Admins can add team members, change roles and decide which permissions each role has.'],
  ['file', 'Check the audit log', 'audit', 'Every approval, payout, fraud decision and permission change is recorded with who did it and when.'],
];

export default {
  name: 'AdminHelp',
  setup() {
    return () => (
      <div class="pp-stack">
        <PageHead title="Help" sub="A quick guide to the daily admin workflows." />
        <div class="pp-grid pp-g2">{GUIDES.map(([icon, title, to, text]) => (
          <Card key={title}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span class="pp-ico indigo"><Icon name={icon} /></span>
              <div style={{ flex: 1 }}><b style={{ fontSize: '15px' }}>{title}</b><p class="pp-muted" style={{ margin: '4px 0 10px' }}>{text}</p>
                <RouterLink class="pp-btn ghost sm" to={`/partner-portal/admin/${to}`}>Open</RouterLink></div>
            </div>
          </Card>
        ))}</div>
        <Callout tone="info">Something not working? Contact engineering and share the audit-log entry or request time so it can be traced quickly.</Callout>
      </div>
    );
  },
};
