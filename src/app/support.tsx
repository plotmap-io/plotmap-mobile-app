import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { StackScreen } from '@/components/stack-screen';
import { color, space, type } from '@/theme/tokens';

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: {
    title: 'About Plotmap',
    body: [
      'Plotmap maps the land and property market, starting in Kerala.',
      'Every listing carries its real position, its area in the units sellers actually quote — cents, acres, square feet — and its price history, so a buyer can judge an asking price against what sold nearby.',
      'Browsing is free and needs no account. An account lets you save listings, message sellers and list your own land.',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    body: [
      'We collect the account details you give us — your name, your email or phone, and anything you choose to put on your public profile.',
      'Your saved listings, searches and messages are yours. We do not sell them.',
      'Location is used to centre the map and sort results by distance. It is never attached to a listing you did not create.',
      'Write to us to export or delete your account and everything in it.',
    ],
  },
  terms: {
    title: 'Terms of use',
    body: [
      'You are responsible for the accuracy of anything you list, including price, area and ownership.',
      'Plotmap is a marketplace, not a party to any sale. We do not verify title, survey boundaries or guarantee any transaction.',
      'Boundaries drawn in the app are indicative. They are not a survey and have no legal standing.',
      'Listings that are fraudulent, duplicated or misrepresent a property will be removed.',
    ],
  },
  contact: {
    title: 'Contact & feedback',
    body: [
      'Something wrong with a listing, or an idea for the app? Tell us.',
      'For a specific listing, use Contact seller on that listing so the message reaches the right person.',
      'For anything else, including account problems, write to hello@plotmap.io.',
    ],
  },
};

export default function SupportScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const content = PAGES[page ?? 'about'] ?? PAGES.about;

  return (
    <StackScreen title={content.title}>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.pad}>
            {content.body.map((para, i) => (
              <Text key={i} style={styles.para}>
                {para}
              </Text>
            ))}
          </View>
        </Card>
      </ScrollView>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], paddingBottom: 30 },
  pad: { padding: space[4], gap: space[3] },
  para: { fontSize: type.body, lineHeight: 23, color: color.inkSoft },
});
