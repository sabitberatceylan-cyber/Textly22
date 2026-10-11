@echo off
chcp 65001 > nul
title Textly22 GitHub Yukleme
color 0A
echo ============================================================
echo   TEXTLY22 GITHUB YUKLEME ISLEMI
echo ============================================================
echo.
echo Proje klasorune gidiliyor...
cd /d "C:\Users\LENOVO\Desktop\Textly"

echo.
echo Guncel durum kontrol ediliyor...
git status -s

echo.
echo GitHub'a push ediliyor...
echo [NOT] Eger ekrana "Sign in with your browser" veya giris penceresi gelirse onaylayin.
echo.

git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   [BASARILI] Kodlar GitHub Textly22 reposuna yuklendi!
    echo   GitHub Actions otomatik olarak APK derlemesini baslatti.
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   [UYARI] Push sirasinda bir hata olustu veya giris bekleniyor.
    echo ============================================================
)

echo.
echo Pencereyi kapatmak icin bir tusa basin...
pause > nul
