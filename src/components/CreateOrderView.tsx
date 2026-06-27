/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Info, Check, ArrowRightLeft, Loader2 } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { useToast } from "./Toast";
import { OrderType, OWNER_WALLET, USDC_ADDRESS, EURC_ADDRESS, contractABI } from "../types";
import { useTheme } from "./ThemeContext";
import { useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

interface CreateOrderViewProps {
  isConnected: boolean;
  address: string | undefined;
  isDemoMode: boolean;
  approveToken: (tokenAddress: string, amount: bigint) => Promise<any>;
  createOrder: (orderType: OrderType, offerAmount: bigint, askAmount: bigint) => Promise<{ id: bigint; hash?: string }>;
  getBalance: (tokenAddress: string, ownerAddress: string) => Promise<bigint>;
  refetch: () => Promise<any>;
}

export default function CreateOrderView({
  isConnected,
  address,
  isDemoMode,
  approveToken,
  createOrder,
  getBalance,
  refetch,
}: CreateOrderViewProps) {
  const toast = useToast();
  const [orderType, setOrderType] = useState<OrderType>(OrderType.USDCtoEURC);
  const [offerAmount, setOfferAmount] = useState("");
  const [askAmount, setAskAmount] = useState("");

  const [step1Submitting, setStep1Submitting] = useState(false);
  const [step1Success, setStep1Success] = useState(false);
  const [step2Submitting, setStep2Submitting] = useState(false);
  const [createdOrderDetails, setCreatedOrderDetails] = useState<{ id: bigint } | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createdHash, setCreatedHash] = useState<`0x${string}` | null>(null);

  const { data: orderCount, refetch: refetchOrderCount } = useReadContract({
    address: '0xCc160767F53307958c0ff6bDd004406C5183B5cB',
    abi: contractABI,
    functionName: 'orderCounter',
    query: {
      enabled: !isDemoMode,
    }
  });

  const { isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createdHash || undefined,
  });

  React.useEffect(() => {
    if (isCreateSuccess && createdHash) {
      refetchOrderCount().then((res) => {
        const latestCount = res.data;
        if (latestCount !== undefined && latestCount !== null) {
          const newId = latestCount > 0n ? latestCount - 1n : 0n;
          setCreatedOrderDetails({ id: newId });
          toast.success(`P2P order created! Order ID #${newId.toString()}`);
          fetchBalances();
          refetch();
          queryClient.invalidateQueries();
          navigate(`/order/${newId.toString()}`);
        }
      });
    }
  }, [isCreateSuccess, createdHash]);

  const [balanceUSDC, setBalanceUSDC] = useState<bigint>(0n);
  const [balanceEURC, setBalanceEURC] = useState<bigint>(0n);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);

  const offerSymbol = orderType === OrderType.USDCtoEURC ? "USDC" : "EURC";
  const askSymbol = orderType === OrderType.USDCtoEURC ? "EURC" : "USDC";
  const balance = orderType === OrderType.USDCtoEURC ? balanceUSDC : balanceEURC;

  // React hook to retrieve balances
  const fetchBalances = React.useCallback(async () => {
    if (!isConnected || !address) {
      setBalanceUSDC(0n);
      setBalanceEURC(0n);
      setLoadingBalance(false);
      return;
    }
    setLoadingBalance(true);
    try {
      const usdcBal = await getBalance(USDC_ADDRESS, address);
      const eurcBal = await getBalance(EURC_ADDRESS, address);
      setBalanceUSDC(usdcBal);
      setBalanceEURC(eurcBal);
    } catch (err) {
      console.error("Error fetching balances inside CreateOrderView:", err);
    } finally {
      setLoadingBalance(false);
    }
  }, [isConnected, address, getBalance]);

  React.useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const isInsufficientBalance = (() => {
    if (!offerAmount || isNaN(Number(offerAmount))) return false;
    try {
      const parsedOffer = parseUnits(offerAmount, 6);
      return parsedOffer > balance;
    } catch {
      return false;
    }
  })();

  const isFormValid =
    offerAmount &&
    askAmount &&
    !isNaN(Number(offerAmount)) &&
    !isNaN(Number(askAmount)) &&
    Number(offerAmount) > 0 &&
    Number(askAmount) > 0;

  const exchangeRate = useMemo(() => {
    if (!isFormValid) return "0.0000";
    const r = Number(askAmount) / Number(offerAmount);
    return isNaN(r) ? "0.0000" : r.toFixed(4);
  }, [offerAmount, askAmount, isFormValid]);

  function useMemo<T>(factory: () => T, deps: any[]): T {
    return React.useMemo(factory, deps);
  }

  const handleToggleType = () => {
    setOrderType((prev) =>
      prev === OrderType.USDCtoEURC ? OrderType.EURCtoUSDC : OrderType.USDCtoEURC
    );
    setOfferAmount("");
    setAskAmount("");
    setStep1Success(false);
  };

  const handleApprove = async () => {
    if (!isFormValid || isInsufficientBalance) return;
    try {
      setStep1Submitting(true);
      const parsedAmount = parseUnits(offerAmount, 6);
      const tokenAddress = offerSymbol === "USDC" ? USDC_ADDRESS : EURC_ADDRESS;
      await approveToken(tokenAddress, parsedAmount);
      setStep1Success(true);
      toast.success(`Successfully approved ${offerSymbol}! You can now execute Step 2.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Approval failed.");
      setStep1Success(false);
    } finally {
      setStep1Submitting(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!step1Success || !isFormValid) return;
    try {
      setStep2Submitting(true);
      const parsedOffer = parseUnits(offerAmount, 6);
      const parsedAsk = parseUnits(askAmount, 6);

      const details = await createOrder(orderType, parsedOffer, parsedAsk);
      if (details.hash && !details.hash.startsWith("0x_demo_")) {
        setCreatedHash(details.hash as `0x${string}`);
        toast.info("Waiting for order creation confirmation on-chain...");
      } else {
        setCreatedOrderDetails(details);
        toast.success(`P2P order created! Order ID #${details.id.toString()}`);
        fetchBalances();
        refetch();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Lock order creation failed.");
    } finally {
      setStep2Submitting(false);
    }
  };

  const handleCreateNew = () => {
    setOfferAmount("");
    setAskAmount("");
    setStep1Success(false);
    setCreatedOrderDetails(null);
  };

  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="max-w-2xl mx-auto py-4 select-none" id="create-order-container">
      {/* Title */}
      <div className="border-b border-slate-300 dark:border-white/5 pb-6 mb-8 text-center sm:text-left">
        <h1 className="font-heading text-3xl font-black text-black dark:text-white uppercase tracking-tight">
          Create P2P OTC Order
        </h1>
        <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm mt-1">
          Lock offered assets in smart contract and set your target swap amount. No slippage guaranteed.
        </p>
      </div>

      {!isConnected ? (
        <div className={`p-8 text-center space-y-4 ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] rounded-2xl" : "card-glass rounded-2xl"
        }`}>
          <Info className="h-10 w-10 text-black dark:text-white mx-auto mb-1 animate-pulse" />
          <h3 className="font-heading text-lg font-bold text-black dark:text-white">Wallet Connection Required</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Please connect your wallet in the Navbar to create a custom peer-to-peer OTC transaction.
          </p>
        </div>
      ) : createdOrderDetails ? (
        /* Order Creation Success Card */
        <div className={`p-8 text-center space-y-6 animate-fadeIn ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000] rounded-2xl" : "card-glass rounded-2xl"
        }`} id="creation-success-box">
          <div className="h-16 w-16 bg-slate-200 dark:bg-white/5 border-2 border-black dark:border-white rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Check className="h-8 w-8 text-black dark:text-white stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-2xl font-black text-black dark:text-white tracking-tight uppercase">
              Order Created Successfully!
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your offering assets have been securely locked in the ArcOTC smart contract. Other wallets can now fill this order.
            </p>
          </div>

          <div className={`rounded-2xl p-6 text-sm max-w-md mx-auto space-y-3 ${
            isLight ? "bg-[#E8F5E9] border-2 border-[#00C853] text-[#000000]" : "bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10"
          }`}>
            <div className="flex justify-between">
              <span className={isLight ? "text-[#000000]" : "text-slate-500 font-medium"}>Order ID</span>
              <span className="text-black dark:text-white font-heading font-black">#{createdOrderDetails.id.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span className={isLight ? "text-[#000000]" : "text-slate-500 font-medium"}>Offered Lock</span>
              <span className="text-black dark:text-white font-number font-bold">{offerAmount} {offerSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className={isLight ? "text-[#000000]" : "text-slate-500 font-medium"}>Requested Ask</span>
              <span className="text-black dark:text-white font-number font-bold">{askAmount} {askSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className={isLight ? "text-[#000000]" : "text-slate-500 font-medium"}>Rate locked</span>
              <span className="text-black dark:text-white font-number font-bold">1 {offerSymbol} = {exchangeRate} {askSymbol}</span>
            </div>
          </div>

          {/* Action links */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={handleCreateNew}
              className="rounded-xl border border-slate-300 dark:border-white/10 px-6 py-3 font-heading text-xs font-bold text-black dark:text-white hover:bg-slate-150 dark:hover:bg-white/5 transition-all"
            >
              Create Another Order
            </button>
            <Link
              to={`/order/${createdOrderDetails.id.toString()}`}
              className="rounded-xl bg-[#00C853] border-2 border-[#00C853] px-6 py-3 font-heading text-xs font-black text-black transition-all hover:opacity-90"
            >
              Go to Order #{createdOrderDetails.id.toString()}
            </Link>
          </div>
        </div>
      ) : (
        /* The main OTC order creation form */
        <div className={`p-6 sm:p-8 space-y-6 ${
          isLight ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000] rounded-2xl" : "card-glass rounded-2xl"
        }`} id="create-order-form">
          <div className="space-y-4">
            
            {/* Toggle Button for trading path */}
            <div className={`flex justify-between items-center rounded-xl p-2 select-none ${
              isLight ? "bg-[#E8F5E9] border-2 border-[#00C853]" : "bg-white/5 border border-white/10"
            }`}>
              <button
                type="button"
                onClick={() => {
                  setOrderType(OrderType.USDCtoEURC);
                  setStep1Success(false);
                }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-heading font-black transition-all uppercase cursor-pointer ${
                  orderType === OrderType.USDCtoEURC
                    ? isLight
                      ? "bg-[#00C853] text-[#000000]"
                      : "bg-white text-black"
                    : isLight
                    ? "text-[#000000]/65 hover:text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Let's Offer USDC
              </button>
              
              <button
                type="button"
                onClick={handleToggleType}
                className={`mx-2 p-2 rounded-full transition-all cursor-pointer ${
                  isLight ? "text-black hover:bg-[#00C853]/25" : "text-white hover:bg-white/5"
                }`}
                title="Swap trade direction"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType(OrderType.EURCtoUSDC);
                  setStep1Success(false);
                }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-heading font-black transition-all uppercase cursor-pointer ${
                  orderType === OrderType.EURCtoUSDC
                    ? isLight
                      ? "bg-[#00C853] text-[#000000]"
                      : "bg-white text-black"
                    : isLight
                    ? "text-[#000000]/65 hover:text-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Let's Offer EURC
              </button>
            </div>

            {/* Step form input 1: Offer amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading select-none">
                <label className={`font-black uppercase text-xs ${isLight ? "text-[#000000]" : "text-slate-500"}`}>You are offering ({offerSymbol})</label>
                <span className={`flex items-center gap-1 font-mono ${isLight ? "text-[#000000]/70" : "text-slate-400"}`}>
                  Balance: {loadingBalance ? "..." : parseFloat(formatUnits(balance, 6)).toLocaleString()}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={offerAmount}
                  onChange={(e) => {
                    setOfferAmount(e.target.value);
                    setStep1Success(false);
                  }}
                  className={`w-full px-4 py-3.5 text-base focus:outline-none font-number font-bold rounded-xl ${
                    isLight 
                      ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000] placeholder-slate-400" 
                      : "bg-white/5 border border-white/10 text-white placeholder-slate-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setOfferAmount(formatUnits(balance, 6));
                    setStep1Success(false);
                  }}
                  className={`absolute right-3.5 top-3.5 text-[10px] font-bold font-heading uppercase px-2.5 py-1.5 rounded cursor-pointer ${
                    isLight ? "bg-[#E0EDE0] text-[#000000] hover:bg-[#C2DBC2]" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Max
                </button>
              </div>
              {isInsufficientBalance && (
                <p className="text-xs text-red-500 font-medium">
                  ⚠️ Entered offered amount exceeds your available wallet balance.
                </p>
              )}
            </div>

            {/* Step form input 2: Ask amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-heading select-none">
                <label className={`font-black uppercase text-xs ${isLight ? "text-[#000000]" : "text-slate-500"}`}>You will receive ({askSymbol})</label>
              </div>
              <input
                type="number"
                placeholder="0.00"
                step="any"
                value={askAmount}
                onChange={(e) => {
                  setAskAmount(e.target.value);
                  setStep1Success(false);
                }}
                className={`w-full px-4 py-3.5 text-base focus:outline-none font-number font-bold rounded-xl ${
                  isLight 
                    ? "bg-[#FFFFFF] border-2 border-[#00C853] text-[#000000] placeholder-slate-400" 
                    : "bg-white/5 border border-white/10 text-white placeholder-slate-500"
                }`}
              />
            </div>

            {/* Instant rate computation summary container */}
            {isFormValid && (
              <div className={`p-4 text-xs space-y-1.5 rounded-xl ${
                isLight 
                  ? "bg-[#E8F5E9] border-2 border-[#00C853] text-[#000000]" 
                  : "bg-white/5 border border-white/10 text-slate-300"
              }`}>
                <div className="flex justify-between">
                  <span className={isLight ? "text-[#000000]" : "text-slate-500"}>Expected Swap Rate</span>
                  <span className={`font-bold font-number ${isLight ? "text-[#000000]" : "text-white"}`}>1 {offerSymbol} = {exchangeRate} {askSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-[#000000]" : "text-slate-500"}>Opponent Inverse Rate</span>
                  <span className={`font-mono font-bold ${isLight ? "text-[#000000]" : "text-white"}`}>
                    1 {askSymbol} = {(parseFloat(offerAmount) / parseFloat(askAmount)).toFixed(4)} {offerSymbol}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Multi-step flow triggers */}
          <div className={`border-t pt-6 space-y-4 ${isLight ? "border-[#00C853]/25" : "border-slate-300 dark:border-white/5"}`}>
            <h4 className={`font-heading text-xs font-black uppercase tracking-wider ${isLight ? "text-[#000000]" : "text-slate-500"}`}>
              Execution Process Checkout
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Step 1 indicator block */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                step1Success
                  ? isLight
                    ? "bg-[#E8F5E9] border-2 border-[#00C853] text-[#000000]"
                    : "bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10 text-black dark:text-white"
                  : isLight
                  ? "bg-[#FFFFFF] border-2 border-[#E0EDE0] text-slate-500"
                  : "bg-slate-100 dark:bg-[#111827] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400"
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-number font-bold text-sm">Step 1</span>
                    {step1Success && <Check className="h-4 w-4 stroke-[3] text-[#007A33]" />}
                  </div>
                  <h5 className={`font-heading text-sm font-black mt-1 ${isLight ? "text-[#000000]" : "text-black dark:text-white"}`}>Approve Offer Lock</h5>
                  <p className="text-[11px] leading-relaxed mt-1 text-slate-500">
                    Before locks happen, authorize the ArcOTC contract to pull your offered {offerSymbol}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!isFormValid || isInsufficientBalance || step1Success || step1Submitting}
                  className={`w-full text-center py-2.5 rounded-lg text-xs font-heading font-black mt-4 transition-all uppercase cursor-pointer ${
                    step1Success
                      ? isLight
                        ? "bg-[#E0EDE0]/70 text-slate-400 cursor-not-allowed border border-[#00C853]/20"
                        : "bg-slate-150 dark:bg-white/10 text-slate-500 cursor-not-allowed border border-slate-300 dark:border-white/10"
                      : !isFormValid || isInsufficientBalance
                      ? isLight
                        ? "bg-[#E0EDE0] text-slate-400 cursor-not-allowed"
                        : "bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                      : isLight
                      ? "bg-[#00C853] text-[#000000] border-2 border-[#00C853] hover:opacity-90"
                      : "bg-white text-black hover:opacity-90"
                  }`}
                >
                  {step1Submitting ? (
                    <span className="flex items-center justify-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Approving...
                    </span>
                  ) : step1Success ? (
                    "Approved Token"
                  ) : (
                    `Approve ${offerSymbol}`
                  )}
                </button>
              </div>

              {/* Step 2 execution block */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                step1Success && !createdOrderDetails
                  ? isLight
                    ? "bg-[#E8F5E9] border-2 border-[#00C853] text-[#000000]"
                    : "bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10 text-black dark:text-white"
                  : isLight
                  ? "bg-[#FFFFFF] border-2 border-[#E0EDE0] text-slate-500"
                  : "bg-slate-100 dark:bg-[#111827] border-slate-200 dark:border-white/5 text-slate-500"
              }`}>
                <div>
                  <span className="font-number font-bold text-sm">Step 2</span>
                  <h5 className={`font-heading text-sm font-black mt-1 ${isLight ? "text-[#000000]" : "text-black dark:text-white"}`}>Confirm OTC Lock Order</h5>
                  <p className="text-[11px] leading-relaxed mt-1 text-slate-500">
                    Commit the transaction. This securely transfers your {offerSymbol} to the contract storage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={!step1Success || step2Submitting}
                  className={`w-full text-center py-2.5 rounded-lg text-xs font-heading font-black mt-4 transition-all uppercase cursor-pointer ${
                    !step1Success
                      ? isLight
                        ? "bg-[#E0EDE0] text-slate-400 cursor-not-allowed"
                        : "bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                      : isLight
                      ? "bg-[#00C853] text-[#000000] border-2 border-[#00C853] hover:opacity-90"
                      : "bg-white text-black hover:opacity-90"
                  }`}
                >
                  {step2Submitting ? (
                    <span className="flex items-center justify-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Minting lock...
                    </span>
                  ) : (
                    "Lock & Create Order"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
