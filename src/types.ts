export interface LoveCoupon {
  title: string;
  description: string;
  icon: string;
  isRedeemed?: boolean;
}

export interface CoupleMusic {
  name: string;
  artist: string;
  link: string;
}

export interface LoveLetter {
  id?: string;
  senderName: string;
  receiverName: string;
  originalMessage?: string;
  enhancedMessage: string;
  musicName?: string;
  musicArtist?: string;
  musicLink?: string;
  theme: string;
  anniversaryDate?: string;
  photos?: string[]; // compressed base64 list
  loveCoupons: LoveCoupon[];
  cutePuns?: string[];
  createdAt?: string;
}

export type ThemeType = "pastel" | "starry" | "bubblegum" | "polaroid";

export interface ThemeConfig {
  id: ThemeType;
  name: string;
  bgClass: string;
  cardClass: string;
  textClass: string;
  accentClass: string;
  badgeClass: string;
  fontSans: string;
  fontDisplay: string;
}
