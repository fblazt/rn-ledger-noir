import { TextInput } from 'react-native';

import { formatIdr } from '@/src/lib/money';

type AmountInputProps = {
  onChangeValue: (value: string) => void;
  value: string;
};

export function AmountInput({ onChangeValue, value }: AmountInputProps) {
  return (
    <TextInput
      className="mt-3 rounded-2xl border border-border bg-background p-4 text-base font-bold text-foreground"
      inputMode="numeric"
      keyboardType="number-pad"
      onChangeText={(nextValue) => onChangeValue(normalizeAmountInput(nextValue))}
      placeholder="Rp 125.000"
      placeholderTextColorClassName="accent-muted"
      returnKeyType="done"
      value={value ? formatIdr(Number(value)) : ''}
    />
  );
}

function normalizeAmountInput(value: string) {
  return value.replace(/\D/g, '').replace(/^0+/, '');
}
