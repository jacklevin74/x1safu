import { useState, useEffect, useMemo } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react'
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { ArrowRight, Wallet, LogOut, TrendingUp, Shield, Clock, DollarSign } from 'lucide-react'
import '@solana/wallet-adapter-react-ui/styles.css'

// X1SAFE Token Price: 1 X1SAFE = 0.001 USDT
const X1SAFE_PRICE_USDT = 0.001

// X1 Network
const network = 'https://rpc.mainnet.x1.xyz'

interface Position {
  amount: number
  depositedAt: Date
  apy: number
  earned: number
}

function App() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'position' | 'withdraw'>('deposit')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [balance, setBalance] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((lamports) => {
        setBalance(lamports / LAMPORTS_PER_SOL)
      })
      // TODO: Fetch position from contract
    }
  }, [publicKey, connection])

  const handleDeposit = async () => {
    if (!publicKey || !depositAmount) return
    setLoading(true)
    try {
      // TODO: Call X1SAFE contract deposit
      console.log('Deposit:', depositAmount, 'XNT')
      setPosition({
        amount: parseFloat(depositAmount),
        depositedAt: new Date(),
        apy: 12.5,
        earned: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!publicKey || !withdrawAmount) return
    setLoading(true)
    try {
      // TODO: Call X1SAFE contract withdraw
      console.log('Withdraw:', withdrawAmount, 'XNT')
    } finally {
      setLoading(false)
    }
  }

  const handleExit = async () => {
    if (!publicKey) return
    setLoading(true)
    try {
      // TODO: Call X1SAFE contract exit (withdraw all + rewards)
      console.log('Exit position')
      setPosition(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">X1SAFE</h1>
              <p className="text-xs text-slate-400">Secure Savings</p>
            </div>
          </div>
          
          {publicKey ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Balance</p>
                <p className="font-mono text-emerald-400">{balance.toFixed(4)} XNT</p>
              </div>
              <WalletMultiButton className="!bg-slate-800 hover:!bg-slate-700 !rounded-lg !font-medium !text-sm !px-4 !py-2" />
            </div>
          ) : (
            <WalletMultiButton className="!bg-emerald-600 hover:!bg-emerald-500 !rounded-lg !font-medium !text-sm !px-6 !py-2.5" />
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {!publicKey ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <Wallet className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
            <p className="text-slate-400 mb-6">Connect your X1 wallet to start earning</p>
            <WalletMultiButton className="!bg-emerald-600 hover:!bg-emerald-500 !rounded-lg !font-medium !text-base !px-8 !py-3" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Stats Panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-300">X1SAFE Price</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">${X1SAFE_PRICE_USDT} <span className="text-sm text-slate-400">USDT</span></p>
                <p className="text-xs text-slate-500 mt-1">1 X1SAFE = {X1SAFE_PRICE_USDT} USDT</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-300">Total Deposited</span>
                </div>
                <p className="text-3xl font-bold">{position ? position.amount.toFixed(4) : '0.0000'} <span className="text-lg text-slate-400">XNT</span></p>
                {position && (
                  <p className="text-xs text-emerald-400 mt-1">
                    ≈ ${(position.amount * X1SAFE_PRICE_USDT).toFixed(4)} USDT
                  </p>
                )}
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-slate-300">Current APY</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">{position ? position.apy.toFixed(1) : '12.5'}%</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-300">Earned</span>
                </div>
                <p className="text-3xl font-bold">{position ? position.earned.toFixed(4) : '0.0000'} <span className="text-lg text-slate-400">XNT</span></p>
                {position && position.earned > 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    ≈ ${(position.earned * X1SAFE_PRICE_USDT).toFixed(4)} USDT
                  </p>
                )}
              </div>
            </div>

            {/* Action Panel */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                  {(['deposit', 'position', 'withdraw'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-4 px-6 text-sm font-medium transition-all ${
                        activeTab === tab
                          ? 'text-white border-b-2 border-emerald-500 bg-emerald-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {tab === 'deposit' && 'Deposit'}
                      {tab === 'position' && 'Position'}
                      {tab === 'withdraw' && 'Withdraw'}
                    </button>
                  ))}
                </div>

                <div className="p-8">
                  {activeTab === 'deposit' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Amount to Deposit</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-2xl font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">XNT</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Available: {balance.toFixed(4)} XNT</p>
                      </div>

                      <button
                        onClick={handleDeposit}
                        disabled={!depositAmount || loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            Deposit <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <div className="bg-slate-950/50 rounded-lg p-4 text-sm text-slate-400">
                        <p>• Minimum deposit: 1 XNT</p>
                        <p>• No lock period</p>
                        <p>• Earn passive yield on your XNT</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'position' && (
                    <div className="space-y-6">
                      {position ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950/50 rounded-xl p-4">
                              <p className="text-xs text-slate-500 mb-1">Deposited</p>
                              <p className="text-xl font-bold font-mono">{position.amount.toFixed(4)} XNT</p>
                            </div>
                            <div className="bg-slate-950/50 rounded-xl p-4">
                              <p className="text-xs text-slate-500 mb-1">Deposited At</p>
                              <p className="text-sm font-medium">{position.depositedAt.toLocaleDateString()}</p>
                            </div>
                            <div className="bg-slate-950/50 rounded-xl p-4">
                              <p className="text-xs text-slate-500 mb-1">APY</p>
                              <p className="text-xl font-bold text-emerald-400">{position.apy}%</p>
                            </div>
                            <div className="bg-slate-950/50 rounded-xl p-4">
                              <p className="text-xs text-slate-500 mb-1">Earned</p>
                              <p className="text-xl font-bold text-amber-400">{position.earned.toFixed(4)} XNT</p>
                            </div>
                          </div>

                          <button
                            onClick={handleExit}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <LogOut className="w-4 h-4" /> Exit Position (Withdraw All)
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="text-center py-12 text-slate-500">
                          <p>No active position</p>
                          <p className="text-sm mt-1">Deposit XNT to start earning</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'withdraw' && (
                    <div className="space-y-6">
                      {position ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Amount to Withdraw</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="0.00"
                                max={position.amount}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-2xl font-mono focus:border-amber-500 focus:outline-none transition-colors"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">XNT</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Deposited: {position.amount.toFixed(4)} XNT</p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => setWithdrawAmount((position.amount / 4).toFixed(4))}
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              25%
                            </button>
                            <button
                              onClick={() => setWithdrawAmount((position.amount / 2).toFixed(4))}
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              50%
                            </button>
                            <button
                              onClick={() => setWithdrawAmount(position.amount.toFixed(4))}
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                              Max
                            </button>
                          </div>

                          <button
                            onClick={handleWithdraw}
                            disabled={!withdrawAmount || loading}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                Withdraw <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <div className="bg-slate-950/50 rounded-lg p-4 text-sm text-slate-400">
                            <p>• Withdraw principal + earned rewards</p>
                            <p>• No exit fees</p>
                            <p>• Instant withdrawal</p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 text-slate-500">
                          <p>No active position</p>
                          <p className="text-sm mt-1">Nothing to withdraw</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AppWithWallet() {
  const endpoint = useMemo(() => network, [])
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
