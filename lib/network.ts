import NetInfo from '@react-native-community/netinfo';

export async function isCellular(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === 'cellular';
}
