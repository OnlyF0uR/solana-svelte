import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import {
	WalletError,
	WalletNotConnectedError,
	WalletNotReadyError,
	WalletReadyState,
	type WalletName
} from '@solana/wallet-adapter-base';
import type { SolanaSignInInput } from '@solana/wallet-standard-features';
import { createSignInMessage } from '@solana/wallet-standard-util';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';
import type { AdapterV2 } from './types.js';
import { getLocalStorage, setLocalStorage } from './localStorage.js';

export class WalletNotSelectedError extends WalletError {
	name = 'WalletNotSelectedError';
}

type SolanaAdapterConfig = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	walletAdapters: any[];
	localStorageKey: string | undefined;
	autoConnect: boolean | undefined;
};

interface Wallet {
	adapter: AdapterV2;
	readyState: WalletReadyState;
}

function createSolanaIntegration() {
	let adapter = $state<AdapterV2 | null>(null);
	let connecting = $state<boolean>(false);
	let connected = $state<boolean>(false);
	let disconnecting = $state<boolean>(false);
	let ready = $state<WalletReadyState>('Unsupported' as WalletReadyState);
	let localStorageKey = $state<string>('walletAdapter');
	let wallets = $state<Wallet[]>([]);
	let walletsByName: Record<WalletName, AdapterV2>;
	let autoConnect = $state<boolean>(false);

	function init(solanaAdapterConfig: SolanaAdapterConfig | undefined) {
		// Solana adapters
		if (solanaAdapterConfig && solanaAdapterConfig.walletAdapters) {
			const walletAdapters = solanaAdapterConfig.walletAdapters;

			const walletAdaptersByName = walletAdapters.reduce<Record<WalletName, AdapterV2>>(
				(walletsByName, wallet) => {
					walletsByName[wallet.name] = wallet;
					return walletsByName;
				},
				{}
			);

			// Wrap adapters to conform to the `Wallet` interface
			const mapWallets = walletAdapters.map((adapter) => ({
				adapter,
				readyState: adapter.readyState
			}));

			wallets = mapWallets;
			walletsByName = walletAdaptersByName;

			if (solanaAdapterConfig.autoConnect) {
				autoConnect = solanaAdapterConfig.autoConnect;
			}

			if (solanaAdapterConfig.localStorageKey) {
				localStorageKey = solanaAdapterConfig.localStorageKey;
			}

			// Get wallet name from local storage
			const walletName = getLocalStorage<WalletName>(localStorageKey);
			// If exists configure the wallet
			if (walletName) {
				updateWallet(walletName);
			}
		}
	}

	async function select(walletName: WalletName): Promise<void> {
		if (adapter) {
			if (adapter.name === walletName) return;
			await disconnect();
		}

		updateWalletName(walletName);
	}

	async function attemptAutoConnect() {
		connecting = true;
		connected = true;

		try {
			await adapter?.connect();
			console.log('Auto connected, connected: ', connected);
		} catch (error: unknown) {
			connected = false;
			updateWalletName(null);
			console.error(error);
		} finally {
			connecting = false;
		}
	}

	async function connect(): Promise<void> {
		if (connected || connecting || disconnecting) return;

		if (!adapter) {
			throw newError(new WalletNotSelectedError());
		}

		if (!(ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable)) {
			resetWallet();

			if (typeof window !== 'undefined') {
				window.open(adapter.url, '_blank');
			}

			throw newError(new WalletNotReadyError());
		}

		try {
			connecting = true;
			await adapter?.connect();
			connected = true;
			console.log('Manually connected, connected: ', connected);
		} catch (error: unknown) {
			resetWallet();
			updateWalletName(null);
			console.error(error);
		} finally {
			connecting = false;
		}
	}

	async function disconnect(): Promise<void> {
		if (disconnecting) return;
		disconnecting = true;
		connected = false;

		if (!adapter) return updateWalletName(null, true);

		try {
			await adapter.disconnect();
		} finally {
			updateWalletName(null, true);
			disconnecting = false;
		}
	}

	function updateWalletName(name: WalletName | null, earlyDisconnect = false) {
		adapter = walletsByName?.[name as WalletName] ?? null;

		try {
			setLocalStorage(localStorageKey, name);
			updateAdapter(adapter);

			ready = adapter?.readyState || ('Unsupported' as WalletReadyState);
			if (!earlyDisconnect) {
				// If the wallet adapter tells us we are connected
				// then we are connected
				connected = adapter?.connected || false;
			}
		} catch (error: unknown) {
			console.error(error);
		}

		if (!adapter) {
			return;
		}

		// If we should auto connect,
		// this also checks if we aren't already
		// connected so no need to check here
		if (shouldAutoConnect()) {
			attemptAutoConnect();
		}
	}

	function newError(error: WalletError): WalletError {
		console.error(error);
		return error;
	}

	function updateAdapter(adapter: AdapterV2 | null) {
		if (adapter) {
			// Sign a transaction if the wallet supports it
			if ('signTransaction' in adapter) {
				// adapter.signTransaction = async function <T extends Transaction | VersionedTransaction>(
				// 	transaction: T
				// ): Promise<T> {
				// 	if (!connected) {
				// 		throw newError(new WalletNotConnectedError());
				// 	}
				// 	return await adapter.signTransaction(transaction);
				// };
			}

			// Sign multiple transactions if the wallet supports it
			if ('signAllTransactions' in adapter) {
				adapter.signAllTransactions = async function <T extends Transaction | VersionedTransaction>(
					transactions: T[]
				) {
					if (!connected) {
						throw newError(new WalletNotConnectedError());
					}
					return await adapter.signAllTransactions(transactions);
				};
			}

			// Sign an arbitrary message if the wallet supports it
			if ('signMessage' in adapter) {
				adapter.signMessage = async function (message: Uint8Array) {
					if (!connected) {
						throw newError(new WalletNotConnectedError());
					}
					return await adapter.signMessage(message);
				};
			}

			// Login support
			// if ('signIn' in adapter._wallet) {
			adapter.signIn = async function (inp: SolanaSignInInput) {
				if (!connected) {
					throw newError(new WalletNotConnectedError());
				}

				// This is kinda redundent, but it's here for compatibility
				const domain = inp.domain || window.location.host;
				const address = inp.address || adapter.publicKey!.toBase58();

				const input = {
					...inp,
					domain,
					address
				};

				// @ts-expect-error private property
				if (adapter._wallet && adapter._wallet.signIn) {
					// @ts-expect-error private property
					const { signedMessage, signature } = await adapter._wallet.signIn(input);

					// console.log(
					// 	bs58.encode(signature),
					// 	bs58.encode(await adapter.signMessage(createSignInMessage(input)))
					// );

					return {
						signedMessage: new TextDecoder().decode(signedMessage),
						signature: bs58.encode(signature)
					};
				} else if ('signMessage' in adapter) {
					const inputBytes = createSignInMessage(input);
					const signature = await adapter.signMessage(inputBytes);
					return {
						signedMessage: new TextDecoder().decode(inputBytes),
						signature: bs58.encode(signature)
					};
				} else {
					throw newError(new WalletNotConnectedError());
				}
			};
		}
	}

	function shouldAutoConnect(): boolean {
		return !(
			!autoConnect ||
			!adapter ||
			!(ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable) ||
			connected ||
			connecting
		);
	}

	function updateWallet(walletName: WalletName) {
		updateWalletName(walletName);
	}

	async function resetWallet() {
		connected = false;
		updateWalletName(null, true);
	}

	return {
		get adapter() {
			return adapter;
		},
		get connecting() {
			return connecting;
		},
		get connected() {
			return connected;
		},
		get disconnecting() {
			return disconnecting;
		},
		get ready() {
			return ready;
		},
		get wallets() {
			return wallets;
		},
		get walletsByName() {
			return walletsByName;
		},
		get autoConnect() {
			return autoConnect;
		},
		init,
		select,
		connect,
		disconnect,
		resetWallet
	};
}

export const blockchain = createSolanaIntegration();
