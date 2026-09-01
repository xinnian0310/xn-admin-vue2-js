import request from '@/utils/request'

function listModels() {
  return request.get('/ai/models')
}

function listProviders() {
  return request.get('/ai/providers')
}

function pageProviders(params) {
  return request.get('/ai/providers/page', { params })
}

function createModel(data) {
  return request.post('/ai/models', data)
}

function updateModel(id, data) {
  return request.put(`/ai/models/${id}`, data)
}

function deleteModel(id) {
  return request.delete(`/ai/models/${id}`)
}

function testModel(id, silent = false) {
  return request.post(`/ai/models/${id}/test`, undefined, {
    timeout: 20000,
    silentError: silent,
  })
}

function saveProviderCredential(providerId, apiKey) {
  return request.put(`/ai/providers/${providerId}/credential`, {
    apiKey,
  })
}

function updateModelStatus(id, status) {
  return request.put(`/ai/models/${id}/status`, { status })
}

function listRemoteModels(providerId) {
  return request.get(`/ai/providers/${providerId}/remote-models`, { timeout: 20000 })
}

/** 用已有的拉取模型接口探测密钥，避免依赖尚未重启的新接口 */
async function probeProviderCredentials(ids) {
  const checks = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await listRemoteModels(id)
        return {
          id,
          keyConfigured: true,
          keyMask: res.data?.keyMask,
          lastCheckOk: res.data?.lastCheckOk ?? true,
          lastCheckAt: res.data?.lastCheckAt ?? null,
        }
      } catch {
        return {
          id,
          keyConfigured: true,
          lastCheckOk: false,
        }
      }
    }),
  )
  return checks
}

export {
  createModel,
  deleteModel,
  listModels,
  listProviders,
  listRemoteModels,
  pageProviders,
  probeProviderCredentials,
  saveProviderCredential,
  testModel,
  updateModel,
  updateModelStatus,
}
