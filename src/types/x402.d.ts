declare module '@x402/fetch' {
  export class x402Client {}
  export function wrapFetchWithPayment(
    baseFetch: typeof fetch,
    client: x402Client
  ): typeof fetch
}

declare module '@x402/evm/exact/client' {
  type TypedDataLike = any
  type EvmSigner = {
    address: `0x${string}`
    signTypedData: (typedData: TypedDataLike) => Promise<any>
  }

  export function registerExactEvmScheme(
    client: unknown,
    config: {
      signer: EvmSigner
      networks?: string | string[]
    }
  ): unknown
}
