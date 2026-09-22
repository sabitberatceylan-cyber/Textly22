@echo off
chcp 65001 > nul
echo =======================================================
echo          Textly GitHub'a Tek Tikla Yukleme
echo =======================================================
echo.

:: Git kontrolu
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Git sistemde bulunamadi!
    pause
    exit /b 1
)

:: Git reposu baslatilmamissa baslat
if not exist ".git" (
    git init
    git branch -M main
)

:: Uzak repo adresi kontrolu
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo GitHub repo linkinizi girin (Ornek: https://github.com/sabitberatceylan-cyber/PROJE-ADINIZ):
    set /p REPO_URL="Repo URL: "
    if "%REPO_URL%"=="https://github.com/sabitberatceylan-cyber/Textly18.git" (
        echo Repo URL bos birakilamaz!
        pause
        exit /b 1
    )
    git remote add origin %REPO_URL%
)

echo.
echo Dosyalar hazirlaniyor...
git add .
git commit -m "Textly v5.0.3 - Snapchat bildirimleri ve exzehub guncellemesi" || true

echo.
echo GitHub'a yukleniyor (Push ediliyor)...
git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo  [BASARILI] Tum dosyalar GitHub'a yuklendi!
    echo  GitHub Actions otomatik olarak APK'yi derlemeye basladi.
    echo =======================================================
) else (
    echo.
    echo [HATA] Yukleme basarisiz oldu. Lutfen repo linkinizi veya internet baglantinizi kontrol edin.
)

pause
