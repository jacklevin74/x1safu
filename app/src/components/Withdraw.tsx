import { useState, useEffect } from 'react'
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token'
import { Transaction } from '@solana/web3.js'
import {
  EXPLORER, IS_TESTNET,
  getProgram, getPutMintPDA, getSafeMintPDA,
  getTokenBalance, toBaseUnits
} from '../lib/vault'

export function Withdraw() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const anchorWallet = useAnchorWallet()

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState('')
  const [error, setError] = useState('')
  const [putBalance, setPutBalance] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  const putMint = getPutMintPDA()
  const safeMint = getSafeMintPDA()

  useEffect(() => {
    if (!wallet.publicKey) return
    getTokenBalance(connection, wallet.publicKey, putMint).then(setPutBalance)
  }, [wallet.publicKey, connection, txSig])

  const handleWithdraw = async () => {
    if (!wallet.publicKey || !anchorWallet || !amount) return
    setLoading(true)
    setError('')
    setTxSig('')

    try {
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      const program = getProgram(provider)

      const ownerPutAta  = await getAssociatedTokenAddress(putMint, wallet.publicKey)
      const ownerSafeAta = await getAssociatedTokenAddress(safeMint, wallet.publicKey)

      // Pre-create safeAta if needed
      try { await getAccount(connection, ownerSafeAta) } catch {
        const preTx = new Transaction()
        preTx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, ownerSafeAta, wallet.publicKey, safeMint))
        preTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        preTx.feePayer = wallet.publicKey
        const signed = await wallet.signTransaction!(preTx)
        await connection.sendRawTransaction(signed.serialize())
        await new Promise(r => setTimeout(r, 2000))
      }

      const amountBN = toBaseUnits(parseFloat(amount), 6)
      const tx = await program.methods
        .withdraw(amountBN)
        .accounts({
          owner: wallet.publicKey,
          ownerPutAta,
          ownerSafeAta,
        })
        .rpc()

      setTxSig(tx)
      setAmount('')
      setShowConfirm(false)
    } catch (e: any) {
      setError(e?.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="withdraw">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Withdraw X1SAFE_PUT → X1SAFE</div>
            <div className="card-subtitle">Convert locked PUT tokens to free tradeable X1SAFE</div>
          </div>
        </div>

        <div className="info-box warning">
          <div className="info-box-title">⚠️ Note</div>
          <div className="info-box-text">
            Converting PUT → X1SAFE gives you a free, tradeable token.
            Collateral stays in vault. Use <strong>Exit</strong> to redeem collateral.
          </div>
        </div>

        {wallet.connected ? (
          <>
            <div className="position-card">
              <div className="position-row">
                <span className="position-label">X1SAFE_PUT Balance</span>
                <span className="position-value">{putBalance.toFixed(4)} PUT</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount to Convert</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={putBalance}
                />
                <button
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={() => setAmount(putBalance.toFixed(6))}
                >MAX</button>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Available: {putBalance.toFixed(4)} X1SAFE_PUT
              </div>
            </div>

            {error && <div className="tx-status error">❌ {error}</div>}

            {!showConfirm ? (
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setShowConfirm(true)}
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > putBalance}
              >
                Continue
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="info-box">
                  <div className="info-box-title">Confirm: Convert {amount} PUT → X1SAFE</div>
                </div>
                <button className="btn btn-secondary btn-full" onClick={handleWithdraw} disabled={loading}>
                  {loading ? <><span className="loading" /> Converting...</> : 'Confirm'}
                </button>
                <button className="btn btn-secondary btn-full" onClick={() => setShowConfirm(false)} disabled={loading}>Cancel</button>
              </div>
            )}

            {txSig && (
              <div className="tx-status success">
                ✅ Converted to X1SAFE!{' '}
                <a href={`${EXPLORER}/tx/${txSig}`} target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>
                  View Tx ↗
                </a>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <p>Connect wallet to withdraw</p>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {IS_TESTNET ? '🔧 Testnet' : '🌐 Mainnet'}
        </div>
      </div>
    </div>
  )
}
