/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, BarChart3, TrendingUp, ShieldCheck, Trash2 } from "lucide-react";
import { formatUnits } from "viem";
import { Order, OrderType, OrderStatus, OWNER_WALLET } from "../types";
import { useToast } from "./Toast";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useTheme } from "./ThemeContext";
import { useQueryClient } from "@tanstack/react-query";

interface AdminViewProps {
  orders: Order[];
  stats: {
    total: number;
    active: number;
    filled: number;
    volume: number;
  };
  address: string | undefined;
  onCancelOrder: (id: bigint) => Promise<any>;
  onRefetch?: () => Promise<any>;
  cancelledIds: bigint[];
  setCancelledIds: React.Dispatch<React.SetStateAction<bigint[]>>;
}

export default function AdminView({ orders, stats, address, onCancelOrder, onRefetch, cancelledIds, setCancelledIds }: AdminViewProps) {
  const toast = useToast();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<"all" | "active" | "filled" | "cancelled" >("all");
  const queryClient = useQueryClient();

  const [cancellingId, setCancellingId] = useState<bigint | null>(null);
  const { writeContract, data: hash } = useWriteContract();

  const handleCancel = async (orderId: any) => {
    try {
      const bId = BigInt(orderId);
      setCancellingId(bId);
      toast.info(`submitting request to cancel order #${orderId.toString()}...`);
      writeContract({
        address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB' as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: "_orderId", type: "uint256" }
            ],
            name: "cancelOrder",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ] as const,
        functionName: 'cancelOrder',
        args: [bId],
      } as any);
    } catch (err: any) {
      console.error('Cancel error:', err);
      toast.error(err.message || "Failed to cancel order.");
    }
  };

  const { isSuccess: isConfirmConfirmed } = useWaitForTransactionReceipt({ hash });

  React.useEffect(() => {
    if (isConfirmConfirmed && hash) {
      toast.success("Order Cancelled");
      queryClient.invalidateQueries();
      if (cancellingId !== null) {
        setCancelledIds(prev => [...prev, cancellingId]);
        setCancellingId(null);
      }
      if (onRefetch) {
        onRefetch();
      }
    }
  }, [isConfirmConfirmed, hash, cancellingId]);

  // Check if wallet address is the owner wallet: 0x4Bdb490a62a67d42638d035E41956d0BFaC558b6
  const isActualOwner = address?.toLowerCase() === OWNER_WALLET.toLowerCase();

  // Additional Admin Panel stats and analytics
  const totalEURCNominal = orders
    .filter((o) => o.status === OrderStatus.Filled)
    .reduce((acc, o) => {
      const isEURC = o.orderType === OrderType.USDCtoEURC; 
      const askAmount = isEURC ? o.askAmount : o.offerAmount;
      return acc + Number(formatUnits(askAmount, 6));
    }, 0);

  // Filter orders based on Tab Selection
  const filteredOrders = orders
    .filter((o) => !cancelledIds.includes(o.id))
    .filter((o) => {
      // Show only Active (0) and Filled (1) orders unless user specifically filters cancelled
      if (activeTab === "all" && (o.status === OrderStatus.Cancelled || Number(o.status) === 2)) return false;
      if (activeTab === "active") return o.status === OrderStatus.Active;
      if (activeTab === "filled") return o.status === OrderStatus.Filled;
      if (activeTab === "cancelled") return o.status === OrderStatus.Cancelled || Number(o.status) === 2;
      return true;
    });



  if (!isActualOwner) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center select-none" id="admin-denied-container">
        <div className={`p-8 rounded-2xl ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
        } space-y-6`}>
          <div className="h-16 w-16 bg-[#E8F5E9] dark:bg-white/5 border-2 border-[#00C853] rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>

          <div className="space-y-3">
            <h2 className={`font-heading text-2xl font-black uppercase tracking-tight ${isLight ? "text-black" : "text-white"}`}>
              Access Denied
            </h2>
            <p className={`text-sm leading-relaxed max-w-sm mx-auto ${isLight ? "text-black" : "text-slate-500"}`}>
              This administration control panel is strictly restricted. Only the contract owner may manage active system parameters.
              <span className={`block font-mono text-xs mt-3 p-3 rounded border select-all ${
                isLight ? "bg-[#E8F5E9] border-2 border-[#00C853] text-[#000000]" : "bg-slate-100 dark:bg-white/5 border-slate-250 dark:border-white/10 text-white"
              }`}>
                Required Owner Wallet: {OWNER_WALLET}
              </span>
            </p>
            {address && (
              <p className="text-xs text-red-500 font-mono mt-1 pt-2">
                Currently connected: {address}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 select-none animate-fadeIn" id="admin-dashboard-container">
      {/* Page Header */}
      <div className={`border-b pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
        isLight ? "border-[#00C853]/20" : "border-slate-300 dark:border-white/5"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`font-heading text-3xl font-black uppercase tracking-tight ${isLight ? "text-[#000000]" : "text-black dark:text-white"}`}>
              Protocol Manager
            </h1>
            <span className={`inline-flex items-center gap-1 border px-2.5 py-0.5 rounded-full text-[10px] font-black font-heading uppercase ${
              isLight ? "bg-[#E8F5E9] border-[#00C853] text-[#007A33]" : "bg-slate-150 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-emerald-600 dark:text-emerald-400"
            }`}>
              <ShieldCheck className="h-3 w-3" />
              <span>Owner Access</span>
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time analytics and global smart contract liquidity locks.
          </p>
        </div>
      </div>

      {/* Admin Analytics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Stat card 1 */}
        <div className={`p-5 flex items-center gap-4 rounded-2xl ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
        }`}>
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${
            isLight ? "bg-[#E8F5E9] border-[#00C853]/20" : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5"
          }`}>
            <BarChart3 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider font-heading ${isLight ? "text-black" : "text-slate-500"}`}>
              Total Created Orders
            </span>
            <div className={`text-2xl font-number font-bold mt-1 ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
              {stats.total}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Cumulative Contract Index
            </div>
          </div>
        </div>

        {/* Stat card 2 */}
        <div className={`p-5 flex items-center gap-4 rounded-2xl ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
        }`}>
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 font-bold ${
            isLight ? "bg-[#E8F5E9] border-[#00C853]/20 text-[#007A33]" : "bg-slate-100 dark:bg-white/5 border-slate-250 dark:border-white/5 text-[#00C853]"
          }`}>
            %
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider font-heading ${isLight ? "text-black" : "text-slate-500"}`}>
              Fill Success Rate
            </span>
            <div className={`text-2xl font-number font-bold mt-1 ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
              {stats.total > 0 ? ((stats.filled / stats.total) * 100).toFixed(1) : "0.0"}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {stats.filled} of {stats.total} matched
            </div>
          </div>
        </div>

        {/* Stat card 3 */}
        <div className={`p-5 flex items-center gap-4 rounded-2xl ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
        }`}>
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${
            isLight ? "bg-[#E8F5E9] border-[#00C853]/20" : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5"
          }`}>
            <TrendingUp className="h-6 w-6 text-[#00C853]" />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider font-heading ${isLight ? "text-black" : "text-slate-500"}`}>
              Aggregated Volumes
            </span>
            <div className={`text-xl font-number font-bold mt-1 ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
              ${stats.volume.toLocaleString()} <span className="text-[10px] font-sans text-slate-500 font-normal">USDC</span>
            </div>
            <div className="text-[11px] font-number font-bold text-slate-500">
              {totalEURCNominal.toLocaleString()} <span className="text-[9px] font-sans text-slate-500 font-normal">EURC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Filter */}
      <div className={`flex flex-wrap gap-2 border-b pb-4 ${
        isLight ? "border-[#00C853]/20" : "border-slate-300 dark:border-white/5"
      }`}>
        {(["all", "active", "filled", "cancelled"] as const).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-heading font-black uppercase border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#00C853] text-[#000000] border-2 border-[#00C853]"
                  : isLight
                  ? "bg-[#E0EDE0] border-2 border-[#00C853]/20 text-[#000000] hover:bg-[#C2DBC2]"
                  : "bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:opacity-80"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Protocol Diagnostic Logs */}
      <section className={`p-6 space-y-4 rounded-2xl ${
        isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
      }`}>
        <h3 className={`font-heading text-base font-black uppercase tracking-tight border-b pb-3 ${
          isLight ? "border-[#00C853]/20 text-black" : "border-slate-300 dark:border-white/5 text-black dark:text-white"
        }`}>
          On-Chain Contract Inventory Overview
        </h3>
        
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className={`py-12 text-center text-sm font-semibold uppercase ${isLight ? "text-black" : "text-slate-500"}`}>
              No orders found matching the filter option.
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[600px] font-mono">
              <thead>
                <tr className={`border-b font-sans font-black uppercase text-[10px] tracking-wider ${
                  isLight ? "border-[#00C853]/20 text-black" : "border-slate-300 dark:border-white/5 text-black dark:text-white"
                }`}>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Offered Lock</th>
                  <th className="py-3 px-4">Requested Ask</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-4">Creator Wallet</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight ? "divide-[#00C853]/20" : "divide-slate-200 dark:divide-white/3"
              }`}>
                {filteredOrders.map((o) => {
                  const isUSDCtoEURC = o.orderType === OrderType.USDCtoEURC;
                  const giveToken = isUSDCtoEURC ? "USDC" : "EURC";
                  const takeToken = isUSDCtoEURC ? "EURC" : "USDC";

                  // Formats
                  const showGive = parseFloat(formatUnits(o.offerAmount, 6)).toLocaleString();
                  const showTake = parseFloat(formatUnits(o.askAmount, 6)).toLocaleString();

                  const states = {
                    [OrderStatus.Active]: { 
                      label: "Active", 
                      cls: isLight
                        ? "text-[#007A33] bg-[#E8F5E9] border-[#00C853]"
                        : "text-[#00C853] bg-emerald-500/5 border-emerald-500/20" 
                    },
                    [OrderStatus.Filled]: { 
                      label: "Filled", 
                      cls: isLight
                        ? "text-slate-700 bg-slate-100 border-slate-300"
                        : "text-slate-400 bg-slate-50 dark:bg-white/3 border-transparent" 
                    },
                    [OrderStatus.Cancelled]: { 
                      label: "Cancelled", 
                      cls: isLight
                        ? "text-red-700 bg-red-50 border-red-300"
                        : "text-slate-400 bg-slate-50 dark:bg-white/3 border-transparent" 
                    },
                  };

                  return (
                    <tr key={o.id.toString()} className={`transition-colors select-text ${
                      isLight ? "hover:bg-[#F0F7F0]" : "hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}>
                      <td className="py-3 px-4 font-bold font-heading text-black dark:text-white">#{o.id.toString()}</td>
                      <td className="py-3 px-4 font-sans text-[10px] font-bold">
                        <span className="text-black dark:text-white">
                          {giveToken} → {takeToken}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-black dark:text-white font-semibold font-number">{showGive}</td>
                      <td className="py-3 px-4 text-black dark:text-white font-semibold font-number">{showTake}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${states[o.status].cls}`}>
                          {states[o.status].label}
                        </span>
                      </td>
                      <td className={`py-3 px-4 truncate text-[11px] ${isLight ? "text-black" : "text-slate-500"}`} title={o.creator}>
                        {o.creator.slice(0, 8)}...{o.creator.slice(-6)}
                      </td>
                      <td className="py-3 px-4 text-right select-none space-x-2">
                        <Link
                          to={`/order/${o.id.toString()}`}
                          className={`inline-block rounded border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                            isLight
                              ? "bg-[#E0EDE0] border-[#00C853]/30 text-black hover:bg-[#C2DBC2]"
                              : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"
                          }`}
                        >
                          Audits
                        </Link>
                        {o.status === OrderStatus.Active && (
                          <button
                            onClick={() => handleCancel(o.id)}
                            className="inline-flex items-center gap-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-2.5 py-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
