/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShieldCheck, HelpCircle, ArrowLeft, Check, Loader2, Info, ArrowUpRight, Copy } from "lucide-react";
import { formatUnits } from "viem";
import { Order, OrderType, OrderStatus, USDC_ADDRESS, EURC_ADDRESS, contractABI, parseContractOrder } from "../types";
import { useToast } from "./Toast";
import { parseWeb3Error } from "../utils/errorParser";
import { useTheme } from "./ThemeContext";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

interface OrderDetailViewProps {
  orders: Order[];
  address: string | undefined;
  isConnected: boolean;
  isDemoMode: boolean;
  approveToken: (token: string, amount: bigint) => Promise<string>;
  fillOrder: (id: bigint) => Promise<string>;
  getBalance: (token: string, owner: string) => Promise<bigint>;
}

export default function OrderDetailView({
  orders,
  address,
  isConnected,
  isDemoMode,
  approveToken,
  fillOrder,
  getBalance
}: OrderDetailViewProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [copiedCreator, setCopiedCreator] = useState(false);
  const [copiedFiller, setCopiedFiller] = useState(false);

  // Balanced checks
  const [matcherBalance, setMatcherBalance] = useState<bigint>(0n);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Two step fill state
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveSuccess, setApproveSuccess] = useState(false);
  const [fillSubmitting, setFillSubmitting] = useState(false);
  const [fillTxHash, setFillTxHash] = useState<string | null>(null);

  // Find order
  const queryClient = useQueryClient();

  const { data: rawContractOrder } = useReadContract({
    address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB' as `0x${string}`,
    abi: contractABI,
    functionName: 'getOrder',
    args: [BigInt(id || '0')],
    query: {
      enabled: !isDemoMode && !!id,
    }
  });

  const parsedContractOrder = rawContractOrder ? parseContractOrder(rawContractOrder, BigInt(id || '0')) : null;
  const orderFromList = orders.find((o) => o.id.toString() === id);
  const order = parsedContractOrder && parsedContractOrder.id !== 0n && parsedContractOrder.creator !== "0x0000000000000000000000000000000000000000" ? parsedContractOrder : orderFromList;

  const { isSuccess: isFillSuccess } = useWaitForTransactionReceipt({
    hash: (fillTxHash && !fillTxHash.startsWith("0x_demo_")) ? (fillTxHash as `0x${string}`) : undefined,
  });

  useEffect(() => {
    if (isFillSuccess && fillTxHash) {
      toast.success("Trade Confirmed on-chain!");
      queryClient.invalidateQueries();
    }
  }, [isFillSuccess, fillTxHash]);

  const askTokenAddress = order
    ? order.orderType === OrderType.USDCtoEURC
      ? EURC_ADDRESS
      : USDC_ADDRESS
    : null;

  const askSymbol = order
    ? order.orderType === OrderType.USDCtoEURC
      ? "EURC"
      : "USDC"
    : "";

  const offerSymbol = order
    ? order.orderType === OrderType.USDCtoEURC
      ? "USDC"
      : "EURC"
    : "";

  // Check matcher balance
  useEffect(() => {
    if (address && askTokenAddress) {
      setLoadingBalance(true);
      getBalance(askTokenAddress, address)
        .then((bal) => setMatcherBalance(bal))
        .catch(() => setMatcherBalance(0n))
        .finally(() => setLoadingBalance(false));
    } else {
      setMatcherBalance(0n);
    }
  }, [address, askTokenAddress, getBalance]);

  if (!order || order.id === 0n || order.creator === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <HelpCircle className="h-12 w-12 text-black dark:text-white mx-auto animate-bounce" />
        <h3 className="font-heading text-lg font-bold text-black dark:text-white">Order Not Found</h3>
        <p className="text-sm text-slate-500 select-none">
          The requested OTC order does not exist or has been removed from the platform.
        </p>
        <div className="pt-2">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 bg-black dark:bg-transparent border border-transparent dark:border-white text-white dark:text-white font-heading font-black text-xs px-4 py-2.5 rounded-xl hover:opacity-90 dark:hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back to Book</span>
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = address && order.creator.toLowerCase() === address.toLowerCase();

  // Price calculations and math
  const offerAmountNominal = parseFloat(formatUnits(order.offerAmount, 6));
  const askAmountNominal = parseFloat(formatUnits(order.askAmount, 6));
  const exchangeRate = (askAmountNominal / offerAmountNominal).toFixed(4);
  const inverseRate = (offerAmountNominal / askAmountNominal).toFixed(4);

  const isInsufficientBalance = address && matcherBalance > 0n && order.askAmount > matcherBalance;

  // Address operations
  const handleCopyCreator = () => {
    navigator.clipboard.writeText(order.creator);
    setCopiedCreator(true);
    setTimeout(() => setCopiedCreator(false), 2000);
  };

  const handleCopyFiller = () => {
    navigator.clipboard.writeText(order.filler);
    setCopiedFiller(true);
    setTimeout(() => setCopiedFiller(false), 2000);
  };

  // Step 1: Approve Ask Token Spending
  const handleApproveAskToken = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!askTokenAddress) return;

    try {
      setApproveSubmitting(true);
      toast.info(`Approving ${formatUnits(order.askAmount, 6)} ${askSymbol} spending for ArcOTC...`);
      await approveToken(askTokenAddress, order.askAmount);
      setApproveSuccess(true);
      toast.success(`Successfully approved ${askSymbol}! Move to Step 2 to execute Swap.`);
    } catch (err: any) {
      console.error(err);
      toast.error(parseWeb3Error(err, "Approve failed. Ensure you have tokens & gas."));
    } finally {
      setApproveSubmitting(false);
    }
  };

  // Step 2: Fill Order Exchange
  const handleFillOrder = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      setFillSubmitting(true);
      toast.info("Submitting direct Peer-to-Peer OTC swap trade...");
      const hash = await fillOrder(order.id);
      setFillTxHash(hash);
      toast.success(`Swap Trade Succeeded! Locked OTC assets matched dynamically.`);
    } catch (err: any) {
      console.error(err);
      toast.error(parseWeb3Error(err, "Match Swap transaction failed."));
    } finally {
      setFillSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 select-none" id={`order-detail-view-container-${order.id}`}>
      {/* Upper Navigation link back */}
      <div className="mb-6 flex items-center justify-between font-bold">
        <Link
          to="/orders"
          className={`inline-flex items-center gap-1.5 text-xs font-heading hover:opacity-85 transition-colors ${
            isLight ? "text-[#000000]" : "text-black dark:text-white"
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Browse All P2P Orders</span>
        </Link>
        <span className={`text-xs select-all font-mono ${isLight ? "text-[#000000]/70" : "text-slate-500"}`}>
          Ref: #{order.id.toString()}
        </span>
      </div>

      {/* Main Order Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Column (3/5 width on desktop) - Order specs review */}
        <div className="md:col-span-3 space-y-6">
          <div className={`p-6 space-y-6 rounded-2xl ${
            isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${
              isLight ? "border-[#00C853]/20" : "border-slate-300 dark:border-white/5"
            }`}>
              <h1 className={`font-heading text-xl font-black uppercase tracking-tight ${isLight ? "text-black" : "text-black dark:text-white"}`}>
                Order Review
              </h1>
              <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase ${
                order.status === OrderStatus.Active
                  ? isLight
                    ? "bg-[#E8F5E9] text-[#007A33] border-[#00C853]"
                    : "bg-slate-200 dark:bg-white/5 text-black dark:text-white border-slate-300 dark:border-white/10"
                  : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
              }`}>
                {order.status === OrderStatus.Active
                  ? "Active Lock"
                  : order.status === OrderStatus.Filled
                  ? "P2P Filled"
                  : "Cancelled"}
              </span>
            </div>

            {/* Asset Swap Graphics */}
            <div className="space-y-4">
              {/* Creator Offers */}
              <div className={`relative border p-4 rounded-xl ${
                isLight ? "bg-[#FFFFFF] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
              }`}>
                <span className={`text-[10px] uppercase tracking-widest font-semibold block select-none ${isLight ? "text-black" : "text-slate-500"}`}>
                  Tokens You Receive (Offered)
                </span>
                <div className={`text-2xl font-number font-black mt-1.5 flex items-baseline justify-between select-text ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
                  <span>{offerAmountNominal.toLocaleString()}</span>
                  <span className={`text-xs font-sans font-normal ${isLight ? "text-black" : "text-slate-500 dark:text-slate-400"}`}>{offerSymbol}</span>
                </div>
              </div>

              {/* Matcher Pays */}
              <div className={`relative border p-4 rounded-xl ${
                isLight ? "bg-[#FFFFFF] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
              }`}>
                <span className={`text-[10px] uppercase tracking-widest font-semibold block select-none ${isLight ? "text-black" : "text-slate-500"}`}>
                  Tokens You Give (Requested)
                </span>
                <div className={`text-2xl font-number font-black mt-1.5 flex items-baseline justify-between select-text ${isLight ? "text-[#1A1A1A]" : "text-black dark:text-white"}`}>
                  <span>{askAmountNominal.toLocaleString()}</span>
                  <span className={`text-xs font-sans font-normal ${isLight ? "text-black" : "text-slate-500 dark:text-slate-400"}`}>{askSymbol}</span>
                </div>
              </div>
            </div>

            {/* Price Conversions */}
            <div className={`border p-4 rounded-xl space-y-2 text-xs ${
              isLight ? "bg-[#E8F5E9] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
            }`}>
              <div className="flex justify-between">
                <span className={isLight ? "text-black" : "text-slate-500"}>P2P Swap Rate</span>
                <span className={`font-semibold font-number ${isLight ? "text-black" : "text-black dark:text-white"}`}>1 {offerSymbol} = {exchangeRate} {askSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-black" : "text-slate-500"}>Inverse Rate</span>
                <span className={`font-mono ${isLight ? "text-black" : "text-slate-500/80"}`}>1 {askSymbol} = {inverseRate} {offerSymbol}</span>
              </div>
            </div>

            {/* Copy addresses section */}
            <div className={`border-t pt-4 space-y-3.5 text-xs font-mono select-none ${
              isLight ? "border-[#00C853]/20" : "border-slate-300 dark:border-white/5"
            }`}>
              <div className="flex flex-col gap-1">
                <span className={isLight ? "text-black/80 font-bold" : "text-slate-500"}>Created By Address</span>
                <div className={`flex items-center gap-2 rounded-lg p-2 border ${
                  isLight ? "bg-[#FFFFFF] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
                }`}>
                  <span className={`truncate flex-1 select-text ${isLight ? "text-black" : "text-black dark:text-white"}`}>{order.creator}</span>
                  <button onClick={handleCopyCreator} type="button" className={`p-1 hover:opacity-80`}>
                    {copiedCreator ? <Check className={`h-4 w-4 ${isLight ? "text-[#007A33]" : "text-black dark:text-white"}`} /> : <Copy className={`h-4 w-4 ${isLight ? "text-black" : ""}`} />}
                  </button>
                </div>
              </div>

              {order.status === OrderStatus.Filled && (
                <div className="flex flex-col gap-1">
                  <span className={isLight ? "text-black/80 font-bold" : "text-slate-500"}>Filled By Address</span>
                  <div className={`flex items-center gap-2 rounded-lg p-2 border ${
                    isLight ? "bg-[#FFFFFF] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
                  }`}>
                    <span className={`truncate flex-1 select-text ${isLight ? "text-black" : "text-black dark:text-white"}`}>{order.filler}</span>
                    <button onClick={handleCopyFiller} type="button" className="p-1 hover:opacity-80">
                      {copiedFiller ? <Check className={`h-4 w-4 ${isLight ? "text-[#007A33]" : "text-black dark:text-white"}`} /> : <Copy className={`h-4 w-4 ${isLight ? "text-black" : ""}`} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Right Column (2/5 width on desktop) - Actions dashboard */}
        <div className="md:col-span-2 space-y-6">
          <div className={`p-6 space-y-5 rounded-2xl ${
            isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000]" : "card-glass"
          }`}>
            <h3 className={`font-heading text-lg font-black uppercase tracking-tight border-b pb-3 select-none ${
              isLight ? "border-[#00C853]/20 text-black" : "border-slate-300 dark:border-white/5 text-black dark:text-white"
            }`}>
              Active Trade actions
            </h3>

            {fillTxHash ? (
              /* If transaction filled successfully */
              <div className="space-y-4 text-center py-4">
                <div className="h-12 w-12 rounded-full border-2 border-black dark:border-white bg-[#E8F5E9] flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6 text-[#007A33] stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-heading font-black uppercase text-base text-black">Swap Filled!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                    Tokens transferred on chain. Swap settlement completed.
                  </p>
                </div>
                {fillTxHash.startsWith("0x_demo") ? (
                  <div className={`border rounded-lg p-2 text-[10px] truncate ${
                    isLight ? "bg-slate-50 border-slate-200 text-black" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-black dark:text-white"
                  }`}>
                    Tx Hash: {fillTxHash.replace("0x_demo_", "0x")}
                  </div>
                ) : (
                  <a
                    href={`https://testnet.arcscan.app/tx/${fillTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1 text-[11px] font-heading font-semibold text-black dark:text-white hover:underline"
                  >
                    <span>View transaction</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={() => navigate("/orders")}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all w-full cursor-pointer ${
                    isLight 
                      ? "bg-[#E0EDE0] hover:bg-[#C2DBC2] border-[#00C853] text-black" 
                      : "border-slate-300 dark:border-white/10 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  Return to Book
                </button>
              </div>
            ) : order.status !== OrderStatus.Active ? (
              /* If order is filled/cancelled by somebody else */
              <div className="text-center py-6 space-y-3">
                <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto" />
                <div className="text-sm font-medium text-black dark:text-white select-none">
                  {order.status === OrderStatus.Filled ? "Swap Already Completed" : "Order Cancelled"}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed select-none">
                  This transaction has already reached definitive settlement state and cannot be rematched.
                </p>
                <Link
                  to="/orders"
                  className="block mt-2 font-heading font-bold text-xs text-black dark:text-white hover:underline transition-colors"
                >
                  Browse Active Locks
                </Link>
              </div>
            ) : isCreator ? (
              /* If connected wallet is creator */
              <div className={`border rounded-xl p-4 text-center space-y-3 ${
                isLight ? "bg-[#E8F5E9] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border border-slate-250 dark:border-white/10"
              }`}>
                <Info className="h-7 w-7 text-[#007A33] dark:text-white mx-auto" />
                <h4 className="font-heading text-xs font-black uppercase tracking-wider text-black">
                  Owner Admin Controls
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You created this OTC order. Match filling actions are locked. If you wish to release your {offerSymbol}, you can Cancel this lock at any time.
                </p>
                <button
                  onClick={() => navigate("/my-orders")}
                  className={`w-full text-center block rounded-xl text-xs font-heading font-black py-2.5 transition-all cursor-pointer ${
                    isLight 
                      ? "bg-[#00C853] text-black hover:opacity-90 border-2 border-[#00C853]" 
                      : "bg-black dark:bg-transparent border border-transparent dark:border-white text-white dark:text-white hover:opacity-90 dark:hover:bg-white/10"
                  }`}
                >
                  Manage via Dashboard
                </button>
              </div>
            ) : !isConnected ? (
              /* If not connected */
              <div className="space-y-4 text-center">
                <p className="text-xs text-slate-400 leading-relaxed">
                  You need to connect an Ethereum Web3 wallet to match this trade on the smart contract.
                </p>
                <div className="pt-2 text-center text-xs text-slate-500 animate-pulse font-heading font-black uppercase">
                  ◀ Click Connect in header
                </div>
              </div>
            ) : (
              /* The Match Order 2-step Execution Wizard */
              <div className="space-y-4">
                <div className={`border rounded-lg p-3 flex justify-between text-xs ${
                  isLight ? "bg-[#E8F5E9] border-2 border-[#00C853]" : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                }`}>
                  <span className={isLight ? "text-black" : "text-slate-500"}>Your Balance</span>
                  <span className="text-black dark:text-white font-mono font-black">
                    {loadingBalance ? "..." : parseFloat(formatUnits(matcherBalance, 6)).toLocaleString()} {askSymbol}
                  </span>
                </div>

                {isInsufficientBalance && (
                  <div className="text-xs border border-red-500/30 bg-red-50/50 rounded-lg p-3 leading-relaxed text-red-600 font-medium">
                    ⚠️ Your balance of {askSymbol} is insufficient to match this P2P order. Get free EURC or USDC on the Circle Faucet!
                  </div>
                )}

                <div className={`space-y-3 border-t pt-4 font-heading text-xs select-none ${
                  isLight ? "border-[#00C853]/20" : "border-slate-300 dark:border-white/5"
                }`}>
                  {/* Step 1 Approve ask token */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                    approveSuccess
                      ? isLight
                        ? "bg-[#E8F5E9] border-2 border-[#00C853]"
                        : "bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10 text-black dark:text-white"
                      : isLight
                      ? "bg-[#FFFFFF] border-2 border-[#E0EDE0]"
                      : "bg-slate-100 dark:bg-[#111827] border-slate-200 dark:border-white/5"
                  }`}>
                    <div>
                      <div className="flex justify-between font-bold text-black dark:text-white">
                        <span>Step 1: Authorization</span>
                        {approveSuccess && <Check className="h-4 w-4 stroke-[3.5] text-[#007A33]" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-sans">
                        Authorize spender contract ArcOTC to pull {formatUnits(order.askAmount, 6)} {askSymbol}.
                      </p>
                    </div>

                    <button
                      onClick={handleApproveAskToken}
                      disabled={isInsufficientBalance || approveSuccess || approveSubmitting}
                      className={`w-full text-center py-2 rounded-lg text-xs font-black mt-3 transition-all cursor-pointer ${
                        approveSuccess
                          ? "bg-slate-150 dark:bg-white/10 text-slate-400 cursor-not-allowed border border-[#00C853]/20"
                          : isInsufficientBalance
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isLight
                          ? "bg-[#00C853] text-[#000000] border-2 border-[#00C853] hover:opacity-90"
                          : "bg-black dark:bg-transparent border border-transparent dark:border-white text-white dark:text-white hover:opacity-90 dark:hover:bg-white/10"
                      }`}
                    >
                      {approveSubmitting ? (
                        <span className="flex items-center justify-center gap-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Approving...
                        </span>
                      ) : approveSuccess ? (
                        "Approved Ask Token"
                      ) : (
                        `Approve ${askSymbol}`
                      )}
                    </button>
                  </div>

                  {/* Step 2 execution */}
                  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                    approveSuccess
                      ? isLight
                        ? "bg-[#E8F5E9] border-2 border-[#00C853]"
                        : "bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10 text-black dark:text-white"
                      : isLight
                      ? "bg-[#FFFFFF] border-2 border-[#E0EDE0]"
                      : "bg-slate-100 dark:bg-[#111827] border-slate-200 dark:border-white/5 opacity-60"
                  }`}>
                    <div>
                      <span className="font-bold text-black dark:text-white">Step 2: Instant Swap Match</span>
                      <p className="text-[11px] text-slate-500 mt-1 font-sans">
                        Trigger structural smart contract swap match. Offers lock released.
                      </p>
                    </div>

                    <button
                      onClick={handleFillOrder}
                      disabled={!approveSuccess || fillSubmitting}
                      className={`w-full text-center py-2 rounded-lg text-xs font-black mt-3 transition-all cursor-pointer ${
                        !approveSuccess
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : isLight
                          ? "bg-[#00C853] text-[#000000] border-2 border-[#00C853] hover:opacity-90"
                          : "bg-black dark:bg-transparent border border-transparent dark:border-white text-white dark:text-white hover:opacity-90 dark:hover:bg-white/10"
                      }`}
                    >
                      {fillSubmitting ? (
                        <span className="flex items-center justify-center gap-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Matching Swaper...
                        </span>
                      ) : (
                        "Fill P2P OTC Order"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
