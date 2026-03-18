import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { C, isTV } from '@/lib/design';
import { Channel } from '@/types';

interface Props {
  allChannels: Channel[];
  navigate?: boolean;
  onSwitch?: (channel: Channel) => void;
}

export default function ChannelNumberInput({ allChannels, navigate = true, onSwitch }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Expose addDigit for TV remote number keys (called from useTVRemote)
  const targetChannel = digits ? allChannels[parseInt(digits, 10) - 1] : null;

  if (!digits) return null;

  return (
    <View style={st.osd} pointerEvents="none">
      <Text style={st.osdNumber}>{digits}</Text>
      {targetChannel && (
        <Text style={st.osdName} numberOfLines={1}>{targetChannel.name}</Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
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
