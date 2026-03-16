import { Connection, PublicKey } from '@solana/web3.js'
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { getAssociatedTokenAddress } from '@solana/spl-token'

// ── Config ────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const _env = (import.meta as any).env || {}
export const PROGRAM_ID   = new PublicKey(_env.VITE_PROGRAM_ID || '9cBhMo6dNUqVTmuda3mya5gHZgK7dVJY52dSu7JF6VmT')
export const RPC_URL      = _env.VITE_RPC_URL  || 'https://rpc.testnet.x1.xyz'
export const IS_TESTNET   = (_env.VITE_NETWORK || 'testnet') === 'testnet'
export const EXPLORER     = IS_TESTNET
  ? 'https://explorer.testnet.x1.xyz'
  : 'https://explorer.mainnet.x1.xyz'

export const MINTS = {
  USDCX: new PublicKey('3VAPVRUV25jVm2EzuQpQpJWugLH4AzBPWJK5sQyZJuct'),
  XNT:   new PublicKey('AuK65QqWmPTsvfKS4FAdJ6idWiw8zvzM68tXnEYGRMTC'),
  XEN:   new PublicKey('HcCMidf2rU8wy5jQ9doNC5tnRancRAJdhhD8oFbYZpxj'),
}

export const ASSETS = [
  { key: 'USDCX', label: 'USDC.X', icon: '💵', mint: MINTS.USDCX, decimals: 6, price: 1.0 },
  { key: 'XNT',   label: 'XNT',    icon: '🪙', mint: MINTS.XNT,   decimals: 6, price: 0.0 },
  { key: 'XEN',   label: 'XEN',    icon: '⚡', mint: MINTS.XEN,   decimals: 6, price: 0.0 },
]

// ── PDAs ──────────────────────────────────────────────────────────────────────
export const getVaultPDA    = () => PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID)[0]
export const getPutMintPDA  = () => PublicKey.findProgramAddressSync([Buffer.from('x1safe_put_mint')],  PROGRAM_ID)[0]
export const getSafeMintPDA = () => PublicKey.findProgramAddressSync([Buffer.from('x1safe_safe_mint')], PROGRAM_ID)[0]
export const getReservePDA  = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('reserve'), mint.toBuffer()], PROGRAM_ID)[0]

// ── IDL (Anchor 0.29 format — flat accounts, no discriminator in accounts def) ─
export const IDL: any = {
  version: '0.1.0',
  name: 'x1safe_vault',
  instructions: [
    {
      name: 'deposit',
      accounts: [
        { name: 'depositor',        isMut: true,  isSigner: true  },
        { name: 'vault',            isMut: true,  isSigner: false },
        { name: 'assetMint',        isMut: false, isSigner: false },
        { name: 'depositorAta',     isMut: true,  isSigner: false },
        { name: 'reserve',          isMut: true,  isSigner: false },
        { name: 'putMint',          isMut: true,  isSigner: false },
        { name: 'depositorPutAta',  isMut: true,  isSigner: false },
        { name: 'tokenProgram',     isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram',    isMut: false, isSigner: false },
      ],
      args: [{ name: 'assetAmount', type: 'u64' }],
    },
    {
      name: 'withdraw',
      accounts: [
        { name: 'owner',        isMut: true,  isSigner: true  },
        { name: 'vault',        isMut: true,  isSigner: false },
        { name: 'putMint',      isMut: true,  isSigner: false },
        { name: 'safeMint',     isMut: true,  isSigner: false },
        { name: 'ownerPutAta',  isMut: true,  isSigner: false },
        { name: 'ownerSafeAta', isMut: true,  isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'putAmount', type: 'u64' }],
    },
    {
      name: 'exit',
      accounts: [
        { name: 'owner',          isMut: true,  isSigner: true  },
        { name: 'vault',          isMut: true,  isSigner: false },
        { name: 'putMint',        isMut: true,  isSigner: false },
        { name: 'assetMint',      isMut: false, isSigner: false },
        { name: 'ownerPutAta',    isMut: true,  isSigner: false },
        { name: 'reserve',        isMut: true,  isSigner: false },
        { name: 'ownerAssetAta',  isMut: true,  isSigner: false },
        { name: 'tokenProgram',   isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram',  isMut: false, isSigner: false },
      ],
      args: [{ name: 'putAmount', type: 'u64' }],
    },
  ],
  accounts: [
    {
      name: 'VaultState',
      type: { kind: 'struct', fields: [] },
    },
  ],
  errors: [],
}

// ── Program helper (Anchor 0.29: Program(idl, programId, provider)) ────────
export function getProgram(provider: AnchorProvider) {
  return new Program(IDL, PROGRAM_ID, provider)
}

// ── Vault state reader ────────────────────────────────────────────────────────
export async function fetchVaultState(connection: Connection) {
  try {
    const vault = getVaultPDA()
    const info  = await connection.getAccountInfo(vault)
    if (!info) return null
    const data = info.data
    let offset = 8                                                    // skip discriminator
    const authority  = new PublicKey(data.slice(offset, offset+32)); offset += 32
    const bump       = data[offset]; offset += 1
    const x1safeMint = new PublicKey(data.slice(offset, offset+32)); offset += 32
    offset += 1                                                       // mintBump
    const paused     = data[offset] !== 0; offset += 1
    const totalSupply = Number(data.readBigUInt64LE(offset)); offset += 8
    const assetCount  = data[offset]
    return { authority, bump, x1safeMint, paused, totalSupply, assetCount }
  } catch { return null }
}

// ── Token balance helper ──────────────────────────────────────────────────────
export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const ata  = await getAssociatedTokenAddress(mint, owner)
    const info = await connection.getTokenAccountBalance(ata)
    return info.value.uiAmount ?? 0
  } catch { return 0 }
}

export function toBaseUnits(amount: number, decimals: number): BN {
  return new BN(Math.floor(amount * 10 ** decimals))
}
