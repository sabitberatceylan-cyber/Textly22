import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { koyuRenkler, acikRenkler } from '../theme';

const ANAHTAR = 'mesaj-app-tema';
const TemaBaglami = createContext(null);

export function TemaSaglayici({ children }) {
  const [tema, setTema] = useState('koyu'); // 'koyu' | 'acik'
  const [yuklendi, setYuklendi] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const kayitli = await AsyncStorage.getItem(ANAHTAR);
        if (kayitli === 'acik' || kayitli === 'koyu') setTema(kayitli);
      } catch {}
      setYuklendi(true);
    })();
  }, []);

  const temaDegistir = useCallback((yeniTema) => {
    setTema(yeniTema);
    AsyncStorage.setItem(ANAHTAR, yeniTema).catch(() => {});
  }, []);

  const toggleTema = useCallback(() => {
    setTema((mevcut) => {
      const yeni = mevcut === 'koyu' ? 'acik' : 'koyu';
      AsyncStorage.setItem(ANAHTAR, yeni).catch(() => {});
      return yeni;
    });
  }, []);

  if (!yuklendi) return null;

  const renkler = tema === 'acik' ? acikRenkler : koyuRenkler;
  const koyuMu = tema === 'koyu';

  return (
    <TemaBaglami.Provider value={{ tema, renkler, temaDegistir, koyuMu, toggleTema }}>
      {children}
    </TemaBaglami.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaBaglami);
  if (!ctx) throw new Error('useTema, TemaSaglayici icinde kullanilmali');
  return ctx;
}
