import React from 'react';
import { motion } from 'motion/react';
import { Edit2, Trash2, ShieldAlert, BadgeInfo, Coins, Package, Clock, ShoppingBag, Pin, Flame, Sparkles } from 'lucide-react';
import { StockItem } from '../types';

interface ItemCardProps {
  item: StockItem;
  isAdmin: boolean;
  onEdit: (item: StockItem) => void;
  onDelete: (id: string) => void;
  onQuickQuantityChange: (id: string, delta: number) => void;
  onInquire: (item: StockItem) => void;
  onTogglePin: (id: string) => void;
  onShareToAI?: (item: StockItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isAdmin,
  onEdit,
  onDelete,
  onQuickQuantityChange,
  onInquire,
  onTogglePin,
  onShareToAI,
}) => {
  const getRarityColors = (rarity: StockItem['rarity']) => {
    switch (rarity) {
      case 'Mythic':
        return {
          bg: 'bg-red-500/10 border-red-500/40 text-red-400',
          badge: 'bg-red-600 text-white shadow-red-600/50',
          glow: 'mythic-glow',
          text: 'text-red-400',
          border: 'border-red-500/30 hover:border-red-500/80',
          gradient: 'from-red-600/20 via-transparent to-transparent'
        };
      case 'Legendary':
        return {
          bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
          badge: 'bg-amber-500 text-black font-semibold shadow-amber-500/50',
          glow: 'legendary-glow',
          text: 'text-amber-400',
          border: 'border-amber-500/30 hover:border-amber-500/80',
          gradient: 'from-amber-500/20 via-transparent to-transparent'
        };
      case 'Epic':
        return {
          bg: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
          badge: 'bg-purple-500 text-white shadow-purple-500/50',
          glow: 'epic-glow',
          text: 'text-purple-400',
          border: 'border-purple-500/30 hover:border-purple-500/80',
          gradient: 'from-purple-500/20 via-transparent to-transparent'
        };
      case 'Rare':
        return {
          bg: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
          badge: 'bg-blue-500 text-white shadow-blue-500/50',
          glow: 'rare-glow',
          text: 'text-blue-400',
          border: 'border-blue-500/30 hover:border-blue-500/80',
          gradient: 'from-blue-500/20 via-transparent to-transparent'
        };
      case 'Common':
      default:
        return {
          bg: 'bg-zinc-500/10 border-zinc-500/40 text-zinc-400',
          badge: 'bg-zinc-500 text-white',
          glow: 'common-glow',
          text: 'text-zinc-300',
          border: 'border-zinc-700 hover:border-zinc-500',
          gradient: 'from-zinc-500/10 via-transparent to-transparent'
        };
    }
  };

  const getCategoryIconPath = (category: StockItem['category']) => {
    switch (category) {
      case 'Bloodline':
        return "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1-2c6 0 11 5 11 11s-5 11-11 11S1 17 1 11 6 0 12 0zm0 4c-3.87 0-7 3.13-7 7 0 3.87 3.13 7 7 7s7-3.13 7-7c0-3.87-3.13-7-7-7zm0 1c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6-2.69-6 6-6z";
      case 'Serum':
        return "M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z";
      default:
        return "";
    }
  };

  const colors = getRarityColors(item.rarity);

  // Status computation
  const getStockStatus = (qty: number) => {
    if (qty === 0) return { label: 'สินค้าหมด', color: 'bg-red-500 text-red-400 border-red-500/20' };
    if (qty <= 5) return { label: 'ใกล้หมด', color: 'bg-amber-500 text-amber-400 border-amber-500/20' };
    return { label: 'มีสินค้า', color: 'bg-emerald-500 text-emerald-400 border-emerald-500/20' };
  };

  const status = getStockStatus(item.quantity);

  const getRelativeTimeString = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 15) return 'เมื่อสักครู่นี้';
      if (diffSec < 60) return 'เมื่อไม่กี่วินาทีก่อน';
      if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
      if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
      if (diffDays === 1) return 'เมื่อวานนี้';
      if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
      
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch (e) {
      return 'ไม่ระบุเวลา';
    }
  };

  const formattedDate = new Date(item.updatedAt).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const relativeTime = getRelativeTimeString(item.updatedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-zinc-950/80 transition-all duration-300 ${colors.border} ${colors.glow}`}
      id={`item-card-${item.id}`}
    >
      {/* Background radial gradient representing rarity */}
      <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${colors.gradient} -z-10`} />

      {/* Top Banner & Badges */}
      <div className="p-3 sm:p-4 pb-1.5 sm:pb-2">
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          {/* Category & Pin Badge Group */}
          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onTogglePin(item.id)}
                className={`p-1.5 rounded-lg border transition-all duration-300 cursor-pointer flex items-center justify-center ${
                  item.isPinned
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-550 hover:text-zinc-300 hover:border-zinc-700'
                }`}
                title={item.isPinned ? 'เลิกปักหมุดสินค้านี้' : 'ปักหมุดสินค้านี้'}
              >
                <Pin className={`w-3.5 h-3.5 transition-transform ${item.isPinned ? 'fill-current scale-110 text-amber-400' : 'text-zinc-500 rotate-45'}`} />
              </button>
            ) : item.isPinned ? (
              <div
                className="p-1.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center justify-center cursor-default"
                title="สินค้านี้ถูกปักหมุดโดยแอดมิน"
              >
                <Pin className="w-3.5 h-3.5 fill-current text-amber-400" />
              </div>
            ) : null}
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-zinc-800/85 text-zinc-400 border border-zinc-700/60">
              {item.category}
            </span>
          </div>

          {/* Rarity StarBadge */}
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${colors.bg}`}>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
            {item.rarity}
          </span>
        </div>

        {/* Item Image with hover expansion */}
        <div className="relative w-full h-32 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/70 mb-3 flex items-center justify-center">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // If loaded image fails, nullify to fallback custom graphics
                (e.target as HTMLImageElement).src = '';
                item.imageUrl = '';
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 to-zinc-900 flex flex-col items-center justify-center p-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800/70 flex items-center justify-center border border-zinc-700/50 mb-2 text-zinc-500 group-hover:border-zinc-600 transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-zinc-500 font-medium">AOT Revolution</span>
            </div>
          )}

          {/* Absolute overlay price tag */}
          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800/80 flex items-center gap-1">
            <Coins className="w-3 h-3 text-yellow-500" />
            <span className="font-mono text-xs font-bold text-white">฿{item.price.toLocaleString()}</span>
          </div>

          {/* Stock Availability indicator */}
          <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-zinc-800/60 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${status.color.split(' ')[0]}`} />
            <span className="text-[9px] tracking-wide font-medium text-zinc-300">{status.label}</span>
          </div>

          {/* Popular Tag */}
          {item.isPopular && (
            <div className="absolute top-2 right-2 bg-rose-500/90 text-white font-bold backdrop-blur-md px-2 py-0.5 rounded-md border border-rose-450/40 flex items-center gap-1 shadow-md shadow-rose-500/20">
              <Flame className="w-3 h-3 fill-current text-white animate-pulse" />
              <span className="text-[9px] tracking-wide">ยอดนิยม</span>
            </div>
          )}
        </div>

        {/* Typography */}
        <h3 className="font-display text-sm font-bold text-white tracking-tight mb-1 group-hover:text-amber-400 transition-colors flex items-center gap-1">
          {item.isPinned && <Pin className="w-3 h-3 text-amber-400 fill-current flex-shrink-0 animate-bounce" />}
          <span className="truncate">{item.name}</span>
        </h3>

        {/* Description */}
        <p className="text-[11px] text-zinc-400 line-clamp-2 min-h-[1.75rem] leading-relaxed mb-3 font-sans">
          {item.description || 'ไม่มีคำอธิบายเพิ่มเติมสำหรับไอเทมนี้'}
        </p>

        {/* Info Grid */}
        {(() => {
          const initQty = item.initialQuantity && item.initialQuantity >= item.quantity ? item.initialQuantity : item.quantity;
          const percentage = initQty > 0 ? (item.quantity / initQty) * 100 : 0;
          const hasPieces = item.piecesPerUnit && item.piecesPerUnit > 1;

          if (hasPieces) {
            const pUnit = item.piecesPerUnit as number;
            return (
              <div className="space-y-2 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-950 text-[10px] font-sans">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Package className="w-3.5 h-3.5 text-zinc-500" />
                    <span>สต๊อกคลังสินค้า:</span>
                  </div>
                  <div className="text-right font-mono font-bold text-white">
                    {item.quantity === 0 ? (
                      <span className="text-red-400 font-extrabold text-xs">หมดคลัง</span>
                    ) : item.initialQuantity && item.initialQuantity > item.quantity ? (
                      <span className="text-zinc-300">
                        <span className="text-emerald-450 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{item.quantity}</span>
                        <span className="text-zinc-500 font-normal mx-0.5">/</span>
                        <span className="text-zinc-400">{item.initialQuantity}</span> ชุด
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{item.quantity} ชุด</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900/45 pt-1.5 mt-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>จำนวนของที่จะได้:</span>
                  </div>
                  <div className="text-right font-mono font-extrabold text-amber-400 text-xs">
                    {pUnit} <span className="text-[9px] font-normal text-zinc-400">ชิ้นต่อชุด</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-900/45 pt-1.5 mt-1 bg-zinc-950/20 -mx-1 px-1 rounded-md">
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <Coins className="w-3.5 h-3.5 text-emerald-500" />
                    <span>รวมของทั้งหมดมี:</span>
                  </div>
                  <div className="text-right font-mono font-extrabold text-zinc-200">
                    <span className="text-white text-xs font-black">{item.quantity * pUnit}</span> ชิ้น
                  </div>
                </div>

                {/* Progress bar visual */}
                {initQty > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-zinc-900/45">
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden p-0.5 flex items-center border border-zinc-900/30">
                      <div 
                        className={`h-0.5 rounded-full transition-all duration-500 ${
                          item.quantity === 0
                            ? 'w-0'
                            : item.quantity <= 1
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-500 font-medium leading-none">
                      <span>สถานะคลังสินค้า</span>
                      <span className="font-mono font-bold text-zinc-400">{percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-2 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900/80 text-[10px] font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Package className="w-3.5 h-3.5 text-zinc-500" />
                  <span>สต๊อกคงเหลือ:</span>
                </div>
                <div className="text-right font-mono font-bold text-white">
                  {item.quantity === 0 ? (
                    <span className="text-red-400 font-extrabold">หมดเกลี้ยง</span>
                  ) : item.initialQuantity && item.initialQuantity > item.quantity ? (
                    <span className="text-zinc-300">
                      <span className="text-emerald-400 font-bold">{item.quantity}</span>
                      <span className="text-zinc-500 font-normal mx-0.5">/</span>
                      <span className="text-zinc-400">{item.initialQuantity}</span> ชิ้น
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">{item.quantity} ชิ้น</span>
                  )}
                </div>
              </div>
              
              {/* Progress bar visual */}
              {initQty > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden p-0.5 flex items-center border border-zinc-900/30">
                    <div 
                      className={`h-0.5 rounded-full transition-all duration-500 ${
                        item.quantity === 0
                          ? 'w-0'
                          : item.quantity <= 5
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-zinc-500 font-medium">
                    <span>สถานะคลังสินค้า</span>
                    <span className="font-mono font-bold text-zinc-400">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Bottom Action Section */}
      <div className="p-3 sm:p-4 pt-0 bg-gradient-to-t from-zinc-950/90 to-transparent">
        {/* Admin actions or regular users Inquiry action */}
        {isAdmin ? (
          <div className="mt-1 border-t border-zinc-900 pt-3 flex flex-col gap-2.5">
            {/* Quick stock adjustment controls */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">สต๊อก:</span>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => onQuickQuantityChange(item.id, -1)}
                  disabled={item.quantity <= 0}
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-450 hover:text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-xs font-bold font-mono cursor-pointer"
                  id={`btn-add-dec-${item.id}`}
                >
                  -
                </button>
                <span className="w-6 text-center font-mono font-bold text-xs text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onQuickQuantityChange(item.id, 1)}
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-455 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-bold font-mono cursor-pointer"
                  id={`btn-add-inc-${item.id}`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Core admin actions: Edit & Delete */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="py-1 px-2 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800/40 text-zinc-300 hover:text-white hover:bg-zinc-805 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                id={`btn-admin-edit-${item.id}`}
              >
                <Edit2 className="w-3 h-3" />
                <span>แก้ไข</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="py-1 px-2 rounded-lg border border-red-950/40 hover:border-red-600/50 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                id={`btn-admin-del-${item.id}`}
              >
                <Trash2 className="w-3 h-3" />
                <span>ลบออก</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={() => onInquire(item)}
              disabled={item.quantity === 0}
              className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 border ${
                item.quantity === 0
                  ? 'bg-zinc-900/50 border-zinc-850 text-zinc-650 cursor-not-allowed'
                  : 'bg-white hover:bg-zinc-100 text-black border-white shadow-md cursor-pointer active:scale-[0.98]'
              }`}
              id={`btn-buy-${item.id}`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>{item.quantity === 0 ? 'สินค้าหมดคลัง' : 'สนใจซื้อ / สอบถามสต๊อก'}</span>
            </button>
            <button
              type="button"
              onClick={() => onShareToAI && onShareToAI(item)}
              className="w-full py-1.5 px-3 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 border border-purple-500/20 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 hover:text-purple-250 cursor-pointer active:scale-[0.98]"
              id={`btn-share-ai-${item.id}`}
            >
              <Sparkles className="w-3 h-3 text-purple-400 fill-current animate-pulse" />
              <span>คุยกับ AI เกี่ยวกับชิ้นนี้ 🔮</span>
            </button>
          </div>
        )}

        {/* Timestamp footer in monospace */}
        <div className="mt-2.5 flex items-center justify-between text-[9px] text-zinc-600 border-t border-zinc-900/80 pt-2 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-zinc-750" />
            <span className="text-zinc-500 font-sans" title={formattedDate}>{relativeTime}</span>
          </span>
          <span className="text-zinc-700">ID: {item.id.slice(0, 6)}</span>
        </div>
      </div>
    </motion.div>
  );
};
