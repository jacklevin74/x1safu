import { useMemo, useState } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack'
import '@solana/wallet-adapter-react-ui/styles.css'

import { Dashboard } from './components/Dashboard'
import { Deposit }   from './components/Deposit'
import { Withdraw }  from './components/Withdraw'
import { Exit }      from './components/Exit'
import { Connect }   from './components/Connect'
import { RPC_URL }   from './lib/vault'

declare global {
  interface Window { backpack?: any; xnft?: any }
}

type Tab = 'connect' | 'dashboard' | 'deposit' | 'withdraw' | 'exit'

const ACTIONS: { key: Tab; label: string; icon: string; sub: string }[] = [
  { key: 'deposit',   label: 'Deposit',   icon: '⬇️',  sub: 'Collateral → PUT' },
  { key: 'withdraw',  label: 'Withdraw',  icon: '🔄',  sub: 'PUT → X1SAFE'     },
  { key: 'exit',      label: 'Exit',      icon: '↩️',  sub: 'Burn X1SAFE'      },
  { key: 'dashboard', label: 'Overview',  icon: '📊',  sub: 'Vault stats'      },
]

const NAV1: { key: Tab; label: string; icon: string }[] = [
  { key: 'connect',   label: 'Home',  icon: '🏠' },
  { key: 'dashboard', label: 'Vault', icon: '🔒' },
  { key: 'deposit',   label: 'Info',  icon: 'ℹ️'  },
]

function App() {
  const { connected, publicKey } = useWallet()
  const bpConnected = typeof window !== 'undefined' &&
    (window.backpack?.publicKey || window.xnft?.solana?.publicKey)
  const isConnected = connected || !!bpConnected

  const [tab, setTab] = useState<Tab>('connect')

  const shortAddr = publicKey
    ? `${publicKey.toBase58().slice(0,4)}…${publicKey.toBase58().slice(-4)}`
    : null

  return (
    <div className="app-shell">
      {/* Status bar */}
      <div className="status-bar">
        <span>▶</span>
        <span>RPC: {RPC_URL.replace('https://', '')}</span>
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#00d4ff' }}>
                <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">X1SAFE <span>Vault</span></div>
            </div>
          </div>

          {isConnected && shortAddr ? (
            <div className="wallet-indicator">
              <span style={{ color: '#22c55e', fontSize: '0.6rem' }}>●</span>
              {shortAddr}
            </div>
          ) : (
            <button className="btn-connect" onClick={() => setTab('connect')}>
              <span>🔗</span> Connect
            </button>
          )}

          <div className="btn-menu">
            <span /><span /><span />
          </div>
        </div>
      </header>

      {/* Action selector */}
      <div className="action-selector">
        {ACTIONS.map(a => (
          <button
            key={a.key}
            className={`action-card${tab === a.key ? ' active' : ''}`}
            onClick={() => setTab(a.key)}
          >
            <span className="action-icon">{a.icon}</span>
            <span className="action-label">{a.label}</span>
            <span className="action-sub">{a.sub}</span>
          </button>
        ))}
      </div>

      {/* Metrics bar */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Locked</div>
          <div className="metric-value accent">—</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">X1SAFE Rate</div>
          <div className="metric-value">$0.01</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Your Position</div>
          <div className="metric-value">{isConnected ? '—' : <span style={{ color: 'var(--text-3)' }}>—</span>}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Network</div>
          <div className="metric-value" style={{ fontSize: '0.85rem' }}>X1 Testnet</div>
        </div>
      </div>

      {/* Main content */}
      <main className="app-main">
        {tab === 'connect'   && <Connect />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'deposit'   && <Deposit />}
        {tab === 'withdraw'  && <Withdraw />}
        {tab === 'exit'      && <Exit />}
      </main>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <div className="nav-row">
          {NAV1.map(n => (
            <button
              key={n.key}
              className={`nav-item${tab === n.key ? ' active' : ''}`}
              onClick={() => setTab(n.key)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </div>
        <div className="nav-divider" />
        <div className="nav-row">
          <button className="nav-item" onClick={() => setTab('dashboard')}>
            <span className="nav-icon">📈</span>
            <span className="nav-label">Portfolio</span>
          </button>
          <button className="nav-item" onClick={() => setTab('withdraw')}>
            <span className="nav-icon">💱</span>
            <span className="nav-label">Swap</span>
          </button>
          <button className="nav-item active" onClick={() => setTab('deposit')}>
            <span className="nav-icon">🌐</span>
            <span className="nav-label">Explore</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default function AppWithWallet() {
  const endpoint = useMemo(() => RPC_URL, [])
  const wallets  = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
  ], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
