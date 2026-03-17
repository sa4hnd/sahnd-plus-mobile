import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { C, isTV } from '@/lib/design';
import { Channel } from '@/types';

interface Props {
  allChannels: Channel[];
  /** If true, navigates to channel. If false, calls onSwitch */
  navigate?: boolean;
  onSwitch?: (channel: Channel) => void;
}

export default function ChannelNumberInput({ allChannels, navigate = true, onSwitch }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (!digits) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const num = parseInt(digits, 10);
      const idx = num - 1;
      if (idx >= 0 && idx < allChannels.length) {
        if (navigate) {
          router.push(`/channel/${allChannels[idx].id}` as any);
        } else {
          onSwitch?.(allChannels[idx]);
        }
      }
      setDigits('');
    }, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [digits, allChannels, router, navigate, onSwitch]);

  const addDigit = useCallback((d: string) => {
    setDigits(prev => prev + d);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      inputRef.current?.focus?.();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const targetChannel = digits
    ? allChannels[parseInt(digits, 10) - 1]
    : null;

  return (
    <>
      <TextInput
        ref={inputRef}
        autoFocus
        style={st.hiddenInput}
        keyboardType="number-pad"
        caretHidden
        onChangeText={(text) => {
          const last = text.slice(-1);
          if (/^[0-9]$/.test(last)) addDigit(last);
        }}
        value=""
      />
      {digits ? (
        <View style={st.osd}>
          <Text style={st.osdNumber}>{digits}</Text>
          {targetChannel && (
            <Text style={st.osdName} numberOfLines={1}>{targetChannel.name}</Text>
          )}
        </View>
      ) : null}
    </>
  );
}

const st = StyleSheet.create({
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
  osd: {
    position: 'absolute',
    top: isTV ? 40 : 80,
    right: isTV ? 40 : 16,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: isTV ? 120 : 80,
  },
  osdNumber: {
    color: '#fff',
    fontSize: isTV ? 48 : 32,
    fontWeight: '800',
  },
  osdName: {
    color: C.text2,
    fontSize: isTV ? 16 : 12,
    fontWeight: '600',
    marginTop: 4,
    maxWidth: 200,
  },
});
