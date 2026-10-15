import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageResizeMode,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  source: ImageSourcePropType;
  /** Dimensions/forme (width, height, borderRadius...) — appliqué au conteneur ET à l'image. */
  style: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
};

// Remplace le carré noir/vide pendant le chargement d'une image distante par
// un shimmer animé (dégradé translucide qui balaie l'image de gauche à
// droite en boucle), comme sur WhatsApp/Instagram.
export function ShimmerImage({ source, style, resizeMode = 'cover' }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loaded || containerWidth === 0) return;

    translateX.setValue(-containerWidth);
    loopRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: containerWidth,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    loopRef.current.start();

    return () => loopRef.current?.stop();
  }, [loaded, containerWidth]);

  return (
    <View
      style={[style, st.container]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w !== containerWidth) setContainerWidth(w);
      }}
    >
      <Image
        source={source}
        style={[StyleSheet.absoluteFill, style]}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />

      {!loaded && (
        <View style={[StyleSheet.absoluteFill, st.placeholder]} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { overflow: 'hidden' },
  placeholder: { backgroundColor: Colors.cardBg },
});