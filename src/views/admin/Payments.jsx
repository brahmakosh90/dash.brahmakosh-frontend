import api from '../../services/api.js';
import { createPaymentManagementView } from '../shared/paymentManagementView.jsx';

export default createPaymentManagementView({
  name: 'AdminPayments',
  title: 'Payments',
  apiMethods: {
    getAnalytics: () => api.getAdminPaymentAnalytics(),
    getLogs: (params) => api.getAdminPaymentLogs(params),
    getCredits: (params) => api.getAdminPaymentCredits(params),
    getSubscriptions: (params) => api.getAdminPaymentSubscriptions(params),
    getUserHistory: (userId) => api.getAdminUserPaymentHistory(userId),
    adjustCredits: (userId, amount, description) => api.adjustAdminUserCredits(userId, amount, description),
    cancelSubscription: (subId, immediately) => api.cancelAdminSubscription(subId, immediately),
  },
});
