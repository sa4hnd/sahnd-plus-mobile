import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor="#E50914"
      {...(Platform.OS === 'ios' ? { translucent: true } : {})}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movies">
        <Icon sf={{ default: 'film', selected: 'film.fill' }} />
        <Label>Movies</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="series">
        <Icon sf={{ default: 'play.tv', selected: 'play.tv.fill' }} />
        <Label>Series</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf="magnifyingglass" />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mylist">
        <Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} />
        <Label>My List</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
