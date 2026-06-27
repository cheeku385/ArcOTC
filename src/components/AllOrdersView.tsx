/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, HelpCircle, Eye, Trash2, CheckCircle, ArrowDownUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUnits } from "viem";
import { Order, OrderType, OrderStatus } from "../types";
import { useToast } from "./Toast";
import { useTheme } from "./ThemeContext";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

interface AllOrdersViewProps {
  orders: Order[];
  address: string | undefined;
  onCancelOrder: (id: bigint) => Promise<any>;
  onRefetch?: () => Promise<any>;
  cancelledIds: bigint[];
  setCancelledIds: React.Dispatch<React.SetStateAction<bigint[]>>;
}

// Framer Motion variants for staggered loading list of orders
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

export default function AllOrdersView({ orders, address, onCancelOrder, onRefetch, cancelledIds, setCancelledIds }: AllOrdersViewProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const queryClient = useQueryClient();

  const [cancellingId, setCancellingId] = useState<bigint | null>(null);
  const { writeContract, data: hash } = useWriteContract();

  const handleCancel = async (orderId: any) => {
    try {
      const bId = BigInt(orderId);
      setCancellingId(bId);
      toast.info(`Cancelling lock order #${orderId.toString()}...`);
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

  // Filter States
  const [activeTab, setActiveTab] = useState<"all" | "active" | "filled" | "cancelled">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "usdc" | "eurc">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => !cancelledIds.includes(order.id))
      .filter((order) => {
        // 1. Status Filter
        // Show only Active (0) and Filled (1) orders unless user specifically filters cancelled
        if (activeTab === "all" && (order.status === OrderStatus.Cancelled || Number(order.status) === 2)) return false;

        if (activeTab === "active" && order.status !== OrderStatus.Active) return false;
        if (activeTab === "filled" && order.status !== OrderStatus.Filled) return false;
        if (activeTab === "cancelled" && (order.status !== OrderStatus.Cancelled && Number(order.status) !== 2)) return false;

        // 2. Type/Asset Filter
        if (typeFilter === "usdc" && order.orderType !== OrderType.USDCtoEURC) return false;
        if (typeFilter === "eurc" && order.orderType !== OrderType.EURCtoUSDC) return false;

        // 3. Search Query (creator address or ID)
        if (searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase();
          const matchesAddress = order.creator.toLowerCase().includes(query);
          const matchesId = order.id.toString().includes(query);
          if (!matchesAddress && !matchesId) return false;
        }

        return true;
      });
  }, [orders, activeTab, typeFilter, searchQuery, cancelledIds]);



  return (
    <div className="space-y-8 py-4" id="all-orders-container">
      {/* Header and subtitle */}
      <div className="border-b border-slate-300 dark:border-white/5 pb-6">
        <h1 className="font-heading text-3xl font-black text-black dark:text-white uppercase tracking-tight">
          P2P OTC Order Book
        </h1>
        <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm mt-1">
          Browse active peer-to-peer liquidity locks. Match any order instantly with direct contract swaps.
        </p>
      </div>

      {/* Filter and Search Bar controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/5 rounded-2xl p-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "filled", "cancelled"] as const).map((tab) => {
            const counts = {
              all: orders.length,
              active: orders.filter((o) => o.status === OrderStatus.Active).length,
              filled: orders.filter((o) => o.status === OrderStatus.Filled).length,
              cancelled: orders.filter((o) => o.status === OrderStatus.Cancelled).length,
            };

            const isSelected = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-heading font-bold uppercase transition-all duration-200 border ${
                  isSelected
                    ? isLight
                      ? "bg-[#00C853] text-[#000000] border-[#00C853]"
                      : "bg-white text-black border-white"
                    : isLight
                    ? "bg-[#E0EDE0] text-[#000000] border-[#E0EDE0]"
                    : "bg-[#111827] border-white/10 text-slate-300"
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  isSelected 
                    ? isLight 
                      ? "bg-black/10 text-black font-semibold" 
                      : "bg-black/10 text-white" 
                    : isLight 
                    ? "bg-[#D0DDD0] text-black" 
                    : "bg-[#0B0F19] text-slate-400"
                }`}>
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Type & Search Box */}
        <div className="flex flex-col sm:flex-row gap-2 select-none">
          {/* Asset Swapper select toggle */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="appearance-none bg-slate-200 dark:bg-[#111827] border border-slate-300 dark:border-white/10 text-xs text-black dark:text-white px-4 py-2.5 pr-8 rounded-xl font-heading font-semibold uppercase focus:outline-none cursor-pointer"
            >
              <option value="all">All Pairs</option>
              <option value="usdc">USDC → EURC</option>
              <option value="eurc">EURC → USDC</option>
            </select>
            <div className="absolute right-3 top-3.5 pointer-events-none text-black dark:text-white">
              <ArrowDownUp className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Search box icon input */}
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search by ID or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-200 dark:bg-[#111827] border border-slate-300 dark:border-white/10 rounded-xl px-10 py-2.5 text-xs text-black dark:text-white placeholder-slate-500 focus:outline-none"
            />
            <div className="absolute left-3.5 top-3.5 text-slate-500">
              <Search className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <AnimatePresence mode="popLayout">
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-16 text-center select-none ${
              isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] rounded-2xl" : "card-glass"
            }`}
          >
            <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className={`font-heading text-lg font-bold uppercase text-black dark:text-white`}>No Orders Found</h3>
            <p className={`text-sm max-w-sm mx-auto mt-1 text-black dark:text-slate-400`}>
              There are no orders that match your current filters. Adjust your search or type settings.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            id="all-orders-grid"
          >
            {filteredOrders.map((order) => {
              const isUSDCtoEURC = order.orderType === OrderType.USDCtoEURC;
              const offerToken = isUSDCtoEURC ? "USDC" : "EURC";
              const askToken = isUSDCtoEURC ? "EURC" : "USDC";

              // Decimal formatting
              const offerAmountStr = parseFloat(formatUnits(order.offerAmount, 6)).toLocaleString();
              const askAmountStr = parseFloat(formatUnits(order.askAmount, 6)).toLocaleString();

              // Rates
              const rateVal = parseFloat(formatUnits(order.askAmount, 6)) / parseFloat(formatUnits(order.offerAmount, 6));
              const roundedRate = rateVal.toFixed(4);

              // Status Styling
              let statusText = "Active";
              let statusClass = isLight
                ? "bg-[#E8F5E9] text-[#007A33] border-[#00C853]"
                : "bg-emerald-950/30 text-[#00C853] border-[#00C853]/30";
              if (order.status === OrderStatus.Filled) {
                statusText = "Filled";
                statusClass = isLight
                  ? "bg-slate-100 text-slate-700 border-slate-300"
                  : "bg-slate-800/30 text-slate-400 border-slate-700/30";
              } else if (order.status === OrderStatus.Cancelled) {
                statusText = "Cancelled";
                statusClass = isLight
                  ? "bg-red-50 text-red-700 border-red-350"
                  : "bg-red-950/30 text-red-400 border-red-900/30";
              }

              const truncCreator = `${order.creator.slice(0, 6)}...${order.creator.slice(-4)}`;

              // Derive pseudo time ago from ID numbers
              const mockTimeAgo = order.id <= 3n ? "1 day ago" : "Just now";

              return (
                <motion.div
                  key={order.id.toString()}
                  variants={itemVariants}
                  layout
                  className={`p-6 space-y-4 hover:shadow-lg cursor-pointer transition-all ${
                    isLight 
                      ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000] rounded-2xl" 
                      : "card-glass rounded-2xl"
                  }`}
                  onClick={() => navigate(`/order/${order.id.toString()}`)}
                  id={`all-orders-card-${order.id}`}
                >
                  {/* Card head */}
                  <div className={`flex items-center justify-between border-b pb-3.5 ${
                    isLight ? "border-[#00C853]/25" : "border-slate-300 dark:border-white/5"
                  }`}>
                    <div>
                      <span className={`font-heading text-xs font-black ${isLight ? "text-[#000000]" : "text-black dark:text-white"}`}>
                        Order #{order.id.toString()}
                      </span>
                      <span className={`text-[10px] ml-2 font-mono ${isLight ? "text-[#000000]" : "text-slate-500"}`}>{mockTimeAgo}</span>
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Swap Direction explicit block */}
                  <div className="flex items-center justify-between text-xs select-none">
                    <span className={`uppercase font-black font-heading tracking-wide ${isLight ? "text-[#000000]" : "text-slate-500"}`}>Swap Direction</span>
                    <span className="bg-[#00C853]/10 text-[#007A33] dark:text-[#00C853] px-2.5 py-1 rounded-lg font-heading font-black text-[10px] uppercase border border-[#00C853]/20">
                      {isUSDCtoEURC ? "USDC → EURC" : "EURC → USDC"}
                    </span>
                  </div>

                  {/* Offer Ask block */}
                  <div className={`space-y-2 border rounded-2xl p-4 ${
                    isLight ? "bg-[#FFFFFF] border-2 border-[#00C853]" : "bg-white/5 border-white/10"
                  }`}>
                    <div>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-[#000000]" : "text-slate-500"}`}>
                        Locking Offer
                      </span>
                      <div className={`text-xl font-number font-black mt-1 flex items-baseline justify-between ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
                        <span>{offerAmountStr}</span>
                        <span className={`text-xs font-semibold ${isLight ? "text-[#000000]" : "text-slate-500 dark:text-slate-400"}`}>{offerToken}</span>
                      </div>
                    </div>

                    <div className={isLight ? "h-[1px] bg-[#00C853]/20" : "h-[1px] bg-slate-200 dark:bg-white/5"} />

                    <div>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-[#000000]" : "text-slate-500"}`}>
                        Requesting Ask
                      </span>
                      <div className={`text-xl font-number font-black mt-1 flex items-baseline justify-between ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
                        <span>{askAmountStr}</span>
                        <span className={`text-xs font-semibold ${isLight ? "text-[#000000]" : "text-slate-500 dark:text-slate-400"}`}>{askToken}</span>
                      </div>
                    </div>
                  </div>

                  {/* Meta / creator */}
                  <div className={`flex flex-col gap-1 text-xs ${isLight ? "text-[#000000]" : "text-slate-500 dark:text-slate-400"}`}>
                    <div className="flex justify-between">
                      <span>Swap Rate</span>
                      <span className={`font-semibold font-number ${isLight ? "text-[#000000]" : "text-black dark:text-white"}`}>1 {offerToken} = {roundedRate} {askToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Creator Address</span>
                      <span className={`font-mono ${isLight ? "text-[#000000]" : "text-black dark:text-white"}`} title={order.creator}>{truncCreator}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-2 flex gap-2">
                    {order.status === 0 && address && (order.creator.toLowerCase() === address.toLowerCase() || address.toLowerCase() === "0x4bdb490a62a67d42638d035e41956d0bfac558b6") ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(order.id);
                        }}
                        className="flex-1 shrink-0 flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 py-2.5 text-xs font-heading font-black transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Cancel Order</span>
                      </button>
                    ) : order.status === 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/order/${order.id.toString()}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#00C853] text-[#000000] py-2.5 text-xs font-heading font-black transition-all hover:scale-[1.02]"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Swap Tokens Now</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/order/${order.id.toString()}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 py-2.5 text-xs font-heading font-medium transition-all"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Lock Logs</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
