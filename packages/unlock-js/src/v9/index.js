import abis from '../abis'
import v8 from '../v8'
import configureUnlock from './configureUnlock'

const {
  getLock,
  grantKey,
  updateKeyPrice,
  withdrawFromLock,
  initializeTemplate,
  isLockManager,
  isKeyGranter,
  addKeyGranter,
  expireAndRefundFor,
  cancelAndRefund,
  shareKey,
  createLock,
  purchaseKey,
  keyManagerOf,
} = v8

export default {
  version: 'v9',
  Unlock: abis.Unlock.v9,
  PublicLock: abis.PublicLock.v9,
  createLock,
  getLock,
  initializeTemplate,
  updateKeyPrice,
  purchaseKey,
  grantKey,
  withdrawFromLock,
  configureUnlock,
  isLockManager,
  isKeyGranter,
  addKeyGranter,
  expireAndRefundFor,
  cancelAndRefund,
  shareKey,
  keyManagerOf,
}
