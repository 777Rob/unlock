const { reverts } = require('truffle-assertions')
const deployLocks = require('../helpers/deployLocks')

const unlockContract = artifacts.require('Unlock.sol')
const getProxy = require('../helpers/proxy')

let unlock
let locks
let tokenId
const ZERO_ADDRESS = web3.utils.padLeft(0, 40)

contract('Lock / burn', (accounts) => {
  let keyOwner = accounts[1]
  let lock

  beforeEach(async () => {
    unlock = await getProxy(unlockContract)
    locks = await deployLocks(unlock, accounts[0])
    lock = locks.FIRST

    const tx = await lock.purchase(
      [],
      [keyOwner],
      [web3.utils.padLeft(0, 40)],
      [web3.utils.padLeft(0, 40)],
      [[]],
      {
        value: web3.utils.toWei('0.01', 'ether'),
      }
    )
    const { args } = tx.logs.find((v) => v.event === 'Transfer')
    const { tokenId: newTokenId } = args
    tokenId = newTokenId
  })

  it('should delete ownership record', async () => {
    assert.equal(await lock.getHasValidKey.call(keyOwner), true)
    assert.equal(await lock.ownerOf(tokenId), keyOwner)
    await lock.burn(tokenId, { from: keyOwner })
    assert.equal(await lock.getHasValidKey.call(keyOwner), false)
    assert.equal(await lock.ownerOf(tokenId), ZERO_ADDRESS)
  })

  it('emit a transfer event', async () => {
    const tx = await lock.burn(tokenId, { from: keyOwner })
    const { args } = tx.logs.find((v) => v.event === 'Transfer')
    assert.equal(args.tokenId.toNumber(), tokenId.toNumber())
    assert.equal(args.to, ZERO_ADDRESS)
    assert.equal(args.from, keyOwner)
  })

  it('allow key manager to burn a key', async () => {
    await lock.setKeyManagerOf(tokenId, accounts[9], { from: keyOwner })
    assert.equal(await lock.getHasValidKey.call(keyOwner), true)
    assert.equal(await lock.ownerOf(tokenId), keyOwner)
    await lock.burn(tokenId, { from: accounts[9] })
    assert.equal(await lock.getHasValidKey.call(keyOwner), false)
    assert.equal(await lock.ownerOf(tokenId), ZERO_ADDRESS)
  })

  it('should work only on existing keys', async () => {
    await reverts(lock.burn(123), 'NO_SUCH_KEY')
  })

  it('should be callable only by owner', async () => {
    await reverts(
      lock.burn(tokenId, { from: accounts[5] }),
      'ONLY_KEY_MANAGER_OR_APPROVED'
    )
  })
})
