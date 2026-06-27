/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { parseEther, formatUnits, parseUnits, encodeFunctionData, Address } from "viem";
import {
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  EURC_ADDRESS,
  contractABI,
  erc20ABI,
  Order,
  OrderType,
  OrderStatus,
  parseContractOrder
} from "../types";

export function useArcOTC() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const isDemoMode = false;
  const toggleDemoMode = () => {};

  const { data: allOrders, refetch: refetchAllOrders, isLoading: loading, error: contractError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "getAllOrders",
  });

  const orders = useMemo<Order[]>(() => {
    if (!allOrders || !Array.isArray(allOrders)) return [];
    return allOrders.map((item: any, idx: number) => parseContractOrder(item, BigInt(idx)));
  }, [allOrders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter(o => o.status === OrderStatus.Active).length;
    const filled = orders.filter(o => o.status === OrderStatus.Filled).length;

    // Volume calculation: Sum filled order ask amounts + offering amounts converted to nominal dollars (6 decimals)
    let vol = 0;
    orders.forEach(o => {
      if (o.status === OrderStatus.Filled) {
        // Get nominal value in USDC (dividing by 10^6)
        const amount = o.orderType === OrderType.USDCtoEURC ? o.offerAmount : o.askAmount;
        vol += Number(formatUnits(amount, 6));
      }
    });

    return {
      total,
      active,
      filled,
      volume: Math.round(vol),
    };
  }, [orders]);

  const error = contractError ? (contractError.message || "Failed to fetch orders from smart contract") : null;

  // 1. APPROVE TOKEN
  // spender: CONTRACT_ADDRESS, amount: bigint, tokenAddress: USDC or EURC
  const approveToken = async (tokenAddress: string, amount: bigint) => {
    if (!address) throw new Error("Wallet not connected");

    const hash = await (writeContractAsync as any)({
      address: tokenAddress as Address,
      abi: erc20ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, amount],
    });

    return hash;
  };

  // Check current allowance of spender
  const getAllowance = async (tokenAddress: string, ownerAddress: string): Promise<bigint> => {
    if (!publicClient) {
      return 0n;
    }

    try {
      const result = await (publicClient as any).readContract({
        address: tokenAddress as Address,
        abi: erc20ABI,
        functionName: "allowance",
        args: [ownerAddress as Address, CONTRACT_ADDRESS],
      });
      return BigInt(result as any);
    } catch (e) {
      console.error("Allowance check failed", e);
      return 0n;
    }
  };

  // Check token balance
  const getBalance = async (tokenAddress: string, ownerAddress: string): Promise<bigint> => {
    if (!publicClient) {
      return 0n;
    }

    try {
      const result = await (publicClient as any).readContract({
        address: tokenAddress as Address,
        abi: erc20ABI,
        functionName: "balanceOf",
        args: [ownerAddress as Address],
      });
      return BigInt(result as any);
    } catch {
      return 0n;
    }
  };

  // 2. CREATE ORDER
  const createOrder = async (orderType: OrderType, offerAmount: bigint, askAmount: bigint) => {
    if (!address) throw new Error("Wallet not connected");

    const hash = await (writeContractAsync as any)({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "createOrder",
      args: [orderType, offerAmount, askAmount],
    });

    // In a production app with Wagmi, we should fetch order count or estimate order ID.
    // Let's get the counter from contract to show the true order ID
    let currentId = BigInt(orders.length);
    if (publicClient) {
      try {
        const count = await (publicClient as any).readContract({
          address: CONTRACT_ADDRESS,
          abi: contractABI,
          functionName: "orderCounter",
        });
        currentId = BigInt(count as any) - 1n; // Last created
      } catch {
        // Fallback
      }
    }

    return {
      id: currentId,
      hash
    };
  };

  // 3. FILL ORDER
  const fillOrder = async (orderId: bigint) => {
    if (!address) throw new Error("Wallet not connected");

    const hash = await (writeContractAsync as any)({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "fillOrder",
      args: [orderId],
    });

    return hash;
  };

  // 4. CANCEL ORDER
  const cancelOrder = async (orderId: bigint) => {
    if (!address) throw new Error("Wallet not connected");

    const hash = await (writeContractAsync as any)({
      address: CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: "cancelOrder",
      args: [orderId],
    });

    return hash;
  };

  return {
    orders,
    loading,
    error,
    stats,
    isDemoMode,
    toggleDemoMode,
    approveToken,
    getAllowance,
    getBalance,
    createOrder,
    fillOrder,
    cancelOrder,
    refetch: refetchAllOrders,
    address,
    isConnected,
  };
}
