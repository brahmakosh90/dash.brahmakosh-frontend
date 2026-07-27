import { ref, onMounted, computed } from 'vue';
import api from '../../services/api.js';

const currencySymbol = (c) => ({ INR: '₹', USD: '$', AED: 'AED ' }[c] || '');
const fmtMoney = (minor, c) => `${currencySymbol(c)}${(Number(minor) / 100).toFixed(2)}`;

export default {
  name: 'UserPayment',
  setup() {
    const loading = ref(false);
    const error = ref(null);
    const success = ref(null);
    const mainTab = ref('catalog');
    const catalogPlans = ref([]);
    const catalogUserCredits = ref(null);
    const loadingCatalog = ref(false);
    const subscribingId = ref(null);

    // Legacy INR top-up
    const minAmountUnits = ref(500);
    const creditsPerUnit = ref(2);
    const legacyPlans = ref([]);
    const selectedPlanAmount = ref(null);
    const customAmount = ref('');

    const effectiveAmount = computed(() => selectedPlanAmount.value || parseFloat(customAmount.value) || 0);
    const creditsDisplay = computed(() => {
      const amt = effectiveAmount.value;
      return amt > 0 ? Math.floor(amt * creditsPerUnit.value) : '—';
    });
    const canPay = computed(() => effectiveAmount.value >= minAmountUnits.value && !loading.value);

    const startLegacyCheckout = async () => {
      if (!canPay.value) return;
      loading.value = true;
      error.value = null;
      try {
        const base = window.location.origin + window.location.pathname;
        const body = selectedPlanAmount.value
          ? { planAmount: selectedPlanAmount.value }
          : { amount: parseFloat(customAmount.value) };
        const res = await api.request('/user/payment/legacy-checkout', {
          method: 'POST',
          body: { ...body, successUrl: `${base}?pay=ok`, cancelUrl: `${base}?pay=cancel` },
        });
        if (!res?.success || !res?.checkoutUrl) throw new Error(res?.message || 'Failed to start checkout');
        window.location.href = res.checkoutUrl;
      } catch (e) {
        error.value = e?.message || 'Checkout failed';
      } finally {
        loading.value = false;
      }
    };

    const startCatalogPlanPayment = async (plan) => {
      if (plan.billingType !== 'one_time' || plan.offerPriceMinorUnits < 1) return;
      subscribingId.value = plan._id || plan.id;
      error.value = null;
      try {
        const base = window.location.origin + window.location.pathname;
        const res = await api.createUserOneTimeCheckout(
          plan._id || plan.id,
          `${base}?pay=ok`,
          `${base}?pay=cancel`
        );
        if (!res?.success || !res?.checkoutUrl) throw new Error(res?.message || 'Could not start checkout');
        window.location.href = res.checkoutUrl;
      } catch (e) {
        console.error('[Payment] one-time checkout error', e);
        error.value = e?.message || 'Checkout failed';
      } finally {
        subscribingId.value = null;
      }
    };

    const claimFreePlan = async (plan) => {
      error.value = null;
      success.value = null;
      try {
        const res = await api.claimFreeUserPlan(plan._id || plan.id);
        if (res?.success) {
          success.value = `Claimed ${res.data?.creditsAdded || 0} credits. New balance: ${res.data?.newBalance ?? ''}`;
          const cat = await api.getUserSubscriptionPlansCatalog();
          if (cat?.success) {
            catalogPlans.value = cat.data?.plans || [];
            catalogUserCredits.value = cat.data?.userCredits;
          }
        } else {
          error.value = res?.message || 'Claim failed';
        }
      } catch (e) {
        error.value = e?.message || 'Claim failed';
      }
    };

    const startSubscriptionCheckout = async (plan) => {
      subscribingId.value = plan._id || plan.id;
      error.value = null;
      try {
        const base = window.location.origin + window.location.pathname;
        const res = await api.createUserSubscriptionCheckout(
          plan._id || plan.id,
          `${base}?sub=ok`,
          `${base}?sub=cancel`
        );
        if (!res?.success || !res?.checkoutUrl) throw new Error(res?.message || 'Could not start checkout');
        window.location.href = res.checkoutUrl;
      } catch (e) {
        error.value = e?.message || 'Checkout failed';
      } finally {
        subscribingId.value = null;
      }
    };

    const handleSubmit = async () => {
      if (!canSubmitPayment.value) {
        error.value = 'Payment form is not ready yet. Please wait a moment and try again.';
        return;
      }
      paying.value = true;
      error.value = null;
      try {
        const stripe = await stripeInstance.value;
        const baseUrl = window.location.origin + window.location.pathname;
        const { error: submitError } = await stripe.confirmPayment({
          elements: elementsInstance.value,
          confirmParams: {
            return_url: baseUrl,
            payment_method_data: {
              billing_details: { name: 'Credits Purchase' },
            },
          },
        });
        if (submitError) {
          console.error('[Payment] confirmPayment error', submitError);
          error.value = submitError.message || 'Payment failed';
        }
      } catch (e) {
        console.error('[Payment] handleSubmit exception', e);
        error.value = e?.message || 'Payment failed';
      } finally {
        paying.value = false;
      }
    };

    const processReturnFromStripe = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentIntentId = params.get('payment_intent');
      const status = params.get('redirect_status');

      if (params.get('pay') === 'ok') {
        success.value = 'Payment successful! Credits will be added to your account shortly.';
        window.history.replaceState({}, '', window.location.pathname);
        const cat = await api.getUserSubscriptionPlansCatalog();
        if (cat?.success) {
          catalogPlans.value = cat.data?.plans || [];
          catalogUserCredits.value = cat.data?.userCredits;
        }
        return;
      }
      if (params.get('pay') === 'cancel') {
        error.value = 'Payment was cancelled.';
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      if (params.get('sub') === 'ok') {
        success.value = 'Subscription activated! Credits are added when Stripe confirms payment (usually within a minute).';
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      if (params.get('sub') === 'cancel') {
        error.value = 'Subscription checkout was cancelled.';
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (!paymentIntentId || status !== 'succeeded') return; // legacy inline payment only

      loading.value = true;
      error.value = null;
      try {
        // Try plan confirm first; only fall back to legacy if it's explicitly not a plan intent
        let res = await api.confirmUserPlanPayment(paymentIntentId).catch(() => null);
        if (!res?.success && res?.message?.includes('not a plan purchase')) {
          res = await api.request('/user/payment/confirm', {
            method: 'POST',
            body: { paymentIntentId },
          });
        } else if (!res?.success && !res) {
          res = await api.request('/user/payment/confirm', {
            method: 'POST',
            body: { paymentIntentId },
          });
        }
        if (res?.success) {
          success.value = `Added ${res.data?.creditsAdded || 0} credits. New balance: ${res.data?.newBalance || 0}`;
        } else {
          error.value = res?.message || 'Failed to add credits';
        }
        window.history.replaceState({}, '', window.location.pathname);
        const cat = await api.getUserSubscriptionPlansCatalog();
        if (cat?.success) {
          catalogPlans.value = cat.data?.plans || [];
          catalogUserCredits.value = cat.data?.userCredits;
        }
      } catch (e) {
        console.error('[Payment] processReturnFromStripe error', e);
        error.value = e?.message || 'Failed to add credits';
      } finally {
        loading.value = false;
      }
    };

    const loadConfigAndPlans = async () => {
      try {
        const [configRes, plansRes] = await Promise.all([
          api.request('/user/payment/config', { method: 'GET' }),
          api.request('/user/payment/plans', { method: 'GET' }),
        ]);
        if (configRes?.success && configRes.minAmountUnits) minAmountUnits.value = configRes.minAmountUnits;
        if (plansRes?.success) {
          creditsPerUnit.value = plansRes.data?.creditsPerUnit || creditsPerUnit.value;
          legacyPlans.value = Array.isArray(plansRes.data?.plans) ? plansRes.data.plans : [];
        }
      } catch (e) {
        console.error('[Payment] loadConfigAndPlans error', e);
      }
    };

    const loadCatalog = async () => {
      loadingCatalog.value = true;
      try {
        const res = await api.getUserSubscriptionPlansCatalog();
        if (res?.success) {
          catalogPlans.value = res.data?.plans || [];
          catalogUserCredits.value = res.data?.userCredits;
        }
      } catch (e) {
        console.error('[Payment] loadCatalog', e);
      } finally {
        loadingCatalog.value = false;
      }
    };

    onMounted(() => {
      loadConfigAndPlans();
      loadCatalog();
      processReturnFromStripe();
    });

    const card = {
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    };

    const tabBtn = (active) => ({
      flex: 1,
      padding: '0.65rem 0.75rem',
      borderRadius: '10px',
      border: active ? '1px solid #111827' : '1px solid #e5e7eb',
      background: active ? '#111827' : '#f9fafb',
      color: active ? '#fff' : '#374151',
      fontWeight: 600,
      fontSize: '0.85rem',
      cursor: 'pointer',
    });

    return () => (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
          Credits &amp; plans
        </h1>
        <p style={{ margin: '0 0 1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Buy credits from your organization&apos;s plans (Stripe), or use a custom INR top-up.
        </p>

        {catalogUserCredits.value != null && (
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#111827' }}>
            Current balance: <strong>{Math.floor(catalogUserCredits.value)}</strong> credits
          </p>
        )}

        {error.value && (
          <div style={{ ...card, padding: '0.85rem', marginBottom: '1rem', borderColor: '#fecaca', background: '#fff5f5', color: '#991b1b' }}>
            {error.value}
          </div>
        )}
        {success.value && (
          <div style={{ ...card, padding: '0.85rem', marginBottom: '1rem', borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}>
            {success.value}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            style={tabBtn(mainTab.value === 'catalog')}
            onClick={() => {
              mainTab.value = 'catalog';
              clearPaymentForm();
              error.value = null;
            }}
          >
            Plans from your org
          </button>
          <button
            type="button"
            style={tabBtn(mainTab.value === 'legacy')}
            onClick={() => {
              mainTab.value = 'legacy';
              clearPaymentForm();
              error.value = null;
            }}
          >
            Custom amount (₹)
          </button>
        </div>

        {mainTab.value === 'catalog' && (
          <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>Subscription &amp; packs</h2>
            {loadingCatalog.value ? (
              <p style={{ color: '#6b7280' }}>Loading plans…</p>
            ) : !catalogPlans.value.length ? (
              <p style={{ color: '#6b7280' }}>No plans available for your account yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {catalogPlans.value.map((p) => (
                  <div
                    key={p._id || p.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {p.billingType === 'recurring' ? `Billed every ${p.billingInterval}` : 'One-time pack'}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {fmtMoney(p.offerPriceMinorUnits, p.currency)}
                      {Number(p.mrpMinorUnits) > Number(p.offerPriceMinorUnits) && (
                        <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginLeft: '0.35rem', fontSize: '0.85rem' }}>
                          {fmtMoney(p.mrpMinorUnits, p.currency)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#374151' }}>{p.creditsGranted ?? p.creditsPerGrant} credits</div>
                    {Array.isArray(p.features) && p.features.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                        {p.features.slice(0, 4).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    )}
                    {p.billingType === 'one_time' && p.offerPriceMinorUnits === 0 && (
                      <button
                        type="button"
                        onClick={() => claimFreePlan(p)}
                        style={{
                          marginTop: 'auto',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#059669',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Claim free
                      </button>
                    )}
                    {p.billingType === 'one_time' && p.offerPriceMinorUnits > 0 && (
                      <button
                        type="button"
                        disabled={subscribingId.value === (p._id || p.id)}
                        onClick={() => startCatalogPlanPayment(p)}
                        style={{
                          marginTop: 'auto',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#111827',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: subscribingId.value === (p._id || p.id) ? 'wait' : 'pointer',
                        }}
                      >
                        {subscribingId.value === (p._id || p.id) ? 'Redirecting…' : 'Buy now'}
                      </button>
                    )}
                    {p.billingType === 'recurring' && (
                      <button
                        type="button"
                        disabled={subscribingId.value === (p._id || p.id)}
                        onClick={() => startSubscriptionCheckout(p)}
                        style={{
                          marginTop: 'auto',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#111827',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: subscribingId.value === (p._id || p.id) ? 'wait' : 'pointer',
                        }}
                      >
                        {subscribingId.value === (p._id || p.id) ? 'Redirecting…' : 'Subscribe'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mainTab.value === 'legacy' && (
          <div style={{ ...card, padding: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Top up with INR</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {legacyPlans.value.map((p) => {
                const active = selectedPlanAmount.value === p.amount;
                return (
                  <button
                    key={p.amount}
                    type="button"
                    onClick={() => { selectedPlanAmount.value = p.amount; customAmount.value = ''; }}
                    style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      border: active ? '1px solid #111827' : '1px solid #e5e7eb',
                      background: active ? '#111827' : '#f9fafb',
                      color: active ? '#fff' : '#111827',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>₹{p.amount}</div>
                    <div style={{ fontSize: '0.75rem', color: active ? '#e5e7eb' : '#6b7280' }}>{p.credits} credits</div>
                  </button>
                );
              })}
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.4rem' }}>
              Or enter custom amount (₹)
            </label>
            <input
              type="number"
              min={minAmountUnits.value}
              step="1"
              value={customAmount.value}
              onInput={(e) => { customAmount.value = e.target.value; selectedPlanAmount.value = null; }}
              placeholder={`Min ₹${minAmountUnits.value}`}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                boxSizing: 'border-box',
                marginBottom: '0.5rem',
              }}
            />
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#6b7280' }}>
              1 ₹ = {creditsPerUnit.value} credits &mdash; you will receive <strong>{creditsDisplay.value}</strong> credits
            </p>
            <button
              type="button"
              disabled={!canPay.value}
              onClick={startLegacyCheckout}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                border: 'none',
                background: canPay.value ? '#111827' : '#9ca3af',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: canPay.value ? 'pointer' : 'not-allowed',
              }}
            >
              {loading.value ? 'Redirecting…' : `Pay ₹${effectiveAmount.value > 0 ? effectiveAmount.value : ''} via Stripe`}
            </button>
          </div>
        )}
      </div>
    );
  },
};
