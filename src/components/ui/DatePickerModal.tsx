import { Colors } from '@/constants/colors';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

type Props = {
  visible: boolean;
  value?: string; // date ISO
  minimumDate?: Date;
  title?: string;
  onClose: () => void;
  onSelect: (isoDate: string) => void;
};

export default function DatePickerModal({ visible, value, minimumDate, title, onClose, onSelect }: Props) {
  const [viewYear, setViewYear] = useState(() => (value ? new Date(value) : new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(value) : new Date()).getMonth());

  useEffect(() => {
    if (visible) {
      const base = value ? new Date(value) : (minimumDate ?? new Date());
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [visible, value, minimumDate]);

  const weeks = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const selected = value && !isNaN(new Date(value).getTime()) ? stripTime(new Date(value)) : null;
  const today = stripTime(new Date());
  const min = minimumDate ? stripTime(minimumDate) : null;

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handlePick = (day: Date) => {
    onSelect(day.toISOString());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? 'Choisir une date'}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color={Colors.textSecondary} size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navBtn} onPress={goPrevMonth}>
              <ChevronLeft color={Colors.white} size={18} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={goNextMonth}>
              <ChevronRight color={Colors.white} size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekDayText}>{w}</Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={styles.dayCell} />;
                const disabled = !!min && day.getTime() < min.getTime();
                const isSelected = !!selected && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                return (
                  <TouchableOpacity
                    key={di}
                    style={styles.dayCell}
                    disabled={disabled}
                    onPress={() => handlePick(day)}
                  >
                    <View style={[
                      styles.dayInner,
                      isSelected && styles.daySelected,
                      isToday && !isSelected && styles.dayToday,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        disabled && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                      ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  sheet: {
    width: '100%', maxWidth: 360,
    backgroundColor: Colors.cardBg,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    padding: 18, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Colors.white, fontSize: 16, fontWeight: '900' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.darkBg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayText: {
    width: 36, textAlign: 'center',
    color: Colors.textSecondary, fontSize: 11, fontWeight: '700',
  },
  dayCell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  daySelected: { backgroundColor: Colors.primaryGreen },
  dayToday: { borderWidth: 1, borderColor: Colors.primaryGreen },
  dayText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  dayTextSelected: { color: '#000', fontWeight: '900' },
  dayTextDisabled: { color: Colors.border },
});
