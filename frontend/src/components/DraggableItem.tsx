import React from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { colors } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  initialX: number;
  initialY: number;
  selected: boolean;
  onSelect: () => void;
};

export function DraggableItem({ children, initialX, initialY, selected, onSelect }: Props) {
  const tx = useSharedValue(initialX);
  const ty = useSharedValue(initialY);
  const scale = useSharedValue(1);
  const rot = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startS = useSharedValue(1);
  const startR = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      runOnJS(onSelect)();
    })
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startS.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.4, Math.min(4, startS.value * e.scale));
    });

  const rotation = Gesture.Rotation()
    .onStart(() => {
      startR.value = rot.value;
    })
    .onUpdate((e) => {
      rot.value = startR.value + e.rotation;
    });

  const composed = Gesture.Simultaneous(pan, pinch, rotation);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotateZ: `${rot.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.item, selected && styles.selected, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: "absolute",
    top: 0,
    left: 0,
    padding: 6,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: 8,
  },
});
