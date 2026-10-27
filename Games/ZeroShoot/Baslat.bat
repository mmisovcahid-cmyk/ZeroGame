@echo off
title ZeroShoot
cd /d "%~dp0"
echo.
echo  ==============================================
echo   ZEROSHOOT baslatiliyor...
echo   PC:        http://localhost:5173
echo   Telefon:   "Network:" satirindaki adres
echo   Kapatmak:  Bu pencerede Ctrl+C
echo  ==============================================
echo.
call npm run dev
pause
