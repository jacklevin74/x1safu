import { useMemo, useState } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react'
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack'
import { Shield } from 'lucide-react'
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

function App() {
  const { connected } = useWallet()

  // detect Backpack mobile/desktop direct inject
  const bpConnected = typeof window !== 'undefined' &&
    (window.backpack?.publicKey || window.xnft?.solana?.publicKey)

  const isWalletConnected = connected || !!bpConnected

  const [tab, setTab] = useState<Tab>('connect')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'connect',   label: 'Connect',   icon: '🔗' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'deposit',   label: 'Deposit',   icon: '⬇️' },
    { key: 'withdraw',  label: 'Withdraw',  icon: '🔄' },
    { key: 'exit',      label: 'Exit',      icon: '🚪' },
  ]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon"><Shield size={20} /></div>
            <div>
              <div className="brand-name">X1SAFE</div>
              <div className="brand-sub">Multi-Asset Vault</div>
            </div>
          </div>
          {isWalletConnected && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>● Connected</span>
          )}
        </div>
      </header>

      <nav className="tab-nav">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'connect'   && <Connect />}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'deposit'   && <Deposit />}
        {tab === 'withdraw'  && <Withdraw />}
        {tab === 'exit'      && <Exit />}
      </main>
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
