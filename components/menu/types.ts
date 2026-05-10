export type MenuItemDTO = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  imageUrl?: string;
  spiceLevel?: number;
  isPopular?: boolean;
  bogoEnabled?: boolean;
  tags?: string[];
  /** Present on `/api/menu` payloads; used for category-scoped options (e.g. protein). */
  category?: { _id: string; name: string; slug: string; displayOrder?: number };
};
