/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const CONTRACT_ADDRESS = "0xCc160767F53307958c0ff6bDd004406C5183B5cB" as const;
export const OWNER_WALLET = "0x4Bdb490a62a67d42638d035E41956d0BFaC558b6" as const;

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export enum OrderType {
  USDCtoEURC = 0,
  EURCtoUSDC = 1
}

export enum OrderStatus {
  Active = 0,
  Filled = 1,
  Cancelled = 2
}

export interface Order {
  id: bigint;
  creator: string;
  orderType: OrderType;
  offerAmount: bigint;
  askAmount: bigint;
  filler: string;
  status: OrderStatus;
}

export const erc20ABI = [
  {
    name: "Approval",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" }
    ]
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {"name": "_orderType", "type": "uint8"},
      {"name": "_offerAmount", "type": "uint256"},
      {"name": "_askAmount", "type": "uint256"}
    ],
    "name": "createOrder",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_orderId", "type": "uint256"}],
    "name": "fillOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_orderId", "type": "uint256"}],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_orderId", "type": "uint256"}],
    "name": "getOrder",
    "outputs": [{"name": "", "type": "tuple", "components": [
      {"name": "id", "type": "uint256"},
      {"name": "creator", "type": "address"},
      {"name": "orderType", "type": "uint8"},
      {"name": "offerAmount", "type": "uint256"},
      {"name": "askAmount", "type": "uint256"},
      {"name": "filler", "type": "address"},
      {"name": "status", "type": "uint8"}
    ]}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_creator", "type": "address"}],
    "name": "getCreatorOrders",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_filler", "type": "address"}],
    "name": "getFilledOrders",
    "outputs": [{"name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllOrders",
    "outputs": [{
      "name": "",
      "type": "tuple[]",
      "components": [
        {"name": "id", "type": "uint256"},
        {"name": "creator", "type": "address"},
        {"name": "orderType", "type": "uint8"},
        {"name": "offerAmount", "type": "uint256"},
        {"name": "askAmount", "type": "uint256"},
        {"name": "filler", "type": "address"},
        {"name": "status", "type": "uint8"}
      ]
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPlatformStats",
    "outputs": [
      {"name": "_totalOrders", "type": "uint256"},
      {"name": "_activeOrders", "type": "uint256"},
      {"name": "_filledOrders", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "orderCounter",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function parseContractOrder(raw: any, fallbackId?: bigint): Order {
  if (!raw) {
    throw new Error("Cannot parse null order data");
  }

  // Handle case where it's an array tuple (either [0, "0x...", 0, 100n, 200n, "0x...", 0] or object)
  const getVal = (propName: string, index: number) => {
    if (typeof raw === 'object' && raw !== null) {
      if (raw[propName] !== undefined && raw[propName] !== null) return raw[propName];
      if (raw[index] !== undefined && raw[index] !== null) return raw[index];
    }
    return undefined;
  };

  const idVal = getVal("id", 0);
  const creatorVal = getVal("creator", 1);
  const typeVal = getVal("orderType", 2);
  const offerVal = getVal("offerAmount", 3);
  const askVal = getVal("askAmount", 4);
  const fillerVal = getVal("filler", 5);
  const statusVal = getVal("status", 6);

  return {
    id: idVal !== undefined ? BigInt(idVal) : (fallbackId !== undefined ? fallbackId : 0n),
    creator: typeof creatorVal === 'string' ? creatorVal : '0x0000000000000000000000000000000000000000',
    orderType: typeVal !== undefined ? Number(typeVal) as OrderType : OrderType.USDCtoEURC,
    offerAmount: offerVal !== undefined ? BigInt(offerVal) : 0n,
    askAmount: askVal !== undefined ? BigInt(askVal) : 0n,
    filler: typeof fillerVal === 'string' ? fillerVal : '0x0000000000000000000000000000000000000000',
    status: statusVal !== undefined ? Number(statusVal) as OrderStatus : OrderStatus.Active
  };
}
