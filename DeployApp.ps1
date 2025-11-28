Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Configuration de la fenêtre
$form = New-Object System.Windows.Forms.Form
$form.Text = "Soul Studio Deployer 🚀"
$form.Size = New-Object System.Drawing.Size(600,500)
$form.StartPosition = "CenterScreen"
$form.BackColor = "#1e1e1e"

# Titre
$label = New-Object System.Windows.Forms.Label
$label.Text = "Message de la mise à jour :"
$label.Location = New-Object System.Drawing.Point(20,20)
$label.Size = New-Object System.Drawing.Size(200,30)
$label.ForeColor = "White"
$label.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.Controls.Add($label)

# Boîte de texte
$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(20,50)
$textBox.Size = New-Object System.Drawing.Size(540,30)
$textBox.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$textBox.Text = "Mise à jour du site"
$form.Controls.Add($textBox)

# Zone de logs (Console noire)
$outputBox = New-Object System.Windows.Forms.RichTextBox
$outputBox.Location = New-Object System.Drawing.Point(20,150)
$outputBox.Size = New-Object System.Drawing.Size(540,280)
$outputBox.BackColor = "Black"
$outputBox.ForeColor = "#00ff00"
$outputBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$outputBox.ReadOnly = $true
$form.Controls.Add($outputBox)

function Log-Write($text) {
    $outputBox.AppendText($text + "`r`n")
    $outputBox.ScrollToCaret()
    $form.Refresh()
}

# Bouton DÉPLOYER
$button = New-Object System.Windows.Forms.Button
$button.Location = New-Object System.Drawing.Point(20,90)
$button.Size = New-Object System.Drawing.Size(540,40)
$button.Text = "🚀 ENVOYER SUR VERCEL"
$button.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$button.BackColor = "White"
$button.ForeColor = "Black"
$button.Cursor = [System.Windows.Forms.Cursors]::Hand

$button.Add_Click({
    $msg = $textBox.Text
    $button.Enabled = $false
    $button.Text = "⏳ En cours..."
    $outputBox.Clear()
    
    # Se placer dans le dossier où se trouve le script
    Set-Location $PSScriptRoot
    
    Log-Write "--- DÉBUT DU DÉPLOIEMENT ---"
    
    Log-Write "1. Ajout des fichiers (git add)..."
    $proc = Start-Process git -ArgumentList "add ." -NoNewWindow -PassThru -Wait
    
    Log-Write "2. Enregistrement (git commit)..."
    $proc = Start-Process git -ArgumentList "commit -m `"$msg`"" -NoNewWindow -PassThru -Wait
    
    Log-Write "3. Envoi vers le Cloud (git push)..."
    
    # Configuration pour capturer les erreurs de git push
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
        Log-Write "✨ SUCCÈS ! Site mis à jour."
        [System.Windows.Forms.MessageBox]::Show("Déploiement réussi !", "Soul Studio")
    } else {
        Log-Write "⚠️ Vérifiez les messages ci-dessus."
    }

    $button.Text = "🚀 ENVOYER SUR VERCEL"
    $button.Enabled = $true
})

$form.Controls.Add($button)
$form.ShowDialog()
