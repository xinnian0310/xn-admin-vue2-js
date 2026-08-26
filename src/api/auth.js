import axios from 'axios'
import request, { formatRequestError } from '@/utils/request'
import { encryptPasswordWithPem } from '@/utils/password-crypto'

function getPasswordPublicKey() {
  return axios
    .get('/api/auth/password-public-key', { timeout: 1e4 })
    .then((res) => {
      const data = res.data
      if (data.code !== 200 || !data.data?.publicKey) {
        return Promise.reject(new Error(data.message || '获取密码公钥失败'))
      }
      return data
    })
    .catch((error) => {
      return Promise.reject(new Error(formatRequestError(error, '获取密码公钥失败')))
    })
}

async function encryptTransportPassword(plain) {
  const res = await getPasswordPublicKey()
  const pem = res.data?.publicKey
  if (!pem) {
    throw new Error('获取密码公钥失败')
  }
  return encryptPasswordWithPem(plain, pem)
}

async function login(data) {
  return request.post('/auth/login', {
    ...data,
    password: await encryptTransportPassword(data.password),
  })
}
function sendSms(data) {
  return request.post('/auth/sms/send', data, { silentError: true })
}
function loginBySms(data) {
  return request.post('/auth/sms/login', data)
}
async function register(data) {
  return request.post('/auth/register', {
    ...data,
    password: await encryptTransportPassword(data.password),
  })
}
function bindPhone(data) {
  return request.post('/auth/me/phone/bind', data)
}
function logout(token) {
  return request.post(
    '/auth/logout',
    null,
    token ? { headers: { Authorization: `Bearer ${token}` } } : void 0,
  )
}
function fetchCaptcha() {
  return request.get('/auth/captcha')
}
function verifySliderCaptcha(captchaId, percent) {
  return request.post('/auth/captcha/slider', { captchaId, percent })
}
function refreshToken() {
  return request.post('/auth/refresh')
}
function getCurrentUser() {
  return request.get('/auth/me')
}
function updateCurrentUser(data) {
  return request.put('/auth/me', data)
}
function changePassword(data) {
  return request.put('/auth/me/password', data)
}
function getPasswordRules() {
  return request.get('/auth/password-rules')
}
function uploadAvatar(file) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/auth/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
function getAuthMenus() {
  return request.get('/auth/menus')
}
function getApiRegistry() {
  return request.get('/auth/api-registry')
}
export {
  bindPhone,
  changePassword,
  fetchCaptcha,
  getApiRegistry,
  getAuthMenus,
  getCurrentUser,
  getPasswordRules,
  login,
  loginBySms,
  register,
  logout,
  refreshToken,
  sendSms,
  updateCurrentUser,
  uploadAvatar,
  verifySliderCaptcha,
}
