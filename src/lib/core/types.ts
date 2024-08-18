import {
	type MessageSignerWalletAdapter,
	type SignerWalletAdapter,
	type StandardWalletAdapter,
	type WalletAdapter,
	type WalletAdapterProps
} from '@solana/wallet-adapter-base';
import type { SolanaSignInInput } from '@solana/wallet-standard-features';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';

export interface WalletAdapterV2 extends WalletAdapter {
	signIn: (input: SolanaSignInInput) => Promise<{
		signedMessage: string;
		signature: string;
	}>;
	signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
	signAllTransactions: <T extends Transaction | VersionedTransaction>(
		transactions: T[]
	) => Promise<T[]>;
	signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface SignerWalletAdapterV2 extends SignerWalletAdapter {
	signIn: (input: SolanaSignInInput) => Promise<{
		signedMessage: string;
		signature: string;
	}>;
	signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
	signAllTransactions: <T extends Transaction | VersionedTransaction>(
		transactions: T[]
	) => Promise<T[]>;
	signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface MessageSignerWalletAdapterV2 extends MessageSignerWalletAdapter {
	signIn: (input: SolanaSignInInput) => Promise<{
		signedMessage: string;
		signature: string;
	}>;
	signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
	signAllTransactions: <T extends Transaction | VersionedTransaction>(
		transactions: T[]
	) => Promise<T[]>;
	signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

// We do this to override the output of the signIn method
// originally this was SolanaSignInOutput but we export directly what is useful
// with signMessage fallback for wallets that don't support the signIn method
export interface SignInMessageSignerWalletAdapterProps<Name extends string = string>
	extends WalletAdapterProps<Name> {
	signIn(input?: SolanaSignInInput): Promise<{
		signedMessage: string;
		signature: string;
	}>;
}

export type SignInMessageSignerWalletAdapter<Name extends string = string> = WalletAdapter<Name> &
	SignInMessageSignerWalletAdapterProps<Name>;

export interface SignInMessageSignerWalletAdapterV2 extends SignInMessageSignerWalletAdapter {
	signIn: (input: SolanaSignInInput) => Promise<{
		signedMessage: string;
		signature: string;
	}>;
	signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
	signAllTransactions: <T extends Transaction | VersionedTransaction>(
		transactions: T[]
	) => Promise<T[]>;
	signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface StandardWalletAdapterV2 extends StandardWalletAdapter {
	signIn: (input: SolanaSignInInput) => Promise<{
		signedMessage: string;
		signature: string;
	}>;
	signTransaction: <T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>;
	signAllTransactions: <T extends Transaction | VersionedTransaction>(
		transactions: T[]
	) => Promise<T[]>;
	signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export type AdapterV2 =
	| WalletAdapterV2
	| SignerWalletAdapterV2
	| MessageSignerWalletAdapterV2
	| SignInMessageSignerWalletAdapterV2
	| StandardWalletAdapterV2;
