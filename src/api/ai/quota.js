import request from '@/utils/request'

function getMyQuota() {
  return request.get('/ai/quota/me')
}

export { getMyQuota }
