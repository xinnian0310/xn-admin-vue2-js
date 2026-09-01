import request from '@/utils/request'

function getAiSettings() {
  return request.get('/ai/settings')
}

export { getAiSettings }
