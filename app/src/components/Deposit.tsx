import { useState, useEffect } from 'react'
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { AnchorProvider } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token'
import { Transaction } from '@solana/web3.js'
import {
  ASSETS, EXPLORER, IS_TESTNET,
  PROGRAM_ID, getProgram, getVaultPDA, getReservePDA, getPutMintPDA,
  getTokenBalance, toBaseUnits
} from '../lib/vault'

export function Deposit() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const anchorWallet = useAnchorWallet()

  const [amount, setAmount] = useState('')
  const [assetKey, setAssetKey] = useState('USDCX')
  const [loading, setLoading] = useState(false)
  const [txSig, setTxSig] = useState('')
  const [error, setError] = useState('')
  const [balances, setBalances] = useState<Record<string, number>>({})

  const asset = ASSETS.find(a => a.key === assetKey)!

  useEffect(() => {
    if (!wallet.publicKey) return
    const fetchBals = async () => {
      const result: Record<string, number> = {}
      for (const a of ASSETS) {
        result[a.key] = await getTokenBalance(connection, wallet.publicKey!, a.mint)
      }
      setBalances(result)
    }
    fetchBals()
  }, [wallet.publicKey, connection, txSig])

  const estimatedX1SAFE = amount ? (parseFloat(amount) * (asset.price || 1)).toFixed(2) : '0'

  const handleDeposit = async () => {
    if (!wallet.publicKey || !anchorWallet || !amount) return
    setLoading(true)
    setError('')
    setTxSig('')

    try {
      const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' })
      const program = getProgram(provider)

      const depositorAta = await getAssociatedTokenAddress(asset.mint, wallet.publicKey)
      const reserve = getReservePDA(asset.mint)
      const putMint = getPutMintPDA()
      const depositorPutAta = await getAssociatedTokenAddress(putMint, wallet.publicKey)

      // Pre-create reserve ATA if needed
      const preTx = new Transaction()
      let needsPre = false
      try { await getAccount(connection, reserve) } catch {
        preTx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, reserve, getVaultPDA(), asset.mint))
        needsPre = true
      }
      try { await getAccount(connection, depositorPutAta) } catch {
        preTx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, depositorPutAta, wallet.publicKey, putMint))
        needsPre = true
      }
      if (needsPre && preTx.instructions.length > 0) {
        preTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        preTx.feePayer = wallet.publicKey
        const signed = await wallet.signTransaction!(preTx)
        await connection.sendRawTransaction(signed.serialize())
        await new Promise(r => setTimeout(r, 2000))
      }

      const amountBN = toBaseUnits(parseFloat(amount), asset.decimals)
      const tx = await program.methods
        .deposit(amountBN)
        .accounts({
          depositor: wallet.publicKey,
          assetMint: asset.mint,
          depositorAta,
          reserve,
          depositorPutAta,
        })
        .rpc()

      setTxSig(tx)
      setAmount('')
    } catch (e: any) {
      setError(e?.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="deposit">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Deposit Assets</div>
            <div className="card-subtitle">Receive X1SAFE_PUT tokens · 1:1 USD value</div>
          </div>
        </div>

        <div className="info-box">
          <div className="info-box-title">ℹ️ How it works</div>
          <div className="info-box-text">
            Deposit USDC.X, XNT, or XEN and receive X1SAFE_PUT (locked receipt tokens).
            <br /><br />
            Use Withdraw to convert PUT → free X1SAFE. Use Exit to redeem collateral.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Select Asset</label>
          <div className="asset-grid">
            {ASSETS.map(a => (
              <div
                key={a.key}
                className={`asset-option ${assetKey === a.key ? 'selected' : ''}`}
                onClick={() => setAssetKey(a.key)}
              >
                <div className="asset-icon">{a.icon}</div>
                <div className="asset-name">{a.label}</div>
                <div className="asset-price" style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>
                  {balances[a.key] !== undefined ? balances[a.key].toFixed(4) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Amount ({asset.label})</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
              onClick={() => setAmount((balances[assetKey] || 0).toFixed(6))}
            >MAX</button>
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Wallet: {(balances[assetKey] || 0).toFixed(4)} {asset.label}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">You Receive (X1SAFE_PUT)</label>
          <input type="text" className="form-input" value={estimatedX1SAFE} disabled style={{ opacity: 0.7 }} />
          <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            1 {asset.label} = ~{asset.price || '?'} X1SAFE · backed by on-chain oracle
          </div>
        </div>

        {error && <div className="tx-status error">❌ {error}</div>}

        <button
          className="btn btn-primary btn-full"
          onClick={handleDeposit}
          disabled={!wallet.connected || !amount || parseFloat(amount) <= 0 || loading}
        >
          {loading ? <><span className="loading" /> Processing...</> : 'Deposit'}
        </button>

        {txSig && (
          <div className="tx-status success">
            ✅ Deposit successful!{' '}
            <a href={`${EXPLORER}/tx/${txSig}`} target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>
              View Tx ↗
            </a>
          </div>
        )}

        <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {IS_TESTNET ? '🔧 Testnet' : '🌐 Mainnet'} · Program: {PROGRAM_ID.toBase58().slice(0,8)}...
        </div>
      </div>
    </div>
  )
}
