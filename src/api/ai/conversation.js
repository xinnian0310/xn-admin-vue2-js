import request from '@/utils/request'

function listConversations(params) {
  return request.get('/ai/conversations', { params })
}

function createConversation(data) {
  return request.post('/ai/conversations', data ?? {})
}

function updateConversation(id, data) {
  return request.put(`/ai/conversations/${id}`, data)
}

function deleteConversation(id) {
  return request.delete(`/ai/conversations/${id}`)
}

function listMessages(id, params) {
  return request.get(`/ai/conversations/${id}/messages`, { params })
}

export {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  updateConversation,
}
