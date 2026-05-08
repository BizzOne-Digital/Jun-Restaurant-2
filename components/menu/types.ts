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
};
