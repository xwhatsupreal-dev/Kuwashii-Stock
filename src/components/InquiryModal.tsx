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

  const totalPrice = item.price * quantity;

  // Generate localized order templates
  const purchaseMessage = `🛒 ต้องการซื้อไอเทมจากสต๊อก AOT Revolution
━━━━━━━━━━━━━━━━━━━━━━
• สินค้า: ${item.name} (${item.category})
• ระดับความหายาก: ${item.rarity}
• จำนวน: ${quantity} ชิ้น
• ราคารวม: ฿${totalPrice.toLocaleString()} บาท (ชิ้นละ ฿${item.price.toLocaleString()} บาท)
━━━━━━━━━━━━━━━━━━━━━━
💬 ติดต่อผู้ดูแลร้าน (Kuwashii El) ทาง Facebook (m.me/@kuwashii) เพื่อส่งมอบของ!`;

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
          className="relative max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-6 overflow-hidden shadow-2xl z-10"
        >
          {/* Accent decoration */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-purple-600" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-500 animate-pulse" />
              <span>สรุปรายการสั่งซื้อ</span>
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              id="btn-close-inquiry"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Item details card preview */}
          <div className="flex gap-4 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 mb-5">
            <div className="w-20 h-20 bg-zinc-950 border border-zinc-850 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <ShoppingCart className="w-8 h-8 text-zinc-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${getRarityBadgeStyle(item.rarity)}`}>
                  {item.rarity}
                </span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{item.category}</span>
              </div>
              <h4 className="font-display font-medium text-white text-base leading-tight">{item.name}</h4>
              <p className="font-mono text-sm font-bold text-amber-400 mt-1">฿{item.price.toLocaleString()} / ชิ้น</p>
            </div>
          </div>

          {/* Quantity Selector Slider & Buttons */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400 font-sans">จำนวนชุดที่สั่งจ่าย:</span>
              <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-805 rounded-xl p-1">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-base text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  id="btn-dec-inquiry-qty"
                >
                  -
                </button>
                <span className="w-10 text-center text-white font-mono font-bold text-base">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= item.quantity}
                  onClick={() => setQuantity((prev) => Math.min(item.quantity, prev + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-base text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                  id="btn-inc-inquiry-qty"
                >
                  +
                </button>
              </div>
            </div>

            {/* Slider control */}
            {item.quantity > 1 && (
              <div className="space-y-1">
                <input
                  type="range"
                  min="1"
                  max={item.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>1 ชิ้น</span>
                  <span>สูงสุด {item.quantity} ชิ้น (ในคลัง)</span>
                </div>
              </div>
            )}

            {/* Total price section */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-sans text-zinc-400">ราคาทั้งสิ้น:</span>
              </div>
              <span className="font-mono text-xl font-black text-white">
                ฿{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Clipboard Message Copy Center */}
          <div className="space-y-2 mb-6">
            <span className="text-xs text-zinc-400 font-sans block mb-1">กล่องแชทข้อความสั่งซื้อด่วน (กดคัดลอกเพื่อส่งหาแอดมิน):</span>
            <div className="relative">
              <pre className="text-[11px] font-mono leading-relaxed bg-zinc-900 border border-zinc-850 p-3 rounded-xl text-zinc-300 whitespace-pre h-32 overflow-y-auto overflow-x-hidden scrollbar">
                {purchaseMessage}
              </pre>
              <div className="absolute top-2.5 right-2.5">
                <button
                  onClick={handleCopy}
                  className={`p-2 rounded-lg border transition-all duration-350 cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-650 shadow-md'
                  }`}
                  id="btn-copy-msg"
                  title="คัดลอกข้อความ"
                >
                  {copied ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Social connections & Action instructions */}
          <div className="border-t border-zinc-900 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-600" />
                <span>แอดมิน:</span>
                <strong className="text-zinc-300">Kuwashii El</strong>
              </span>
              <span>Facebook: <strong className="text-blue-400 text-xs font-mono">m.me/@kuwashii</strong></span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-black border-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10'
                    : 'bg-white hover:bg-zinc-100 text-black border-white shadow-lg active:scale-[0.98]'
                }`}
                id="btn-action-copy-buy"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกสำเร็จแล้ว' : 'คัดลอกข้อความสั่งซื้อ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open("https://m.me/kuwashii", "_blank");
                }}
                className="py-2 px-4 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                id="btn-join-facebook"
              >
                <span>หรือแชท Facebook</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center font-sans mt-2">
              *เมื่อคัดลอกข้อความแล้วสามารถส่งข้อความไปหาแอดมิน เพื่อทำเรื่องส่งมอบเกมพาส/ไอเทมให้คุณได้ทันที!
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
