@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 💕 哞哞喵喵记账系统 启动中...

:: 杀旧进程
taskkill //F //IM node.exe 2>nul
taskkill //F //IM ssh.exe 2>nul
timeout /t 2 /nobreak >nul

:: 启动 Node 服务器
start /B "couple-server" node server.js
echo ✅ 服务器已启动
timeout /t 3 /nobreak >nul

:: 启动 serveo 隧道，输出到临时文件
echo 🌐 连接公网隧道...
start /B "couple-tunnel" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3000 serveo.net > "%TEMP%\serveo.log" 2>&1

:: 等隧道建立
timeout /t 8 /nobreak >nul

:: 提取链接并存到桌面
for /f "tokens=2 delims= " %%u in ('findstr /r "https://.*serveo" "%TEMP%\serveo.log" 2^>nul') do (
    echo 💕 哞哞喵喵记账系统> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo ━━━━━━━━━━━━━━━━━━>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo 📱 访问链接：>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo %%u>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo.>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo 🔑 账号：哞哞（女生）/ 喵喵（男生）>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo 🔑 密码：1314520>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo ━━━━━━━━━━━━━━━━━━>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    echo %%u
)

echo ✅ 链接已保存到桌面！发给喵喵即可 💕

:: 保持脚本运行，监控隧道
:monitor
timeout /t 30 /nobreak >nul
tasklist /FI "IMAGENAME eq ssh.exe" 2>nul | find /i "ssh.exe" >nul
if %errorlevel% neq 0 (
    echo ⚠️ 隧道断开，重新连接...
    start /B "couple-tunnel" ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3000 serveo.net > "%TEMP%\serveo.log" 2>&1
    timeout /t 8 /nobreak >nul
    for /f "tokens=2 delims= " %%u in ('findstr /r "https://.*serveo" "%TEMP%\serveo.log" 2^>nul') do (
        echo 💕 哞哞喵喵记账系统> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo ━━━━━━━━━━━━━━━━━━>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo 📱 访问链接：>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo %%u>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo.>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo 🔑 账号：哞哞（女生）/ 喵喵（男生）>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo 🔑 密码：1314520>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
        echo ━━━━━━━━━━━━━━━━━━>> "%USERPROFILE%\Desktop\哞哞喵喵-访问链接.txt"
    )
)
goto monitor
