param(
  [Parameter(Mandatory = $true)][string]$FunctionUrl,
  [Parameter(Mandatory = $true)][string]$Token
)

$payload = @{
  id = [guid]::NewGuid().ToString()
  full_name = 'Replay Test'
  email = ('replay-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '@example.test')
  consent = $true
  department_ids = @()
  website = ''
}
$body = @{ token = $Token; source = 'home'; payload = $payload } | ConvertTo-Json -Depth 5
$first = Invoke-RestMethod -Uri $FunctionUrl -Method POST -ContentType 'application/json' -Body $body
$second = Invoke-RestMethod -Uri $FunctionUrl -Method POST -ContentType 'application/json' -Body $body
if ($first.member_id -ne $second.member_id -or $second.replayed -ne $true) { throw 'Replay did not return the original member.' }
Write-Host "Replay passed for member $($first.member_id). Verify one outbox row with: select count(*) from email_outbox where member_id = '$($first.member_id)';"
