import { http, createConfig } from 'wagmi';
import { sepolia, arbitrumSepolia } from 'wagmi/chains';
import {
  injected,
  metaMask,
  coinbaseWallet,
  walletConnect,
} from 'wagmi/connectors';

export const SUPPORTED_CHAIN_IDS = [sepolia.id, arbitrumSepolia.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  // Public Fhinex demo project id (rate-limited). Override in prod.
  'fhinex_demo_no_project_id';

const APP_METADATA = {
  name: 'Fhenix DAO',
  description: 'Confidential DAO voting · Fhenix CoFHE',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://fhenix-dao.app',
  icons: ['https://fhenix-dao.app/icon.png'],
};

export const wagmiConfig = createConfig({
  chains: [sepolia, arbitrumSepolia],
  // Order matters: MetaMask first (explicit), then Coinbase, then
  // WalletConnect (mobile + 200+ wallets via QR), finally EIP-6963 auto-
  // detect + generic injected fallback. This sidesteps wallet hijackers
  // (Nightly / Phantom) while supporting every major wallet.
  connectors: [
    metaMask({
      dappMetadata: {
        name: APP_METADATA.name,
        url: APP_METADATA.url,
      },
    }),
    coinbaseWallet({
      appName: APP_METADATA.name,
      appLogoUrl: APP_METADATA.icons[0],
      preference: 'all',
    }),
    walletConnect({
      projectId: WC_PROJECT_ID,
      metadata: APP_METADATA,
      showQrModal: true,
    }),
    injected({ target: 'metaMask' }),
    injected(),
  ],
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
        'https://ethereum-sepolia-rpc.publicnode.com',
    ),
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
        'https://sepolia-rollup.arbitrum.io/rpc',
    ),
  },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
