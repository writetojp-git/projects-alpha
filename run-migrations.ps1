$pat = "sbp_8b603a0390df8986c91c8cb8d84d70c31d82744f"
$ref = "hlrsegapueqyghqwysgv"
$headers = @{ Authorization = "Bearer $pat"; "Content-Type" = "application/json" }
$base = "C:\Users\OWNER\Dropbox\Software Development\projects-alpha\supabase\migrations"

foreach ($file in @("006_sites_and_roles.sql", "007_custom_project_type.sql")) {
    $sql = Get-Content "$base\$file" -Raw
    $body = @{ query = $sql } | ConvertTo-Json -Depth 2
    try {
        $r = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers $headers -Body $body
        Write-Host "OK: $file" -ForegroundColor Green
    } catch {
        Write-Host "FAIL: $file" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message
    }
}
Write-Host "Done."
