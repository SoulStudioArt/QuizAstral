Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

# ==========================================
# ⚙️ CONFIGURATION VERCEL
# ==========================================
$VercelToken = "tBW7sIXz3plpsHmL2vJkLL7J" 
$VercelProjectName = "quiz-astral" 
$VercelTeamName = "soul-studio-art" # Nécessaire pour le lien direct

# ==========================================
# ⚡ RACCOURCIS
# ==========================================
$raccourcis = @(
    @{ Nom="Site Web"; Icon="🎨"; Path="https://soulstudioart.com" },
    @{ Nom="Shopify"; Icon="🛍️"; Path="https://admin.shopify.com/orders" },
    @{ Nom="Printify"; Icon="👕"; Path="https://printify.com/app/store" },
    @{ Nom="Gmail"; Icon="📧"; Path="https://mail.google.com" },
    @{ Nom="Gemini"; Icon="🧠"; Path="https://gemini.google.com" },
    @{ Nom="Vercel"; Icon="▲"; Path="https://vercel.com/dashboard" },
    @{ Nom="GitHub"; Icon="🐙"; Path="https://github.com" },
    @{ Nom="Dossier PC"; Icon="📂"; Path="C:\Users\SebBern\mon-quiz-react" }
)

# ==========================================
# 🎨 INTERFACE
# ==========================================

$form = New-Object System.Windows.Forms.Form
$form.Text = "Soul Studio Command Center v6.0 (Live Link) 🚀"
$form.Size = New-Object System.Drawing.Size(600,850)
$form.StartPosition = "CenterScreen"
$form.BackColor = "#1e1e1e"
$form.FormBorderStyle = "FixedDialog" 
$form.MaximizeBox = $false

# --- FONCTION : STATUS ---
function Get-VercelStatus {
    $lblStatusResult.ForeColor = "Yellow"
    $lblStatusResult.Text = "..."
    $form.Refresh()

    try {
        $url = "https://api.vercel.com/v6/deployments?limit=1&search=$VercelProjectName"
        $headers = @{ "Authorization" = "Bearer $VercelToken" }
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        if ($response.deployments.Count -gt 0) {
            $lastDeploy = $response.deployments[0]
            $state = $lastDeploy.state
            $lblStatusResult.Text = "$($state.ToUpper())"
            $lblCommitMsg.Text = "📝: $($lastDeploy.name)" 
            
            # Sauvegarde ID pour les logs de build
            $form.Tag = $lastDeploy.uid 

            if ($state -eq "READY") {
                $lblStatusResult.ForeColor = "#00ff00"
                $statusIndicator.BackColor = "#00ff00"
            } elseif ($state -eq "BUILDING" -or $state -eq "QUEUED") {
                $lblStatusResult.ForeColor = "Orange"
                $statusIndicator.BackColor = "Orange"
            } elseif ($state -eq "ERROR") {
                $lblStatusResult.ForeColor = "Red"
                $statusIndicator.BackColor = "Red"
            } else {
                $lblStatusResult.ForeColor = "White"
                $statusIndicator.BackColor = "Gray"
            }
        } else {
             $lblStatusResult.Text = "Introuvable"
             $lblStatusResult.ForeColor = "Red"
             $lblCommitMsg.Text = "Vérifie le nom: $VercelProjectName"
        }
    } catch {
        $lblStatusResult.Text = "Erreur API"
    }
}

# --- FONCTION : RÉCUPÉRER LOGS BUILD (CONSTRUCTION) ---
function Get-VercelBuildLogs {
    if (-not $form.Tag) {
        Log-Write "⚠️ Impossible : Aucun déploiement détecté."
        return
    }

    $deployId = $form.Tag
    Log-Write "----------------------------------------"
    Log-Write "🏗️ LOGS DE CONSTRUCTION (BUILD)..."
    Log-Write "(Pour voir les Prompts/API, clique sur 'LOGS LIVE')"
    Log-Write "----------------------------------------"
    
    try {
        $url = "https://api.vercel.com/v2/deployments/$deployId/events?direction=backward"
        $headers = @{ "Authorization" = "Bearer $VercelToken" }
        $logs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        if ($logs.Count -eq 0) {
            Log-Write "Aucun log de construction récent."
        } else {
            $logs | Sort-Object date | ForEach-Object {
                $msg = $_.text
                if (-not $msg) { $msg = $_.info.message }
                
                if ($msg) {
                    $time = [DateTime]::UnixEpoch.AddMilliseconds($_.date).ToLocalTime().ToString('HH:mm:ss')
                    $prefix = "[$time]"
                    
                    if ($_.type -eq "stderr" -or $_.info.type -eq "error") {
                        $outputBox.SelectionColor = "Red"
                    } elseif ($msg -match "warn") {
                        $outputBox.SelectionColor = "Orange"
                    } else {
                        $outputBox.SelectionColor = "#CCCCCC"
                    }
                    $outputBox.AppendText("$prefix $msg`r`n")
                }
            }
        }
        $outputBox.ScrollToCaret()
        Log-Write "----------------------------------------"
    } catch {
        Log-Write "❌ Erreur accès logs : $_"
    }
}

# --- HEADER STATUS ---
$grpMonitor = New-Object System.Windows.Forms.GroupBox
$grpMonitor.Location = New-Object System.Drawing.Point(20, 10)
$grpMonitor.Size = New-Object System.Drawing.Size(540, 70)
$grpMonitor.Text = "État Vercel"
$grpMonitor.ForeColor = "#aaaaaa"
$form.Controls.Add($grpMonitor)

$statusIndicator = New-Object System.Windows.Forms.Label
$statusIndicator.Location = New-Object System.Drawing.Point(15, 25)
$statusIndicator.Size = New-Object System.Drawing.Size(15, 15)
$statusIndicator.BackColor = "Gray"
$grpMonitor.Controls.Add($statusIndicator)

$lblStatusResult = New-Object System.Windows.Forms.Label
$lblStatusResult.Location = New-Object System.Drawing.Point(40, 23)
$lblStatusResult.Size = New-Object System.Drawing.Size(150, 20)
$lblStatusResult.Text = "..."
$lblStatusResult.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$lblStatusResult.ForeColor = "White"
$grpMonitor.Controls.Add($lblStatusResult)

$lblCommitMsg = New-Object System.Windows.Forms.Label
$lblCommitMsg.Location = New-Object System.Drawing.Point(40, 45)
$lblCommitMsg.Size = New-Object System.Drawing.Size(350, 20)
$lblCommitMsg.Text = "---"
$lblCommitMsg.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblCommitMsg.ForeColor = "#888888"
$grpMonitor.Controls.Add($lblCommitMsg)

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Location = New-Object System.Drawing.Point(460, 20)
$btnRefresh.Size = New-Object System.Drawing.Size(70, 35)
$btnRefresh.Text = "↻"
$btnRefresh.Font = New-Object System.Drawing.Font("Segoe UI", 14)
$btnRefresh.BackColor = "#333333"
$btnRefresh.ForeColor = "White"
$btnRefresh.FlatStyle = "Flat"
$btnRefresh.Add_Click({ Get-VercelStatus })
$grpMonitor.Controls.Add($btnRefresh)


# --- DEPLOY ZONE ---
$lblDeploy = New-Object System.Windows.Forms.Label
$lblDeploy.Text = "📢 DÉPLOIEMENT & MONITORING"
$lblDeploy.Location = New-Object System.Drawing.Point(20,95)
$lblDeploy.Size = New-Object System.Drawing.Size(540,25)
$lblDeploy.ForeColor = "#aaaaaa"
$lblDeploy.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblDeploy)

$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(20,120)
$textBox.Size = New-Object System.Drawing.Size(540,30)
$textBox.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$textBox.Text = "Mise à jour via Dashboard"
$form.Controls.Add($textBox)

$btnDeploy = New-Object System.Windows.Forms.Button
$btnDeploy.Location = New-Object System.Drawing.Point(20,160)
$btnDeploy.Size = New-Object System.Drawing.Size(540,40)
$btnDeploy.Text = "🚀 ENVOYER SUR VERCEL"
$btnDeploy.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$btnDeploy.BackColor = "White"
$btnDeploy.ForeColor = "Black"
$btnDeploy.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnDeploy)

# --- BOUTONS LOGS ---
# Bouton 1 : Logs de Construction (Interne)
$btnBuildLogs = New-Object System.Windows.Forms.Button
$btnBuildLogs.Location = New-Object System.Drawing.Point(20,210)
$btnBuildLogs.Size = New-Object System.Drawing.Size(260,35)
$btnBuildLogs.Text = "🏗️ LOGS BUILD (Console)"
$btnBuildLogs.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnBuildLogs.BackColor = "#222"
$btnBuildLogs.ForeColor = "Gray"
$btnBuildLogs.FlatStyle = "Flat"
$btnBuildLogs.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnBuildLogs.Add_Click({ 
    $outputBox.Clear()
    Get-VercelBuildLogs 
})
$form.Controls.Add($btnBuildLogs)

# Bouton 2 : Logs LIVE (Externe Web)
$btnLiveLogs = New-Object System.Windows.Forms.Button
$btnLiveLogs.Location = New-Object System.Drawing.Point(300,210)
$btnLiveLogs.Size = New-Object System.Drawing.Size(260,35)
$btnLiveLogs.Text = "📡 LOGS LIVE (Web)"
$btnLiveLogs.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnLiveLogs.BackColor = "#222"
$btnLiveLogs.ForeColor = "Cyan"
$btnLiveLogs.FlatStyle = "Flat"
$btnLiveLogs.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnLiveLogs.Add_Click({ 
    # Ouvre le lien exact des logs runtime
    Start-Process "https://vercel.com/$VercelTeamName/$VercelProjectName/logs"
})
$form.Controls.Add($btnLiveLogs)


# Console Logs
$outputBox = New-Object System.Windows.Forms.RichTextBox
$outputBox.Location = New-Object System.Drawing.Point(20,255)
$outputBox.Size = New-Object System.Drawing.Size(540,200)
$outputBox.BackColor = "Black"
$outputBox.ForeColor = "#00ff00"
$outputBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$outputBox.ReadOnly = $true
$form.Controls.Add($outputBox)

function Log-Write($text) {
    $outputBox.SelectionColor = "#00ff00" 
    $outputBox.AppendText($text + "`r`n")
    $outputBox.ScrollToCaret()
    $form.Refresh()
}

$btnDeploy.Add_Click({
    $msg = $textBox.Text
    $btnDeploy.Enabled = $false
    $btnDeploy.Text = "⏳..."
    $outputBox.Clear()
    
    Set-Location "C:\Users\SebBern\mon-quiz-react"
    
    Log-Write "--- DÉBUT GIT LOCAL ---"
    Start-Process git -ArgumentList "add ." -NoNewWindow -Wait
    Start-Process git -ArgumentList "commit -m `"$msg`"" -NoNewWindow -Wait
    
    Log-Write "Envoi vers le Cloud..."
    
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = "git"
    $pinfo.Arguments = "push"
    $pinfo.RedirectStandardError = $true
    $pinfo.RedirectStandardOutput = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    $p.Start() | Out-Null
    $p.WaitForExit()
    
    $stdOut = $p.StandardOutput.ReadToEnd()
    $stdErr = $p.StandardError.ReadToEnd()
    
    Log-Write $stdOut
    Log-Write $stdErr
    
    if ($p.ExitCode -eq 0) {
        Log-Write "✨ Push OK. Attente Vercel..."
        Start-Sleep -Seconds 2
        Get-VercelStatus
        Log-Write "⚠️ Pour voir les PROMPTS et API :"
        Log-Write "👉 Clique sur '📡 LOGS LIVE (Web)'"
    } else {
        Log-Write "⚠️ Erreur Git."
    }

    $btnDeploy.Text = "🚀 ENVOYER SUR VERCEL"
    $btnDeploy.Enabled = $true
})

# ==========================================
# ⚡ GRID BOUTONS
# ==========================================
$separator = New-Object System.Windows.Forms.Label
$separator.BorderStyle = "Fixed3D"
$separator.Location = New-Object System.Drawing.Point(20, 480)
$separator.Size = New-Object System.Drawing.Size(540, 2)
$form.Controls.Add($separator)

$flowPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$flowPanel.Location = New-Object System.Drawing.Point(15, 495)
$flowPanel.Size = New-Object System.Drawing.Size(570, 300)
$flowPanel.FlowDirection = "LeftToRight"
$flowPanel.AutoScroll = $true
$flowPanel.WrapContents = $true
$form.Controls.Add($flowPanel)

foreach ($item in $raccourcis) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = "$($item.Icon)`n$($item.Nom)"
    $btn.Size = New-Object System.Drawing.Size(130, 80)
    $btn.Font = New-Object System.Drawing.Font("Segoe UI Emoji", 9) 
    $btn.BackColor = "#333333"
    $btn.ForeColor = "White"
    $btn.FlatStyle = "Flat"
    $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
    $btn.Margin = New-Object System.Windows.Forms.Padding(5)
    $btn.Tag = $item.Path
    $btn.Add_MouseEnter({ $this.BackColor = "#555555" })
    $btn.Add_MouseLeave({ $this.BackColor = "#333333" })
    $btn.Add_Click({
        try { Start-Process $this.Tag } 
        catch { [System.Windows.Forms.MessageBox]::Show("Erreur : $($this.Tag)", "Oups") }
    })
    $flowPanel.Controls.Add($btn)
}

$form.Add_Shown({ Get-VercelStatus })
[void] $form.ShowDialog()