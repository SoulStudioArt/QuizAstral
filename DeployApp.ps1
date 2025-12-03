Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ==========================================
# ⚡ CONFIGURATION DES RACCOURCIS
# ==========================================
$raccourcis = @(
    @{ Nom="Site Web (Soul Studio)"; Icon="🎨"; Path="https://soulstudioart.com" },
    @{ Nom="Shopify - Commandes"; Icon="🛍️"; Path="https://admin.shopify.com/orders" },
    @{ Nom="Shopify - Code"; Icon="💻"; Path="https://admin.shopify.com/themes" },
    @{ Nom="Printify - Production"; Icon="👕"; Path="https://printify.com/app/store" },
    @{ Nom="Gmail - Boîte Pro"; Icon="📧"; Path="https://mail.google.com" },
    @{ Nom="Gemini - Assistant"; Icon="🧠"; Path="https://gemini.google.com" },
    @{ Nom="Google Cloud - Quotas"; Icon="☁️"; Path="https://console.cloud.google.com/iam-admin/quotas" },
    @{ Nom="Vercel - Déploiements"; Icon="🚀"; Path="https://vercel.com/dashboard" },
    @{ Nom="Vercel - Logs"; Icon="⚠️"; Path="https://vercel.com/dashboard" },
    @{ Nom="Vercel - Images"; Icon="🖼️"; Path="https://vercel.com/dashboard/storage" },
    @{ Nom="Labo - Test Psyché"; Icon="🧪"; Path="https://github.com" },
    @{ Nom="GitHub - Source"; Icon="🐙"; Path="https://github.com" },
    @{ Nom="Dossier LOCAL (PC)"; Icon="📂"; Path="C:\Users\SebBern\mon-quiz-react" }
)

# ==========================================
# 🎨 INTERFACE GRAPHIQUE
# ==========================================

# Création de la fenêtre
$form = New-Object System.Windows.Forms.Form
$form.Text = "Soul Studio Command Center 🚀"
$form.Size = New-Object System.Drawing.Size(600,750)
$form.StartPosition = "CenterScreen"
$form.BackColor = "#1e1e1e"
$form.FormBorderStyle = "FixedDialog" 
$form.MaximizeBox = $false

# Titre Déploiement
$lblDeploy = New-Object System.Windows.Forms.Label
$lblDeploy.Text = "📢 DÉPLOIEMENT RAPIDE"
$lblDeploy.Location = New-Object System.Drawing.Point(20,15)
$lblDeploy.Size = New-Object System.Drawing.Size(540,25)
$lblDeploy.ForeColor = "#aaaaaa"
$lblDeploy.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblDeploy)

# Boîte de texte
$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(20,45)
$textBox.Size = New-Object System.Drawing.Size(540,30)
$textBox.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$textBox.Text = "Mise à jour via Dashboard"
$form.Controls.Add($textBox)

# Bouton DÉPLOYER
$btnDeploy = New-Object System.Windows.Forms.Button
$btnDeploy.Location = New-Object System.Drawing.Point(20,85)
$btnDeploy.Size = New-Object System.Drawing.Size(540,40)
$btnDeploy.Text = "🚀 ENVOYER SUR VERCEL"
$btnDeploy.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$btnDeploy.BackColor = "White"
$btnDeploy.ForeColor = "Black"
$btnDeploy.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnDeploy)

# Zone de logs
$outputBox = New-Object System.Windows.Forms.RichTextBox
$outputBox.Location = New-Object System.Drawing.Point(20,140)
$outputBox.Size = New-Object System.Drawing.Size(540,120)
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

# --- LOGIQUE DÉPLOIEMENT ---
$btnDeploy.Add_Click({
    $msg = $textBox.Text
    $btnDeploy.Enabled = $false
    $btnDeploy.Text = "⏳ En cours..."
    $outputBox.Clear()
    
    # Force le dossier de travail
    Set-Location "C:\Users\SebBern\mon-quiz-react"
    
    Log-Write "--- DÉBUT DU DÉPLOIEMENT ---"
    Log-Write "📂 Dossier : C:\Users\SebBern\mon-quiz-react"
    
    Log-Write "1. Git Add..."
    Start-Process git -ArgumentList "add ." -NoNewWindow -Wait
    
    Log-Write "2. Git Commit..."
    Start-Process git -ArgumentList "commit -m `"$msg`"" -NoNewWindow -Wait
    
    Log-Write "3. Git Push..."
    
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
        Log-Write "✨ SUCCÈS ! Site à jour."
        [System.Windows.Forms.MessageBox]::Show("Déploiement réussi !", "Soul Studio")
    } else {
        Log-Write "⚠️ Vérifiez les logs ci-dessus."
    }

    $btnDeploy.Text = "🚀 ENVOYER SUR VERCEL"
    $btnDeploy.Enabled = $true
})

# ==========================================
# ⚡ SECTION ACCÈS RAPIDE (CORRIGÉE)
# ==========================================

$separator = New-Object System.Windows.Forms.Label
$separator.BorderStyle = "Fixed3D"
$separator.Location = New-Object System.Drawing.Point(20, 280)
$separator.Size = New-Object System.Drawing.Size(540, 2)
$form.Controls.Add($separator)

$lblShortcuts = New-Object System.Windows.Forms.Label
$lblShortcuts.Text = "⚡ NAVIGATION & OUTILS"
$lblShortcuts.Location = New-Object System.Drawing.Point(20,295)
$lblShortcuts.Size = New-Object System.Drawing.Size(540,25)
$lblShortcuts.ForeColor = "#aaaaaa"
$lblShortcuts.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblShortcuts)

$flowPanel = New-Object System.Windows.Forms.FlowLayoutPanel
$flowPanel.Location = New-Object System.Drawing.Point(15, 325)
$flowPanel.Size = New-Object System.Drawing.Size(570, 380)
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
    
    # Tag pour le lien
    $btn.Tag = $item.Path
    
    $btn.Add_MouseEnter({ $this.BackColor = "#555555" })
    $btn.Add_MouseLeave({ $this.BackColor = "#333333" })
    
    $btn.Add_Click({
        try { Start-Process $this.Tag } 
        catch { [System.Windows.Forms.MessageBox]::Show("Erreur : $($this.Tag)", "Oups") }
    })
    
    $flowPanel.Controls.Add($btn)
}

# --- C'EST ICI QUE C'ÉTAIT CASSÉ ---
# Force l'affichage de la fenêtre et ignore la sortie console
[void] $form.ShowDialog()