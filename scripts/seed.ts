/**
 * Seed A Wok restaurant, categories, menu items, and admin user.
 * Run: npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../lib/mongodb";
import { slugify } from "../lib/utils";
import { Category } from "../models/Category";
import { MenuItem } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurant";
import { User } from "../models/User";

const c = (dollars: number) => Math.round(dollars * 100);

const BOGO_NAMES = new Set([
  "Spicy Pork and Shrimp Wontons (8pc)",
  "Golden Fried Mini Buns with condensed Milk (4 pieces)",
  "Vegetarian Spring Rolls (4pc)",
  "Sesame Ball (6) pieces",
]);

const HERO =
  "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=1600&q=80";

const OPENING = [
  { day: "Monday", open: "11:00", close: "21:30", closed: false },
  { day: "Tuesday", open: "11:00", close: "21:30", closed: false },
  { day: "Wednesday", open: "11:00", close: "21:30", closed: false },
  { day: "Thursday", open: "11:00", close: "21:30", closed: false },
  { day: "Friday", open: "11:00", close: "22:00", closed: false },
  { day: "Saturday", open: "11:00", close: "22:00", closed: false },
  { day: "Sunday", open: "11:00", close: "21:00", closed: false },
];

type Row = { name: string; price: number; description?: string };

const MENU: { slug: string; name: string; order: number; items: Row[] }[] = [
  {
    slug: "appetizer",
    name: "Appetizer",
    order: 1,
    items: [
      { name: "Shrimp Katsu", price: 6.99 },
      { name: "Chicken Chop", price: 4.99 },
      { name: "Pork Katsu", price: 5.99 },
      { name: "Vegetarian Spring Rolls (4pc)", price: 8.99 },
      {
        name: "Sesame Ball (6) pieces",
        price: 8.99,
        description: "Golden fried glutinous rice balls coated with sesame seeds.",
      },
      {
        name: "Golden Fried Mini Buns with condensed Milk (4 pieces)",
        price: 8.99,
      },
      { name: "Wasabi Black Fungus", price: 8.99 },
      { name: "Salt and Pepper Tofu", price: 9.99 },
      { name: "Spicy Pork and Shrimp Wontons (8pc)", price: 12.99 },
    ],
  },
  {
    slug: "from-the-wok",
    name: "From the Wok",
    order: 2,
    items: [
      { name: "Orange Chicken", price: 14.99 },
      { name: "Honey Walnut Shrimp", price: 13.99 },
      { name: "Coconut Curry Chicken", price: 14.99 },
      { name: "Crispy Soy Chicken Plate", price: 17.99 },
      { name: "Salt and Pepper Pork", price: 13.99 },
      { name: "Salt and Pepper Shrimp", price: 13.99 },
      { name: "Kung Pao Chicken", price: 13.99 },
      { name: "Mapo Tofu with Beef", price: 14.99 },
      { name: "Black Pepper Beef", price: 14.99 },
      { name: "Cumin King Oyster Mushrooms", price: 13.99 },
      { name: "String Beans with Garlic", price: 13.99 },
      { name: "Broccoli with Garlic", price: 12.99 },
      { name: "Cabbage with Garlic", price: 12.99 },
      { name: "Broccoli Beef", price: 13.99 },
      { name: "Broccoli Chicken", price: 13.99 },
      { name: "Mongolia Beef", price: 13.99 },
      { name: "Mongolia Chicken", price: 13.99 },
      { name: "Spicy String Beans", price: 13.99 },
      { name: "General Tso's Chicken", price: 13.99 },
      { name: "Sweet and Sour Pork", price: 13.99 },
      { name: "Pineapple Shrimp", price: 14.99 },
    ],
  },
  {
    slug: "fried-rice-and-fried-noodle",
    name: "Fried Rice and Fried Noodle",
    order: 3,
    items: [
      { name: "Chicken Chop Fried Rice", price: 15.99 },
      { name: "Pork Katsu Fried Rice", price: 16.99 },
      { name: "Shrimp Katsu Fried Rice", price: 17.99 },
      { name: "Fried Rice", price: 12.99 },
      { name: "Pineapple & Shrimp Fried Rice", price: 16.99 },
      { name: "Fried Noodle", price: 13.99 },
      { name: "Chicken Chop Fried Noodle", price: 16.99 },
      { name: "Pork Katsu Fried Noodle", price: 17.99 },
      { name: "Shrimp Katsu Fried Noodle", price: 18.99 },
      { name: "Tomato & Egg Fried Noodle", price: 14.99 },
      { name: "White Rice", price: 2.5 },
    ],
  },
  {
    slug: "wonton-and-soup",
    name: "Wonton and Soup",
    order: 4,
    items: [
      { name: "Vegetarian Hot & Sour Soup", price: 9.99 },
      { name: "Wor Wonton Soup", price: 12.99 },
      { name: "Spicy Pork and Shrimp Wontons (8pc)", price: 12.99 },
    ],
  },
  {
    slug: "drinks",
    name: "Drinks",
    order: 5,
    items: [
      { name: "Coke", price: 2.0 },
      { name: "Diet Coke", price: 2.0 },
      { name: "Sprite", price: 2.0 },
    ],
  },
];

async function main() {
  await connectDB();

  await Restaurant.findOneAndUpdate(
    { slug: "a-wok" },
    {
      name: "A Wok",
      slug: "a-wok",
      address: "1025 A St, Hayward, CA 94541",
      phone: "(510) 555-0199",
      logoUrl: "/awok-logo.png",
      heroImageUrl: HERO,
      stripeConnectedAccountId: "",
      hasSubmittedVoidCheckAndId: false,
      paymentMode: "platform_collect",
      commissionPercentage: 10,
      openingHours: OPENING,
      isAcceptingOrders: true,
    },
    { upsert: true, new: true }
  );

  for (const block of MENU) {
    const cat = await Category.findOneAndUpdate(
      { slug: block.slug },
      { name: block.name, slug: block.slug, displayOrder: block.order, isActive: true },
      { upsert: true, new: true }
    );

    for (const row of block.items) {
      const slug = `${block.slug}-${slugify(row.name)}`.slice(0, 180);
      const desc = row.description ?? "";
      const bogo = BOGO_NAMES.has(row.name);
      const imageUrl = `/menu/${slug}.jpg`;

      await MenuItem.findOneAndUpdate(
        { slug, category: cat._id },
        {
          name: row.name,
          slug,
          description: desc,
          price: c(row.price),
          category: cat._id,
          imageUrl,
          tags: [],
          spiceLevel: row.name.toLowerCase().includes("spicy") ? 2 : 0,
          isPopular: false,
          bogoEnabled: bogo,
          purchaseCount: 0,
          isAvailable: true,
          options: [],
        },
        { upsert: true, new: true }
      );
    }
  }

  const adminEmail = "admin@awok.local";
  const adminPass = "Admin12345!";
  const hash = await bcrypt.hash(adminPass, 12);
  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      name: "A Wok Admin",
      email: adminEmail,
      passwordHash: hash,
      phone: "",
      role: "admin",
      isBlocked: false,
    },
    { upsert: true, new: true }
  );

  // eslint-disable-next-line no-console
  console.log("Seed complete. Admin:", adminEmail, "/", adminPass);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
