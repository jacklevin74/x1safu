import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { fetchVaultState, getTokenBalance, getPutMintPDA, getSafeMintPDA, EXPLORER, IS_TESTNET, PROGRAM_ID } from '../lib/vault'

export function Dashboard() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const [vaultState, setVaultState] = useState<any>(null)
  const [putBal, setPutBal] = useState(0)
  const [safeBal, setSafeBal] = useState(0)
  const [loading, setLoading] = useState(true)

  const putMint  = getPutMintPDA()
  const safeMint = getSafeMintPDA()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const state = await fetchVaultState(connection)
      setVaultState(state)
      if (wallet.publicKey) {
        const [p, s] = await Promise.all([
          getTokenBalance(connection, wallet.publicKey, putMint),
          getTokenBalance(connection, wallet.publicKey, safeMint),
        ])
        setPutBal(p)
        setSafeBal(s)
      }
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [wallet.publicKey, connection])

  const tvl = vaultState ? (vaultState.totalSupply / 1e6).toFixed(2) : '—'

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">X1SAFE Protocol Dashboard</div>
            <div className="card-subtitle">{IS_TESTNET ? '🔧 Testnet' : '🌐 Mainnet'} · Live on-chain data</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <span className="loading" /> Loading vault state...
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="position-card">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total X1SAFE Supply</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{tvl}</div>
              </div>
              <div className="position-card">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Assets Registered</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{vaultState?.assetCount ?? '—'}</div>
              </div>
              <div className="position-card">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: vaultState?.paused ? '#ef4444' : '#22c55e' }}>
                  {vaultState ? (vaultState.paused ? '⏸ Paused' : '✅ Active') : '❌ Not found'}
                </div>
              </div>
            </div>

            {wallet.connected && (
              <>
                <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '0.95rem' }}>Your Position</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="position-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>X1SAFE_PUT (locked)</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{putBal.toFixed(4)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Deposit receipt tokens</div>
                  </div>
                  <div className="position-card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>X1SAFE (free)</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)' }}>{safeBal.toFixed(4)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tradeable tokens</div>
                  </div>
                </div>
              </>
            )}

            <div style={{ marginTop: '8px', padding: '12px', background: 'var(--surface, #1e1e2e)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>Program:</strong>{' '}
                <a href={`${EXPLORER}/address/${PROGRAM_ID.toBase58()}`} target="_blank" rel="noopener" style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                  {PROGRAM_ID.toBase58().slice(0,16)}...
                </a>
              </div>
              <div>
                <strong>Vault PDA:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>8Hz12R5yr5xuckww3ycwnranH7Fbwpp7uN1aNbEekoFC</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
