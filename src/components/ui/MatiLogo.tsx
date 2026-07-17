import { Colors } from '@/constants/colors';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

interface MatiLogoProps {
  size?: number;
  showText?: boolean;
}


export default function MatiLogo({
  size = 90,
  showText = true,
}: MatiLogoProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/logo-resize.png')}
        style={{
          width: size,
          height: size,
        }}
        resizeMode="contain"
      />

      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.matiText, { fontSize: size * 0.22 }]}>
            MATI <Text style={styles.storeText}>STORE</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
// export default function MatiLogo({ size = 80, showText = true }: MatiLogoProps) {
//   const scale = size / 100;

//   return (
//     <View style={styles.container}>
//       <Svg width={size} height={size} viewBox="0 0 100 100">
//         <Defs>
//           <LinearGradient id="greenGrad" x1="0" y1="0" x2="1" y2="1">
//             <Stop offset="0" stopColor="#7DFF2A" stopOpacity="1" />
//             <Stop offset="1" stopColor="#52D726" stopOpacity="1" />
//           </LinearGradient>
//           <LinearGradient id="darkGrad" x1="0" y1="0" x2="1" y2="1">
//             <Stop offset="0" stopColor="#333333" stopOpacity="1" />
//             <Stop offset="1" stopColor="#1a1a1a" stopOpacity="1" />
//           </LinearGradient>
//           <LinearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
//             <Stop offset="0" stopColor="#7DFF2A" stopOpacity="0.4" />
//             <Stop offset="1" stopColor="#7DFF2A" stopOpacity="0" />
//           </LinearGradient>
//         </Defs>
//         {/* Background glow */}
//         <Rect x="20" y="30" width="60" height="50" rx="8" fill="url(#glowGrad)" />
//         {/* Left M wing */}
//         <Path d="M5 80 L20 20 L35 55 L50 30 L35 80 Z" fill="url(#darkGrad)" stroke="#555" strokeWidth="0.5" />
//         {/* Right M wing */}
//         <Path d="M95 80 L80 20 L65 55 L50 30 L65 80 Z" fill="url(#darkGrad)" stroke="#555" strokeWidth="0.5" />
//         {/* Center green S */}
//         <Rect x="35" y="35" width="30" height="35" rx="6" fill="url(#greenGrad)" />
//         <Path d="M44 47 Q44 43 50 43 Q56 43 56 47 Q56 51 50 51 Q44 51 44 55 Q44 59 50 59 Q56 59 56 55" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
//         {/* Green accent lines */}
//         <Path d="M8 75 L18 35" stroke="#7DFF2A" strokeWidth="1" opacity="0.6" />
//         <Path d="M12 75 L22 38" stroke="#7DFF2A" strokeWidth="0.5" opacity="0.3" />
//         <Path d="M92 75 L82 35" stroke="#7DFF2A" strokeWidth="1" opacity="0.6" />
//         <Path d="M88 75 L78 38" stroke="#7DFF2A" strokeWidth="0.5" opacity="0.3" />
//       </Svg>
//       {showText && (
//         <View style={styles.textContainer}>
//           <Text style={[styles.matiText, { fontSize: size * 0.22 }]}>
//             MATI{' '}
//             <Text style={styles.storeText}>STORE</Text>
//           </Text>
//         </View>
//       )}
//     </View>
//   );
// }

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  textContainer: {
    marginTop: 8,
  },
  matiText: {
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  storeText: {
    color: Colors.primaryGreen,
  },
});
