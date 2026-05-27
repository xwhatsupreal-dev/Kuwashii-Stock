import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, ShoppingCart, ExternalLink, Send, Coins, Users } from 'lucide-react';
import { StockItem } from '../types';

interface InquiryModalProps {
  item: StockItem | null;
  onClose: () => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({ item, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(1);
      setCopied(false);
    }
  }, [item]);

  if (!item) return null;

  const hasPieces = item.piecesPerUnit && item.piecesPerUnit > 1;
  const unitLabel = hasPieces ? 'ชุด' : 'ชิ้น';
  const totalPiecesCount = quantity * (item.piecesPerUnit || 1);
  const totalItemPiecesDetail = hasPieces ? `\n• ได้รับของจริงทั้งหมด: ${totalPiecesCount} ชิ้น (${item.piecesPerUnit} ชิ้นต่อชุด)` : '';

  const totalPrice = item.price * quantity;

  // Generate localized order templates
  const purchaseMessage = `🛒 [สั่งซื้อ] AOT Revolution Stock
   • สินค้า: ${item.name} (${item.category} | ${item.rarity})
   • จำนวน: ${quantity} ${unitLabel}${hasPieces ? ` (รวม ${totalPiecesCount} ชิ้น)` : ''}
   • ราคารวม: ฿${totalPrice.toLocaleString()} บาท (${hasPieces ? 'ชุด' : 'ชิ้น'}ละ ฿${item.price.toLocaleString()} บาท)
   💬 ติดต่อแอดมิน: Kuwashii El (m.me/kuwashii)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(purchaseMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRarityBadgeStyle = (rarity: StockItem['rarity']) => {
    switch (rarity) {
      case 'Mythic': return 'bg-red-500/10 border-red-500/40 text-red-400';
      case 'Legendary': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'Epic': return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
      case 'Rare': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default: return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Absolute Backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
        >
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-purple-600" />

          {/* Header */}
          <div className="flex items-center justify-between mb-3 mt-1 flex-shrink-0">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
              <span>สรุปรายการสั่งซื้อ</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              id="btn-close-inquiry"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Scrollable Content wrapper to prevent full-screen takeover on small viewports */}
          <div className="overflow-y-auto space-y-3.5 pr-0.5 scrollbar-thin scrollbar-thumb-zinc-800 pb-1 flex-1">
            {/* Item details card preview */}
            <div className="flex gap-3 p-2.5 rounded-xl border border-zinc-900 bg-zinc-900/30">
              <div className="w-14 h-14 bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <ShoppingCart className="w-6 h-6 text-zinc-650" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded border ${getRarityBadgeStyle(item.rarity)}`}>
                    {item.rarity}
                  </span>
                  <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider">{item.category}</span>
                </div>
                <h4 className="font-display font-semibold text-white text-sm leading-snug truncate">{item.name}</h4>
                <p className="font-mono text-xs font-bold text-amber-400 mt-0.5">
                  ฿{item.price.toLocaleString()} / {hasPieces ? `ชุด (${item.piecesPerUnit} ชิ้น)` : 'ชิ้น'}
                </p>
              </div>
            </div>

            {/* Dedicated full item description wrapper */}
            {item.description && (
              <div className="bg-zinc-900/20 p-3 rounded-xl border border-zinc-900 text-xs leading-relaxed">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1 font-sans">📝 คำอธิบายสินค้า / รายละเอียด:</span>
                <p className="text-zinc-200 whitespace-pre-wrap font-sans font-medium text-[11px] leading-relaxed break-words">
                  {item.description}
                </p>
              </div>
            )}

            {/* Quantity Selector Slider & Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-400 font-sans">
                  {hasPieces ? 'จำนวนชุดที่ต้องการ:' : 'จำนวนชิ้นที่ต้องการ:'}
                </span>
                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-900 rounded-lg p-0.5">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-md flex items-center justify-center font-bold font-mono text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    id="btn-dec-inquiry-qty"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-white font-mono font-bold text-xs">
                    {quantity} <span className="text-[9px] text-zinc-450 font-normal">{unitLabel}</span>
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= item.quantity}
                    onClick={() => setQuantity((prev) => Math.min(item.quantity, prev + 1))}
                    className="w-7 h-7 rounded-md flex items-center justify-center font-bold font-mono text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                    id="btn-inc-inquiry-qty"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Slider control */}
              {item.quantity > 1 && (
                <div className="space-y-0.5">
                  <input
                    type="range"
                    min="1"
                    max={item.quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[8px] text-zinc-550 font-mono">
                    <span>1 {unitLabel}</span>
                    <span>สูงสุด {item.quantity} {unitLabel} {hasPieces ? `(รวม ${item.quantity * (item.piecesPerUnit || 1)} ชิ้น)` : ''}</span>
                  </div>
                </div>
              )}

              {/* Live calculation preview during purchase */}
              {hasPieces && (
                <div className="bg-zinc-900/30 px-2 py-1.5 rounded-lg border border-zinc-905 text-[10px] flex justify-between items-center text-zinc-400 leading-none">
                  <span>🎁 จะได้รับรวมเสมือนจริง:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {quantity} ชุด × {item.piecesPerUnit} = <strong className="text-white font-black text-xs">{quantity * (item.piecesPerUnit || 1)} ชิ้น</strong>
                  </span>
                </div>
              )}

              {/* Total price section */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-900 bg-zinc-950">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-sans text-zinc-450">ราคาทั้งสิ้น:</span>
                </div>
                <span className="font-mono text-base font-black text-white">
                  ฿{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Clipboard Message Copy Center */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-450 font-sans block">กล่องแชทข้อความสั่งซื้อด่วน:</span>
              <div className="relative">
                <pre className="text-[10px] font-mono leading-relaxed bg-zinc-900 border border-zinc-900 py-2 px-2.5 rounded-lg text-zinc-350 whitespace-pre h-16 overflow-y-auto overflow-x-hidden scrollbar">
                  {purchaseMessage}
                </pre>
                <div className="absolute top-1.5 right-1.5">
                  <button
                    onClick={handleCopy}
                    className={`p-1.5 rounded border transition-all duration-350 cursor-pointer ${
                      copied
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-black border-zinc-800 text-zinc-450 hover:text-white hover:border-zinc-700 shadow-md'
                    }`}
                    id="btn-copy-msg"
                    title="คัดลอกข้อความ"
                  >
                    {copied ? <Check className="w-3 h-3 animate-bounce" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Social connections & Action instructions */}
            <div className="border-t border-zinc-900 pt-3 space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between text-[9px] text-zinc-550 leading-none">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-zinc-600" />
                  <span>ผู้ดูแลร้าน: Kuwashii El</span>
                </span>
                <span>Facebook: <strong className="text-blue-400 font-mono">m.me/kuwashii</strong></span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopy}
                  className={`py-1.5 px-3 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-black border-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-white hover:bg-zinc-150 text-black border-white shadow-md active:scale-[0.98]'
                  }`}
                  id="btn-action-copy-buy"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกคำสั่ง'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.open("https://m.me/kuwashii", "_blank");
                  }}
                  className="py-1.5 px-3 rounded-lg font-bold text-[11px] bg-zinc-900 hover:bg-zinc-850 text-zinc-350 hover:text-white border border-zinc-850 text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                  id="btn-join-facebook"
                >
                  <span>แชท Facebook</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </button>
              </div>
              <p className="text-[9px] text-zinc-600 text-center font-sans">
                *คัดลอกข้อความแชทแล้วทักไปแจ้งแอดมิน เพื่อส่งมอบและตัดสต๊อกของได้ทันที!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
