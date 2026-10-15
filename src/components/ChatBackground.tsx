import { Colors } from '@/constants/colors';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  Banknote,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  Coins,
  CreditCard,
  ClipboardList,
  Crown,
  Dice5,
  Dumbbell,
  Goal,
  Hash,
  HeadphonesIcon,
  Heart,
  Landmark,
  Megaphone,
  Medal,
  MessageCircle,
  MessageSquare,
  Pin,
  QrCode,
  Receipt,
  Shield,
  Smartphone,
  Star,
  Ticket,
  TicketPercent,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

const ICON_SETS = {
  default: [Goal, Trophy, Dice5, CircleDollarSign, Wallet, Medal, Coins, TicketPercent, Dumbbell, Crown, BadgeDollarSign, ChartNoAxesColumnIncreasing, Star, Banknote, Ticket, TrendingUp],
  finance: [Wallet, Banknote, Coins, CircleDollarSign, CreditCard, Receipt, Smartphone, ArrowDownToLine, ArrowUpFromLine, Landmark, QrCode, ChartNoAxesColumnIncreasing, TicketPercent, BadgeDollarSign, TrendingUp, Goal],
  admin: [Shield, Crown, Goal, Trophy, Dice5, CircleDollarSign, Wallet, Medal, TicketPercent, BadgeDollarSign, ChartNoAxesColumnIncreasing, Users, ClipboardList, HeadphonesIcon, MessageCircle, Pin],
  forum: [MessageSquare, Goal, Trophy, Dice5, CircleDollarSign, Medal, Dumbbell, TicketPercent, Hash, Crown, Coins, ChartNoAxesColumnIncreasing, Heart, Star, Wallet, Megaphone],
} satisfies Record<string, LucideIcon[]>;

export type ChatBackgroundVariant = keyof typeof ICON_SETS;

type Props = {
  variant?: ChatBackgroundVariant;
  iconColor?: string;
  opacity?: number;
  spacing?: number;
  iconSize?: number;
  backgroundColor?: string;
  seed?: number;
};

function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

type Doodle = {
  key: string;
  Icon: LucideIcon;
  isBrand: boolean;
  x: number;
  y: number;
  size: number;
  rotate: number;
};

function MatistoreOutlineIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 64" fill="none" preserveAspectRatio="xMidYMid meet">
      <Path
        d="M12 61C7 61 5 56 7 51l11-36 5 15c1 3 4 4 7 4 2 0 3-2 1-5L22 8c-2-4 6-7 11-5 3 1 5 3 6 7l8 29c1 4-2 7-6 7-3 0-8-3-13-5L18 59c-1 2-4 3-6 2Z"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M88 61c5 0 7-5 5-10L82 15l-5 15c-1 3-4 4-7 4-2 0-3-2-1-5l9-21c2-4-6-7-11-5-3 1-5 3-6 7l-8 29c-1 4 2 7 6 7 3 0 8-3 13-5l10 18c1 2 4 3 6 2Z"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M43 11h21c4 0 5 3 4 6l-1 2c-.5 1.5-2 2-4 2H44l2 4h19l-5 9H47c-3 0-4-1-5-4l-4-14c-1-3 1-5 5-5Z"
        stroke="#FFFFFF"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChatBackground({
  variant = 'default',
  iconColor = '#FFFFFF',
  opacity = 0.07,
  spacing = 44,
  iconSize = 23,
  backgroundColor = Colors.darkBg,
  seed = 7,
}: Props) {
  const { width, height } = useWindowDimensions();

  const doodles = useMemo<Doodle[]>(() => {
    const icons = ICON_SETS[variant];
    const random = mulberry32(seed);
    const rows = Math.ceil(height / spacing) + 1;
    const columns = Math.ceil(width / spacing) + 1;
    const list: Doodle[] = [];
    let iconIndex = 0;

    for (let row = 0; row < rows; row += 1) {
      const rowOffset = row % 2 === 0 ? 0 : spacing / 2;
      for (let column = 0; column < columns; column += 1) {
        list.push({
          key: `${row}-${column}`,
          Icon: icons[iconIndex % icons.length],
          isBrand: random() < 0.2,
          x: column * spacing + rowOffset + (random() - 0.5) * spacing * 0.35,
          y: row * spacing + (random() - 0.5) * spacing * 0.35,
          size: iconSize + Math.round((random() - 0.5) * 8),
          rotate: Math.round((random() - 0.5) * 42),
        });
        iconIndex += 1 + Math.floor(random() * 2);
      }
    }
    return list;
  }, [variant, seed, spacing, iconSize, width, height]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor }]}>
      {doodles.map(({ key, Icon, isBrand, x, y, size, rotate }) => (
        <View
          key={key}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: isBrand ? size : undefined,
            height: isBrand ? size : undefined,
            alignItems: isBrand ? 'center' : undefined,
            justifyContent: isBrand ? 'center' : undefined,
            opacity: isBrand ? Math.min(opacity * 1.7, 0.16) : opacity,
            transform: [{ rotate: `${rotate}deg` }],
          }}
        >
          {isBrand ? (
            <MatistoreOutlineIcon size={size * 1.14} />
          ) : (
            <Icon color={iconColor} size={size} strokeWidth={2.5} />
          )}
        </View>
      ))}
    </View>
  );
}
