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
if %errorlevel% equ 0 (
    for /f "tokens=*" %%a in ('git remote get-url origin') do set CURRENT_REPO=%%a
    echo Hedef Repo: %CURRENT_REPO%
    echo (Farkli bir repoya yuklemek isterseniz yeni linki yazin, ayni repoya yuklemek icin direkt ENTER'a basin)
    set /p REPO_URL="Yeni Repo Linki (Opsiyonel): "
    if not "%REPO_URL%"=="" (
        git remote set-url origin %REPO_URL%
    )
) else (
    echo GitHub repo linkinizi girin (Ornek: https://github.com/sabitberatceylan-cyber/Textly18.git):
    set /p REPO_URL="Repo URL: "
    if "%REPO_URL%"=="" (
        echo Repo URL bos birakilamaz!
        pause
        exit /b 1
    )
    git remote add origin %REPO_URL%
)

echo.
echo Dosyalar hazirlaniyor...
git add .
git commit -m "Textly v5.0.5 guncellemesi" || true

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
    echo [HATA] Yukleme basarisiz oldu. Lutfen internet baglantinizi ve GitHub girisinizi kontrol edin.
)

pause
