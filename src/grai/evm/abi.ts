export const graiAbi = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'graiOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'burn',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'graiAmount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalValue',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAssets',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getVaults',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'asset', type: 'address' },
          { name: 'seniorBalance', type: 'uint256' },
          { name: 'juniorBalance', type: 'uint256' },
          { name: 'activeAmount', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'assets',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'exists', type: 'bool' },
      { name: 'mintSplit', type: 'uint16' },
      { name: 'yieldSplit', type: 'uint16' },
      { name: 'pausedMinting', type: 'bool' },
      { name: 'totalValue', type: 'uint256' },
      { name: 'activeAmount', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'oracle',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const

export const priceOracleAbi = [
  {
    type: 'function',
    name: 'getPrice',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'priceDecimals', type: 'uint8' },
    ],
  },
] as const
