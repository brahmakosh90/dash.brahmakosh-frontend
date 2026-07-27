import api from '../../services/api.js';
import { createPaymentManagementView } from '../shared/paymentManagementView.jsx';

export default createPaymentManagementView({
  name: 'ClientPayments',
  title: 'Payment Management',
  apiMethods: {
    getAnalytics: () => api.getClientPaymentAnalytics(),
    getLogs: (params) => api.getClientPaymentLogs(params),
    getCredits: (params) => api.getClientPaymentCredits(params),
    getSubscriptions: (params) => api.getClientPaymentSubscriptions(params),
    getUserHistory: (userId) => api.getClientUserPaymentHistory(userId),
    adjustCredits: (userId, amount, description) => api.adjustClientUserCredits(userId, amount, description),
    cancelSubscription: (subId, immediately) => api.cancelClientSubscription(subId, immediately),
  },
});
