import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor="#E50914"
      {...(Platform.OS === 'ios' ? { translucent: false, barTintColor: '#000000' } : {})}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="series">
        <Icon sf={{ default: 'play.tv', selected: 'play.tv.fill' }} />
        <Label>TV Shows</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movies">
        <Icon sf={{ default: 'film', selected: 'film.fill' }} />
        <Label>Movies</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf="magnifyingglass" />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mylist">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>My Netflix</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
