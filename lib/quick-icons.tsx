"use client";

import {
  Coffee,
  ForkKnife,
  Hamburger,
  Pizza,
  BeerBottle,
  Car,
  Bus,
  GasPump,
  ShoppingCart,
  ShoppingBag,
  House,
  Lightning,
  Drop,
  WifiHigh,
  Pill,
  FirstAid,
  Barbell,
  GameController,
  FilmStrip,
  MusicNotes,
  Book,
  Gift,
  TShirt,
  AirplaneTilt,
  Dog,
  Baby,
  Wrench,
  Receipt,
  CreditCard,
  Money,
  Phone,
  Tag,
  type Icon,
} from "@phosphor-icons/react";

// Curated icon set for quick-log tiles. DB stores the string key.
export const QUICK_ICONS: Record<string, Icon> = {
  coffee: Coffee,
  forkknife: ForkKnife,
  hamburger: Hamburger,
  pizza: Pizza,
  drink: BeerBottle,
  car: Car,
  bus: Bus,
  fuel: GasPump,
  cart: ShoppingCart,
  bag: ShoppingBag,
  house: House,
  electric: Lightning,
  water: Drop,
  wifi: WifiHigh,
  pill: Pill,
  health: FirstAid,
  gym: Barbell,
  game: GameController,
  movie: FilmStrip,
  music: MusicNotes,
  book: Book,
  gift: Gift,
  clothes: TShirt,
  travel: AirplaneTilt,
  pet: Dog,
  baby: Baby,
  tools: Wrench,
  bill: Receipt,
  card: CreditCard,
  cash: Money,
  phone: Phone,
};

export const QUICK_ICON_NAMES = Object.keys(QUICK_ICONS);

const FALLBACK = Tag;

/** Resolve an icon key to its component, with a safe fallback. */
export function quickIcon(name: string | null | undefined): Icon {
  return (name && QUICK_ICONS[name]) || FALLBACK;
}
