Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

# ==========================================
# ⚙️ CONFIGURATION VERCEL (API)
# ==========================================
# Ton Token
$VercelToken = "tBW7sIXz3plpsHmL2vJkLL7J" 

# Ton Nom de Projet (Mis à jour selon ton lien)
$VercelProjectName = "soul-studio-art" 

# ==========================================
# ⚡ CONFIGURATION DES RACCOURCIS
# ==========================================
$raccourcis = @(
    @{ Nom="Site Web (Soul Studio)"; Icon="🎨"; Path="https://soulstudioart.com" },
    @{ Nom="Shopify - Commandes"; Icon="🛍️"; Path="https://admin.shopify.com/orders" },
    @{ Nom="Printify - Production"; Icon="👕"; Path="https://printify.com/app/store" },
    @{ Nom="Gmail - Boîte Pro"; Icon="📧"; Path="https://mail.google.com" },
    @{ Nom="Gemini - Assistant"; Icon="🧠"; Path="https://gemini.google.com" },
    @{ Nom="Vercel - Déploiements"; Icon="🚀"; Path="https://vercel.com/dashboard" },
    @{ Nom="Vercel - Logs"; Icon="⚠️"; Path="https://vercel.com/dashboard" },
    @{ Nom="GitHub - Source"; Icon="🐙"; Path="https://github.com" },
    @{ Nom="Dossier LOCAL (PC)"; Icon="📂"; Path="C:\Users\SebBern\mon-quiz-react" }
)

# ==========================================
# 🎨 INTERFACE GRAPHIQUE
# ==========================================

$form = New-Object System.Windows.Forms.Form
$form.Text = "Soul Studio Command Center v3.0 🚀"
$form.Size = New-Object System.Drawing.Size(600,800)
$form.StartPosition = "CenterScreen"
$form.BackColor = "#1e1e1e"
$form.FormBorderStyle = "FixedDialog" 
$form.MaximizeBox = $false

# --- FONCTION : RÉCUPÉRER STATUT VERCEL ---
function Get-VercelStatus {
    $lblStatusResult.ForeColor = "Yellow"
    $lblStatusResult.Text = "Chargement..."
    $form.Refresh()

    try {
        # On cherche le projet exact
        $url = "https://api.vercel.com/v6/deployments?limit=1&search=$VercelProjectName"
        $headers = @{ "Authorization" = "Bearer $VercelToken" }
        
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        
        if ($response.deployments.Count -gt 0) {
            $lastDeploy = $response.deployments[0]
            $state = $lastDeploy.state
            
            # Mise à jour de l'affichage
            $lblStatusResult.Text = "$($state.ToUpper())"
            $lblCommitMsg.Text = "📝: $($lastDeploy.name)" 
            
            # Gestion des couleurs
            if ($state -eq "READY") {
                $lblStatusResult.ForeColor = "#00ff00" # Vert
                $statusIndicator.BackColor = "#00ff00"
            } elseif ($state -eq "BUILDING" -or $state -eq "QUEUED") {
                $lblStatusResult.ForeColor = "Orange"
                $statusIndicator.BackColor = "Orange"
            } elseif ($state -eq "ERROR" -or $state -eq "CANCELED") {
                $lblStatusResult.ForeColor = "Red"
                $statusIndicator.BackColor = "Red"
            } else {
                $lblStatusResult.ForeColor = "White"
                $statusIndicator.BackColor = "Gray"
            }
        } else {
            $lblStatusResult.Text = "Projet introuvable"
            $lblStatusResult.ForeColor = "Red"
            $lblCommitMsg.Text = "Vérifier le nom: $VercelProjectName"
        }
    } catch {
        $lblStatusResult.Text = "Erreur Connexion"
        $lblStatusResult.ForeColor = "Red"
    }
}

# --- HEADER & MONITEUR ---
$grpMonitor = New-Object System.Windows.Forms.GroupBox
$grpMonitor.Location = New-Object System.Drawing.Point(20, 10)
$grpMonitor.Size = New-Object System.Drawing.Size(540, 70)
$grpMonitor.Text = "État Vercel (Live)"
$grpMonitor.ForeColor = "#aaaaaa"
$form.Controls.Add($grpMonitor)

# Indicateur rond
$statusIndicator = New-Object System.Windows.Forms.Label
$statusIndicator.Location = New-Object System.Drawing.Point(15, 25)
$statusIndicator.Size = New-Object System.Drawing.Size(15, 15)
$statusIndicator.BackColor = "Gray"
$grpMonitor.Controls.Add($statusIndicator)

# Texte Statut
$lblStatusResult = New-Object System.Windows.Forms.Label
$lblStatusResult.Location = New-Object System.Drawing.Point(40, 23)
$lblStatusResult.Size = New-Object System.Drawing.Size(200, 20)
$lblStatusResult.Text = "Non connecté"
$lblStatusResult.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$lblStatusResult.ForeColor = "White"
$grpMonitor.Controls.Add($lblStatusResult)

# Texte Commit
$lblCommitMsg = New-Object System.Windows.Forms.Label
$lblCommitMsg.Location = New-Object System.Drawing.Point(40, 45)
$lblCommitMsg.Size = New-Object System.Drawing.Size(400, 20)
$lblCommitMsg.Text = "---"
$lblCommitMsg.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$lblCommitMsg.ForeColor = "#888888"
$grpMonitor.Controls.Add($lblCommitMsg)

# Bouton Refresh
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


# --- SECTION DÉPLOIEMENT ---
$lblDeploy = New-Object System.Windows.Forms.Label
$lblDeploy.Text = "📢 DÉPLOIEMENT RAPIDE"
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
$btnDeploy.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$btnDeploy.BackColor = "White"
$btnDeploy.ForeColor = "Black"
$btnDeploy.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnDeploy)

$outputBox = New-Object System.Windows.Forms.RichTextBox
$outputBox.Location = New-Object System.Drawing.Point(20,210)
$outputBox.Size = New-Object System.Drawing.Size(540,100)
$outputBox.BackColor = "Black"
$outputBox.ForeColor = "#00ff00"
$outputBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$outputBox.ReadOnly = $true
$form.Controls.Add($outputBox)

function Log-Write($text) {
    $outputBox.AppendText($text + "`r`n")
    $outputBox.ScrollToCaret()
    $form.Refresh()
}

$btnDeploy.Add_Click({
    $msg = $textBox.Text
    $btnDeploy.Enabled = $false
    $btnDeploy.Text = "⏳ En cours..."
    $outputBox.Clear()
    
    Set-Location "C:\Users\SebBern\mon-quiz-react"
    
    Log-Write "--- DÉPLOIEMENT ---"
    Start-Process git -ArgumentList "add ." -NoNewWindow -Wait
    Start-Process git -ArgumentList "commit -m `"$msg`"" -NoNewWindow -Wait
    
    Log-Write "Envoi vers Vercel..."
    
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
        Log-Write "✨ Push terminé. Vérification Vercel..."
        Start-Sleep -Seconds 2
        Get-VercelStatus
        [System.Windows.Forms.MessageBox]::Show("Push envoyé ! Le statut va passer en BUILDING.", "Soul Studio")
    } else {
        Log-Write "⚠️ Erreur."
    }

    $btnDeploy.Text = "🚀 ENVOYER SUR VERCEL"
    $btnDeploy.Enabled = $true
})

# ==========================================
# ⚡ GRID BOUTONS
# ==========================================

$separator = New-Object System.Windows.Forms.Label
$separator.BorderStyle = "Fixed3D"
$separator.Location = New-Object System.Drawing.Point(20, 325)
$separator.Size = New-Object System.Drawing.Size(540, 2)
$form.Controls.Add($separator)

$flowPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$flowPanel.Location = New-Object System.Drawing.Point(15, 340)
$flowPanel.Size = New-Object System.Drawing.Size(570, 400)
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