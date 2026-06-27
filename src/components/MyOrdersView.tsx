/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FolderHeart, Briefcase, PlusCircle, Compass, Trash2, CheckCircle, ArrowDownRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUnits } from "viem";
import { Order, OrderType, OrderStatus, contractABI, parseContractOrder } from "../types";
import { useToast } from "./Toast";
import { parseWeb3Error } from "../utils/errorParser";
import { useTheme } from "./ThemeContext";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

interface MyOrdersViewProps {
  orders: Order[];
  address: string | undefined;
  isConnected: boolean;
  isDemoMode: boolean;
  onCancelOrder: (id: bigint) => Promise<any>;
  onRefetch?: () => Promise<any>;
  cancelledIds: bigint[];
  setCancelledIds: React.Dispatch<React.SetStateAction<bigint[]>>;
}

export default function MyOrdersView({ orders, address, isConnected, isDemoMode, onCancelOrder, onRefetch, cancelledIds, setCancelledIds }: MyOrdersViewProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<"created" | "filled">("created");

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

  const queryClient = useQueryClient();

  const { data: myOrderIds } = useReadContract({
    address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB' as `0x${string}`,
    abi: contractABI,
    functionName: 'getCreatorOrders',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !isDemoMode && !!address,
    },
  });

  const { data: myFilledOrderIds } = useReadContract({
    address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB' as `0x${string}`,
    abi: contractABI,
    functionName: 'getFilledOrders',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !isDemoMode && !!address,
    },
  });

  const { data: myCreatedRawContracts } = useReadContracts({
    contracts: (myOrderIds as bigint[])?.map((id) => ({
      address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB' as `0x${string}`,
      abi: contractABI,
      functionName: 'getOrder',
      args: [id],
    })) || [],
    query: {
      enabled: !isDemoMode && !!myOrderIds && (myOrderIds as bigint[]).length > 0,
    }
  });

  const { data: myFilledRawContracts } = useReadContracts({
    contracts: (myFilledOrderIds as bigint[])?.map((id) => ({
      address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB' as `0x${string}`,
      abi: contractABI,
      functionName: 'getOrder',
      args: [id],
    })) || [],
    query: {
      enabled: !isDemoMode && !!myFilledOrderIds && (myFilledOrderIds as bigint[]).length > 0,
    }
  });

  const myCreatedContractOrders = useMemo(() => {
    if (!myCreatedRawContracts) return [];
    return myCreatedRawContracts
      .map((item: any, idx: number) => {
        if (item.status === 'success' && item.result) {
          const fallbackId = (myOrderIds as bigint[])?.[idx];
          return parseContractOrder(item.result, fallbackId);
        }
        return null;
      })
      .filter((o): o is Order => o !== null);
  }, [myCreatedRawContracts, myOrderIds]);

  const myFilledContractOrders = useMemo(() => {
    if (!myFilledRawContracts) return [];
    return myFilledRawContracts
      .map((item: any, idx: number) => {
        if (item.status === 'success' && item.result) {
          const fallbackId = (myFilledOrderIds as bigint[])?.[idx];
          return parseContractOrder(item.result, fallbackId);
        }
        return null;
      })
      .filter((o): o is Order => o !== null);
  }, [myFilledRawContracts, myFilledOrderIds]);

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

  // Split your orders
  const myCreatedOrders = useMemo(() => {
    if (!address) return [];
    const baseOrders = (myCreatedContractOrders && myCreatedContractOrders.length > 0)
      ? myCreatedContractOrders
      : orders.filter((o) => o.creator.toLowerCase() === address.toLowerCase());

    return baseOrders.filter(
      (order) =>
        !cancelledIds.includes(order.id) &&
        order.status !== OrderStatus.Cancelled &&
        Number(order.status) !== 2
    );
  }, [orders, address, myCreatedContractOrders, cancelledIds]);

  const myFilledOrders = useMemo(() => {
    if (!address) return [];
    const baseOrders = (myFilledContractOrders && myFilledContractOrders.length > 0)
      ? myFilledContractOrders
      : orders.filter((o) => o.filler.toLowerCase() === address.toLowerCase() && o.status === OrderStatus.Filled);

    return baseOrders.filter((order) => !cancelledIds.includes(order.id));
  }, [orders, address, myFilledContractOrders, cancelledIds]);

  if (!isConnected || !address) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Compass className="h-12 w-12 text-black dark:text-white mx-auto animate-pulse" />
        <h3 className="font-heading text-xl font-black text-black dark:text-white uppercase select-none">
          Wallet Connection Required
        </h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
          Connect your wallet in the top navigation bar to view your personalized trade history and locked assets.
        </p>
      </div>
    );
  }

  const currentList = activeTab === "created" ? myCreatedOrders : myFilledOrders;

  return (
    <div className="space-y-8 py-4 select-none" id="my-orders-view-box">
      {/* Page Header */}
      <div className="border-b border-slate-300 dark:border-white/5 pb-6">
        <h1 className="font-heading text-3xl font-black text-black dark:text-white uppercase tracking-tight">
          My OTC Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Review, manage, or cancel your active locks, and explore your finished peer-to-peer matching swaps.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-300 dark:border-white/5 gap-4">
        <button
          onClick={() => setActiveTab("created")}
          className={`px-4 py-3 font-heading text-sm font-bold uppercase relative transition-colors ${
            activeTab === "created" 
              ? isLight ? "text-black" : "text-white" 
              : "text-slate-500 hover:text-black dark:hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Created Orders ({myCreatedOrders.length})</span>
          </span>
          {activeTab === "created" && (
            <motion.div layoutId="myOrdersTab" className={`absolute bottom-0 left-0 w-full h-[2.5px] ${isLight ? "bg-emerald-500" : "bg-white"}`} />
          )}
        </button>

        <button
          onClick={() => setActiveTab("filled")}
          className={`px-4 py-3 font-heading text-sm font-bold uppercase relative transition-colors ${
            activeTab === "filled" 
              ? isLight ? "text-black" : "text-white" 
              : "text-slate-500 hover:text-black dark:hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>Filled Swaps ({myFilledOrders.length})</span>
          </span>
          {activeTab === "filled" && (
            <motion.div layoutId="myOrdersTab" className={`absolute bottom-0 left-0 w-full h-[2.5px] ${isLight ? "bg-emerald-500" : "bg-white"}`} />
          )}
        </button>
      </div>

      {/* Grid Content */}
      <AnimatePresence mode="popLayout">
        {currentList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-16 text-center rounded-2xl select-none ${
              isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
            }`}
          >
            <FolderHeart className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className={`font-heading text-lg font-bold uppercase ${isLight ? "text-semibold text-black" : "text-white"}`}>
              No Orders Displayed
            </h3>
            <p className={`text-sm max-w-sm mx-auto mt-1 mb-6 text-black dark:text-slate-500`}>
              {activeTab === "created"
                ? "You haven't initialized any OTC orders yet. Try locking offered assets now!"
                : "No orders filled by your address yet. Match existing liquidity on our OTC board."}
            </p>
            <div className="flex justify-center gap-4">
              {activeTab === "created" ? (
                <Link
                  to="/create"
                  className="rounded-xl border border-transparent px-5 py-2.5 text-xs font-heading font-black text-black bg-[#00C853] hover:opacity-90 transition-all"
                >
                  Create New Order
                </Link>
              ) : (
                <Link
                  to="/orders"
                  className="rounded-xl border border-slate-350 dark:border-white/10 px-5 py-2.5 text-xs font-heading font-black text-black bg-[#E0EDE0] hover:bg-[#C2DBC2] transition-all"
                >
                  Browse Order Book
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
            id="my-orders-dashboard-grid"
          >
            {currentList.map((order) => {
              const isUSDCtoEURC = order.orderType === OrderType.USDCtoEURC;
              const offerToken = isUSDCtoEURC ? "USDC" : "EURC";
              const askToken = isUSDCtoEURC ? "EURC" : "USDC";

              // Formatting decimals
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
                  ? "bg-red-50 text-red-700 border-red-300"
                  : "bg-red-950/30 text-red-400 border-red-900/30";
              }

              const truncFiller = order.filler !== "0x0000000000000000000000000000000000000000"
                ? `${order.filler.slice(0, 6)}...${order.filler.slice(-4)}`
                : "None";

              return (
                <motion.div
                  key={order.id.toString()}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-6 space-y-4 hover:shadow-lg transition-all rounded-2xl ${
                    isLight 
                      ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" 
                      : "card-glass"
                  }`}
                  id={`my-orders-dash-card-${order.id}`}
                >
                  {/* Header */}
                  <div className={`flex items-center justify-between border-b pb-3 ${
                    isLight ? "border-[#00C853]/20" : "border-slate-300 dark:border-white/5"
                  }`}>
                    <span className={`font-heading text-xs font-black ${isLight ? "text-black" : "text-black dark:text-white"}`}>
                      Order ID #{order.id.toString()}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Swap Direction Info Banner */}
                  <div className="flex items-center justify-between text-xs select-none">
                    <span className={`uppercase font-black font-heading tracking-wide ${isLight ? "text-black" : "text-slate-500"}`}>Swap Direction</span>
                    <span className="bg-[#00C853]/10 text-[#007A33] dark:text-[#00C853] px-2.5 py-1 rounded-lg font-heading font-black text-[10px] uppercase border border-[#00C853]/20">
                      {isUSDCtoEURC ? "USDC → EURC" : "EURC → USDC"}
                    </span>
                  </div>

                  {/* Transfer graphic box */}
                  <div className={`grid grid-cols-2 gap-4 items-center border rounded-xl p-3.5 ${
                    isLight ? "bg-[#FFFFFF] border-2 border-[#00C853]" : "bg-white/5 border-white/10"
                  }`}>
                    <div>
                      <div className={`text-[10px] font-bold uppercase ${isLight ? "text-black" : "text-slate-500"}`}>You are offering</div>
                      <div className={`text-base font-number font-black ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
                        {offerAmountStr} <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">{offerToken}</span>
                      </div>
                    </div>
                    <div>
                      <div className={`text-[10px] font-bold uppercase ${isLight ? "text-black" : "text-slate-500"}`}>You will receive</div>
                      <div className={`text-base font-number font-black ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
                        {askAmountStr} <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400">{askToken}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and detail stats */}
                  <div className={`flex flex-col gap-1 text-xs select-text ${isLight ? "text-black" : "text-slate-500"}`}>
                    <div className="flex justify-between">
                      <span>Set Swap Rate</span>
                      <span className={`font-semibold font-number ${isLight ? "text-black" : "text-black dark:text-white"}`}>1 {offerToken} = {roundedRate} {askToken}</span>
                    </div>
                    {order.status === OrderStatus.Filled && (
                      <div className="flex justify-between">
                        <span>Counterparty Match</span>
                        <span className={`font-mono ${isLight ? "text-black" : "text-black dark:text-white"}`}>{truncFiller}</span>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="pt-2 flex gap-2">
                    {order.status === 0 && address && (order.creator.toLowerCase() === address.toLowerCase() || address.toLowerCase() === "0x4bdb490a62a67d42638d035e41956d0bfac558b6") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(order.id);
                        }}
                        className="flex-1 select-none shrink-0 flex items-center justify-center gap-2 rounded-xl bg-slate-150 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 py-2.5 text-xs font-heading font-black transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Cancel Order</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/order/${order.id.toString()}`)}
                      className={`flex-1 select-none flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-heading font-black transition-all ${
                        isLight 
                          ? "bg-[#E0EDE0] hover:bg-[#C2DBC2] border border-[#00C853]/20 text-black" 
                          : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>Review Details</span>
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    </button>
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
