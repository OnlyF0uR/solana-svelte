# solana-svelte

Solana wallet adapter support for Svelte 5. Works by utilising the [wallet-adapter](https://github.com/anza-xyz/wallet-adapter) library.

## Important information

This library is the bare basics for how to interact with solana wallets on svelte. It has all the functionalities,
expected like other libraries but leaves some implementations up to the user. The library comes with a UI component
for choosing a wallet but as a developer you are required to control when this is shown, using your own state. Support for
backpack wallet is also added. So this one is retrieved from the solana-svelte library instead of the regular wallet-adapter by anza-xyz. Lastly SignInWithSolana is now also supported. However instead of first returning SolanaSignInOutput, it returns both the signed data and the siganture in order to have the function fallback to a normal sign message if the signIn method is not supported by the wallet.

## Example setup

```svelte
<script>
	import { clusterApiUrl } from '@solana/web3.js';
	import { blockchain } from '@solana-svelte/core';

	$effect.pre(async () => {
		const {
			PhantomWalletAdapter,
			SolflareWalletAdapter,
			CoinbaseWalletAdapter,
			LedgerWalletAdapter,
			TrezorWalletAdapter,
			KeystoneWalletAdapter,
			TrustWalletAdapter,
			MathWalletAdapter
		} = await import('@solana/wallet-adapter-wallets');
		const { BackpackWalletAdapter } = await import('@solana-svelte/wallets');
		const network = clusterApiUrl('devnet');

		blockchain.init(network, {
			walletAdapters: [
				new PhantomWalletAdapter(),
				new SolflareWalletAdapter({ network }),
				new CoinbaseWalletAdapter(),
				new BackpackWalletAdapter(),
				new LedgerWalletAdapter(),
				new TrezorWalletAdapter(),
				new KeystoneWalletAdapter(),
				new TrustWalletAdapter(),
				new MathWalletAdapter()
			],
			autoConnect: true
		});
	});
</script>

{@render children()}
```
