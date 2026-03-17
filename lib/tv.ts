import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// TV remote event types from react-native-tvos
export type TVRemoteEvent =
  | 'up' | 'down' | 'left' | 'right'
  | 'select' | 'longSelect'
  | 'playPause' | 'rewind' | 'fastForward'
  | 'menu' | 'back';

export interface TVRemoteHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onLongSelect?: () => void;
  onPlayPause?: () => void;
  onRewind?: () => void;
  onFastForward?: () => void;
  onBack?: () => void;
}

/**
 * Hook that wraps useTVEventHandler from react-native-tvos
 * for D-pad/remote event handling on Android TV / Apple TV.
 * No-op on non-TV platforms.
 */
export function useTVRemote(handlers: TVRemoteHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!Platform.isTV) return;

    // react-native-tvos provides TVEventHandler or useTVEventHandler
    // We use the imperative API for broader compat
    let handler: any;
    try {
      const { TVEventHandler } = require('react-native');
      if (!TVEventHandler) return;
      handler = new TVEventHandler();
      handler.enable(undefined, (_: any, evt: any) => {
        const type = evt?.eventType as TVRemoteEvent;
        const h = handlersRef.current;
        switch (type) {
          case 'up': h.onUp?.(); break;
          case 'down': h.onDown?.(); break;
          case 'left': h.onLeft?.(); break;
          case 'right': h.onRight?.(); break;
          case 'select': h.onSelect?.(); break;
          case 'longSelect': h.onLongSelect?.(); break;
          case 'playPause': h.onPlayPause?.(); break;
          case 'rewind': h.onRewind?.(); break;
          case 'fastForward': h.onFastForward?.(); break;
          case 'menu':
          case 'back': h.onBack?.(); break;
        }
      });
    } catch {
      // TVEventHandler not available — not on tvOS build
      return;
    }

    return () => {
      handler?.disable?.();
    };
  }, []);
}

/**
 * Check if running on a TV platform
 */
export const isTV = Platform.isTV;
