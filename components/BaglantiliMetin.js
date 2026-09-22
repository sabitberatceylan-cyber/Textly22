import React from 'react';
import { Text, Linking } from 'react-native';

const PARCALAMA_REGEX = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+)/g;

export default function BaglantiliMetin({ metin, style, baglantiStili, mentionStili }) {
  if (!metin) return null;
  const parcalar = metin.split(PARCALAMA_REGEX);

  return (
    <Text style={style}>
      {parcalar.map((parca, i) => {
        if (!parca) return null;
        if (/^https?:\/\//i.test(parca)) {
          return (
            <Text
              key={i}
              style={[style, baglantiStili || { textDecorationLine: 'underline', fontWeight: '600' }]}
              onPress={() => Linking.openURL(parca).catch(() => {})}
            >
              {parca}
            </Text>
          );
        }
        if (/^@[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+/i.test(parca)) {
          return (
            <Text
              key={i}
              style={[
                style,
                mentionStili || { fontWeight: '700', color: '#007aff' },
              ]}
            >
              {parca}
            </Text>
          );
        }
        return <Text key={i}>{parca}</Text>;
      })}
    </Text>
  );
}
