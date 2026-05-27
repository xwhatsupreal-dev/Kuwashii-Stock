export interface StockItem {
  id: string;
  name: string;
  category: 'Serum' | 'Bloodline' | 'Skin' | 'Artifact' | 'Scroll/Key' | 'Perk' | 'Other';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  quantity: number;
  initialQuantity?: number;
  price: number; // in Thai Baht
  description: string;
  imageUrl?: string;
  isPinned?: boolean;
  isPopular?: boolean;
  updatedAt: string;
}

export type CategoryFilter = 'all' | StockItem['category'];
export type RarityFilter = 'all' | StockItem['rarity'];
export type StockStatusFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
