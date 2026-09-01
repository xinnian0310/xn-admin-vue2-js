import request from '@/utils/request'
import { downloadWithAuth } from '@/utils/download'

function adminListProviders() {
  return request.get('/ai/admin/providers')
}

function adminPageProviders(params) {
  return request.get('/ai/admin/providers/page', { params })
}

function adminCreateProvider(data) {
  return request.post('/ai/admin/providers', data)
}

function adminUpdateProvider(id, data) {
  return request.put(`/ai/admin/providers/${id}`, data)
}

function adminDisableProvider(id) {
  return request.delete(`/ai/admin/providers/${id}`)
}

function adminDeleteProvider(id) {
  return request.post(`/ai/admin/providers/${id}/remove`)
}

function adminCreateProviderModel(providerId, data) {
  return request.post(`/ai/admin/providers/${providerId}/models`, data)
}

function adminUpdateProviderModel(providerId, id, data) {
  return request.put(`/ai/admin/providers/${providerId}/models/${id}`, data)
}

function adminDisableProviderModel(providerId, id) {
  return request.delete(`/ai/admin/providers/${providerId}/models/${id}`)
}

function adminTestProviderModel(id, apiKey) {
  return request.post(`/ai/admin/providers/models/${id}/test`, apiKey ? { apiKey } : {}, {
    timeout: 20000,
  })
}

function adminGetTrial() {
  return request.get('/ai/admin/trial')
}

function adminUpdateTrial(data) {
  return request.put('/ai/admin/trial', data)
}

function adminTestTrial() {
  return request.post('/ai/admin/trial/test', undefined, {
    timeout: 20000,
  })
}

function adminGetQuotaSummary(month) {
  return request.get('/ai/admin/quota/summary', {
    params: month ? { month } : undefined,
  })
}

function adminListSensitiveWords() {
  return request.get('/ai/admin/sensitive-words')
}

function adminCreateSensitiveWord(data) {
  return request.post('/ai/admin/sensitive-words', data)
}

function adminUpdateSensitiveWord(id, data) {
  return request.put(`/ai/admin/sensitive-words/${id}`, data)
}

function adminDeleteSensitiveWord(id) {
  return request.delete(`/ai/admin/sensitive-words/${id}`)
}

function adminListQuota(params) {
  return request.get('/ai/admin/quota', { params })
}

function adminUpdateQuota(userId, data) {
  return request.put(`/ai/admin/quota/${userId}`, data)
}

function adminDeleteQuotaOverride(userId) {
  return request.delete(`/ai/admin/quota/${userId}`)
}

function adminResetQuota(userId) {
  return request.post(`/ai/admin/quota/${userId}/reset`)
}

function adminExportUsage(month) {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return downloadWithAuth(
    `/api/ai/admin/usage/export${qs}`,
    `ai-usage${month ? '-' + month : ''}.csv`,
  )
}

function adminGetSettings() {
  return request.get('/ai/admin/settings')
}

function adminUpdateSettings(data) {
  return request.put('/ai/admin/settings', data)
}

export {
  adminCreateProvider,
  adminCreateProviderModel,
  adminCreateSensitiveWord,
  adminDeleteProvider,
  adminDeleteQuotaOverride,
  adminDeleteSensitiveWord,
  adminDisableProvider,
  adminDisableProviderModel,
  adminExportUsage,
  adminGetQuotaSummary,
  adminGetSettings,
  adminGetTrial,
  adminListProviders,
  adminListQuota,
  adminListSensitiveWords,
  adminPageProviders,
  adminResetQuota,
  adminTestProviderModel,
  adminTestTrial,
  adminUpdateProvider,
  adminUpdateProviderModel,
  adminUpdateQuota,
  adminUpdateSensitiveWord,
  adminUpdateSettings,
  adminUpdateTrial,
}
