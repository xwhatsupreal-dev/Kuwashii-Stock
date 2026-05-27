import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Upload, Link, AlertCircle, Sparkles, Image as ImageIcon, Package, Coins, Clock } from 'lucide-react';
import { StockItem } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<StockItem, 'updatedAt'>) => void;
  editingItem: StockItem | null;
}

const PRESET_IMAGE_SUGGESTIONS = [
  { name: 'Serum - Red', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80' },
  { name: 'Bloodline - Yellow', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80' },
  { name: 'Ancient Scroll', url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&q=80' },
  { name: 'Titan Core', url: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=400&q=80' },
  { name: 'Cosmic Nebula', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80' },
  { name: 'Abyss Deep Blue', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80' },
];

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<StockItem['category']>('Serum');
  const [rarity, setRarity] = useState<StockItem['rarity']>('Common');
  const [quantity, setQuantity] = useState(1);
  const [initialQuantity, setInitialQuantity] = useState<number | string>('');
  const [piecesPerUnit, setPiecesPerUnit] = useState<number | string>('');
  const [price, setPrice] = useState(10);
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isPopular, setIsPopular] = useState(false);
  
  const [imageType, setImageType] = useState<'url' | 'upload' | 'presets'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadBase64, setUploadBase64] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category);
      setRarity(editingItem.rarity);
      setQuantity(editingItem.quantity);
      setInitialQuantity(editingItem.initialQuantity !== undefined ? editingItem.initialQuantity : editingItem.quantity);
      setPiecesPerUnit(editingItem.piecesPerUnit !== undefined ? editingItem.piecesPerUnit : '');
      setPrice(editingItem.price);
      setDescription(editingItem.description);
      setIsPinned(!!editingItem.isPinned);
      setIsPopular(!!editingItem.isPopular);
      
      const isBase64 = editingItem.imageUrl?.startsWith('data:image/');
      if (isBase64) {
        setImageType('upload');
        setUploadBase64(editingItem.imageUrl || '');
        setImageUrl('');
      } else {
        setImageType('url');
        setImageUrl(editingItem.imageUrl || '');
        setUploadBase64('');
      }
    } else {
      // Clear values for new item
      setName('');
      setCategory('Serum');
      setRarity('Common');
      setQuantity(1);
      setInitialQuantity('');
      setPiecesPerUnit('');
      setPrice(10);
      setDescription('');
      setIsPinned(false);
      setIsPopular(false);
      setImageType('url');
      setImageUrl('');
      setUploadBase64('');
    }
    setErrors({});
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  // Converts native file selection to Base64 cleanly
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาอัปโหลดรูปภาพเท่านั้น!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadBase64(e.target.result as string);
        setImageType('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handlePresetSelect = (url: string) => {
    setImageUrl(url);
    setImageType('url');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'กรุณากรอกชื่อไอเทม';
    if (quantity < 0) newErrors.quantity = 'จำนวนสินค้าจะต้องไม่ติดลบ';
    if (price < 0) newErrors.price = 'ราคาจำเป็นจะต้องมากกว่าหรือเท่ากับ 0 บาท';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let finalImageUrl = '';
    if (imageType === 'url') {
      finalImageUrl = imageUrl.trim();
    } else if (imageType === 'upload') {
      finalImageUrl = uploadBase64;
    }

    const currentQty = quantity;
    const initQty = typeof initialQuantity === 'number' ? initialQuantity : parseInt(initialQuantity as string, 10);
    const finalInitialQuantity = (!isNaN(initQty) && initQty >= currentQty) ? initQty : currentQty;

    const pPerUnit = typeof piecesPerUnit === 'number' ? piecesPerUnit : parseInt(piecesPerUnit as string, 10);
    const finalPiecesPerUnit = (!isNaN(pPerUnit) && pPerUnit > 0) ? pPerUnit : undefined;

    onSave({
      id: editingItem ? editingItem.id : `aotr-${Date.now()}`,
      name: name.trim(),
      category,
      rarity,
      quantity,
      initialQuantity: finalInitialQuantity,
      piecesPerUnit: finalPiecesPerUnit,
      price,
      description: description.trim(),
      imageUrl: finalImageUrl || undefined,
      isPinned,
      isPopular,
    });
    
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Cover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Form panel container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-w-lg w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-6 overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        >
          {/* Neon orange accent strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-600 to-amber-400" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5 mt-2">
            <div>
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{editingItem ? 'แก้ไขสต๊อกสินค้า' : 'เพิ่มไอเทมใหม่ในระบบ'}</span>
              </h3>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                กรอกรายละเอียดไอเทมในเกม Attack on Titan Revolution ของคลังสต๊อกคุณ
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name input */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans">
                ชื่อไอเทม (Item Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Yeager Bloodline, Attack Serum..."
                className={`w-full bg-zinc-900 border text-zinc-100 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans font-medium placeholder-zinc-600 ${
                  errors.name ? 'border-red-500/80 bg-red-950/10' : 'border-zinc-800'
                }`}
              />
              {errors.name && (
                <div className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* Category selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2 font-sans">
                เลือกหมวดหมู่ไอเทม (Item Category) <span className="text-zinc-500 font-normal">(คลิกเลือกโดยตรง)</span>
              </label>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-1.5 p-2 rounded-xl bg-zinc-950/80 border border-zinc-900/40">
                {(['Serum', 'Bloodline', 'Skin', 'Artifact', 'Scroll/Key', 'Perk', 'Other'] as const).map((cat) => {
                  const isActive = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-left flex items-center gap-1.5 border cursor-pointer select-none ${
                        isActive
                          ? 'bg-amber-500/15 border-amber-500/80 text-amber-400 font-extrabold shadow-sm shadow-amber-500/5'
                          : 'bg-zinc-900/60 border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      <span className="text-sm">
                        {cat === 'Serum' && '🧪'}
                        {cat === 'Bloodline' && '🧬'}
                        {cat === 'Skin' && '👕'}
                        {cat === 'Artifact' && '🏺'}
                        {cat === 'Scroll/Key' && '📜'}
                        {cat === 'Perk' && '⚡'}
                        {cat === 'Other' && '📦'}
                      </span>
                      <span className="truncate">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rarity Select */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans">
                ระดับความหายาก (Rarity)
              </label>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as StockItem['rarity'])}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all cursor-pointer font-sans"
              >
                <option value="Mythic">🔴 Mythic (แดงเทพ)</option>
                <option value="Legendary">🟡 Legendary (ทองระดับตำนาน)</option>
                <option value="Epic">🟣 Epic (ม่วงมหาศาล)</option>
                <option value="Rare">🔵 Rare (ฟ้าหายาก)</option>
                <option value="Common">⚪ Common (เทาทั่วไป)</option>
              </select>
            </div>

            {/* Quantity, Initial Quantity, Pieces per pack, and Price row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>เหลือในสต๊อก (สต๊อก)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-emerald-400 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all font-mono font-bold"
                />
                {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>จำนวนแรกรวม</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ปล่อยว่างเพื่อเท่าคงเหลือ"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-zinc-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all font-mono font-medium placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>จำนวนชิ้นต่อชุด</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="เช่น 360 ชิ้นต่อ 1 สต๊อก"
                  value={piecesPerUnit}
                  onChange={(e) => setPiecesPerUnit(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-amber-400 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all font-mono font-medium placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-500" />
                  <span>ราคาบาทต่อชิ้น/ชุด (Price ฿)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-zinc-100 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all font-mono font-medium"
                />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
              </div>
            </div>

            {/* Live Calculation Preview Block */}
            {(() => {
              const pCount = piecesPerUnit ? (parseInt(piecesPerUnit as string, 10) || 1) : 1;
              const totalItems = quantity * pCount;
              if (pCount > 1) {
                return (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-amber-300 font-medium">💡 คำนวณคลังเสมือนจริง:</span>
                    <span className="text-xs font-mono text-zinc-300">
                      ได้สินค้า <strong className="text-amber-400 font-extrabold">{pCount}</strong> ชิ้นต่อชุด × สต๊อกมี <strong className="text-emerald-400 font-extrabold">{quantity}</strong> ชุด = จะมีของข้างในรวมทั้งหมด <strong className="text-white text-sm bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800 font-extrabold">{totalItems} ชิ้น</strong>
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Description textarea */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1.5 font-sans">
                คำอธิบายคุณสมบัติ (Item Description)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุสถานะหรือบัฟ เช่น 'เพิ่มโอกาสดรอป 20%, ดาเมจฟันไททันแรงขึ้น...'"
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-all font-sans placeholder-zinc-600 resize-none"
              />
            </div>

            {/* Switches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/80">
                <input
                  type="checkbox"
                  id="pin-checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="pin-checkbox" className="text-xs font-semibold text-zinc-350 cursor-pointer font-sans select-none flex items-center gap-1">
                  <span>📌 ปักหมุดให้อยู่บนสุด</span>
                </label>
              </div>

              <div className="flex items-center gap-2.5 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/80">
                <input
                  type="checkbox"
                  id="popular-checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
                <label htmlFor="popular-checkbox" className="text-xs font-semibold text-zinc-350 cursor-pointer font-sans select-none flex items-center gap-1.5">
                  <span>🔥 สินค้ายอดนิยม (Popular)</span>
                </label>
              </div>
            </div>

            {/* Image Source selector options */}
            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">
                รูปภาพประจำไอเทม (Visual Asset Selector)
              </span>

              {/* Source tabs selector */}
              <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-zinc-950 border border-zinc-850 text-xs">
                <button
                  type="button"
                  onClick={() => setImageType('url')}
                  className={`py-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    imageType === 'url' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Link className="w-3 h-3" />
                  <span>ใส่ลิงก์รูปภาพ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageType('upload')}
                  className={`py-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    imageType === 'upload' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>อัปโหลดรูปภาพ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageType('presets')}
                  className={`py-1.5 rounded-md font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    imageType === 'presets' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>รูปภาพตัวอย่าง</span>
                </button>
              </div>

              {/* Content of selected Tab */}
              {imageType === 'url' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... หรือ ลิงก์รูปภาพอื่นๆ"
                    className="w-full bg-zinc-950 border border-zinc-850 text-zinc-100 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {imageUrl && (
                    <div className="mt-2 text-center">
                      <p className="text-[10px] text-zinc-500 text-left mb-1">รูปภาพพรีวิวจากการกรอกลิงก์:</p>
                      <div className="inline-block relative w-32 h-20 rounded-md overflow-hidden bg-zinc-950 border border-zinc-800">
                        <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={() => setErrors({ ...errors, image: 'พรีวิวรูปภาพจากลิงก์ล้มเหลว' })} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {imageType === 'upload' && (
                <div className="space-y-2 animate-fadeIn">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      dragActive
                        ? 'border-amber-500 bg-amber-500/5'
                        : uploadBase64
                        ? 'border-zinc-700 bg-zinc-900/60'
                        : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/20'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {uploadBase64 ? (
                      <div className="text-center space-y-2">
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 mx-auto">
                          <img src={uploadBase64} alt="upload preview" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[10px] text-emerald-400 font-medium">รูปภาพอัปโหลดแล้วสำเร็จ! เปลี่ยนไฟล์คลิกที่นี่</p>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-7 h-7 text-zinc-500 mb-1.5" />
                        <span className="text-xs text-zinc-300 font-medium font-sans">ลากไฟล์รูปภาพมาวาง หรือคลิกเพื่อค้นหารูป</span>
                        <span className="text-[10px] text-zinc-500 mt-1 font-mono">ฟอร์แมต JPG, PNG, WEBP จากเครื่องคุณ</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {imageType === 'presets' && (
                <div className="space-y-2 animate-fadeIn">
                  <p className="text-[10px] text-zinc-400 font-sans">คลิกลือกภาพม็อคเพื่อเติมเต็มรายละเอียดความสวยงามได้รวดเร็ว:</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRESET_IMAGE_SUGGESTIONS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset.url)}
                        className="group relative h-16 rounded-lg overflow-hidden border border-zinc-800 hover:border-amber-500 transition-all text-left flex items-end p-1 cursor-pointer bg-zinc-950"
                      >
                        <img src={preset.url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all" />
                        <span className="relative text-[9px] text-white font-bold leading-none bg-black/80 p-0.5 rounded border border-zinc-900/30 w-full text-center truncate">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit and Cancel items */}
            <div className="flex gap-2.5 border-t border-zinc-900 pt-4 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 bg-transparent text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                className="w-1/2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black border-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all"
                id="btn-submit-stock"
              >
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกข้อมูลสต๊อก</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
