import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState } from '@solana/wallet-adapter-base'

declare global {
  interface Window {
    backpack?: any
    xnft?: any
    solana?: any
    phantom?: any
  }
}


export function Connect() {
  const { wallets, select, connect, connected, publicKey, disconnect } = useWallet()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bpKey, setBpKey] = useState<string | null>(null)

  // Detect injected providers
  const hasBackpackWindow = typeof window !== 'undefined' && (window.backpack || window.xnft)
  const hasPhantomWindow  = typeof window !== 'undefined' && (window.phantom?.solana || window.solana?.isPhantom)

  const connectBackpack = useCallback(async () => {
    try {
      setError(null)
      setStatus('Connecting to Backpack...')
      const provider = window.backpack?.solana || window.backpack || window.xnft?.solana
      if (!provider) throw new Error('Backpack provider not found')
      const resp = await provider.connect()
      const key = resp?.publicKey?.toString() || provider.publicKey?.toString()
      setBpKey(key)
      setStatus('✅ Connected: ' + key?.slice(0,8) + '...')
    } catch (e: any) {
      setError(e?.message || 'Connection failed')
      setStatus(null)
    }
  }, [])

  const connectAdapter = useCallback(async (walletName: string) => {
    try {
      setError(null)
      setStatus(`Connecting to ${walletName}...`)
      const w = wallets.find(x => x.adapter.name === walletName)
      if (!w) throw new Error('Wallet not found')
      select(w.adapter.name as any)
      await new Promise(r => setTimeout(r, 300))
      await connect()
      setStatus('✅ Connected!')
    } catch (e: any) {
      setError(e?.message || 'Connection failed')
      setStatus(null)
    }
  }, [wallets, select, connect])

  const disconnectAll = useCallback(async () => {
    try {
      if (bpKey) {
        const provider = window.backpack?.solana || window.backpack || window.xnft?.solana
        if (provider) await provider.disconnect()
        setBpKey(null)
      }
      if (connected) await disconnect()
      setStatus(null)
      setError(null)
    } catch {}
  }, [bpKey, connected, disconnect])

  const isConnected = connected || !!bpKey
  const activeKey = publicKey?.toString() || bpKey

  if (isConnected) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>Wallet Connected</div>
          <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.85rem', wordBreak: 'break-all', marginBottom: 20 }}>
            {activeKey}
          </div>
          <button className="btn btn-secondary" onClick={disconnectAll}>Disconnect</button>
        </div>
      </div>
    )
  }

  const adapterOptions = wallets.filter(w =>
    w.readyState === WalletReadyState.Installed ||
    w.readyState === WalletReadyState.Loadable
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Connect Wallet</div>
            <div className="card-subtitle">Choose your wallet to get started</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Backpack — always show if window.backpack OR window.xnft */}
          {hasBackpackWindow && (
            <button className="btn btn-secondary btn-full" style={{ justifyContent: 'flex-start', gap: 12 }} onClick={connectBackpack}>
              <span style={{ fontSize: '1.3rem' }}>🎒</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Backpack</span>
              <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Detected</span>
            </button>
          )}

          {/* Phantom */}
          {hasPhantomWindow && (
            <button className="btn btn-secondary btn-full" style={{ justifyContent: 'flex-start', gap: 12 }}
              onClick={() => connectAdapter('Phantom')}>
              <span style={{ fontSize: '1.3rem' }}>👻</span>
              <span style={{ flex: 1, textAlign: 'left' }}>Phantom</span>
              <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Detected</span>
            </button>
          )}

          {/* Other adapters */}
          {adapterOptions
            .filter(w => w.adapter.name !== 'Phantom' && w.adapter.name !== 'Backpack')
            .map(w => (
              <button key={w.adapter.name} className="btn btn-secondary btn-full"
                style={{ justifyContent: 'flex-start', gap: 12 }}
                onClick={() => connectAdapter(w.adapter.name)}>
                {w.adapter.icon
                  ? <img src={w.adapter.icon} style={{ width: 24, height: 24, borderRadius: 6 }} />
                  : <span style={{ fontSize: '1.3rem' }}>💼</span>
                }
                <span style={{ flex: 1, textAlign: 'left' }}>{w.adapter.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Detected</span>
              </button>
            ))
          }

          {/* Fallback — nothing detected */}
          {!hasBackpackWindow && !hasPhantomWindow && adapterOptions.length === 0 && (
            <div className="info-box warning">
              <div className="info-box-title">⚠️ No wallet detected</div>
              <div className="info-box-text">
                Please open this page inside the Backpack app, or install Phantom / Solflare browser extension.
              </div>
            </div>
          )}

        </div>

        {status && <div className="tx-status success" style={{ marginTop: 16 }}>{status}</div>}
        {error  && <div className="tx-status error"  style={{ marginTop: 16 }}>❌ {error}</div>}
      </div>
    </div>
  )
}
