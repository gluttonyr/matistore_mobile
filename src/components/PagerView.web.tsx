import { Children, forwardRef, useImperativeHandle, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  initialPage?: number;
  overdrag?: boolean;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children?: ReactNode;
};

// Web stand-in for react-native-pager-view: same setPage / onPageSelected contract, no swipe.
// Pages stay mounted (only hidden) so each tab keeps its state, like the native pager.
const PagerView = forwardRef<{ setPage: (index: number) => void }, Props>(function PagerView(
  { style, initialPage = 0, onPageSelected, children },
  ref,
) {
  const [page, setPage] = useState(initialPage);
  useImperativeHandle(
    ref,
    () => ({
      setPage: (index: number) => {
        setPage(index);
        onPageSelected?.({ nativeEvent: { position: index } });
      },
    }),
    [onPageSelected],
  );
  return (
    <View style={style}>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={[StyleSheet.absoluteFill, i !== page && styles.hidden]}>
          {child}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({ hidden: { display: 'none' } });

export default PagerView;
