import { Text } from 'react-native';

type AmountTone = 'default' | 'income' | 'expense' | 'muted' | 'inverse';

type AmountTextProps = {
  amount: number;
  tone?: AmountTone;
  size?: 'sm' | 'md' | 'lg';
};

const toneClass: Record<AmountTone, string> = {
  default: 'text-foreground',
  income: 'text-success',
  expense: 'text-danger',
  muted: 'text-muted',
  inverse: 'text-primary-foreground',
};

const sizeClass = {
  sm: 'text-sm',
  md: 'text-2xl',
  lg: 'text-5xl',
};

export function AmountText({ amount, tone = 'default', size = 'md' }: AmountTextProps) {
  return (
    <Text
      adjustsFontSizeToFit
      className={`font-mono font-black ${sizeClass[size]} ${toneClass[tone]}`}
      minimumFontScale={0.7}
      numberOfLines={1}
    >
      {formatIdr(amount)}
    </Text>
  );
}

function formatIdr(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}
