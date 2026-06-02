# tunnel.ps1 - serveo 隧道守护脚本
# 自动连接、提取公网链接、存到桌面、断线重连

$DesktopPath = [Environment]::GetFolderPath("Desktop")
$UrlFile = Join-Path $DesktopPath "哞哞喵喵-访问链接.txt"

Write-Host "🌐 正在连接公网隧道..." -ForegroundColor Magenta

while ($true) {
    try {
        # 启动 serveo SSH 隧道，捕获输出
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "ssh"
        $psi.Arguments = "-o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:3000 serveo.net"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true

        $process = [System.Diagnostics.Process]::Start($psi)

        # 读取输出，查找 URL
        $urlFound = $false
        $timeout = 30  # 最多等30秒
        $startTime = Get-Date

        while (!$process.HasExited -and !$urlFound) {
            $line = $process.StandardError.ReadLine()
            if ($line) {
                # serveo 把 URL 输出在 stderr
                if ($line -match "Forwarding HTTP traffic from (https://[^\s]+)") {
                    $url = $Matches[1]
                    $urlFound = $true

                    # 存到桌面
                    $content = @"
💕 哞哞喵喵记账系统
━━━━━━━━━━━━━━━━━━
📱 访问链接：
$url

📅 生成时间：$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
⚠️ 电脑重启后此链接会更新，请重新打开此文件查看

🔑 账号：哞哞（女生）/ 喵喵（男生）
🔑 密码：1314520
━━━━━━━━━━━━━━━━━━
"@
                    $content | Out-File -FilePath $UrlFile -Encoding UTF8

                    Write-Host ""
                    Write-Host "╔══════════════════════════════════╗" -ForegroundColor Green
                    Write-Host "║  ✅ 公网隧道已连接！            ║" -ForegroundColor Green
                    Write-Host "║                                ║" -ForegroundColor Green
                    Write-Host "║  📱 $url" -ForegroundColor Cyan
                    Write-Host "║                                ║" -ForegroundColor Green
                    Write-Host "║  链接已保存到桌面，发给喵喵即可 ║" -ForegroundColor Green
                    Write-Host "╚══════════════════════════════════╝" -ForegroundColor Green
                    Write-Host ""
                }
            }

            if (((Get-Date) - $startTime).TotalSeconds -gt $timeout) {
                break
            }
            Start-Sleep -Milliseconds 200
        }

        if (!$urlFound) {
            Write-Host "⚠️ 隧道连接超时，10秒后重试..." -ForegroundColor Yellow
        }

        # 等待进程结束（隧道断开）
        $process.WaitForExit()
        Write-Host "⚠️ 隧道断开，5秒后重连..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5

    } catch {
        Write-Host "⚠️ 发生错误，10秒后重试... ($($_.Exception.Message))" -ForegroundColor Red
        Start-Sleep -Seconds 10
    }
}
