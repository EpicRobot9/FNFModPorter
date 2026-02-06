$ErrorActionPreference = 'Stop'
function Ensure-WingetPackage($id, $name) {
  $exists = winget list --id $id 2>$null
  if (-not $exists) { winget install --id $id -e --source winget }
}
if (Get-Command winget -ErrorAction SilentlyContinue) {
  Ensure-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS"
  Ensure-WingetPackage "Git.Git" "Git"
} else {
  Write-Host "winget not found. Please install Node.js LTS + Git manually, then rerun script."
  exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm not found after install" }
npm install
npm run build
Write-Host "Installed. Run: npx fnf-porter port . --dry-run"
