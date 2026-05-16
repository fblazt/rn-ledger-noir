import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateType, useDefaultStyles } from 'react-native-ui-datepicker';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatMonthLabel, formatReadableDate, toIsoDate } from '@/src/lib/date';

type DatePickerFieldProps = {
  onChange: (value: string) => void;
  value: string;
};

type MonthPickerFieldProps = {
  onChange: (value: string) => void;
  value: string;
  compact?: boolean;
};

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DatePickerField({ onChange, value }: DatePickerFieldProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const defaultStyles = useDefaultStyles(colorScheme);
  const [visible, setVisible] = useState(false);

  function selectDate(date: DateType) {
    const parsedDate = parsePickerDate(date);

    if (!parsedDate) {
      return;
    }

    onChange(toIsoDate(parsedDate));
    setVisible(false);
  }

  return (
    <View>
      <Pressable className="mt-3 rounded-2xl border border-border bg-background px-4 py-4" onPress={() => setVisible(true)}>
        <Text className="text-base font-bold text-foreground">{formatReadableDate(value)}</Text>
      </Pressable>

      <PickerModal onClose={() => setVisible(false)} title="Pick date" visible={visible}>
        <DateTimePicker
          date={parseFieldDate(value)}
          firstDayOfWeek={0}
          mode="single"
          onChange={({ date }) => selectDate(date)}
          styles={defaultStyles}
        />
      </PickerModal>
    </View>
  );
}

export function MonthPickerField({ compact = false, onChange, value }: MonthPickerFieldProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const iconColor = Colors[colorScheme].text;
  const [visible, setVisible] = useState(false);
  const initialDate = useMemo(() => parseFieldDate(`${value}-01`), [value]);
  const [month, setMonth] = useState(initialDate.getUTCMonth());
  const [year, setYear] = useState(initialDate.getUTCFullYear());

  function openPicker() {
    const date = parseFieldDate(`${value}-01`);
    setMonth(date.getUTCMonth());
    setYear(date.getUTCFullYear());
    setVisible(true);
  }

  function submitMonth() {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}`);
    setVisible(false);
  }

  return (
    <View>
      <Pressable
        className={
          compact
            ? 'h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card'
            : 'rounded-full border border-border bg-card px-4 py-3'
        }
        onPress={openPicker}
      >
        {compact ? (
          <Ionicons color={iconColor} name="calendar-outline" size={20} />
        ) : (
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-foreground">
            {formatMonthLabel(value)}
          </Text>
        )}
      </Pressable>

      <PickerModal onClose={() => setVisible(false)} title="Pick month" visible={visible}>
        <View className="flex-row items-center justify-between rounded-full border border-border bg-background p-1">
          <Pressable className="rounded-full bg-receipt px-4 py-3" onPress={() => setYear((current) => current - 1)}>
            <Text className="font-mono text-sm font-black text-primary">‹</Text>
          </Pressable>
          <Text className="text-sm font-black uppercase tracking-[0.18em] text-foreground">{year}</Text>
          <Pressable className="rounded-full bg-receipt px-4 py-3" onPress={() => setYear((current) => current + 1)}>
            <Text className="font-mono text-sm font-black text-primary">›</Text>
          </Pressable>
        </View>

        <View className="mt-5 flex-row flex-wrap gap-2">
          {monthLabels.map((label, index) => (
            <View key={label} className="w-[31%]">
              <Pressable
                className={
                  month === index
                    ? 'rounded-2xl border border-primary bg-primary px-3 py-4'
                    : 'rounded-2xl border border-border bg-background px-3 py-4'
                }
                onPress={() => setMonth(index)}
              >
                <Text
                  className={
                    month === index
                      ? 'text-center text-sm font-black text-primary-foreground'
                      : 'text-center text-sm font-black text-foreground'
                  }
                >
                  {label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable className="mt-5 rounded-2xl bg-primary px-4 py-4" onPress={submitMonth}>
          <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-primary-foreground">
            Apply month
          </Text>
        </Pressable>
      </PickerModal>
    </View>
  );
}

type PickerModalProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

function PickerModal({ children, onClose, title, visible }: PickerModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable className="flex-1 justify-end bg-black/70 px-5 pb-8" onPress={onClose}>
        <Pressable className="rounded-[32px] border border-border bg-card p-5" onPress={(event) => event.stopPropagation()}>
          <Text className="font-mono text-xs font-black uppercase tracking-[0.18em] text-stamp">{title}</Text>
          <View className="mt-5">{children}</View>
          <Pressable className="mt-5 rounded-2xl border border-border bg-background px-4 py-4" onPress={onClose}>
            <Text className="text-center text-sm font-black uppercase tracking-[0.16em] text-foreground">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function parseFieldDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function parsePickerDate(date: DateType) {
  if (!date) {
    return null;
  }

  if (date instanceof Date) {
    return date;
  }

  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const maybeDate = date as { toDate?: () => Date };

  if (typeof maybeDate.toDate === 'function') {
    return maybeDate.toDate();
  }

  return null;
}
