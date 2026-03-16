import { useState, useEffect } from 'react'
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token'
import { Transaction } from '@solana/web3.js'
import {
  ASSETS, EXPLORER, IS_TESTNET,
  getProgram, getPutMintPDA, getReservePDA,
  getTokenBalance, toBaseUnits
} from '../lib/vault'

export function Exit() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const anchorWallet = useAnchorWallet()

  const [amount, setAmount] = useState('')
  const [assetKey, setAssetKey] = useState('USDCX')
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState('')
  const [error, setError] = useState('')
  const [putBalance, setPutBalance] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  const putMint = getPutMintPDA()
  const asset = ASSETS.find(a => a.key === assetKey)!

  useEffect(() => {
    if (!wallet.publicKey) return
    getTokenBalance(connection, wallet.publicKey, putMint).then(setPutBalance)
  }, [wallet.publicKey, connection, txSig])

  const handleExit = async () => {
    if (!wallet.publicKey || !anchorWallet || !amount) return
    setLoading(true)
    setError('')
    setTxSig('')

    try {
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      const program = getProgram(provider)

      const ownerPutAta   = await getAssociatedTokenAddress(putMint, wallet.publicKey)
      const reserve       = getReservePDA(asset.mint)
      const ownerAssetAta = await getAssociatedTokenAddress(asset.mint, wallet.publicKey)

      // Pre-create ownerAssetAta if needed
      try { await getAccount(connection, ownerAssetAta) } catch {
        const preTx = new Transaction()
        preTx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, ownerAssetAta, wallet.publicKey, asset.mint))
        preTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        preTx.feePayer = wallet.publicKey
        const signed = await wallet.signTransaction!(preTx)
        await connection.sendRawTransaction(signed.serialize())
        await new Promise(r => setTimeout(r, 2000))
      }

      const amountBN = toBaseUnits(parseFloat(amount), 6)
      const tx = await program.methods
        .exit(amountBN)
        .accounts({
          owner: wallet.publicKey,
          assetMint: asset.mint,
          ownerPutAta,
          reserve,
          ownerAssetAta,
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
    <div className="exit">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Exit Position</div>
            <div className="card-subtitle">Burn X1SAFE_PUT → receive collateral back</div>
          </div>
        </div>

        <div className="info-box danger">
          <div className="info-box-title">❗ Exit = Redeem Collateral</div>
          <div className="info-box-text">
            Burn PUT tokens to get your original collateral back at current oracle price.
            Select which asset you want to receive.
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
              <label className="form-label">Receive Asset</label>
              <div className="asset-grid">
                {ASSETS.map(a => (
                  <div key={a.key} className={`asset-option ${assetKey === a.key ? 'selected' : ''}`} onClick={() => setAssetKey(a.key)}>
                    <div className="asset-icon">{a.icon}</div>
                    <div className="asset-name">{a.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amount to Exit (PUT)</label>
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
            </div>

            {error && <div className="tx-status error">❌ {error}</div>}

            {!showConfirm ? (
              <button
                className="btn btn-primary btn-full"
                style={{ background: 'var(--danger, #dc2626)' }}
                onClick={() => setShowConfirm(true)}
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > putBalance}
              >
                Exit Position
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="info-box danger">
                  <div className="info-box-title">Exit {amount} PUT for {asset.label}?</div>
                </div>
                <button className="btn btn-primary btn-full" style={{ background: 'var(--danger, #dc2626)' }} onClick={handleExit} disabled={loading}>
                  {loading ? <><span className="loading" /> Exiting...</> : 'Confirm Exit'}
                </button>
                <button className="btn btn-secondary btn-full" onClick={() => setShowConfirm(false)} disabled={loading}>Cancel</button>
              </div>
            )}

            {txSig && (
              <div className="tx-status success">
                ✅ Exit successful!{' '}
                <a href={`${EXPLORER}/tx/${txSig}`} target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>
                  View Tx ↗
                </a>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <p>Connect wallet to exit</p>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {IS_TESTNET ? '🔧 Testnet' : '🌐 Mainnet'}
        </div>
      </div>
    </div>
  )
}
