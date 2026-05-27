import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  Search,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Coins,
  Package,
  Layers,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  ChevronDown,
  X,
  FileDown,
  FileUp,
  ExternalLink,
  Github,
  TrendingUp,
  Inbox,
  CheckCircle,
  Copy,
  Clock,
  MessageCircle,
  Flame,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';

import { StockItem, CategoryFilter, RarityFilter, StockStatusFilter } from './types';
import { DEFAULT_PRESETS } from './presets';
import { ItemCard } from './components/ItemCard';
import { InquiryModal } from './components/InquiryModal';
import { AdminModal } from './components/AdminModal';
import {
  getFirebaseItems,
  saveFirebaseItem,
  deleteFirebaseItem,
  resetFirebaseDatabase,
  testFirestoreConnection
} from './firebase';

export default function App() {
  // --- States ---
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedRarity, setSelectedRarity] = useState<RarityFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<StockStatusFilter>('all');
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('rarity-desc');

  // Admin Authentications
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Modals controller
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [inquiringItem, setInquiringItem] = useState<StockItem | null>(null);

  // Floating notifications/toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- Notifications Configuration ---
  const [notifConfig, setNotifConfig] = useState(() => {
    const saved = localStorage.getItem('AOTR_NOTIF_CONFIG_V1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default fallback
      }
    }
    return {
      enabled: false,        // ปิดการแจ้งเตือนเป็นค่าเริ่มต้นตามที่ผู้ใช้ร้องขอ
      notifyNewStock: true,  // สต็อกเพิ่มใหม่
      notifyLowStock: true,  // ใกล้หมด
      notifyPopular: true,   // ยอดนิยม
      playAlertSound: true,  // เล่นเสียงแจ้งเตือน
    };
  });

  const saveNotifConfig = (newConfig: typeof notifConfig) => {
    setNotifConfig(newConfig);
    localStorage.setItem('AOTR_NOTIF_CONFIG_V1', JSON.stringify(newConfig));
  };

  const playChime = (type: 'success' | 'warning' | 'info') => {
    if (!notifConfig.playAlertSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(392, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.10, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // ignore context auto play warning
    }
  };

  const sendSystemNotification = (title: string, body: string, iconUrl?: string) => {
    if (!notifConfig.enabled) return;
    
    // In-app visual backup
    showToast(`${title} - ${body}`, 'info');

    // System Native OS desktop notifications (works even when user is on another window or tab minimized)
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: iconUrl || undefined,
          tag: 'aotr-stock-alert',
        });
      } catch (e) {
        console.warn("Browser native Notification API error:", e);
      }
    }
  };

  const prevItemsRef = useRef<StockItem[]>([]);

  useEffect(() => {
    // If notifications are disabled, keep current state matched to prevent alerting storm as soon as user enables it
    if (!notifConfig.enabled) {
      prevItemsRef.current = items;
      return;
    }

    // Skip alerting during cold-start or initial load
    if (prevItemsRef.current.length === 0) {
      prevItemsRef.current = items;
      return;
    }

    // Inspect each item comparing to previous version
    items.forEach((newItem) => {
      const oldItem = prevItemsRef.current.find((it) => it.id === newItem.id);

      if (!oldItem) {
        // CASE 1: Brand new item registered in database
        if (notifConfig.notifyNewStock) {
          sendSystemNotification(
            '📦 สินค้าใหม่เข้าคลัง!',
            `เพิ่ม "${newItem.name}" (${newItem.category}) เข้าสู่ระบบจำหน่ายเรียบร้อย!`,
            newItem.imageUrl
          );
        }
        return;
      }

      // CASE 2: Quantities changed
      if (oldItem.quantity !== newItem.quantity) {
        const isIncreased = newItem.quantity > oldItem.quantity;
        const isDecreased = newItem.quantity < oldItem.quantity;

        // restocked
        if (isIncreased && notifConfig.notifyNewStock) {
          sendSystemNotification(
            '📥 อัปเดตสต๊อกเพิ่ม!',
            `"${newItem.name}" (${newItem.category}) เพิ่งถูกเติมสินค้าเข้าไปเป็น ${newItem.quantity} ชุดพร้อมส่ง!`,
            newItem.imageUrl
          );
        }

        // low stock warning (between 1 and 5)
        if (isDecreased && newItem.quantity <= 5 && newItem.quantity > 0 && notifConfig.notifyLowStock) {
          sendSystemNotification(
            '⚠️ ของใกล้หมดด่วน!',
            `"${newItem.name}" ถูกจองออเดอร์ ตอนนี้เหลือสต๊อกเพียง ${newItem.quantity} ชุดในระบบ!`,
            newItem.imageUrl
          );
        }

        // completely depleted
        if (isDecreased && newItem.quantity === 0 && notifConfig.notifyLowStock) {
          sendSystemNotification(
            '❌ ของหมดคลังชั่วคราว!',
            `"${newItem.name}" สินค้าหมดเกลี้ยงสต๊อกแล้ว 0 ชุด ทักให้แอดมินเติมด่วน!`,
            newItem.imageUrl
          );
        }
      }

      // CASE 3: Registered as trending high rarity target
      const oldIsPopular = !!oldItem.isPinned || !!oldItem.isPopular || oldItem.rarity === 'Mythic' || oldItem.rarity === 'Legendary';
      const newIsPopular = !!newItem.isPinned || !!newItem.isPopular || newItem.rarity === 'Mythic' || newItem.rarity === 'Legendary';
      if (!oldIsPopular && newIsPopular && notifConfig.notifyPopular) {
        sendSystemNotification(
          '⭐ แนะนำไอเทมแรร์เด่น!',
          `"${newItem.name}" (${newItem.rarity}) ได้รับความนิยมสูง/ติดปักหมุดแนะนำใหม่ มอนิเตอร์ด่วน!`,
          newItem.imageUrl
        );
      }
    });

    prevItemsRef.current = items;
  }, [items, notifConfig]);

  // Load and save localStorage / Firebase
  useEffect(() => {
    async function initStock() {
      try {
        const dbItems = await getFirebaseItems(DEFAULT_PRESETS);
        setItems(dbItems || []);
      } catch (e) {
        console.error("Firebase fetch error, loading fallback presets:", e);
        const saved = localStorage.getItem('AOTR_STOCK_ITEMS');
        if (saved) {
          try {
            setItems(JSON.parse(saved));
          } catch (err) {
            setItems(DEFAULT_PRESETS);
          }
        } else {
          setItems(DEFAULT_PRESETS);
        }
      }
    }
    initStock();
    testFirestoreConnection();
  }, []);

  const saveItemsToStorage = (newItems: StockItem[]) => {
    setItems(newItems);
    localStorage.setItem('AOTR_STOCK_ITEMS', JSON.stringify(newItems));
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername.trim() === 'Kuwashii_admin' && adminPassword === 'ZAZACI09') {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setAdminUsername('');
      setAdminPassword('');
      setPasscodeError('');
      showToast('เข้าสู่ระบบผู้ดูแลเรียบร้อยแล้ว!', 'success');
    } else {
      setPasscodeError('ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง!');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    showToast('ออกจากแผงผู้ดูแลแล้ว', 'info');
  };

  // --- Add/Edit/Delete controllers ---
  const handleSaveItem = async (itemData: Omit<StockItem, 'updatedAt'>) => {
    const timestamp = new Date().toISOString();
    const existingIndex = items.findIndex((it) => it.id === itemData.id);

    let finalItem: StockItem;
    if (existingIndex >= 0) {
      finalItem = {
        ...itemData,
        updatedAt: timestamp,
      } as StockItem;
      showToast(`บันทึกไอเทม ${itemData.name} สำเร็จ!`);
    } else {
      finalItem = {
        ...itemData,
        updatedAt: timestamp,
      } as StockItem;
      showToast(`เพิ่มไอเทม ${itemData.name} ลงระบบเรียบร้อย`);
    }

    // Update state to render instantly
    const updatedList = existingIndex >= 0
      ? items.map((it) => (it.id === itemData.id ? finalItem : it))
      : [finalItem, ...items];

    saveItemsToStorage(updatedList);

    try {
      await saveFirebaseItem(finalItem);
    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลบน Firebase!', 'error');
    }

    setEditingItem(null);
  };

  const handleDeleteItem = async (id: string) => {
    const itemToDelete = items.find((it) => it.id === id);
    if (!itemToDelete) return;

    if (confirm(`คุณมั่นใจหรือไม่ที่จะลบ "${itemToDelete.name}" ออกจากคลังสต๊อกสินค้า?`)) {
      const remainingItems = items.filter((it) => it.id !== id);
      saveItemsToStorage(remainingItems);

      try {
        await deleteFirebaseItem(id);
        showToast('ลบสินค้าออกจากระบบและฐานข้อมูลเรียบร้อย', 'info');
      } catch (e) {
        showToast('เกิดข้อผิดพลาดในการลบข้อมูลบน Firebase!', 'error');
      }
    }
  };

  const handleQuickQuantityChange = async (id: string, delta: number) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;

    const nextQty = Math.max(0, target.quantity + delta);
    const updated: StockItem = {
      ...target,
      quantity: nextQty,
      initialQuantity: target.initialQuantity !== undefined 
        ? Math.max(target.initialQuantity, nextQty)
        : nextQty,
      updatedAt: new Date().toISOString(),
    };

    const newItems = items.map((it) => (it.id === id ? updated : it));
    saveItemsToStorage(newItems);

    try {
      await saveFirebaseItem(updated);
      showToast('อัปเดตจำนวนสต็อกเรียบร้อย!', 'success');
      if (nextQty <= 5 && nextQty < target.quantity) {
        playChime('warning');
      } else if (nextQty > target.quantity) {
        playChime('success');
      } else {
        playChime('info');
      }
    } catch (e) {
      showToast('บันทึกสต็อกลง Firebase ไม่สำเร็จ!', 'error');
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;

    const updated: StockItem = {
      ...target,
      isPinned: !target.isPinned,
      updatedAt: new Date().toISOString(),
    };

    const newItems = items.map((it) => (it.id === id ? updated : it));
    saveItemsToStorage(newItems);

    try {
      await saveFirebaseItem(updated);
      if (updated.isPinned) {
        showToast(`ปักหมุดไอเทม ${updated.name} แล้ว!`, 'success');
      } else {
        showToast(`ยกเลิกการปักหมุดไอเทม ${updated.name} แล้ว`, 'info');
      }
    } catch (e) {
      showToast('ไม่สามารถบันทึกสถานะปักหมุดลง Firebase!', 'error');
    }
  };

  const handleResetPresets = async () => {
    if (confirm('คุณต้องการรีเซ็ตสินค้าในสต๊อกกลับไปเป็นค่าเริ่มต้นจากเกม AOT Revolution หรือไม่? (ข้อมูลที่แก้ไขจะหายไป)')) {
      saveItemsToStorage(DEFAULT_PRESETS);

      try {
        await resetFirebaseDatabase(DEFAULT_PRESETS);
        showToast('คืนค่าสต๊อคเริ่มต้นในระบบ Firebase เรียบร้อย!', 'info');
      } catch (e) {
        showToast('คืนค่าปริยายบน Firebase ไม่สำเร็จ!', 'error');
      }
    }
  };

  const handleClearStockToZero = async () => {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ที่จะรีเซ็ตทุกไอเทมในคลังสินค้าปัจจุบันให้เหลือจำนวนสต๊อกเป็น 0 ชิ้น? (ข้อมูลราคาและไอเทมจะอยู่ครบ แต่สต๊อกจะกลายเป็น 0 ทั้งหมด)')) {
      const updatedList = items.map((it) => ({
        ...it,
        quantity: 0,
        updatedAt: new Date().toISOString()
      }));
      saveItemsToStorage(updatedList);

      try {
        await resetFirebaseDatabase(updatedList);
        showToast('เซ็ตจำนวนสินค้าในสต๊อกทั้งหมดเหลือ 0 ชิ้น เรียบร้อย!', 'success');
      } catch (e) {
        showToast('อัปเดตสต๊อกเหลือ 0 บน Firebase ล้มเหลว!', 'error');
      }
    }
  };

  const handleDeleteAllProducts = async () => {
    if (confirm('⚠️⚠️⚠️ คุณแน่ใจหรือไม่ที่จะลบสินค้าทั้งหมดออกจากระบบร้านค้าและ Firebase? (ข้อมูลสินค้าทั้งหมดและรูปภาพจะถูกล้างออกและแสดงผลเป็นหน้าว่างเปล่า มีสินค้า 0 รายการ)')) {
      saveItemsToStorage([]);

      try {
        await resetFirebaseDatabase([]);
        showToast('ลบข้อมูลสินค้าทั้งหมดเรียบร้อยแล้ว!', 'info');
      } catch (e) {
        showToast('ลบสินค้าบน Firebase ล้มเหลว!', 'error');
      }
    }
  };

  const getLatestUpdatedRelativeTime = (): string => {
    if (!items || items.length === 0) return 'ไม่มีบันทึกข้อมูล';
    try {
      const timestamps = items.map(it => new Date(it.updatedAt).getTime()).filter(t => !isNaN(t));
      if (timestamps.length === 0) return 'ไม่มีบันทึกข้อมูล';
      const latestTime = Math.max(...timestamps);
      const date = new Date(latestTime);
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

  // Import / Export database functions
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `aotr_stock_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('ส่งออกไฟล์ข้อมูลเรียบร้อยแล้ว', 'success');
    } catch (e) {
      showToast('ส่งออกผิดพลาด', 'error');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          const isValid = importedData.every(it => it.id && it.name && typeof it.price === 'number');
          if (isValid) {
            saveItemsToStorage(importedData as StockItem[]);
            try {
              await resetFirebaseDatabase(importedData as StockItem[]);
              showToast('นำเข้าคลังสต๊อกสำเร็จและอัปเดตบน Firebase แล้ว!', 'success');
            } catch (err) {
              showToast('นำเข้าสำเร็จ แต่ซิงค์ขึ้น Firebase ไม่สำเร็จ', 'error');
            }
          } else {
            showToast('ฟอร์แมตข้อมูลในไฟล์ JSON ไม่ถูกต้อง', 'error');
          }
        }
      } catch (err) {
        showToast('อ่านไฟล์ JSON ล้มเหลว', 'error');
      }
    };
    reader.readAsText(file);
  };

  // --- Filtering & Sorting Compute ---
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesRarity = selectedRarity === 'all' || item.rarity === selectedRarity;

    let matchesStatus = true;
    if (selectedStatus === 'in-stock') {
      matchesStatus = item.quantity > 5;
    } else if (selectedStatus === 'low-stock') {
      matchesStatus = item.quantity > 0 && item.quantity <= 5;
    } else if (selectedStatus === 'out-of-stock') {
      matchesStatus = item.quantity === 0;
    }

    const matchesPopular = !showPopularOnly || !!item.isPopular;

    return matchesSearch && matchesCategory && matchesRarity && matchesStatus && matchesPopular;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    // 1. Stock Status Prioritization: In-stock items (quantity > 0) go up, Out-of-stock items (quantity === 0) go down
    const aHasStock = a.quantity > 0 ? 1 : 0;
    const bHasStock = b.quantity > 0 ? 1 : 0;
    if (aHasStock !== bHasStock) {
      return bHasStock - aHasStock; // 1 comes before 0 (in-stock first)
    }

    // 2. Pin Status: Pinned items (isPinned === true) go up, Unpinned items go down
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned; // 1 comes before 0 (pinned first)
    }

    // 2.5 Category Grouping: When viewing 'All' categories, group items of the same category together
    if (selectedCategory === 'all') {
      const categoryOrder = ['Serum', 'Bloodline', 'Equipment', 'Artifact', 'Scroll/Key', 'Perk', 'Other'];
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);
      if (indexA !== indexB) {
        return indexA - indexB; // Keeps category order unified
      }
    }

    // 3. User sub-sort criteria
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'stock-desc':
        return b.quantity - a.quantity;
      case 'stock-asc':
        return a.quantity - b.quantity;
      case 'rarity-desc': {
        const rarityWeights = { Mythic: 5, Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
        return rarityWeights[b.rarity] - rarityWeights[a.rarity];
      }
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  // Calculate high-level stats
  const totalStockItems = items.length;
  const inStockCount = items.filter(it => it.quantity > 0).length;
  const totalStockUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalStockValue = items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* Dynamic Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -30, x: '-50%' }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold tracking-wide border backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30'
                : toastMessage.type === 'error'
                ? 'bg-red-950/90 text-red-400 border-red-500/30'
                : 'bg-zinc-900/90 text-zinc-300 border-zinc-705'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Section */}
      <header className="relative border-b border-zinc-900 bg-zinc-950 py-7 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 right-0 w-[45rem] h-[24rem] bg-gradient-to-l from-red-600/5 to-transparent filter blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-0 left-0 w-[30rem] h-[20rem] bg-gradient-to-r from-amber-600/5 to-transparent filter blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            {/* Title, Branding & Credits */}
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="bg-red-600 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md animate-pulse shadow-md shadow-red-950">
                  Live Stock
                </span>
                <span className="text-zinc-600 text-xs font-mono">v1.4.1</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span>AOT REVOLUTION</span>
                <span className="text-zinc-500 font-light">|</span>
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">STOCK CHECKER</span>
              </h1>
              
              {/* Creator Tag line requested by User */}
              <div className="mt-2 text-sm text-zinc-400 flex items-center gap-2 font-mono">
                <span className="text-zinc-600">•</span>
                <span>Made by</span>
                <span className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-bold relative group">
                  Kuwashii El (@_.texraxit)
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-amber-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </span>
              </div>
            </div>

            {/* Admin toggle console */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Chat now button */}
              <a
                href="https://m.me/kuwashii"
                target="_blank"
                rel="noreferrer noopener"
                className="py-2.5 px-4 rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 text-xs font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/5 hover:scale-[1.02] active:scale-95"
                id="btn-nav-chat"
              >
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span>ทักแชททันที (Messenger)</span>
              </a>

              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-805 p-1 rounded-xl">
                  {/* Admin Tag */}
                  <span className="px-3 py-1.5 rounded-lg text-emerald-400 bg-emerald-520/10 text-xs font-semibold flex items-center gap-1.5 h-full font-sans">
                    <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
                    <span>แอดมินล็อกอินแล้ว</span>
                  </span>

                  {/* Add Product Shortcut */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setIsFormOpen(true);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-white/5 active:scale-95"
                    id="btn-nav-add"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ลงขายสินค้า</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleAdminLogout}
                    className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                    id="btn-nav-logout"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(true)}
                  className="py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-xl shadow-black/30"
                  id="btn-nav-admin-login"
                >
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>ระบบผู้ดูแลคลังสต๊อก (Admin)</span>
                </button>
              )}
            </div>

          </div>

          {/* Statistics summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-zinc-900/40 border border-zinc-900/60 p-4 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">จำนวนสินค้าทั้งหมด</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-white">{totalStockItems}</span>
                <span className="text-xs text-zinc-500">รายการ</span>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900/60 p-4 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">จำนวนพร้อมส่งด่วน</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-emerald-400">{inStockCount}</span>
                <span className="text-xs text-zinc-500">ประเภทคลัง</span>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900/60 p-4 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">สินค้าสะสมในสต๊อก</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-yellow-500">{totalStockUnits}</span>
                <span className="text-xs text-zinc-500">ชิ้น</span>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-900/60 p-4 rounded-xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans">มูลค่าสต๊อกประเมินทั้งหมด</span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-zinc-500 font-mono text-xs">฿</span>
                <span className="font-mono text-2xl font-black text-white">{totalStockValue.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Banner announcement board */}
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-red-950/20 via-zinc-900/50 to-zinc-900/20 border border-zinc-900 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-300">บอร์ดข้อมูลร้านค้า</p>
              <p className="text-xs text-zinc-500 mt-0.5">อัปเดตสต๊อกไอเทมเกม AOT Revolution ตลอด 24 ชม. สะดวก รวดเร็ว เชื่อถือได้ 100%</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-xl border border-zinc-850 w-full sm:w-auto">
              <Clock className="w-3.5 h-3.5 text-amber-550/80" />
              <span className="text-[11px] text-zinc-300">
                อัปเดตคลังล่าสุด: <strong className="text-amber-400">{getLatestUpdatedRelativeTime()}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-mono font-semibold text-emerald-400">สถานะสต๊อก: อัปเดตพร้อมขาย</span>
            </div>
          </div>
        </div>

        {/* Live Notification Center */}
        <section className="mb-8 bg-zinc-900/10 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
          {/* Header Bar */}
          <div className="bg-zinc-950/80 px-4 py-3.5 border-b border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-xl border transition-all ${notifConfig.enabled ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                {notifConfig.enabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>กระดิ่งแจ้งเตือนคลังสินค้า (Stock Live Alerts)</span>
                </h2>
                <p className="text-[10px] text-zinc-500">มอนิเตอร์ระดับความจุสต็อก, การเติมสินค้าและยอดฮิตสินค้าแรร์ในระบบ</p>
              </div>
            </div>

            {/* Quick Master Switches */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              {/* Sound indicator switch */}
              <button
                type="button"
                onClick={() => saveNotifConfig({ ...notifConfig, playAlertSound: !notifConfig.playAlertSound })}
                className={`p-1.5 rounded-lg border text-[10px] items-center gap-1.5 cursor-pointer transition-all flex ${
                  notifConfig.playAlertSound 
                    ? 'bg-zinc-900 border-zinc-850 text-zinc-350 hover:bg-zinc-850' 
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                }`}
                title={notifConfig.playAlertSound ? "ปิดเสียงแจ้งเตือน" : "เปิดเสียงแจ้งเตือน"}
              >
                {notifConfig.playAlertSound ? <Volume2 className="w-3.5 h-3.5 text-amber-500" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{notifConfig.playAlertSound ? 'เปิดเอฟเฟกต์เสียง' : 'ปิดเสียงแจ้งเตือน'}</span>
              </button>

              {/* Master push notification switch */}
              <button
                type="button"
                onClick={async () => {
                  const val = !notifConfig.enabled;
                  saveNotifConfig({ ...notifConfig, enabled: val });
                  
                  if (val) {
                    playChime('success');
                    
                    if ('Notification' in window) {
                      showToast('เปิดระบบแจ้งเตือนคลัง: กรุณากด "อนุญาต" (Allow) หากมีป๊อปอัปสิทธิ์ระดับระบบเด้งขึ้นมา! 🔔', 'info');
                      try {
                        // Resilient request permission (Promise or Callback approach)
                        const requestPromise = Notification.requestPermission();
                        if (requestPromise && typeof requestPromise.then === 'function') {
                          const permission = await requestPromise;
                          if (permission === 'granted') {
                            showToast('เปิดใช้การแจ้งเตือนนอกบราวเซอร์สำเร็จแล้ว! ระบบจะแชร์ผลแม่นยำแม้พับหน้าจอ 🚀', 'success');
                            new Notification('คลังสินค้า Live Alerts 🔔', {
                              body: 'เปิดแรลไทม์มอนิเตอร์ระดับระบบเสร็จสิ้น! หากมีการเติมสต็อกหรือสินค้าเหลือต่ำกว่า 5 คุณจะได้รับการแจ้งเตือนทันที',
                              tag: 'aotr-welcome-alert'
                            });
                          } else if (permission === 'denied') {
                            showToast('สิทธิ์ถูกปฏิเสธ บราวเซอร์จะเปลี่ยนมาใช้การเปิดเสียงเตือนและสิทธิ์ในบราวเซอร์แทน 💡', 'info');
                          }
                        } else {
                          // Callback fallback for older iOS Safari/Android WebViews
                          Notification.requestPermission((permission) => {
                            if (permission === 'granted') {
                              showToast('เปิดระบบสิทธิ์แจ้งเตือนสำหรับมือถือ/บราวเซอร์สำเร็จแล้ว! 🚀', 'success');
                            }
                          });
                        }
                      } catch (err) {
                        console.warn("Notification request permission error:", err);
                        // Fallback message
                        showToast('เปิดการควบคุมแจ้งเตือนผ่านเสียงและป๊อปอัปแบบแมนนวลเสร็จสิ้น 🎵', 'success');
                      }
                    } else {
                      // Native notifications not supported (iOS Safari outside PWA or inside LINE, Facebook webviews)
                      showToast('เปิดโหมดแจ้งเตือนสำรอง: มีเสียงเอฟเฟกต์และกล่องรายงานแบบไลฟ์สตรีม 🔊', 'success');
                    }
                  } else {
                    showToast('ปิดระบบเตือนประคองแบบเรียลไทม์เรียบร้อย', 'info');
                  }
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                  notifConfig.enabled
                    ? 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400 font-extrabold shadow-md shadow-emerald-950/25'
                    : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${notifConfig.enabled ? 'bg-black animate-ping' : 'bg-zinc-600'}`} />
                <span>{notifConfig.enabled ? 'เปิดบริการแจ้งเตือน' : 'ปิดการแจ้งเตือน'}</span>
              </button>
            </div>
          </div>

          {/* Sub-Filters / Settings Switch Center */}
          <div className="bg-zinc-950/30 px-4 py-3 border-b border-zinc-900 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-500 font-sans flex items-center gap-1"><Settings className="w-3 h-3" /> ตั้งค่าแจ้งเตือนฟิลเตอร์:</span>
            
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                disabled={!notifConfig.enabled}
                checked={notifConfig.notifyNewStock}
                onChange={(e) => {
                  saveNotifConfig({ ...notifConfig, notifyNewStock: e.target.checked });
                  if (e.target.checked) playChime('info');
                }}
                className="accent-amber-500 rounded border-zinc-800 bg-zinc-950 focus:ring-amber-500 disabled:opacity-40"
              />
              <span className={`transition-colors font-medium ${!notifConfig.enabled ? 'text-zinc-650' : notifConfig.notifyNewStock ? 'text-zinc-200 font-semibold' : 'text-zinc-500 group-hover:text-zinc-450'}`}>
                📦 สต็อกเพิ่มใหม่ (Fully Restocked)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                disabled={!notifConfig.enabled}
                checked={notifConfig.notifyLowStock}
                onChange={(e) => {
                  saveNotifConfig({ ...notifConfig, notifyLowStock: e.target.checked });
                  if (e.target.checked) playChime('warning');
                }}
                className="accent-amber-500 rounded border-zinc-800 bg-zinc-950 focus:ring-amber-500 disabled:opacity-40"
              />
              <span className={`transition-colors font-medium ${!notifConfig.enabled ? 'text-zinc-650' : notifConfig.notifyLowStock ? 'text-white font-semibold' : 'text-zinc-500 group-hover:text-zinc-450'}`}>
                ⚠️ สต็อกใกล้หมด (⚠️ ต่ำกว่า 5 ชิ้น)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input
                type="checkbox"
                disabled={!notifConfig.enabled}
                checked={notifConfig.notifyPopular}
                onChange={(e) => {
                  saveNotifConfig({ ...notifConfig, notifyPopular: e.target.checked });
                  if (e.target.checked) playChime('info');
                }}
                className="accent-amber-500 rounded border-zinc-800 bg-zinc-950 focus:ring-amber-500 disabled:opacity-40"
              />
              <span className={`transition-colors font-medium ${!notifConfig.enabled ? 'text-zinc-650' : notifConfig.notifyPopular ? 'text-amber-400 font-semibold' : 'text-zinc-500 group-hover:text-zinc-450'}`}>
                ⭐ ตัวตึงยอดนิยม / ระดับความหายากสูง
              </span>
            </label>
          </div>

          {/* Mobile Web & WebView Helper Info Banner */}
          {notifConfig.enabled && (
            <div className="bg-zinc-950/45 px-4 py-2 text-[10px] text-zinc-450 font-sans border-b border-zinc-900/40 flex items-center gap-2">
              <span className="text-amber-500 animate-pulse shrink-0">💡</span>
              <span>
                <strong>แจ้งเตือนบนมือถือ/แท็บเล็ต:</strong> หากไม่พบป๊อปอัปให้กดอนุญาต (จำกัดบน iOS/LINE/FB) หน้าเว็บจะชดเชยให้ด้วย <strong className="text-zinc-300">เสียงแจ้งเตือน (Chime) และประดับกล่องบับเบิ้ลสดด้านบน</strong> ให้อัตโนมัติเมื่อท่านเปิดหน้าจอนี้ค้างไว้!
              </span>
            </div>
          )}

          {/* Active Alerts List Container representation */}
          <div className="p-4 bg-zinc-950/20 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {!notifConfig.enabled ? (
              <div className="py-6 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2 font-sans">
                <BellOff className="w-7 h-7 text-zinc-700 block" />
                <p className="font-semibold text-zinc-400">ปิดการทำงานของศูนย์แจ้งเตือนเรียลไทม์ไว้</p>
                <p className="text-[10px] text-zinc-600">คุณสามารถปรับสไลด์หรือเปิดใช้งานแจ้งเตือนที่ปุ่ม "เปิดบริการแจ้งเตือน" เพื่อเฝ้าติดตามอีกครั้ง</p>
              </div>
            ) : (() => {
              // Dynamically scan items to build active alerts based on rules
              const activeAlerts: {
                id: string;
                itemId: string;
                type: 'new-stock' | 'low-stock' | 'popular';
                title: string;
                message: string;
                item: StockItem;
              }[] = [];

              items.forEach((item) => {
                // Low stock alerting: quantity between 1 and 5
                const isLow = item.quantity > 0 && item.quantity <= 5;
                if (isLow && notifConfig.notifyLowStock) {
                  activeAlerts.push({
                    id: `alert-low-${item.id}`,
                    itemId: item.id,
                    type: 'low-stock',
                    title: 'คลังใกล้หมด!',
                    message: `⚠️ ด่วน! "${item.name}" เหลือคลังในระบบเพียง ${item.quantity} ชิ้นสุดท้ายเท่านั้น!`,
                    item,
                  });
                }

                // New restock alerting: quantity is full or fully capped
                const isNew = item.quantity > 0 && item.initialQuantity !== undefined && item.quantity >= item.initialQuantity;
                if (isNew && notifConfig.notifyNewStock) {
                  activeAlerts.push({
                    id: `alert-new-${item.id}`,
                    itemId: item.id,
                    type: 'new-stock',
                    title: 'สต็อกเติมเพิ่มใหม่!',
                    message: `📦 สำรองเต็มร้อย! "${item.name}" ได้รับการเติมสต็อกพร้อมส่งสูงสุดแล้ว (${item.quantity} ชุด)`,
                    item,
                  });
                }

                // Popularity alerting: includes Pinned, Popular stats, or very high end rarity
                const isPub = !!item.isPinned || !!item.isPopular || item.rarity === 'Mythic' || item.rarity === 'Legendary';
                if (isPub && notifConfig.notifyPopular) {
                  // Safeguard: only add if not already marked low stock to keep dashboard fresh
                  if (!activeAlerts.some(a => a.id === `alert-low-${item.id}`)) {
                    activeAlerts.push({
                      id: `alert-pub-${item.id}`,
                      itemId: item.id,
                      type: 'popular',
                      title: 'ไอเทมแรร์ยอดนิยม!',
                      message: `⭐ ของดีระดับแชมเปี้ยน! "${item.name}" (${item.rarity}) มียอดขายสูงสุด สต๊อกตอนนี้: ${item.quantity} ชิ้น`,
                      item,
                    });
                  }
                }
              });

              if (activeAlerts.length === 0) {
                return (
                  <div className="py-6 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-1.5 font-sans select-none">
                    <Sparkles className="w-4 h-4 text-amber-500/30 animate-pulse block" />
                    <p className="font-semibold text-zinc-400">คลังเซฟตี้เรียบร้อย ไม่มีสต๊อกติดสัญญาณเสด็จในขณะนี้</p>
                    <p className="text-[10px] text-zinc-650">เมื่อระดับของคลังไอเทมเปลี่ยนแปลง อลาร์มความเสี่ยงจะปรากฏขึ้นที่แผงควบคุมนี้ทันที</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeAlerts.map((alt) => {
                    let typeClass = '';
                    let dotColor = '';

                    if (alt.type === 'low-stock') {
                      typeClass = 'bg-red-500/5 hover:bg-red-500/10 border-red-950/40 text-red-300';
                      dotColor = '#ef4444';
                    } else if (alt.type === 'new-stock') {
                      typeClass = 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-950/40 text-emerald-300';
                      dotColor = '#10b981';
                    } else {
                      typeClass = 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-950/30 text-amber-300';
                      dotColor = '#f59e0b';
                    }

                    return (
                      <motion.div
                        key={alt.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${typeClass}`}
                      >
                        {/* Avatar Item miniature preview */}
                        <div className="w-9 h-9 bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {alt.item.imageUrl ? (
                            <img src={alt.item.imageUrl} alt={alt.item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>

                        {/* Title and Message */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: dotColor }} />
                            <span className="font-sans text-[9px] font-black uppercase tracking-wider">{alt.title}</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-sans truncate leading-normal" title={alt.message}>
                            {alt.message}
                          </p>
                        </div>

                        {/* Fast Targeted Scrolling & Inquiry Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            setSearch(alt.item.name);
                            const itemCardElement = document.getElementById(`item-card-${alt.item.id}`);
                            if (itemCardElement) {
                              itemCardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // Highlight block or open purchase dialog right away
                              setInquiringItem(alt.item);
                            } else {
                              // secondary fallback
                              window.scrollTo({ top: 450, behavior: 'smooth' });
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 text-white font-sans text-[10px] font-bold shrink-0 transition-transform active:scale-[0.97] cursor-pointer"
                        >
                          เล็งสั่งซื้อ 🎯
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Search and Filters Hub */}
        <section className="bg-zinc-900/20 border border-zinc-900 p-5 sm:p-6 rounded-2xl mb-8 space-y-5">
          
          {/* Main search input and Sort dropdown row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            
            {/* Elegant Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อไอเทม, คุณสมบัติความเร็ว, ระดับระดับ หรือหมวดหมู่..."
                className="w-full bg-zinc-950 border border-zinc-850 py-3 pl-10 pr-10 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-zinc-500 font-sans flex-shrink-0">เรียงตาม:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 py-3 px-4 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer font-sans appearance-none pr-8 font-medium"
                >
                  <option value="rarity-desc">ความหายาก (หายากสุด-ทั่วไป)</option>
                  <option value="price-desc">ราคา (แพงสุด - ถูกสุด)</option>
                  <option value="price-asc">ราคา (ถูกสุด - แพงสุด)</option>
                  <option value="stock-desc">จำนวนคงเหลือ (มากสุด - น้อยสุด)</option>
                  <option value="stock-asc">จำนวนคงเหลือ (น้อยสุด - มากสุด)</option>
                  <option value="name-asc">ชื่อไอเทม (ก-ฮ / A-Z)</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Horizontal Swiping Category list */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-sans block mb-1">
              หมวดหมู่ไอเทม (Item Categories)
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {(['all', 'Serum', 'Bloodline', 'Equipment', 'Artifact', 'Scroll/Key', 'Perk', 'Other'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-white text-black shadow-lg shadow-white/5 font-extrabold'
                      : 'bg-zinc-950 hover:bg-zinc-900/60 border border-zinc-850 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? '📦 ทั้งหมดทุกหมวดหมู่' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity & Status Filter tags row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-zinc-900">
            
            {/* Rarity Selector Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">ระดับแรร์ (Rarity Type)</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Common'] as const).map((rarity) => (
                  <button
                    key={rarity}
                    onClick={() => setSelectedRarity(rarity)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold tracking-normal transition-all cursor-pointer border ${
                      selectedRarity === rarity
                        ? rarity === 'Mythic'
                          ? 'bg-red-500/10 border-red-500 text-red-400'
                          : rarity === 'Legendary'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                          : rarity === 'Epic'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                          : rarity === 'Rare'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                          : rarity === 'Common'
                          ? 'bg-zinc-500/10 border-zinc-400 text-zinc-300'
                          : 'bg-white text-black border-white font-extrabold'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {rarity === 'all' ? '⭐ ทุกระดับความหายาก' : rarity}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability status selectors and Popular item filters */}
            <div className="space-y-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">ความพร้อมคลัง (Stock Status)</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['all', 'in-stock', 'low-stock', 'out-of-stock'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        selectedStatus === st
                          ? 'bg-zinc-800 border-zinc-500 text-white'
                          : 'bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {st === 'all' && 'ทั้งหมด'}
                      {st === 'in-stock' && 'มีสินค้า (>5)'}
                      {st === 'low-stock' && 'ใกล้หมด (1-5)'}
                      {st === 'out-of-stock' && 'หมด'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Show Popular Only switch */}
              <div className="space-y-2 sm:self-end">
                <button
                  type="button"
                  onClick={() => setShowPopularOnly(!showPopularOnly)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    showPopularOnly
                      ? 'bg-rose-500/15 border-rose-500 text-rose-450'
                      : 'bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-rose-400'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${showPopularOnly ? 'fill-current text-rose-450 animate-bounce' : 'text-zinc-500'}`} />
                  <span>แสดงเฉพาะยอดนิยม</span>
                </button>
              </div>
            </div>

          </div>

        </section>

        {/* Admin Dashboard Control Center */}
        {isAdmin && (
          <section className="bg-zinc-900/50 border border-emerald-500/20 p-5 rounded-2xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none -z-10" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 animate-pulse">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">แผงเครื่องมือแอดมินจัดการสต๊อกดิ๊ก</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">คุณสามารถอัปเดตสต็อก, รีเซ็ตข้อมูลดีฟอลต์ หรือ แบคอัพข้อมูลสต๊อกทั้งหมดได้ที่นี่</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Delete all products button */}
                <button
                  type="button"
                  onClick={handleDeleteAllProducts}
                  className="py-2 px-3 border border-red-500/30 hover:border-red-650/80 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ลบสินค้าทั้งหมดในคลังออกทั้งหมด</span>
                </button>

                {/* Make all set to 0 stock button */}
                <button
                  type="button"
                  onClick={handleClearStockToZero}
                  className="py-2 px-3 border border-amber-500/30 hover:border-amber-600/80 bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 animate-pulse" />
                  <span>เซ็ตจำนวนสต๊อกสินค้าทั้งหมดเหลือ 0 ชิ้น</span>
                </button>

                {/* Backup export */}
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="py-2 px-3 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>ส่งออก JSON Backup</span>
                </button>

                {/* Import backup */}
                <label className="py-2 px-3 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                  <FileUp className="w-3.5 h-3.5" />
                  <span>นำเข้าไฟล์ JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>

              </div>
            </div>
          </section>
        )}

        {/* Search status summary display */}
        <div className="flex items-center justify-between gap-4 mb-5 text-xs text-zinc-500 font-sans">
          <span>
            ผลการค้นหาและตัวกรองที่เลือกเจอทั้งหมด: <strong className="text-zinc-300 font-bold">{sortedItems.length}</strong> รายการสินค้า
          </span>
          {(search || selectedCategory !== 'all' || selectedRarity !== 'all' || selectedStatus !== 'all' || showPopularOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedRarity('all');
                setSelectedStatus('all');
                setShowPopularOnly(false);
              }}
              className="text-amber-500 hover:text-amber-400 font-extrabold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>

        {/* Item Grid Component */}
        {sortedItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-zinc-900 bg-zinc-950/60 p-12 rounded-3xl text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-650 border border-zinc-805">
              <Inbox className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">ไม่พบสินค้าที่คุณต้องการในสต๊อกขณะนี้</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                ลองตรวจสอบชื่อสะกดไอเทมใหม่อีกครั้ง หรือเข้ากลุ่ม Discord สอบถามเพิ่มเติมได้โดยตรง
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setSelectedRarity('all');
                setSelectedStatus('all');
              }}
              className="py-2.5 px-5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold border border-zinc-800 transition-all cursor-pointer"
            >
              ย้อนกลับไปดูสินค้าทั้งหมด
            </button>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {sortedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={(it) => {
                    setEditingItem(it);
                    setIsFormOpen(true);
                  }}
                  onDelete={handleDeleteItem}
                  onQuickQuantityChange={handleQuickQuantityChange}
                  onInquire={(it) => setInquiringItem(it)}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

      </main>

      {/* Modern, Highly styled Custom Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 text-xs py-10 mt-12 bg-gradient-to-b from-transparent to-black/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Left section info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-650" />
                <span className="font-display font-medium text-white text-sm">Attack on Titan Revolution Stock Checker</span>
              </div>
              <p className="text-zinc-500">
                ระบบจัดการและเช็คจำนวนคงเหลือสต๊อกไอเทม แรร์ไอเทม และสเตตัสในเกม AOT Revolution แบบเรียลไทม์
              </p>
            </div>

            {/* Right section - signature citation requested explicitly */}
            <div className="text-center md:text-right space-y-1">
              <p className="text-zinc-600 uppercase tracking-widest text-[10px]">Development Credit</p>
              <p className="text-zinc-300 font-sans">
                Made with passion by{' '}
                <strong className="text-amber-450 hover:text-amber-400 transition-colors cursor-pointer font-bold font-mono">
                  Kuwashii El ( @_.texraxit )
                </strong>
              </p>
              <p className="text-zinc-650 text-[10px]">
                ลิขสิทธิ์ดีไซน์เป็นไปตามข้อตกลงและเกม Attack on Titan Revolution Roblox
              </p>
            </div>

          </div>
        </div>
      </footer>

      {/* --- MODALS HANDLERS --- */}

      {/* Password Prompt UI modal for entry to Admin Dashboard */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordPrompt(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10"
            >
              <button
                type="button"
                className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-900 transition-colors"
                onClick={() => setShowPasswordPrompt(false)}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2 mb-5">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white">เข้าสู่ระบบแผงแอดมินผู้ดูแลสต๊อก</h3>
                  <p className="text-xs text-zinc-500">กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานเครื่องมืออัปเดตจำนวนสินค้า</p>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4 font-sans">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      ชื่อผู้ดูแลระบบ (Username)
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => {
                        setAdminUsername(e.target.value);
                        setPasscodeError('');
                      }}
                      placeholder="เช่น Kuwashii_admin"
                      required
                      autoFocus
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-all text-xs placeholder-zinc-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      รหัสผ่าน (Password)
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setPasscodeError('');
                      }}
                      placeholder="ป้อนรหัสผ่าน..."
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-all text-xs placeholder-zinc-600 font-mono tracking-wider font-semibold"
                    />
                  </div>

                  {passcodeError && (
                    <p className="text-[11px] text-red-500 text-center font-sans mt-2.5 flex items-center justify-center gap-1 leading-normal bg-red-950/15 py-1.5 px-3 rounded-lg border border-red-900/35">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{passcodeError}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordPrompt(false)}
                    className="w-1/2 py-2 px-4 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white bg-transparent text-xs font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black border-white text-xs font-extrabold cursor-pointer transition-all active:scale-95"
                    id="btn-confirm-passcode"
                  >
                    ยืนยันการเข้าระบบ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inquiry Summary & Clipboard tool modal */}
      <InquiryModal
        item={inquiringItem}
        onClose={() => setInquiringItem(null)}
      />

      {/* Admin modal for Adding/Editing stock items */}
      <AdminModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editingItem={editingItem}
      />

    </div>
  );
}
