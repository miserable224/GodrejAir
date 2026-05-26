import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { tabBarTotalHeight } from '../utils/safeTabBarHeight';
import AppTabBar from './AppTabBar';

import LoginScreen from '../screens/auth/LoginScreen';
import ResidentHomeScreen from '../screens/resident/HomeScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import {
  AdminTenantScreen, AdminPromotionsScreen, AdminMyGateTicketsScreen,
  AmenitiesScreen, ServicesScreen, EventsScreen, HelpdeskScreen, WorkforceScreen,
} from '../screens/PlaceholderScreens';
import GuardDutyScreen from '../screens/security/GuardDutyScreen';
import HkDutyScreen from '../screens/housekeeping/HkDutyScreen';
import AdminDutyAttendanceScreen from '../screens/admin/AdminDutyAttendanceScreen';
import ChatbotScreen from '../screens/resident/ChatbotScreen';

const Stack = createStackNavigator();
const BottomTab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: DARK.teal,
    background: DARK.bg,
    card: DARK.card,
    text: DARK.text,
    border: DARK.inputBorder,
    notification: DARK.yellow,
  },
};

const sharedTabOptions = {
  headerShown: false,
  tabBar: (props) => <AppTabBar {...props} />,
  tabBarActiveTintColor: DARK.teal,
  tabBarInactiveTintColor: DARK.label,
  tabBarHideOnKeyboard: true,
  tabBarShowLabel: true,
  tabBarLabelVisibilityMode: 'labeled',
  tabBarLabelPosition: 'below-icon',
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
    lineHeight: 14,
  },
  tabBarIconStyle: { marginTop: 0 },
};

function useTabBarScreenOptions() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = tabBarTotalHeight(insets);

  return useMemo(
    () => ({
      ...sharedTabOptions,
      tabBarStyle: {
        height: tabBarHeight,
        backgroundColor: DARK.card,
        borderTopWidth: 1,
        borderTopColor: DARK.inputBorder,
        paddingTop: 4,
        overflow: 'visible',
      },
    }),
    [tabBarHeight],
  );
}

function ResidentTabs() {
  const tabOptions = useTabBarScreenOptions();

  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        ...tabOptions,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Amenities: focused ? 'star' : 'star-outline',
            Events: focused ? 'calendar' : 'calendar-outline',
            Services: focused ? 'construct' : 'construct-outline',
            Helpdesk: focused ? 'headset' : 'headset-outline',
          };
          return (
            <Ionicons name={icons[route.name] || 'ellipse-outline'} size={22} color={color} />
          );
        },
      })}
    >
      <BottomTab.Screen name="Home" component={ResidentHomeScreen} />
      <BottomTab.Screen name="Events" component={EventsScreen} />
      <BottomTab.Screen name="Amenities" component={AmenitiesScreen} />
      <BottomTab.Screen name="Services" component={ServicesScreen} />
      <BottomTab.Screen name="Helpdesk" component={HelpdeskScreen} />
    </BottomTab.Navigator>
  );
}

function AdminBottomTabs() {
  const { permissions } = useAuth();
  const homeOnly = permissions?.hasLimitedAdminNav;
  const tabOptions = useTabBarScreenOptions();

  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        ...tabOptions,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Home: focused ? 'grid' : 'grid-outline',
            Tenant: focused ? 'people' : 'people-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return (
            <Ionicons name={icons[route.name] || 'ellipse-outline'} size={22} color={color} />
          );
        },
      })}
    >
      <BottomTab.Screen name="Home" component={AdminDashboardScreen} options={{ title: 'Home' }} />
      {!homeOnly ? (
        <BottomTab.Screen name="Tenant" component={AdminTenantScreen} options={{ title: 'Tenant' }} />
      ) : null}
      <BottomTab.Screen name="Settings" component={AdminSettingsScreen} />
    </BottomTab.Navigator>
  );
}

function ResidentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ResidentTabs" component={ResidentTabs} />
      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminBottomTabs} />
      <Stack.Screen name="AdminPromotions" component={AdminPromotionsScreen} />
      <Stack.Screen name="AdminMyGateTickets" component={AdminMyGateTicketsScreen} />
      <Stack.Screen name="AdminWorkforce" component={WorkforceScreen} />
      <Stack.Screen name="GuardDuty" component={GuardDutyScreen} />
      <Stack.Screen name="HkDuty" component={HkDutyScreen} />
      <Stack.Screen name="AdminDutyAttendance" component={AdminDutyAttendanceScreen} />
    </Stack.Navigator>
  );
}

function BootSplash() {
  return (
    <View style={bootStyles.wrap}>
      <ActivityIndicator size="large" color={DARK.teal} />
      <Text style={bootStyles.text}>Loading…</Text>
    </View>
  );
}

const bootStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK.bg,
  },
  text: { marginTop: 12, color: DARK.muted, fontSize: 14 },
});

export default function RootNavigator() {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <BootSplash />;
  }

  const appKey = user ? `app-${user.role}-${user.id}` : 'auth';

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator key={appKey} screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'resident' || user.role === 'society' ? (
          <Stack.Screen name="ResidentRoot" component={ResidentStack} />
        ) : user.role === 'guard' || user.role === 'admin' || user.role === 'operations' ? (
          <Stack.Screen name="AdminRoot" component={AdminStack} />
        ) : (
          <Stack.Screen name="ResidentRoot" component={ResidentStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
