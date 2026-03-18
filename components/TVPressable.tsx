import { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { isTV, TVFocus } from '@/lib/design';

interface TVPressableProps extends PressableProps {
  /** Custom style when focused on TV */
  focusStyle?: StyleProp<ViewStyle>;
  /** Base style (or style function) */
  style?: PressableProps['style'];
}

/**
 * Pressable wrapper that automatically handles D-pad focus states on Android TV.
 * Shows red border + scale when focused. On mobile, behaves as normal Pressable.
 */
export default function TVPressable({ focusStyle, style, children, ...rest }: TVPressableProps) {
  const [focused, setFocused] = useState(false);

  const defaultFocusStyle: ViewStyle = {
    borderWidth: TVFocus.borderWidth,
    borderColor: TVFocus.borderColor,
    borderRadius: TVFocus.borderRadius,
    transform: [{ scale: TVFocus.scale }],
  };

  return (
    <Pressable
      onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
      style={(state) => {
        const baseStyle = typeof style === 'function' ? style(state) : style;
        return [
          baseStyle,
          isTV && focused && (focusStyle || defaultFocusStyle),
        ];
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
