import { ref, onMounted, computed, nextTick } from 'vue';
import api from '../../services/api.js';

const currencySymbol = (c) => ({ INR: '₹', USD: '$', AED: 'AED ' }[c] || '');
const fmtMoney = (minor, c) => `${currencySymbol(c)}${(Number(minor) / 100).toFixed(2)}`;

export default {
  name: 'UserPayment',
  setup() {
    const amount = ref('');
    const loading = ref(false);
    const paying = ref(false);
    const elementReady = ref(false);
    const error = ref(null);
    const success = ref(null);
    const clientSecret = ref(null);
    const stripeInstance = ref(null);
    const elementsInstance = ref(null);
    const paymentElement = ref(null);
    const paymentMountEl = ref(null);
    let stripePromise = null;

    /** 'legacy' = custom INR top-up; 'catalog' = per-client plan PaymentIntent */
    const mainTab = ref('catalog');
    const catalogPlans = ref([]);
    const catalogUserCredits = ref(null);
    const loadingCatalog = ref(false);
    const catalogPlanLabel = ref('');
    const subscribingId = ref(null);

    const amountNum = computed(() => parseFloat(amount.value) || 0);

    const publishableKey = ref('');
    const minAmountUnits = ref(500);
    const creditsPerUnit = ref(2);
    const legacyPlans = ref([]);
    const selectedPlanAmount = ref(null);
    const loadingPlans = ref(false);

    const effectiveAmount = computed(() => {
      if (selectedPlanAmount.value) return selectedPlanAmount.value;
      return amountNum.value;
    });

    const creditsDisplay = computed(() => {
      const amt = effectiveAmount.value;
      if (!amt || amt <= 0) return '—';
      return Math.floor(amt * creditsPerUnit.value);
    });

    const canPay = computed(() => effectiveAmount.value >= minAmountUnits.value && !paying.value);
    const canSubmitPayment = computed(
      () =>
        !!clientSecret.value &&
        !!stripeInstance.value &&
        !!elementsInstance.value &&
        !!paymentElement.value &&
        !!paymentMountEl.value &&
        elementReady.value &&
        !paying.value
    );
    const methodChoice = ref('auto');

    const loadStripe = async (pk) => {
      const key = pk || publishableKey.value || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
      if (!key) return null;
      stripePromise = null;
      const { loadStripe: load } = await import('@stripe/stripe-js');
      stripePromise = load(key);
      return stripePromise;
    };

    const clearPaymentForm = () => {
      clientSecret.value = null;
      elementReady.value = false;
      catalogPlanLabel.value = '';
      if (paymentElement.value) {
        try {
          paymentElement.value.unmount();
        } catch (_) {}
      }
      paymentElement.value = null;
      elementsInstance.value = null;
    };

    const initPayment = async () => {
      if (!clientSecret.value) return;
      error.value = null;
      elementReady.value = false;
      try {
        await nextTick();
        await new Promise((r) => requestAnimationFrame(r));

        if (!paymentMountEl.value) {
          throw new Error('Payment form container not ready. Please try again.');
        }

        if (paymentElement.value) {
          try {
            paymentElement.value.unmount();
          } catch (_) {}
          paymentElement.value = null;
        }
        elementsInstance.value = null;

        const stripe = await loadStripe(publishableKey.value);
        if (!stripe) {
          error.value = 'Stripe not configured. Missing publishable key from backend.';
          return;
        }
        stripeInstance.value = stripe;

        let paymentMethodOrder;
        if (methodChoice.value === 'wallet') {
          paymentMethodOrder = ['apple_pay', 'google_pay', 'link', 'card'];
        } else if (methodChoice.value === 'card') {
          paymentMethodOrder = ['card', 'apple_pay', 'google_pay', 'link'];
        }

        const elements = stripe.elements({
          clientSecret: clientSecret.value,
          appearance: { theme: 'stripe' },
        });
        elementsInstance.value = elements;
        const paymentElementOpts = {
          layout: 'tabs',
          ...(paymentMethodOrder ? { paymentMethodOrder } : {}),
        };
        const paymentEl = elements.create('payment', paymentElementOpts);
        paymentEl.on('ready', () => {
          elementReady.value = true;
        });
        paymentEl.on('loaderror', (evt) => {
          console.error('[Payment] Payment Element loaderror', evt);
          elementReady.value = false;
          error.value = evt?.error?.message || 'Failed to load payment form (Stripe session error)';
        });
        paymentEl.mount(paymentMountEl.value);
        paymentElement.value = paymentEl;
      } catch (e) {
        console.error('[Payment] initPayment error', e);
        error.value = e?.message || 'Failed to initialize payment form';
        elementReady.value = false;
      }
    };

    const createIntent = async () => {
      if (!canPay.value) return;
      loading.value = true;
      error.value = null;
      success.value = null;
      clearPaymentForm();
      try {
        const body = selectedPlanAmount.value ? { planAmount: selectedPlanAmount.value } : { amount: amountNum.value };

        const res = await api.request('/user/payment/create-intent', {
          method: 'POST',
          body,
        });
        if (!res?.success || !res?.clientSecret) throw new Error(res?.message || 'Failed to create payment');
        clientSecret.value = res.clientSecret;
        if (res.publishableKey) publishableKey.value = res.publishableKey;
        catalogPlanLabel.value = `Pay ₹${Number(effectiveAmount.value || 0).toFixed(0)}`;
        await loadStripe(res.publishableKey || publishableKey.value);
        await initPayment();
      } catch (e) {
        console.error('[Payment] createIntent error', e);
        error.value = e?.message || 'Failed to initialize payment';
      } finally {
        loading.value = false;
      }
    };

    const startCatalogPlanPayment = async (plan) => {
      if (plan.billingType !== 'one_time' || plan.offerPriceMinorUnits < 1) return;
      loading.value = true;
      error.value = null;
      success.value = null;
      clearPaymentForm();
      try {
        const res = await api.createUserPlanPaymentIntent(plan._id || plan.id);
        if (!res?.success || !res?.clientSecret) throw new Error(res?.message || 'Failed to create payment');
        clientSecret.value = res.clientSecret;
        if (res.publishableKey) publishableKey.value = res.publishableKey;
        catalogPlanLabel.value = `${plan.name} — ${fmtMoney(res.amountMinorUnits ?? plan.offerPriceMinorUnits, plan.currency)}`;
        await loadStripe(res.publishableKey || publishableKey.value);
        await initPayment();
      } catch (e) {
        console.error('[Payment] catalog intent error', e);
        error.value = e?.message || 'Failed to initialize payment';
      } finally {
        loading.value = false;
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

      if (params.get('sub') === 'ok') {
        success.value = 'Subscription checkout completed. Credits are added when Stripe confirms payment (usually within a minute).';
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }
      if (params.get('sub') === 'cancel') {
        error.value = 'Subscription checkout was cancelled.';
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (!paymentIntentId || status !== 'succeeded') return;

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
        loadingPlans.value = true;
        const [configRes, plansRes] = await Promise.all([
          api.request('/user/payment/config', { method: 'GET' }),
          api.request('/user/payment/plans', { method: 'GET' }),
        ]);

        if (configRes?.success) {
          if (configRes.minAmountUnits) minAmountUnits.value = configRes.minAmountUnits;
        }

        if (plansRes?.success) {
          creditsPerUnit.value = plansRes.data?.creditsPerUnit || creditsPerUnit.value;
          legacyPlans.value = Array.isArray(plansRes.data?.plans) ? plansRes.data.plans : [];
        }
      } catch (e) {
        console.error('[Payment] loadConfigAndPlans error', e);
      } finally {
        loadingPlans.value = false;
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
            Current balance: <strong>{catalogUserCredits.value}</strong> credits
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
                        disabled={loading.value}
                        onClick={() => startCatalogPlanPayment(p)}
                        style={{
                          marginTop: 'auto',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#111827',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: loading.value ? 'wait' : 'pointer',
                        }}
                      >
                        Pay with Stripe
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
                          background: '#2563eb',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {subscribingId.value === (p._id || p.id) ? 'Redirecting…' : 'Subscribe (Stripe Checkout)'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(clientSecret.value || mainTab.value === 'legacy') && (
          <div style={{ ...card, padding: '1.5rem' }}>
            {mainTab.value === 'legacy' && (
              <>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  {['auto', 'wallet', 'card'].map((mode) => {
                    const labels = {
                      auto: 'Auto (Stripe)',
                      wallet: 'Apple / Google Pay',
                      card: 'Card only',
                    };
                    const active = methodChoice.value === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          methodChoice.value = mode;
                          if (clientSecret.value && mainTab.value === 'legacy') {
                            if (paymentElement.value) {
                              try {
                                paymentElement.value.unmount();
                              } catch (_) {}
                              paymentElement.value = null;
                            }
                            initPayment();
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0.5rem',
                          borderRadius: '999px',
                          border: active ? '1px solid #111827' : '1px solid #d1d5db',
                          background: active ? '#111827' : '#f9fafb',
                          color: active ? '#ffffff' : '#374151',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {legacyPlans.value.map((p) => {
                    const active = selectedPlanAmount.value === p.amount;
                    return (
                      <button
                        key={p.amount}
                        type="button"
                        onClick={() => {
                          selectedPlanAmount.value = p.amount;
                          amount.value = String(p.amount);
                        }}
                        style={{
                          padding: '0.75rem 0.9rem',
                          borderRadius: '10px',
                          border: active ? '1px solid #111827' : '1px solid #e5e7eb',
                          background: active ? '#111827' : '#f9fafb',
                          color: active ? '#ffffff' : '#111827',
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

                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>
                  Custom amount (₹)
                </label>
                <input
                  type="number"
                  min={minAmountUnits.value}
                  step="1"
                  value={amount.value}
                  onInput={(e) => {
                    amount.value = e.target.value;
                    selectedPlanAmount.value = null;
                  }}
                  placeholder={`e.g. ${minAmountUnits.value}`}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.8rem', color: '#6b7280' }}>
                  1 ₹ = {creditsPerUnit.value} credits. You will receive <strong>{creditsDisplay.value}</strong> credits. Min ₹
                  {minAmountUnits.value}.
                </p>
              </>
            )}

            {mainTab.value === 'legacy' && !clientSecret.value && (
              <button
                disabled={!canPay.value || loading.value}
                onClick={createIntent}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: canPay.value && !loading.value ? '#111827' : '#9ca3af',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: canPay.value && !loading.value ? 'pointer' : 'not-allowed',
                }}
              >
                {loading.value ? 'Loading...' : 'Continue to payment'}
              </button>
            )}

            {clientSecret.value && (
              <>
                {mainTab.value === 'catalog' && catalogPlanLabel.value && (
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#374151' }}>{catalogPlanLabel.value}</p>
                )}
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                  {['auto', 'wallet', 'card'].map((mode) => {
                    const labels = {
                      auto: 'Auto',
                      wallet: 'Wallets',
                      card: 'Card',
                    };
                    const active = methodChoice.value === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          methodChoice.value = mode;
                          if (paymentElement.value) {
                            try {
                              paymentElement.value.unmount();
                            } catch (_) {}
                            paymentElement.value = null;
                          }
                          initPayment();
                        }}
                        style={{
                          flex: 1,
                          padding: '0.35rem 0.5rem',
                          borderRadius: '999px',
                          border: active ? '1px solid #111827' : '1px solid #d1d5db',
                          background: active ? '#111827' : '#f9fafb',
                          color: active ? '#ffffff' : '#374151',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
                <div ref={paymentMountEl} style={{ marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      clearPaymentForm();
                      error.value = null;
                    }}
                    style={{
                      flex: 1,
                      padding: '0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#374151',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!canSubmitPayment.value}
                    onClick={handleSubmit}
                    style={{
                      flex: 1,
                      padding: '0.85rem 1.25rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: canSubmitPayment.value ? '#111827' : '#9ca3af',
                      color: 'white',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: canSubmitPayment.value ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {paying.value ? 'Processing…' : mainTab.value === 'catalog' ? 'Pay now' : `Pay ₹${Number(effectiveAmount.value || 0).toFixed(0)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
};
