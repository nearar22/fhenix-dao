'use client';

import { createCofheClient, createCofheConfig } from '@cofhe/sdk/web';
import { chains as cofheChains } from '@cofhe/sdk/chains';
import type { CofheClient } from '@cofhe/sdk';
import type { PublicClient, WalletClient } from 'viem';

let _client: CofheClient | null = null;
let _connectedFor: string | null = null;

// Build the list of chains we know CoFHE is live on. Note that the SDK
// uses `arbSepolia` (not `arbitrumSepolia`).
const SUPPORTED_COFHE_CHAINS = [
  cofheChains.sepolia,
  (cofheChains as any).arbSepolia,
  (cofheChains as any).baseSepolia,
].filter(Boolean);

/**
 * Lazily create a CofheClient and connect it to the user's wallet.
 * The client is keyed by `${address}:${chainId}` so that when the user
 * switches network (e.g. Mainnet -> Sepolia), we rebuild the client and
 * avoid stale chain state that silently hangs decryption.
 */
export async function getCofheClient(
  publicClient: PublicClient,
  walletClient: WalletClient,
): Promise<CofheClient> {
  const account = walletClient.account?.address ?? null;
  const chainId = await walletClient.getChainId();
  const key = `${account ?? 'anon'}:${chainId}`;

  if (!_client || _connectedFor !== key) {
    // Fresh client per (account, chain). Cheaper than risking stale state.
    const config = createCofheConfig({
      supportedChains: SUPPORTED_COFHE_CHAINS as any,
    });
    _client = createCofheClient(config);
    await _client.connect(publicClient as any, walletClient as any);
    _connectedFor = key;
    console.log('[Fhinex] CoFHE client (re)connected for', key);
  }

  return _client;
}

export function resetCofheClient() {
  _client = null;
  _connectedFor = null;
}
