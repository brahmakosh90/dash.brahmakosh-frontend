import { ref, computed } from 'vue';

const TABS = ['Analytics', 'Payment Logs', 'Credit Transactions', 'Subscriptions'];

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const formatRupeesFromCents = (cents) =>
  cents != null && cents !== '' ? `₹${(Number(cents) / 100).toFixed(2)}` : '-';

const getUserId = (userRef) => {
  if (!userRef) return null;
  return typeof userRef === 'object' ? userRef._id : userRef;
};

const getUserEmail = (userRef) => {
  if (!userRef) return 'Unknown';
  return typeof userRef === 'object' ? userRef.email || 'Unknown' : String(userRef);
};

const eventBadgeClass = (event) => {
  if (event === 'confirm') return 'bg-success';
  if (event === 'error') return 'bg-danger';
  if (event === 'create_intent') return 'bg-primary';
  return 'bg-secondary';
};

const subStatusBadgeClass = (status) => {
  if (status === 'active' || status === 'trialing') return 'bg-success';
  if (status === 'canceled') return 'bg-danger';
  if (status === 'past_due' || status === 'unpaid') return 'bg-warning';
  if (status === 'incomplete' || status === 'incomplete_expired' || status === 'paused') return 'bg-secondary';
  return 'bg-secondary';
};

const ModalOverlay = ({ onClose, children, wide }) => (
  <div
    class="modal fade show d-block"
    style={{ zIndex: 1050 }}
    tabindex="-1"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div class={`modal-dialog modal-dialog-centered ${wide ? 'modal-xl modal-dialog-scrollable' : ''}`}>
      <div class="modal-content">{children}</div>
    </div>
    <div class="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
  </div>
);

const PaginationBar = ({ page, totalPages, total, onPrev, onNext }) => (
  <div class="d-flex justify-content-between align-items-center mt-3">
    <span class="text-muted">
      Page {page} of {totalPages} ({total} total)
    </span>
    <div class="btn-group">
      <button class="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={onPrev}>
        Previous
      </button>
      <button class="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={onNext}>
        Next
      </button>
    </div>
  </div>
);

const RevenueChart = ({ monthlyRevenue }) => {
  if (!monthlyRevenue?.length) {
    return <p class="text-muted mb-0">No revenue data found</p>;
  }

  const maxAmount = Math.max(...monthlyRevenue.map((m) => m.amountRupees || 0), 1);
  const chartW = 600;
  const chartH = 200;
  const barW = 70;
  const gap = 20;
  const startX = 40;

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} class="w-100" style={{ maxHeight: '280px' }}>
      {monthlyRevenue.map((item, i) => {
        const barHeight = Math.max(((item.amountRupees || 0) / maxAmount) * 140, item.amountRupees > 0 ? 4 : 0);
        const x = startX + i * (barW + gap);
        const y = chartH - barHeight;
        return (
          <g key={`${item.month}-${item.year}`}>
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" class="small fill-secondary">
              ₹{item.amountRupees || 0}
            </text>
            <rect x={x} y={y} width={barW} height={barHeight} fill="#0d6efd" rx="4" />
            <text x={x + barW / 2} y={chartH + 22} textAnchor="middle" class="small fill-secondary">
              {item.month} {String(item.year).slice(-2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export function createPaymentManagementView({ name, title, apiMethods }) {
  return {
    name,
    setup() {
      const activeTab = ref('Analytics');
      const loading = ref(false);
      const error = ref('');

      const analytics = ref(null);

      const logs = ref([]);
      const logsPage = ref(1);
      const logsTotal = ref(0);
      const logsLimit = ref(25);
      const logsUserIdSearch = ref('');

      const credits = ref([]);
      const creditsPage = ref(1);
      const creditsTotal = ref(0);
      const creditsLimit = ref(25);

      const subscriptions = ref([]);
      const subsPage = ref(1);
      const subsTotal = ref(0);
      const subsLimit = ref(25);

      const historyModal = ref(null);
      const historyLoading = ref(false);
      const historyTab = ref('logs');

      const adjustModal = ref(false);
      const adjustForm = ref({ userId: '', amount: '', description: '' });
      const adjustSubmitting = ref(false);

      const cancelModal = ref(null);
      const cancelImmediately = ref(false);
      const cancelSubmitting = ref(false);

      const logsTotalPages = computed(() => Math.max(Math.ceil(logsTotal.value / logsLimit.value), 1));
      const creditsTotalPages = computed(() => Math.max(Math.ceil(creditsTotal.value / creditsLimit.value), 1));
      const subsTotalPages = computed(() => Math.max(Math.ceil(subsTotal.value / subsLimit.value), 1));

      const fetchAnalytics = async () => {
        loading.value = true;
        error.value = '';
        try {
          const res = await apiMethods.getAnalytics();
          analytics.value = res.data || null;
        } catch (e) {
          error.value = e.message || 'Failed to load analytics';
          analytics.value = null;
        } finally {
          loading.value = false;
        }
      };

      const fetchLogs = async () => {
        loading.value = true;
        error.value = '';
        try {
          const params = { page: logsPage.value, limit: logsLimit.value };
          if (logsUserIdSearch.value.trim()) params.userId = logsUserIdSearch.value.trim();
          const res = await apiMethods.getLogs(params);
          logs.value = res.data?.logs || [];
          logsTotal.value = res.data?.total || 0;
          logsPage.value = res.data?.page || logsPage.value;
        } catch (e) {
          error.value = e.message || 'Failed to load payment logs';
          logs.value = [];
        } finally {
          loading.value = false;
        }
      };

      const fetchCredits = async () => {
        loading.value = true;
        error.value = '';
        try {
          const res = await apiMethods.getCredits({ page: creditsPage.value, limit: creditsLimit.value });
          credits.value = res.data?.credits || [];
          creditsTotal.value = res.data?.total || 0;
          creditsPage.value = res.data?.page || creditsPage.value;
        } catch (e) {
          error.value = e.message || 'Failed to load credit transactions';
          credits.value = [];
        } finally {
          loading.value = false;
        }
      };

      const fetchSubscriptions = async () => {
        loading.value = true;
        error.value = '';
        try {
          const res = await apiMethods.getSubscriptions({ page: subsPage.value, limit: subsLimit.value });
          subscriptions.value = res.data?.subscriptions || [];
          subsTotal.value = res.data?.total || 0;
          subsPage.value = res.data?.page || subsPage.value;
        } catch (e) {
          error.value = e.message || 'Failed to load subscriptions';
          subscriptions.value = [];
        } finally {
          loading.value = false;
        }
      };

      const loadActiveTab = () => {
        if (activeTab.value === 'Analytics') fetchAnalytics();
        else if (activeTab.value === 'Payment Logs') fetchLogs();
        else if (activeTab.value === 'Credit Transactions') fetchCredits();
        else if (activeTab.value === 'Subscriptions') fetchSubscriptions();
      };

      const switchTab = (tab) => {
        activeTab.value = tab;
        loadActiveTab();
      };

      const openUserHistory = async (userId) => {
        if (!userId) return;
        historyLoading.value = true;
        historyTab.value = 'logs';
        historyModal.value = { userId, data: null };
        try {
          const res = await apiMethods.getUserHistory(userId);
          historyModal.value = { userId, data: res.data || null };
        } catch (e) {
          historyModal.value = { userId, data: null, error: e.message || 'Failed to load user history' };
        } finally {
          historyLoading.value = false;
        }
      };

      const submitAdjustCredits = async () => {
        const userId = adjustForm.value.userId.trim();
        const amount = Number(adjustForm.value.amount);
        if (!userId) {
          error.value = 'User ID is required';
          return;
        }
        if (!amount || Number.isNaN(amount) || amount === 0) {
          error.value = 'Amount must be a non-zero number';
          return;
        }
        adjustSubmitting.value = true;
        error.value = '';
        try {
          await apiMethods.adjustCredits(userId, amount, adjustForm.value.description || undefined);
          adjustModal.value = false;
          adjustForm.value = { userId: '', amount: '', description: '' };
          if (activeTab.value === 'Credit Transactions') fetchCredits();
          else if (activeTab.value === 'Analytics') fetchAnalytics();
        } catch (e) {
          error.value = e.message || 'Failed to adjust credits';
        } finally {
          adjustSubmitting.value = false;
        }
      };

      const submitCancelSubscription = async () => {
        if (!cancelModal.value?.subId) return;
        cancelSubmitting.value = true;
        error.value = '';
        try {
          await apiMethods.cancelSubscription(cancelModal.value.subId, cancelImmediately.value);
          cancelModal.value = null;
          cancelImmediately.value = false;
          fetchSubscriptions();
        } catch (e) {
          error.value = e.message || 'Failed to cancel subscription';
        } finally {
          cancelSubmitting.value = false;
        }
      };

      const EmailLink = ({ userRef }) => {
        const userId = getUserId(userRef);
        const email = getUserEmail(userRef);
        return (
          <button
            type="button"
            class="btn btn-link btn-sm p-0 text-start"
            onClick={() => openUserHistory(userId)}
          >
            {email}
          </button>
        );
      };

      loadActiveTab();

      return () => (
        <div class="card">
          <div class="card-body">
            <h1 class="card-title mb-4">{title}</h1>

            <ul class="nav nav-tabs mb-3">
              {TABS.map((tab) => (
                <li key={tab} class="nav-item">
                  <button
                    type="button"
                    class={`nav-link ${activeTab.value === tab ? 'active' : ''}`}
                    onClick={() => switchTab(tab)}
                  >
                    {tab}
                  </button>
                </li>
              ))}
            </ul>

            {error.value && (
              <div class="alert alert-danger" role="alert">
                {error.value}
              </div>
            )}

            {loading.value && (
              <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {!loading.value && activeTab.value === 'Analytics' && (
              <div>
                {!analytics.value ? (
                  <p class="text-muted">No data found</p>
                ) : (
                  <>
                    <div class="row g-3 mb-4">
                      <div class="col-md-4 col-lg">
                        <div class="card border-0 bg-light">
                          <div class="card-body">
                            <div class="text-muted small">Total Revenue</div>
                            <div class="fs-4 fw-semibold">₹{analytics.value.totalRevenueRupees || 0}</div>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-4 col-lg">
                        <div class="card border-0 bg-light">
                          <div class="card-body">
                            <div class="text-muted small">Total Payments</div>
                            <div class="fs-4 fw-semibold">{analytics.value.totalPayments || 0}</div>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-4 col-lg">
                        <div class="card border-0 bg-light">
                          <div class="card-body">
                            <div class="text-muted small">Failed Payments</div>
                            <div class="fs-4 fw-semibold text-danger">{analytics.value.failedPayments || 0}</div>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-4 col-lg">
                        <div class="card border-0 bg-light">
                          <div class="card-body">
                            <div class="text-muted small">Active Subscriptions</div>
                            <div class="fs-4 fw-semibold text-success">{analytics.value.activeSubscriptions || 0}</div>
                          </div>
                        </div>
                      </div>
                      <div class="col-md-4 col-lg">
                        <div class="card border-0 bg-light">
                          <div class="card-body">
                            <div class="text-muted small">Total Credits Granted</div>
                            <div class="fs-4 fw-semibold">{analytics.value.totalCreditsGranted || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="card mb-4">
                      <div class="card-header bg-white">
                        <strong>Monthly Revenue (Last 6 Months)</strong>
                      </div>
                      <div class="card-body">
                        <RevenueChart monthlyRevenue={analytics.value.monthlyRevenue} />
                      </div>
                    </div>

                    <div class="card">
                      <div class="card-header bg-white">
                        <strong>Top 5 Paying Users</strong>
                      </div>
                      <div class="card-body p-0">
                        {!analytics.value.topPayingUsers?.length ? (
                          <p class="text-muted p-3 mb-0">No data found</p>
                        ) : (
                          <div class="table-responsive">
                            <table class="table table-striped table-hover mb-0">
                              <thead class="table-light">
                                <tr>
                                  <th>Email</th>
                                  <th>Name</th>
                                  <th>Total Paid</th>
                                  <th>Payments</th>
                                  <th>Current Credits</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.value.topPayingUsers.map((u) => (
                                  <tr key={u.userId}>
                                    <td>
                                      <EmailLink userRef={{ _id: u.userId, email: u.email }} />
                                    </td>
                                    <td>{u.name || '-'}</td>
                                    <td>₹{u.totalAmountRupees || 0}</td>
                                    <td>{u.paymentCount || 0}</td>
                                    <td>{u.currentCredits ?? 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {!loading.value && activeTab.value === 'Payment Logs' && (
              <div>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <input
                    type="text"
                    class="form-control"
                    style={{ maxWidth: '320px' }}
                    placeholder="Search by User ID..."
                    value={logsUserIdSearch.value}
                    onInput={(e) => (logsUserIdSearch.value = e.target.value)}
                    onKeydown={(e) => e.key === 'Enter' && (() => { logsPage.value = 1; fetchLogs(); })()}
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary"
                    onClick={() => { logsPage.value = 1; fetchLogs(); }}
                  >
                    Search
                  </button>
                </div>

                {!logs.value.length ? (
                  <p class="text-muted">No data found</p>
                ) : (
                  <div class="table-responsive">
                    <table class="table table-striped table-hover">
                      <thead class="table-light">
                        <tr>
                          <th>User Email</th>
                          <th>Event</th>
                          <th>Amount</th>
                          <th>Credits</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.value.map((log) => (
                          <tr key={log._id}>
                            <td><EmailLink userRef={log.userId} /></td>
                            <td>
                              <span class={`badge ${eventBadgeClass(log.event)}`}>{log.event}</span>
                            </td>
                            <td>{formatRupeesFromCents(log.amountCents)}</td>
                            <td>{log.credits ?? '-'}</td>
                            <td>{log.status || '-'}</td>
                            <td>{formatDate(log.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <PaginationBar
                  page={logsPage.value}
                  totalPages={logsTotalPages.value}
                  total={logsTotal.value}
                  onPrev={() => { if (logsPage.value > 1) { logsPage.value -= 1; fetchLogs(); } }}
                  onNext={() => { if (logsPage.value < logsTotalPages.value) { logsPage.value += 1; fetchLogs(); } }}
                />
              </div>
            )}

            {!loading.value && activeTab.value === 'Credit Transactions' && (
              <div>
                <div class="d-flex justify-content-end mb-3">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => {
                      error.value = '';
                      adjustForm.value = { userId: '', amount: '', description: '' };
                      adjustModal.value = true;
                    }}
                  >
                    Adjust Credits
                  </button>
                </div>

                {!credits.value.length ? (
                  <p class="text-muted">No data found</p>
                ) : (
                  <div class="table-responsive">
                    <table class="table table-striped table-hover">
                      <thead class="table-light">
                        <tr>
                          <th>User Email</th>
                          <th>Amount</th>
                          <th>Previous Balance</th>
                          <th>New Balance</th>
                          <th>Added By Role</th>
                          <th>Description</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credits.value.map((tx) => (
                          <tr key={tx._id}>
                            <td><EmailLink userRef={tx.userId} /></td>
                            <td class={tx.amount >= 0 ? 'text-success' : 'text-danger'}>
                              {tx.amount >= 0 ? '+' : ''}{tx.amount}
                            </td>
                            <td>{tx.previousBalance}</td>
                            <td>{tx.newBalance}</td>
                            <td>
                              <span class="badge bg-info">{tx.addedByRole}</span>
                            </td>
                            <td>{tx.description || '-'}</td>
                            <td>{formatDate(tx.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <PaginationBar
                  page={creditsPage.value}
                  totalPages={creditsTotalPages.value}
                  total={creditsTotal.value}
                  onPrev={() => { if (creditsPage.value > 1) { creditsPage.value -= 1; fetchCredits(); } }}
                  onNext={() => { if (creditsPage.value < creditsTotalPages.value) { creditsPage.value += 1; fetchCredits(); } }}
                />
              </div>
            )}

            {!loading.value && activeTab.value === 'Subscriptions' && (
              <div>
                {!subscriptions.value.length ? (
                  <p class="text-muted">No data found</p>
                ) : (
                  <div class="table-responsive">
                    <table class="table table-striped table-hover">
                      <thead class="table-light">
                        <tr>
                          <th>User Email</th>
                          <th>Plan Name</th>
                          <th>Billing Type</th>
                          <th>Status</th>
                          <th>Period End</th>
                          <th>Cancel At Period End</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.value.map((sub) => (
                          <tr key={sub._id}>
                            <td><EmailLink userRef={sub.userId} /></td>
                            <td>{sub.planId?.name || '-'}</td>
                            <td>{sub.planId?.billingType || '-'}</td>
                            <td>
                              <span class={`badge ${subStatusBadgeClass(sub.status)}`}>{sub.status}</span>
                            </td>
                            <td>{formatDate(sub.currentPeriodEnd)}</td>
                            <td>{sub.cancelAtPeriodEnd ? 'Yes' : 'No'}</td>
                            <td>
                              {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                                <button
                                  type="button"
                                  class="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    error.value = '';
                                    cancelImmediately.value = false;
                                    cancelModal.value = {
                                      subId: sub._id,
                                      email: getUserEmail(sub.userId),
                                      planName: sub.planId?.name || 'Plan',
                                    };
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <PaginationBar
                  page={subsPage.value}
                  totalPages={subsTotalPages.value}
                  total={subsTotal.value}
                  onPrev={() => { if (subsPage.value > 1) { subsPage.value -= 1; fetchSubscriptions(); } }}
                  onNext={() => { if (subsPage.value < subsTotalPages.value) { subsPage.value += 1; fetchSubscriptions(); } }}
                />
              </div>
            )}

            {adjustModal.value && (
              <ModalOverlay onClose={() => (adjustModal.value = false)}>
                <div class="modal-header">
                  <h5 class="modal-title">Adjust Credits</h5>
                  <button type="button" class="btn-close" onClick={() => (adjustModal.value = false)}></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label">User ID</label>
                    <input
                      type="text"
                      class="form-control"
                      value={adjustForm.value.userId}
                      onInput={(e) => (adjustForm.value.userId = e.target.value)}
                      placeholder="Paste user MongoDB ID"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Amount (+ add, - deduct)</label>
                    <input
                      type="number"
                      class="form-control"
                      value={adjustForm.value.amount}
                      onInput={(e) => (adjustForm.value.amount = e.target.value)}
                      placeholder="e.g. 100 or -50"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Description</label>
                    <input
                      type="text"
                      class="form-control"
                      value={adjustForm.value.description}
                      onInput={(e) => (adjustForm.value.description = e.target.value)}
                      placeholder="Reason for adjustment"
                    />
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onClick={() => (adjustModal.value = false)}>
                    Close
                  </button>
                  <button
                    type="button"
                    class="btn btn-primary"
                    disabled={adjustSubmitting.value}
                    onClick={submitAdjustCredits}
                  >
                    {adjustSubmitting.value ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </ModalOverlay>
            )}

            {cancelModal.value && (
              <ModalOverlay onClose={() => (cancelModal.value = null)}>
                <div class="modal-header">
                  <h5 class="modal-title">Cancel Subscription</h5>
                  <button type="button" class="btn-close" onClick={() => (cancelModal.value = null)}></button>
                </div>
                <div class="modal-body">
                  <p>
                    Cancel subscription for <strong>{cancelModal.value.email}</strong> (
                    {cancelModal.value.planName})?
                  </p>
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="cancelImmediately"
                      checked={cancelImmediately.value}
                      onChange={(e) => (cancelImmediately.value = e.target.checked)}
                    />
                    <label class="form-check-label" for="cancelImmediately">
                      Cancel immediately (otherwise cancels at period end)
                    </label>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onClick={() => (cancelModal.value = null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger"
                    disabled={cancelSubmitting.value}
                    onClick={submitCancelSubscription}
                  >
                    {cancelSubmitting.value ? 'Cancelling...' : 'Confirm Cancel'}
                  </button>
                </div>
              </ModalOverlay>
            )}

            {historyModal.value && (
              <ModalOverlay wide onClose={() => (historyModal.value = null)}>
                <div class="modal-header">
                  <h5 class="modal-title">
                    User Payment History
                    {historyModal.value.data?.user?.email && (
                      <span class="text-muted fs-6 ms-2">— {historyModal.value.data.user.email}</span>
                    )}
                  </h5>
                  <button type="button" class="btn-close" onClick={() => (historyModal.value = null)}></button>
                </div>
                <div class="modal-body">
                  {historyLoading.value && (
                    <div class="text-center py-3">
                      <div class="spinner-border spinner-border-sm text-primary"></div>
                    </div>
                  )}

                  {!historyLoading.value && historyModal.value.error && (
                    <div class="alert alert-danger">{historyModal.value.error}</div>
                  )}

                  {!historyLoading.value && historyModal.value.data && (
                    <>
                      <div class="mb-3">
                        <span class="badge bg-secondary me-2">
                          Current Credits: {historyModal.value.data.user?.credits ?? 0}
                        </span>
                      </div>

                      <ul class="nav nav-tabs mb-3">
                        {['logs', 'credits', 'subscriptions'].map((t) => (
                          <li key={t} class="nav-item">
                            <button
                              type="button"
                              class={`nav-link ${historyTab.value === t ? 'active' : ''}`}
                              onClick={() => (historyTab.value = t)}
                            >
                              {t === 'logs' ? 'Payment Logs' : t === 'credits' ? 'Credit Transactions' : 'Subscriptions'}
                            </button>
                          </li>
                        ))}
                      </ul>

                      {historyTab.value === 'logs' && (
                        !historyModal.value.data.paymentLogs?.length ? (
                          <p class="text-muted">No data found</p>
                        ) : (
                          <div class="table-responsive">
                            <table class="table table-sm table-striped">
                              <thead>
                                <tr>
                                  <th>Event</th>
                                  <th>Amount</th>
                                  <th>Credits</th>
                                  <th>Status</th>
                                  <th>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {historyModal.value.data.paymentLogs.map((log) => (
                                  <tr key={log._id}>
                                    <td><span class={`badge ${eventBadgeClass(log.event)}`}>{log.event}</span></td>
                                    <td>{formatRupeesFromCents(log.amountCents)}</td>
                                    <td>{log.credits ?? '-'}</td>
                                    <td>{log.status || '-'}</td>
                                    <td>{formatDate(log.createdAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}

                      {historyTab.value === 'credits' && (
                        !historyModal.value.data.creditTxns?.length ? (
                          <p class="text-muted">No data found</p>
                        ) : (
                          <div class="table-responsive">
                            <table class="table table-sm table-striped">
                              <thead>
                                <tr>
                                  <th>Amount</th>
                                  <th>Previous</th>
                                  <th>New</th>
                                  <th>Role</th>
                                  <th>Description</th>
                                  <th>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {historyModal.value.data.creditTxns.map((tx) => (
                                  <tr key={tx._id}>
                                    <td class={tx.amount >= 0 ? 'text-success' : 'text-danger'}>
                                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                                    </td>
                                    <td>{tx.previousBalance}</td>
                                    <td>{tx.newBalance}</td>
                                    <td><span class="badge bg-info">{tx.addedByRole}</span></td>
                                    <td>{tx.description || '-'}</td>
                                    <td>{formatDate(tx.createdAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}

                      {historyTab.value === 'subscriptions' && (
                        !historyModal.value.data.subscriptions?.length ? (
                          <p class="text-muted">No data found</p>
                        ) : (
                          <div class="table-responsive">
                            <table class="table table-sm table-striped">
                              <thead>
                                <tr>
                                  <th>Plan</th>
                                  <th>Billing</th>
                                  <th>Status</th>
                                  <th>Period End</th>
                                  <th>Cancel At End</th>
                                </tr>
                              </thead>
                              <tbody>
                                {historyModal.value.data.subscriptions.map((sub) => (
                                  <tr key={sub._id}>
                                    <td>{sub.planId?.name || '-'}</td>
                                    <td>{sub.planId?.billingType || '-'}</td>
                                    <td>
                                      <span class={`badge ${subStatusBadgeClass(sub.status)}`}>{sub.status}</span>
                                    </td>
                                    <td>{formatDate(sub.currentPeriodEnd)}</td>
                                    <td>{sub.cancelAtPeriodEnd ? 'Yes' : 'No'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" onClick={() => (historyModal.value = null)}>
                    Close
                  </button>
                </div>
              </ModalOverlay>
            )}
          </div>
        </div>
      );
    },
  };
}
