$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:4173/")
$listener.Start()
Write-Host "Serving $root on http://localhost:4173/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".xml"  = "application/xml"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  $path = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
  if ($path -eq "/") { $path = "/index.html" }
  $filePath = Join-Path $root ($path.TrimStart("/"))
  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath)
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $response.ContentType = $contentType
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $response.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
    $response.OutputStream.Write($msg, 0, $msg.Length)
  }
  $response.OutputStream.Close()
}
